create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'internal' check (kind in ('internal')),
  content text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_notes_company_project_updated_idx
  on public.project_notes(company_id, project_id, updated_at desc);

create index if not exists project_notes_project_active_idx
  on public.project_notes(project_id, archived_at, updated_at desc);

create or replace function public.set_project_note_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_project_note_updated_at on public.project_notes;
create trigger set_project_note_updated_at
before update on public.project_notes
for each row execute function public.set_project_note_updated_at();

alter table public.project_notes enable row level security;

drop policy if exists project_notes_company_select on public.project_notes;
create policy project_notes_company_select
on public.project_notes
for select
using (company_id = public.get_current_company_id());

drop policy if exists project_notes_company_insert on public.project_notes;
create policy project_notes_company_insert
on public.project_notes
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists project_notes_company_update on public.project_notes;
create policy project_notes_company_update
on public.project_notes
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());
