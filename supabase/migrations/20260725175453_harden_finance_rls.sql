-- ============================================================
-- Harden direct finance table access
-- ============================================================

alter table public.payments
  enable row level security;

alter table public.payment_movements
  enable row level security;

alter table public.invoices
  enable row level security;

alter table public.credit_notes
  enable row level security;

-- Eliminar todas las políticas anteriores de las tablas cuya
-- escritura deberá realizarse exclusivamente mediante RPC.

do $$
declare
  v_policy record;
begin
  for v_policy in
    select
      schemaname,
      tablename,
      policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'payments',
        'payment_movements',
        'credit_notes'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  end loop;
end;
$$;

-- El constructor antiguo todavía escribe invoices directamente.
-- Por ahora reemplazamos únicamente las políticas de lectura.

do $$
declare
  v_policy record;
begin
  for v_policy in
    select
      schemaname,
      tablename,
      policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'invoices'
      and cmd = 'SELECT'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  end loop;
end;
$$;

-- ============================================================
-- Lectura basada en capacidades
-- ============================================================

create policy "payments capability select"
on public.payments
for select
to authenticated
using (
  company_id = public.get_user_company_id(
    (select auth.uid())
  )
  and public.has_permission(
    (select auth.uid()),
    'payments.view'
  )
);

create policy "payment movements capability select"
on public.payment_movements
for select
to authenticated
using (
  company_id = public.get_user_company_id(
    (select auth.uid())
  )
  and public.has_permission(
    (select auth.uid()),
    'payments.view'
  )
);

create policy "invoices capability select"
on public.invoices
for select
to authenticated
using (
  company_id = public.get_user_company_id(
    (select auth.uid())
  )
  and public.has_permission(
    (select auth.uid()),
    'invoices.view'
  )
);

create policy "credit notes capability select"
on public.credit_notes
for select
to authenticated
using (
  company_id = public.get_user_company_id(
    (select auth.uid())
  )
  and public.has_permission(
    (select auth.uid()),
    'credit_notes.view'
  )
);

-- ============================================================
-- Privilegios directos
-- ============================================================

-- payments solo puede modificarse mediante RPC protegidas.

revoke all privileges
on table public.payments
from public, anon, authenticated;

grant select
on table public.payments
to authenticated;

-- payment_movements solo puede crearse mediante refund/reverse.

revoke all privileges
on table public.payment_movements
from public, anon, authenticated;

grant select
on table public.payment_movements
to authenticated;

-- credit_notes queda temporalmente solo lectura hasta crear
-- issue_credit_note y apply_credit_note.

revoke all privileges
on table public.credit_notes
from public, anon, authenticated;

grant select
on table public.credit_notes
to authenticated;

-- invoices conserva temporalmente sus privilegios de escritura
-- para no romper el constructor antiguo.

revoke select
on table public.invoices
from public, anon, authenticated;

grant select
on table public.invoices
to authenticated;

-- Estos privilegios administrativos no deben estar disponibles
-- para los roles utilizados por el frontend.

revoke truncate, references, trigger
on table
  public.invoices,
  public.invoice_items
from public, anon, authenticated;

comment on policy "payments capability select"
on public.payments
is 'Company-scoped payment reads requiring payments.view.';

comment on policy "payment movements capability select"
on public.payment_movements
is 'Company-scoped payment movement reads requiring payments.view.';

comment on policy "invoices capability select"
on public.invoices
is 'Company-scoped invoice reads requiring invoices.view.';

comment on policy "credit notes capability select"
on public.credit_notes
is 'Company-scoped credit-note reads requiring credit_notes.view.';
