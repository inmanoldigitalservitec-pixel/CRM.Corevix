-- Public invoice/proposal approval RPCs.
-- These functions are SECURITY DEFINER so they can be executed by anon without opening broad RLS policies.

create or replace function public.approve_proposal_public(proposal_public_token text)
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
  p public.proposals%rowtype;
  inv public.invoices%rowtype;
  created_invoice boolean := false;
  today date := current_date;
  due date := (current_date + 7);
  new_invoice_number text;
begin
  if proposal_public_token is null or btrim(proposal_public_token) = '' then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  select *
    into p
  from public.proposals
  where public_token = proposal_public_token
  limit 1;

  if not found then
    raise exception 'No se encontró la propuesta' using errcode = 'P0002';
  end if;

  update public.proposals
  set
    status = 'Approved',
    approved_at = coalesce(approved_at, now())
  where id = p.id;

  -- Reuse existing non-cancelled invoice
  select *
    into inv
  from public.invoices i  where i.proposal_id = p.id
    and i.status <> 'Cancelled'
  order by i.created_at desc
  limit 1;

  if not found then
    -- Generate a basic invoice number (INV-YYYYMMDD-XXXX)
    new_invoice_number := 'INV-' || to_char(today, 'YYYYMMDD') || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');

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
      p.company_id,
      new_invoice_number,
      p.client_id,
      today,
      due,
      coalesce(p.amount, 0),
      0,
      0,
      coalesce(p.amount, 0),
      'Draft',
      'Factura generada automáticamente desde propuesta aprobada.',
      p.id,
      (select product_id from public.proposals where id = p.id limit 1),
      gen_random_uuid()::text,
      (select created_by from public.proposals where id = p.id limit 1)
    )
    returning * into inv;

    created_invoice := true;
  end if;

  if created_invoice then
    insert into public.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    ) values (
      inv.id,
      coalesce(nullif(p.title, ''), 'Servicio aprobado'),
      1,
      coalesce(p.amount, 0),
      coalesce(p.amount, 0)
    );
  end if;

  proposal_id := p.id;
  invoice_id := inv.id;
  invoice_public_token := inv.public_token;
  invoice_number := inv.number;
  invoice_status := inv.status::text;
  invoice_total := inv.total;
  return next;
end;
$$;

create or replace function public.get_invoice_public(invoice_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  inv public.invoices%rowtype;
  items jsonb;
begin
  if invoice_public_token is null or btrim(invoice_public_token) = '' then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  select *
    into inv
  from public.invoices i  where i.public_token = invoice_public_token
  limit 1;

  if not found then
    raise exception 'No se encontró la factura' using errcode = 'P0002';
  end if;

  -- Mark as viewed best-effort
  begin
    if inv.viewed_at is null then
      update public.invoices
      set viewed_at = now()
      where id = inv.id;
    end if;
  exception when others then
    -- ignore
  end;

  select coalesce(jsonb_agg(to_jsonb(ii) order by ii.created_at asc), '[]'::jsonb)
    into items
  from public.invoice_items ii
  where ii.invoice_id = inv.id;

  return jsonb_build_object(
    'invoice', to_jsonb(inv),
    'items', items
  );
end;
$$;

-- Allow anon and authenticated to execute only these functions
revoke all on function public.approve_proposal_public(text) from public;
revoke all on function public.get_invoice_public(text) from public;
grant execute on function public.approve_proposal_public(text) to anon, authenticated;
grant execute on function public.get_invoice_public(text) to anon, authenticated;
