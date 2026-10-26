-- Confirm a previously recorded Pending payment without granting direct
-- UPDATE access to the payments table. The payment row is locked so concurrent
-- confirmation attempts cannot account for the same receipt more than once.
create or replace function public.confirm_pending_payment(
  p_payment_id uuid
)
returns table (
  payment_id uuid,
  payment_status text,
  invoice_id uuid,
  invoice_status text,
  confirmed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_balance record;
  v_amount_base numeric;
begin
  perform public.require_permission('payments.create');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_profile.id is null or v_profile.company_id is null then
    raise exception 'No hay contexto de compañía.' using errcode = '42501';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception 'No se encontró el pago dentro de la compañía actual.';
  end if;

  -- Make retries safe. A previously confirmed payment is returned unchanged;
  -- no second financial event or balance change is produced.
  if v_payment.status = 'Completed' then
    payment_id := v_payment.id;
    payment_status := v_payment.status::text;
    invoice_id := v_payment.invoice_id;
    if v_payment.invoice_id is not null then
      select i.status::text into invoice_status
      from public.invoices i
      where i.id = v_payment.invoice_id
        and i.company_id = v_profile.company_id;
    end if;
    confirmed := false;
    return next;
    return;
  end if;

  if v_payment.status <> 'Pending' then
    raise exception 'Solo pueden confirmarse pagos pendientes.'
      using errcode = '55000';
  end if;

  if v_payment.amount is null or v_payment.amount <= 0 then
    raise exception 'El monto del pago debe ser mayor que cero.'
      using errcode = '22023';
  end if;

  if v_payment.invoice_id is not null then
    select *
    into v_invoice
    from public.invoices
    where id = v_payment.invoice_id
      and company_id = v_profile.company_id
    for update;

    if not found then
      raise exception 'No se encontró la factura asociada dentro de la compañía actual.';
    end if;

    if v_invoice.status::text in ('Draft', 'Cancelled') then
      raise exception 'La factura no acepta la confirmación de pagos en su estado actual.'
        using errcode = '55000';
    end if;

    select *
    into v_balance
    from public.get_invoice_financial_balance(v_invoice.id);

    if v_balance.invoice_id is null then
      raise exception 'No fue posible calcular el saldo financiero de la factura.';
    end if;

    v_amount_base := coalesce(
      v_payment.amount_base,
      public.crm_convert_currency_amount(
        v_payment.amount,
        coalesce(v_payment.currency, v_invoice.currency, 'USD'),
        coalesce(v_payment.base_currency, v_invoice.base_currency, 'USD'),
        coalesce(nullif(v_payment.exchange_rate, 0), 1)
      )
    );

    if coalesce(v_balance.balance_due_base, 0) <= 0 then
      raise exception 'Esta factura ya está pagada.' using errcode = '22023';
    end if;

    if v_amount_base > v_balance.balance_due_base + 0.000001 then
      raise exception 'El pago supera el saldo pendiente.' using errcode = '22023';
    end if;
  end if;

  update public.payments
  set status = 'Completed',
      updated_at = now()
  where id = v_payment.id
    and company_id = v_profile.company_id
    and status = 'Pending';

  if not found then
    raise exception 'El pago dejó de estar pendiente; actualiza la vista e inténtalo de nuevo.'
      using errcode = '40001';
  end if;

  payment_id := v_payment.id;
  payment_status := 'Completed';
  invoice_id := v_payment.invoice_id;
  if v_payment.invoice_id is not null then
    select i.status::text into invoice_status
    from public.invoices i
    where i.id = v_payment.invoice_id
      and i.company_id = v_profile.company_id;
  end if;
  confirmed := true;
  return next;
end;
$$;

revoke all on function public.confirm_pending_payment(uuid) from public, anon;
grant execute on function public.confirm_pending_payment(uuid) to authenticated, service_role;

comment on function public.confirm_pending_payment(uuid) is
  'Confirms a Pending payment through an authorized, company-scoped transaction; completed payments remain immutable and audit/balance triggers record the transition.';
