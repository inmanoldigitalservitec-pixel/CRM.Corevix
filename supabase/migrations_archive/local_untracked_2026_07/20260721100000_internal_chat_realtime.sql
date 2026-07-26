-- Internal CRM chat primitives.
-- Step 1: tables, indexes, RLS, default General channel, and Realtime publication.

create table if not exists public.internal_chat_channels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null default 'group',
  name text,
  description text,
  related_type text,
  related_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_chat_channels_type_check
    check (type in ('general', 'direct', 'group', 'context')),
  constraint internal_chat_channels_name_required_check
    check (type = 'direct' or nullif(btrim(coalesce(name, '')), '') is not null)
);

create table if not exists public.internal_chat_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_id uuid not null references public.internal_chat_channels(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_chat_members_role_check check (role in ('owner', 'member')),
  unique (channel_id, profile_id)
);

create table if not exists public.internal_chat_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_id uuid not null references public.internal_chat_channels(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  body text not null,
  message_type text not null default 'text',
  metadata jsonb not null default '{}'::jsonb,
  reply_to_id uuid references public.internal_chat_messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_chat_messages_type_check check (message_type in ('text', 'system')),
  constraint internal_chat_messages_body_check check (nullif(btrim(body), '') is not null)
);

create table if not exists public.internal_chat_reads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_id uuid not null references public.internal_chat_channels(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id uuid references public.internal_chat_messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, profile_id)
);

create unique index if not exists internal_chat_channels_one_general_per_company_idx
  on public.internal_chat_channels(company_id)
  where type = 'general';

create index if not exists internal_chat_channels_company_updated_idx
  on public.internal_chat_channels(company_id, updated_at desc);

create index if not exists internal_chat_channels_company_type_idx
  on public.internal_chat_channels(company_id, type);

create index if not exists internal_chat_channels_related_idx
  on public.internal_chat_channels(company_id, related_type, related_id)
  where related_type is not null and related_id is not null;

create index if not exists internal_chat_members_company_profile_idx
  on public.internal_chat_members(company_id, profile_id);

create index if not exists internal_chat_members_channel_idx
  on public.internal_chat_members(channel_id);

create index if not exists internal_chat_messages_channel_created_idx
  on public.internal_chat_messages(channel_id, created_at desc);

create index if not exists internal_chat_messages_company_created_idx
  on public.internal_chat_messages(company_id, created_at desc);

create index if not exists internal_chat_reads_company_profile_idx
  on public.internal_chat_reads(company_id, profile_id);

alter table public.internal_chat_channels enable row level security;
alter table public.internal_chat_members enable row level security;
alter table public.internal_chat_messages enable row level security;
alter table public.internal_chat_reads enable row level security;

alter table public.internal_chat_channels replica identity full;
alter table public.internal_chat_members replica identity full;
alter table public.internal_chat_messages replica identity full;
alter table public.internal_chat_reads replica identity full;

drop trigger if exists update_internal_chat_channels_updated_at on public.internal_chat_channels;
create trigger update_internal_chat_channels_updated_at
before update on public.internal_chat_channels
for each row execute function public.update_updated_at_column();

drop trigger if exists update_internal_chat_members_updated_at on public.internal_chat_members;
create trigger update_internal_chat_members_updated_at
before update on public.internal_chat_members
for each row execute function public.update_updated_at_column();

drop trigger if exists update_internal_chat_messages_updated_at on public.internal_chat_messages;
create trigger update_internal_chat_messages_updated_at
before update on public.internal_chat_messages
for each row execute function public.update_updated_at_column();

drop trigger if exists update_internal_chat_reads_updated_at on public.internal_chat_reads;
create trigger update_internal_chat_reads_updated_at
before update on public.internal_chat_reads
for each row execute function public.update_updated_at_column();

create or replace function public.is_internal_chat_member(_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.internal_chat_members m
    join public.profiles p on p.id = m.profile_id
    where m.channel_id = _channel_id
      and p.user_id = auth.uid()
      and p.company_id = m.company_id
      and p.is_active = true
  )
$$;

create or replace function public.can_access_internal_chat_channel(_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.internal_chat_channels c
    where c.id = _channel_id
      and c.company_id = public.get_current_company_id()
      and (
        c.type = 'general'
        or c.created_by = public.get_current_profile_id()
        or public.is_internal_chat_member(c.id)
      )
  )
$$;

create or replace function public.can_manage_internal_chat_channel(_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_any_role(auth.uid(), array['super_admin','admin']::public.app_role[])
    or exists (
      select 1
      from public.internal_chat_channels c
      where c.id = _channel_id
        and c.company_id = public.get_current_company_id()
        and c.created_by = public.get_current_profile_id()
    )
    or exists (
      select 1
      from public.internal_chat_members m
      join public.profiles p on p.id = m.profile_id
      where m.channel_id = _channel_id
        and m.company_id = public.get_current_company_id()
        and p.user_id = auth.uid()
        and p.is_active = true
        and m.role = 'owner'
    )
$$;

revoke execute on function public.is_internal_chat_member(uuid) from anon, public;
grant execute on function public.is_internal_chat_member(uuid) to authenticated;

revoke execute on function public.can_access_internal_chat_channel(uuid) from anon, public;
grant execute on function public.can_access_internal_chat_channel(uuid) to authenticated;

revoke execute on function public.can_manage_internal_chat_channel(uuid) from anon, public;
grant execute on function public.can_manage_internal_chat_channel(uuid) to authenticated;

drop policy if exists "internal_chat_channels_select" on public.internal_chat_channels;
create policy "internal_chat_channels_select"
on public.internal_chat_channels
for select
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_access_internal_chat_channel(id)
);

drop policy if exists "internal_chat_channels_insert" on public.internal_chat_channels;
create policy "internal_chat_channels_insert"
on public.internal_chat_channels
for insert
to authenticated
with check (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and created_by = public.get_current_profile_id()
);

drop policy if exists "internal_chat_channels_update" on public.internal_chat_channels;
create policy "internal_chat_channels_update"
on public.internal_chat_channels
for update
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_manage_internal_chat_channel(id)
)
with check (
  company_id = public.get_current_company_id()
  and public.can_manage_internal_chat_channel(id)
);

drop policy if exists "internal_chat_channels_delete" on public.internal_chat_channels;
create policy "internal_chat_channels_delete"
on public.internal_chat_channels
for delete
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_manage_internal_chat_channel(id)
);

drop policy if exists "internal_chat_members_select" on public.internal_chat_members;
create policy "internal_chat_members_select"
on public.internal_chat_members
for select
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_members_insert" on public.internal_chat_members;
create policy "internal_chat_members_insert"
on public.internal_chat_members
for insert
to authenticated
with check (
  company_id = public.get_current_company_id()
  and public.can_manage_internal_chat_channel(channel_id)
  and exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.company_id = public.get_current_company_id()
      and p.is_active = true
  )
);

drop policy if exists "internal_chat_members_update" on public.internal_chat_members;
create policy "internal_chat_members_update"
on public.internal_chat_members
for update
to authenticated
using (
  company_id = public.get_current_company_id()
  and (
    public.can_manage_internal_chat_channel(channel_id)
    or profile_id = public.get_current_profile_id()
  )
)
with check (
  company_id = public.get_current_company_id()
  and (
    public.can_manage_internal_chat_channel(channel_id)
    or profile_id = public.get_current_profile_id()
  )
);

drop policy if exists "internal_chat_members_delete" on public.internal_chat_members;
create policy "internal_chat_members_delete"
on public.internal_chat_members
for delete
to authenticated
using (
  company_id = public.get_current_company_id()
  and (
    public.can_manage_internal_chat_channel(channel_id)
    or profile_id = public.get_current_profile_id()
  )
);

drop policy if exists "internal_chat_messages_select" on public.internal_chat_messages;
create policy "internal_chat_messages_select"
on public.internal_chat_messages
for select
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_messages_insert" on public.internal_chat_messages;
create policy "internal_chat_messages_insert"
on public.internal_chat_messages
for insert
to authenticated
with check (
  public.is_company_member()
  and company_id = public.get_current_company_id()
  and sender_profile_id = public.get_current_profile_id()
  and public.can_access_internal_chat_channel(channel_id)
  and exists (
    select 1
    from public.internal_chat_channels c
    where c.id = channel_id
      and c.company_id = public.get_current_company_id()
      and c.is_archived = false
  )
);

drop policy if exists "internal_chat_messages_update" on public.internal_chat_messages;
create policy "internal_chat_messages_update"
on public.internal_chat_messages
for update
to authenticated
using (
  company_id = public.get_current_company_id()
  and sender_profile_id = public.get_current_profile_id()
)
with check (
  company_id = public.get_current_company_id()
  and sender_profile_id = public.get_current_profile_id()
);

drop policy if exists "internal_chat_messages_delete" on public.internal_chat_messages;
create policy "internal_chat_messages_delete"
on public.internal_chat_messages
for delete
to authenticated
using (
  company_id = public.get_current_company_id()
  and (
    sender_profile_id = public.get_current_profile_id()
    or public.can_manage_internal_chat_channel(channel_id)
  )
);

drop policy if exists "internal_chat_reads_select" on public.internal_chat_reads;
create policy "internal_chat_reads_select"
on public.internal_chat_reads
for select
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_reads_insert" on public.internal_chat_reads;
create policy "internal_chat_reads_insert"
on public.internal_chat_reads
for insert
to authenticated
with check (
  company_id = public.get_current_company_id()
  and profile_id = public.get_current_profile_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_reads_update" on public.internal_chat_reads;
create policy "internal_chat_reads_update"
on public.internal_chat_reads
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

drop policy if exists "internal_chat_reads_delete" on public.internal_chat_reads;
create policy "internal_chat_reads_delete"
on public.internal_chat_reads
for delete
to authenticated
using (
  company_id = public.get_current_company_id()
  and profile_id = public.get_current_profile_id()
);

create or replace function public.ensure_default_internal_chat_channel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.internal_chat_channels (company_id, type, name, description, created_by)
  values (new.id, 'general', 'General', 'Canal general del equipo', null)
  on conflict (company_id) where type = 'general' do nothing;

  return new;
end;
$$;

drop trigger if exists trg_ensure_default_internal_chat_channel on public.companies;
create trigger trg_ensure_default_internal_chat_channel
after insert on public.companies
for each row execute function public.ensure_default_internal_chat_channel();

insert into public.internal_chat_channels (company_id, type, name, description, created_by)
select c.id, 'general', 'General', 'Canal general del equipo', null
from public.companies c
where not exists (
  select 1
  from public.internal_chat_channels ch
  where ch.company_id = c.id
    and ch.type = 'general'
);

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'internal_chat_channels',
      'internal_chat_members',
      'internal_chat_messages',
      'internal_chat_reads'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;
