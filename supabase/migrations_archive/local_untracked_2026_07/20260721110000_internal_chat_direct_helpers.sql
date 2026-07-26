-- Internal CRM chat direct-message helpers.
-- Adds a database-side helper so one-to-one chats are reused instead of duplicated.

create or replace function public.get_or_create_internal_direct_chat(_other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _current_profile_id uuid := public.get_current_profile_id();
  _company_id uuid := public.get_current_company_id();
  _channel_id uuid;
begin
  if _current_profile_id is null or _company_id is null then
    raise exception 'No hay contexto de compañía activo.';
  end if;

  if _other_profile_id is null then
    raise exception 'Selecciona un usuario válido.';
  end if;

  if _other_profile_id = _current_profile_id then
    raise exception 'No puedes crear un chat directo contigo mismo.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = _other_profile_id
      and p.company_id = _company_id
      and p.is_active = true
  ) then
    raise exception 'Este usuario no pertenece a tu compañía o no está activo.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(_company_id::text),
    hashtext(least(_current_profile_id::text, _other_profile_id::text) || ':' || greatest(_current_profile_id::text, _other_profile_id::text))
  );

  select c.id
  into _channel_id
  from public.internal_chat_channels c
  join public.internal_chat_members me
    on me.channel_id = c.id
    and me.profile_id = _current_profile_id
  join public.internal_chat_members other_member
    on other_member.channel_id = c.id
    and other_member.profile_id = _other_profile_id
  where c.company_id = _company_id
    and c.type = 'direct'
    and c.is_archived = false
    and (
      select count(*)
      from public.internal_chat_members count_members
      where count_members.channel_id = c.id
    ) = 2
  order by c.updated_at desc
  limit 1;

  if _channel_id is not null then
    return _channel_id;
  end if;

  insert into public.internal_chat_channels (
    company_id,
    type,
    name,
    description,
    created_by
  )
  values (
    _company_id,
    'direct',
    null,
    null,
    _current_profile_id
  )
  returning id into _channel_id;

  insert into public.internal_chat_members (
    company_id,
    channel_id,
    profile_id,
    role
  )
  values
    (_company_id, _channel_id, _current_profile_id, 'owner'),
    (_company_id, _channel_id, _other_profile_id, 'member')
  on conflict (channel_id, profile_id) do nothing;

  return _channel_id;
end;
$$;

revoke execute on function public.get_or_create_internal_direct_chat(uuid) from anon, public;
grant execute on function public.get_or_create_internal_direct_chat(uuid) to authenticated;
