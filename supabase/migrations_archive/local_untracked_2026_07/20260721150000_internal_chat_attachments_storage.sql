-- Internal chat attachments storage.
-- Attachments are private and expire after a maximum of 7 days.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'internal-chat-attachments',
  'internal-chat-attachments',
  false,
  10485760,
  null
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = null;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can upload internal chat attachments'
  ) then
    create policy "Company members can upload internal chat attachments"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'internal-chat-attachments'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can read internal chat attachments'
  ) then
    create policy "Company members can read internal chat attachments"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'internal-chat-attachments'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Company members can delete internal chat attachments'
  ) then
    create policy "Company members can delete internal chat attachments"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'internal-chat-attachments'
      and (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
    );
  end if;
end $$;

create table if not exists public.internal_chat_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  channel_id uuid not null references public.internal_chat_channels(id) on delete cascade,
  message_id uuid references public.internal_chat_messages(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_bucket text not null default 'internal-chat-attachments',
  storage_path text not null unique,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  expires_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internal_chat_attachments_bucket_check
    check (storage_bucket = 'internal-chat-attachments'),
  constraint internal_chat_attachments_expiry_window_check
    check (expires_at <= created_at + interval '7 days')
);

create index if not exists internal_chat_attachments_company_expires_idx
  on public.internal_chat_attachments(company_id, expires_at)
  where deleted_at is null;

create index if not exists internal_chat_attachments_channel_idx
  on public.internal_chat_attachments(channel_id, created_at desc);

alter table public.internal_chat_attachments enable row level security;
alter table public.internal_chat_attachments replica identity full;

drop trigger if exists update_internal_chat_attachments_updated_at
on public.internal_chat_attachments;
create trigger update_internal_chat_attachments_updated_at
before update on public.internal_chat_attachments
for each row execute function public.update_updated_at_column();

drop policy if exists "internal_chat_attachments_select"
on public.internal_chat_attachments;
create policy "internal_chat_attachments_select"
on public.internal_chat_attachments
for select
to authenticated
using (
  company_id = public.get_current_company_id()
  and public.can_access_internal_chat_channel(channel_id)
);

drop policy if exists "internal_chat_attachments_insert_own"
on public.internal_chat_attachments;
create policy "internal_chat_attachments_insert_own"
on public.internal_chat_attachments
for insert
to authenticated
with check (
  company_id = public.get_current_company_id()
  and uploaded_by = public.get_current_profile_id()
  and public.can_access_internal_chat_channel(channel_id)
  and expires_at <= now() + interval '7 days'
);

drop policy if exists "internal_chat_attachments_update_message"
on public.internal_chat_attachments;
create policy "internal_chat_attachments_update_message"
on public.internal_chat_attachments
for update
to authenticated
using (
  company_id = public.get_current_company_id()
  and uploaded_by = public.get_current_profile_id()
)
with check (
  company_id = public.get_current_company_id()
  and uploaded_by = public.get_current_profile_id()
);

create or replace function public.register_internal_chat_attachment(
  _channel_id uuid,
  _storage_path text,
  _file_name text,
  _file_size bigint,
  _mime_type text,
  _expires_in_days integer
)
returns public.internal_chat_attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  _company_id uuid := public.get_current_company_id();
  _profile_id uuid := public.get_current_profile_id();
  _retention_days integer := least(greatest(coalesce(_expires_in_days, 7), 1), 7);
  _expires_at timestamptz := now() + make_interval(days => _retention_days);
  _attachment public.internal_chat_attachments;
begin
  if _company_id is null or _profile_id is null then
    raise exception 'No active company profile';
  end if;

  if not public.can_access_internal_chat_channel(_channel_id) then
    raise exception 'Cannot access internal chat channel';
  end if;

  if nullif(btrim(_storage_path), '') is null then
    raise exception 'Storage path is required';
  end if;

  insert into public.internal_chat_attachments (
    company_id,
    channel_id,
    uploaded_by,
    storage_path,
    file_name,
    file_size,
    mime_type,
    expires_at
  )
  values (
    _company_id,
    _channel_id,
    _profile_id,
    _storage_path,
    nullif(btrim(_file_name), ''),
    greatest(coalesce(_file_size, 0), 0),
    coalesce(nullif(btrim(_mime_type), ''), 'application/octet-stream'),
    _expires_at
  )
  returning * into _attachment;

  return _attachment;
end;
$$;

create or replace function public.link_internal_chat_attachment_message(
  _storage_path text,
  _message_id uuid
)
returns public.internal_chat_attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  _attachment public.internal_chat_attachments;
begin
  update public.internal_chat_attachments a
  set message_id = _message_id
  from public.internal_chat_messages m
  where a.storage_path = _storage_path
    and a.company_id = public.get_current_company_id()
    and a.uploaded_by = public.get_current_profile_id()
    and m.id = _message_id
    and m.company_id = a.company_id
    and m.channel_id = a.channel_id
    and m.sender_profile_id = public.get_current_profile_id()
  returning a.* into _attachment;

  if _attachment.id is null then
    raise exception 'Attachment could not be linked to message';
  end if;

  return _attachment;
end;
$$;

create or replace function public.cleanup_expired_internal_chat_attachments()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  _deleted_count integer := 0;
begin
  with expired as (
    select id, storage_path
    from public.internal_chat_attachments
    where deleted_at is null
      and expires_at <= now()
  )
  delete from storage.objects o
  using expired e
  where o.bucket_id = 'internal-chat-attachments'
    and o.name = e.storage_path;

  update public.internal_chat_attachments
  set deleted_at = now()
  where deleted_at is null
    and expires_at <= now();

  get diagnostics _deleted_count = row_count;
  return _deleted_count;
end;
$$;

revoke execute on function public.register_internal_chat_attachment(
  uuid,
  text,
  text,
  bigint,
  text,
  integer
) from anon, public;
grant execute on function public.register_internal_chat_attachment(
  uuid,
  text,
  text,
  bigint,
  text,
  integer
) to authenticated;

revoke execute on function public.link_internal_chat_attachment_message(text, uuid)
from anon, public;
grant execute on function public.link_internal_chat_attachment_message(text, uuid)
to authenticated;

revoke execute on function public.cleanup_expired_internal_chat_attachments()
from anon, public;
grant execute on function public.cleanup_expired_internal_chat_attachments()
to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.internal_chat_attachments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception
    when others then null;
  end;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'schedule'
      and n.nspname = 'cron'
  ) then
    execute $cron$
      select cron.schedule(
        'cleanup-internal-chat-attachments',
        '0 * * * *',
        'select public.cleanup_expired_internal_chat_attachments();'
      )
    $cron$;
  end if;
exception
  when duplicate_object then null;
  when others then null;
end $$;
