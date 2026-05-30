-- Fix: ensure public.clients.account_manager exists before RLS policies reference it.
-- Non-destructive and idempotent.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_manager uuid;

-- Add FK to profiles(id) if not present (NOT VALID to avoid scanning existing rows).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clients'
      AND c.conname = 'fk_clients_account_manager'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT fk_clients_account_manager
      FOREIGN KEY (account_manager)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_account_manager
  ON public.clients(company_id, account_manager);

