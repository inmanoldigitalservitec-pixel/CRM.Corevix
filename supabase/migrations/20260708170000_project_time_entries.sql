create table if not exists public.project_time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  entry_date date not null default current_date,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  description text,
  is_billable boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_time_entries_company_project_idx
  on public.project_time_entries(company_id, project_id, archived_at, entry_date desc, created_at desc);

create index if not exists project_time_entries_task_idx
  on public.project_time_entries(task_id);

create index if not exists project_time_entries_profile_idx
  on public.project_time_entries(profile_id);

create or replace function public.set_project_time_entry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_time_entry_updated_at on public.project_time_entries;
create trigger set_project_time_entry_updated_at
before update on public.project_time_entries
for each row execute function public.set_project_time_entry_updated_at();

alter table public.project_time_entries enable row level security;

drop policy if exists project_time_entries_company_select on public.project_time_entries;
create policy project_time_entries_company_select
on public.project_time_entries
for select
using (company_id = public.get_current_company_id());

drop policy if exists project_time_entries_company_insert on public.project_time_entries;
create policy project_time_entries_company_insert
on public.project_time_entries
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists project_time_entries_company_update on public.project_time_entries;
create policy project_time_entries_company_update
on public.project_time_entries
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());
