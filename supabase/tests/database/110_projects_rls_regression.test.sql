begin;
set local search_path = "$user", public, extensions;

create extension if not exists pgtap;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at
)
values
  ('c1100000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-sales-one@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Projects Sales One"}', now(), now()),
  ('c1100000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-sales-two@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Projects Sales Two"}', now(), now()),
  ('c1100000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-viewer@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Projects Viewer"}', now(), now()),
  ('c1100000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-admin@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Projects Admin"}', now(), now()),
  ('c1100000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'projects-collaborator@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Projects Collaborator"}', now(), now());

insert into public.companies (id, company_name)
values
  ('c2100000-0000-0000-0000-000000000101', 'Projects RLS Test Company'),
  ('c2100000-0000-0000-0000-000000000102', 'Projects RLS Other Company');

-- This isolated Supabase snapshot has no auth.users -> profiles trigger, so
-- seed the profile identities explicitly for the synthetic JWT claim tests.
insert into public.profiles (id, user_id, company_id, full_name, email, is_active)
values
  ('c4100000-0000-0000-0000-000000000101', 'c1100000-0000-0000-0000-000000000101', 'c2100000-0000-0000-0000-000000000101', 'Projects Sales One', 'projects-sales-one@test.local', true),
  ('c4100000-0000-0000-0000-000000000102', 'c1100000-0000-0000-0000-000000000102', 'c2100000-0000-0000-0000-000000000101', 'Projects Sales Two', 'projects-sales-two@test.local', true),
  ('c4100000-0000-0000-0000-000000000103', 'c1100000-0000-0000-0000-000000000103', 'c2100000-0000-0000-0000-000000000101', 'Projects Viewer', 'projects-viewer@test.local', true),
  ('c4100000-0000-0000-0000-000000000104', 'c1100000-0000-0000-0000-000000000104', 'c2100000-0000-0000-0000-000000000101', 'Projects Admin', 'projects-admin@test.local', true),
  ('c4100000-0000-0000-0000-000000000105', 'c1100000-0000-0000-0000-000000000105', 'c2100000-0000-0000-0000-000000000101', 'Projects Collaborator', 'projects-collaborator@test.local', true);

delete from public.user_roles
where user_id in (
  'c1100000-0000-0000-0000-000000000101',
  'c1100000-0000-0000-0000-000000000102',
  'c1100000-0000-0000-0000-000000000103',
  'c1100000-0000-0000-0000-000000000104',
  'c1100000-0000-0000-0000-000000000105'
);

insert into public.user_roles (user_id, role)
values
  ('c1100000-0000-0000-0000-000000000101', 'sales_agent'),
  ('c1100000-0000-0000-0000-000000000102', 'sales_agent'),
  ('c1100000-0000-0000-0000-000000000103', 'viewer'),
  ('c1100000-0000-0000-0000-000000000104', 'admin'),
  ('c1100000-0000-0000-0000-000000000105', 'collaborator');

insert into public.projects (id, company_id, name, manager)
values
  ('c3100000-0000-0000-0000-000000000101', 'c2100000-0000-0000-0000-000000000101', 'Sales One Project', 'c4100000-0000-0000-0000-000000000101'),
  ('c3100000-0000-0000-0000-000000000102', 'c2100000-0000-0000-0000-000000000101', 'Sales Two Project', 'c4100000-0000-0000-0000-000000000102'),
  ('c3100000-0000-0000-0000-000000000103', 'c2100000-0000-0000-0000-000000000102', 'Other Company Project', 'c4100000-0000-0000-0000-000000000101'),
  ('c3100000-0000-0000-0000-000000000105', 'c2100000-0000-0000-0000-000000000101', 'Assigned Collaborator Project', 'c4100000-0000-0000-0000-000000000102'),
  ('c3100000-0000-0000-0000-000000000106', 'c2100000-0000-0000-0000-000000000101', 'Unassigned Collaborator Project', 'c4100000-0000-0000-0000-000000000102');

insert into public.project_assignees (company_id, project_id, user_id)
values ('c2100000-0000-0000-0000-000000000101', 'c3100000-0000-0000-0000-000000000105', 'c1100000-0000-0000-0000-000000000105');

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'projects'
     and policyname in ('projects_select_company','projects_insert_company','projects_update_company','projects_delete_company')),
  0,
  'legacy permissive company policies are absent'
);

-- Ensure grants do not mask the policy result in minimal database snapshots;
-- this transaction rolls the grant back at the end of the test.
grant select, insert, update, delete on public.projects to authenticated;
grant select on public.project_assignees to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1100000-0000-0000-0000-000000000101","role":"authenticated"}', true);

select is(public.get_current_profile_id(), (select manager from public.projects where id = 'c3100000-0000-0000-0000-000000000101'), 'sales agent resolves the profiles.id manager key');
select isnt(public.get_current_profile_id(), auth.uid(), 'profile manager key differs from the auth user UUID');
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000101'), 1, 'sales agent can select a project managed by their profile');
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000102'), 0, 'sales agent cannot select a project managed by another profile');

insert into public.projects (id, company_id, name, manager)
values ('c3100000-0000-0000-0000-000000000104', 'c2100000-0000-0000-0000-000000000101', 'Sales One New Project', public.get_current_profile_id());
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000104'), 1, 'sales agent can insert with their own profile as manager');

select throws_ok(
  $$insert into public.projects (company_id, name, manager)
    values ('c2100000-0000-0000-0000-000000000101', 'Wrong Manager Project', 'c4100000-0000-0000-0000-000000000102')$$,
  '42501', 'new row violates row-level security policy for table "projects"',
  'sales agent cannot insert with another profile as manager'
);

update public.projects set name = 'Sales One Project Updated' where id = 'c3100000-0000-0000-0000-000000000101';
select is((select name from public.projects where id = 'c3100000-0000-0000-0000-000000000101'), 'Sales One Project Updated', 'sales agent can update a project they manage');
update public.projects set name = 'Unauthorized Update' where id = 'c3100000-0000-0000-0000-000000000102';
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000103'), 0, 'sales agent cannot select a project in another company');
select throws_ok(
  $$insert into public.projects (company_id, name, manager)
    values ('c2100000-0000-0000-0000-000000000102', 'Cross Company Project', public.get_current_profile_id())$$,
  '42501', 'new row violates row-level security policy for table "projects"',
  'sales agent cannot insert into another company'
);
delete from public.projects where id = 'c3100000-0000-0000-0000-000000000101';

select set_config('request.jwt.claims', '{"sub":"c1100000-0000-0000-0000-000000000105","role":"authenticated"}', true);
select isnt(public.get_current_profile_id(), auth.uid(), 'collaborator identity differs from the profile manager key');
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000105'), 1, 'collaborator can select an explicitly assigned project');
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000106'), 0, 'collaborator cannot select an unassigned project managed by another profile');
update public.projects set name = 'Assigned Collaborator Project Updated' where id = 'c3100000-0000-0000-0000-000000000105';
update public.projects set name = 'Unauthorized Collaborator Update' where id = 'c3100000-0000-0000-0000-000000000106';
insert into public.projects (id, company_id, name, manager)
values ('c3100000-0000-0000-0000-000000000107', 'c2100000-0000-0000-0000-000000000101', 'Collaborator Own Manager Project', public.get_current_profile_id());
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000107'), 1, 'collaborator can insert with their own profile as manager');
select throws_ok(
  $$insert into public.projects (company_id, name, manager)
    values ('c2100000-0000-0000-0000-000000000101', 'Collaborator Wrong Manager Project', 'c4100000-0000-0000-0000-000000000102')$$,
  '42501', 'new row violates row-level security policy for table "projects"',
  'collaborator cannot insert with a different profile as manager'
);

select set_config('request.jwt.claims', '{"sub":"c1100000-0000-0000-0000-000000000103","role":"authenticated"}', true);
select is((select count(*)::integer from public.projects where company_id = 'c2100000-0000-0000-0000-000000000101'), 6, 'viewer can read company projects');
select throws_ok(
  $$insert into public.projects (company_id, name)
    values ('c2100000-0000-0000-0000-000000000101', 'Viewer Insert')$$,
  '42501', 'new row violates row-level security policy for table "projects"',
  'viewer cannot insert projects'
);

select set_config('request.jwt.claims', '{"sub":"c1100000-0000-0000-0000-000000000104","role":"authenticated"}', true);
select is((select name from public.projects where id = 'c3100000-0000-0000-0000-000000000102'), 'Sales Two Project', 'sales agent cannot update a project managed by another profile');
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000101'), 1, 'sales agent cannot delete projects');
select is((select name from public.projects where id = 'c3100000-0000-0000-0000-000000000105'), 'Assigned Collaborator Project Updated', 'assigned collaborator can update their project');
select is((select name from public.projects where id = 'c3100000-0000-0000-0000-000000000106'), 'Unassigned Collaborator Project', 'unassigned collaborator cannot update another profile project');
delete from public.projects where id = 'c3100000-0000-0000-0000-000000000102';
select is((select count(*)::integer from public.projects where id = 'c3100000-0000-0000-0000-000000000102'), 0, 'admin can delete a same-company project');

select * from finish();
rollback;
