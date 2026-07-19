alter table public.profile_preferences
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_dismissed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists preferred_title text not null default 'none',
  add column if not exists birth_date date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_preferences_preferred_title_check'
  ) then
    alter table public.profile_preferences
      add constraint profile_preferences_preferred_title_check
      check (preferred_title in ('mr', 'ms', 'mx', 'none'));
  end if;
end $$;

insert into public.profile_preferences (
  profile_id,
  onboarding_completed,
  onboarding_completed_at,
  created_at,
  updated_at
)
select
  p.id,
  true,
  now(),
  now(),
  now()
from public.profiles p
where not exists (
  select 1
  from public.profile_preferences pp
  where pp.profile_id = p.id
);

update public.profile_preferences
set
  onboarding_completed = true,
  onboarding_completed_at = coalesce(onboarding_completed_at, now()),
  updated_at = now()
where onboarding_completed = false
  and created_at < now();
