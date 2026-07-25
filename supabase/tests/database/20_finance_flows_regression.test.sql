begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Permiso temporal para que las políticas RLS puedan consultar profiles.
-- Se revierte al finalizar mediante ROLLBACK.
grant select on public.profiles to authenticated;
-- payments conserva únicamente SELECT; sus mutaciones pasan por RPC.
grant select
on public.payments
to authenticated;

-- Estas tablas todavía requieren permisos temporales para los
-- fixtures y flujos históricos cubiertos por esta prueba.
grant select, insert, update, delete
on public.invoices, public.credit_notes
to authenticated;

grant select
on public.invoice_finance_summary
to authenticated;

-- ============================================================
-- IDs determinísticos para que los resultados sean reproducibles
-- ============================================================

-- Compañía principal
insert into public.companies (
  id,
  company_name
)
values (
  '10000000-0000-0000-0000-000000000001',
  'Finance Regression Company'
);

-- Cliente de prueba
insert into public.clients (
  id,
  company_id,
  company_name
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Finance Regression Client'
);

-- Usuario autenticado con acceso a la compañía
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'finance-regression@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

update public.profiles
set
  id = '40000000-0000-0000-0000-000000000001',
  company_id = '10000000-0000-0000-0000-000000000001',
  full_name = 'Finance Regression User',
  email = 'finance-regression@example.test',
  is_active = true
where user_id = '30000000-0000-0000-0000-000000000001';

-- Usuario autenticado sin perfil ni compañía
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '30000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'finance-no-profile@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- ============================================================
-- Facturas de cada escenario
-- ============================================================

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
  total_base,
  invoice_data
)
values
(
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'TEST-NO-CREDIT',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Sent',
  'USD',
  'USD',
  1,
  1000,
  1000,
  '{"currency":"USD"}'
),
(
  '50000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'TEST-PARTIAL-CREDIT',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Sent',
  'USD',
  'USD',
  1,
  1000,
  1000,
  '{"currency":"USD"}'
),
(
  '50000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'TEST-FULL-CREDIT',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Sent',
  'USD',
  'USD',
  1,
  1000,
  1000,
  '{"currency":"USD"}'
),
(
  '50000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000001',
  'TEST-PAYMENTS',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Sent',
  'USD',
  'USD',
  1,
  1000,
  1000,
  '{"currency":"USD"}'
),
(
  '50000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000001',
  'TEST-OVERPAYMENT',
  '20000000-0000-0000-0000-000000000001',
  500,
  500,
  'Sent',
  'USD',
  'USD',
  1,
  500,
  500,
  '{"currency":"USD"}'
),
(
  '50000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000001',
  'TEST-IDEMPOTENCY',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Sent',
  'USD',
  'USD',
  1,
  1000,
  1000,
  '{"currency":"USD"}'
),
(
  '50000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000001',
  'TEST-IMMUTABLE-PAYMENT',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Paid',
  'USD',
  'USD',
  1,
  1000,
  1000,
  '{"currency":"USD"}'
);

-- ============================================================
-- Créditos del fixture
--
-- Desactivamos temporalmente el trigger de refresh porque el
-- lint ya confirmó que refresh_invoice_finance_status contiene
-- un error enum/text. Aquí queremos aislar la matemática de saldo.
-- ============================================================

alter table public.credit_notes
  disable trigger credit_notes_refresh_invoice_finance;

insert into public.credit_notes (
  id,
  company_id,
  credit_note_number,
  invoice_id,
  client_id,
  amount,
  amount_base,
  status,
  currency,
  base_currency,
  exchange_rate
)
values
(
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  900001,
  '50000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  300,
  300,
  'Issued',
  'USD',
  'USD',
  1
),
(
  '60000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  900002,
  '50000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Applied',
  'USD',
  'USD',
  1
);

alter table public.credit_notes
  enable trigger credit_notes_refresh_invoice_finance;

-- Pago completado usado para probar inmutabilidad.
alter table public.payments
  disable trigger payments_refresh_invoice_finance;

insert into public.payments (
  id,
  company_id,
  invoice_id,
  client_id,
  amount,
  amount_base,
  status,
  method,
  reference,
  currency,
  base_currency,
  exchange_rate,
  created_by
)
values (
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000001',
  1000,
  1000,
  'Completed',
  'Manual',
  'LOCKED',
  'USD',
  'USD',
  1,
  '40000000-0000-0000-0000-000000000001'
);

alter table public.payments
  enable trigger payments_refresh_invoice_finance;

-- ============================================================
-- Casos 1–3: saldo y notas de crédito
-- ============================================================

select is(
  (
    select balance_due
    from public.invoice_finance_summary
    where invoice_id = '50000000-0000-0000-0000-000000000001'
  ),
  1000::numeric,
  'Factura sin créditos conserva saldo completo'
);

select is(
  (
    select balance_due
    from public.invoice_finance_summary
    where invoice_id = '50000000-0000-0000-0000-000000000002'
  ),
  700::numeric,
  'Crédito parcial reduce el saldo de 1000 a 700'
);

select is(
  (
    select balance_due
    from public.invoice_finance_summary
    where invoice_id = '50000000-0000-0000-0000-000000000003'
  ),
  0::numeric,
  'Crédito completo deja la factura con saldo cero'
);

-- ============================================================
-- Contexto del usuario autorizado
-- ============================================================

-- Roles para capacidades financieras sensibles.
insert into public.user_roles (
  user_id,
  role
)
values
('30000000-0000-0000-0000-000000000001', 'admin'::public.app_role),
('30000000-0000-0000-0000-000000000002', 'admin'::public.app_role);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- ============================================================
-- Caso 4: pago parcial
-- ============================================================

select lives_ok(
  $$
    select *
    from public.register_invoice_payment(
      '50000000-0000-0000-0000-000000000004',
      400,
      current_date,
      'Manual',
      'Completed',
      'PARTIAL-001',
      'Pago parcial de regresión',
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  'La RPC acepta un pago parcial válido'
);

select is(
  (
    select count(*)
    from public.payments
    where invoice_id = '50000000-0000-0000-0000-000000000004'
      and status = 'Completed'
  ),
  1::bigint,
  'El pago parcial crea exactamente un registro'
);

select is(
  (
    select balance_due
    from public.invoice_finance_summary
    where invoice_id = '50000000-0000-0000-0000-000000000004'
  ),
  600::numeric,
  'Después del pago parcial el saldo es 600'
);

-- ============================================================
-- Caso 5: pago final
-- ============================================================

select lives_ok(
  $$
    select *
    from public.register_invoice_payment(
      '50000000-0000-0000-0000-000000000004',
      600,
      current_date,
      'Manual',
      'Completed',
      'FINAL-001',
      'Pago final de regresión',
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  'La RPC acepta el pago final'
);

select is(
  (
    select status::text
    from public.invoices
    where id = '50000000-0000-0000-0000-000000000004'
  ),
  'Paid',
  'El pago final cambia la factura a Paid'
);

-- ============================================================
-- Caso 6: intento de sobrepago
-- ============================================================

select throws_matching(
  $$
    select *
    from public.register_invoice_payment(
      '50000000-0000-0000-0000-000000000005',
      501,
      current_date,
      'Manual',
      'Completed',
      'OVERPAY-001',
      null,
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  '.*pago supera el saldo pendiente.*',
  'La RPC rechaza un pago superior al saldo'
);

select is(
  (
    select count(*)
    from public.payments
    where invoice_id = '50000000-0000-0000-0000-000000000005'
  ),
  0::bigint,
  'El sobrepago rechazado no crea registros'
);

-- ============================================================
-- Caso 7: solicitud duplicada
--
-- Se usa la misma referencia dos veces. El resultado deseado es
-- que ambas solicitudes sean seguras y exista un único pago.
-- ============================================================

select lives_ok(
  $$
    select *
    from public.register_invoice_payment(
      '50000000-0000-0000-0000-000000000006',
      100,
      current_date,
      'Manual',
      'Completed',
      'IDEMP-001',
      null,
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  'La primera solicitud idempotente se procesa'
);

select lives_ok(
  $$
    select *
    from public.register_invoice_payment(
      '50000000-0000-0000-0000-000000000006',
      100,
      current_date,
      'Manual',
      'Completed',
      'IDEMP-001',
      null,
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  'Repetir la misma solicitud no debe romper la operación'
);

select is(
  (
    select count(*)
    from public.payments
    where invoice_id = '50000000-0000-0000-0000-000000000006'
      and reference = 'IDEMP-001'
  ),
  1::bigint,
  'Una solicitud duplicada crea un solo pago'
);

-- ============================================================
-- Caso 8: usuario sin permiso o sin compañía
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000002',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_matching(
  $$
    select *
    from public.register_invoice_payment(
      '50000000-0000-0000-0000-000000000005',
      100,
      current_date,
      'Manual',
      'Completed',
      'NO-PERMISSION',
      null,
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  '.*No se encontró la factura dentro de la compañía actual.*',
  'Un usuario de otra compañía no puede registrar pagos en esta factura'
);

-- Volver al usuario autorizado.
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

-- ============================================================
-- Caso 9: pago completado no debe editarse ni eliminarse
-- ============================================================

select ok(
  not has_table_privilege(
    'authenticated',
    'public.payments',
    'UPDATE'
  ),
  'Authenticated no puede editar payments directamente'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.payments',
    'DELETE'
  ),
  'Authenticated no puede eliminar payments directamente'
);

select * from finish();

rollback;
