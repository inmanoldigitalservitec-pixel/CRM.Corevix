-- Immutable payment movements:
-- Refund  = partial or total refund.
-- Reversal = cancels the full remaining net amount.
--
-- Original payments remain unchanged.

create table if not exists public.payment_movements (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete restrict,

  original_payment_id uuid not null
    references public.payments(id)
    on delete restrict,

  invoice_id uuid
    references public.invoices(id)
    on delete restrict,

  movement_type text not null,

  amount numeric not null,
  amount_base numeric not null,

  currency text not null,
  base_currency text not null,
  exchange_rate numeric not null default 1,

  reason text not null,
  external_reference text,
  idempotency_key text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint payment_movements_type_check
    check (
      movement_type in ('Refund', 'Reversal')
    ),

  constraint payment_movements_amount_positive
    check (
      amount > 0
      and amount_base > 0
    ),

  constraint payment_movements_reason_not_blank
    check (
      btrim(reason) <> ''
    ),

  constraint payment_movements_idempotency_not_blank
    check (
      idempotency_key is null
      or btrim(idempotency_key) <> ''
    ),

  constraint payment_movements_external_reference_not_blank
    check (
      external_reference is null
      or btrim(external_reference) <> ''
    )
);

comment on table public.payment_movements
is
'Immutable negative financial movements associated with an original completed payment.';

comment on column public.payment_movements.amount
is
'Positive absolute value of the negative movement in the payment currency.';

comment on column public.payment_movements.amount_base
is
'Positive absolute value of the negative movement in the company base currency.';

create index if not exists
  payment_movements_original_payment_idx
on public.payment_movements (
  original_payment_id,
  created_at
);

create index if not exists
  payment_movements_invoice_idx
on public.payment_movements (
  invoice_id,
  created_at
);

create unique index if not exists
  payment_movements_company_idempotency_uidx
on public.payment_movements (
  company_id,
  idempotency_key
)
where idempotency_key is not null;

create unique index if not exists
  payment_movements_company_external_reference_uidx
on public.payment_movements (
  company_id,
  external_reference
)
where external_reference is not null;

alter table public.payment_movements
  enable row level security;

-- Read-only company visibility.
drop policy if exists
  "view company payment movements"
on public.payment_movements;

create policy
  "view company payment movements"
on public.payment_movements
for select
to authenticated
using (
  company_id = public.get_user_company_id(
    (select auth.uid())
  )
);

-- No INSERT, UPDATE or DELETE policies are created.
-- Mutations must pass through the dedicated RPCs.

revoke all
on table public.payment_movements
from public, anon, authenticated;

grant select
on table public.payment_movements
to authenticated;

-- ============================================================
-- Shared helper: current net amount remaining on a payment
-- ============================================================

create or replace function public.get_payment_net_balance(
  p_payment_id uuid
)
returns table (
  payment_id uuid,
  company_id uuid,
  invoice_id uuid,
  original_amount numeric,
  original_amount_base numeric,
  movement_amount numeric,
  movement_amount_base numeric,
  net_amount numeric,
  net_amount_base numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as payment_id,
    p.company_id,
    p.invoice_id,

    p.amount as original_amount,
    coalesce(p.amount_base, p.amount) as original_amount_base,

    coalesce(m.movement_amount, 0) as movement_amount,
    coalesce(m.movement_amount_base, 0) as movement_amount_base,

    greatest(
      p.amount - coalesce(m.movement_amount, 0),
      0
    ) as net_amount,

    greatest(
      coalesce(p.amount_base, p.amount)
        - coalesce(m.movement_amount_base, 0),
      0
    ) as net_amount_base

  from public.payments p

  left join lateral (
    select
      sum(pm.amount) as movement_amount,
      sum(pm.amount_base) as movement_amount_base
    from public.payment_movements pm
    where pm.original_payment_id = p.id
  ) m on true

  where p.id = p_payment_id;
$$;

revoke all
on function public.get_payment_net_balance(uuid)
from public, anon, authenticated;

grant execute
on function public.get_payment_net_balance(uuid)
to service_role;

-- ============================================================
-- Refund RPC
-- ============================================================

create or replace function public.refund_invoice_payment(
  p_original_payment_id uuid,
  p_amount numeric,
  p_reason text,
  p_external_reference text default null,
  p_idempotency_key text default null
)
returns table (
  movement_id uuid,
  original_payment_id uuid,
  invoice_id uuid,
  refunded_amount numeric,
  remaining_payment_balance numeric,
  remaining_invoice_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_payment public.payments%rowtype;
  v_existing public.payment_movements%rowtype;
  v_net record;
  v_invoice_balance record;

  v_reason text;
  v_external_reference text;
  v_idempotency_key text;

  v_amount_base numeric;
  v_movement_id uuid;
  v_is_duplicate boolean := false;
begin
  perform public.require_permission('payments.refund');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and coalesce(is_active, true) = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception 'No hay contexto de compañía.';
  end if;

  if p_original_payment_id is null then
    raise exception 'No se pudo confirmar el pago original.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto del reembolso debe ser mayor que cero.';
  end if;

  v_reason := nullif(btrim(p_reason), '');

  if v_reason is null then
    raise exception 'Debe indicar el motivo del reembolso.';
  end if;

  v_external_reference :=
    nullif(btrim(p_external_reference), '');

  v_idempotency_key :=
    nullif(btrim(p_idempotency_key), '');

  select *
  into v_payment
  from public.payments
  where id = p_original_payment_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'No se encontró el pago dentro de la compañía actual.';
  end if;

  if v_payment.status <> 'Completed' then
    raise exception
      'Solo pueden reembolsarse pagos completados.';
  end if;

  if v_payment.invoice_id is null then
    raise exception
      'El pago no está asociado a una factura.';
  end if;

  -- Idempotency must be resolved before financial validation.
  if v_idempotency_key is not null
     or v_external_reference is not null then

    select pm.*
    into v_existing
    from public.payment_movements pm
    where pm.company_id = v_profile.company_id
      and (
        (
          v_idempotency_key is not null
          and pm.idempotency_key = v_idempotency_key
        )
        or
        (
          v_external_reference is not null
          and pm.external_reference = v_external_reference
        )
      )
    order by pm.created_at
    limit 1;

    if found then
      if v_existing.original_payment_id
           is distinct from p_original_payment_id
         or v_existing.movement_type <> 'Refund'
         or v_existing.amount is distinct from p_amount then
        raise exception
          'La clave de idempotencia ya fue utilizada con datos diferentes.';
      end if;

      v_movement_id := v_existing.id;
      v_is_duplicate := true;
    end if;
  end if;

  if not v_is_duplicate then
    select *
    into v_net
    from public.get_payment_net_balance(
      p_original_payment_id
    );

    if v_net.payment_id is null then
      raise exception
        'No fue posible calcular el balance neto del pago.';
    end if;

    if p_amount > v_net.net_amount then
      raise exception
        'El reembolso supera el monto neto disponible del pago.';
    end if;

    -- Preserve the exact FX proportion used by the original payment.
    v_amount_base :=
      round(
        p_amount
        * (
          coalesce(v_payment.amount_base, v_payment.amount)
          / v_payment.amount
        ),
        2
      );

    begin
      insert into public.payment_movements (
        company_id,
        original_payment_id,
        invoice_id,
        movement_type,
        amount,
        amount_base,
        currency,
        base_currency,
        exchange_rate,
        reason,
        external_reference,
        idempotency_key,
        created_by
      )
      values (
        v_payment.company_id,
        v_payment.id,
        v_payment.invoice_id,
        'Refund',
        p_amount,
        v_amount_base,
        coalesce(v_payment.currency, 'USD'),
        coalesce(
          v_payment.base_currency,
          v_payment.currency,
          'USD'
        ),
        coalesce(v_payment.exchange_rate, 1),
        v_reason,
        v_external_reference,
        v_idempotency_key,
        v_profile.id
      )
      returning id
      into v_movement_id;

    exception
      when unique_violation then
        select pm.*
        into v_existing
        from public.payment_movements pm
        where pm.company_id = v_profile.company_id
          and (
            (
              v_idempotency_key is not null
              and pm.idempotency_key = v_idempotency_key
            )
            or
            (
              v_external_reference is not null
              and pm.external_reference = v_external_reference
            )
          )
        order by pm.created_at
        limit 1;

        if not found then
          raise;
        end if;

        if v_existing.original_payment_id
             is distinct from p_original_payment_id
           or v_existing.movement_type <> 'Refund'
           or v_existing.amount is distinct from p_amount then
          raise exception
            'La clave de idempotencia ya fue utilizada con datos diferentes.';
        end if;

        v_movement_id := v_existing.id;
        v_is_duplicate := true;
    end;
  end if;

  select *
  into v_net
  from public.get_payment_net_balance(
    p_original_payment_id
  );

  select *
  into v_invoice_balance
  from public.get_invoice_financial_balance(
    v_payment.invoice_id
  );

  movement_id := v_movement_id;
  original_payment_id := v_payment.id;
  invoice_id := v_payment.invoice_id;
  refunded_amount := p_amount;
  remaining_payment_balance :=
    coalesce(v_net.net_amount, 0);
  remaining_invoice_balance :=
    coalesce(v_invoice_balance.balance_due, 0);

  return next;
end;
$$;

-- ============================================================
-- Reversal RPC
-- ============================================================

create or replace function public.reverse_invoice_payment(
  p_original_payment_id uuid,
  p_reason text,
  p_external_reference text default null,
  p_idempotency_key text default null
)
returns table (
  movement_id uuid,
  original_payment_id uuid,
  invoice_id uuid,
  reversed_amount numeric,
  remaining_payment_balance numeric,
  remaining_invoice_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_payment public.payments%rowtype;
  v_existing public.payment_movements%rowtype;
  v_net record;
  v_invoice_balance record;

  v_reason text;
  v_external_reference text;
  v_idempotency_key text;

  v_movement_id uuid;
  v_reversal_amount numeric;
  v_reversal_amount_base numeric;
  v_is_duplicate boolean := false;
begin
  perform public.require_permission('payments.reverse');

  select *
  into v_profile
  from public.profiles
  where user_id = auth.uid()
    and coalesce(is_active, true) = true
  limit 1;

  if v_profile.id is null
     or v_profile.company_id is null then
    raise exception 'No hay contexto de compañía.';
  end if;

  if p_original_payment_id is null then
    raise exception 'No se pudo confirmar el pago original.';
  end if;

  v_reason := nullif(btrim(p_reason), '');

  if v_reason is null then
    raise exception 'Debe indicar el motivo del reverso.';
  end if;

  v_external_reference :=
    nullif(btrim(p_external_reference), '');

  v_idempotency_key :=
    nullif(btrim(p_idempotency_key), '');

  select *
  into v_payment
  from public.payments
  where id = p_original_payment_id
    and company_id = v_profile.company_id
  for update;

  if not found then
    raise exception
      'No se encontró el pago dentro de la compañía actual.';
  end if;

  if v_payment.status <> 'Completed' then
    raise exception
      'Solo pueden reversarse pagos completados.';
  end if;

  if v_payment.invoice_id is null then
    raise exception
      'El pago no está asociado a una factura.';
  end if;

  if v_idempotency_key is not null
     or v_external_reference is not null then

    select pm.*
    into v_existing
    from public.payment_movements pm
    where pm.company_id = v_profile.company_id
      and (
        (
          v_idempotency_key is not null
          and pm.idempotency_key = v_idempotency_key
        )
        or
        (
          v_external_reference is not null
          and pm.external_reference = v_external_reference
        )
      )
    order by pm.created_at
    limit 1;

    if found then
      if v_existing.original_payment_id
           is distinct from p_original_payment_id
         or v_existing.movement_type <> 'Reversal' then
        raise exception
          'La clave de idempotencia ya fue utilizada con datos diferentes.';
      end if;

      v_movement_id := v_existing.id;
      v_reversal_amount := v_existing.amount;
      v_is_duplicate := true;
    end if;
  end if;

  if not v_is_duplicate then
    select *
    into v_net
    from public.get_payment_net_balance(
      p_original_payment_id
    );

    if v_net.payment_id is null then
      raise exception
        'No fue posible calcular el balance neto del pago.';
    end if;

    if v_net.net_amount <= 0 then
      raise exception
        'El pago ya no tiene un monto neto disponible para reversar.';
    end if;

    v_reversal_amount := v_net.net_amount;
    v_reversal_amount_base := v_net.net_amount_base;

    begin
      insert into public.payment_movements (
        company_id,
        original_payment_id,
        invoice_id,
        movement_type,
        amount,
        amount_base,
        currency,
        base_currency,
        exchange_rate,
        reason,
        external_reference,
        idempotency_key,
        created_by
      )
      values (
        v_payment.company_id,
        v_payment.id,
        v_payment.invoice_id,
        'Reversal',
        v_reversal_amount,
        v_reversal_amount_base,
        coalesce(v_payment.currency, 'USD'),
        coalesce(
          v_payment.base_currency,
          v_payment.currency,
          'USD'
        ),
        coalesce(v_payment.exchange_rate, 1),
        v_reason,
        v_external_reference,
        v_idempotency_key,
        v_profile.id
      )
      returning id
      into v_movement_id;

    exception
      when unique_violation then
        select pm.*
        into v_existing
        from public.payment_movements pm
        where pm.company_id = v_profile.company_id
          and (
            (
              v_idempotency_key is not null
              and pm.idempotency_key = v_idempotency_key
            )
            or
            (
              v_external_reference is not null
              and pm.external_reference = v_external_reference
            )
          )
        order by pm.created_at
        limit 1;

        if not found then
          raise;
        end if;

        if v_existing.original_payment_id
             is distinct from p_original_payment_id
           or v_existing.movement_type <> 'Reversal' then
          raise exception
            'La clave de idempotencia ya fue utilizada con datos diferentes.';
        end if;

        v_movement_id := v_existing.id;
        v_reversal_amount := v_existing.amount;
        v_is_duplicate := true;
    end;
  end if;

  select *
  into v_net
  from public.get_payment_net_balance(
    p_original_payment_id
  );

  select *
  into v_invoice_balance
  from public.get_invoice_financial_balance(
    v_payment.invoice_id
  );

  movement_id := v_movement_id;
  original_payment_id := v_payment.id;
  invoice_id := v_payment.invoice_id;
  reversed_amount := v_reversal_amount;
  remaining_payment_balance :=
    coalesce(v_net.net_amount, 0);
  remaining_invoice_balance :=
    coalesce(v_invoice_balance.balance_due, 0);

  return next;
end;
$$;

-- ============================================================
-- Central invoice balance now uses net collected payments
-- ============================================================

create or replace function public.get_invoice_financial_balance(
  p_invoice_id uuid
)
returns table (
  invoice_id uuid,
  company_id uuid,
  currency text,
  base_currency text,
  exchange_rate numeric,
  total_amount numeric,
  total_base numeric,
  completed_payments numeric,
  completed_payments_base numeric,
  valid_credits numeric,
  valid_credits_base numeric,
  balance_due numeric,
  balance_due_base numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with invoice_row as (
    select
      i.id,
      i.company_id,
      i.currency,
      i.base_currency,
      i.exchange_rate,
      i.total,
      coalesce(i.total_base, i.total) as total_base
    from public.invoices i
    where i.id = p_invoice_id
  ),

  payment_totals as (
    select
      p.invoice_id,

      coalesce(
        sum(p.amount)
          filter (where p.status = 'Completed'),
        0
      ) as gross_payments,

      coalesce(
        sum(coalesce(p.amount_base, p.amount))
          filter (where p.status = 'Completed'),
        0
      ) as gross_payments_base

    from public.payments p
    where p.invoice_id = p_invoice_id
    group by p.invoice_id
  ),

  movement_totals as (
    select
      pm.invoice_id,
      coalesce(sum(pm.amount), 0) as movements,
      coalesce(sum(pm.amount_base), 0) as movements_base
    from public.payment_movements pm
    where pm.invoice_id = p_invoice_id
    group by pm.invoice_id
  ),

  credit_totals as (
    select
      cn.invoice_id,

      coalesce(
        sum(cn.amount)
          filter (
            where cn.status in ('Issued', 'Applied')
          ),
        0
      ) as credits,

      coalesce(
        sum(coalesce(cn.amount_base, cn.amount))
          filter (
            where cn.status in ('Issued', 'Applied')
          ),
        0
      ) as credits_base

    from public.credit_notes cn
    where cn.invoice_id = p_invoice_id
    group by cn.invoice_id
  )

  select
    i.id as invoice_id,
    i.company_id,
    i.currency,
    i.base_currency,
    i.exchange_rate,

    i.total as total_amount,
    i.total_base,

    greatest(
      coalesce(pt.gross_payments, 0)
        - coalesce(mt.movements, 0),
      0
    ) as completed_payments,

    greatest(
      coalesce(pt.gross_payments_base, 0)
        - coalesce(mt.movements_base, 0),
      0
    ) as completed_payments_base,

    coalesce(ct.credits, 0) as valid_credits,
    coalesce(ct.credits_base, 0) as valid_credits_base,

    greatest(
      i.total
        - greatest(
            coalesce(pt.gross_payments, 0)
              - coalesce(mt.movements, 0),
            0
          )
        - coalesce(ct.credits, 0),
      0
    ) as balance_due,

    greatest(
      i.total_base
        - greatest(
            coalesce(pt.gross_payments_base, 0)
              - coalesce(mt.movements_base, 0),
            0
          )
        - coalesce(ct.credits_base, 0),
      0
    ) as balance_due_base

  from invoice_row i
  left join payment_totals pt
    on pt.invoice_id = i.id
  left join movement_totals mt
    on mt.invoice_id = i.id
  left join credit_totals ct
    on ct.invoice_id = i.id;
$$;

comment on function public.get_invoice_financial_balance(uuid)
is
'Returns invoice balance using net completed payments after immutable refunds and reversals, plus valid credits.';

-- ============================================================
-- Function privileges
-- ============================================================

revoke all
on function public.refund_invoice_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon;

revoke all
on function public.reverse_invoice_payment(
  uuid,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.refund_invoice_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
to authenticated, service_role;

grant execute
on function public.reverse_invoice_payment(
  uuid,
  text,
  text,
  text
)
to authenticated, service_role;

-- The public finance view currently depends on this helper.
revoke all
on function public.get_invoice_financial_balance(uuid)
from public, anon, authenticated;

grant execute
on function public.get_invoice_financial_balance(uuid)
to authenticated, service_role;

-- ============================================================
-- Payment movements are immutable
-- ============================================================

create or replace function public.protect_payment_movement_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception
      'Los movimientos de pago son inmutables y no pueden editarse.'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    raise exception
      'Los movimientos de pago son inmutables y no pueden eliminarse.'
      using errcode = '55000';
  end if;

  return null;
end;
$$;

drop trigger if exists
  payment_movements_protect_mutations
on public.payment_movements;

create trigger payment_movements_protect_mutations
before update or delete
on public.payment_movements
for each row
execute function public.protect_payment_movement_mutations();

revoke all
on function public.protect_payment_movement_mutations()
from public, anon, authenticated;

grant execute
on function public.protect_payment_movement_mutations()
to service_role;

comment on function public.protect_payment_movement_mutations()
is
'Prevents updates and deletes of immutable refund and reversal movements.';
