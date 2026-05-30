-- FASE 3A: WhatsApp sensitive credentials storage (DB only)

-- 1) Add meta_app_id to company_whatsapp_settings
ALTER TABLE public.company_whatsapp_settings
  ADD COLUMN IF NOT EXISTS meta_app_id text;

-- 2) Create write-only secrets table (no SELECT policy)
CREATE TABLE IF NOT EXISTS public.company_whatsapp_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token text,
  app_secret text,
  access_token_last4 text,
  app_secret_last4 text,
  access_token_configured_at timestamptz,
  app_secret_configured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_whatsapp_secrets ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: No SELECT policy. With RLS enabled, this table is not readable from the frontend.

CREATE POLICY "insert company_whatsapp_secrets"
  ON public.company_whatsapp_secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "update company_whatsapp_secrets"
  ON public.company_whatsapp_secrets
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

-- No DELETE policy in this phase.

CREATE TRIGGER update_company_whatsapp_secrets_updated_at
  BEFORE UPDATE ON public.company_whatsapp_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

