-- Normalize CRM assignment IDs for tasks and deals.
--
-- Important architecture note:
-- leads.assigned_to is constrained to auth/users, not profiles. Do not rewrite leads.assigned_to.
-- The Leads screen resolves lead assignees in runtime before creating tasks/deals.
-- This migration only cleans legacy task/deal rows that may contain auth.users.id or invalid IDs.

-- Convert task assignees from auth.users.id to profiles.id when possible.
update public.tasks t
set assigned_to = p.id
from public.profiles p
where t.assigned_to is not null
  and t.company_id = p.company_id
  and t.assigned_to = p.user_id;

-- Convert deal assignees from auth.users.id to profiles.id when possible.
update public.deals d
set assigned_to = p.id
from public.profiles p
where d.assigned_to is not null
  and d.company_id = p.company_id
  and d.assigned_to = p.user_id;

-- Clear task assignees that still do not point to a profile in the same company.
update public.tasks t
set assigned_to = null
where t.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = t.company_id
      and p.id = t.assigned_to
  );

-- Clear deal assignees that still do not point to a profile in the same company.
update public.deals d
set assigned_to = null
where d.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = d.company_id
      and p.id = d.assigned_to
  );
