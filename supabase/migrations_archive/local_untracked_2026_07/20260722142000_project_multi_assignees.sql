create table if not exists public.project_assignees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid null,
  unique (project_id, user_id)
);

create index if not exists idx_project_assignees_company_user
  on public.project_assignees (company_id, user_id);

create index if not exists idx_project_assignees_project
  on public.project_assignees (project_id);

alter table public.project_assignees enable row level security;

insert into public.project_assignees (company_id, project_id, user_id, created_at)
select p.company_id, p.id, pr.user_id, coalesce(p.created_at, now())
from public.projects p
join public.profiles pr
  on pr.id = p.manager
 and pr.company_id = p.company_id
where p.manager is not null
  and pr.user_id is not null
on conflict (project_id, user_id) do nothing;

drop policy if exists "view projects" on public.projects;
drop policy if exists "create projects" on public.projects;
drop policy if exists "update projects" on public.projects;
drop policy if exists "projects_select" on public.projects;
create policy "projects_select"
on public.projects
for select
to authenticated
using (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager','viewer']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and (
        manager = public.get_current_profile_id()
        or exists (
          select 1
          from public.project_assignees pa
          where pa.project_id = projects.id
            and pa.company_id = projects.company_id
            and pa.user_id = auth.uid()
        )
      )
    )
  )
);

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert"
on public.projects
for insert
to authenticated
with check (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and manager = public.get_current_profile_id()
    )
  )
);

drop policy if exists "projects_update" on public.projects;
create policy "projects_update"
on public.projects
for update
to authenticated
using (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and (
        manager = public.get_current_profile_id()
        or exists (
          select 1
          from public.project_assignees pa
          where pa.project_id = projects.id
            and pa.company_id = projects.company_id
            and pa.user_id = auth.uid()
        )
      )
    )
  )
)
with check (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and (
        manager = public.get_current_profile_id()
        or exists (
          select 1
          from public.project_assignees pa
          where pa.project_id = projects.id
            and pa.company_id = projects.company_id
            and pa.user_id = auth.uid()
        )
      )
    )
  )
);

drop policy if exists "view project assignees" on public.project_assignees;
create policy "view project assignees"
on public.project_assignees
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager','viewer']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and user_id = auth.uid()
    )
  )
);

drop policy if exists "create project assignees" on public.project_assignees;
create policy "create project assignees"
on public.project_assignees
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and user_id = auth.uid()
    )
  )
);

drop policy if exists "update project assignees" on public.project_assignees;
create policy "update project assignees"
on public.project_assignees
for update
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and user_id = auth.uid()
    )
  )
)
with check (
  company_id = public.get_user_company_id(auth.uid())
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and user_id = auth.uid()
    )
  )
);

drop policy if exists "delete project assignees" on public.project_assignees;
create policy "delete project assignees"
on public.project_assignees
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and user_id = auth.uid()
    )
  )
);
