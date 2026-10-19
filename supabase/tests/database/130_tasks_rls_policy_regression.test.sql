begin;
set local search_path = "$user", public, extensions;
create extension if not exists pgtap;
select plan(15);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at
)
values
  ('d9300000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tasks-sales@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Tasks Sales"}', now(), now()),
  ('d9300000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tasks-viewer@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Tasks Viewer"}', now(), now()),
  ('d9300000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tasks-manager@test.local', crypt('test-password', gen_salt('bf')), now(), '{"full_name":"Tasks Manager"}', now(), now());

insert into public.companies (id, company_name)
values ('d2300000-0000-0000-0000-000000000101', 'Tasks RLS Test Company');

-- The snapshot has an auth.users -> profiles trigger. Reassign its synthetic
-- profiles to one shared test company, then set the exact roles under test.
update public.profiles
set company_id = 'd2300000-0000-0000-0000-000000000101', is_active = true
where user_id in (
  'd9300000-0000-0000-0000-000000000101',
  'd9300000-0000-0000-0000-000000000102',
  'd9300000-0000-0000-0000-000000000103'
);

delete from public.user_roles
where user_id in (
  'd9300000-0000-0000-0000-000000000101',
  'd9300000-0000-0000-0000-000000000102',
  'd9300000-0000-0000-0000-000000000103'
);

insert into public.user_roles (user_id, role)
values
  ('d9300000-0000-0000-0000-000000000101', 'sales_agent'),
  ('d9300000-0000-0000-0000-000000000102', 'viewer'),
  ('d9300000-0000-0000-0000-000000000103', 'manager');

insert into public.tasks (id, company_id, title, assigned_to)
values
  ('d3300000-0000-0000-0000-000000000101', 'd2300000-0000-0000-0000-000000000101', 'Sales assigned task', 'd9300000-0000-0000-0000-000000000101'),
  ('d3300000-0000-0000-0000-000000000102', 'd2300000-0000-0000-0000-000000000101', 'Manager assigned task', 'd9300000-0000-0000-0000-000000000103');

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'tasks'
     and policyname in ('tasks_select_company','tasks_insert_company','tasks_update_company','tasks_delete_company')),
  0,
  'legacy company-only policies are absent'
);

grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.task_assignees to authenticated;
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"d9300000-0000-0000-0000-000000000101","role":"authenticated"}', true);
select is(public.get_current_profile_id(), (select id from public.profiles where user_id = auth.uid()), 'sales agent profile is resolved');
select is((select count(*)::integer from public.tasks where id = 'd3300000-0000-0000-0000-000000000101'), 1, 'sales agent can read an assigned task');
select is((select count(*)::integer from public.tasks where id = 'd3300000-0000-0000-0000-000000000102'), 0, 'sales agent cannot read another user task');

insert into public.tasks (id, company_id, title, assigned_to)
values ('d3300000-0000-0000-0000-000000000103', 'd2300000-0000-0000-0000-000000000101', 'Sales created task', auth.uid());
select is((select count(*)::integer from public.tasks where id = 'd3300000-0000-0000-0000-000000000103'), 1, 'sales agent can create a task assigned to self');
select throws_ok(
  $$insert into public.tasks (company_id, title, assigned_to)
    values ('d2300000-0000-0000-0000-000000000101', 'Wrong assignee task', 'd9300000-0000-0000-0000-000000000103')$$,
  '42501', 'new row violates row-level security policy for table "tasks"',
  'sales agent cannot create a task assigned to another user'
);

update public.tasks set title = 'Sales assigned task updated' where id = 'd3300000-0000-0000-0000-000000000101';
select is((select title from public.tasks where id = 'd3300000-0000-0000-0000-000000000101'), 'Sales assigned task updated', 'sales agent can update an assigned task');
update public.tasks set title = 'Unauthorized task update' where id = 'd3300000-0000-0000-0000-000000000102';
delete from public.tasks where id = 'd3300000-0000-0000-0000-000000000101';
select is((select count(*)::integer from public.tasks where id = 'd3300000-0000-0000-0000-000000000101'), 1, 'sales agent cannot delete a task');

select set_config('request.jwt.claims', '{"sub":"d9300000-0000-0000-0000-000000000102","role":"authenticated"}', true);
select is((select count(*)::integer from public.tasks), 3, 'viewer can read company tasks');
select throws_ok(
  $$insert into public.tasks (company_id, title)
    values ('d2300000-0000-0000-0000-000000000101', 'Viewer task')$$,
  '42501', 'new row violates row-level security policy for table "tasks"',
  'viewer cannot create tasks'
);
update public.tasks set title = 'Viewer unauthorized update' where id = 'd3300000-0000-0000-0000-000000000102';
delete from public.tasks where id = 'd3300000-0000-0000-0000-000000000102';

select set_config('request.jwt.claims', '{"sub":"d9300000-0000-0000-0000-000000000103","role":"authenticated"}', true);
select is((select count(*)::integer from public.tasks), 3, 'manager can read company tasks');
select is((select title from public.tasks where id = 'd3300000-0000-0000-0000-000000000102'), 'Manager assigned task', 'restricted users did not update another task');
select is((select count(*)::integer from public.tasks where id = 'd3300000-0000-0000-0000-000000000102'), 1, 'restricted users did not delete another task');
update public.tasks set title = 'Manager updated task' where id = 'd3300000-0000-0000-0000-000000000102';
select is((select title from public.tasks where id = 'd3300000-0000-0000-0000-000000000102'), 'Manager updated task', 'manager can update a company task');
delete from public.tasks where id = 'd3300000-0000-0000-0000-000000000102';
select is((select count(*)::integer from public.tasks where id = 'd3300000-0000-0000-0000-000000000102'), 0, 'manager can delete a company task');

select * from finish();
rollback;
