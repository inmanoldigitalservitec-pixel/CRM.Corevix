create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  location text,
  type text not null default 'event',
  status text not null default 'scheduled',
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  related_task_id uuid references public.tasks(id) on delete set null,
  related_lead_id uuid references public.leads(id) on delete set null,
  related_client_id uuid references public.clients(id) on delete set null,
  related_deal_id uuid references public.deals(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calendar_events_company_start
  on public.calendar_events(company_id, start_at);

create index if not exists idx_calendar_events_user_start
  on public.calendar_events(user_id, start_at);

alter table public.calendar_events enable row level security;

drop policy if exists "view calendar_events" on public.calendar_events;
drop policy if exists "create calendar_events" on public.calendar_events;
drop policy if exists "update calendar_events" on public.calendar_events;
drop policy if exists "delete calendar_events" on public.calendar_events;

create policy "view calendar_events"
on public.calendar_events
for select
to authenticated
using (company_id = public.get_user_company_id(auth.uid()));

create policy "create calendar_events"
on public.calendar_events
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update calendar_events"
on public.calendar_events
for update
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
)
with check (
  company_id = public.get_user_company_id(auth.uid())
);

create policy "delete calendar_events"
on public.calendar_events
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    user_id = auth.uid()
    or public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
  )
);

drop trigger if exists update_calendar_events_updated_at on public.calendar_events;

create trigger update_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.update_updated_at_column();
