-- Internal chat persistent presence.
-- Step 2: store the last moment a user was active in the CRM chat.

create table if not exists public.internal_chat_presence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  active_channel_id uuid references public.internal_chat_channels(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, profile_id)
);

create index if not exists internal_chat_presence_company_last_seen_idx
  on public.internal_chat_presence(company_id, last_seen_at desc);

create index if not exists internal_chat_presence_profile_idx
  on public.internal_chat_presence(profile_id);

alter table public.internal_chat_presence enable row level security;
alter table public.internal_chat_presence replica identity full;

drop trigger if exists update_internal_chat_presence_updated_at on public.internal_chat_presence;
create trigger update_internal_chat_presence_updated_at
before update on public.internal_chat_presence
for each row execute function public.update_updated_at_column();

drop policy if exists "internal_chat_presence_select" on public.internal_chat_presence;
create policy "internal_chat_presence_select"
on public.internal_chat_presence
for select
to authenticated
using (
  company_id = public.get_current_company_id()
);

drop policy if exists "internal_chat_presence_insert_own" on public.internal_chat_presence;
create policy "internal_chat_presence_insert_own"
on public.internal_chat_presence
for insert
to authenticated
with check (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and profile_id = public.get_current_profile_id()
);

drop policy if exists "internal_chat_presence_update_own" on public.internal_chat_presence;
create policy "internal_chat_presence_update_own"
on public.internal_chat_presence
for update
to authenticated
using (
  company_id = public.get_current_company_id()
  and profile_id = public.get_current_profile_id()
)
with check (
  company_id = public.get_current_company_id()
  and profile_id = public.get_current_profile_id()
);

create or replace function public.touch_internal_chat_presence(_active_channel_id uuid default null)
returns public.internal_chat_presence
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id uuid := public.get_current_company_id();
  _profile_id uuid := public.get_current_profile_id();
  _presence public.internal_chat_presence;
begin
  if _company_id is null or _profile_id is null then
    raise exception 'No active company profile';
  end if;

  if _active_channel_id is not null
    and not public.can_access_internal_chat_channel(_active_channel_id) then
    raise exception 'Cannot access internal chat channel';
  end if;

  insert into public.internal_chat_presence (
    company_id,
    profile_id,
    active_channel_id,
    last_seen_at
  )
  values (
    _company_id,
    _profile_id,
    _active_channel_id,
    now()
  )
  on conflict (company_id, profile_id)
  do update set
    active_channel_id = excluded.active_channel_id,
    last_seen_at = excluded.last_seen_at,
    updated_at = now()
  returning * into _presence;

  return _presence;
end;
$$;

revoke execute on function public.touch_internal_chat_presence(uuid) from anon, public;
grant execute on function public.touch_internal_chat_presence(uuid) to authenticated;

grant select, insert, update on public.internal_chat_presence to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.internal_chat_presence;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
