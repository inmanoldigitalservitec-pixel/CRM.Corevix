create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'internal' check (kind in ('internal')),
  content text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_notes_company_lead_updated_idx
  on public.lead_notes(company_id, lead_id, updated_at desc);

create index if not exists lead_notes_lead_active_idx
  on public.lead_notes(lead_id, archived_at, updated_at desc);

create or replace function public.set_lead_note_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lead_note_updated_at on public.lead_notes;
create trigger set_lead_note_updated_at
before update on public.lead_notes
for each row execute function public.set_lead_note_updated_at();

alter table public.lead_notes enable row level security;

drop policy if exists lead_notes_company_select on public.lead_notes;
create policy lead_notes_company_select
on public.lead_notes
for select
using (company_id = public.get_current_company_id());

drop policy if exists lead_notes_company_insert on public.lead_notes;
create policy lead_notes_company_insert
on public.lead_notes
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists lead_notes_company_update on public.lead_notes;
create policy lead_notes_company_update
on public.lead_notes
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());
