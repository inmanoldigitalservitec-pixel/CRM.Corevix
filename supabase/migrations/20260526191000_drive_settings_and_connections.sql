-- Google Drive integration settings (phase 1: settings + connection records)

create table if not exists public.drive_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id text,
  client_secret_encrypted text,
  redirect_uri text,
  scopes text default 'https://www.googleapis.com/auth/drive.file',
  root_folder_id text,
  root_folder_url text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(company_id)
);

create table if not exists public.drive_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create index if not exists idx_drive_connections_company_user
  on public.drive_connections(company_id, user_id);

drop trigger if exists update_drive_settings_updated_at on public.drive_settings;
create trigger update_drive_settings_updated_at
before update on public.drive_settings
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_drive_connections_updated_at on public.drive_connections;
create trigger update_drive_connections_updated_at
before update on public.drive_connections
for each row
execute function public.update_updated_at_column();

