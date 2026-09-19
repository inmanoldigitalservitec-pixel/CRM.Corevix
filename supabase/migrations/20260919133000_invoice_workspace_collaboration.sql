create table if not exists public.invoice_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'internal' check (kind = 'internal'),
  content text not null check (btrim(content) <> ''),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_notes_invoice_company_fkey
    foreign key (invoice_id, company_id)
    references public.invoices(id, company_id)
    on delete cascade
);

create index if not exists idx_invoice_notes_company_invoice_updated
  on public.invoice_notes(company_id, invoice_id, updated_at desc)
  where archived_at is null;

alter table public.invoice_notes enable row level security;

drop policy if exists invoice_notes_company_select on public.invoice_notes;
create policy invoice_notes_company_select
  on public.invoice_notes
  for select
  to authenticated
  using (company_id = public.get_current_company_id());

drop policy if exists invoice_notes_company_insert on public.invoice_notes;
create policy invoice_notes_company_insert
  on public.invoice_notes
  for insert
  to authenticated
  with check (
    company_id = public.get_current_company_id()
    and exists (
      select 1
      from public.invoices
      where invoices.id = invoice_notes.invoice_id
        and invoices.company_id = invoice_notes.company_id
    )
  );

drop policy if exists invoice_notes_company_update on public.invoice_notes;
create policy invoice_notes_company_update
  on public.invoice_notes
  for update
  to authenticated
  using (company_id = public.get_current_company_id())
  with check (company_id = public.get_current_company_id());

grant select, insert, update on public.invoice_notes to authenticated;

drop trigger if exists set_invoice_note_updated_at on public.invoice_notes;
create trigger set_invoice_note_updated_at
before update on public.invoice_notes
for each row execute function public.update_updated_at_column();

alter table public.tasks
  add column if not exists related_invoice_id uuid
  references public.invoices(id) on delete set null;

create index if not exists idx_tasks_company_invoice_updated
  on public.tasks(company_id, related_invoice_id, updated_at desc)
  where related_invoice_id is not null;

alter table public.calendar_events
  add column if not exists related_invoice_id uuid
  references public.invoices(id) on delete set null;

create index if not exists idx_calendar_events_company_invoice_start
  on public.calendar_events(company_id, related_invoice_id, start_at)
  where related_invoice_id is not null;
