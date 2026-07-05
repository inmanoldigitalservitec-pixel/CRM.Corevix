-- Agent widget contracts
-- Separate output table for the agent-facing widget.
--
-- agent_operating_context = input/context for the agent to think.
-- agent_widget_contracts = output/contract the widget displays.

create table if not exists public.agent_widget_contracts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid null,
  user_id uuid null,

  cycle_date date not null default current_date,

  schema_version text not null default 'agent_widget_contract_v1',
  status text not null default 'idle',

  contract_json jsonb not null default '{}'::jsonb,

  source_context_id uuid null,

  generated_by text not null default 'agent',
  error_message text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint agent_widget_contracts_schema_version_check
    check (schema_version in ('agent_widget_contract_v1')),

  constraint agent_widget_contracts_status_check
    check (status in ('idle', 'analyzing', 'ready', 'executing', 'done', 'error')),

  constraint agent_widget_contracts_contract_is_object_check
    check (jsonb_typeof(contract_json) = 'object')
);

create index if not exists agent_widget_contracts_cycle_date_idx
  on public.agent_widget_contracts (cycle_date desc);

create index if not exists agent_widget_contracts_generated_at_idx
  on public.agent_widget_contracts (created_at desc);

create index if not exists agent_widget_contracts_company_cycle_idx
  on public.agent_widget_contracts (company_id, cycle_date desc);

create index if not exists agent_widget_contracts_user_cycle_idx
  on public.agent_widget_contracts (user_id, cycle_date desc);

create index if not exists agent_widget_contracts_status_idx
  on public.agent_widget_contracts (status);

create index if not exists agent_widget_contracts_contract_json_gin_idx
  on public.agent_widget_contracts using gin (contract_json);

create or replace function public.set_agent_widget_contracts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_widget_contracts_updated_at
  on public.agent_widget_contracts;

create trigger set_agent_widget_contracts_updated_at
before update on public.agent_widget_contracts
for each row
execute function public.set_agent_widget_contracts_updated_at();

comment on table public.agent_widget_contracts is
  'Output table for agent-generated widget contracts. The widget reads this table.';

comment on column public.agent_widget_contracts.contract_json is
  'Full agent_widget_contract_v1 JSON shown by the dashboard widget.';

comment on column public.agent_widget_contracts.source_context_id is
  'Optional reference to agent_operating_context row used as input.';

-- Keep read access simple for the existing frontend.
-- Tighten with RLS policies later when company/user scoping is finalized.
grant select on public.agent_widget_contracts to anon;
grant select on public.agent_widget_contracts to authenticated;
grant insert, update on public.agent_widget_contracts to authenticated;
