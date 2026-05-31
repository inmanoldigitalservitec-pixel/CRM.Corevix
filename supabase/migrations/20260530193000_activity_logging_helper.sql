-- Centralized internal activity logging with server-side deduplication.

create or replace function public.log_activity_event(
  p_company_id uuid,
  p_action text,
  p_entity_type text,
  p_user_id uuid default null,
  p_entity_id uuid default null,
  p_detail text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_window_seconds integer default 5
)
returns table (
  activity_log_id uuid,
  inserted boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := p_user_id;
  v_detail text := nullif(btrim(coalesce(p_detail, '')), '');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_existing_id uuid;
  v_window interval := make_interval(secs => greatest(coalesce(p_dedupe_window_seconds, 5), 0));
begin
  if p_company_id is null then
    raise exception 'company_id is required' using errcode = '22023';
  end if;

  if p_action is null or btrim(p_action) = '' then
    raise exception 'action is required' using errcode = '22023';
  end if;

  if p_entity_type is null or btrim(p_entity_type) = '' then
    raise exception 'entity_type is required' using errcode = '22023';
  end if;

  select al.id
    into v_existing_id
  from public.activity_logs al
  where al.company_id = p_company_id
    and al.action = trim(p_action)
    and al.entity_type = trim(p_entity_type)
    and coalesce(al.entity_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_entity_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(al.user_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(v_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(al.detail, '') = coalesce(v_detail, '')
    and al.created_at >= now() - v_window
  order by al.created_at desc
  limit 1;

  if v_existing_id is not null then
    activity_log_id := v_existing_id;
    inserted := false;
    return next;
    return;
  end if;

  insert into public.activity_logs (
    company_id,
    user_id,
    entity_type,
    entity_id,
    action,
    detail,
    metadata
  )
  values (
    p_company_id,
    v_user_id,
    trim(p_entity_type),
    p_entity_id,
    trim(p_action),
    v_detail,
    v_metadata
  )
  returning id into activity_log_id;

  inserted := true;
  return next;
end;
$$;

create index if not exists idx_activity_logs_company_created_at
  on public.activity_logs (company_id, created_at desc);

revoke all on function public.log_activity_event(uuid, text, text, uuid, uuid, text, jsonb, integer) from public;
grant execute on function public.log_activity_event(uuid, text, text, uuid, uuid, text, jsonb, integer) to authenticated, service_role;
