create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'internal' check (kind in ('internal')),
  content text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_notes_company_client_updated_idx
  on public.client_notes(company_id, client_id, updated_at desc);

create index if not exists client_notes_client_active_idx
  on public.client_notes(client_id, archived_at, updated_at desc);

create or replace function public.set_client_note_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_note_updated_at on public.client_notes;
create trigger set_client_note_updated_at
before update on public.client_notes
for each row execute function public.set_client_note_updated_at();

alter table public.client_notes enable row level security;

drop policy if exists client_notes_company_select on public.client_notes;
create policy client_notes_company_select
on public.client_notes
for select
using (company_id = public.get_current_company_id());

drop policy if exists client_notes_company_insert on public.client_notes;
create policy client_notes_company_insert
on public.client_notes
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists client_notes_company_update on public.client_notes;
create policy client_notes_company_update
on public.client_notes
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());
