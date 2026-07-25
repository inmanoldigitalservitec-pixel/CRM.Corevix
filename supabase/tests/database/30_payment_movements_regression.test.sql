begin;

create extension if not exists pgtap;

select plan(15);

-- ============================================================
-- Permisos temporales de la prueba
-- ============================================================

grant select on public.profiles to authenticated;

grant select, insert, update, delete
on public.payments,
   public.invoices,
   public.clients,
   public.credit_notes
to authenticated;

grant select on public.payment_movements to authenticated;

grant execute
on function public.get_invoice_financial_balance(uuid)
to authenticated;

grant execute
on function public.refund_invoice_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
to authenticated;

grant execute
on function public.reverse_invoice_payment(
  uuid,
  text,
  text,
  text
)
to authenticated;

-- ============================================================
-- Fixtures
-- ============================================================

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
(
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'movements-company-a@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  now(),
  now()
),
(
  'a1000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'movements-company-b@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  now(),
  now()
);

insert into public.companies (
  id,
  company_name
)
values
(
  'a2000000-0000-0000-0000-000000000001',
  'Payment Movements Company A'
),
(
  'a2000000-0000-0000-0000-000000000002',
  'Payment Movements Company B'
);

update public.profiles
set
  company_id = 'a2000000-0000-0000-0000-000000000001',
  is_active = true
where user_id = 'a1000000-0000-0000-0000-000000000001';

update public.profiles
set
  company_id = 'a2000000-0000-0000-0000-000000000002',
  is_active = true
where user_id = 'a1000000-0000-0000-0000-000000000002';

insert into public.clients (
  id,
  company_id,
  company_name
)
values
(
  'a3000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'Movement Client A'
),
(
  'a3000000-0000-0000-0000-000000000002',
  'a2000000-0000-0000-0000-000000000002',
  'Movement Client B'
);

insert into public.invoices (
  id,
  company_id,
  number,
  client_id,
  subtotal,
  total,
  status,
  currency,
  base_currency,
  exchange_rate,
  subtotal_base,
  total_base
)
values
(
  'a4000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'MOVEMENT-001',
  'a3000000-0000-0000-0000-000000000001',
  500,
  500,
  'Sent',
  'USD',
  'USD',
  1,
  500,
  500
),
(
  'a4000000-0000-0000-0000-000000000002',
  'a2000000-0000-0000-0000-000000000002',
  'MOVEMENT-002',
  'a3000000-0000-0000-0000-000000000002',
  500,
  500,
  'Sent',
  'USD',
  'USD',
  1,
  500,
  500
);

insert into public.payments (
  id,
  company_id,
  invoice_id,
  client_id,
  amount,
  amount_base,
  payment_date,
  method,
  status,
  reference,
  currency,
  base_currency,
  exchange_rate
)
values
(
  'a5000000-0000-0000-0000-000000000001',
  'a2000000-0000-0000-0000-000000000001',
  'a4000000-0000-0000-0000-000000000001',
  'a3000000-0000-0000-0000-000000000001',
  500,
  500,
  current_date,
  'Manual',
  'Completed',
  'MOVEMENT-PAYMENT-A',
  'USD',
  'USD',
  1
),
(
  'a5000000-0000-0000-0000-000000000002',
  'a2000000-0000-0000-0000-000000000002',
  'a4000000-0000-0000-0000-000000000002',
  'a3000000-0000-0000-0000-000000000002',
  500,
  500,
  current_date,
  'Manual',
  'Completed',
  'MOVEMENT-PAYMENT-B',
  'USD',
  'USD',
  1
);

-- ============================================================
-- Autenticación: compañía A
-- ============================================================

-- Roles para capacidades financieras sensibles.
insert into public.user_roles (
  user_id,
  role
)
values
('a1000000-0000-0000-0000-000000000001', 'admin'::public.app_role),
('a1000000-0000-0000-0000-000000000002', 'admin'::public.app_role);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- ============================================================
-- Caso 1: reembolso parcial de 200
-- ============================================================

create temporary table test_refund_result as
select *
from public.refund_invoice_payment(
  'a5000000-0000-0000-0000-000000000001',
  200,
  'Reembolso parcial de prueba',
  'refund-ext-001',
  'refund-idem-001'
);

select is(
  (
    select refunded_amount
    from test_refund_result
  ),
  200::numeric,
  'El reembolso parcial devuelve el monto solicitado'
);

select is(
  (
    select remaining_payment_balance
    from test_refund_result
  ),
  300::numeric,
  'El pago conserva un balance neto de 300'
);

select is(
  (
    select balance_due
    from public.get_invoice_financial_balance(
      'a4000000-0000-0000-0000-000000000001'
    )
  ),
  200::numeric,
  'El reembolso restaura 200 al saldo de la factura'
);

select is(
  (
    select count(*)
    from public.payment_movements
    where original_payment_id =
      'a5000000-0000-0000-0000-000000000001'
      and movement_type = 'Refund'
  ),
  1::bigint,
  'El reembolso crea un movimiento Refund'
);

-- ============================================================
-- Caso 2: repetición idempotente
-- ============================================================

select lives_ok(
  $$
    select *
    from public.refund_invoice_payment(
      'a5000000-0000-0000-0000-000000000001',
      200,
      'Reembolso parcial de prueba',
      'refund-ext-001',
      'refund-idem-001'
    )
  $$,
  'Repetir el mismo reembolso no produce un error financiero'
);

select is(
  (
    select count(*)
    from public.payment_movements
    where idempotency_key = 'refund-idem-001'
  ),
  1::bigint,
  'La repetición idempotente conserva un solo movimiento'
);

-- ============================================================
-- Caso 3: exceso de reembolso
-- ============================================================

select throws_ok(
  $$
    select *
    from public.refund_invoice_payment(
      'a5000000-0000-0000-0000-000000000001',
      301,
      'Reembolso excesivo',
      'refund-ext-002',
      'refund-idem-002'
    )
  $$,
  'P0001',
  'El reembolso supera el monto neto disponible del pago.',
  'No se puede reembolsar más que el neto restante'
);

-- ============================================================
-- Caso 4: reverso del neto restante
-- ============================================================

create temporary table test_reversal_result as
select *
from public.reverse_invoice_payment(
  'a5000000-0000-0000-0000-000000000001',
  'Reverso del remanente',
  'reversal-ext-001',
  'reversal-idem-001'
);

select is(
  (
    select reversed_amount
    from test_reversal_result
  ),
  300::numeric,
  'El reverso cancela los 300 restantes'
);

select is(
  (
    select remaining_payment_balance
    from test_reversal_result
  ),
  0::numeric,
  'El balance neto del pago queda en cero'
);

select is(
  (
    select balance_due
    from public.get_invoice_financial_balance(
      'a4000000-0000-0000-0000-000000000001'
    )
  ),
  500::numeric,
  'Después del reverso la factura vuelve a deber 500'
);

select is(
  (
    select count(*)
    from public.payment_movements
    where original_payment_id =
      'a5000000-0000-0000-0000-000000000001'
      and movement_type = 'Reversal'
  ),
  1::bigint,
  'El reverso crea un movimiento Reversal'
);

-- ============================================================
-- Caso 5: aislamiento entre compañías
-- ============================================================

select throws_ok(
  $$
    select *
    from public.refund_invoice_payment(
      'a5000000-0000-0000-0000-000000000002',
      100,
      'Intento sobre otra compañía',
      'refund-ext-foreign',
      'refund-idem-foreign'
    )
  $$,
  'P0001',
  'No se encontró el pago dentro de la compañía actual.',
  'Un usuario no puede reembolsar pagos de otra compañía'
);

-- ============================================================
-- Caso 6: movimientos inmutables
-- ============================================================

-- RLS ya impide UPDATE y DELETE al rol authenticated.
-- Cambiamos al propietario para comprobar que el trigger también
-- protege los movimientos frente a SQL privilegiado.
reset role;

select throws_ok(
  $$
    update public.payment_movements
    set reason = 'Motivo modificado'
    where idempotency_key = 'refund-idem-001'
  $$,
  '55000',
  'Los movimientos de pago son inmutables y no pueden editarse.',
  'Un movimiento de pago no puede editarse'
);

select throws_ok(
  $$
    delete from public.payment_movements
    where idempotency_key = 'refund-idem-001'
  $$,
  '55000',
  'Los movimientos de pago son inmutables y no pueden eliminarse.',
  'Un movimiento de pago no puede eliminarse'
);

-- El pago original nunca fue alterado.
select is(
  (
    select amount
    from public.payments
    where id = 'a5000000-0000-0000-0000-000000000001'
  ),
  500::numeric,
  'El pago original conserva su monto histórico de 500'
);

select * from finish();

rollback;
