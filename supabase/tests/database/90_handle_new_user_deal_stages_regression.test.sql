begin;
set local search_path = "$user", public, extensions;

create extension if not exists pgtap with schema extensions;

select plan(3);

-- Inserting an auth user runs the real on_auth_user_created trigger. Keep the
-- fixture inside this transaction so the test leaves no Auth or CRM records.
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
values (
  'c1000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'handle-new-user-stages@test.local',
  crypt('test-password', gen_salt('bf')),
  now(),
  '{"full_name":"Signup Stage Regression"}'::jsonb,
  now(),
  now()
);

select is(
  (
    select count(*)::integer
    from public.deal_stages ds
    join public.profiles p on p.company_id = ds.company_id
    where p.user_id = 'c1000000-0000-0000-0000-000000000099'
  ),
  6,
  'signup creates all six default pipeline stages using the live deal_stages schema'
);

select results_eq(
  $$
    select ds.name || ':' || ds.display_order::text
    from public.deal_stages ds
    join public.profiles p on p.company_id = ds.company_id
    where p.user_id = 'c1000000-0000-0000-0000-000000000099'
    order by ds.display_order
  $$,
  $$ values
    ('New Opportunity:0'),
    ('Discovery:1'),
    ('Proposal Sent:2'),
    ('Negotiation:3'),
    ('Won:4'),
    ('Lost:5')
  $$,
  'signup stages preserve the names and ordering used by the CRM pipeline'
);

select is(
  (
    select ds.color
    from public.deal_stages ds
    join public.profiles p on p.company_id = ds.company_id
    where p.user_id = 'c1000000-0000-0000-0000-000000000099'
      and ds.name = 'Won'
  ),
  '#10B981'::text,
  'signup preserves the configured Won stage color'
);

select * from finish();

rollback;
