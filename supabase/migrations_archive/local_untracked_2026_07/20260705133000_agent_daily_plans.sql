create table if not exists public.agent_daily_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null,
  snapshot_version text not null default 'agent_attention_snapshot_v1',
  snapshot_base jsonb not null default '{}'::jsonb,
  case_key text not null,
  case_type text not null,
  case_title text not null,
  case_summary text,
  case_severity text not null default 'medium',
  detected_case jsonb not null default '{}'::jsonb,
  plan_title text not null,
  plan_summary text not null,
  generated_plan jsonb not null default '{}'::jsonb,
  suggested_actions jsonb not null default '[]'::jsonb,
  state text not null default 'new',
  state_reason text,
  source_memory_keys text[] not null default '{}',
  source_event_ids text[] not null default '{}',
  source_modules text[] not null default '{}',
  origin_fingerprint text not null,
  reminder_count integer not null default 0,
  last_reminded_at timestamptz,
  next_reminder_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  executing_at timestamptz,
  completed_at timestamptz,
  dismissed_at timestamptz,
  expired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_daily_plans_company_user_cycle_case_unique unique (
    company_id,
    user_id,
    cycle_date,
    case_key
  ),
  constraint agent_daily_plans_state_check check (
    state in ('new', 'reviewed', 'approved', 'executing', 'completed', 'dismissed', 'expired')
  ),
  constraint agent_daily_plans_case_severity_check check (
    case_severity in ('critical', 'high', 'medium', 'low')
  ),
  constraint agent_daily_plans_reminder_count_check check (reminder_count >= 0)
);

create index if not exists idx_agent_daily_plans_company_user_cycle
  on public.agent_daily_plans(company_id, user_id, cycle_date desc);

create index if not exists idx_agent_daily_plans_company_user_state
  on public.agent_daily_plans(company_id, user_id, state);

create index if not exists idx_agent_daily_plans_company_user_next_reminder
  on public.agent_daily_plans(company_id, user_id, next_reminder_at asc);

create index if not exists idx_agent_daily_plans_origin_fingerprint
  on public.agent_daily_plans(company_id, user_id, origin_fingerprint);

alter table public.agent_daily_plans enable row level security;

drop policy if exists "view own agent daily plans" on public.agent_daily_plans;
drop policy if exists "create own agent daily plans" on public.agent_daily_plans;
drop policy if exists "update own agent daily plans" on public.agent_daily_plans;
drop policy if exists "delete own agent daily plans" on public.agent_daily_plans;

create policy "view own agent daily plans"
on public.agent_daily_plans
for select
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "create own agent daily plans"
on public.agent_daily_plans
for insert
to authenticated
with check (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

create policy "update own agent daily plans"
on public.agent_daily_plans
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

create policy "delete own agent daily plans"
on public.agent_daily_plans
for delete
to authenticated
using (
  company_id = public.get_user_company_id(auth.uid())
  and user_id = auth.uid()
);

drop trigger if exists update_agent_daily_plans_updated_at on public.agent_daily_plans;

create trigger update_agent_daily_plans_updated_at
before update on public.agent_daily_plans
for each row
execute function public.update_updated_at_column();
