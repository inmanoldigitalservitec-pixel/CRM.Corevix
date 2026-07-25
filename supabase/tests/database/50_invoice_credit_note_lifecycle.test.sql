begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

grant select on public.profiles to authenticated;
grant select on public.invoices to authenticated;
grant select on public.invoice_items to authenticated;
grant select on public.credit_notes to authenticated;

-- ============================================================
-- Fixtures
-- ============================================================

insert into public.companies (
  id,
  company_name
)
values (
  '11000000-0000-0000-0000-000000000001',
  'Lifecycle Test Company'
);

insert into public.companies (
  id,
  company_name
)
values (
  '11000000-0000-0000-0000-000000000002',
  'Lifecycle Other Company'
);

insert into public.clients (
  id,
  company_id,
  company_name
)
values (
  '21000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  'Lifecycle Client'
);

insert into public.clients (
  id,
  company_id,
  company_name
)
values (
  '21000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000002',
  'Other Company Client'
);

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
  '31000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'lifecycle-admin@example.test',
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
  id = '41000000-0000-0000-0000-000000000001',
  company_id = '11000000-0000-0000-0000-000000000001',
  full_name = 'Lifecycle Admin',
  email = 'lifecycle-admin@example.test',
  is_active = true
where user_id = '31000000-0000-0000-0000-000000000001';

-- Los triggers de onboarding pueden asignar un rol automáticamente.
-- Lo reemplazamos por manager para obtener las capacidades financieras
-- sembradas para esta compañía.
delete from public.user_roles
where user_id = '31000000-0000-0000-0000-000000000001';

insert into public.user_roles (
  user_id,
  role
)
values (
  '31000000-0000-0000-0000-000000000001',
  'manager'::public.app_role
)
on conflict (user_id, role) do nothing;

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
  created_by
)
values (
  '51000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  'INV-LIFE-001',
  '21000000-0000-0000-0000-000000000001',
  1000,
  0,
  0,
  1000,
  'Draft',
  current_date,
  current_date + 30,
  '31000000-0000-0000-0000-000000000001'
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
values (
  '61000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  'Lifecycle service',
  1,
  1000,
  1000
);

insert into public.invoices (
  id,
  company_id,
  number,
  client_id,
  subtotal,
  total,
  status,
  date_issued,
  due_date
)
values (
  '51000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000002',
  'INV-OTHER-001',
  '21000000-0000-0000-0000-000000000002',
  500,
  500,
  'Sent',
  current_date,
  current_date + 30
);

select set_config(
  'request.jwt.claim.sub',
  '31000000-0000-0000-0000-000000000001',
  true
);

set local role authenticated;

-- ============================================================
-- Facturas
-- ============================================================

select lives_ok(
  $$
    select *
    from public.issue_invoice(
      '51000000-0000-0000-0000-000000000001'
    )
  $$,
  'Una factura Draft puede emitirse'
);

select is(
  (
    select status::text
    from public.invoices
    where id = '51000000-0000-0000-0000-000000000001'
  ),
  'Sent',
  'La factura emitida queda en Sent'
);

select throws_ok(
  $$
    select *
    from public.issue_invoice(
      '51000000-0000-0000-0000-000000000001'
    )
  $$,
  '55000',
  'Solo puede emitirse una factura en estado Draft.',
  'Una factura Sent no puede emitirse otra vez'
);

select throws_ok(
  $$
    select *
    from public.issue_invoice(
      '51000000-0000-0000-0000-000000000002'
    )
  $$,
  'Factura no encontrada o acceso denegado.',
  'No puede emitirse una factura de otra compañía'
);

-- ============================================================
-- Notas de crédito
-- ============================================================

select lives_ok(
  $$
    select *
    from public.save_credit_note(
      null,
      '51000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000001',
      200,
      current_date,
      'Ajuste comercial',
      null
    )
  $$,
  'Puede crearse una nota Draft mediante RPC'
);

select is(
  (
    select status
    from public.credit_notes
    where invoice_id = '51000000-0000-0000-0000-000000000001'
  ),
  'Draft',
  'La nota nueva siempre queda en Draft'
);

select lives_ok(
  $$
    select *
    from public.issue_credit_note(
      (
        select id
        from public.credit_notes
        where invoice_id = '51000000-0000-0000-0000-000000000001'
        limit 1
      )
    )
  $$,
  'Una nota Draft puede emitirse'
);

select is(
  (
    select status
    from public.credit_notes
    where invoice_id = '51000000-0000-0000-0000-000000000001'
  ),
  'Issued',
  'La nota emitida queda en Issued'
);

select is(
  (
    select valid_credits
    from public.get_invoice_financial_balance(
      '51000000-0000-0000-0000-000000000001'
    )
  ),
  200::numeric,
  'Una nota Issued reduce el saldo financiero'
);

select lives_ok(
  $$
    select *
    from public.apply_credit_note(
      (
        select id
        from public.credit_notes
        where invoice_id = '51000000-0000-0000-0000-000000000001'
        limit 1
      )
    )
  $$,
  'Una nota Issued puede aplicarse'
);

select is(
  (
    select status
    from public.credit_notes
    where invoice_id = '51000000-0000-0000-0000-000000000001'
  ),
  'Applied',
  'La nota aplicada queda en Applied'
);

select is(
  (
    select valid_credits
    from public.get_invoice_financial_balance(
      '51000000-0000-0000-0000-000000000001'
    )
  ),
  200::numeric,
  'Aplicar la nota no duplica el crédito'
);

select throws_ok(
  $$
    select *
    from public.apply_credit_note(
      (
        select id
        from public.credit_notes
        where invoice_id = '51000000-0000-0000-0000-000000000001'
        limit 1
      )
    )
  $$,
  '55000',
  'Solo puede aplicarse una nota en estado Issued.',
  'Una nota Applied no puede aplicarse otra vez'
);

select throws_ok(
  $$
    select *
    from public.save_credit_note(
      null,
      '51000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000001',
      1200,
      current_date,
      'Crédito excesivo',
      null
    )
  $$,
  '22023',
  'El monto de la nota no puede superar el total de la factura.',
  'No puede crearse una nota mayor al total de la factura'
);

select * from finish();

rollback;
