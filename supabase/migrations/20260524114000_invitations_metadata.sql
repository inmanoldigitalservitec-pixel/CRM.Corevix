-- Invitations: optional metadata fields for better UX
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS department text;

