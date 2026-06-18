-- Ensure deleting a project removes its tasks as well.
-- This matches the product behavior expected in the Tasks section.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'fk_tasks_project') then
    alter table public.tasks drop constraint fk_tasks_project;
  end if;

  if exists (select 1 from pg_constraint where conname = 'tasks_related_project_id_fkey') then
    alter table public.tasks drop constraint tasks_related_project_id_fkey;
  end if;

  alter table public.tasks
    add constraint fk_tasks_project
    foreign key (related_project_id) references public.projects(id) on delete cascade;
end $$;
