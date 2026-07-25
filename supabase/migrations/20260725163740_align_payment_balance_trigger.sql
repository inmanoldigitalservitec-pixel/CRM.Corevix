-- Align the payment overpayment trigger with the centralized
-- invoice financial balance calculation.
--
-- Existing trigger:
-- payments_enforce_invoice_balance
-- BEFORE INSERT OR UPDATE ON public.payments
-- EXECUTE FUNCTION public.enforce_invoice_payment_balance()

create or replace function public.enforce_invoice_payment_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_balance record;

  v_new_amount_base numeric := 0;
  v_old_amount_base numeric := 0;
  v_available_balance_base numeric := 0;
begin
  -- Payments without an invoice do not participate in invoice balance.
  if new.invoice_id is null then
    return new;
  end if;

  -- Only completed payments reduce the financial balance.
  -- Pending, Failed and Refunded records must not consume balance.
  if coalesce(new.status, '') <> 'Completed' then
    return new;
  end if;

  if coalesce(new.amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  -- Serialize direct inserts/updates with RPC payment operations.
  select *
  into v_invoice
  from public.invoices
  where id = new.invoice_id
  for update;

  if not found then
    raise exception 'No se encontró la factura asociada al pago.';
  end if;

  if new.company_id is distinct from v_invoice.company_id then
    raise exception
      'El pago y la factura deben pertenecer a la misma compañía.';
  end if;

  if v_invoice.status = 'Cancelled'::public.invoice_status then
    raise exception 'Esta factura está cancelada.';
  end if;

  -- The currency synchronization trigger runs before this trigger and should
  -- populate amount_base. The conversion remains as a safe fallback.
  v_new_amount_base :=
    coalesce(
      new.amount_base,
      public.crm_convert_currency_amount(
        new.amount,
        coalesce(new.currency, v_invoice.currency),
        coalesce(new.base_currency, v_invoice.base_currency),
        coalesce(new.exchange_rate, v_invoice.exchange_rate)
      ),
      new.amount,
      0
    );

  select *
  into v_balance
  from public.get_invoice_financial_balance(new.invoice_id);

  if v_balance.invoice_id is null then
    raise exception
      'No fue posible calcular el saldo financiero de la factura.';
  end if;

  v_available_balance_base :=
    coalesce(v_balance.balance_due_base, 0);

  -- During BEFORE UPDATE, the balance function still sees OLD in the table.
  -- When editing the same completed payment on the same invoice, restore its
  -- previous contribution before validating NEW.
  if tg_op = 'UPDATE'
     and old.invoice_id = new.invoice_id
     and old.company_id = new.company_id
     and coalesce(old.status, '') = 'Completed' then

    v_old_amount_base :=
      coalesce(
        old.amount_base,
        public.crm_convert_currency_amount(
          old.amount,
          coalesce(old.currency, v_invoice.currency),
          coalesce(old.base_currency, v_invoice.base_currency),
          coalesce(old.exchange_rate, v_invoice.exchange_rate)
        ),
        old.amount,
        0
      );

    v_available_balance_base :=
      v_available_balance_base + v_old_amount_base;
  end if;

  if v_new_amount_base > v_available_balance_base then
    raise exception 'El pago supera el saldo pendiente.';
  end if;

  return new;
end;
$$;

revoke all
on function public.enforce_invoice_payment_balance()
from public, anon;

grant execute
on function public.enforce_invoice_payment_balance()
to authenticated, service_role;
