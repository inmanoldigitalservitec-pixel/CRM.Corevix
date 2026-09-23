-- Keep project status aligned with the state of its related tasks.

create or replace function public.recalculate_project_status_from_tasks(
  p_project_id uuid,
  p_company_id uuid,
  p_task_reopened boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_project_status text;
  v_task_count bigint;
  v_all_tasks_completed boolean;
  v_has_started_task boolean;
  v_target_status text;
begin
  if p_project_id is null or p_company_id is null then
    return;
  end if;

  select project.status
  into v_project_status
  from public.projects as project
  where project.id = p_project_id
    and project.company_id = p_company_id
  for update;

  if not found then
    return;
  end if;

  -- Only these three states are task-driven. In particular, never overwrite
  -- manually controlled states such as On Hold, Cancelled, or legacy states.
  if v_project_status not in (
    'Not Started',
    'In Progress',
    'Completed'
  ) then
    return;
  end if;

  select
    count(*),
    coalesce(bool_and(task.status::text = 'Completed'), false),
    coalesce(bool_or(task.status::text in ('In Progress', 'Waiting', 'Completed')), false)
  into v_task_count, v_all_tasks_completed, v_has_started_task
  from public.tasks as task
  where task.related_project_id = p_project_id
    and task.company_id = p_company_id;

  v_target_status := v_project_status;

  if v_task_count = 0 then
    if v_project_status = 'Completed' then
      v_target_status := 'Not Started';
    end if;
  elsif v_all_tasks_completed then
    v_target_status := 'Completed';
  elsif v_has_started_task or p_task_reopened or v_project_status = 'Completed' then
    v_target_status := 'In Progress';
  end if;

  if v_target_status is distinct from v_project_status then
    update public.projects as project
    set status = v_target_status
    where project.id = p_project_id
      and project.company_id = p_company_id;
  end if;
end;
$$;

revoke all on function public.recalculate_project_status_from_tasks(uuid, uuid, boolean)
  from public, anon, authenticated;

create or replace function public.sync_project_status_from_task()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recalculate_project_status_from_tasks(new.related_project_id, new.company_id, false);
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.recalculate_project_status_from_tasks(old.related_project_id, old.company_id, false);
    return old;
  end if;

  if old.related_project_id is distinct from new.related_project_id
    or old.company_id is distinct from new.company_id then
    perform public.recalculate_project_status_from_tasks(old.related_project_id, old.company_id, false);
  end if;

  perform public.recalculate_project_status_from_tasks(
    new.related_project_id,
    new.company_id,
    old.status::text = 'Completed' and new.status::text <> 'Completed'
  );

  return new;
end;
$$;

revoke all on function public.sync_project_status_from_task() from public, anon, authenticated;

drop trigger if exists trg_sync_project_status_from_task on public.tasks;
create trigger trg_sync_project_status_from_task
after insert or delete or update of status, related_project_id, company_id
on public.tasks
for each row
execute function public.sync_project_status_from_task();

-- Reconcile existing active projects when the rule is first enabled.
with project_task_summary as (
  select
    task.company_id,
    task.related_project_id as project_id,
    count(*) as task_count,
    bool_and(task.status::text = 'Completed') as all_tasks_completed,
    bool_or(task.status::text in ('In Progress', 'Waiting', 'Completed')) as has_started_task
  from public.tasks as task
  where task.related_project_id is not null
  group by task.company_id, task.related_project_id
)
update public.projects as project
set status = case
  when summary.all_tasks_completed then 'Completed'
  when project.status = 'Completed' then 'In Progress'
  when project.status = 'Not Started' and summary.has_started_task
    then 'In Progress'
  else project.status
end
from project_task_summary as summary
where project.id = summary.project_id
  and project.company_id = summary.company_id
  and project.status in (
    'Not Started',
    'In Progress',
    'Completed'
  )
  and (
    (summary.all_tasks_completed and project.status <> 'Completed')
    or (project.status = 'Completed' and not summary.all_tasks_completed)
    or (
      project.status = 'Not Started'
      and summary.has_started_task
    )
  );
