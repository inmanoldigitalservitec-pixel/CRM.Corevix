-- Phase 1: Prepare canonical multichannel leads (non-breaking).
-- Adds new columns + indexes to public.leads and links public.deals -> public.leads via lead_id.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_channel text,
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS first_touch_channel text,
  ADD COLUMN IF NOT EXISTS last_touch_channel text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_company_source_channel
ON public.leads(company_id, source_channel);

CREATE INDEX IF NOT EXISTS idx_leads_company_external_id
ON public.leads(company_id, external_id);

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lead_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deals_lead_id_fkey'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_company_lead_id
ON public.deals(company_id, lead_id);

