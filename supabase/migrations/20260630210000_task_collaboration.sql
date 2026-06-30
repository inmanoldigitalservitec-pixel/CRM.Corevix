-- Task collaboration primitives: checklist/subtasks and internal comments.
-- These tables are intentionally small and tied to tasks.company_id through RLS checks.

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  order_index integer not null default 0,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  body text not null,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_checklist_items_task_id on public.task_checklist_items(task_id);
create index if not exists idx_task_comments_task_id_created_at on public.task_comments(task_id, created_at desc);

alter table public.task_checklist_items enable row level security;
alter table public.task_comments enable row level security;

drop policy if exists "task_checklist_items_select_company" on public.task_checklist_items;
drop policy if exists "task_checklist_items_insert_company" on public.task_checklist_items;
drop policy if exists "task_checklist_items_update_company" on public.task_checklist_items;
drop policy if exists "task_checklist_items_delete_company" on public.task_checklist_items;

drop policy if exists "task_comments_select_company" on public.task_comments;
drop policy if exists "task_comments_insert_company" on public.task_comments;
drop policy if exists "task_comments_delete_company" on public.task_comments;

create policy "task_checklist_items_select_company"
  on public.task_checklist_items
  for select
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_checklist_items.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_checklist_items_insert_company"
  on public.task_checklist_items
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_checklist_items.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_checklist_items_update_company"
  on public.task_checklist_items
  for update
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_checklist_items.task_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_checklist_items.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_checklist_items_delete_company"
  on public.task_checklist_items
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_checklist_items.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_comments_select_company"
  on public.task_comments
  for select
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_comments.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_comments_insert_company"
  on public.task_comments
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_comments.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_comments_delete_company"
  on public.task_comments
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_comments.task_id
        and p.user_id = auth.uid()
    )
  );
