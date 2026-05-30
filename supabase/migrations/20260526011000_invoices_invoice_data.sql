-- Add invoice_data JSONB for controlled invoice templates and metadata.
-- Safe migration (IF NOT EXISTS) and keeps RLS untouched.

alter table if exists public.invoices
  add column if not exists invoice_data jsonb not null default '{}'::jsonb;

