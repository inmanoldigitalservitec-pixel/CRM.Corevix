-- Client 360 + WhatsApp bridge
-- Run this in Supabase SQL Editor if migrations are not applied automatically.

-- Link WhatsApp internal notes directly to clients when a match is known.
alter table public.whatsapp_internal_notes
  add column if not exists client_id uuid;

create index if not exists idx_whatsapp_internal_notes_client
  on public.whatsapp_internal_notes (company_id, client_id, created_at desc);

-- Link CRM tasks created from WhatsApp to a client when a match is known.
-- Some installs already use related_client_id; this keeps the WhatsApp relation explicit too.
alter table public.tasks
  add column if not exists whatsapp_client_id uuid;

create index if not exists idx_tasks_whatsapp_client
  on public.tasks (company_id, whatsapp_client_id, updated_at desc);

-- Optional future bridge table for exact conversation-to-client matches.
create table if not exists public.whatsapp_client_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  client_id uuid not null,
  whatsapp_conversation_id text not null,
  whatsapp_channel text default 'whatsapp-web',
  phone text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, whatsapp_conversation_id)
);

create index if not exists idx_whatsapp_client_links_client
  on public.whatsapp_client_links (company_id, client_id, updated_at desc);

create or replace function public.set_whatsapp_client_links_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_client_links_updated_at on public.whatsapp_client_links;
create trigger trg_whatsapp_client_links_updated_at
before update on public.whatsapp_client_links
for each row execute function public.set_whatsapp_client_links_updated_at();
