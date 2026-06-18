create table if not exists public.meta_conversation_lead_profiles (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  account_id uuid not null,
  conversation_id uuid not null references public.meta_conversations(id) on delete cascade,

  platform text not null default 'messenger',
  external_user_id text,

  lead_status text not null default 'collecting',

  name text,
  phone text,
  business_type text,
  service_interest text,
  goal text,
  current_status text,
  reference text,
  urgency text,

  summary text,
  notes text,
  captured_fields jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, platform, conversation_id)
);

create index if not exists idx_meta_conversation_lead_profiles_conversation
on public.meta_conversation_lead_profiles(conversation_id);

create index if not exists idx_meta_conversation_lead_profiles_company_status
on public.meta_conversation_lead_profiles(company_id, lead_status);
