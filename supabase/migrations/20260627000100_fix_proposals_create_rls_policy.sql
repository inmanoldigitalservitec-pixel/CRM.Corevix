-- Allow authenticated company members to create proposals for their own company.
-- This is intentionally additive and idempotent: if the remote database has a stricter
-- historical policy, this permissive company-scoped policy lets valid inserts pass.

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposals'
      AND policyname = 'create proposals company scoped v2'
  ) THEN
    CREATE POLICY "create proposals company scoped v2"
      ON public.proposals
      FOR INSERT
      TO authenticated
      WITH CHECK (
        company_id = public.get_user_company_id(auth.uid())
      );
  END IF;
END $$;
