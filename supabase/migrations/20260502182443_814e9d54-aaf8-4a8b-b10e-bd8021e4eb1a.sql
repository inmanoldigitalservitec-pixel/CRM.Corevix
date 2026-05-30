
-- =====================================================
-- 1. NEW TABLES
-- =====================================================

-- Contacts (individual persons linked to clients)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  position text,
  department text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view contacts" ON public.contacts FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update contacts" ON public.contacts FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete contacts" ON public.contacts FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deal stages (custom pipeline)
CREATE TABLE public.deal_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3B82F6',
  is_won boolean NOT NULL DEFAULT false,
  is_lost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view deal_stages" ON public.deal_stages FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "manage deal_stages" ON public.deal_stages FOR ALL TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));
CREATE TRIGGER update_deal_stages_updated_at BEFORE UPDATE ON public.deal_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Proposal items (line items)
CREATE TABLE public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view proposal_items" ON public.proposal_items FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create proposal_items" ON public.proposal_items FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update proposal_items" ON public.proposal_items FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete proposal_items" ON public.proposal_items FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Invoice items (line items)
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create invoice_items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update invoice_items" ON public.invoice_items FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete invoice_items" ON public.invoice_items FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text DEFAULT 'bank_transfer',
  reference text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view payments" ON public.payments FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update payments" ON public.payments FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete payments" ON public.payments FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));

-- Email accounts
CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gmail',
  email_address text NOT NULL,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own email_accounts" ON public.email_accounts FOR SELECT TO authenticated USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "manage own email_accounts" ON public.email_accounts FOR ALL TO authenticated USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1));
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON public.email_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email conversations
CREATE TABLE public.email_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '(No Subject)',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  related_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view email_conversations" ON public.email_conversations FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create email_conversations" ON public.email_conversations FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update email_conversations" ON public.email_conversations FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete email_conversations" ON public.email_conversations FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));
CREATE TRIGGER update_email_conversations_updated_at BEFORE UPDATE ON public.email_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email messages
CREATE TABLE public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.email_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'inbound',
  from_address text NOT NULL,
  to_addresses text[] DEFAULT '{}',
  cc_addresses text[] DEFAULT '{}',
  bcc_addresses text[] DEFAULT '{}',
  subject text,
  body_text text,
  body_html text,
  is_read boolean NOT NULL DEFAULT false,
  is_internal_note boolean NOT NULL DEFAULT false,
  message_id_header text,
  in_reply_to text,
  sender_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view email_messages" ON public.email_messages FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create email_messages" ON public.email_messages FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update email_messages" ON public.email_messages FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Email attachments
CREATE TABLE public.email_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text,
  size_bytes bigint,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view email_attachments" ON public.email_attachments FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create email_attachments" ON public.email_attachments FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Automation rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  conditions jsonb DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT false,
  last_triggered_at timestamptz,
  trigger_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view automation_rules" ON public.automation_rules FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create automation_rules" ON public.automation_rules FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));
CREATE POLICY "update automation_rules" ON public.automation_rules FOR UPDATE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));
CREATE POLICY "delete automation_rules" ON public.automation_rules FOR DELETE TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tags
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  entity_type text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name, entity_type)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view tags" ON public.tags FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "manage tags" ON public.tags FOR ALL TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Settings (key-value per company)
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view settings" ON public.settings FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "manage settings" ON public.settings FOR ALL TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permissions (granular per role)
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_assign boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, role, module)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view permissions" ON public.permissions FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "manage permissions" ON public.permissions FOR ALL TO authenticated USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. ADD FOREIGN KEYS TO EXISTING TABLES
-- =====================================================

-- Leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- Clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD CONSTRAINT fk_clients_account_manager FOREIGN KEY (account_manager) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- Deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.deals ADD CONSTRAINT fk_deals_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.deals ADD CONSTRAINT fk_deals_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.deals ADD CONSTRAINT fk_deals_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- Tasks
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (related_project_id) REFERENCES public.projects(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_lead FOREIGN KEY (related_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.tasks ADD CONSTRAINT fk_tasks_client FOREIGN KEY (related_client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;

-- Projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.projects ADD CONSTRAINT fk_projects_manager FOREIGN KEY (manager) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- Proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.proposals ADD CONSTRAINT fk_proposals_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.proposals ADD CONSTRAINT fk_proposals_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- Invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;

-- WhatsApp conversations
ALTER TABLE public.whatsapp_conversations ADD CONSTRAINT fk_wa_conv_contact FOREIGN KEY (contact_id) REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.whatsapp_conversations ADD CONSTRAINT fk_wa_conv_assigned FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- WhatsApp messages
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT fk_wa_msg_conv FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT VALID;

-- WhatsApp contacts
ALTER TABLE public.whatsapp_contacts ADD CONSTRAINT fk_wa_contact_lead FOREIGN KEY (linked_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.whatsapp_contacts ADD CONSTRAINT fk_wa_contact_client FOREIGN KEY (linked_client_id) REFERENCES public.clients(id) ON DELETE SET NULL NOT VALID;

-- Activity logs
ALTER TABLE public.activity_logs ADD CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- Notifications
ALTER TABLE public.notifications ADD CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS module text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS record_id uuid;

-- Companies insert policy (needed for signup flow)
CREATE POLICY "Users can create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(company_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_company ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(company_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_company ON public.proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client ON public.contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON public.activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_company ON public.whatsapp_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conv ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_conversations_company ON public.email_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_conv ON public.email_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- =====================================================
-- 4. TRIGGER FOR NEW USER: auto-create company if none
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Create a default company for the new user
  INSERT INTO public.companies (company_name, email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'), NEW.email)
  RETURNING id INTO new_company_id;

  -- Create profile linked to company
  INSERT INTO public.profiles (user_id, full_name, company_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), new_company_id);

  -- Assign super_admin role to first user
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');

  -- Create default deal stages
  INSERT INTO public.deal_stages (company_id, name, display_order, color, is_won, is_lost) VALUES
    (new_company_id, 'New Opportunity', 0, '#6366F1', false, false),
    (new_company_id, 'Discovery', 1, '#8B5CF6', false, false),
    (new_company_id, 'Proposal Sent', 2, '#3B82F6', false, false),
    (new_company_id, 'Negotiation', 3, '#F59E0B', false, false),
    (new_company_id, 'Won', 4, '#10B981', true, false),
    (new_company_id, 'Lost', 5, '#EF4444', false, true);

  -- Create default permissions for all roles
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
  FROM (VALUES ('super_admin'::app_role),('admin'::app_role),('manager'::app_role),('sales_agent'::app_role),('viewer'::app_role)) AS r(role)
  CROSS JOIN (VALUES ('leads'),('clients'),('deals'),('tasks'),('projects'),('proposals'),('invoices'),('whatsapp'),('email'),('automations'),('settings'),('team'),('reports')) AS m(module);

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
