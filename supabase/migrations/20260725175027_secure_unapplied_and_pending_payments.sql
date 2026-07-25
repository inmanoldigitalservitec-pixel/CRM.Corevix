-- ============================================================
-- Secure creation of payments without an invoice
-- ============================================================

create or replace function public.register_unapplied_payment(
  p_amount numeric,
  p_payment_date date default current_date,
  p_method text default 'Manual',
  p_status text default 'Completed',
  p_reference text default null,
  p_notes text default null,
  p_client_id uuid default null,
  p_currency text default null,
  p_base_currency text default null,
  p_exchange_rate numeric default null,
  p_exchange_rate_source text default null,
  p_exchange_rate_updated_at timestamptz default null
)
returns table (
  payment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_status text;
  v_currency text;
  v_base_currency text;
  v_exchange_rate numeric;
  v_amount_base numeric;
  v_payment_id uuid;
begin
  perform public.require_permission('payments.create');

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

  if coalesce(p_amount, 0) <= 0 then
    raise exception
      'El monto debe ser mayor que cero.';
  end if;

  v_status := coalesce(
    nullif(btrim(p_status), ''),
    'Completed'
  );

  if v_status not in (
    'Pending',
    'Completed'
  ) then
    raise exception
      'El estado del pago no es válido para esta operación.';
  end if;

  if p_client_id is not null
     and not exists (
       select 1
       from public.clients c
       where c.id = p_client_id
         and c.company_id = v_profile.company_id
     ) then
    raise exception
      'El cliente no pertenece a la compañía actual.';
  end if;

  v_currency := upper(
    coalesce(
      nullif(btrim(p_currency), ''),
      'USD'
    )
  );

  v_base_currency := upper(
    coalesce(
      nullif(btrim(p_base_currency), ''),
      v_currency
    )
  );

  v_exchange_rate := case
    when v_currency = v_base_currency then 1
    else coalesce(p_exchange_rate, 1)
  end;

  if v_exchange_rate <= 0 then
    raise exception
      'La tasa de cambio debe ser mayor que cero.';
  end if;

  v_amount_base :=
    public.crm_convert_currency_amount(
      p_amount,
      v_currency,
      v_base_currency,
      v_exchange_rate
    );

  insert into public.payments (
    company_id,
    invoice_id,
    client_id,
    amount,
    currency,
    base_currency,
    exchange_rate,
    exchange_rate_source,
    exchange_rate_updated_at,
    amount_base,
    payment_date,
    method,
    status,
    reference,
    notes,
    created_by
  )
  values (
    v_profile.company_id,
    null,
    p_client_id,
    p_amount,
    v_currency,
    v_base_currency,
    v_exchange_rate,
    nullif(btrim(p_exchange_rate_source), ''),
    p_exchange_rate_updated_at,
    v_amount_base,
    coalesce(p_payment_date, current_date),
    coalesce(
      nullif(btrim(p_method), ''),
      'Manual'
    ),
    v_status,
    nullif(btrim(p_reference), ''),
    nullif(btrim(p_notes), ''),
    v_profile.id
  )
  returning id
  into v_payment_id;

  payment_id := v_payment_id;
  return next;
end;
$$;

revoke all
on function public.register_unapplied_payment(
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  numeric,
  text,
  timestamptz
)
from public, anon;

grant execute
on function public.register_unapplied_payment(
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  numeric,
  text,
  timestamptz
)
to authenticated, service_role;

-- ============================================================
-- Secure rescheduling of pending payments
-- ============================================================

create or replace function public.reschedule_pending_payment(
  p_payment_id uuid,
  p_payment_date date
)
returns table (
  payment_id uuid,
  payment_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_payment public.payments%rowtype;
begin
  perform public.require_permission('payments.create');

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

  if p_payment_id is null then
    raise exception
      'No se pudo confirmar el pago.';
  end if;

  if p_payment_date is null then
    raise exception
      'Debe indicar la nueva fecha del pago.';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'No se encontró el pago dentro de la compañía actual.';
  end if;

  if v_payment.status <> 'Pending' then
    raise exception
      'Solo pueden reprogramarse pagos pendientes.'
      using errcode = '55000';
  end if;

  update public.payments
  set
    payment_date = p_payment_date,
    updated_at = now()
  where id = v_payment.id;

  payment_id := v_payment.id;
  payment_date := p_payment_date;

  return next;
end;
$$;

revoke all
on function public.reschedule_pending_payment(uuid, date)
from public, anon;

grant execute
on function public.reschedule_pending_payment(uuid, date)
to authenticated, service_role;
