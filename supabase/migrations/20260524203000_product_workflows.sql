-- Phase 17B: Product workflows (execution process per product)
-- Safe / idempotent migration:
-- - Never drops or recreates existing tables
-- - Uses IF NOT EXISTS for tables/columns/indexes
-- - Enables RLS and adds policies only if missing
-- - Uses profiles.company_id lookup (no dependency on get_user_company_id())

-- -----------------------------------------------------------------------------
-- product_workflows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_workflows_company_id ON public.product_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_product_workflows_product_id ON public.product_workflows(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_workflows_is_active ON public.product_workflows(company_id, is_active);

ALTER TABLE public.product_workflows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflows' AND policyname='view product_workflows'
  ) THEN
    CREATE POLICY "view product_workflows"
      ON public.product_workflows
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflows' AND policyname='create product_workflows'
  ) THEN
    CREATE POLICY "create product_workflows"
      ON public.product_workflows
      FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflows' AND policyname='update product_workflows'
  ) THEN
    CREATE POLICY "update product_workflows"
      ON public.product_workflows
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflows' AND policyname='delete product_workflows'
  ) THEN
    CREATE POLICY "delete product_workflows"
      ON public.product_workflows
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_workflows_updated_at') THEN
    CREATE TRIGGER update_product_workflows_updated_at
      BEFORE UPDATE ON public.product_workflows
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- product_workflow_steps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.product_workflows(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  step_order integer NOT NULL DEFAULT 1,
  default_priority text NOT NULL DEFAULT 'Medium',
  default_duration_days integer NOT NULL DEFAULT 1,
  assigned_role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_workflow_steps_company_id ON public.product_workflow_steps(company_id);
CREATE INDEX IF NOT EXISTS idx_product_workflow_steps_product_id ON public.product_workflow_steps(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_workflow_steps_workflow_id ON public.product_workflow_steps(company_id, workflow_id);
CREATE INDEX IF NOT EXISTS idx_product_workflow_steps_step_order ON public.product_workflow_steps(company_id, workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_product_workflow_steps_is_active ON public.product_workflow_steps(company_id, workflow_id, is_active);

ALTER TABLE public.product_workflow_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflow_steps' AND policyname='view product_workflow_steps'
  ) THEN
    CREATE POLICY "view product_workflow_steps"
      ON public.product_workflow_steps
      FOR SELECT
      TO authenticated
      USING (company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflow_steps' AND policyname='create product_workflow_steps'
  ) THEN
    CREATE POLICY "create product_workflow_steps"
      ON public.product_workflow_steps
      FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflow_steps' AND policyname='update product_workflow_steps'
  ) THEN
    CREATE POLICY "update product_workflow_steps"
      ON public.product_workflow_steps
      FOR UPDATE
      TO authenticated
      USING (
        company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
        AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_workflow_steps' AND policyname='delete product_workflow_steps'
  ) THEN
    CREATE POLICY "delete product_workflow_steps"
      ON public.product_workflow_steps
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_product_workflow_steps_updated_at') THEN
    CREATE TRIGGER update_product_workflow_steps_updated_at
      BEFORE UPDATE ON public.product_workflow_steps
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

