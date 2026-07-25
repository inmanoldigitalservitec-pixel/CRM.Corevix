-- Keep public proposal approval aligned with the current finance schema.
-- Creates/reuses an invoice, copies proposal totals/currency snapshots, and
-- copies proposal line items into invoice_items with required fields.

create or replace function public.approve_proposal_public(
  p_proposal_public_token text
)
returns table (
  proposal_id uuid,
  invoice_id uuid,
  invoice_public_token text,
  invoice_number text,
  invoice_status text,
  invoice_total numeric
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_proposal public.proposals%rowtype;
  v_invoice public.invoices%rowtype;
  v_created_invoice boolean := false;
  v_today date := current_date;
  v_due date := current_date + 7;
  v_invoice_number text;
  v_product_name text;
  v_item_description text;
  v_document_total numeric;
  v_document_subtotal numeric;
  v_document_tax numeric;
  v_document_discount numeric;
  v_base_currency text;
  v_document_currency text;
  v_exchange_rate numeric;
  v_exchange_rate_source text;
  v_exchange_rate_updated_at timestamptz;
  v_proposal_data jsonb;
  v_client_company text;
  v_client_name text;
  v_invoice_data jsonb;
  v_items_count integer := 0;
begin
  if p_proposal_public_token is null or btrim(p_proposal_public_token) = '' then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  select p.*
    into v_proposal
  from public.proposals p
  where p.public_token = p_proposal_public_token
  limit 1;

  if v_proposal.id is null then
    raise exception 'No se encontró la propuesta' using errcode = 'P0002';
  end if;

  update public.proposals p
  set
    status = 'Approved',
    approved_at = coalesce(p.approved_at, now()),
    updated_at = now()
  where p.id = v_proposal.id
  returning *
  into v_proposal;

  v_document_currency := coalesce(nullif(btrim(v_proposal.currency), ''), 'USD');
  v_base_currency := coalesce(nullif(btrim(v_proposal.base_currency), ''), v_document_currency);
  v_exchange_rate := coalesce(v_proposal.exchange_rate, case when v_base_currency = v_document_currency then 1 else null end);
  v_exchange_rate_source := v_proposal.exchange_rate_source;
  v_exchange_rate_updated_at := v_proposal.exchange_rate_updated_at;

  v_document_subtotal := coalesce(nullif(v_proposal.subtotal, 0), v_proposal.amount, 0);
  v_document_tax := coalesce(v_proposal.tax_total, 0);
  v_document_discount := case
    when coalesce(v_proposal.discount_type, 'none') = 'fixed' then coalesce(v_proposal.discount_value, 0)
    when coalesce(v_proposal.discount_type, 'none') = 'percent' then
      round(v_document_subtotal * coalesce(v_proposal.discount_value, 0) / 100, 2)
    else 0
  end;
  v_document_total := coalesce(nullif(v_proposal.total, 0), nullif(v_proposal.amount, 0), v_document_subtotal + v_document_tax - v_document_discount, 0);

  perform public.log_activity_event(
    v_proposal.company_id,
    'proposal_approved',
    'proposals',
    v_proposal.created_by,
    v_proposal.id,
    'Propuesta aprobada desde enlace público',
    jsonb_build_object(
      'proposal_number', v_proposal.number,
      'proposal_title', v_proposal.title
    )
  );

  select i.*
    into v_invoice
  from public.invoices i
  where i.proposal_id = v_proposal.id
    and coalesce(i.status, '') <> 'Cancelled'
  order by i.created_at desc
  limit 1;

  if v_invoice.id is null then
    if v_proposal.number is not null and btrim(v_proposal.number) <> '' then
      v_invoice_number := replace(v_proposal.number, 'PROP-', 'INV-');
    else
      v_invoice_number :=
        'INV-' ||
        to_char(v_today, 'YYYYMMDD') ||
        '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

    if exists (
      select 1
      from public.invoices i
      where i.company_id = v_proposal.company_id
        and i.number = v_invoice_number
    ) then
      v_invoice_number :=
        'INV-' ||
        to_char(v_today, 'YYYYMMDD') ||
        '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

    v_proposal_data := coalesce(v_proposal.proposal_data, '{}'::jsonb);
    v_client_company := nullif(btrim(coalesce(v_proposal_data->>'companyName', '')), '');
    v_client_name := nullif(btrim(coalesce(v_proposal_data->>'clientName', '')), '');

    if v_proposal.product_id is not null then
      select pr.name
        into v_product_name
      from public.products pr
      where pr.id = v_proposal.product_id
      limit 1;
    end if;

    v_invoice_data := jsonb_strip_nulls(
      jsonb_build_object(
        'issuerName', 'Corevix',
        'relatedProposalNumber', nullif(btrim(coalesce(v_proposal.number, '')), ''),
        'relatedProposalTitle', nullif(btrim(coalesce(v_proposal.title, '')), ''),
        'productName', nullif(btrim(coalesce(v_product_name, '')), ''),
        'clientCompany', v_client_company,
        'clientName', v_client_name
      )
    );

    insert into public.invoices (
      company_id,
      number,
      client_id,
      date_issued,
      due_date,
      subtotal,
      tax,
      discount,
      total,
      status,
      notes,
      proposal_id,
      product_id,
      public_token,
      created_by,
      invoice_data,
      currency,
      base_currency,
      exchange_rate,
      exchange_rate_source,
      exchange_rate_updated_at,
      subtotal_base,
      tax_base,
      discount_base,
      total_base
    )
    values (
      v_proposal.company_id,
      v_invoice_number,
      v_proposal.client_id,
      v_today,
      v_due,
      v_document_subtotal,
      v_document_tax,
      v_document_discount,
      v_document_total,
      'Draft',
      'Factura generada automáticamente desde propuesta aprobada.',
      v_proposal.id,
      v_proposal.product_id,
      gen_random_uuid()::text,
      v_proposal.created_by,
      coalesce(v_invoice_data, '{}'::jsonb),
      v_document_currency,
      v_base_currency,
      v_exchange_rate,
      v_exchange_rate_source,
      v_exchange_rate_updated_at,
      coalesce(v_proposal.subtotal_base, case when v_exchange_rate is not null then round(v_document_subtotal * v_exchange_rate, 2) else null end),
      coalesce(v_proposal.tax_base, case when v_exchange_rate is not null then round(v_document_tax * v_exchange_rate, 2) else null end),
      case when v_exchange_rate is not null then round(v_document_discount * v_exchange_rate, 2) else null end,
      coalesce(v_proposal.total_base, v_proposal.amount_base, case when v_exchange_rate is not null then round(v_document_total * v_exchange_rate, 2) else null end)
    )
    returning *
    into v_invoice;

    v_created_invoice := true;
  end if;

  if v_created_invoice then
    insert into public.invoice_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      total,
      tax_rate,
      sort_order,
      document_currency,
      original_currency,
      original_unit_price,
      converted_unit_price,
      exchange_rate,
      exchange_rate_source,
      exchange_rate_updated_at,
      tax_id,
      tax_name,
      tax_amount
    )
    select
      pi.company_id,
      v_invoice.id,
      coalesce(nullif(btrim(pi.item_name), ''), nullif(btrim(pi.description), ''), 'Servicio aprobado'),
      coalesce(pi.quantity, 1),
      coalesce(pi.converted_rate, pi.rate, 0),
      coalesce(pi.amount, round(coalesce(pi.quantity, 1) * coalesce(pi.converted_rate, pi.rate, 0), 2)),
      coalesce(pi.tax_rate, 0),
      coalesce(pi.sort_order, 0),
      coalesce(pi.document_currency, v_document_currency),
      coalesce(pi.original_currency, pi.document_currency, v_document_currency),
      coalesce(pi.original_rate, pi.rate, 0),
      coalesce(pi.converted_rate, pi.rate, 0),
      coalesce(pi.exchange_rate, v_exchange_rate),
      coalesce(pi.exchange_rate_source, v_exchange_rate_source),
      coalesce(pi.exchange_rate_updated_at, v_exchange_rate_updated_at),
      pi.tax_id,
      pi.tax_name,
      coalesce(pi.tax_amount, 0)
    from public.proposal_items pi
    where pi.proposal_id = v_proposal.id
    order by pi.sort_order asc, pi.created_at asc;

    get diagnostics v_items_count = row_count;

    if v_items_count = 0 then
      if v_product_name is null and v_proposal.product_id is not null then
        select pr.name
          into v_product_name
        from public.products pr
        where pr.id = v_proposal.product_id
        limit 1;
      end if;

      v_item_description :=
        case
          when v_product_name is not null
            and btrim(v_product_name) <> ''
            and v_proposal.title is not null
            and btrim(v_proposal.title) <> ''
            then v_product_name || ' - ' || v_proposal.title
          when v_product_name is not null and btrim(v_product_name) <> '' then v_product_name
          when v_proposal.title is not null and btrim(v_proposal.title) <> '' then v_proposal.title
          else 'Servicio aprobado'
        end;

      insert into public.invoice_items (
        company_id,
        invoice_id,
        description,
        quantity,
        unit_price,
        total,
        tax_rate,
        document_currency,
        original_currency,
        original_unit_price,
        converted_unit_price,
        exchange_rate,
        exchange_rate_source,
        exchange_rate_updated_at,
        tax_amount
      )
      values (
        v_proposal.company_id,
        v_invoice.id,
        v_item_description,
        1,
        v_document_subtotal,
        v_document_subtotal,
        0,
        v_document_currency,
        v_document_currency,
        v_document_subtotal,
        v_document_subtotal,
        v_exchange_rate,
        v_exchange_rate_source,
        v_exchange_rate_updated_at,
        0
      );
    end if;

    perform public.log_activity_event(
      v_invoice.company_id,
      'invoice_created',
      'invoices',
      coalesce(v_invoice.created_by, v_proposal.created_by),
      v_invoice.id,
      'Factura creada desde propuesta aprobada',
      jsonb_build_object(
        'invoice_number', v_invoice.number,
        'proposal_id', v_proposal.id
      )
    );
  end if;

  return query
  select
    v_proposal.id,
    v_invoice.id,
    v_invoice.public_token,
    v_invoice.number,
    v_invoice.status::text,
    v_invoice.total;
end;
$$;

grant execute on function public.approve_proposal_public(text) to anon, authenticated;
