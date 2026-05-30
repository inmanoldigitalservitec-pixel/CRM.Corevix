-- Fix: undo mixed-ID assumptions for assignment columns.
-- Confirmed current rule in production:
-- - leads.assigned_to = auth.users.id
-- - deals.assigned_to = auth.users.id
-- Other columns may legitimately use profiles.id (e.g. clients.account_manager, projects.manager, tasks.* in the UI).
-- This migration only adjusts RLS + the team RPC to avoid comparing leads/deals assigned_to to profiles.id.

-- -----------------------------------------------------------------------------
-- 1) RLS policy fixes: leads / deals (NO backfill)
-- -----------------------------------------------------------------------------

-- Leads
DROP POLICY IF EXISTS leads_select ON public.leads;
DROP POLICY IF EXISTS leads_insert ON public.leads;
DROP POLICY IF EXISTS leads_update ON public.leads;
DROP POLICY IF EXISTS leads_delete ON public.leads;

CREATE POLICY leads_select
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

CREATE POLICY leads_insert
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

CREATE POLICY leads_update
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

CREATE POLICY leads_delete
ON public.leads
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);

-- Deals
DROP POLICY IF EXISTS deals_select ON public.deals;
DROP POLICY IF EXISTS deals_insert ON public.deals;
DROP POLICY IF EXISTS deals_update ON public.deals;
DROP POLICY IF EXISTS deals_delete ON public.deals;

CREATE POLICY deals_select
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

CREATE POLICY deals_insert
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

CREATE POLICY deals_update
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

CREATE POLICY deals_delete
ON public.deals
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);

-- -----------------------------------------------------------------------------
-- 2) RPC fix: assigned counts should use auth.users.id for leads/deals (restore original)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_company_team_members(
  _search text DEFAULT NULL,
  _role public.app_role DEFAULT NULL,
  _is_active boolean DEFAULT NULL,
  _department text DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  full_name text,
  email text,
  department text,
  is_active boolean,
  role public.app_role,
  leads_assigned bigint,
  tasks_assigned bigint,
  deals_assigned bigint,
  last_activity_at timestamptz,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      public.get_current_company_id() AS company_id,
      public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[]) AS can_view
  )
  SELECT
    p.id AS profile_id,
    p.user_id,
    p.full_name,
    p.email,
    p.department,
    p.is_active,
    COALESCE(ur.role, 'viewer'::public.app_role) AS role,
    (SELECT count(*) FROM public.leads l WHERE l.company_id = p.company_id AND l.assigned_to = p.user_id) AS leads_assigned,
    (SELECT count(*) FROM public.tasks t WHERE t.company_id = p.company_id AND t.assigned_to = p.user_id) AS tasks_assigned,
    (SELECT count(*) FROM public.deals d WHERE d.company_id = p.company_id AND d.assigned_to = p.user_id) AS deals_assigned,
    (SELECT max(al.created_at) FROM public.activity_logs al WHERE al.company_id = p.company_id AND al.user_id = p.id) AS last_activity_at,
    p.created_at AS joined_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  CROSS JOIN me
  WHERE me.can_view = true
    AND p.company_id = me.company_id
    AND (_role IS NULL OR ur.role = _role)
    AND (_is_active IS NULL OR p.is_active = _is_active)
    AND (_department IS NULL OR p.department = _department)
    AND (
      _search IS NULL
      OR _search = ''
      OR (p.full_name ILIKE ('%' || _search || '%'))
      OR (COALESCE(p.email, '') ILIKE ('%' || _search || '%'))
      OR (COALESCE(p.department, '') ILIKE ('%' || _search || '%'))
    )
  ORDER BY p.full_name ASC;
$$;
