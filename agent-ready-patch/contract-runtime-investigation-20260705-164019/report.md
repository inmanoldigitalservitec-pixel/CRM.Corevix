# Agent Widget Contract Runtime Investigation

Generated at: Sun Jul  5 16:40:19 AST 2026

## Env

```txt
1:SUPABASE_PUBLISHABLE_KEY=***MASKED***
2:SUPABASE_URL="https://zwgtgegrgwqtfbsvpala.supabase.co"
3:VITE_SUPABASE_PROJECT_ID="zwgtgegrgwqtfbsvpala"
4:VITE_SUPABASE_PUBLISHABLE_KEY=***MASKED***
5:VITE_SUPABASE_URL="https://zwgtgegrgwqtfbsvpala.supabase.co"
```

- Supabase URL usada por la app: `https://zwgtgegrgwqtfbsvpala.supabase.co`
- Project ref usado por la app: `zwgtgegrgwqtfbsvpala`

## REST latest contracts

- HTTP status: `200`
```json
[]
```

## REST exact manual_test_correct_supabase

- HTTP status: `200`
```json
[]
```

## Parsed REST result

```txt
latest_rows_count: 0
exact_rows_count: 0
latest_first_plan_title: None
exact_first_plan_title: None
latest_generated_by: None
exact_generated_by: None
```

## Frontend source markers

```txt
./src/lib/agentClient.ts:299:export async function fetchAgentPromptPayload(
./src/lib/agentClient.ts:376:export async function fetchAgentWidgetContract(
./src/lib/agentClient.ts:380:    .from("agent_widget_contracts")
./src/components/dashboard-v2/dashboard-v2.tsx:27:import { AgentCommandWidgetConnected } from "@/components/agent";
./src/components/dashboard-v2/dashboard-v2.tsx:29:import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";
./src/components/dashboard-v2/dashboard-v2.tsx:1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
./src/components/dashboard-v2/dashboard-v2.tsx:1551:      const widgetContractResult = await fetchAgentWidgetContract();
./src/components/dashboard-v2/dashboard-v2.tsx:1553:      console.log("[AgentWidget][ONLY_CONTRACT_TABLE]", {
./src/components/dashboard-v2/dashboard-v2.tsx:1562:        setAgentPromptPayload({
./src/components/dashboard-v2/dashboard-v2.tsx:1575:              case_key: "debug::agent_widget_contracts::empty",
./src/components/dashboard-v2/dashboard-v2.tsx:1577:              plan_title: "NO LLEGÓ NINGÚN CONTRATO DESDE agent_widget_contracts",
./src/components/dashboard-v2/dashboard-v2.tsx:1579:              message: "El widget intentó leer agent_widget_contracts, pero no recibió contract_json.",
./src/components/dashboard-v2/dashboard-v2.tsx:1584:                  description: "Verifica que agent_widget_contracts tenga al menos una fila en el mismo proyecto Supabase usado por .env.local."
./src/components/dashboard-v2/dashboard-v2.tsx:1588:                  description: "Verifica que anon/authenticated puedan hacer select sobre agent_widget_contracts."
./src/components/dashboard-v2/dashboard-v2.tsx:1593:              success_criteria: "El widget debe recibir un contract_json válido desde agent_widget_contracts."
./src/components/dashboard-v2/dashboard-v2.tsx:1600:      setAgentPromptPayload(widgetContractResult.payload);
./src/components/dashboard-v2/dashboard-v2.tsx:1602:      console.error("[AgentWidget][ONLY_CONTRACT_TABLE][ERROR]", error);
./src/components/dashboard-v2/dashboard-v2.tsx:1604:      setAgentPromptPayload({
./src/components/dashboard-v2/dashboard-v2.tsx:1617:            case_key: "debug::agent_widget_contracts::error",
./src/components/dashboard-v2/dashboard-v2.tsx:1619:            plan_title: "ERROR LEYENDO agent_widget_contracts",
./src/components/dashboard-v2/dashboard-v2.tsx:1621:            message: "El frontend lanzó un error al intentar leer agent_widget_contracts.",
./src/components/dashboard-v2/dashboard-v2.tsx:1626:                description: "Abrir DevTools y revisar el error [AgentWidget][ONLY_CONTRACT_TABLE][ERROR]."
./src/components/dashboard-v2/dashboard-v2.tsx:1631:            success_criteria: "La consulta a agent_widget_contracts debe responder correctamente."
./src/components/dashboard-v2/dashboard-v2.tsx:1799:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
./src/components/agent/AgentCommandWidgetConnected.tsx:9:type AgentCommandWidgetConnectedProps = {
./src/components/agent/AgentCommandWidgetConnected.tsx:13:  onAnalyzeNow?: () => void | Promise<void>;
./src/components/agent/AgentCommandWidgetConnected.tsx:18:export function AgentCommandWidgetConnected({
./src/components/agent/AgentCommandWidgetConnected.tsx:22:  onAnalyzeNow,
./src/components/agent/AgentCommandWidgetConnected.tsx:25:}: AgentCommandWidgetConnectedProps) {
./src/components/agent/AgentCommandWidgetConnected.tsx:35:      onAnalyzeNow={onAnalyzeNow}
./src/components/agent/AgentCommandWidgetConnected.tsx:42:export default AgentCommandWidgetConnected;
./src/components/agent/AgentCommandWidget.tsx:35:  onAnalyzeNow?: () => void | Promise<void>;
./src/components/agent/AgentCommandWidget.tsx:242:  onAnalyzeNow,
./src/components/agent/AgentCommandWidget.tsx:264:        description: "Verificar si agent_widget_contracts.contract_json contiene recovery_plans."
./src/components/agent/AgentCommandWidget.tsx:316:      await onAnalyzeNow?.();
./src/components/agent/index.ts:7:  AgentCommandWidgetConnected,
./src/components/agent/index.ts:8:  default as AgentCommandWidgetConnectedDefault,
./src/components/agent/index.ts:9:} from "./AgentCommandWidgetConnected";
```

## agentClient Supabase setup

```txt
```

## Top of agentClient.ts

```ts
import { supabase } from "@/integrations/supabase/client";

const AGENT_URL = (import.meta.env.VITE_AGENT_URL || "http://localhost:8787").replace(/\/$/, "");

export type AgentChatHistoryMessage = { role: "user" | "assistant"; content: string };
export type AgentToolScope =
  | "general"
  | "leads"
  | "clients"
  | "tasks"
  | "pipeline"
  | "reports"
  | "communication"
  | "projects"
  | "finance";
export type AgentPlanSeverity = "critical" | "high" | "medium" | "low";
export type AgentPlanState =
  | "new"
  | "reviewed"
  | "approved"
  | "executing"
  | "completed"
  | "dismissed"
  | "expired";

export type AgentPlanAction = {
  id: string;
  type: string;
  label: string;
  reason?: string;
  module?: string;
  target?: {
    type?: string;
    id?: string | null;
    label?: string | null;
    href?: string | null;
    status?: string | null;
  } | null;
  priority?: AgentPlanSeverity;
  requiresConfirmation?: boolean;
  payload?: Record<string, string | number | boolean | null>;
};

export type AgentDailyPlanRow = {
  id?: string;
  cycle_date: string;
  case_key: string;
  case_type: string;
  case_title: string;
  case_summary: string | null;
  case_severity: AgentPlanSeverity;
  plan_title: string;
  plan_summary: string;
  generated_plan?: {
    title?: string;
    summary?: string;
    actions?: AgentPlanAction[];
    rationale?: string | null;
  } | null;
  suggested_actions?: AgentPlanAction[] | null;
  state: AgentPlanState;
  state_reason?: string | null;
  source_modules?: string[] | null;
  source_event_ids?: string[] | null;
  source_memory_keys?: string[] | null;
  reminder_count?: number | null;
  last_reminded_at?: string | null;
  next_reminder_at?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  executing_at?: string | null;
  completed_at?: string | null;
  dismissed_at?: string | null;
  expired_at?: string | null;
  metadata?: Record<string, unknown> | null;
  snapshot_base?: {
    generatedAt?: string;
    headline?: string;
    counts?: Record<string, number>;
  } | null;
```

## fetchAgentWidgetContract block

```ts
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

```

## Local dev server

- localhost:8080 status: `not_running_or_unreachable`

## Summary diagnosis

- latest_count: `0`
- exact_count: `0`
- agentClient reads agent_widget_contracts: `yes`
- dashboard forced to only contract table: `yes`
- REST test did NOT read rows from agent_widget_contracts using .env.local.
