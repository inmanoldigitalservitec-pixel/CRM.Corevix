begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

-- ============================================================
-- Acceso requerido por las RPC y por la lectura de auditoría
-- ============================================================

grant select on public.profiles to authenticated;
grant select on public.invoices to authenticated;
grant select on public.invoice_items to authenticated;
grant select on public.payments to authenticated;
grant select on public.payment_movements to authenticated;
grant select on public.credit_notes to authenticated;
grant select on public.financial_audit_events to authenticated;

grant execute
on function public.issue_invoice(uuid)
to authenticated;

grant execute
on function public.void_invoice(uuid, text)
to authenticated;

grant execute
on function public.save_credit_note(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text,
  text
)
to authenticated;

grant execute
on function public.issue_credit_note(uuid)
to authenticated;

grant execute
on function public.apply_credit_note(uuid)
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
-- Compañías
-- ============================================================

insert into public.companies (
  id,
  company_name
)
values
(
  '81000000-0000-0000-0000-000000000001',
  'Financial Audit Company'
),
(
  '81000000-0000-0000-0000-000000000002',
  'Financial Audit Other Company'
);


-- ============================================================
-- Usuarios
-- ============================================================

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
values
(
  '82000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'financial-audit@test.local',
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
),
(
  '82000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'financial-audit-other@test.local',
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
  company_id = '81000000-0000-0000-0000-000000000001',
  full_name = 'Financial Audit Manager',
  is_active = true
where user_id = '82000000-0000-0000-0000-000000000001';

update public.profiles
set
  company_id = '81000000-0000-0000-0000-000000000002',
  full_name = 'Other Financial Audit Manager',
  is_active = true
where user_id = '82000000-0000-0000-0000-000000000002';

delete from public.user_roles
where user_id in (
  '82000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000002'
);

insert into public.user_roles (
  user_id,
  role
)
values
(
  '82000000-0000-0000-0000-000000000001',
  'manager'::public.app_role
),
(
  '82000000-0000-0000-0000-000000000002',
  'manager'::public.app_role
)
on conflict (user_id, role) do nothing;

-- El test necesita cubrir invoices.void para la compañía principal.
insert into public.role_capabilities (
  company_id,
  role,
  capability,
  is_allowed
)
values (
  '81000000-0000-0000-0000-000000000001',
  'manager'::public.app_role,
  'invoices.void',
  true
)
on conflict (
  company_id,
  role,
  capability
)
do update
set
  is_allowed = excluded.is_allowed,
  updated_at = now();

-- ============================================================
-- Clientes
-- ============================================================

insert into public.clients (
  id,
  company_id,
  company_name
)
values
(
  '83000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'Financial Audit Client'
),
(
  '83000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000002',
  'Other Financial Audit Client'
);


-- ============================================================
-- Facturas
--
-- 001: pago, reembolso y reverso
-- 002: emisión y anulación
-- 003: emisión y nota de crédito
-- 004: aislamiento multitenant
-- ============================================================

insert into public.invoices (
  id,
  company_id,
  number,
  client_id,
  subtotal,
  tax,
  discount,
  total,
  status,
  date_issued,
  due_date,
  currency,
  base_currency,
  exchange_rate,
  subtotal_base,
  total_base
)
values
(
  '84000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'AUDIT-PAYMENT-001',
  '83000000-0000-0000-0000-000000000001',
  500,
  0,
  0,
  500,
  'Sent',
  current_date,
  current_date + 30,
  'USD',
  'USD',
  1,
  500,
  500
),
(
  '84000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000001',
  'AUDIT-VOID-001',
  '83000000-0000-0000-0000-000000000001',
  300,
  0,
  0,
  300,
  'Draft',
  current_date,
  current_date + 30,
  'USD',
  'USD',
  1,
  300,
  300
),
(
  '84000000-0000-0000-0000-000000000003',
  '81000000-0000-0000-0000-000000000001',
  'AUDIT-CREDIT-001',
  '83000000-0000-0000-0000-000000000001',
  400,
  0,
  0,
  400,
  'Draft',
  current_date,
  current_date + 30,
  'USD',
  'USD',
  1,
  400,
  400
),
(
  '84000000-0000-0000-0000-000000000004',
  '81000000-0000-0000-0000-000000000002',
  'AUDIT-OTHER-001',
  '83000000-0000-0000-0000-000000000002',
  100,
  0,
  0,
  100,
  'Sent',
  current_date,
  current_date + 30,
  'USD',
  'USD',
  1,
  100,
  100
);

insert into public.invoice_items (
  id,
  company_id,
  invoice_id,
  description,
  quantity,
  unit_price,
  total
)
values
(
  '85000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000002',
  'Invoice to void',
  1,
  300,
  300
),
(
  '85000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000003',
  'Invoice with credit',
  1,
  400,
  400
);


-- ============================================================
-- Pagos creados como fixture
--
-- Estos INSERT deben generar:
-- payment.registered
-- payment.rejected
-- ============================================================

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
  '86000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  500,
  500,
  current_date,
  'Manual',
  'Completed',
  'AUDIT-COMPLETED',
  'USD',
  'USD',
  1
),
(
  '86000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000001',
  null,
  '83000000-0000-0000-0000-000000000001',
  75,
  75,
  current_date,
  'Manual',
  'Failed',
  'AUDIT-FAILED',
  'USD',
  'USD',
  1
),
(
  '86000000-0000-0000-0000-000000000003',
  '81000000-0000-0000-0000-000000000002',
  '84000000-0000-0000-0000-000000000004',
  '83000000-0000-0000-0000-000000000002',
  100,
  100,
  current_date,
  'Manual',
  'Completed',
  'AUDIT-OTHER-COMPANY',
  'USD',
  'USD',
  1
);


-- ============================================================
-- Autenticación de compañía principal
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  '82000000-0000-0000-0000-000000000001',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"82000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

set local role authenticated;


-- ============================================================
-- Pago registrado y rechazado
-- ============================================================

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'payment.registered'
      and payment_id =
        '86000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'Un pago Completed genera payment.registered'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'payment.rejected'
      and payment_id =
        '86000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'Un pago Failed genera payment.rejected'
);

select ok(
  (
    select
      amount = 500
      and currency = 'USD'
      and invoice_id =
        '84000000-0000-0000-0000-000000000001'
      and metadata->>'method' = 'Manual'
    from public.financial_audit_events
    where event_type = 'payment.registered'
      and payment_id =
        '86000000-0000-0000-0000-000000000001'
  ),
  'El evento payment.registered conserva monto, moneda y factura'
);


-- ============================================================
-- Reembolso y reverso
-- ============================================================

select lives_ok(
  $$
    select *
    from public.refund_invoice_payment(
      '86000000-0000-0000-0000-000000000001',
      200,
      'Reembolso auditado',
      'audit-refund-ext',
      'audit-refund-idem'
    )
  $$,
  'El reembolso auditado se procesa correctamente'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'payment.refunded'
      and payment_id =
        '86000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'El reembolso genera payment.refunded'
);

select lives_ok(
  $$
    select *
    from public.reverse_invoice_payment(
      '86000000-0000-0000-0000-000000000001',
      'Reverso auditado',
      'audit-reversal-ext',
      'audit-reversal-idem'
    )
  $$,
  'El reverso auditado se procesa correctamente'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'payment.reversed'
      and payment_id =
        '86000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'El reverso genera payment.reversed'
);


-- ============================================================
-- Factura emitida y anulada
-- ============================================================

select lives_ok(
  $$
    select *
    from public.issue_invoice(
      '84000000-0000-0000-0000-000000000002'
    )
  $$,
  'La factura de anulación puede emitirse'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'invoice.issued'
      and invoice_id =
        '84000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'Emitir una factura genera invoice.issued'
);

select lives_ok(
  $$
    select *
    from public.void_invoice(
      '84000000-0000-0000-0000-000000000002',
      'Anulación auditada'
    )
  $$,
  'La factura puede anularse'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'invoice.voided'
      and invoice_id =
        '84000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'Anular una factura genera invoice.voided'
);


-- ============================================================
-- Nota de crédito emitida y aplicada
-- ============================================================

select lives_ok(
  $$
    select *
    from public.issue_invoice(
      '84000000-0000-0000-0000-000000000003'
    )
  $$,
  'La factura para crédito puede emitirse'
);

select lives_ok(
  $$
    select *
    from public.save_credit_note(
      null,
      '84000000-0000-0000-0000-000000000003',
      '83000000-0000-0000-0000-000000000001',
      100,
      current_date,
      'Crédito auditado',
      null
    )
  $$,
  'La nota de crédito Draft puede crearse'
);

select lives_ok(
  $$
    select *
    from public.issue_credit_note(
      (
        select id
        from public.credit_notes
        where invoice_id =
          '84000000-0000-0000-0000-000000000003'
        limit 1
      )
    )
  $$,
  'La nota de crédito puede emitirse'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'credit_note.issued'
      and invoice_id =
        '84000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'Emitir una nota genera credit_note.issued'
);

select lives_ok(
  $$
    select *
    from public.apply_credit_note(
      (
        select id
        from public.credit_notes
        where invoice_id =
          '84000000-0000-0000-0000-000000000003'
        limit 1
      )
    )
  $$,
  'La nota emitida puede aplicarse'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'credit_note.applied'
      and invoice_id =
        '84000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'Aplicar una nota genera credit_note.applied'
);


-- ============================================================
-- Una operación inválida no crea un segundo evento
-- ============================================================

select throws_ok(
  $$
    select *
    from public.apply_credit_note(
      (
        select id
        from public.credit_notes
        where invoice_id =
          '84000000-0000-0000-0000-000000000003'
        limit 1
      )
    )
  $$,
  '55000',
  'Solo puede aplicarse una nota en estado Issued.',
  'Una nota Applied no puede aplicarse nuevamente'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'credit_note.applied'
      and invoice_id =
        '84000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'La operación fallida no duplica credit_note.applied'
);


-- ============================================================
-- Una actualización operativa no duplica invoice.issued
-- ============================================================

reset role;

select lives_ok(
  $$
    update public.invoices
    set viewed_at = now()
    where id = '84000000-0000-0000-0000-000000000003'
  $$,
  'Actualizar viewed_at no afecta la auditoría financiera'
);

select is(
  (
    select count(*)
    from public.financial_audit_events
    where event_type = 'invoice.issued'
      and invoice_id =
        '84000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'Una actualización operativa no duplica invoice.issued'
);


-- ============================================================
-- Inmutabilidad
-- ============================================================

select throws_ok(
  $$
    update public.financial_audit_events
    set metadata = '{"altered":true}'::jsonb
    where payment_id =
      '86000000-0000-0000-0000-000000000001'
  $$,
  '55000',
  'Los eventos de auditoría financiera son inmutables.',
  'Un evento financiero no puede editarse'
);

select throws_ok(
  $$
    delete from public.financial_audit_events
    where payment_id =
      '86000000-0000-0000-0000-000000000001'
  $$,
  '55000',
  'Los eventos de auditoría financiera son inmutables.',
  'Un evento financiero no puede eliminarse'
);


-- ============================================================
-- Privilegios
-- ============================================================

select ok(
  not has_table_privilege(
    'authenticated',
    'public.financial_audit_events',
    'INSERT'
  ),
  'authenticated no puede insertar eventos directamente'
);

select ok(
  not has_table_privilege(
    'service_role',
    'public.financial_audit_events',
    'TRUNCATE'
  ),
  'service_role no puede truncar la auditoría financiera'
);


-- ============================================================
-- Aislamiento multitenant por RLS
-- ============================================================

set local role authenticated;

select is(
  (
    select count(*)
    from public.financial_audit_events
  ),
  9::bigint,
  'La compañía solo puede leer sus nueve eventos financieros'
);

select * from finish();

rollback;
