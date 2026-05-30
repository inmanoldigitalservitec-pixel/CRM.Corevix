-- Fix: ensure role/company helper functions exist before RLS hardening migration runs.
-- Non-destructive and idempotent (CREATE OR REPLACE).

-- Helper: current user's company (auth.uid() = auth.users.id; profiles.user_id references auth.users.id)
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper: checks if current user belongs to a company (and is active)
CREATE OR REPLACE FUNCTION public.is_company_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.company_id IS NOT NULL
      AND p.is_active = true
  );
$$;

-- Helper: checks one role for a user (signature must be: has_role(uuid, public.app_role))
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;

-- Helper: checks multiple roles for a user (signature must be: has_any_role(uuid, public.app_role[]))
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = ANY(_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_company_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_company_member() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_company_member() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

