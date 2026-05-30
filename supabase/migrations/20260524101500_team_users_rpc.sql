-- Team & Users: RPCs for listing members and secure actions.
-- Non-destructive: adds columns and functions only.

-- 1) Extend profiles to store email (so frontend can show it without querying auth.users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill for existing rows (migration runs with elevated privileges).
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.user_id
  AND (p.email IS NULL OR p.email = '');

-- 2) Ensure handle_new_user writes profiles.email (invites + normal signup)
--    (defined in previous migrations; we replace to set email field).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_company_id uuid;
  invite_token text;
  invite_company_id uuid;
  invite_role public.app_role;
  invite_id uuid;
BEGIN
  invite_token := NULLIF(NEW.raw_user_meta_data->>'invitation_token', '');

  IF invite_token IS NOT NULL THEN
    SELECT i.id, i.company_id, i.role
      INTO invite_id, invite_company_id, invite_role
    FROM public.invitations i
    WHERE i.token = invite_token
      AND lower(i.email) = lower(NEW.email)
      AND i.status = 'pending'
      AND i.expires_at > now()
    LIMIT 1;

    IF invite_id IS NOT NULL THEN
      INSERT INTO public.profiles (user_id, full_name, company_id, email)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), invite_company_id, NEW.email);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, invite_role);

      UPDATE public.invitations
      SET status = 'accepted',
          accepted_at = now(),
          accepted_user_id = NEW.id,
          updated_at = now()
      WHERE id = invite_id;

      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.companies (company_name, email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'), NEW.email)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (user_id, full_name, company_id, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), new_company_id, NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');

  INSERT INTO public.deal_stages (company_id, name, display_order, color, is_won, is_lost) VALUES
    (new_company_id, 'New Opportunity', 0, '#6366F1', false, false),
    (new_company_id, 'Discovery', 1, '#8B5CF6', false, false),
    (new_company_id, 'Proposal Sent', 2, '#3B82F6', false, false),
    (new_company_id, 'Negotiation', 3, '#F59E0B', false, false),
    (new_company_id, 'Won', 4, '#10B981', true, false),
    (new_company_id, 'Lost', 5, '#EF4444', false, true);

  INSERT INTO public.permissions (company_id, role, module, can_view, can_create, can_edit, can_delete, can_assign)
  SELECT new_company_id, r.role, m.module,
    CASE WHEN r.role IN ('super_admin', 'admin') THEN true
         WHEN r.role = 'manager' THEN true
         WHEN r.role = 'sales_agent' AND m.module IN ('leads','clients','deals','tasks','proposals','invoices','whatsapp','email') THEN true
         WHEN r.role = 'viewer' THEN true
         ELSE false END,
    CASE WHEN r.role IN ('super_admin', 'admin') THEN true
         WHEN r.role = 'manager' THEN true
         WHEN r.role = 'sales_agent' AND m.module IN ('leads','clients','deals','tasks','proposals','invoices') THEN true
         ELSE false END,
    CASE WHEN r.role IN ('super_admin', 'admin') THEN true
         WHEN r.role = 'manager' THEN true
         WHEN r.role = 'sales_agent' AND m.module IN ('leads','clients','deals','tasks','proposals','invoices') THEN true
         ELSE false END,
    CASE WHEN r.role IN ('super_admin', 'admin') THEN true
         WHEN r.role = 'manager' THEN true
         ELSE false END,
    CASE WHEN r.role IN ('super_admin', 'admin', 'manager') THEN true
         ELSE false END
  FROM (VALUES ('super_admin'::public.app_role),('admin'::public.app_role),('manager'::public.app_role),('sales_agent'::public.app_role),('viewer'::public.app_role)) AS r(role)
  CROSS JOIN (VALUES ('leads'),('clients'),('deals'),('tasks'),('projects'),('proposals'),('invoices'),('whatsapp'),('email'),('automations'),('settings'),('team'),('reports')) AS m(module);

  RETURN NEW;
END;
$$;

-- 3) Team RPC: list members for current company with metrics
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

REVOKE EXECUTE ON FUNCTION public.get_company_team_members(text, public.app_role, boolean, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_company_team_members(text, public.app_role, boolean, text) TO authenticated;

-- 4) Team RPC: activity for a team member (by profile_id)
CREATE OR REPLACE FUNCTION public.get_team_member_activity(
  _profile_id uuid,
  _limit integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  detail text,
  created_at timestamptz
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
  SELECT al.id, al.action, al.entity_type, al.entity_id, al.detail, al.created_at
  FROM public.activity_logs al
  CROSS JOIN me
  JOIN public.profiles p ON p.id = _profile_id
  WHERE me.can_view = true
    AND p.company_id = me.company_id
    AND al.company_id = me.company_id
    AND al.user_id = _profile_id
  ORDER BY al.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.get_team_member_activity(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_team_member_activity(uuid, integer) TO authenticated;

-- 5) Team RPC: secure role change with "last admin" protection
CREATE OR REPLACE FUNCTION public.update_team_member_role(
  _target_user_id uuid,
  _new_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  target_company uuid;
  remaining_admins int;
BEGIN
  IF NOT public.is_company_member() OR NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  cid := public.get_current_company_id();
  SELECT company_id INTO target_company FROM public.profiles WHERE user_id = _target_user_id LIMIT 1;
  IF target_company IS NULL OR target_company <> cid THEN
    RAISE EXCEPTION 'target not in company';
  END IF;

  -- Prevent demoting the last admin/super_admin in the company.
  IF _new_role NOT IN ('super_admin','admin') THEN
    SELECT count(*) INTO remaining_admins
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE p.company_id = cid
      AND p.is_active = true
      AND ur.role IN ('super_admin','admin');

    IF remaining_admins <= 1 AND _target_user_id = auth.uid() THEN
      RAISE EXCEPTION 'cannot demote last admin';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_team_member_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_team_member_role(uuid, public.app_role) TO authenticated;

-- 6) Team RPC: secure toggle active with "last admin" protection
CREATE OR REPLACE FUNCTION public.toggle_team_member_status(
  _target_user_id uuid,
  _active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  target_company uuid;
  target_role public.app_role;
  remaining_admins int;
BEGIN
  IF NOT public.is_company_member() OR NOT public.can_manage_users() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  cid := public.get_current_company_id();
  SELECT company_id INTO target_company FROM public.profiles WHERE user_id = _target_user_id LIMIT 1;
  IF target_company IS NULL OR target_company <> cid THEN
    RAISE EXCEPTION 'target not in company';
  END IF;

  SELECT role INTO target_role FROM public.user_roles WHERE user_id = _target_user_id ORDER BY role LIMIT 1;
  IF target_role IN ('super_admin','admin') AND _active = false THEN
    SELECT count(*) INTO remaining_admins
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE p.company_id = cid
      AND p.is_active = true
      AND ur.role IN ('super_admin','admin');

    IF remaining_admins <= 1 THEN
      RAISE EXCEPTION 'cannot deactivate last admin';
    END IF;
  END IF;

  UPDATE public.profiles
  SET is_active = _active
  WHERE user_id = _target_user_id
    AND company_id = cid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_team_member_status(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.toggle_team_member_status(uuid, boolean) TO authenticated;

