-- Phase 3: Invitations (token-based) to join an existing company.
-- No email sending required; the admin can share the token/link manually.

-- =========================
-- Types
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
  END IF;
END$$;

-- =========================
-- Table
-- =========================
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token text NOT NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, token)
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_status ON public.invitations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS
-- =========================
DROP POLICY IF EXISTS "view invitations" ON public.invitations;
DROP POLICY IF EXISTS "manage invitations" ON public.invitations;

CREATE POLICY "view invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND public.can_manage_users()
  AND company_id = public.get_current_company_id()
);

CREATE POLICY "manage invitations"
ON public.invitations
FOR ALL
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

DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Signup trigger enhancement: accept invitation token if provided
-- =========================
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
      INSERT INTO public.profiles (user_id, full_name, company_id)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), invite_company_id);

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

  -- Default behavior: create a new company for this user.
  INSERT INTO public.companies (company_name, email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'), NEW.email)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (user_id, full_name, company_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), new_company_id);

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

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
