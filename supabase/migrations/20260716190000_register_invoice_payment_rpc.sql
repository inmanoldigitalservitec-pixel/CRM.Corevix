-- Register invoice payments through a transaction-safe RPC and block completed overpayments.
-- This keeps payments as the financial source of truth while the finance trigger
-- remains responsible for recalculating invoice status.

create or replace function public.enforce_invoice_payment_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_completed_amount numeric := 0;
  v_balance numeric := 0;
begin
  if new.invoice_id is null then
    return new;
  end if;

  if new.company_id is null then
    raise exception 'No se encontró la factura dentro de la compañía actual.';
  end if;

  if coalesce(new.amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = new.invoice_id
    and company_id = new.company_id
  for update;

  if not found then
    raise exception 'No se encontró la factura dentro de la compañía actual.';
  end if;

  if v_invoice.status in ('Cancelled', 'Canceled') then
    raise exception 'Esta factura está cancelada.';
  end if;

  if new.client_id is null and v_invoice.client_id is not null then
    new.client_id := v_invoice.client_id;
  end if;

  if new.status = 'Completed' then
    select coalesce(sum(p.amount), 0)
    into v_completed_amount
    from public.payments p
    where p.company_id = new.company_id
      and p.invoice_id = new.invoice_id
      and p.status = 'Completed'
      and p.id is distinct from new.id;

    v_balance := greatest(coalesce(v_invoice.total, 0) - v_completed_amount, 0);

    if v_balance <= 0 then
      raise exception 'Esta factura ya está pagada.';
    end if;

    if coalesce(new.amount, 0) > v_balance then
      raise exception 'El pago supera el saldo pendiente.';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'payments_enforce_invoice_balance'
      and tgrelid = 'public.payments'::regclass
  ) then
    create trigger payments_enforce_invoice_balance
    before insert or update on public.payments
    for each row execute function public.enforce_invoice_payment_balance();
  end if;
end;
$$;

create or replace function public.refresh_invoice_finance_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_allowed_partial boolean := false;
begin
  if p_invoice_id is null then
    return;
  end if;

  select finance_status into v_status
  from public.invoice_finance_summary
  where invoice_id = p_invoice_id;

  if v_status is null then
    return;
  end if;

  select exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'invoices'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%Partial%'
  ) into v_allowed_partial;

  if v_status = 'Partial' and not v_allowed_partial then
    v_status := 'Sent';
  end if;

  update public.invoices
  set status = v_status,
      paid_at = case when v_status = 'Paid' then coalesce(paid_at, now()) else null end
  where id = p_invoice_id
    and status not in ('Cancelled')
    and (
      status is distinct from v_status
      or (v_status = 'Paid' and paid_at is null)
      or (v_status <> 'Paid' and paid_at is not null)
    );
end;
$$;

create or replace function public.register_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_method text default 'Manual',
  p_status text default 'Completed',
  p_reference text default null,
  p_notes text default null,
  p_client_id uuid default null
)
returns table(
  payment_id uuid,
  invoice_id uuid,
  invoice_status text,
  remaining_balance numeric,
  became_paid boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  v_invoice public.invoices%rowtype;
  v_previous_status text;
  v_payment_id uuid;
  v_completed_amount numeric := 0;
  v_remaining_balance numeric := 0;
begin
  select *
  into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null or current_profile.company_id is null then
    raise exception 'No hay contexto de compañía.';
  end if;

  if p_invoice_id is null then
    raise exception 'No se pudo confirmar el ID de la factura.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id
  for update;

  if not found then
    raise exception 'No se encontró la factura dentro de la compañía actual.';
  end if;

  if v_invoice.status in ('Cancelled', 'Canceled') then
    raise exception 'Esta factura está cancelada.';
  end if;

  v_previous_status := v_invoice.status;

  select coalesce(sum(p.amount), 0)
  into v_completed_amount
  from public.payments p
  where p.company_id = current_profile.company_id
    and p.invoice_id = p_invoice_id
    and p.status = 'Completed';

  v_remaining_balance := greatest(coalesce(v_invoice.total, 0) - v_completed_amount, 0);

  if p_amount > v_remaining_balance then
    raise exception 'El pago supera el saldo pendiente.';
  end if;

  if p_status = 'Completed' and v_remaining_balance <= 0 then
    raise exception 'Esta factura ya está pagada.';
  end if;

  insert into public.payments (
    company_id,
    invoice_id,
    client_id,
    amount,
    payment_date,
    method,
    status,
    reference,
    notes,
    created_by
  )
  values (
    current_profile.company_id,
    p_invoice_id,
    coalesce(p_client_id, v_invoice.client_id),
    p_amount,
    coalesce(p_payment_date, current_date),
    coalesce(nullif(trim(p_method), ''), 'Manual'),
    coalesce(nullif(trim(p_status), ''), 'Completed'),
    nullif(trim(p_reference), ''),
    nullif(trim(p_notes), ''),
    current_profile.id
  )
  returning id into v_payment_id;

  perform public.refresh_invoice_finance_status(p_invoice_id);

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id;

  select greatest(
    coalesce(v_invoice.total, 0) - coalesce(sum(p.amount) filter (where p.status = 'Completed'), 0),
    0
  )
  into v_remaining_balance
  from public.payments p
  where p.company_id = current_profile.company_id
    and p.invoice_id = p_invoice_id;

  payment_id := v_payment_id;
  invoice_id := p_invoice_id;
  invoice_status := v_invoice.status;
  remaining_balance := coalesce(v_remaining_balance, 0);
  became_paid := v_previous_status is distinct from 'Paid' and v_invoice.status = 'Paid';

  return next;
end;
$$;

revoke all on function public.register_invoice_payment(uuid, numeric, date, text, text, text, text, uuid) from public;
grant execute on function public.register_invoice_payment(uuid, numeric, date, text, text, text, text, uuid) to authenticated;
