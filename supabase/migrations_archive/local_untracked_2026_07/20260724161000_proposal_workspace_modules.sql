create table if not exists public.proposal_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'internal' check (kind in ('internal')),
  content text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_notes_company_proposal_updated_idx
  on public.proposal_notes(company_id, proposal_id, updated_at desc);

create index if not exists proposal_notes_proposal_active_idx
  on public.proposal_notes(proposal_id, archived_at, updated_at desc);

create table if not exists public.proposal_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_name text,
  author_email text,
  visibility text not null default 'internal' check (visibility in ('internal', 'client')),
  content text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_comments_company_proposal_created_idx
  on public.proposal_comments(company_id, proposal_id, created_at desc);

create index if not exists proposal_comments_proposal_active_idx
  on public.proposal_comments(proposal_id, archived_at, created_at desc);

create table if not exists public.proposal_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  notes text,
  remind_at timestamptz not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Cancelled')),
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_reminders_company_proposal_remind_idx
  on public.proposal_reminders(company_id, proposal_id, remind_at asc);

create index if not exists proposal_reminders_assignee_status_idx
  on public.proposal_reminders(company_id, assigned_to, status, remind_at asc);

create table if not exists public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  content_html text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_templates_company_active_idx
  on public.proposal_templates(company_id, is_active, updated_at desc);

create or replace function public.set_proposal_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_proposal_note_updated_at on public.proposal_notes;
create trigger set_proposal_note_updated_at
before update on public.proposal_notes
for each row execute function public.set_proposal_workspace_updated_at();

drop trigger if exists set_proposal_comment_updated_at on public.proposal_comments;
create trigger set_proposal_comment_updated_at
before update on public.proposal_comments
for each row execute function public.set_proposal_workspace_updated_at();

drop trigger if exists set_proposal_reminder_updated_at on public.proposal_reminders;
create trigger set_proposal_reminder_updated_at
before update on public.proposal_reminders
for each row execute function public.set_proposal_workspace_updated_at();

drop trigger if exists set_proposal_template_updated_at on public.proposal_templates;
create trigger set_proposal_template_updated_at
before update on public.proposal_templates
for each row execute function public.set_proposal_workspace_updated_at();

alter table public.proposal_notes enable row level security;
alter table public.proposal_comments enable row level security;
alter table public.proposal_reminders enable row level security;
alter table public.proposal_templates enable row level security;

drop policy if exists proposal_notes_company_select on public.proposal_notes;
create policy proposal_notes_company_select
on public.proposal_notes
for select
using (company_id = public.get_current_company_id());

drop policy if exists proposal_notes_company_insert on public.proposal_notes;
create policy proposal_notes_company_insert
on public.proposal_notes
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_notes_company_update on public.proposal_notes;
create policy proposal_notes_company_update
on public.proposal_notes
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_comments_company_select on public.proposal_comments;
create policy proposal_comments_company_select
on public.proposal_comments
for select
using (company_id = public.get_current_company_id());

drop policy if exists proposal_comments_company_insert on public.proposal_comments;
create policy proposal_comments_company_insert
on public.proposal_comments
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_comments_company_update on public.proposal_comments;
create policy proposal_comments_company_update
on public.proposal_comments
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_reminders_company_select on public.proposal_reminders;
create policy proposal_reminders_company_select
on public.proposal_reminders
for select
using (company_id = public.get_current_company_id());

drop policy if exists proposal_reminders_company_insert on public.proposal_reminders;
create policy proposal_reminders_company_insert
on public.proposal_reminders
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_reminders_company_update on public.proposal_reminders;
create policy proposal_reminders_company_update
on public.proposal_reminders
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_select on public.proposal_templates;
create policy proposal_templates_company_select
on public.proposal_templates
for select
using (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_insert on public.proposal_templates;
create policy proposal_templates_company_insert
on public.proposal_templates
for insert
with check (company_id = public.get_current_company_id());

drop policy if exists proposal_templates_company_update on public.proposal_templates;
create policy proposal_templates_company_update
on public.proposal_templates
for update
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());
