-- ============================================================
-- Invoice lifecycle
-- Draft -> Sent
-- Draft/Sent/Overdue -> Cancelled
-- ============================================================

create or replace function public.issue_invoice(
  p_invoice_id uuid
)
returns table (
  invoice_id uuid,
  status text,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_invoice public.invoices%rowtype;
begin
  perform public.require_permission('invoices.issue');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception
      'No hay contexto de compañía.'
      using errcode = '42501';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'Factura no encontrada o acceso denegado.';
  end if;

  if v_invoice.status <> 'Draft' then
    raise exception
      'Solo puede emitirse una factura en estado Draft.'
      using errcode = '55000';
  end if;

  if v_invoice.client_id is null then
    raise exception
      'La factura debe tener un cliente antes de emitirse.';
  end if;

  if coalesce(v_invoice.total, 0) <= 0 then
    raise exception
      'La factura debe tener un total mayor que cero.';
  end if;

  if not exists (
    select 1
    from public.invoice_items ii
    where ii.invoice_id = v_invoice.id
      and ii.company_id = v_profile.company_id
  ) then
    raise exception
      'La factura debe contener al menos un artículo.';
  end if;

  update public.invoices as i
  set
    status = 'Sent',
    sent_at = coalesce(i.sent_at, now()),
    updated_at = now()
  where i.id = v_invoice.id;

  invoice_id := v_invoice.id;
  status := 'Sent';
  sent_at := coalesce(v_invoice.sent_at, now());

  return next;
end;
$$;

revoke all
on function public.issue_invoice(uuid)
from public, anon;

grant execute
on function public.issue_invoice(uuid)
to authenticated, service_role;

create or replace function public.void_invoice(
  p_invoice_id uuid,
  p_reason text default null
)
returns table (
  invoice_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_invoice public.invoices%rowtype;
  v_net_paid numeric;
begin
  perform public.require_permission('invoices.void');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception
      'No hay contexto de compañía.'
      using errcode = '42501';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'Factura no encontrada o acceso denegado.';
  end if;

  if v_invoice.status = 'Cancelled' then
    raise exception
      'La factura ya está cancelada.'
      using errcode = '55000';
  end if;

  if v_invoice.status = 'Paid' then
    raise exception
      'Una factura pagada no puede cancelarse directamente.'
      using errcode = '55000';
  end if;

  select coalesce(sum(b.net_amount), 0)
  into v_net_paid
  from public.payments p
  cross join lateral
    public.get_payment_net_balance(p.id) as b
  where p.invoice_id = v_invoice.id
    and p.company_id = v_profile.company_id
    and p.status = 'Completed';

  if v_net_paid > 0 then
    raise exception
      'La factura tiene pagos aplicados; primero deben reversarse o reembolsarse.'
      using errcode = '55000';
  end if;

  update public.invoices
  set
    status = 'Cancelled',
    notes = case
      when nullif(btrim(p_reason), '') is null
        then notes
      when nullif(btrim(notes), '') is null
        then 'Cancelación: ' || btrim(p_reason)
      else notes || E'\nCancelación: ' || btrim(p_reason)
    end,
    updated_at = now()
  where id = v_invoice.id;

  invoice_id := v_invoice.id;
  status := 'Cancelled';

  return next;
end;
$$;

revoke all
on function public.void_invoice(uuid, text)
from public, anon;

grant execute
on function public.void_invoice(uuid, text)
to authenticated, service_role;
