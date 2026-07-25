-- Align register_invoice_payment with the centralized invoice balance rule.
--
-- The invoice row remains locked FOR UPDATE to serialize concurrent payments.
-- Both pre-insert validation and post-insert results now use:
-- public.get_invoice_financial_balance(uuid)

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
returns table (
  payment_id uuid,
  invoice_id uuid,
  invoice_status text,
  remaining_balance numeric,
  became_paid boolean,
  project_id uuid,
  project_created boolean,
  project_error text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  v_invoice public.invoices%rowtype;

  v_previous_status text;
  v_payment_status text;
  v_payment_amount_base numeric;

  v_balance record;

  v_payment_id uuid;
  v_became_paid boolean := false;

  v_project_id uuid;
  v_project_created boolean := false;
  v_project_error text;
begin
  -- Resolve the authenticated user's company context.
  select *
  into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null
     or current_profile.company_id is null then
    raise exception 'No hay contexto de compañía.';
  end if;

  if p_invoice_id is null then
    raise exception 'No se pudo confirmar el ID de la factura.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  v_payment_status :=
    coalesce(nullif(trim(p_status), ''), 'Completed');

  -- Serialize all financial changes for this invoice.
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id
  for update;

  if not found then
    raise exception
      'No se encontró la factura dentro de la compañía actual.';
  end if;

  if v_invoice.status = 'Cancelled' then
    raise exception 'Esta factura está cancelada.';
  end if;

  v_previous_status := v_invoice.status::text;

  -- Convert the incoming payment to the invoice base currency once.
  v_payment_amount_base :=
    public.crm_convert_currency_amount(
      p_amount,
      v_invoice.currency,
      v_invoice.base_currency,
      v_invoice.exchange_rate
    );

  -- Authoritative balance before inserting the payment.
  select *
  into v_balance
  from public.get_invoice_financial_balance(p_invoice_id);

  if v_balance.invoice_id is null then
    raise exception
      'No fue posible calcular el saldo financiero de la factura.';
  end if;

  if v_payment_amount_base > v_balance.balance_due_base then
    raise exception 'El pago supera el saldo pendiente.';
  end if;

  if v_payment_status = 'Completed'
     and v_balance.balance_due_base <= 0 then
    raise exception 'Esta factura ya está pagada.';
  end if;

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
    current_profile.company_id,
    p_invoice_id,
    coalesce(p_client_id, v_invoice.client_id),
    p_amount,
    v_invoice.currency,
    v_invoice.base_currency,
    v_invoice.exchange_rate,
    v_invoice.exchange_rate_source,
    v_invoice.exchange_rate_updated_at,
    v_payment_amount_base,
    coalesce(p_payment_date, current_date),
    coalesce(nullif(trim(p_method), ''), 'Manual'),
    v_payment_status,
    nullif(trim(p_reference), ''),
    nullif(trim(p_notes), ''),
    current_profile.id
  )
  returning id
  into v_payment_id;

  -- Keep the existing explicit refresh behavior.
  perform public.refresh_invoice_finance_status(p_invoice_id);

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id;

  -- Authoritative balance after inserting and refreshing.
  select *
  into v_balance
  from public.get_invoice_financial_balance(p_invoice_id);

  v_became_paid :=
    v_previous_status is distinct from 'Paid'
    and v_invoice.status = 'Paid';

  -- Preserve existing project creation behavior.
  if v_became_paid then
    begin
      select
        created_project.project_id,
        created_project.created
      into
        v_project_id,
        v_project_created
      from public.create_project_from_paid_invoice(
        p_invoice_id
      ) as created_project
      limit 1;
    exception
      when others then
        v_project_error := sqlerrm;
    end;
  end if;

  payment_id := v_payment_id;
  invoice_id := p_invoice_id;
  invoice_status := v_invoice.status::text;

  -- The centralized function already exposes the balance
  -- in the invoice's original currency.
  remaining_balance :=
    coalesce(v_balance.balance_due, 0);

  became_paid := v_became_paid;
  project_id := v_project_id;
  project_created := coalesce(v_project_created, false);
  project_error := v_project_error;

  return next;
end;
$$;

revoke all
on function public.register_invoice_payment(
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid
)
from public, anon;

grant execute
on function public.register_invoice_payment(
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid
)
to authenticated, service_role;
