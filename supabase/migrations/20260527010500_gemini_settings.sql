create table if not exists public.gemini_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  api_key_encrypted text,
  model text,
  system_prompt text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(company_id)
);

drop trigger if exists update_gemini_settings_updated_at on public.gemini_settings;
create trigger update_gemini_settings_updated_at
before update on public.gemini_settings
for each row
execute function public.update_updated_at_column();

