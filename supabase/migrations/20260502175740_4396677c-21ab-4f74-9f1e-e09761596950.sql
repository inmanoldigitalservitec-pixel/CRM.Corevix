
-- Conversation status enum
CREATE TYPE public.wa_conversation_status AS ENUM ('open', 'pending', 'resolved', 'archived');

-- Message direction enum
CREATE TYPE public.wa_message_direction AS ENUM ('inbound', 'outbound');

-- Message type enum
CREATE TYPE public.wa_message_type AS ENUM ('text', 'image', 'video', 'audio', 'document', 'template', 'location', 'contact', 'sticker', 'note');

-- Message delivery status enum
CREATE TYPE public.wa_delivery_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- ============================
-- whatsapp_contacts
-- ============================
CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  phone text NOT NULL,
  name text,
  profile_pic_url text,
  linked_lead_id uuid,
  linked_client_id uuid,
  opted_in boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, phone)
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view wa_contacts" ON public.whatsapp_contacts FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create wa_contacts" ON public.whatsapp_contacts FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update wa_contacts" ON public.whatsapp_contacts FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete wa_contacts" ON public.whatsapp_contacts FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- whatsapp_conversations
-- ============================
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  status wa_conversation_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  channel text DEFAULT 'whatsapp',
  tags text[] DEFAULT '{}'::text[],
  last_message_body text,
  last_message_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view wa_conversations" ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create wa_conversations" ON public.whatsapp_conversations FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update wa_conversations" ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "delete wa_conversations" ON public.whatsapp_conversations FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_wa_conversations_company_status ON public.whatsapp_conversations(company_id, status);
CREATE INDEX idx_wa_conversations_assigned ON public.whatsapp_conversations(assigned_to);

-- ============================
-- whatsapp_messages
-- ============================
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction wa_message_direction NOT NULL,
  type wa_message_type NOT NULL DEFAULT 'text',
  body text,
  media_url text,
  wamid text,
  status wa_delivery_status DEFAULT 'sent',
  sender_name text,
  is_internal_note boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view wa_messages" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "create wa_messages" ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "update wa_messages" ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE INDEX idx_wa_messages_conversation ON public.whatsapp_messages(conversation_id, created_at);

-- ============================
-- whatsapp_templates
-- ============================
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text DEFAULT 'MARKETING',
  header_text text,
  body_text text NOT NULL,
  footer_text text,
  buttons jsonb DEFAULT '[]'::jsonb,
  is_approved boolean NOT NULL DEFAULT false,
  meta_template_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view wa_templates" ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "manage wa_templates" ON public.whatsapp_templates FOR ALL TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role, 'manager'::app_role]));

CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- whatsapp_webhook_logs
-- ============================
CREATE TABLE public.whatsapp_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  event_type text,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view wa_webhook_logs" ON public.whatsapp_webhook_logs FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_any_role(auth.uid(), ARRAY['super_admin'::app_role, 'admin'::app_role]));
CREATE POLICY "insert wa_webhook_logs" ON public.whatsapp_webhook_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE INDEX idx_wa_webhook_logs_company ON public.whatsapp_webhook_logs(company_id, created_at DESC);

-- ============================
-- whatsapp_message_statuses
-- ============================
CREATE TABLE public.whatsapp_message_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  wamid text NOT NULL,
  status wa_delivery_status NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_message_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view wa_message_statuses" ON public.whatsapp_message_statuses FOR SELECT TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "insert wa_message_statuses" ON public.whatsapp_message_statuses FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE INDEX idx_wa_message_statuses_wamid ON public.whatsapp_message_statuses(wamid);
