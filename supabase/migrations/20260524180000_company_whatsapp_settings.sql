-- company_whatsapp_settings: per-company WhatsApp Cloud API configuration (non-sensitive subset)

CREATE TABLE IF NOT EXISTS public.company_whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'meta',
  phone_number_id text,
  whatsapp_business_account_id text,
  business_phone text,
  webhook_url text,
  bot_api_url text,
  verify_token text,
  is_connected boolean NOT NULL DEFAULT false,
  connection_status text NOT NULL DEFAULT 'not_configured',
  last_verified_at timestamptz,
  last_error text,
  last_event_at timestamptz,
  meta_graph_version text DEFAULT 'v22.0',
  subscribed_fields jsonb DEFAULT '["messages"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Same pattern used across the project: company scoping via get_user_company_id(auth.uid())
CREATE POLICY "view company_whatsapp_settings"
  ON public.company_whatsapp_settings
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Restrict management to admin/manager/super_admin
CREATE POLICY "insert company_whatsapp_settings"
  ON public.company_whatsapp_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "update company_whatsapp_settings"
  ON public.company_whatsapp_settings
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "delete company_whatsapp_settings"
  ON public.company_whatsapp_settings
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE TRIGGER update_company_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.company_whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

