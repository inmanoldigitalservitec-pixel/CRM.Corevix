begin;

create extension if not exists pgtap;

select plan(20);

-- ============================================================
-- Fixtures de autorización
-- ============================================================

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
(
  'c1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'viewer-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Finance Viewer"}'::jsonb,
  now(),
  now()
),
(
  'c1000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'sales-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Finance Sales Agent"}'::jsonb,
  now(),
  now()
),
(
  'c1000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'manager-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Finance Manager"}'::jsonb,
  now(),
  now()
),
(
  'c1000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'inactive-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Inactive Finance User"}'::jsonb,
  now(),
  now()
),
(
  'c1000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'norole-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Finance User Without Role"}'::jsonb,
  now(),
  now()
),
(
  'c1000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'superadmin-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Finance Super Admin"}'::jsonb,
  now(),
  now()
),
(
  'c1000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'multirole-finance@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Finance Multi Role"}'::jsonb,
  now(),
  now()
);

-- La inserción activa el trigger que genera las capacidades
-- predeterminadas para todos los roles financieros.
insert into public.companies (
  id,
  company_name
)
values (
  'c2000000-0000-0000-0000-000000000001',
  'Finance Permission Test Company'
);

update public.profiles
set
  company_id = 'c2000000-0000-0000-0000-000000000001',
  is_active = true
where user_id in (
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000005',
  'c1000000-0000-0000-0000-000000000006',
  'c1000000-0000-0000-0000-000000000007'
);

update public.profiles
set
  company_id = 'c2000000-0000-0000-0000-000000000001',
  is_active = false
where user_id =
  'c1000000-0000-0000-0000-000000000004';

-- Los triggers de onboarding pueden asignar roles automáticamente.
-- Limpiamos únicamente los usuarios de este fixture para controlar
-- exactamente la matriz de autorización que vamos a probar.
delete from public.user_roles
where user_id in (
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  'c1000000-0000-0000-0000-000000000006',
  'c1000000-0000-0000-0000-000000000007'
);

insert into public.user_roles (
  user_id,
  role
)
values
(
  'c1000000-0000-0000-0000-000000000001',
  'viewer'::public.app_role
),
(
  'c1000000-0000-0000-0000-000000000002',
  'sales_agent'::public.app_role
),
(
  'c1000000-0000-0000-0000-000000000003',
  'manager'::public.app_role
),
(
  'c1000000-0000-0000-0000-000000000004',
  'manager'::public.app_role
),
(
  'c1000000-0000-0000-0000-000000000006',
  'super_admin'::public.app_role
),
(
  'c1000000-0000-0000-0000-000000000007',
  'viewer'::public.app_role
),
(
  'c1000000-0000-0000-0000-000000000007',
  'manager'::public.app_role
)
on conflict (user_id, role) do nothing;

set local role authenticated;

-- ============================================================
-- Viewer
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000001',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.view'
  ),
  'Viewer puede consultar pagos'
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.create'
  ),
  'Viewer no puede registrar pagos'
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.refund'
  ),
  'Viewer no puede reembolsar pagos'
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.reverse'
  ),
  'Viewer no puede reversar pagos'
);

select throws_ok(
  $$
    select *
    from public.register_invoice_payment(
      null,
      100
    )
  $$,
  '42501',
  'No tiene el permiso requerido: payments.create.',
  'register_invoice_payment bloquea al viewer'
);

select throws_ok(
  $$
    select *
    from public.refund_invoice_payment(
      null,
      100,
      'Prueba no autorizada'
    )
  $$,
  '42501',
  'No tiene el permiso requerido: payments.refund.',
  'refund_invoice_payment bloquea al viewer'
);

select throws_ok(
  $$
    select *
    from public.reverse_invoice_payment(
      null,
      'Prueba no autorizada'
    )
  $$,
  '42501',
  'No tiene el permiso requerido: payments.reverse.',
  'reverse_invoice_payment bloquea al viewer'
);

-- ============================================================
-- Sales agent
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000002',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.create'
  ),
  'Sales agent puede registrar pagos'
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.refund'
  ),
  'Sales agent no puede reembolsar pagos'
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.reverse'
  ),
  'Sales agent no puede reversar pagos'
);

-- ============================================================
-- Manager
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000003',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.create'
  ),
  'Manager puede registrar pagos'
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.refund'
  ),
  'Manager puede reembolsar pagos'
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.reverse'
  ),
  'Manager puede reversar pagos'
);

-- ============================================================
-- Perfil inactivo
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000004',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.create'
  ),
  'Un perfil inactivo no conserva permisos financieros'
);

select throws_ok(
  $$
    select public.require_permission(
      'payments.create'
    )
  $$,
  '42501',
  'El perfil del usuario está inactivo.',
  'require_permission rechaza perfiles inactivos'
);

-- ============================================================
-- Usuario sin rol
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000005',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000005","role":"authenticated"}',
  true
);

select ok(
  not public.has_permission(
    auth.uid(),
    'payments.view'
  ),
  'Un usuario sin rol no tiene capacidades financieras'
);

select throws_ok(
  $$
    select public.require_permission(
      'payments.view'
    )
  $$,
  '42501',
  'El usuario no tiene un rol asignado.',
  'require_permission rechaza usuarios sin rol'
);

-- ============================================================
-- Super admin
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000006',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000006","role":"authenticated"}',
  true
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.refund'
  ),
  'Super admin conserva acceso a capacidades sensibles'
);

-- ============================================================
-- Usuario con múltiples roles
-- ============================================================

select set_config(
  'request.jwt.claim.sub',
  'c1000000-0000-0000-0000-000000000007',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1000000-0000-0000-0000-000000000007","role":"authenticated"}',
  true
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.create'
  ),
  'Un usuario con múltiples roles recibe payments.create'
);

select ok(
  public.has_permission(
    auth.uid(),
    'payments.refund'
  ),
  'Las capacidades de múltiples roles se combinan correctamente'
);

select * from finish();

rollback;
