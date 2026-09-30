-- Keep task activity history attached to its task and remove it when that task is deleted.
-- CREATE TABLE IF NOT EXISTS in the original migration did not repair an already-existing
-- constraint, so explicitly enforce the intended ON DELETE behavior here.
alter table public.task_activity_events
  drop constraint if exists task_activity_events_task_id_fkey;

alter table public.task_activity_events
  add constraint task_activity_events_task_id_fkey
  foreign key (task_id)
  references public.tasks(id)
  on delete cascade;

-- Deleting a task cascades to its checklist rows. Do not try to add a new activity event
-- for those cascade-generated deletes because their parent task is already being removed.
create or replace function public.log_task_checklist_activity()
returns trigger
language plpgsql
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
    if not exists (select 1 from public.tasks where id = old.task_id) then
      return old;
    end if;

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
