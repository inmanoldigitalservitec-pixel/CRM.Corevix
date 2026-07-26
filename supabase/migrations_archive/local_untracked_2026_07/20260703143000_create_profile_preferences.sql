create table if not exists public.profile_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  language text not null default 'system',
  timezone text not null default 'America/Santo_Domingo',
  theme text not null default 'system',
  density text not null default 'comfortable',
  default_dashboard text not null default 'dashboard',
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_preferences_profile_id_key unique (profile_id),
  constraint profile_preferences_language_check check (language in ('system', 'en', 'es')),
  constraint profile_preferences_theme_check check (theme in ('system', 'light', 'dark')),
  constraint profile_preferences_density_check check (density in ('comfortable', 'compact')),
  constraint profile_preferences_default_dashboard_check check (
    default_dashboard in ('dashboard', 'tasks', 'projects', 'leads', 'pipeline', 'calendar')
  )
);

alter table public.profile_preferences enable row level security;

drop policy if exists "Users can view own profile preferences" on public.profile_preferences;
create policy "Users can view own profile preferences"
on public.profile_preferences
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_preferences.profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own profile preferences" on public.profile_preferences;
create policy "Users can insert own profile preferences"
on public.profile_preferences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_preferences.profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own profile preferences" on public.profile_preferences;
create policy "Users can update own profile preferences"
on public.profile_preferences
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_preferences.profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = profile_preferences.profile_id
      and p.user_id = auth.uid()
  )
);

create index if not exists profile_preferences_profile_id_idx
on public.profile_preferences(profile_id);
