-- Separate the CRM sender from personal and shared mailboxes.
alter table public.email_accounts
  add column if not exists account_type text not null default 'personal',
  add column if not exists shared_name text,
  add column if not exists is_system_default boolean not null default false;

alter table public.email_accounts
  drop constraint if exists email_accounts_account_type_check;

alter table public.email_accounts
  add constraint email_accounts_account_type_check
  check (account_type in ('official', 'personal', 'shared'));

create table if not exists public.email_account_members (
  id uuid primary key default gen_random_uuid(),
  email_account_id uuid not null references public.email_accounts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  can_read boolean not null default true,
  can_send boolean not null default false,
  created_at timestamptz not null default now(),
  unique (email_account_id, profile_id)
);

create index if not exists email_account_members_profile_idx
  on public.email_account_members(profile_id);

create index if not exists email_accounts_company_type_idx
  on public.email_accounts(company_id, account_type, is_active);

-- The configured Corevix sender is the system mailbox. Existing connected accounts
-- remain personal unless explicitly converted by an administrator later.
update public.email_accounts
set account_type = 'official',
    shared_name = coalesce(shared_name, 'Corevix CRM'),
    is_system_default = true,
    updated_at = now()
where provider = 'gmail'
  and lower(coalesce(email_address, email)) = 'corevix.rd@gmail.com';

create or replace function public.can_access_email_account(
  p_account_id uuid,
  p_access text default 'read'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  account_row public.email_accounts%rowtype;
  current_profile_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into account_row
  from public.email_accounts
  where id = p_account_id;

  if not found or account_row.is_active = false then
    return false;
  end if;

  select id into current_profile_id
  from public.profiles
  where user_id = auth.uid()
    and company_id = account_row.company_id
    and is_active = true
  limit 1;

  if current_profile_id is null then
    return false;
  end if;

  -- Administrators can manage the official/shared configuration and audit mail.
  if public.can_manage_users() then
    return true;
  end if;

  -- A personal mailbox is private to its owner. Legacy rows may contain either
  -- profiles.id or auth.users.id, so support both while data is normalized.
  if account_row.account_type = 'personal'
     and account_row.user_id in (current_profile_id, auth.uid())
  then
    return p_access in ('read', 'send', 'manage', 'row');
  end if;

  -- Shared mailboxes are consumed through server-side functions. The row itself
  -- is never exposed to members because it contains OAuth tokens.
  if account_row.account_type = 'shared'
     and p_access in ('read', 'send')
     and exists (
       select 1
       from public.email_account_members m
       where m.email_account_id = account_row.id
         and m.profile_id = current_profile_id
         and (p_access = 'read' and m.can_read or p_access = 'send' and m.can_send)
     )
  then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.can_access_email_account(uuid, text) from public;
grant execute on function public.can_access_email_account(uuid, text) to authenticated;

alter table public.email_account_members enable row level security;
drop policy if exists email_account_members_select on public.email_account_members;
drop policy if exists email_account_members_manage on public.email_account_members;

create policy email_account_members_select
on public.email_account_members
for select to authenticated
using (
  public.can_manage_users()
  or profile_id = (select id from public.profiles where user_id = auth.uid() limit 1)
);

create policy email_account_members_manage
on public.email_account_members
for all to authenticated
using (public.can_manage_users())
with check (public.can_manage_users());

-- Never expose OAuth-bearing account rows outside the owner or administrators.
drop policy if exists email_accounts_select_company on public.email_accounts;
drop policy if exists email_accounts_manage_company on public.email_accounts;

create policy email_accounts_select_scoped
on public.email_accounts
for select to authenticated
using (public.can_access_email_account(id, 'row'));

create policy email_accounts_manage_scoped
on public.email_accounts
for all to authenticated
using (public.can_access_email_account(id, 'manage'))
with check (
  public.can_manage_users()
  or (
    account_type = 'personal'
    and user_id in (
      (select id from public.profiles where user_id = auth.uid() limit 1),
      auth.uid()
    )
  )
);

-- Conversations and messages follow mailbox visibility, not only company membership.
drop policy if exists email_convos_select_company on public.email_conversations;
drop policy if exists email_convos_manage_company on public.email_conversations;
create policy email_convos_select_scoped
on public.email_conversations
for select to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    (email_account_id is not null and public.can_access_email_account(email_account_id, 'read'))
    or (email_account_id is null and public.can_manage_users())
  )
);
create policy email_convos_manage_scoped
on public.email_conversations
for all to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    (email_account_id is not null and public.can_access_email_account(email_account_id, 'read'))
    or (email_account_id is null and public.can_manage_users())
  )
)
with check (company_id = public.get_user_company_id(auth.uid()));

drop policy if exists email_messages_select_company on public.email_messages;
drop policy if exists email_messages_manage_company on public.email_messages;
create policy email_messages_select_scoped
on public.email_messages
for select to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    (email_account_id is not null and public.can_access_email_account(email_account_id, 'read'))
    or (
      email_account_id is null
      and conversation_id is not null
      and exists (
        select 1 from public.email_conversations c
        where c.id = email_messages.conversation_id
          and c.email_account_id is not null
          and public.can_access_email_account(c.email_account_id, 'read')
      )
    )
    or (email_account_id is null and conversation_id is null and public.can_manage_users())
  )
);
create policy email_messages_manage_scoped
on public.email_messages
for all to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and (
    (email_account_id is not null and public.can_access_email_account(email_account_id, 'read'))
    or (email_account_id is null and public.can_manage_users())
  )
)
with check (company_id = public.get_user_company_id(auth.uid()));

-- Keep the Gmail client secret server-only and expose only a boolean status to the UI.
alter table public.gmail_settings
  add column if not exists client_secret_configured boolean not null default false;

update public.gmail_settings
set client_secret_configured = (client_secret_encrypted is not null and length(client_secret_encrypted) > 0)
where client_secret_configured = false;

alter table public.gmail_settings enable row level security;
drop policy if exists gmail_settings_select_company on public.gmail_settings;
drop policy if exists gmail_settings_manage_company on public.gmail_settings;
create policy gmail_settings_select_admin
on public.gmail_settings
for select to authenticated
using (public.can_manage_users() or public.has_permission(auth.uid(), 'settings.manage'));
create policy gmail_settings_manage_admin
on public.gmail_settings
for all to authenticated
using (public.can_manage_users() or public.has_permission(auth.uid(), 'settings.manage'))
with check (public.can_manage_users() or public.has_permission(auth.uid(), 'settings.manage'));
