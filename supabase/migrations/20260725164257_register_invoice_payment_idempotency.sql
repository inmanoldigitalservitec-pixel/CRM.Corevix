-- Add idempotency support to register_invoice_payment.
--
-- Idempotency resolution occurs before balance validation so that retrying a
-- successful request returns the original payment instead of producing an
-- ambiguous "invoice already paid" or "payment exceeds balance" error.

drop function if exists public.register_invoice_payment(
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  uuid
);

create function public.register_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_method text default 'Manual',
  p_status text default 'Completed',
  p_reference text default null,
  p_notes text default null,
  p_client_id uuid default null,
  p_provider text default null,
  p_external_payment_id text default null,
  p_idempotency_key text default null
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
  v_existing_payment public.payments%rowtype;

  v_previous_status text;
  v_payment_status text;
  v_payment_amount_base numeric;

  v_provider text;
  v_external_payment_id text;
  v_idempotency_key text;

  v_balance record;

  v_payment_id uuid;
  v_is_duplicate boolean := false;
  v_became_paid boolean := false;

  v_project_id uuid;
  v_project_created boolean := false;
  v_project_error text;
begin
  perform public.require_permission('payments.create');

  -- Resolve authenticated company context.
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
    coalesce(
      nullif(btrim(p_status), ''),
      'Completed'
    );

  v_provider :=
    nullif(
      lower(btrim(p_provider)),
      ''
    );

  v_external_payment_id :=
    nullif(
      btrim(p_external_payment_id),
      ''
    );

  v_idempotency_key :=
    nullif(
      btrim(p_idempotency_key),
      ''
    );

  if (
    v_provider is null
    and v_external_payment_id is not null
  ) or (
    v_provider is not null
    and v_external_payment_id is null
  ) then
    raise exception
      'provider y external_payment_id deben enviarse juntos.';
  end if;

  -- Backward-compatible server-generated key for legacy/manual calls.
  --
  -- New clients should send p_idempotency_key explicitly. Existing callers
  -- that already send a reference gain retry protection automatically.
  if v_idempotency_key is null
     and v_provider is null
     and nullif(btrim(p_reference), '') is not null then
    v_idempotency_key :=
      'legacy-reference:'
      || p_invoice_id::text
      || ':'
      || lower(btrim(p_reference));
  end if;

  -- Serialize all financial operations for this invoice.
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

  if v_invoice.status = 'Cancelled'::public.invoice_status then
    raise exception 'Esta factura está cancelada.';
  end if;

  v_previous_status := v_invoice.status::text;

  -- Search for an already-processed request before validating the balance.
  if v_idempotency_key is not null
     or (
       v_provider is not null
       and v_external_payment_id is not null
     ) then

    select p.*
    into v_existing_payment
    from public.payments p
    where p.company_id = current_profile.company_id
      and (
        (
          v_idempotency_key is not null
          and p.idempotency_key = v_idempotency_key
        )
        or
        (
          v_provider is not null
          and v_external_payment_id is not null
          and p.provider = v_provider
          and p.external_payment_id = v_external_payment_id
        )
      )
    order by
      case
        when v_idempotency_key is not null
         and p.idempotency_key = v_idempotency_key
          then 0
        else 1
      end,
      p.created_at
    limit 1;

    if found then
      if v_existing_payment.invoice_id is distinct from p_invoice_id
         or v_existing_payment.amount is distinct from p_amount
         or v_existing_payment.status is distinct from v_payment_status then
        raise exception
          'La clave de idempotencia ya fue utilizada con datos diferentes.';
      end if;

      v_payment_id := v_existing_payment.id;
      v_is_duplicate := true;
    end if;
  end if;

  if not v_is_duplicate then
    v_payment_amount_base :=
      public.crm_convert_currency_amount(
        p_amount,
        v_invoice.currency,
        v_invoice.base_currency,
        v_invoice.exchange_rate
      );

    select *
    into v_balance
    from public.get_invoice_financial_balance(p_invoice_id);

    if v_balance.invoice_id is null then
      raise exception
        'No fue posible calcular el saldo financiero de la factura.';
    end if;

    if v_payment_status = 'Completed'
       and v_balance.balance_due_base <= 0 then
      raise exception 'Esta factura ya está pagada.';
    end if;

    if v_payment_status = 'Completed'
       and v_payment_amount_base > v_balance.balance_due_base then
      raise exception 'El pago supera el saldo pendiente.';
    end if;

    begin
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
        created_by,
        provider,
        external_payment_id,
        idempotency_key
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
        coalesce(
          nullif(btrim(p_method), ''),
          'Manual'
        ),
        v_payment_status,
        nullif(btrim(p_reference), ''),
        nullif(btrim(p_notes), ''),
        current_profile.id,
        v_provider,
        v_external_payment_id,
        v_idempotency_key
      )
      returning id
      into v_payment_id;

    exception
      when unique_violation then
        -- A concurrent retry may have inserted the payment after our initial
        -- lookup. Resolve it and return the original row.
        select p.*
        into v_existing_payment
        from public.payments p
        where p.company_id = current_profile.company_id
          and (
            (
              v_idempotency_key is not null
              and p.idempotency_key = v_idempotency_key
            )
            or
            (
              v_provider is not null
              and v_external_payment_id is not null
              and p.provider = v_provider
              and p.external_payment_id = v_external_payment_id
            )
          )
        order by p.created_at
        limit 1;

        if not found then
          raise;
        end if;

        if v_existing_payment.invoice_id is distinct from p_invoice_id
           or v_existing_payment.amount is distinct from p_amount
           or v_existing_payment.status is distinct from v_payment_status then
          raise exception
            'La clave de idempotencia ya fue utilizada con datos diferentes.';
        end if;

        v_payment_id := v_existing_payment.id;
        v_is_duplicate := true;
    end;
  end if;

  -- A duplicate retry must be read-only: do not refresh, create projects or
  -- repeat side effects.
  if v_is_duplicate then
    select *
    into v_invoice
    from public.invoices
    where id = p_invoice_id
      and company_id = current_profile.company_id;

    select *
    into v_balance
    from public.get_invoice_financial_balance(p_invoice_id);

    payment_id := v_payment_id;
    invoice_id := p_invoice_id;
    invoice_status := v_invoice.status::text;
    remaining_balance :=
      coalesce(v_balance.balance_due, 0);
    became_paid := false;
    project_id := null;
    project_created := false;
    project_error := null;

    return next;
    return;
  end if;

  -- Normal successful insertion path.
  perform public.refresh_invoice_finance_status(p_invoice_id);

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
    and company_id = current_profile.company_id;

  select *
  into v_balance
  from public.get_invoice_financial_balance(p_invoice_id);

  v_became_paid :=
    v_previous_status is distinct from 'Paid'
    and v_invoice.status = 'Paid'::public.invoice_status;

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
  remaining_balance :=
    coalesce(v_balance.balance_due, 0);
  became_paid := v_became_paid;
  project_id := v_project_id;
  project_created :=
    coalesce(v_project_created, false);
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
  uuid,
  text,
  text,
  text
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
  uuid,
  text,
  text,
  text
)
to authenticated, service_role;
