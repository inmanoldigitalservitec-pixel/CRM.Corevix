-- Commercial follow-ups are independent from operational tasks. All writes go
-- through commercial_follow_up_action so related records commit atomically.
-- This migration is intentionally local; production deployment is a separate gate.

-- Legacy permissive company-only policies OR with assignment-aware policies.
-- Keep the existing role-aware policies as the authorization source.
drop policy if exists leads_select_company on public.leads;
drop policy if exists leads_insert_company on public.leads;
drop policy if exists leads_update_company on public.leads;
drop policy if exists leads_delete_company on public.leads;
drop policy if exists deals_select_company on public.deals;
drop policy if exists deals_insert_company on public.deals;
drop policy if exists deals_update_company on public.deals;
drop policy if exists deals_delete_company on public.deals;
drop policy if exists clients_select_company on public.clients;
drop policy if exists clients_insert_company on public.clients;
drop policy if exists clients_update_company on public.clients;
drop policy if exists clients_delete_company on public.clients;

-- Deals.assigned_to references auth.users, whereas the old role policy
-- compared it with profiles.id. Correct that predicate without changing roles.
drop policy if exists deals_select on public.deals;
drop policy if exists deals_insert on public.deals;
drop policy if exists deals_update on public.deals;
drop policy if exists deals_delete on public.deals;
create policy deals_select on public.deals for select to authenticated using (
  public.is_company_member() and company_id = public.get_current_company_id()
  and (public.has_any_role(auth.uid(), array['super_admin','admin','manager','viewer']::public.app_role[])
    or (public.has_role(auth.uid(), 'sales_agent'::public.app_role) and assigned_to = auth.uid()))
);
create policy deals_insert on public.deals for insert to authenticated with check (
  public.is_company_member() and company_id = public.get_current_company_id()
  and (public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (public.has_role(auth.uid(), 'sales_agent'::public.app_role) and assigned_to = auth.uid()))
);
create policy deals_update on public.deals for update to authenticated using (
  public.is_company_member() and company_id = public.get_current_company_id()
  and (public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (public.has_role(auth.uid(), 'sales_agent'::public.app_role) and assigned_to = auth.uid()))
) with check (
  public.is_company_member() and company_id = public.get_current_company_id()
  and (public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
    or (public.has_role(auth.uid(), 'sales_agent'::public.app_role) and assigned_to = auth.uid()))
);
create policy deals_delete on public.deals for delete to authenticated using (
  public.is_company_member() and company_id = public.get_current_company_id()
  and public.has_any_role(auth.uid(), array['super_admin','admin','manager']::public.app_role[])
);

create table public.commercial_follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete restrict,
  deal_id uuid references public.deals(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  assignee_id uuid not null references auth.users(id) on delete restrict,
  channel text not null check (channel in ('call','whatsapp','email','meeting','other')),
  objective text not null check (length(btrim(objective)) between 1 and 500),
  notes text,
  scheduled_at timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  reminder_minutes_before integer check (reminder_minutes_before between 0 and 10080),
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  previous_follow_up_id uuid references public.commercial_follow_ups(id) on delete restrict,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commercial_follow_ups_exactly_one_entity check
    (num_nonnulls(lead_id,deal_id,client_id) = 1),
  constraint commercial_follow_ups_terminal_timestamps check
    ((status = 'completed') = (completed_at is not null)
      and (status = 'cancelled') = (cancelled_at is not null)),
  constraint commercial_follow_ups_id_company_unique unique (id,company_id)
);
create index commercial_follow_ups_assignee_due_idx on public.commercial_follow_ups(company_id,assignee_id,scheduled_at)
  where status in ('scheduled','in_progress');
create index commercial_follow_ups_lead_idx on public.commercial_follow_ups(company_id,lead_id,scheduled_at) where lead_id is not null;
create index commercial_follow_ups_deal_idx on public.commercial_follow_ups(company_id,deal_id,scheduled_at) where deal_id is not null;
create index commercial_follow_ups_client_idx on public.commercial_follow_ups(company_id,client_id,scheduled_at) where client_id is not null;
create unique index commercial_follow_ups_previous_once_idx on public.commercial_follow_ups(previous_follow_up_id)
  where previous_follow_up_id is not null;

create table public.commercial_interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  follow_up_id uuid,
  lead_id uuid references public.leads(id) on delete restrict,
  deal_id uuid references public.deals(id) on delete restrict,
  client_id uuid references public.clients(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  assignee_id uuid not null references auth.users(id) on delete restrict,
  channel text not null check (channel in ('call','whatsapp','email','meeting','other')),
  occurred_at timestamptz not null,
  outcome text not null check (outcome in ('contacted','no_answer','busy','callback_requested','rescheduled','wrong_contact','other')),
  notes text,
  next_step text,
  created_at timestamptz not null default now(),
  constraint commercial_interactions_exactly_one_entity check
    (num_nonnulls(lead_id,deal_id,client_id) = 1),
  constraint commercial_interactions_follow_up_company_fk foreign key (follow_up_id,company_id)
    references public.commercial_follow_ups(id,company_id) on delete restrict
);
create index commercial_interactions_entity_lead_idx on public.commercial_interactions(company_id,lead_id,occurred_at desc) where lead_id is not null;
create index commercial_interactions_entity_deal_idx on public.commercial_interactions(company_id,deal_id,occurred_at desc) where deal_id is not null;
create index commercial_interactions_entity_client_idx on public.commercial_interactions(company_id,client_id,occurred_at desc) where client_id is not null;
create index commercial_interactions_follow_up_idx on public.commercial_interactions(follow_up_id,occurred_at desc);

create table public.commercial_follow_up_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  follow_up_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('created','updated','rescheduled','assigned','cancelled','completed','interaction_recorded','next_created')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (follow_up_id,company_id) references public.commercial_follow_ups(id,company_id) on delete restrict
);
create index commercial_follow_up_events_timeline_idx on public.commercial_follow_up_events(follow_up_id,created_at desc);

-- The outbox is server-only. A delivery is identified by follow-up + generation.
-- Rescheduling increments generation and cancels any unsent prior reminder.
create table public.commercial_reminder_outbox (
  follow_up_id uuid primary key references public.commercial_follow_ups(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  assignee_id uuid not null references auth.users(id) on delete cascade,
  generation bigint not null default 1,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled','failed')),
  notification_id uuid references public.notifications(id) on delete set null,
  attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now(),
  foreign key (follow_up_id,company_id) references public.commercial_follow_ups(id,company_id) on delete cascade
);
create index commercial_reminder_outbox_due_idx on public.commercial_reminder_outbox(due_at) where status = 'pending';

create table public.commercial_action_idempotency (
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  action text not null,
  payload_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (company_id,actor_id,request_key)
);

alter table public.commercial_follow_ups enable row level security;
alter table public.commercial_interactions enable row level security;
alter table public.commercial_follow_up_events enable row level security;
alter table public.commercial_reminder_outbox enable row level security;
alter table public.commercial_action_idempotency enable row level security;

revoke all on public.commercial_follow_ups,public.commercial_interactions,public.commercial_follow_up_events,
  public.commercial_reminder_outbox,public.commercial_action_idempotency from public,anon,authenticated;
grant select on public.commercial_follow_ups,public.commercial_interactions,public.commercial_follow_up_events to authenticated;

-- The helper uses the current authenticated identity only. Its predicates mirror
-- permissions and the entity assignment rules; it never trusts payload company_id.
create function public.commercial_can(
  p_action text, p_company_id uuid, p_lead_id uuid, p_deal_id uuid, p_client_id uuid, p_assignee_id uuid
) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_module text;
  v_privileged boolean;
  v_viewer boolean;
  v_allowed boolean;
  v_target_privileged boolean;
  v_target_profile_id uuid;
begin
  if v_user is null or p_company_id is null then return false; end if;
  select p.id into v_profile_id from public.profiles p
    where p.user_id = v_user and p.company_id = p_company_id and p.is_active;
  if v_profile_id is null or num_nonnulls(p_lead_id,p_deal_id,p_client_id) <> 1 then return false; end if;
  v_module := case when p_lead_id is not null then 'leads'
                   when p_deal_id is not null then 'deals' else 'clients' end;
  v_privileged := public.has_any_role(v_user,array['super_admin','admin','manager']::public.app_role[]);
  v_viewer := public.has_role(v_user,'viewer'::public.app_role);
  if not (v_privileged or v_viewer or public.has_role(v_user,'sales_agent'::public.app_role)) then return false; end if;
  select exists (
    select 1 from public.user_roles ur left join public.permissions perm
      on perm.company_id = p_company_id and perm.role = ur.role and perm.module = v_module
    where ur.user_id = v_user and (ur.role = 'super_admin'::public.app_role or
      case p_action
        when 'view' then coalesce(perm.can_view,false)
        when 'create' then coalesce(perm.can_create,false)
        when 'edit' then coalesce(perm.can_edit,false)
        when 'assign' then coalesce(perm.can_assign,false)
        else false end)
  ) into v_allowed;
  if not v_allowed then return false; end if;
  if p_assignee_id is not null and p_action in ('create','assign') then
    select p.id into v_target_profile_id from public.profiles p
      where p.user_id = p_assignee_id and p.company_id = p_company_id and p.is_active;
    if v_target_profile_id is null then return false; end if;
  end if;
  if p_action in ('create','assign') then
    v_target_privileged := public.has_any_role(p_assignee_id,array['super_admin','admin','manager']::public.app_role[]);
    if not v_target_privileged then
      if not public.has_role(p_assignee_id,'sales_agent'::public.app_role) then return false; end if;
      -- An assignee must be able to see the underlying commercial entity.
      if p_lead_id is not null and not exists (
        select 1 from public.leads e where e.id=p_lead_id and e.company_id=p_company_id and e.assigned_to=p_assignee_id
      ) then return false; end if;
      if p_deal_id is not null and not exists (
        select 1 from public.deals e where e.id=p_deal_id and e.company_id=p_company_id and e.assigned_to=p_assignee_id
      ) then return false; end if;
      if p_client_id is not null and not exists (
        select 1 from public.clients e where e.id=p_client_id and e.company_id=p_company_id and e.account_manager=v_target_profile_id
      ) then return false; end if;
    end if;
  end if;
  if p_action <> 'view' and not v_privileged and p_assignee_id is distinct from v_user then return false; end if;
  if p_action <> 'view' and v_viewer and not v_privileged then return false; end if;
  if p_action = 'view' and not (v_privileged or v_viewer) and p_assignee_id is distinct from v_user then return false; end if;
  if p_lead_id is not null then
    return exists (select 1 from public.leads e where e.id = p_lead_id and e.company_id = p_company_id
      and (v_privileged or v_viewer and p_action = 'view' or e.assigned_to = v_user));
  elsif p_deal_id is not null then
    return exists (select 1 from public.deals e where e.id = p_deal_id and e.company_id = p_company_id
      and (v_privileged or v_viewer and p_action = 'view' or e.assigned_to = v_user));
  else
    return exists (select 1 from public.clients e where e.id = p_client_id and e.company_id = p_company_id
      and (v_privileged or v_viewer and p_action = 'view' or e.account_manager = v_profile_id));
  end if;
end;
$$;
revoke all on function public.commercial_can(text,uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.commercial_can(text,uuid,uuid,uuid,uuid,uuid) to authenticated;

create policy commercial_follow_ups_select on public.commercial_follow_ups for select to authenticated using (
  public.commercial_can('view',company_id,lead_id,deal_id,client_id,assignee_id)
);
create policy commercial_interactions_select on public.commercial_interactions for select to authenticated using (
  -- Historical assignee is attribution, not a visibility gate. A reassigned
  -- entity's current owner must be able to read its complete contact history.
  public.commercial_can('view',company_id,lead_id,deal_id,client_id,auth.uid())
);
create policy commercial_follow_up_events_select on public.commercial_follow_up_events for select to authenticated using (
  exists (select 1 from public.commercial_follow_ups f where f.id = follow_up_id and f.company_id = commercial_follow_up_events.company_id)
);

create view public.commercial_timeline with (security_invoker = true) as
  select i.company_id,
    case when i.lead_id is not null then 'lead' when i.deal_id is not null then 'deal' else 'client' end::text as entity_type,
    coalesce(i.lead_id,i.deal_id,i.client_id) as entity_id,'interaction'::text as kind,
    i.id as source_id,i.follow_up_id,i.occurred_at as at,
    pg_catalog.jsonb_build_object('outcome',i.outcome,'channel',i.channel,'notes',i.notes,'actor_id',i.actor_id) as details
  from public.commercial_interactions i
  union all
  select e.company_id,
    case when f.lead_id is not null then 'lead' when f.deal_id is not null then 'deal' else 'client' end::text,
    coalesce(f.lead_id,f.deal_id,f.client_id),
    case when e.event_type in ('created','next_created') then 'follow_up' else 'audit' end::text,
    e.id,e.follow_up_id,e.created_at,
    e.details || pg_catalog.jsonb_build_object('event_type',e.event_type,'actor_id',e.actor_id)
  from public.commercial_follow_up_events e join public.commercial_follow_ups f on f.id=e.follow_up_id;
revoke all on public.commercial_timeline from public,anon;
grant select on public.commercial_timeline to authenticated;

-- A privileged trigger enforces same-company and same-entity links even if a
-- future SQL writer bypasses the application RPC.
create function public.commercial_validate_links() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_follow public.commercial_follow_ups%rowtype;
begin
  if new.lead_id is not null and not exists (select 1 from public.leads e where e.id = new.lead_id and e.company_id = new.company_id) then
    raise exception 'Lead does not belong to company' using errcode = '23514';
  end if;
  if new.deal_id is not null and not exists (select 1 from public.deals e where e.id = new.deal_id and e.company_id = new.company_id) then
    raise exception 'Deal does not belong to company' using errcode = '23514';
  end if;
  if new.client_id is not null and not exists (select 1 from public.clients e where e.id = new.client_id and e.company_id = new.company_id) then
    raise exception 'Client does not belong to company' using errcode = '23514';
  end if;
  if tg_table_name = 'commercial_follow_ups' then
    if tg_op='INSERT' then
      if not exists (select 1 from public.profiles p where p.user_id = new.assignee_id and p.company_id = new.company_id and p.is_active) then
        raise exception 'Assignee must be an active company member' using errcode = '23514';
      end if;
    elsif new.assignee_id is distinct from old.assignee_id then
      if not exists (select 1 from public.profiles p where p.user_id = new.assignee_id and p.company_id = new.company_id and p.is_active) then
        raise exception 'Assignee must be an active company member' using errcode = '23514';
      end if;
    end if;
    if new.previous_follow_up_id is not null then
      select * into v_follow from public.commercial_follow_ups where id = new.previous_follow_up_id;
      if not found or v_follow.company_id <> new.company_id
        or (v_follow.lead_id,v_follow.deal_id,v_follow.client_id) is distinct from (new.lead_id,new.deal_id,new.client_id) then
        raise exception 'Previous follow-up entity mismatch' using errcode = '23514';
      end if;
    end if;
    if new.calendar_event_id is not null and not exists (select 1 from public.calendar_events e where e.id = new.calendar_event_id and e.company_id = new.company_id) then
      raise exception 'Calendar event company mismatch' using errcode = '23514';
    end if;
    if new.task_id is not null and not exists (select 1 from public.tasks t where t.id = new.task_id and t.company_id = new.company_id) then
      raise exception 'Task company mismatch' using errcode = '23514';
    end if;
  else
    if not exists (select 1 from public.profiles p where p.user_id=new.assignee_id and p.company_id=new.company_id and p.is_active) then
      raise exception 'Interaction assignee must be an active company member' using errcode='23514';
    end if;
    if new.follow_up_id is not null then
      select * into v_follow from public.commercial_follow_ups where id = new.follow_up_id;
      if not found or v_follow.company_id <> new.company_id
        or v_follow.assignee_id <> new.assignee_id
        or (v_follow.lead_id,v_follow.deal_id,v_follow.client_id) is distinct from (new.lead_id,new.deal_id,new.client_id) then
        raise exception 'Interaction follow-up entity mismatch' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.commercial_validate_links() from public,anon,authenticated;
create trigger commercial_follow_ups_validate before insert or update on public.commercial_follow_ups
  for each row execute function public.commercial_validate_links();
create trigger commercial_interactions_validate before insert on public.commercial_interactions
  for each row execute function public.commercial_validate_links();

-- Calendar drag/edit would otherwise bypass the follow-up RPC and leave the
-- reminder outbox scheduled for the old instant. Only privileged backend code
-- can change events linked to a commercial follow-up.
create function public.commercial_guard_calendar_event() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.metadata ? 'commercial_follow_up_id' and current_user in ('authenticated','anon') then
    raise exception 'Change commercial follow-up events through commercial_follow_up_action' using errcode='42501';
  end if;
  return old;
end;
$$;
revoke all on function public.commercial_guard_calendar_event() from public,anon,authenticated;
create trigger commercial_guard_calendar_event before update or delete on public.calendar_events
  for each row execute function public.commercial_guard_calendar_event();

create function public.commercial_create_follow_up_internal(p_company_id uuid,p_actor_id uuid,p_payload jsonb,p_previous_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_entity_type text := p_payload->>'entity_type';
  v_entity_id uuid := nullif(p_payload->>'entity_id','')::uuid;
  v_lead_id uuid;
  v_deal_id uuid;
  v_client_id uuid;
  v_assignee_id uuid := coalesce(nullif(p_payload->>'assignee_id','')::uuid,p_actor_id);
  v_scheduled_at timestamptz := nullif(p_payload->>'scheduled_at','')::timestamptz;
  v_timezone text := coalesce(nullif(btrim(p_payload->>'timezone'),''),'UTC');
  v_priority text := coalesce(nullif(p_payload->>'priority',''),'medium');
  v_reminder_minutes integer := nullif(p_payload->>'reminder_minutes_before','')::integer;
  v_channel text := p_payload->>'channel';
  v_objective text := btrim(coalesce(p_payload->>'objective',''));
  v_notes text := nullif(p_payload->>'notes','');
  v_follow_up_id uuid;
  v_task_id uuid;
  v_event_id uuid;
  v_can_task boolean;
begin
  if v_entity_type not in ('lead','deal','client') or v_entity_id is null then
    raise exception 'A valid commercial entity is required' using errcode='22023';
  end if;
  v_lead_id := case when v_entity_type='lead' then v_entity_id end;
  v_deal_id := case when v_entity_type='deal' then v_entity_id end;
  v_client_id := case when v_entity_type='client' then v_entity_id end;
  if v_scheduled_at is null or v_scheduled_at <= now() then
    raise exception 'Scheduled time must be in the future' using errcode='22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name=v_timezone) then
    raise exception 'Invalid time zone' using errcode='22023';
  end if;
  if v_channel not in ('call','whatsapp','email','meeting','other')
    or length(v_objective) not between 1 and 500
    or v_priority not in ('low','medium','high')
    or (v_reminder_minutes is not null and v_reminder_minutes not between 0 and 10080) then
    raise exception 'Invalid follow-up fields' using errcode='22023';
  end if;
  if not public.commercial_can('create',p_company_id,v_lead_id,v_deal_id,v_client_id,v_assignee_id) then
    raise exception 'Not authorized to create a follow-up for this entity or assignee' using errcode='42501';
  end if;
  if coalesce((p_payload->>'create_linked_task')::boolean,false) then
    select exists (
      select 1 from public.user_roles ur join public.permissions perm
        on perm.company_id=p_company_id and perm.role=ur.role and perm.module='tasks'
      where ur.user_id=p_actor_id and perm.can_create
    ) or public.has_role(p_actor_id,'super_admin'::public.app_role) into v_can_task;
    if not v_can_task then raise exception 'Not authorized to create linked task' using errcode='42501'; end if;
    insert into public.tasks(company_id,title,description,status,priority,assigned_to,due_date,created_by,
      related_lead_id,related_deal_id,related_client_id)
    values(p_company_id,v_objective,v_notes,'To Do',initcap(v_priority),v_assignee_id,
      (v_scheduled_at at time zone v_timezone)::date,p_actor_id,v_lead_id,v_deal_id,v_client_id)
    returning id into v_task_id;
  end if;
  insert into public.commercial_follow_ups(company_id,lead_id,deal_id,client_id,created_by,assignee_id,
    channel,objective,notes,scheduled_at,timezone,priority,reminder_minutes_before,task_id,previous_follow_up_id)
  values(p_company_id,v_lead_id,v_deal_id,v_client_id,p_actor_id,v_assignee_id,
    v_channel,v_objective,v_notes,v_scheduled_at,v_timezone,v_priority,v_reminder_minutes,v_task_id,p_previous_id)
  returning id into v_follow_up_id;

  insert into public.calendar_events(company_id,user_id,title,description,type,status,start_at,end_at,all_day,
    related_task_id,related_lead_id,related_deal_id,related_client_id,metadata)
  values(p_company_id,v_assignee_id,v_objective,v_notes,
    case when v_channel in ('meeting','call') then v_channel else 'event' end,'scheduled',
    v_scheduled_at,v_scheduled_at+interval '15 minutes',false,v_task_id,v_lead_id,v_deal_id,v_client_id,
    pg_catalog.jsonb_build_object('commercial_follow_up_id',v_follow_up_id))
  returning id into v_event_id;
  update public.commercial_follow_ups set calendar_event_id=v_event_id where id=v_follow_up_id;
  if v_reminder_minutes is not null then
    insert into public.commercial_reminder_outbox(follow_up_id,company_id,assignee_id,due_at)
    values(v_follow_up_id,p_company_id,v_assignee_id,v_scheduled_at-pg_catalog.make_interval(mins=>v_reminder_minutes));
  end if;
  insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
    values(p_company_id,v_follow_up_id,p_actor_id,case when p_previous_id is null then 'created' else 'next_created' end,
      pg_catalog.jsonb_build_object('objective',v_objective,'channel',v_channel,
        'scheduled_at',v_scheduled_at,'assignee_id',v_assignee_id));
  return v_follow_up_id;
end;
$$;
revoke all on function public.commercial_create_follow_up_internal(uuid,uuid,jsonb,uuid) from public,anon,authenticated;

create function public.commercial_follow_up_action(p_action text,p_payload jsonb,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_company uuid;
  v_hash text;
  v_saved public.commercial_action_idempotency%rowtype;
  v_result jsonb;
  v_follow public.commercial_follow_ups%rowtype;
  v_follow_id uuid;
  v_previous_id uuid;
  v_next_id uuid;
  v_interaction_id uuid;
  v_assignee_id uuid;
  v_scheduled_at timestamptz;
  v_timezone text;
  v_reminder_minutes integer;
  v_occured_at timestamptz;
  v_outcome text;
  v_channel text;
  v_lead_id uuid;
  v_contact_lead_id uuid;
  v_deal_id uuid;
  v_client_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_next jsonb;
begin
  if v_actor is null or p_idempotency_key is null or p_payload is null or pg_catalog.jsonb_typeof(p_payload)<>'object' then
    raise exception 'Authentication, payload and idempotency key are required' using errcode='22023';
  end if;
  select p.company_id into v_company from public.profiles p where p.user_id=v_actor and p.is_active;
  if v_company is null then raise exception 'Active company membership required' using errcode='42501'; end if;
  if p_action not in ('create','update','reschedule','assign','cancel','complete','record_interaction') then
    raise exception 'Unsupported commercial action' using errcode='22023';
  end if;
  v_hash := pg_catalog.md5(p_action||':'||p_payload::text);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company::text||v_actor::text||p_idempotency_key::text,0));
  select * into v_saved from public.commercial_action_idempotency
    where company_id=v_company and actor_id=v_actor and request_key=p_idempotency_key;
  if found then
    if v_saved.action<>p_action or v_saved.payload_hash<>v_hash then
      raise exception 'Idempotency key reused with different action or payload' using errcode='23505';
    end if;
    return v_saved.response;
  end if;

  if p_action='create' then
    v_previous_id := nullif(p_payload->>'previous_follow_up_id','')::uuid;
    if v_previous_id is not null then
      select * into v_follow from public.commercial_follow_ups where id=v_previous_id for update;
      if not found or v_follow.company_id<>v_company or v_follow.status='cancelled'
        or not public.commercial_can('edit',v_company,v_follow.lead_id,v_follow.deal_id,v_follow.client_id,v_follow.assignee_id) then
        raise exception 'Previous follow-up unavailable' using errcode='42501';
      end if;
    end if;
    v_follow_id := public.commercial_create_follow_up_internal(v_company,v_actor,p_payload,v_previous_id);
    if v_previous_id is not null and v_follow.status<>'completed' then
      update public.commercial_follow_ups set status='completed',completed_at=now(),updated_at=now() where id=v_previous_id;
      update public.calendar_events set status='completed',updated_at=now() where id=v_follow.calendar_event_id;
      update public.commercial_reminder_outbox set status='cancelled',updated_at=now()
        where follow_up_id=v_previous_id and status='pending';
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_previous_id,v_actor,'completed',pg_catalog.jsonb_build_object('next_follow_up_id',v_follow_id));
    end if;
    v_result := pg_catalog.jsonb_build_object('follow_up_id',v_follow_id);
  elsif p_action='record_interaction' then
    v_follow_id := nullif(p_payload->>'follow_up_id','')::uuid;
    if v_follow_id is not null then
      select * into v_follow from public.commercial_follow_ups where id=v_follow_id for update;
      if not found or v_follow.company_id<>v_company or v_follow.status in ('cancelled','completed') then
        raise exception 'Follow-up unavailable' using errcode='42501';
      end if;
      if not public.commercial_can('edit',v_company,v_follow.lead_id,v_follow.deal_id,v_follow.client_id,v_follow.assignee_id) then
        raise exception 'Not authorized to record this interaction' using errcode='42501';
      end if;
      v_lead_id := v_follow.lead_id;
      v_deal_id := v_follow.deal_id;
      v_client_id := v_follow.client_id;
      v_assignee_id := v_follow.assignee_id;
    else
      v_entity_type := p_payload->>'entity_type';
      v_entity_id := nullif(p_payload->>'entity_id','')::uuid;
      if v_entity_type not in ('lead','deal','client') or v_entity_id is null then
        raise exception 'A valid commercial entity is required' using errcode='22023';
      end if;
      v_lead_id := case when v_entity_type='lead' then v_entity_id end;
      v_deal_id := case when v_entity_type='deal' then v_entity_id end;
      v_client_id := case when v_entity_type='client' then v_entity_id end;
      v_assignee_id := v_actor;
      if not public.commercial_can('create',v_company,v_lead_id,v_deal_id,v_client_id,v_assignee_id) then
        raise exception 'Not authorized to record this interaction' using errcode='42501';
      end if;
    end if;
    v_channel := p_payload->>'channel';
    v_outcome := p_payload->>'outcome';
    v_occured_at := coalesce(nullif(p_payload->>'occurred_at','')::timestamptz,now());
    if v_channel not in ('call','whatsapp','email','meeting','other')
      or v_outcome not in ('contacted','no_answer','busy','callback_requested','rescheduled','wrong_contact','other')
      or v_occured_at>now()+interval '5 minutes' then
      raise exception 'Invalid interaction fields' using errcode='22023';
    end if;
    insert into public.commercial_interactions(company_id,follow_up_id,lead_id,deal_id,client_id,
      actor_id,assignee_id,channel,occurred_at,outcome,notes,next_step)
    values(v_company,v_follow_id,v_lead_id,v_deal_id,v_client_id,v_actor,v_assignee_id,v_channel,
      v_occured_at,v_outcome,nullif(p_payload->>'notes',''),nullif(p_payload->>'next_step',''))
    returning id into v_interaction_id;
    -- Only outcomes showing an actual exchange update the lead contact timestamp.
    v_contact_lead_id := v_lead_id;
    if v_contact_lead_id is null and v_deal_id is not null then
      select d.lead_id into v_contact_lead_id from public.deals d where d.id=v_deal_id and d.company_id=v_company;
    end if;
    if v_contact_lead_id is not null and v_outcome in ('contacted','callback_requested','rescheduled') then
      update public.leads set last_interaction_at=greatest(coalesce(last_interaction_at,'-infinity'::timestamptz),v_occured_at)
        where id=v_contact_lead_id and company_id=v_company;
    end if;
    if v_follow_id is not null then
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_follow_id,v_actor,'interaction_recorded',
          pg_catalog.jsonb_build_object('interaction_id',v_interaction_id,'outcome',v_outcome));
    end if;
    v_next := p_payload->'next_follow_up';
    if v_next is not null and pg_catalog.jsonb_typeof(v_next)='object' then
      if v_follow_id is not null and v_follow.status='completed' then
        raise exception 'Cannot create a next follow-up from a completed follow-up' using errcode='22023';
      end if;
      v_entity_type := case when v_lead_id is not null then 'lead' when v_deal_id is not null then 'deal' else 'client' end;
      v_entity_id := coalesce(v_lead_id,v_deal_id,v_client_id);
      v_next := v_next || pg_catalog.jsonb_build_object('entity_type',v_entity_type,'entity_id',v_entity_id);
      v_next_id := public.commercial_create_follow_up_internal(v_company,v_actor,v_next,v_follow_id);
    end if;
    if v_follow_id is not null and (v_next_id is not null or coalesce((p_payload->>'complete_follow_up')::boolean,false)) then
      update public.commercial_follow_ups set status='completed',completed_at=now(),updated_at=now() where id=v_follow_id;
      update public.calendar_events set status='completed',updated_at=now() where id=v_follow.calendar_event_id;
      update public.commercial_reminder_outbox set status='cancelled',updated_at=now()
        where follow_up_id=v_follow_id and status='pending';
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_follow_id,v_actor,'completed',pg_catalog.jsonb_build_object('next_follow_up_id',v_next_id));
    end if;
    v_result := pg_catalog.jsonb_build_object('follow_up_id',v_follow_id,'interaction_id',v_interaction_id,'next_follow_up_id',v_next_id);
  else
    v_follow_id := nullif(p_payload->>'follow_up_id','')::uuid;
    select * into v_follow from public.commercial_follow_ups where id=v_follow_id for update;
    if not found or v_follow.company_id<>v_company then raise exception 'Follow-up unavailable' using errcode='42501'; end if;
    if not public.commercial_can('edit',
       v_company,v_follow.lead_id,v_follow.deal_id,v_follow.client_id,v_follow.assignee_id) then
      raise exception 'Not authorized to change follow-up' using errcode='42501';
    end if;
    if v_follow.status in ('completed','cancelled') then raise exception 'Follow-up is terminal' using errcode='22023'; end if;
    if p_action='update' then
      v_channel := coalesce(nullif(p_payload->>'channel',''),v_follow.channel);
      if v_channel not in ('call','whatsapp','email','meeting','other')
        or coalesce(nullif(btrim(p_payload->>'objective'),''),v_follow.objective) is null
        or length(coalesce(nullif(btrim(p_payload->>'objective'),''),v_follow.objective)) > 500
        or coalesce(nullif(p_payload->>'priority',''),v_follow.priority) not in ('low','medium','high') then
        raise exception 'Invalid follow-up update' using errcode='22023';
      end if;
      v_reminder_minutes := case when p_payload ? 'reminder_minutes_before'
        then nullif(p_payload->>'reminder_minutes_before','')::integer else v_follow.reminder_minutes_before end;
      if v_reminder_minutes is not null and v_reminder_minutes not between 0 and 10080 then
        raise exception 'Invalid reminder offset' using errcode='22023';
      end if;
      update public.commercial_follow_ups set channel=v_channel,
        objective=coalesce(nullif(btrim(p_payload->>'objective'),''),objective),
        notes=case when p_payload ? 'notes' then nullif(p_payload->>'notes','') else notes end,
        priority=coalesce(nullif(p_payload->>'priority',''),priority),
        reminder_minutes_before=v_reminder_minutes,updated_at=now() where id=v_follow_id;
      update public.calendar_events set title=coalesce(nullif(btrim(p_payload->>'objective'),''),title),
        description=case when p_payload ? 'notes' then nullif(p_payload->>'notes','') else description end,
        type=case when v_channel in ('meeting','call') then v_channel else 'event' end,updated_at=now()
        where id=v_follow.calendar_event_id;
      if v_follow.task_id is not null then
        update public.tasks set title=coalesce(nullif(btrim(p_payload->>'objective'),''),title),
          description=case when p_payload ? 'notes' then nullif(p_payload->>'notes','') else description end,
          priority=initcap(coalesce(nullif(p_payload->>'priority',''),v_follow.priority)) where id=v_follow.task_id;
      end if;
      if p_payload ? 'reminder_minutes_before' then
        if v_reminder_minutes is null then
          update public.commercial_reminder_outbox set status='cancelled',generation=generation+1,updated_at=now()
            where follow_up_id=v_follow_id;
        else
          insert into public.commercial_reminder_outbox(follow_up_id,company_id,assignee_id,due_at)
          values(v_follow_id,v_company,v_follow.assignee_id,v_follow.scheduled_at-pg_catalog.make_interval(mins=>v_reminder_minutes))
          on conflict (follow_up_id) do update set due_at=excluded.due_at,generation=public.commercial_reminder_outbox.generation+1,
            status='pending',notification_id=null,attempts=0,last_error=null,updated_at=now();
        end if;
      end if;
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_follow_id,v_actor,'updated',p_payload);
    elsif p_action='reschedule' then
      v_scheduled_at := nullif(p_payload->>'scheduled_at','')::timestamptz;
      v_timezone := coalesce(nullif(p_payload->>'timezone',''),v_follow.timezone);
      v_reminder_minutes := case when p_payload ? 'reminder_minutes_before'
        then nullif(p_payload->>'reminder_minutes_before','')::integer else v_follow.reminder_minutes_before end;
      if v_scheduled_at is null or v_scheduled_at<=now()
        or not exists (select 1 from pg_catalog.pg_timezone_names where name=v_timezone)
        or (v_reminder_minutes is not null and v_reminder_minutes not between 0 and 10080) then
        raise exception 'Invalid reschedule values' using errcode='22023';
      end if;
      update public.commercial_follow_ups set scheduled_at=v_scheduled_at,timezone=v_timezone,
        reminder_minutes_before=v_reminder_minutes,updated_at=now() where id=v_follow_id;
      update public.calendar_events set start_at=v_scheduled_at,end_at=v_scheduled_at+interval '15 minutes',updated_at=now()
        where id=v_follow.calendar_event_id;
      if v_follow.task_id is not null then
        update public.tasks set due_date=(v_scheduled_at at time zone v_timezone)::date where id=v_follow.task_id;
      end if;
      if v_reminder_minutes is null then
        update public.commercial_reminder_outbox set status='cancelled',generation=generation+1,updated_at=now()
          where follow_up_id=v_follow_id;
      else
        insert into public.commercial_reminder_outbox(follow_up_id,company_id,assignee_id,due_at)
        values(v_follow_id,v_company,v_follow.assignee_id,v_scheduled_at-pg_catalog.make_interval(mins=>v_reminder_minutes))
        on conflict (follow_up_id) do update set assignee_id=excluded.assignee_id,due_at=excluded.due_at,
          generation=public.commercial_reminder_outbox.generation+1,status='pending',notification_id=null,
          attempts=0,last_error=null,updated_at=now();
      end if;
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_follow_id,v_actor,'rescheduled',pg_catalog.jsonb_build_object('from',v_follow.scheduled_at,'to',v_scheduled_at));
    elsif p_action='assign' then
      v_assignee_id := nullif(p_payload->>'assignee_id','')::uuid;
      if v_assignee_id is null or not public.commercial_can('assign',v_company,v_follow.lead_id,v_follow.deal_id,v_follow.client_id,v_assignee_id) then
        raise exception 'Invalid assignee or assignment permission' using errcode='42501';
      end if;
      update public.commercial_follow_ups set assignee_id=v_assignee_id,updated_at=now() where id=v_follow_id;
      update public.calendar_events set user_id=v_assignee_id,updated_at=now() where id=v_follow.calendar_event_id;
      update public.tasks set assigned_to=v_assignee_id where id=v_follow.task_id;
      update public.commercial_reminder_outbox set assignee_id=v_assignee_id,generation=generation+1,
        status='pending',notification_id=null,attempts=0,last_error=null,updated_at=now()
        where follow_up_id=v_follow_id;
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_follow_id,v_actor,'assigned',pg_catalog.jsonb_build_object('from',v_follow.assignee_id,'to',v_assignee_id));
    else
      update public.commercial_follow_ups set status=case when p_action='cancel' then 'cancelled' else 'completed' end,
        cancelled_at=case when p_action='cancel' then now() end,
        completed_at=case when p_action='complete' then now() end,updated_at=now() where id=v_follow_id;
      update public.calendar_events set status=case when p_action='cancel' then 'cancelled' else 'completed' end,updated_at=now()
        where id=v_follow.calendar_event_id;
      update public.commercial_reminder_outbox set status='cancelled',updated_at=now()
        where follow_up_id=v_follow_id and status='pending';
      insert into public.commercial_follow_up_events(company_id,follow_up_id,actor_id,event_type,details)
        values(v_company,v_follow_id,v_actor,p_action,'{}'::jsonb);
    end if;
    v_result := pg_catalog.jsonb_build_object('follow_up_id',v_follow_id);
  end if;
  insert into public.commercial_action_idempotency(company_id,actor_id,request_key,action,payload_hash,response)
    values(v_company,v_actor,p_idempotency_key,p_action,v_hash,v_result);
  return v_result;
end;
$$;
revoke all on function public.commercial_follow_up_action(text,jsonb,uuid) from public,anon;
grant execute on function public.commercial_follow_up_action(text,jsonb,uuid) to authenticated;

-- Invoked by a trusted scheduler using service_role; each row is locked, so
-- concurrent workers cannot create two notifications for one generation.
create function public.commercial_dispatch_due_reminders(p_limit integer default 100)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_row record;
  v_notification_id uuid;
  v_count integer := 0;
begin
  if p_limit not between 1 and 500 then raise exception 'Invalid batch size' using errcode='22023'; end if;
  for v_row in
    select o.follow_up_id,o.company_id,o.assignee_id,o.generation,f.objective,
      f.status as follow_status,f.scheduled_at
    from public.commercial_reminder_outbox o join public.commercial_follow_ups f on f.id=o.follow_up_id
    where o.status='pending' and o.due_at<=now() and o.attempts<5
    order by o.due_at for update of o skip locked limit p_limit
  loop
    if v_row.follow_status not in ('scheduled','in_progress') or not exists (
      select 1 from public.profiles p where p.user_id=v_row.assignee_id and p.company_id=v_row.company_id and p.is_active
    ) then
      update public.commercial_reminder_outbox set status='cancelled',
        updated_at=now() where follow_up_id=v_row.follow_up_id;
      continue;
    end if;
    begin
      insert into public.notifications(company_id,user_id,title,message,type,link)
      values(v_row.company_id,v_row.assignee_id,'Seguimiento comercial',v_row.objective,'reminder',
        '/follow-ups?followUpId='||v_row.follow_up_id::text)
      returning id into v_notification_id;
      update public.commercial_reminder_outbox set status='sent',notification_id=v_notification_id,
        attempts=attempts+1,last_error=null,updated_at=now() where follow_up_id=v_row.follow_up_id;
      v_count := v_count+1;
    exception when others then
      update public.commercial_reminder_outbox set attempts=attempts+1,
        last_error=left(sqlerrm,500),status=case when attempts+1>=5 then 'failed' else 'pending' end,
        updated_at=now() where follow_up_id=v_row.follow_up_id;
    end;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.commercial_dispatch_due_reminders(integer) from public,anon,authenticated;
grant execute on function public.commercial_dispatch_due_reminders(integer) to service_role;

comment on function public.commercial_dispatch_due_reminders(integer) is
  'Called by a trusted scheduler. The next versioned migration schedules it with pg_cron; this function is not executable by anon/authenticated.';

-- Aggregate only records the caller is already permitted to see. Counts run
-- inside PostgreSQL, avoiding a client-side scan or a silent page-size cap.
create function public.commercial_follow_up_metrics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_company uuid;
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
  v_company := public.get_current_company_id();
  if v_company is null or not public.is_company_member() then
    raise exception 'Active company membership required' using errcode='42501';
  end if;
  with visible_follow_ups as materialized (
    select f.* from public.commercial_follow_ups f
    where f.company_id=v_company and public.commercial_can(
      'view',f.company_id,f.lead_id,f.deal_id,f.client_id,f.assignee_id
    )
  ), visible_interactions as materialized (
    select i.outcome from public.commercial_interactions i
    where i.company_id=v_company and public.commercial_can(
      'view',i.company_id,i.lead_id,i.deal_id,i.client_id,v_user
    )
  ), per_assignee as (
    select f.assignee_id,count(*)::integer as total from visible_follow_ups f
    where f.status in ('scheduled','in_progress') group by f.assignee_id
  )
  select jsonb_build_object(
    'pending',count(*) filter (where f.status in ('scheduled','in_progress')),
    'overdue',count(*) filter (where f.status in ('scheduled','in_progress') and f.scheduled_at < now()),
    'upcoming',count(*) filter (where f.status in ('scheduled','in_progress') and f.scheduled_at >= now()),
    'completed',count(*) filter (where f.status='completed'),
    'contacted',(select count(*) from visible_interactions where outcome in ('contacted','callback_requested','rescheduled')),
    'no_answer',(select count(*) from visible_interactions where outcome='no_answer'),
    'by_assignee',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.assignee_id,'count',a.total)
      order by a.total desc,a.assignee_id) from per_assignee a),'[]'::jsonb)
  ) into v_result from visible_follow_ups f;
  return v_result;
end;
$$;
revoke all on function public.commercial_follow_up_metrics() from public,anon;
grant execute on function public.commercial_follow_up_metrics() to authenticated;
