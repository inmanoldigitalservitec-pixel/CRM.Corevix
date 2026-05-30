-- Fix public proposal approval RPCs.
-- Replaces old ambiguous function with safe aliases and text invoice_status.

drop function if exists public.approve_proposal_public(text);
drop function if exists public.get_invoice_public(text);

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

  select i.*
    into v_invoice
  from public.invoices i
  where i.proposal_id = v_proposal.id
    and coalesce(i.status, '') <> 'Cancelled'
  order by i.created_at desc
  limit 1;

  if v_invoice.id is null then
    v_invoice_number :=
      'INV-' ||
      to_char(v_today, 'YYYYMMDD') ||
      '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

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
    insert into public.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    )
    values (
      v_invoice.id,
      coalesce(nullif(v_proposal.title, ''), 'Servicio aprobado'),
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

create or replace function public.get_invoice_public(
  p_invoice_public_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_invoice public.invoices%rowtype;
  v_items jsonb;
begin
  if p_invoice_public_token is null or btrim(p_invoice_public_token) = '' then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  select i.*
    into v_invoice
  from public.invoices i
  where i.public_token = p_invoice_public_token
  limit 1;

  if v_invoice.id is null then
    raise exception 'No se encontró la factura' using errcode = 'P0002';
  end if;

  update public.invoices i
  set viewed_at = coalesce(i.viewed_at, now())
  where i.id = v_invoice.id;

  select coalesce(
    jsonb_agg(to_jsonb(ii) order by ii.created_at asc),
    '[]'::jsonb
  )
    into v_items
  from public.invoice_items ii
  where ii.invoice_id = v_invoice.id;

  return jsonb_build_object(
    'invoice', to_jsonb(v_invoice),
    'items', v_items
  );
end;
$$;

grant execute on function public.approve_proposal_public(text) to anon, authenticated;
grant execute on function public.get_invoice_public(text) to anon, authenticated;
