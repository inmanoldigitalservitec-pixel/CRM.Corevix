-- WhatsApp CRM internal work persistence
-- Run this in Supabase SQL Editor if migrations are not applied automatically.

-- 1) Strong relation between tasks and the WhatsApp conversation that created them.
alter table public.tasks
  add column if not exists whatsapp_conversation_id text,
  add column if not exists whatsapp_channel text;

create index if not exists idx_tasks_whatsapp_conversation
  on public.tasks (company_id, whatsapp_conversation_id);

-- 2) Internal notes per WhatsApp conversation.
create table if not exists public.whatsapp_internal_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  whatsapp_conversation_id text not null,
  whatsapp_channel text default 'whatsapp-web',
  body text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_internal_notes_company_conversation
  on public.whatsapp_internal_notes (company_id, whatsapp_conversation_id, created_at desc);

-- Keep updated_at fresh when edited later.
create or replace function public.set_whatsapp_internal_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_internal_notes_updated_at on public.whatsapp_internal_notes;
create trigger trg_whatsapp_internal_notes_updated_at
before update on public.whatsapp_internal_notes
for each row execute function public.set_whatsapp_internal_notes_updated_at();

-- RLS note:
-- If your project already centralizes RLS by company_id, add equivalent policies for this table.
-- Leaving RLS disabled keeps the table usable immediately with the existing Supabase client.
-- Recommended production policy should restrict rows to members of the same company.
