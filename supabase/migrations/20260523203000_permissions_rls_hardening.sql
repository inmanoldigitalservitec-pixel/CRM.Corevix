-- Phase 1: Harden multi-tenant RLS + role enforcement (viewer read-only, sales_agent assigned-only)

-- =====================================================
-- Helper functions (idempotent, SECURITY DEFINER)
-- =====================================================
-- NOTE: `auth.uid()` is the auth.users.id (user UUID), while `profiles.id` is a separate UUID.
-- Therefore we always join via `profiles.user_id = auth.uid()`.

-- =========================
-- Helpers
-- =========================

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
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

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
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['super_admin','admin']::public.app_role[])
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_company_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_current_profile_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_company_member() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_company_member() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_manage_users() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_manage_users() TO authenticated;

-- =========================
-- Profiles / roles tightening
-- =========================

DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;
CREATE POLICY "Users can view company profiles (active members only)"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
);

DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;
CREATE POLICY "Admins can manage company profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND public.can_manage_users()
  AND company_id = public.get_current_company_id()
)
WITH CHECK (
  public.is_company_member()
  AND public.can_manage_users()
  AND company_id = public.get_current_company_id()
);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles (active members only)"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_company_member() AND public.can_manage_users())
WITH CHECK (public.is_company_member() AND public.can_manage_users());

-- =========================
-- Core CRM tables
-- =========================

-- Leads
DROP POLICY IF EXISTS "view leads" ON public.leads;
DROP POLICY IF EXISTS "create leads" ON public.leads;
DROP POLICY IF EXISTS "update leads" ON public.leads;
DROP POLICY IF EXISTS "delete leads" ON public.leads;

CREATE POLICY "leads_select"
ON public.leads
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager','viewer']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "leads_insert"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "leads_update"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "leads_delete"
ON public.leads
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);

-- Clients
DROP POLICY IF EXISTS "view clients" ON public.clients;
DROP POLICY IF EXISTS "create clients" ON public.clients;
DROP POLICY IF EXISTS "update clients" ON public.clients;
DROP POLICY IF EXISTS "delete clients" ON public.clients;

CREATE POLICY "clients_select"
ON public.clients
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager','viewer']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND account_manager = public.get_current_profile_id()
    )
  )
);

CREATE POLICY "clients_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND account_manager = public.get_current_profile_id()
    )
  )
);

CREATE POLICY "clients_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND account_manager = public.get_current_profile_id()
    )
  )
)
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND account_manager = public.get_current_profile_id()
    )
  )
);

CREATE POLICY "clients_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);

-- Deals
DROP POLICY IF EXISTS "view deals" ON public.deals;
DROP POLICY IF EXISTS "create deals" ON public.deals;
DROP POLICY IF EXISTS "update deals" ON public.deals;
DROP POLICY IF EXISTS "delete deals" ON public.deals;

CREATE POLICY "deals_select"
ON public.deals
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager','viewer']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "deals_insert"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "deals_update"
ON public.deals
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "deals_delete"
ON public.deals
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);

-- Tasks
DROP POLICY IF EXISTS "view tasks" ON public.tasks;
DROP POLICY IF EXISTS "create tasks" ON public.tasks;
DROP POLICY IF EXISTS "update tasks" ON public.tasks;
DROP POLICY IF EXISTS "delete tasks" ON public.tasks;

CREATE POLICY "tasks_select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager','viewer']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "tasks_insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "tasks_update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "tasks_delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);

-- Projects
DROP POLICY IF EXISTS "view projects" ON public.projects;
DROP POLICY IF EXISTS "create projects" ON public.projects;
DROP POLICY IF EXISTS "update projects" ON public.projects;
DROP POLICY IF EXISTS "delete projects" ON public.projects;

CREATE POLICY "projects_select"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager','viewer']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND manager = auth.uid()
    )
  )
);

CREATE POLICY "projects_insert"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND manager = auth.uid()
    )
  )
);

CREATE POLICY "projects_update"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND manager = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'sales_agent'::public.app_role)
      AND manager = auth.uid()
    )
  )
);

CREATE POLICY "projects_delete"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);
