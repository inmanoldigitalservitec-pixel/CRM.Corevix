-- Account status helper for the CRM shell.
-- Lets the authenticated user read only their own profile state, including inactive status,
-- without opening company CRM data.

CREATE OR REPLACE FUNCTION public.get_current_account_profile()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  company_id uuid,
  avatar_url text,
  phone text,
  department text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.user_id,
    p.full_name,
    p.company_id,
    p.avatar_url,
    p.phone,
    p.department,
    p.is_active
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_account_profile() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_current_account_profile() TO authenticated;
