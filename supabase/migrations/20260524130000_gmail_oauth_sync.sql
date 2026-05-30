-- Gmail OAuth + Sync support (idempotent, non-destructive)

-- 1) Ensure email_accounts has required columns/index/trigger
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gmail';

-- Some existing databases may use a different column name (e.g. account_email/email).
-- Standardize on email_address without dropping legacy columns.
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS email_address text;

DO $$
BEGIN
  -- Backfill email_address from legacy columns if present
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_accounts'
      AND column_name = 'account_email'
  ) THEN
    EXECUTE $q$
      UPDATE public.email_accounts
      SET email_address = account_email
      WHERE email_address IS NULL
        AND account_email IS NOT NULL
    $q$;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_accounts'
      AND column_name = 'email'
  ) THEN
    EXECUTE $q$
      UPDATE public.email_accounts
      SET email_address = email
      WHERE email_address IS NULL
        AND email IS NOT NULL
    $q$;
  END IF;
END $$;

ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}';

-- Avoid duplicates per connected account
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_accounts_user_provider_email
  ON public.email_accounts (user_id, provider, email_address);

-- Make updated_at trigger idempotent
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON public.email_accounts;
CREATE TRIGGER update_email_accounts_updated_at
BEFORE UPDATE ON public.email_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) OAuth state storage (service-role only; no policies granted)
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  state_hash text NOT NULL UNIQUE,
  company_id uuid,
  profile_id uuid,
  user_auth_id uuid,
  redirect_to text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at
  ON public.oauth_states (expires_at);

-- 3) Inbox compatibility: provider/thread/message identifiers for safe upserts
ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gmail';

ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS email_account_id uuid;

ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS provider_thread_id text;

ALTER TABLE public.email_conversations
  ADD COLUMN IF NOT EXISTS snippet text;

DO $$
BEGIN
  -- Backfill email_account_id from legacy account_id if present
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_conversations'
      AND column_name = 'account_id'
  ) THEN
    EXECUTE $q$
      UPDATE public.email_conversations
      SET email_account_id = account_id
      WHERE email_account_id IS NULL
        AND account_id IS NOT NULL
    $q$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_conversations_email_account_id_fkey'
  ) THEN
    ALTER TABLE public.email_conversations
      ADD CONSTRAINT email_conversations_email_account_id_fkey
      FOREIGN KEY (email_account_id) REFERENCES public.email_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_conversations_account_provider_thread
  ON public.email_conversations (email_account_id, provider, provider_thread_id)
  WHERE provider_thread_id IS NOT NULL;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'gmail';

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS email_account_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_messages_email_account_id_fkey'
  ) THEN
    ALTER TABLE public.email_messages
      ADD CONSTRAINT email_messages_email_account_id_fkey
      FOREIGN KEY (email_account_id) REFERENCES public.email_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_messages_email_account_id
  ON public.email_messages (email_account_id);

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS provider_message_id text;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS provider_thread_id text;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS snippet text;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS label_ids text[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_messages_conversation_provider_message
  ON public.email_messages (conversation_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
