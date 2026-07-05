#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Implementing Agent Widget Phase 4B"
echo " Separate Supabase table for widget output"
echo "=========================================="
echo ""

MIGRATIONS_DIR="./supabase/migrations"
CLIENT_FILE="./src/lib/agentClient.ts"
DASHBOARD_FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
BACKUP_DIR="./agent-ready-patch/backups-agent-phase4B-$(date +%Y%m%d-%H%M%S)"
MIGRATION_FILE="$MIGRATIONS_DIR/20260705162000_agent_widget_contracts.sql"

mkdir -p "$MIGRATIONS_DIR"
mkdir -p "$BACKUP_DIR"

if [ ! -f "$CLIENT_FILE" ]; then
  echo "ERROR: No existe $CLIENT_FILE"
  exit 1
fi

if [ ! -f "$DASHBOARD_FILE" ]; then
  echo "ERROR: No existe $DASHBOARD_FILE"
  exit 1
fi

cp "$CLIENT_FILE" "$BACKUP_DIR/agentClient.ts.bak"
cp "$DASHBOARD_FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"

if [ -f "$MIGRATION_FILE" ]; then
  cp "$MIGRATION_FILE" "$BACKUP_DIR/$(basename "$MIGRATION_FILE").bak"
fi

echo "Backups:"
echo "- $BACKUP_DIR/agentClient.ts.bak"
echo "- $BACKUP_DIR/dashboard-v2.tsx.bak"
echo ""

echo "1) Creating Supabase migration..."

cat > "$MIGRATION_FILE" <<'SQL'
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
SQL

echo "Migration created:"
echo "- $MIGRATION_FILE"

echo ""
echo "2) Patching agentClient.ts..."

node <<'NODE'
const fs = require("fs");

const file = "./src/lib/agentClient.ts";
let src = fs.readFileSync(file, "utf8");

if (src.includes("fetchAgentWidgetContract")) {
  console.log("OK: fetchAgentWidgetContract already exists. Skipping.");
  process.exit(0);
}

const block = `

export type AgentWidgetContractRow = {
  id?: string;
  company_id?: string | null;
  user_id?: string | null;
  cycle_date?: string | null;
  schema_version?: string | null;
  status?: string | null;
  contract_json?: unknown;
  source_context_id?: string | null;
  generated_by?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FetchAgentWidgetContractOptions = {
  companyId?: string | null;
  userId?: string | null;
  cycleDate?: string | null;
};

export type FetchAgentWidgetContractResult = {
  row: AgentWidgetContractRow | null;
  payload: Record<string, unknown> | null;
};

export async function fetchAgentWidgetContract(
  options: FetchAgentWidgetContractOptions = {},
): Promise<FetchAgentWidgetContractResult> {
  let query = supabase
    .from("agent_widget_contracts")
    .select("id, company_id, user_id, cycle_date, schema_version, status, contract_json, source_context_id, generated_by, error_message, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (options.companyId) {
    query = query.eq("company_id", options.companyId);
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  if (options.cycleDate) {
    query = query.eq("cycle_date", options.cycleDate);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data || null) as AgentWidgetContractRow | null;
  const contractJson = row?.contract_json;

  if (!contractJson || typeof contractJson !== "object" || Array.isArray(contractJson)) {
    return {
      row,
      payload: null,
    };
  }

  return {
    row,
    payload: contractJson as Record<string, unknown>,
  };
}
`;

src = `${src.trimEnd()}\n${block}\n`;

fs.writeFileSync(file, src);
console.log("OK: Added fetchAgentWidgetContract.");
NODE

echo ""
echo "3) Patching dashboard to prefer widget contract table..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");

if (!src.includes("fetchAgentWidgetContract")) {
  if (src.includes('import { fetchAgentPromptPayload } from "@/lib/agentClient";')) {
    src = src.replace(
      'import { fetchAgentPromptPayload } from "@/lib/agentClient";',
      'import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";',
    );
  } else {
    const importMatches = src.match(/import[\s\S]*?;\n/g);
    if (importMatches && importMatches.length > 0) {
      const insertAt = src.lastIndexOf(importMatches[importMatches.length - 1]) + importMatches[importMatches.length - 1].length;
      src =
        src.slice(0, insertAt) +
        'import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";\n' +
        src.slice(insertAt);
    } else {
      src = 'import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";\n' + src;
    }
  }
}

const oldBlock = `  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const result = await fetchAgentPromptPayload();
      setAgentPromptPayload(result.payload);
    } catch (error) {
      console.error("Failed to fetch agent prompt payload", error);
      setAgentPromptPayload(null);
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);`;

const newBlock = `  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const widgetContractResult = await fetchAgentWidgetContract();

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      const promptPayloadResult = await fetchAgentPromptPayload();
      setAgentPromptPayload(promptPayloadResult.payload);
    } catch (error) {
      console.error("Failed to fetch agent widget contract or prompt payload", error);

      try {
        const promptPayloadResult = await fetchAgentPromptPayload();
        setAgentPromptPayload(promptPayloadResult.payload);
      } catch (fallbackError) {
        console.error("Failed to fetch fallback agent prompt payload", fallbackError);
        setAgentPromptPayload(null);
      }
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);`;

if (src.includes(oldBlock)) {
  src = src.replace(oldBlock, newBlock);
  console.log("OK: refreshAgentPromptPayload patched.");
} else if (src.includes("fetchAgentWidgetContract()")) {
  console.log("OK: dashboard already uses fetchAgentWidgetContract.");
} else {
  console.log("WARNING: Could not find exact refreshAgentPromptPayload block.");
}

fs.writeFileSync(file, src);
NODE

echo ""
echo "4) Validation grep..."

grep -RIn \
  "agent_widget_contracts\|fetchAgentWidgetContract\|AgentWidgetContractRow\|contract_json\|source_context_id" \
  ./src ./supabase/migrations \
  | tee "$BACKUP_DIR/validation-grep.txt"

echo ""
echo "=========================================="
echo " Phase 4B patch completed"
echo "=========================================="
echo ""
echo "Created/updated:"
echo "- $MIGRATION_FILE"
echo "- $CLIENT_FILE"
echo "- $DASHBOARD_FILE"
echo ""
echo "Backups:"
echo "$BACKUP_DIR"
echo ""
echo "Now run:"
echo "npm run build"
echo ""
echo "Then apply migration according to your Supabase workflow."
echo "Common options:"
echo "- supabase db push"
echo "- supabase migration up"
echo "- or paste the SQL into Supabase SQL Editor"
