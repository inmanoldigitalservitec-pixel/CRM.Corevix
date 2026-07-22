-- Internal chat message receipts.
-- Step 3: track delivered/read state per message and per recipient.

create table if not exists public.internal_chat_message_receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_id uuid not null references public.internal_chat_channels(id) on delete cascade,
  message_id uuid not null references public.internal_chat_messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, profile_id)
);

create index if not exists internal_chat_message_receipts_channel_profile_idx
  on public.internal_chat_message_receipts(channel_id, profile_id);

create index if not exists internal_chat_message_receipts_message_idx
  on public.internal_chat_message_receipts(message_id);

create index if not exists internal_chat_message_receipts_company_updated_idx
  on public.internal_chat_message_receipts(company_id, updated_at desc);

alter table public.internal_chat_message_receipts enable row level security;
alter table public.internal_chat_message_receipts replica identity full;

drop trigger if exists update_internal_chat_message_receipts_updated_at
on public.internal_chat_message_receipts;
create trigger update_internal_chat_message_receipts_updated_at
before update on public.internal_chat_message_receipts
for each row execute function public.update_updated_at_column();

drop policy if exists "internal_chat_message_receipts_select"
on public.internal_chat_message_receipts;
create policy "internal_chat_message_receipts_select"
on public.internal_chat_message_receipts
for select
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_message_receipts_insert_own"
on public.internal_chat_message_receipts;
create policy "internal_chat_message_receipts_insert_own"
on public.internal_chat_message_receipts
for insert
to authenticated
with check (
  company_id = public.get_current_company_id()
  and profile_id = public.get_current_profile_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_message_receipts_update_own"
on public.internal_chat_message_receipts;
create policy "internal_chat_message_receipts_update_own"
on public.internal_chat_message_receipts
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

create or replace function public.mark_internal_chat_messages_delivered(
  _channel_id uuid,
  _message_ids uuid[] default null
)
returns setof public.internal_chat_message_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id uuid := public.get_current_company_id();
  _profile_id uuid := public.get_current_profile_id();
begin
  if _company_id is null or _profile_id is null then
    raise exception 'No active company profile';
  end if;

  if not public.can_access_internal_chat_channel(_channel_id) then
    raise exception 'Cannot access internal chat channel';
  end if;

  return query
  insert into public.internal_chat_message_receipts (
    company_id,
    channel_id,
    message_id,
    profile_id,
    delivered_at
  )
  select
    m.company_id,
    m.channel_id,
    m.id,
    _profile_id,
    now()
  from public.internal_chat_messages m
  where m.company_id = _company_id
    and m.channel_id = _channel_id
    and m.deleted_at is null
    and m.sender_profile_id is distinct from _profile_id
    and (
      _message_ids is null
      or cardinality(_message_ids) = 0
      or m.id = any(_message_ids)
    )
  on conflict (message_id, profile_id)
  do update set
    delivered_at = coalesce(public.internal_chat_message_receipts.delivered_at, excluded.delivered_at),
    updated_at = now()
  returning *;
end;
$$;

create or replace function public.mark_internal_chat_messages_read(
  _channel_id uuid,
  _message_ids uuid[] default null
)
returns setof public.internal_chat_message_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id uuid := public.get_current_company_id();
  _profile_id uuid := public.get_current_profile_id();
begin
  if _company_id is null or _profile_id is null then
    raise exception 'No active company profile';
  end if;

  if not public.can_access_internal_chat_channel(_channel_id) then
    raise exception 'Cannot access internal chat channel';
  end if;

  return query
  insert into public.internal_chat_message_receipts (
    company_id,
    channel_id,
    message_id,
    profile_id,
    delivered_at,
    read_at
  )
  select
    m.company_id,
    m.channel_id,
    m.id,
    _profile_id,
    now(),
    now()
  from public.internal_chat_messages m
  where m.company_id = _company_id
    and m.channel_id = _channel_id
    and m.deleted_at is null
    and m.sender_profile_id is distinct from _profile_id
    and (
      _message_ids is null
      or cardinality(_message_ids) = 0
      or m.id = any(_message_ids)
    )
  on conflict (message_id, profile_id)
  do update set
    delivered_at = coalesce(public.internal_chat_message_receipts.delivered_at, excluded.delivered_at),
    read_at = coalesce(public.internal_chat_message_receipts.read_at, excluded.read_at),
    updated_at = now()
  returning *;
end;
$$;

revoke execute on function public.mark_internal_chat_messages_delivered(uuid, uuid[])
from anon, public;
grant execute on function public.mark_internal_chat_messages_delivered(uuid, uuid[])
to authenticated;

revoke execute on function public.mark_internal_chat_messages_read(uuid, uuid[])
from anon, public;
grant execute on function public.mark_internal_chat_messages_read(uuid, uuid[])
to authenticated;

grant select, insert, update on public.internal_chat_message_receipts to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.internal_chat_message_receipts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
