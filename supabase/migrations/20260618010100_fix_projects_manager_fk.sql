-- Fix project manager FK mismatch.
-- Legacy rows may still store auth.users.id in public.projects.manager.
-- Normalize those rows to public.profiles.id and ensure only the profiles FK remains.

UPDATE public.projects p
SET manager = pr.id
FROM public.profiles pr
WHERE p.manager = pr.user_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'projects'
      AND c.conname = 'projects_manager_fkey'
  ) THEN
    ALTER TABLE public.projects DROP CONSTRAINT projects_manager_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'projects'
      AND c.conname = 'fk_projects_manager'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT fk_projects_manager
      FOREIGN KEY (manager)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'projects'
      AND c.conname = 'fk_projects_manager'
  ) THEN
    ALTER TABLE public.projects VALIDATE CONSTRAINT fk_projects_manager;
  END IF;
END $$;
