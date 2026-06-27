-- Normalize CRM assignment IDs from auth.users.id to profiles.id.
--
-- CRM assignment columns such as leads.assigned_to, deals.assigned_to and tasks.assigned_to
-- are intended to store profiles.id. Some legacy rows can contain auth.users.id instead.
-- When a lead with that legacy value is used to create a task/deal, the insert can fail
-- with tasks_assigned_to_fkey or deals_assigned_to_fkey.

update public.leads l
set assigned_to = p.id
from public.profiles p
where l.assigned_to is not null
  and l.company_id = p.company_id
  and l.assigned_to = p.user_id;

update public.deals d
set assigned_to = p.id
from public.profiles p
where d.assigned_to is not null
  and d.company_id = p.company_id
  and d.assigned_to = p.user_id;

update public.tasks t
set assigned_to = p.id
from public.profiles p
where t.assigned_to is not null
  and t.company_id = p.company_id
  and t.assigned_to = p.user_id;

-- Clear assignment values that still do not point to an active profile in the same company.
-- This avoids copying invalid legacy IDs into new task/deal records from the CRM UI.
update public.leads l
set assigned_to = null
where l.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = l.company_id
      and p.id = l.assigned_to
  );

update public.deals d
set assigned_to = null
where d.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = d.company_id
      and p.id = d.assigned_to
  );

update public.tasks t
set assigned_to = null
where t.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = t.company_id
      and p.id = t.assigned_to
  );
