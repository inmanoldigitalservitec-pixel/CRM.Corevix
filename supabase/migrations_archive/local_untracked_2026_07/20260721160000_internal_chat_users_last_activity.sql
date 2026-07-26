-- Internal chat directory: include latest CRM activity per teammate.

drop function if exists public.list_internal_chat_users(text);

create or replace function public.list_internal_chat_users(_search text default null)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  department text,
  phone text,
  is_active boolean,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.email,
    p.department,
    p.phone,
    p.is_active,
    (
      select max(al.created_at)
      from public.activity_logs al
      where al.company_id = p.company_id
        and al.user_id = p.id
    ) as last_activity_at
  from public.profiles p
  where public.is_company_member()
    and p.company_id = public.get_current_company_id()
    and p.is_active = true
    and (
      _search is null
      or btrim(_search) = ''
      or p.full_name ilike ('%' || btrim(_search) || '%')
      or coalesce(p.email, '') ilike ('%' || btrim(_search) || '%')
      or coalesce(p.department, '') ilike ('%' || btrim(_search) || '%')
      or coalesce(p.phone, '') ilike ('%' || btrim(_search) || '%')
    )
  order by p.full_name asc;
$$;

revoke execute on function public.list_internal_chat_users(text) from anon, public;
grant execute on function public.list_internal_chat_users(text) to authenticated;
