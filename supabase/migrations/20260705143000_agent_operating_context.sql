create table if not exists public.agent_operating_context (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null,
  context_version text not null default 'agent_operating_context_v1',
  context_json jsonb not null default '{}'::jsonb,
  source_fingerprint text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_operating_context_company_user_cycle_unique unique (
    company_id,
    user_id,
    cycle_date
  )
);

create index if not exists idx_agent_operating_context_company_user_cycle
  on public.agent_operating_context(company_id, user_id, cycle_date desc);

create index if not exists idx_agent_operating_context_company_user_generated
  on public.agent_operating_context(company_id, user_id, generated_at desc);

create index if not exists idx_agent_operating_context_source_fingerprint
  on public.agent_operating_context(company_id, user_id, source_fingerprint);

alter table public.agent_operating_context enable row level security;

drop policy if exists "view own agent operating context" on public.agent_operating_context;
drop policy if exists "create own agent operating context" on public.agent_operating_context;
drop policy if exists "update own agent operating context" on public.agent_operating_context;
drop policy if exists "delete own agent operating context" on public.agent_operating_context;

create policy "view own agent operating context"
on public.agent_operating_context
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "create own agent operating context"
on public.agent_operating_context
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update own agent operating context"
on public.agent_operating_context
for update
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
)
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "delete own agent operating context"
on public.agent_operating_context
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

drop trigger if exists update_agent_operating_context_updated_at on public.agent_operating_context;

create trigger update_agent_operating_context_updated_at
before update on public.agent_operating_context
for each row
execute function public.update_updated_at_column();
