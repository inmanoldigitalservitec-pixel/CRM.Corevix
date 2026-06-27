-- Normalize CRM assignment IDs to user IDs.
-- Remote FK errors confirm leads/deals/tasks.assigned_to are constrained to users.
-- This migration converts accidental profiles.id values back to profiles.user_id.

update public.leads l
set assigned_to = p.user_id
from public.profiles p
where l.assigned_to is not null
  and p.user_id is not null
  and l.company_id = p.company_id
  and l.assigned_to = p.id;

update public.tasks t
set assigned_to = p.user_id
from public.profiles p
where t.assigned_to is not null
  and p.user_id is not null
  and t.company_id = p.company_id
  and t.assigned_to = p.id;

update public.deals d
set assigned_to = p.user_id
from public.profiles p
where d.assigned_to is not null
  and p.user_id is not null
  and d.company_id = p.company_id
  and d.assigned_to = p.id;

update public.leads l
set assigned_to = null
where l.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = l.company_id
      and p.user_id = l.assigned_to
  );

update public.tasks t
set assigned_to = null
where t.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = t.company_id
      and p.user_id = t.assigned_to
  );

update public.deals d
set assigned_to = null
where d.assigned_to is not null
  and not exists (
    select 1
    from public.profiles p
    where p.company_id = d.company_id
      and p.user_id = d.assigned_to
  );
