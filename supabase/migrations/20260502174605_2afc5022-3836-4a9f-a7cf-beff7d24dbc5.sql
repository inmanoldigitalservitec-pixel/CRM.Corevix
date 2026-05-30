
-- Create role enum (idempotent; some environments may already have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'sales_agent', 'viewer');
  END IF;
END $$;

-- Create status enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'lead_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.lead_status AS ENUM ('New', 'Contacted', 'Qualified', 'Proposal Needed', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Not Interested');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'client_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.client_status AS ENUM ('Active', 'Inactive', 'VIP', 'Past Client', 'Pending');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'deal_stage'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.deal_stage AS ENUM ('New Opportunity', 'Discovery', 'Qualified', 'Proposal Preparation', 'Proposal Sent', 'Negotiation', 'Contract Sent', 'Won', 'Lost');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'task_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.task_status AS ENUM ('To Do', 'In Progress', 'Waiting', 'Completed', 'Cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'task_priority'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'project_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.project_status AS ENUM ('Not Started', 'In Progress', 'Waiting on Client', 'On Hold', 'Completed', 'Cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'proposal_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.proposal_status AS ENUM ('Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'invoice_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled');
  END IF;
END $$;

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  domain TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Dominican Republic',
  tax_id TEXT,
  logo_url TEXT,
  website TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE (user_id, role)
);

-- Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles)) $$;

-- Leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  email TEXT, phone TEXT, whatsapp TEXT, company_name TEXT,
  source TEXT NOT NULL DEFAULT 'Website',
  status lead_status NOT NULL DEFAULT 'New',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_value NUMERIC(12,2) DEFAULT 0,
  interest_level TEXT DEFAULT 'Medium', service_interested TEXT,
  tags TEXT[] DEFAULT '{}', notes TEXT, next_follow_up DATE, last_contacted TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL, contact_person TEXT, email TEXT, phone TEXT, whatsapp TEXT,
  address TEXT, city TEXT, country TEXT, tax_id TEXT, website TEXT, industry TEXT,
  status client_status NOT NULL DEFAULT 'Active',
  account_manager UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects (before tasks since tasks references projects)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  manager UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE, due_date DATE,
  status project_status NOT NULL DEFAULT 'Not Started',
  budget NUMERIC(12,2) DEFAULT 0, description TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'To Do',
  due_date DATE, reminder_date DATE,
  related_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deals
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stage deal_stage NOT NULL DEFAULT 'New Opportunity',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposals
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL, title TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status proposal_status NOT NULL DEFAULT 'Draft',
  valid_until DATE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0, discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, entity_id UUID,
  action TEXT NOT NULL, detail TEXT, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, message TEXT, type TEXT DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false, link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_company ON public.leads(company_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_deals_company ON public.deals(company_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_tasks_company ON public.tasks(company_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_projects_company ON public.projects(company_id);
CREATE INDEX idx_proposals_company ON public.proposals(company_id);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_activity_logs_company ON public.activity_logs(company_id);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX idx_profiles_company ON public.profiles(company_id);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their company" ON public.companies FOR SELECT TO authenticated USING (id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins can update their company" ON public.companies FOR UPDATE TO authenticated USING (id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

CREATE POLICY "Users can view company profiles" ON public.profiles FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['super_admin', 'admin']::app_role[]));

-- Company-scoped tables: SELECT, INSERT, UPDATE for all members; DELETE for admins/managers
CREATE POLICY "view leads" ON public.leads FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update leads" ON public.leads FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete leads" ON public.leads FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view clients" ON public.clients FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update clients" ON public.clients FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete clients" ON public.clients FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view deals" ON public.deals FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update deals" ON public.deals FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete deals" ON public.deals FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view tasks" ON public.tasks FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update tasks" ON public.tasks FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete tasks" ON public.tasks FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view projects" ON public.projects FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update projects" ON public.projects FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete projects" ON public.projects FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view proposals" ON public.proposals FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create proposals" ON public.proposals FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update proposals" ON public.proposals FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete proposals" ON public.proposals FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view invoices" ON public.invoices FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "create invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "update invoices" ON public.invoices FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "delete invoices" ON public.invoices FOR DELETE TO authenticated USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::app_role[]));

CREATE POLICY "view activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
