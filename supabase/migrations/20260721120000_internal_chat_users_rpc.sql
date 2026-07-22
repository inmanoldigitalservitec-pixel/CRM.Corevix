-- Internal CRM chat team directory.
-- Any active company member can see active teammates for the internal chat.

create or replace function public.list_internal_chat_users(_search text default null)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  department text,
  phone text,
  is_active boolean
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
    p.is_active
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
