-- ============================================================
-- Auditoría financiera inmutable
-- ============================================================

create table public.financial_audit_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete restrict,

  actor_user_id uuid,
  actor_profile_id uuid
    references public.profiles(id)
    on delete set null,

  event_type text not null,

  entity_type text not null,
  entity_id uuid,

  invoice_id uuid
    references public.invoices(id)
    on delete set null,

  payment_id uuid
    references public.payments(id)
    on delete set null,

  credit_note_id uuid
    references public.credit_notes(id)
    on delete set null,

  amount numeric,
  currency text,

  previous_status text,
  new_status text,

  metadata jsonb not null default '{}'::jsonb,

  transaction_id bigint not null default txid_current(),
  occurred_at timestamptz not null default clock_timestamp(),

  constraint financial_audit_events_type_check
    check (
      event_type in (
        'payment.registered',
        'payment.rejected',
        'payment.reversed',
        'payment.refunded',
        'credit_note.issued',
        'credit_note.applied',
        'invoice.issued',
        'invoice.voided'
      )
    ),

  constraint financial_audit_entity_type_not_blank
    check (btrim(entity_type) <> ''),

  constraint financial_audit_event_type_not_blank
    check (btrim(event_type) <> '')
);

create index financial_audit_events_company_time_idx
  on public.financial_audit_events (
    company_id,
    occurred_at desc
  );

create index financial_audit_events_entity_idx
  on public.financial_audit_events (
    entity_type,
    entity_id,
    occurred_at desc
  );

create index financial_audit_events_invoice_idx
  on public.financial_audit_events (
    invoice_id,
    occurred_at desc
  )
  where invoice_id is not null;

create index financial_audit_events_payment_idx
  on public.financial_audit_events (
    payment_id,
    occurred_at desc
  )
  where payment_id is not null;

create index financial_audit_events_credit_note_idx
  on public.financial_audit_events (
    credit_note_id,
    occurred_at desc
  )
  where credit_note_id is not null;


-- ============================================================
-- RLS: solo lectura autorizada
-- ============================================================

alter table public.financial_audit_events
enable row level security;

drop policy if exists financial_audit_events_select
  on public.financial_audit_events;

create policy financial_audit_events_select
on public.financial_audit_events
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    public.has_permission(
      auth.uid(),
      'payments.view'
    )
    or public.has_permission(
      auth.uid(),
      'invoices.view'
    )
    or public.has_permission(
      auth.uid(),
      'credit_notes.view'
    )
  )
);

revoke all
on public.financial_audit_events
from public, anon, authenticated;

grant select
on public.financial_audit_events
to authenticated;

-- service_role puede consultar eventos, pero no alterarlos ni truncarlos.
revoke all
on public.financial_audit_events
from service_role;

grant select
on public.financial_audit_events
to service_role;


-- ============================================================
-- La tabla es append-only
-- ============================================================

create or replace function public.protect_financial_audit_events()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Los eventos de auditoría financiera son inmutables.'
    using errcode = '55000';
end;
$$;

drop trigger if exists financial_audit_events_immutable
  on public.financial_audit_events;

create trigger financial_audit_events_immutable
before update or delete
on public.financial_audit_events
for each row
execute function public.protect_financial_audit_events();

revoke all
on function public.protect_financial_audit_events()
from public, anon, authenticated;


-- ============================================================
-- Helper interno de inserción
-- ============================================================

create or replace function public.append_financial_audit_event(
  p_company_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_invoice_id uuid default null,
  p_payment_id uuid default null,
  p_credit_note_id uuid default null,
  p_amount numeric default null,
  p_currency text default null,
  p_previous_status text default null,
  p_new_status text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_event_id uuid;
begin
  if p_company_id is null then
    raise exception 'La compañía del evento es obligatoria.';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.company_id = p_company_id
  limit 1;

  insert into public.financial_audit_events (
    company_id,
    actor_user_id,
    actor_profile_id,
    event_type,
    entity_type,
    entity_id,
    invoice_id,
    payment_id,
    credit_note_id,
    amount,
    currency,
    previous_status,
    new_status,
    metadata
  )
  values (
    p_company_id,
    auth.uid(),
    v_profile_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_invoice_id,
    p_payment_id,
    p_credit_note_id,
    p_amount,
    nullif(btrim(coalesce(p_currency, '')), ''),
    p_previous_status,
    p_new_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all
on function public.append_financial_audit_event(
  uuid,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text,
  text,
  text,
  jsonb
)
from public, anon, authenticated;


-- ============================================================
-- Auditoría automática de pagos
-- ============================================================

create or replace function public.audit_payment_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status::text = 'Completed' then
      perform public.append_financial_audit_event(
        new.company_id,
        'payment.registered',
        'payment',
        new.id,
        new.invoice_id,
        new.id,
        null,
        new.amount,
        new.currency,
        null,
        new.status::text,
        jsonb_build_object(
          'client_id', new.client_id,
          'payment_date', new.payment_date,
          'method', new.method,
          'external_payment_id', new.external_payment_id
        )
      );
    elsif new.status::text in (
      'Failed',
      'Rejected',
      'Cancelled'
    ) then
      perform public.append_financial_audit_event(
        new.company_id,
        'payment.rejected',
        'payment',
        new.id,
        new.invoice_id,
        new.id,
        null,
        new.amount,
        new.currency,
        null,
        new.status::text,
        jsonb_build_object(
          'client_id', new.client_id,
          'payment_date', new.payment_date,
          'method', new.method
        )
      );
    end if;

    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status::text = 'Completed' then
      perform public.append_financial_audit_event(
        new.company_id,
        'payment.registered',
        'payment',
        new.id,
        new.invoice_id,
        new.id,
        null,
        new.amount,
        new.currency,
        old.status::text,
        new.status::text,
        '{}'::jsonb
      );
    elsif new.status::text in (
      'Failed',
      'Rejected',
      'Cancelled'
    ) then
      perform public.append_financial_audit_event(
        new.company_id,
        'payment.rejected',
        'payment',
        new.id,
        new.invoice_id,
        new.id,
        null,
        new.amount,
        new.currency,
        old.status::text,
        new.status::text,
        '{}'::jsonb
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_financial_audit
  on public.payments;

create trigger payments_financial_audit
after insert or update of status
on public.payments
for each row
execute function public.audit_payment_events();


-- ============================================================
-- Auditoría de reversos y reembolsos
-- ============================================================

create or replace function public.audit_payment_movement_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
begin
  v_event_type := case new.movement_type::text
    when 'Refund' then 'payment.refunded'
    when 'Reversal' then 'payment.reversed'
    else null
  end;

  if v_event_type is null then
    return new;
  end if;

  perform public.append_financial_audit_event(
    new.company_id,
    v_event_type,
    'payment_movement',
    new.id,
    new.invoice_id,
    new.original_payment_id,
    null,
    new.amount,
    new.currency,
    null,
    new.movement_type::text,
    jsonb_build_object(
      'reason', new.reason,
      'amount_base', new.amount_base,
      'exchange_rate', new.exchange_rate
    )
  );

  return new;
end;
$$;

drop trigger if exists payment_movements_financial_audit
  on public.payment_movements;

create trigger payment_movements_financial_audit
after insert
on public.payment_movements
for each row
execute function public.audit_payment_movement_events();


-- ============================================================
-- Auditoría de notas de crédito
-- ============================================================

create or replace function public.audit_credit_note_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_event_type := case new.status
    when 'Issued' then 'credit_note.issued'
    when 'Applied' then 'credit_note.applied'
    else null
  end;

  if v_event_type is null then
    return new;
  end if;

  perform public.append_financial_audit_event(
    new.company_id,
    v_event_type,
    'credit_note',
    new.id,
    new.invoice_id,
    null,
    new.id,
    new.amount,
    new.currency,
    old.status,
    new.status,
    jsonb_build_object(
      'client_id', new.client_id,
      'credit_note_number', new.credit_note_number
    )
  );

  return new;
end;
$$;

drop trigger if exists credit_notes_financial_audit
  on public.credit_notes;

create trigger credit_notes_financial_audit
after update of status
on public.credit_notes
for each row
execute function public.audit_credit_note_events();


-- ============================================================
-- Auditoría de facturas
-- ============================================================

create or replace function public.audit_invoice_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_type text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_event_type := case new.status::text
    when 'Sent' then 'invoice.issued'
    when 'Cancelled' then 'invoice.voided'
    else null
  end;

  if v_event_type is null then
    return new;
  end if;

  perform public.append_financial_audit_event(
    new.company_id,
    v_event_type,
    'invoice',
    new.id,
    new.id,
    null,
    null,
    new.total,
    new.currency,
    old.status::text,
    new.status::text,
    jsonb_build_object(
      'number', new.number,
      'client_id', new.client_id,
      'total_base', new.total_base
    )
  );

  return new;
end;
$$;

drop trigger if exists invoices_financial_audit
  on public.invoices;

create trigger invoices_financial_audit
after update of status
on public.invoices
for each row
execute function public.audit_invoice_events();


revoke all
on function public.audit_payment_events()
from public, anon, authenticated;

revoke all
on function public.audit_payment_movement_events()
from public, anon, authenticated;

revoke all
on function public.audit_credit_note_events()
from public, anon, authenticated;

revoke all
on function public.audit_invoice_events()
from public, anon, authenticated;

comment on table public.financial_audit_events
is 'Registro append-only de eventos financieros confirmados. Los intentos no autorizados se escriben en el log de PostgreSQL porque una excepción revierte cualquier inserción transaccional.';
