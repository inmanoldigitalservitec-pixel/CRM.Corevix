-- The live deal_stages table intentionally has no is_won/is_lost columns.
-- Pipeline terminal stages are identified by their names in the CRM client.
-- Keep this trigger's default stages aligned with that schema and behavior.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Default behavior: create a new company for this user.
  INSERT INTO public.companies (company_name, email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'), NEW.email)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (user_id, full_name, company_id, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), new_company_id, NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');

  INSERT INTO public.deal_stages (company_id, name, display_order, color) VALUES
    (new_company_id, 'New Opportunity', 0, '#6366F1'),
    (new_company_id, 'Discovery', 1, '#8B5CF6'),
    (new_company_id, 'Proposal Sent', 2, '#3B82F6'),
    (new_company_id, 'Negotiation', 3, '#F59E0B'),
    (new_company_id, 'Won', 4, '#10B981'),
    (new_company_id, 'Lost', 5, '#EF4444');

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
$function$;;
