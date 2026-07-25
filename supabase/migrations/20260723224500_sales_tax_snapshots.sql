alter table public.invoice_items
  add column if not exists tax_id uuid references public.company_taxes(id) on delete set null,
  add column if not exists tax_name text,
  add column if not exists tax_amount numeric(14, 2) not null default 0;

alter table public.proposal_items
  add column if not exists tax_id uuid references public.company_taxes(id) on delete set null,
  add column if not exists tax_name text,
  add column if not exists tax_amount numeric(14, 2) not null default 0;

alter table public.estimates
  add column if not exists tax_id uuid references public.company_taxes(id) on delete set null,
  add column if not exists tax_name text,
  add column if not exists tax_rate numeric(8, 4) not null default 0,
  add column if not exists tax_amount numeric(14, 2) not null default 0;

update public.invoice_items
set tax_amount = greatest(
  0,
  round((coalesce(quantity, 0) * coalesce(unit_price, 0) * coalesce(tax_rate, 0) / 100)::numeric, 2)
)
where coalesce(tax_amount, 0) = 0
  and coalesce(tax_rate, 0) > 0;

update public.proposal_items
set tax_amount = greatest(
  0,
  round((coalesce(quantity, 0) * coalesce(rate, 0) * coalesce(tax_rate, 0) / 100)::numeric, 2)
)
where coalesce(tax_amount, 0) = 0
  and coalesce(tax_rate, 0) > 0;

update public.estimates
set
  tax_amount = coalesce(tax_amount, tax, 0),
  tax_rate = case
    when coalesce(subtotal, 0) > 0 and coalesce(tax_rate, 0) = 0
      then round((coalesce(tax, 0) / nullif(subtotal, 0) * 100)::numeric, 4)
    else coalesce(tax_rate, 0)
  end
where coalesce(tax_amount, 0) = 0
   or coalesce(tax_rate, 0) = 0;

create index if not exists invoice_items_company_tax_idx
  on public.invoice_items(company_id, tax_id);

create index if not exists proposal_items_company_tax_idx
  on public.proposal_items(company_id, tax_id);

create index if not exists estimates_company_tax_idx
  on public.estimates(company_id, tax_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_items_tax_rate_check'
      and conrelid = 'public.invoice_items'::regclass
  ) then
    alter table public.invoice_items
      add constraint invoice_items_tax_rate_check
      check (tax_rate >= 0 and tax_rate <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_items_tax_amount_check'
      and conrelid = 'public.invoice_items'::regclass
  ) then
    alter table public.invoice_items
      add constraint invoice_items_tax_amount_check
      check (tax_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'proposal_items_tax_rate_check'
      and conrelid = 'public.proposal_items'::regclass
  ) then
    alter table public.proposal_items
      add constraint proposal_items_tax_rate_check
      check (tax_rate >= 0 and tax_rate <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'proposal_items_tax_amount_check'
      and conrelid = 'public.proposal_items'::regclass
  ) then
    alter table public.proposal_items
      add constraint proposal_items_tax_amount_check
      check (tax_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_tax_rate_check'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_tax_rate_check
      check (tax_rate >= 0 and tax_rate <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'estimates_tax_amount_check'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint estimates_tax_amount_check
      check (tax_amount >= 0);
  end if;
end $$;

create or replace function public.save_invoice_with_items(
  p_invoice_id uuid default null,
  p_invoice jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb
)
returns table(
  invoice_id uuid,
  created boolean,
  number text,
  status text,
  subtotal numeric,
  tax numeric,
  discount numeric,
  total numeric,
  item_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  v_invoice public.invoices%rowtype;
  v_invoice_id uuid;
  v_created boolean := false;
  v_number text;
  v_client_id uuid;
  v_proposal_id uuid;
  v_product_id uuid;
  v_status text;
  v_notes text;
  v_date_issued date;
  v_due_date date;
  v_tax numeric := 0;
  v_discount numeric := 0;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_invoice_data jsonb := '{}'::jsonb;
  v_sent_at timestamptz;
  v_existing_item_count integer := 0;
  v_has_items boolean := false;
  v_item jsonb;
  v_description text;
  v_quantity numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_sort_order integer := 0;
  v_document_currency text;
  v_original_currency text;
  v_original_unit_price numeric;
  v_converted_unit_price numeric;
  v_exchange_rate numeric;
  v_exchange_rate_source text;
  v_exchange_rate_updated_at timestamptz;
  v_tax_id uuid;
  v_tax_name text;
  v_tax_rate numeric;
  v_tax_amount numeric;
begin
  select *
  into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null or current_profile.company_id is null then
    raise exception 'No hay contexto de compañía.';
  end if;

  if p_invoice is null or jsonb_typeof(p_invoice) <> 'object' then
    raise exception 'La factura enviada no es válida.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Los artículos enviados no son válidos.';
  end if;

  if p_invoice_id is not null then
    select *
    into v_invoice
    from public.invoices
    where id = p_invoice_id
      and company_id = current_profile.company_id
    for update;

    if not found then
      raise exception 'Factura no encontrada o acceso denegado.';
    end if;

    v_invoice_id := v_invoice.id;

    select count(*)
    into v_existing_item_count
    from public.invoice_items ii
    where ii.company_id = current_profile.company_id
      and ii.invoice_id = v_invoice_id;
  end if;

  v_number := nullif(btrim(coalesce(p_invoice->>'number', '')), '');
  if v_number is null then
    v_number := 'INV-' || right(extract(epoch from clock_timestamp())::bigint::text, 6);
  end if;

  v_client_id := nullif(p_invoice->>'client_id', '')::uuid;
  v_proposal_id := nullif(p_invoice->>'proposal_id', '')::uuid;
  v_product_id := nullif(p_invoice->>'product_id', '')::uuid;
  v_status := coalesce(nullif(btrim(p_invoice->>'status'), ''), 'Draft');
  v_notes := nullif(btrim(coalesce(p_invoice->>'notes', '')), '');
  v_date_issued := coalesce(nullif(p_invoice->>'date_issued', '')::date, current_date);
  v_due_date := coalesce(nullif(p_invoice->>'due_date', '')::date, current_date + 30);
  v_tax := coalesce(nullif(p_invoice->>'tax', '')::numeric, 0);
  v_discount := coalesce(nullif(p_invoice->>'discount', '')::numeric, 0);
  v_invoice_data := coalesce(p_invoice->'invoice_data', '{}'::jsonb);
  v_sent_at := nullif(p_invoice->>'sent_at', '')::timestamptz;

  if v_tax < 0 then
    raise exception 'El impuesto no puede ser negativo.';
  end if;

  if v_discount < 0 then
    raise exception 'El descuento no puede ser negativo.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_description := btrim(coalesce(v_item->>'description', ''));
    v_quantity := nullif(v_item->>'quantity', '')::numeric;
    v_unit_price := nullif(v_item->>'unit_price', '')::numeric;

    if v_description = '' then
      raise exception 'Cada línea debe tener descripción.';
    end if;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor que 0.';
    end if;

    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'El precio unitario no puede ser negativo.';
    end if;

    v_line_total := v_quantity * v_unit_price;
    if v_line_total < 0 then
      raise exception 'El total de una línea no es válido.';
    end if;

    v_has_items := true;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_invoice_id is null and not v_has_items then
    raise exception 'Agrega al menos un artículo para crear la factura.';
  end if;

  if p_invoice_id is not null and not v_has_items and v_existing_item_count = 0 then
    v_subtotal := coalesce(v_invoice.subtotal, 0);
  end if;

  v_total := greatest(v_subtotal + v_tax - v_discount, 0);

  if p_invoice_id is not null
    and coalesce(v_invoice.status::text, '') = 'Paid'
    and (
      coalesce(v_invoice.subtotal, 0) is distinct from v_subtotal
      or coalesce(v_invoice.tax, 0) is distinct from v_tax
      or coalesce(v_invoice.discount, 0) is distinct from v_discount
      or coalesce(v_invoice.total, 0) is distinct from v_total
    )
  then
    raise exception 'La factura pagada no permite cambios financieros desde el editor.';
  end if;

  if p_invoice_id is null then
    insert into public.invoices (
      company_id,
      number,
      client_id,
      proposal_id,
      product_id,
      subtotal,
      tax,
      discount,
      total,
      status,
      date_issued,
      due_date,
      notes,
      payment_link,
      sent_at,
      invoice_data,
      created_by
    )
    values (
      current_profile.company_id,
      v_number,
      v_client_id,
      v_proposal_id,
      v_product_id,
      v_subtotal,
      v_tax,
      v_discount,
      v_total,
      v_status,
      v_date_issued,
      v_due_date,
      v_notes,
      null,
      case when v_status = 'Sent' then coalesce(v_sent_at, now()) else v_sent_at end,
      v_invoice_data,
      current_profile.id
    )
    returning * into v_invoice;

    v_invoice_id := v_invoice.id;
    v_created := true;
  else
    update public.invoices
    set number = v_number,
        client_id = v_client_id,
        proposal_id = v_proposal_id,
        product_id = v_product_id,
        subtotal = v_subtotal,
        tax = v_tax,
        discount = v_discount,
        total = v_total,
        status = v_status,
        date_issued = v_date_issued,
        due_date = v_due_date,
        notes = v_notes,
        payment_link = null,
        sent_at = case when v_status = 'Sent' then coalesce(v_sent_at, sent_at, now()) else sent_at end,
        invoice_data = v_invoice_data,
        updated_at = now()
    where id = v_invoice_id
      and company_id = current_profile.company_id
    returning * into v_invoice;
  end if;

  delete from public.invoice_items ii
  where ii.company_id = current_profile.company_id
    and ii.invoice_id = v_invoice_id;

  v_sort_order := 0;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_description := btrim(coalesce(v_item->>'description', ''));
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_line_total := v_quantity * v_unit_price;
    v_document_currency := nullif(btrim(coalesce(v_item->>'document_currency', '')), '');
    v_original_currency := nullif(btrim(coalesce(v_item->>'original_currency', '')), '');
    v_original_unit_price := nullif(v_item->>'original_unit_price', '')::numeric;
    v_converted_unit_price := nullif(v_item->>'converted_unit_price', '')::numeric;
    v_exchange_rate := nullif(v_item->>'exchange_rate', '')::numeric;
    v_exchange_rate_source := nullif(btrim(coalesce(v_item->>'exchange_rate_source', '')), '');
    v_exchange_rate_updated_at := nullif(v_item->>'exchange_rate_updated_at', '')::timestamptz;
    v_tax_id := nullif(v_item->>'tax_id', '')::uuid;
    v_tax_name := nullif(btrim(coalesce(v_item->>'tax_name', '')), '');
    v_tax_rate := coalesce(nullif(v_item->>'tax_rate', '')::numeric, 0);
    v_tax_amount := coalesce(
      nullif(v_item->>'tax_amount', '')::numeric,
      round((v_line_total * v_tax_rate / 100)::numeric, 2)
    );

    if v_tax_id is not null and not exists (
      select 1
      from public.company_taxes t
      where t.id = v_tax_id
        and t.company_id = current_profile.company_id
    ) then
      raise exception 'Impuesto no encontrado o acceso denegado.';
    end if;

    if v_tax_rate < 0 or v_tax_rate > 100 then
      raise exception 'La tasa de impuesto no es válida.';
    end if;

    if v_tax_amount < 0 then
      raise exception 'El monto de impuesto no puede ser negativo.';
    end if;

    insert into public.invoice_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      total,
      tax_id,
      tax_name,
      tax_rate,
      tax_amount,
      sort_order,
      document_currency,
      original_currency,
      original_unit_price,
      converted_unit_price,
      exchange_rate,
      exchange_rate_source,
      exchange_rate_updated_at
    )
    values (
      current_profile.company_id,
      v_invoice_id,
      v_description,
      v_quantity,
      v_unit_price,
      v_line_total,
      v_tax_id,
      v_tax_name,
      v_tax_rate,
      v_tax_amount,
      v_sort_order,
      coalesce(v_document_currency, v_invoice_data->>'currency'),
      coalesce(v_original_currency, v_document_currency, v_invoice_data->>'currency'),
      coalesce(v_original_unit_price, v_unit_price),
      coalesce(v_converted_unit_price, v_unit_price),
      v_exchange_rate,
      v_exchange_rate_source,
      v_exchange_rate_updated_at
    );

    v_sort_order := v_sort_order + 1;
  end loop;

  invoice_id := v_invoice.id;
  created := v_created;
  number := v_invoice.number;
  status := v_invoice.status;
  subtotal := v_invoice.subtotal;
  tax := coalesce(v_invoice.tax, 0);
  discount := v_invoice.discount;
  total := v_invoice.total;
  item_count := (
    select count(*)::integer
    from public.invoice_items ii
    where ii.company_id = current_profile.company_id
      and ii.invoice_id = v_invoice.id
  );

  return next;
end;
$$;

grant execute on function public.save_invoice_with_items(uuid, jsonb, jsonb) to authenticated;
