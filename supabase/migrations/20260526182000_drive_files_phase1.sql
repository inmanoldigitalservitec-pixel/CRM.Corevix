-- Phase 1: prepare Drive metadata model for projects/tasks and task file listing.

alter table public.projects
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_url text;

alter table public.tasks
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_url text;

create table if not exists public.drive_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  drive_file_id text not null,
  name text not null,
  mime_type text,
  web_view_link text,
  web_content_link text,
  thumbnail_link text,
  icon_link text,
  size_bytes bigint,
  linked_type text not null check (linked_type in ('project','task','client','proposal','invoice')),
  linked_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_drive_files_company_linked
  on public.drive_files(company_id, linked_type, linked_id, created_at desc);

