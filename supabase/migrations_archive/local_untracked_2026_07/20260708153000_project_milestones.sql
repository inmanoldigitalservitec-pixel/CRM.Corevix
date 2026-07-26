create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  depends_on_milestone_id uuid references public.project_milestones(id) on delete set null,
  title text not null,
  description text,
  target_date date,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'blocked', 'cancelled')),
  progress_pct integer not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_milestones_company_project_idx
  on public.project_milestones(company_id, project_id, archived_at, sort_order, target_date, created_at desc);

create index if not exists project_milestones_dependency_idx
  on public.project_milestones(depends_on_milestone_id);

create or replace function public.set_project_milestone_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_milestone_updated_at on public.project_milestones;
create trigger set_project_milestone_updated_at
before update on public.project_milestones
for each row execute function public.set_project_milestone_updated_at();

alter table public.project_milestones enable row level security;

drop policy if exists project_milestones_company_select on public.project_milestones;
create policy project_milestones_company_select
on public.project_milestones
for select
using (company_id = public.get_current_company_id());

drop policy if exists project_milestones_company_insert on public.project_milestones;
create policy project_milestones_company_insert
on public.project_milestones
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists project_milestones_company_update on public.project_milestones;
create policy project_milestones_company_update
on public.project_milestones
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());
