begin;
set local search_path = "$user", public, extensions;

create extension if not exists pgtap;

select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at
)
values
  ('c1000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-viewer@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Conversion Viewer"}', now(), now()),
  ('c1000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-sales@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Conversion Sales"}', now(), now()),
  ('c1000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-manager@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Conversion Manager"}', now(), now()),
  ('c1000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-admin@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Conversion Admin"}', now(), now()),
  ('c1000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'convert-superadmin@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Conversion Super Admin"}', now(), now());

insert into public.companies (id, company_name)
values ('c2000000-0000-0000-0000-000000000101', 'Lead Conversion Authorization Test');

update public.profiles
set company_id = 'c2000000-0000-0000-0000-000000000101', is_active = true
where user_id in (
  'c1000000-0000-0000-0000-000000000101',
  'c1000000-0000-0000-0000-000000000102',
  'c1000000-0000-0000-0000-000000000103',
  'c1000000-0000-0000-0000-000000000104',
  'c1000000-0000-0000-0000-000000000105'
);

delete from public.user_roles
where user_id in (
  'c1000000-0000-0000-0000-000000000101',
  'c1000000-0000-0000-0000-000000000102',
  'c1000000-0000-0000-0000-000000000103',
  'c1000000-0000-0000-0000-000000000104',
  'c1000000-0000-0000-0000-000000000105'
);

insert into public.user_roles (user_id, role)
values
  ('c1000000-0000-0000-0000-000000000101', 'viewer'),
  ('c1000000-0000-0000-0000-000000000102', 'sales_agent'),
  ('c1000000-0000-0000-0000-000000000103', 'manager'),
  ('c1000000-0000-0000-0000-000000000104', 'admin'),
  ('c1000000-0000-0000-0000-000000000105', 'super_admin');

insert into public.permissions (company_id, role, module, can_view, can_create, can_edit, can_delete, can_assign)
values
  ('c2000000-0000-0000-0000-000000000101', 'viewer', 'clients', true, false, false, false, false),
  ('c2000000-0000-0000-0000-000000000101', 'sales_agent', 'clients', true, true, true, false, false),
  ('c2000000-0000-0000-0000-000000000101', 'manager', 'clients', true, true, true, true, true),
  ('c2000000-0000-0000-0000-000000000101', 'admin', 'clients', true, true, true, true, true),
  ('c2000000-0000-0000-0000-000000000101', 'super_admin', 'clients', true, true, true, true, true)
on conflict (company_id, role, module) do update
set can_create = excluded.can_create;

insert into public.leads (id, company_id, first_name, last_name, assigned_to)
values
  ('c3000000-0000-0000-0000-000000000101', 'c2000000-0000-0000-0000-000000000101', 'Viewer', 'Denied', null),
  ('c3000000-0000-0000-0000-000000000102', 'c2000000-0000-0000-0000-000000000101', 'Sales', 'Own', 'c1000000-0000-0000-0000-000000000102'),
  ('c3000000-0000-0000-0000-000000000103', 'c2000000-0000-0000-0000-000000000101', 'Sales', 'Other', 'c1000000-0000-0000-0000-000000000103'),
  ('c3000000-0000-0000-0000-000000000104', 'c2000000-0000-0000-0000-000000000101', 'Manager', 'Allowed', null),
  ('c3000000-0000-0000-0000-000000000105', 'c2000000-0000-0000-0000-000000000101', 'Admin', 'Allowed', null),
  ('c3000000-0000-0000-0000-000000000106', 'c2000000-0000-0000-0000-000000000101', 'Super Admin', 'Allowed', null);

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000101","role":"authenticated"}', true);
select throws_ok(
  $$select public.convert_lead_to_client('c3000000-0000-0000-0000-000000000101', null)$$,
  'P0001', 'No tienes permiso para convertir a cliente',
  'viewer cannot convert a lead'
);
select is(
  (select count(*)::integer from public.clients where original_lead_id = 'c3000000-0000-0000-0000-000000000101'),
  0,
  'denied viewer conversion creates no client'
);
select is(
  (select converted_client_id from public.leads where id = 'c3000000-0000-0000-0000-000000000101'),
  null::uuid,
  'denied viewer conversion leaves the lead unchanged'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000102","role":"authenticated"}', true);
select throws_ok(
  $$select public.convert_lead_to_client('c3000000-0000-0000-0000-000000000103', null)$$,
  'P0001', 'Solo puedes convertir a cliente tus propios prospectos',
  'sales agent cannot convert another user’s lead'
);
select is(
  (select count(*)::integer from public.clients where original_lead_id = 'c3000000-0000-0000-0000-000000000103'),
  0,
  'denied sales conversion creates no client'
);
select is(
  (select converted_client_id from public.leads where id = 'c3000000-0000-0000-0000-000000000103'),
  null::uuid,
  'denied sales conversion leaves the lead unchanged'
);
select is(
  public.convert_lead_to_client('c3000000-0000-0000-0000-000000000102', null) ->> 'already_converted',
  'false',
  'sales agent can convert an assigned lead'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000103","role":"authenticated"}', true);
select is(
  public.convert_lead_to_client('c3000000-0000-0000-0000-000000000104', null) ->> 'already_converted',
  'false',
  'manager can convert a lead'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000104","role":"authenticated"}', true);
select is(
  public.convert_lead_to_client('c3000000-0000-0000-0000-000000000105', null) ->> 'already_converted',
  'false',
  'admin can convert a lead'
);

select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000105","role":"authenticated"}', true);
select is(
  public.convert_lead_to_client('c3000000-0000-0000-0000-000000000106', null) ->> 'already_converted',
  'false',
  'super admin can convert a lead'
);

select * from finish();
rollback;
