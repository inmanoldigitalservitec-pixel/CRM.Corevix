-- Task activity timeline.
-- This creates a normalized activity feed for task detail panels and reports.

create table if not exists public.task_activity_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_activity_events_task_created
  on public.task_activity_events(task_id, created_at desc);

alter table public.task_activity_events enable row level security;

drop policy if exists "task_activity_events_select_company" on public.task_activity_events;
drop policy if exists "task_activity_events_insert_company" on public.task_activity_events;

drop policy if exists "task_activity_events_delete_company" on public.task_activity_events;

create policy "task_activity_events_select_company"
  on public.task_activity_events
  for select
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_activity_events.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_activity_events_insert_company"
  on public.task_activity_events
  for insert
  with check (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_activity_events.task_id
        and p.user_id = auth.uid()
    )
  );

create policy "task_activity_events_delete_company"
  on public.task_activity_events
  for delete
  using (
    exists (
      select 1
      from public.tasks t
      join public.profiles p on p.company_id = t.company_id
      where t.id = task_activity_events.task_id
        and p.user_id = auth.uid()
    )
  );

create or replace function public.log_task_update_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(old.status, '') is distinct from coalesce(new.status, '') then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      new.id,
      'task.status_changed',
      'Estado actualizado',
      'Estado: ' || coalesce(old.status, '—') || ' → ' || coalesce(new.status, '—'),
      jsonb_build_object('field', 'status', 'from', old.status, 'to', new.status),
      auth.uid()
    );
  end if;

  if coalesce(old.priority, '') is distinct from coalesce(new.priority, '') then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      new.id,
      'task.priority_changed',
      'Prioridad actualizada',
      'Prioridad: ' || coalesce(old.priority, '—') || ' → ' || coalesce(new.priority, '—'),
      jsonb_build_object('field', 'priority', 'from', old.priority, 'to', new.priority),
      auth.uid()
    );
  end if;

  if coalesce(old.due_date::text, '') is distinct from coalesce(new.due_date::text, '') then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      new.id,
      'task.due_date_changed',
      'Vencimiento actualizado',
      'Vence: ' || coalesce(old.due_date::text, '—') || ' → ' || coalesce(new.due_date::text, '—'),
      jsonb_build_object('field', 'due_date', 'from', old.due_date, 'to', new.due_date),
      auth.uid()
    );
  end if;

  if coalesce(old.assigned_to::text, '') is distinct from coalesce(new.assigned_to::text, '') then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      new.id,
      'task.assignee_changed',
      'Responsable actualizado',
      'Se cambió el responsable de la tarea.',
      jsonb_build_object('field', 'assigned_to', 'from', old.assigned_to, 'to', new.assigned_to),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_task_update_activity on public.tasks;
create trigger trg_log_task_update_activity
after update on public.tasks
for each row
execute function public.log_task_update_activity();

create or replace function public.log_task_checklist_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      new.task_id,
      'task.checklist_added',
      'Subtarea agregada',
      new.title,
      jsonb_build_object('checklist_item_id', new.id),
      auth.uid()
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.is_completed is distinct from new.is_completed then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      new.task_id,
      case when new.is_completed then 'task.checklist_completed' else 'task.checklist_reopened' end,
      case when new.is_completed then 'Subtarea completada' else 'Subtarea reabierta' end,
      new.title,
      jsonb_build_object('checklist_item_id', new.id, 'is_completed', new.is_completed),
      auth.uid()
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
    values (
      old.task_id,
      'task.checklist_deleted',
      'Subtarea eliminada',
      old.title,
      jsonb_build_object('checklist_item_id', old.id),
      auth.uid()
    );
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_log_task_checklist_insert on public.task_checklist_items;
drop trigger if exists trg_log_task_checklist_update on public.task_checklist_items;
drop trigger if exists trg_log_task_checklist_delete on public.task_checklist_items;

create trigger trg_log_task_checklist_insert
after insert on public.task_checklist_items
for each row
execute function public.log_task_checklist_activity();

create trigger trg_log_task_checklist_update
after update on public.task_checklist_items
for each row
execute function public.log_task_checklist_activity();

create trigger trg_log_task_checklist_delete
after delete on public.task_checklist_items
for each row
execute function public.log_task_checklist_activity();

create or replace function public.log_task_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_activity_events(task_id, event_type, title, description, metadata, created_by)
  values (
    new.task_id,
    'task.comment_added',
    'Comentario agregado',
    left(new.body, 160),
    jsonb_build_object('comment_id', new.id),
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists trg_log_task_comment_insert on public.task_comments;
create trigger trg_log_task_comment_insert
after insert on public.task_comments
for each row
execute function public.log_task_comment_activity();
