alter table public.oauth_states
  add column if not exists account_type text not null default 'personal';

alter table public.oauth_states
  drop constraint if exists oauth_states_account_type_check;

alter table public.oauth_states
  add constraint oauth_states_account_type_check
  check (account_type in ('personal', 'shared'));

create or replace function public.list_accessible_email_accounts()
returns table (
  id uuid,
  email_address text,
  display_name text,
  account_type text,
  shared_name text,
  last_synced_at timestamptz,
  can_send boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.email_address,
    a.display_name,
    a.account_type,
    a.shared_name,
    a.last_synced_at,
    case
      when a.account_type = 'personal' then true
      when public.can_manage_users() then true
      else exists (
        select 1
        from public.email_account_members m
        join public.profiles p on p.id = m.profile_id
        where m.email_account_id = a.id
          and p.user_id = auth.uid()
          and p.is_active = true
          and m.can_send = true
      )
    end as can_send
  from public.email_accounts a
  where a.company_id = public.get_current_company_id()
    and a.is_active = true
    and (
      (a.account_type = 'personal' and a.user_id in (
        auth.uid(),
        (select id from public.profiles where user_id = auth.uid() limit 1)
      ))
      or (a.account_type = 'shared' and (
        public.can_manage_users()
        or exists (
          select 1
          from public.email_account_members m
          join public.profiles p on p.id = m.profile_id
          where m.email_account_id = a.id
            and p.user_id = auth.uid()
            and p.is_active = true
            and m.can_read = true
        )
      ))
      or (a.account_type = 'official' and public.can_manage_users())
    )
  order by case a.account_type when 'personal' then 1 when 'shared' then 2 else 3 end, a.email_address;
$$;

revoke all on function public.list_accessible_email_accounts() from public;
grant execute on function public.list_accessible_email_accounts() to authenticated;
