-- Improve invoice numbering and item description for invoices auto-generated from approved proposals.

drop function if exists public.approve_proposal_public(text);

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
  v_amount numeric;
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

  v_amount := coalesce(v_proposal.amount, 0);

  -- Reutilizar factura activa existente para evitar duplicados
  select i.*
    into v_invoice
  from public.invoices i
  where i.proposal_id = v_proposal.id
    and coalesce(i.status, '') <> 'Cancelled'
  order by i.created_at desc
  limit 1;

  if v_invoice.id is null then
    -- Preferir número basado en la propuesta:
    -- PROP-20260525-6264 -> INV-20260525-6264
    if v_proposal.number is not null and btrim(v_proposal.number) <> '' then
      v_invoice_number := replace(v_proposal.number, 'PROP-', 'INV-');
    else
      v_invoice_number :=
        'INV-' ||
        to_char(v_today, 'YYYYMMDD') ||
        '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

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
      created_by
    )
    values (
      v_proposal.company_id,
      v_invoice_number,
      v_proposal.client_id,
      v_today,
      v_due,
      v_amount,
      0,
      0,
      v_amount,
      'Draft',
      'Factura generada automáticamente desde propuesta aprobada.',
      v_proposal.id,
      v_proposal.product_id,
      gen_random_uuid()::text,
      v_proposal.created_by
    )
    returning *
    into v_invoice;

    v_created_invoice := true;
  end if;

  if v_created_invoice then
    if v_proposal.product_id is not null then
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
        when v_product_name is not null
          and btrim(v_product_name) <> ''
          then v_product_name
        when v_proposal.title is not null
          and btrim(v_proposal.title) <> ''
          then v_proposal.title
        else
          'Servicio aprobado'
      end;

    insert into public.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    )
    values (
      v_invoice.id,
      v_item_description,
      1,
      v_amount,
      v_amount
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
