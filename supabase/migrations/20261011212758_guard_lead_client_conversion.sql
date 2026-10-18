begin;

-- Keep the established conversion implementation intact behind an authorization
-- boundary. The public RPC remains the contract used by the CRM UI.
alter function public.convert_lead_to_client(uuid, uuid)
  rename to convert_lead_to_client_unchecked;

revoke all on function public.convert_lead_to_client_unchecked(uuid, uuid)
  from public, anon, authenticated;

create function public.convert_lead_to_client(
  p_lead_id uuid,
  p_existing_client_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_actor_profile_id uuid;
  v_actor_role public.app_role;
  v_can_create boolean;
begin
  select *
    into v_lead
  from public.leads
  where id = p_lead_id;

  if not found then
    raise exception 'Prospecto no encontrado';
  end if;

  select p.id
    into v_actor_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.company_id = v_lead.company_id
    and coalesce(p.is_active, true)
  limit 1;

  if v_actor_profile_id is null then
    raise exception 'No tienes acceso a este prospecto';
  end if;

  -- Match useRole/getEffectiveRole precedence so a lower role cannot widen a
  -- higher role's permissions or remove its own-lead restriction.
  select ur.role
    into v_actor_role
  from public.user_roles ur
  where ur.user_id = auth.uid()
  order by case ur.role
    when 'super_admin' then 1
    when 'admin' then 2
    when 'manager' then 3
    when 'sales_agent' then 4
    when 'collaborator' then 5
    when 'viewer' then 6
    else 99
  end
  limit 1;

  -- public.permissions is the CRM's clients.create source of truth. Managers
  -- and sales roles follow the UI fallback when a role/module row is absent;
  -- explicit can_create=false still denies the operation.
  if v_actor_role in ('super_admin', 'admin') then
    null;
  elsif v_actor_role in ('manager', 'sales_agent', 'collaborator') then
    select prm.can_create
      into v_can_create
    from public.permissions prm
    where prm.company_id = v_lead.company_id
      and prm.role = v_actor_role
      and prm.module = 'clients'
    limit 1;

    if found and not v_can_create then
      raise exception 'No tienes permiso para convertir a cliente';
    end if;

    if v_actor_role in ('sales_agent', 'collaborator')
      and v_lead.assigned_to is distinct from auth.uid()
      and v_lead.assigned_to is distinct from v_actor_profile_id then
      raise exception 'Solo puedes convertir a cliente tus propios prospectos';
    end if;
  else
    -- Includes viewer and authenticated users without an application role.
    raise exception 'No tienes permiso para convertir a cliente';
  end if;

  return public.convert_lead_to_client_unchecked(p_lead_id, p_existing_client_id);
end;
$$;

revoke all on function public.convert_lead_to_client(uuid, uuid)
  from public, anon;
grant execute on function public.convert_lead_to_client(uuid, uuid)
  to authenticated;

commit;
;
