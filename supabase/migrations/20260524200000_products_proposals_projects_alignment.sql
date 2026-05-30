-- Phase 17A: Align repo migrations with the schema already expected by the UI.
-- Safe / idempotent migration:
-- - Never drops or recreates existing tables
-- - Uses IF NOT EXISTS for tables/columns/indexes
-- - Adds foreign keys as NOT VALID (no full scan), only when missing
-- - Enables RLS and creates policies only if missing

-- -----------------------------------------------------------------------------
-- Helpers (inline patterns)
-- -----------------------------------------------------------------------------
-- Company scope expression (avoids depending on get_user_company_id()).
-- NOTE: profiles is RLS-protected but allows SELECT by company; this expression is
-- used consistently across new tables.
--   (company_id = (select p.company_id from public.profiles p where p.user_id = auth.uid() limit 1))

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  category text,
  type text NOT NULL DEFAULT 'service',
  description text,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_type text NOT NULL DEFAULT 'one_time',
  duration_days integer,
  deliverables text,
  keywords text[] DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure all expected columns exist even if the table was created manually earlier.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS base_price numeric(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS billing_type text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS duration_days integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deliverables text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active boolean;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(company_id, category);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(company_id, name);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies for products (read for company members; write for admin/manager/super_admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'view products'
  ) THEN
    CREATE POLICY "view products"
      ON public.products
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'create products'
  ) THEN
    CREATE POLICY "create products"
      ON public.products
      FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'update products'
  ) THEN
    CREATE POLICY "update products"
      ON public.products
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'delete products'
  ) THEN
    CREATE POLICY "delete products"
      ON public.products
      FOR DELETE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;
END $$;

-- updated_at trigger (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_products_updated_at') THEN
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Lead Products (lead interest)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  interest_level text NOT NULL DEFAULT 'interested',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_products_company_id ON public.lead_products(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_products_lead_id ON public.lead_products(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_products_product_id ON public.lead_products(company_id, product_id);

ALTER TABLE public.lead_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_products' AND policyname='view lead_products') THEN
    CREATE POLICY "view lead_products"
      ON public.lead_products
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_products' AND policyname='create lead_products') THEN
    CREATE POLICY "create lead_products"
      ON public.lead_products
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_products' AND policyname='update lead_products') THEN
    CREATE POLICY "update lead_products"
      ON public.lead_products
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_products' AND policyname='delete lead_products') THEN
    CREATE POLICY "delete lead_products"
      ON public.lead_products
      FOR DELETE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_lead_products_updated_at') THEN
    CREATE TRIGGER update_lead_products_updated_at
      BEFORE UPDATE ON public.lead_products
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Deal Products (products linked to a deal/opportunity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2),
  total_price numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_products_company_id ON public.deal_products(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_products_deal_id ON public.deal_products(company_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_products_product_id ON public.deal_products(company_id, product_id);

ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deal_products' AND policyname='view deal_products') THEN
    CREATE POLICY "view deal_products"
      ON public.deal_products
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deal_products' AND policyname='create deal_products') THEN
    CREATE POLICY "create deal_products"
      ON public.deal_products
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deal_products' AND policyname='update deal_products') THEN
    CREATE POLICY "update deal_products"
      ON public.deal_products
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='deal_products' AND policyname='delete deal_products') THEN
    CREATE POLICY "delete deal_products"
      ON public.deal_products
      FOR DELETE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_deal_products_updated_at') THEN
    CREATE TRIGGER update_deal_products_updated_at
      BEFORE UPDATE ON public.deal_products
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Client Products (purchased/active products for a client)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  price numeric(12,2),
  billing_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_products_company_id ON public.client_products(company_id);
CREATE INDEX IF NOT EXISTS idx_client_products_client_id ON public.client_products(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_products_product_id ON public.client_products(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_client_products_deal_id ON public.client_products(company_id, deal_id);

ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_products' AND policyname='view client_products') THEN
    CREATE POLICY "view client_products"
      ON public.client_products
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_products' AND policyname='create client_products') THEN
    CREATE POLICY "create client_products"
      ON public.client_products
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_products' AND policyname='update client_products') THEN
    CREATE POLICY "update client_products"
      ON public.client_products
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_products' AND policyname='delete client_products') THEN
    CREATE POLICY "delete client_products"
      ON public.client_products
      FOR DELETE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_products_updated_at') THEN
    CREATE TRIGGER update_client_products_updated_at
      BEFORE UPDATE ON public.client_products
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Proposal Sends (audit trail of proposal delivery)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposal_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  whatsapp_conversation_id uuid,
  sent_to_phone text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_sends_company_id ON public.proposal_sends(company_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_proposal_id ON public.proposal_sends(company_id, proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_product_id ON public.proposal_sends(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_lead_id ON public.proposal_sends(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_client_id ON public.proposal_sends(company_id, client_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_deal_id ON public.proposal_sends(company_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_sends_whatsapp_conversation_id ON public.proposal_sends(company_id, whatsapp_conversation_id);

ALTER TABLE public.proposal_sends ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposal_sends' AND policyname='view proposal_sends') THEN
    CREATE POLICY "view proposal_sends"
      ON public.proposal_sends
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposal_sends' AND policyname='create proposal_sends') THEN
    CREATE POLICY "create proposal_sends"
      ON public.proposal_sends
      FOR INSERT
      TO authenticated
      WITH CHECK (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposal_sends' AND policyname='update proposal_sends') THEN
    CREATE POLICY "update proposal_sends"
      ON public.proposal_sends
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='proposal_sends' AND policyname='delete proposal_sends') THEN
    CREATE POLICY "delete proposal_sends"
      ON public.proposal_sends
      FOR DELETE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposal_sends_updated_at') THEN
    CREATE TRIGGER update_proposal_sends_updated_at
      BEFORE UPDATE ON public.proposal_sends
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Extend proposals (columns expected by UI)
-- -----------------------------------------------------------------------------
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS deal_id uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS whatsapp_conversation_id uuid;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add FKs (NOT VALID) only when missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_product_id_fkey') THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_lead_id_fkey') THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_deal_id_fkey') THEN
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_product_id ON public.proposals(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals(company_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_deal_id ON public.proposals(company_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_proposals_whatsapp_conversation_id ON public.proposals(company_id, whatsapp_conversation_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(company_id, status);

-- -----------------------------------------------------------------------------
-- Extend projects (columns expected by UI/workflow)
-- -----------------------------------------------------------------------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS product_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deal_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_product_id_fkey') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_deal_id_fkey') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_lead_id_fkey') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_assigned_to_fkey') THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_product_id ON public.projects(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_projects_deal_id ON public.projects(company_id, deal_id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON public.projects(company_id, lead_id);

-- -----------------------------------------------------------------------------
-- Extend tasks (deal linkage)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS related_deal_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_related_deal_id_fkey') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_related_deal_id_fkey FOREIGN KEY (related_deal_id) REFERENCES public.deals(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_related_deal_id ON public.tasks(company_id, related_deal_id);
