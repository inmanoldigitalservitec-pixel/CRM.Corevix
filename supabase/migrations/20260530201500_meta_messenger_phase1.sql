-- Phase 1: Meta foundation for Messenger now, Instagram later.
-- Safe by default:
-- - Messenger/Instagram accounts are company-scoped.
-- - Access tokens are stored in a write-only secret table.
-- - No WhatsApp tables, functions, or behaviors are changed here.

CREATE TABLE IF NOT EXISTS public.meta_account_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  access_token_last4 text,
  access_token_configured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_account_secrets ENABLE ROW LEVEL SECURITY;

-- No SELECT policy on purpose: tokens must not be readable from the frontend.
CREATE POLICY "insert meta_account_secrets"
  ON public.meta_account_secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "update meta_account_secrets"
  ON public.meta_account_secrets
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE TRIGGER update_meta_account_secrets_updated_at
  BEFORE UPDATE ON public.meta_account_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meta_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('messenger', 'instagram')),
  page_id text,
  instagram_business_account_id text,
  page_name text,
  status text NOT NULL DEFAULT 'pending',
  verify_token text,
  access_token_secret_id text,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view meta_accounts"
  ON public.meta_accounts
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "insert meta_accounts"
  ON public.meta_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "update meta_accounts"
  ON public.meta_accounts
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE POLICY "delete meta_accounts"
  ON public.meta_accounts
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE TRIGGER update_meta_accounts_updated_at
  BEFORE UPDATE ON public.meta_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_accounts_company_platform_page
  ON public.meta_accounts (company_id, platform, page_id)
  WHERE page_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_accounts_company_platform
  ON public.meta_accounts (company_id, platform);

CREATE TABLE IF NOT EXISTS public.meta_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.meta_accounts(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('messenger', 'instagram')),
  page_id text,
  external_user_id text NOT NULL,
  sender_name text,
  sender_profile_pic text,
  last_message_text text,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  linked_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  linked_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  linked_deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view meta_conversations"
  ON public.meta_conversations
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "insert meta_conversations"
  ON public.meta_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "update meta_conversations"
  ON public.meta_conversations
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "delete meta_conversations"
  ON public.meta_conversations
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE TRIGGER update_meta_conversations_updated_at
  BEFORE UPDATE ON public.meta_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_conversations_company_account_platform_external_user
  ON public.meta_conversations (company_id, account_id, platform, external_user_id);

CREATE INDEX IF NOT EXISTS idx_meta_conversations_company_last_message
  ON public.meta_conversations (company_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_meta_conversations_company_status
  ON public.meta_conversations (company_id, status);

CREATE TABLE IF NOT EXISTS public.meta_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.meta_accounts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.meta_conversations(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('messenger', 'instagram')),
  external_message_id text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL DEFAULT 'text',
  text text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view meta_messages"
  ON public.meta_messages
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "insert meta_messages"
  ON public.meta_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "update meta_messages"
  ON public.meta_messages
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()))
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_messages_company_platform_external_message
  ON public.meta_messages (company_id, platform, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_messages_conversation_created_at
  ON public.meta_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.meta_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.meta_accounts(id) ON DELETE SET NULL,
  platform text,
  event_type text,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view meta_webhook_logs"
  ON public.meta_webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role])
  );

CREATE INDEX IF NOT EXISTS idx_meta_webhook_logs_company_created_at
  ON public.meta_webhook_logs (company_id, created_at DESC);
