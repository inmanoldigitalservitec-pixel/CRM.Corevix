insert into public.permissions (
  company_id,
  role,
  module,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_assign
)
select
  c.id,
  'collaborator'::public.app_role,
  m.module,
  m.module in ('leads','clients','deals','tasks','proposals','invoices','whatsapp','email'),
  m.module in ('leads','clients','deals','tasks','proposals','invoices'),
  m.module in ('leads','clients','deals','tasks','proposals','invoices'),
  false,
  false
from public.companies c
cross join (
  values
    ('leads'),
    ('clients'),
    ('deals'),
    ('tasks'),
    ('projects'),
    ('proposals'),
    ('invoices'),
    ('whatsapp'),
    ('email'),
    ('automations'),
    ('settings'),
    ('team'),
    ('reports')
) as m(module)
on conflict (company_id, role, module) do nothing;

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
on public.tasks
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
        assigned_to = auth.uid()
        or exists (
          select 1
          from public.task_assignees ta
          where ta.task_id = tasks.id
            and ta.company_id = tasks.company_id
            and ta.user_id = auth.uid()
        )
      )
    )
  )
);

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
on public.tasks
for insert
to authenticated
with check (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and (
    public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (
      public.has_any_role(auth.uid(), array['sales_agent','collaborator']::public.app_role[])
      and assigned_to = auth.uid()
    )
  )
);

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
on public.tasks
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
        assigned_to = auth.uid()
        or exists (
          select 1
          from public.task_assignees ta
          where ta.task_id = tasks.id
            and ta.company_id = tasks.company_id
            and ta.user_id = auth.uid()
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
        assigned_to = auth.uid()
        or exists (
          select 1
          from public.task_assignees ta
          where ta.task_id = tasks.id
            and ta.company_id = tasks.company_id
            and ta.user_id = auth.uid()
        )
      )
    )
  )
);

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete"
on public.tasks
for delete
to authenticated
using (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
);

drop policy if exists "view task assignees" on public.task_assignees;
create policy "view task assignees"
on public.task_assignees
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

drop policy if exists "create task assignees" on public.task_assignees;
create policy "create task assignees"
on public.task_assignees
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

drop policy if exists "update task assignees" on public.task_assignees;
create policy "update task assignees"
on public.task_assignees
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

drop policy if exists "delete task assignees" on public.task_assignees;
create policy "delete task assignees"
on public.task_assignees
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
