create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid null,
  unique (task_id, user_id)
);

create index if not exists idx_task_assignees_company_user
  on public.task_assignees (company_id, user_id);

create index if not exists idx_task_assignees_task
  on public.task_assignees (task_id);

alter table public.task_assignees enable row level security;

drop policy if exists "view task assignees" on public.task_assignees;
create policy "view task assignees"
  on public.task_assignees
  for select
  to authenticated
  using (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "create task assignees" on public.task_assignees;
create policy "create task assignees"
  on public.task_assignees
  for insert
  to authenticated
  with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "update task assignees" on public.task_assignees;
create policy "update task assignees"
  on public.task_assignees
  for update
  to authenticated
  using (company_id = public.get_user_company_id(auth.uid()))
  with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists "delete task assignees" on public.task_assignees;
create policy "delete task assignees"
  on public.task_assignees
  for delete
  to authenticated
  using (company_id = public.get_user_company_id(auth.uid()));

insert into public.task_assignees (company_id, task_id, user_id, created_at)
select t.company_id, t.id, t.assigned_to, coalesce(t.created_at, now())
from public.tasks t
where t.assigned_to is not null
on conflict (task_id, user_id) do nothing;
