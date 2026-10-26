begin;
set local search_path = "$user", public, extensions;
create extension if not exists pgtap;
select plan(3);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.proposals'::regclass
      and tgname = 'proposals_prevent_approved_status_rollback'
      and not tgisinternal
  ),
  'proposal approval rollback guard trigger is installed'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'prevent_approved_proposal_status_rollback'
  ),
  'proposal approval rollback guard function is installed'
);

select ok(
  position(
    'approved_at' in pg_get_functiondef(
      'public.prevent_approved_proposal_status_rollback()'::regprocedure
    )
  ) > 0,
  'approval event timestamp participates in the rollback guard'
);

select * from finish();
rollback;
