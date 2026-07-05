# Agent Widget Data Source Investigation

Generated at: Sun Jul  5 16:29:53 AST 2026

## File existence

- OK: `./src/lib/agentClient.ts`
- OK: `./src/components/dashboard-v2/dashboard-v2.tsx`
- OK: `./src/components/agent/AgentCommandWidget.tsx`
- OK: `./src/components/agent/AgentCommandWidgetConnected.tsx`
- OK: `./src/components/agent/agentPromptPayloadAdapter.ts`
- OK: `./src/components/agent/index.ts`

## Supabase table reads

```txt
./src/components/dashboard-v2/dashboard-v2.tsx:1552:      // agent_widget_contracts = output created by the agent for the widget.
./src/components/dashboard-v2/dashboard-v2.tsx:1556:        source: widgetContractResult.payload ? "agent_widget_contracts" : "fallback_pending",
./src/components/dashboard-v2/dashboard-v2.tsx:1572:        source: "agent_operating_context",
./src/lib/agentClient.ts:303:    .from("agent_operating_context")
./src/lib/agentClient.ts:380:    .from("agent_widget_contracts")
./apps/agent-worker/src/agent-operating-context.ts:52:	return 'agent_operating_context_v1';
./apps/agent-worker/src/agent-operating-context.ts:60:		.from('agent_operating_context')
./apps/agent-worker/src/agent-operating-context.ts:510:		.from('agent_operating_context')
./apps/agent-worker/src/index.ts:360:				error: 'agent_operating_context_refresh_error',
./apps/agent-worker/src/index.ts:393:				error: 'agent_operating_context_load_error',
```

## agentClient fetch functions

```txt
282:  context_json?: unknown;
299:export async function fetchAgentPromptPayload(
303:    .from("agent_operating_context")
304:    .select("id, company_id, user_id, context_json, generated_at, created_at, updated_at")
316:  const { data, error } = await query.maybeSingle();
323:  const contextJson = row?.context_json;
357:  contract_json?: unknown;
376:export async function fetchAgentWidgetContract(
380:    .from("agent_widget_contracts")
381:    .select("id, company_id, user_id, cycle_date, schema_version, status, contract_json, source_context_id, generated_by, error_message, created_at, updated_at")
397:  const { data, error } = await query.maybeSingle();
404:  const contractJson = row?.contract_json;
```

### fetchAgentWidgetContract block
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

### fetchAgentPromptPayload block
```ts
  };
}


export type AgentPromptPayloadRow = {
  id?: string;
  company_id?: string | null;
  user_id?: string | null;
  context_json?: unknown;
  generated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FetchAgentPromptPayloadOptions = {
  companyId?: string | null;
  userId?: string | null;
};

export type FetchAgentPromptPayloadResult = {
  row: AgentPromptPayloadRow | null;
  payload: Record<string, unknown> | null;
};


export async function fetchAgentPromptPayload(
  options: FetchAgentPromptPayloadOptions = {},
): Promise<FetchAgentPromptPayloadResult> {
  let query = supabase
    .from("agent_operating_context")
    .select("id, company_id, user_id, context_json, generated_at, created_at, updated_at")
    .order("generated_at", { ascending: false })
    .limit(1);

  if (options.companyId) {
    query = query.eq("company_id", options.companyId);
  }

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  const row = (data || null) as AgentPromptPayloadRow | null;
  const contextJson = row?.context_json;

  if (!contextJson || typeof contextJson !== "object" || Array.isArray(contextJson)) {
    return {
      row,
      payload: null,
    };
  }

  const context = contextJson as Record<string, unknown>;

  const nestedPayload = context.agent_prompt_payload;

  if (nestedPayload && typeof nestedPayload === "object" && !Array.isArray(nestedPayload)) {
    return {
      row,
      payload: nestedPayload as Record<string, unknown>,
    };
  }

  return {
    row,
    payload: context,
  };
}


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
```

## Dashboard refresh function

```txt
27:import { AgentCommandWidgetConnected } from "@/components/agent";
29:import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";
1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
1547:  const refreshAgentPromptPayload = useCallback(async () => {
1553:      const widgetContractResult = await fetchAgentWidgetContract();
1564:        setAgentPromptPayload(widgetContractResult.payload);
1569:      const promptPayloadResult = await fetchAgentPromptPayload();
1576:      setAgentPromptPayload(promptPayloadResult.payload);
1581:        const promptPayloadResult = await fetchAgentPromptPayload();
1582:        setAgentPromptPayload(promptPayloadResult.payload);
1585:        setAgentPromptPayload(null);
1593:    void refreshAgentPromptPayload();
1594:  }, [refreshAgentPromptPayload]);
1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
```

### refreshAgentPromptPayload area
```tsx
      </div>
    </DashboardCard>
  );
}

export function DashboardV2({
  kpis = mockKpis,
  actions = mockActions,
  schedule = mockSchedule,
  collectionRows = mockCollectionRows,
  pipeline = mockPipeline,
  clients = mockClients,
  activities = mockActivities,
  communications = mockCommunications,
  leadsAttention,
  projectRisks,
  invoiceRows,
  proposalRows,
  reportSnapshot,
  salesDocumentsOverview,
  workCenter,
  todoItems,
  todayLabel = "Vie. 23 mayo",
  collectionPeriodLabel = "Este mes⌄",
  pipelinePeriodLabel = "Este mes⌄",
}: DashboardV2Props = {}) {

  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
  const [isAgentPromptPayloadLoading, setIsAgentPromptPayloadLoading] = useState(false);

  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      // The widget refresh button should load the agent output table first.
      // agent_widget_contracts = output created by the agent for the widget.
      const widgetContractResult = await fetchAgentWidgetContract();

      console.log("[AgentWidget] refresh source check:", {
        source: widgetContractResult.payload ? "agent_widget_contracts" : "fallback_pending",
        row: widgetContractResult.row,
        firstPlanTitle: Array.isArray(widgetContractResult.payload?.recovery_plans)
          ? widgetContractResult.payload.recovery_plans[0]?.plan_title
          : null,
      });

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      // Fallback only while the real agent has not written a widget contract yet.
      const promptPayloadResult = await fetchAgentPromptPayload();

      console.log("[AgentWidget] fallback source:", {
        source: "agent_operating_context",
        row: promptPayloadResult.row,
      });

      setAgentPromptPayload(promptPayloadResult.payload);
    } catch (error) {
      console.error("Failed to refresh agent widget from contract table", error);

      try {
        const promptPayloadResult = await fetchAgentPromptPayload();
        setAgentPromptPayload(promptPayloadResult.payload);
      } catch (fallbackError) {
        console.error("Failed to refresh fallback agent operating context", fallbackError);
        setAgentPromptPayload(null);
      }
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAgentPromptPayload();
  }, [refreshAgentPromptPayload]);

  const resolvedLeadAttention = leadsAttention ?? actionListItems(actions, "/leads", "blue");
  const resolvedProjectRisks = projectRisks ?? actionListItems(actions, "/projects", "orange");
  const resolvedInvoiceRows =
    invoiceRows ??
    actionListItems(actions, "/invoices", "orange").concat(
      collectionRows
        .slice(0, 3)
        .map(
          ([label, value, percent, color]) =>
            [
              label,
              `${value} · ${percent}`,
              label.toLowerCase().includes("venc") ? "Vencido" : "Cobros",
              color.includes("rose") ? "red" : color.includes("emerald") ? "green" : "blue",
              "/invoices",
            ] as ListWidgetItem,
        ),
    );
  const resolvedProposalRows = proposalRows ?? actionListItems(actions, "/proposals", "purple");
  const resolvedReportSnapshot =
    reportSnapshot ??
    ([
      [
        "Dinero por cobrar",
        kpis.find((kpi) => kpi.label.toLowerCase().includes("cobrar"))?.value ||
          collectionRows[0]?.[1] ||
          "$0",
        collectionRows[1] ? `${collectionRows[1][1]} vencido` : "Sin vencidas",
        collectionRows[1]?.[1] && collectionRows[1][1] !== "$0" ? "orange" : "blue",
      ],
      [
        "Pipeline abierto",
        kpis.find((kpi) => kpi.label.toLowerCase().includes("oportun"))?.helper || "$0",
        `${pipeline.reduce((sum, [, count]) => sum + count, 0)} oportunidades`,
        "blue",
      ],
      [
        "Propuestas",
        kpis.find((kpi) => kpi.label.toLowerCase().includes("propuesta"))?.value || "0",
        "Esperando respuesta",
        "purple",
      ],
      [
        "Actividad",
        String(activities.length),
        activities[0]?.[0] || "Sin actividad reciente",
        activities.length ? "teal" : "neutral",
```

### widget render area
```tsx
import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  Flag,
  Goal,
  Instagram,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

import { DashboardCard, DashboardTextButton } from "./dashboard-card";
import { DashboardKpiCard } from "./dashboard-kpi-card";
import { DashboardBuilder } from "@/components/dashboard-builder";
import { AgentCommandWidgetConnected } from "@/components/agent";
import type { DashboardWidgetMode } from "@/components/dashboard-builder";
import { fetchAgentPromptPayload, fetchAgentWidgetContract } from "@/lib/agentClient";

type DashboardV2Tone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";

type DashboardV2Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: DashboardV2Tone;
  icon: LucideIcon;
};

type DashboardV2Action = {
  title: string;
  relatedTo: string;
  due: string;
  priority: "Alta" | "Media" | "Normal";
  button: string;
  icon: LucideIcon;
  tone: DashboardV2Tone;
  href?: string;
};

type ScheduleItem = [string, string, string, string];
type PipelineItem = [string, number, string, number, string];
type ClientReviewItem = [string, string, string, string, string];
type CollectionItem = [string, string, string, string];
type ActivityItem = [string, string, string, LucideIcon];
type CommunicationItem = [string, string, string, string, string, string];
type ListWidgetItem = [string, string, string, string, string];
type SnapshotMetricItem = [string, string, string, DashboardV2Tone];
type DocumentStatusItem = [string, number, number, DashboardV2Tone];
type SalesDocumentsOverview = {
  invoices: DocumentStatusItem[];
  estimates: DocumentStatusItem[];
  proposals: DocumentStatusItem[];
  totals: [string, string, DashboardV2Tone][];
};
type WorkCenterItem = [string, string, string, DashboardV2Tone, string];
```

## AgentCommandWidgetConnected

```txt
2:import { AgentCommandWidget } from "./AgentCommandWidget";
4:  agentPromptPayloadToRecoveryPlans,
9:type AgentCommandWidgetConnectedProps = {
10:  payload?: AgentPromptPayload | null;
12:  isLoading?: boolean;
13:  onAnalyzeNow?: () => void | Promise<void>;
14:  onApprovePlan?: React.ComponentProps<typeof AgentCommandWidget>["onApprovePlan"];
18:export function AgentCommandWidgetConnected({
19:  payload,
21:  isLoading = false,
22:  onAnalyzeNow,
25:}: AgentCommandWidgetConnectedProps) {
26:  const recoveryPlans = useMemo(() => agentPromptPayloadToRecoveryPlans(payload), [payload]);
27:  const lastAnalysisLabel = useMemo(() => getAgentPayloadLastAnalysisLabel(payload), [payload]);
30:    <AgentCommandWidget
33:      isLoading={isLoading}
35:      onAnalyzeNow={onAnalyzeNow}
42:export default AgentCommandWidgetConnected;
```

### Full connected component
```tsx
import { useMemo } from "react";
import { AgentCommandWidget } from "./AgentCommandWidget";
import {
  agentPromptPayloadToRecoveryPlans,
  getAgentPayloadLastAnalysisLabel,
  type AgentPromptPayload,
} from "./agentPromptPayloadAdapter";

type AgentCommandWidgetConnectedProps = {
  payload?: AgentPromptPayload | null;
  isActive?: boolean;
  isLoading?: boolean;
  onAnalyzeNow?: () => void | Promise<void>;
  onApprovePlan?: React.ComponentProps<typeof AgentCommandWidget>["onApprovePlan"];
  className?: string;
};

export function AgentCommandWidgetConnected({
  payload,
  isActive = true,
  isLoading = false,
  onAnalyzeNow,
  onApprovePlan,
  className,
}: AgentCommandWidgetConnectedProps) {
  const recoveryPlans = useMemo(() => agentPromptPayloadToRecoveryPlans(payload), [payload]);
  const lastAnalysisLabel = useMemo(() => getAgentPayloadLastAnalysisLabel(payload), [payload]);

  return (
    <AgentCommandWidget
      plans={recoveryPlans}
      isActive={isActive}
      isLoading={isLoading}
      lastAnalysisLabel={lastAnalysisLabel}
      onAnalyzeNow={onAnalyzeNow}
      onApprovePlan={onApprovePlan}
      className={className}
    />
  );
}

export default AgentCommandWidgetConnected;
```

## AgentCommandWidget button/onAnalyzeNow usage

```txt
34:  isLoading?: boolean;
35:  onAnalyzeNow?: () => void | Promise<void>;
241:  isLoading = false,
242:  onAnalyzeNow,
290:  async function handleAnalyzeNow() {
291:    if (isAnalyzing || isLoading) return;
296:      await onAnalyzeNow?.();
372:        <button className="agent-analyze-btn" type="button" onClick={handleAnalyzeNow} disabled={isAnalyzing || isLoading}>
373:          {isAnalyzing || isLoading ? "Revisando actividad..." : "Analizar ahora"}
374:        </button>
409:                <button className="agent-primary-btn" type="button" onClick={handleStartExecution}>
411:                </button>
412:                <button className="agent-secondary-btn" type="button" onClick={handleTogglePlan}>
414:                </button>
476:              <button className="agent-primary-btn" type="button" onClick={() => setMode("review")}>
478:              </button>
479:              <button className="agent-secondary-btn" type="button" onClick={() => setMode("compact")}>
481:              </button>
```

### onAnalyzeNow area
```tsx
import { useEffect, useMemo, useState } from "react";
import "./AgentCommandWidget.css";

export type AgentWidgetMode = "compact" | "review" | "executing" | "result";

export type AgentSeverity = "critical" | "high" | "medium" | "low";

export type AgentRecoveryPlan = {
  case_key: string;
  title: string;
  severity: AgentSeverity;
  message: string;
  diagnosis: string;
  plan_steps: Array<{
    title: string;
    description: string;
  }>;
  suggested_actions: Array<{
    type: string;
    label: string;
    requires_confirmation: boolean;
  }>;
  result?: {
    title: string;
    message: string;
    data: Array<{ label: string; value: string }>;
  };
};

type AgentCommandWidgetProps = {
  plans?: AgentRecoveryPlan[];
  lastAnalysisLabel?: string;
  isActive?: boolean;
  isLoading?: boolean;
  onAnalyzeNow?: () => void | Promise<void>;
  onApprovePlan?: (plan: AgentRecoveryPlan) => void | Promise<void>;
  onSelectPlan?: (plan: AgentRecoveryPlan) => void;
  className?: string;
};

type WidgetTheme = {
  label: string;
  color: string;
  soft: string;
  icon: AgentIconName;
};

type AgentIconName = "mail" | "calendar" | "file" | "dollar" | "users" | "sync" | "spark";

const severityTheme: Record<AgentSeverity, WidgetTheme> = {
  critical: {
    label: "Crítico",
    color: "#ef1d1d",
    soft: "#fff0f0",
    icon: "sync",
  },
  high: {
    label: "Alta",
    color: "#ff2b2b",
    soft: "#fff0f1",
    icon: "calendar",
  },
  medium: {
    label: "Media",
    color: "#ff5b1f",
    soft: "#fff4ec",
    icon: "file",
  },
  low: {
    label: "Baja",
    color: "#0b5cff",
    soft: "#edf4ff",
    icon: "spark",
  },
};

const demoPlans: AgentRecoveryPlan[] = [
  {
    case_key: "demo::tasks::overdue",
    title: "Hay tareas vencidas",
    severity: "high",
    message: "Puedo reorganizar las tareas vencidas y priorizar las que requieren acción inmediata.",
    diagnosis: "La agenda tiene tareas vencidas que pueden afectar entregas, seguimiento y cumplimiento con clientes.",
    plan_steps: [
      {
        title: "Diagnóstico",
        description: "Revisaré tareas vencidas, responsables y fechas límite.",
      },
      {
        title: "Priorizar",
        description: "Separaré tareas críticas de las que pueden moverse sin impacto alto.",
      },
      {
        title: "Reordenar",
        description: "Crearé un orden claro para resolverlas durante el día.",
      },
      {
        title: "Cierre",
        description: "Dejaré preparado el próximo paso para cada tarea.",
      },
    ],
    suggested_actions: [
      {
        type: "review_record",
        label: "Revisar tareas",
        requires_confirmation: true,
      },
      {
        type: "move_due_date",
        label: "Reprogramar vencidas",
        requires_confirmation: true,
      },
    ],
    result: {
      title: "Plan preparado",
      message: "El agente dejó organizada una ruta de sanación para las tareas vencidas.",
      data: [
        { label: "Prioridad", value: "Alta" },
        { label: "Acción", value: "Revisar hoy" },
        { label: "Ejecución", value: "Requiere aprobación" },
      ],
    },
  },
];

function Icon({ name }: { name: AgentIconName }) {
  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 6h16v12H4z" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    );
  }

  if (name === "dollar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 2v20" />
        <path d="M17 6.5C15.8 5.6 14.4 5 12.5 5 9.8 5 8 6.3 8 8.3c0 4.4 9 2 9 7.4 0 2-1.9 3.3-4.7 3.3-2 0-3.8-.7-5.1-1.9" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M17 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "sync") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 12a9 9 0 0 1-15.4 6.4L3 16" />
        <path d="M3 12a9 9 0 0 1 15.4-6.4L21 8" />
        <path d="M3 16h5M16 8h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="m13 2-2 7H4l5.5 3.5L7.5 20 13 15.5 18.5 20l-2-7.5L22 9h-7z" />
    </svg>
  );
}

function inferIcon(plan: AgentRecoveryPlan): AgentIconName {
  const text = `${plan.title} ${plan.message} ${plan.diagnosis}`.toLowerCase();

  if (text.includes("gmail") || text.includes("correo") || text.includes("email")) return "mail";
  if (text.includes("factura") || text.includes("cobro") || text.includes("pago")) return "dollar";
  if (text.includes("lead") || text.includes("cliente")) return "users";
  if (text.includes("propuesta") || text.includes("contrato") || text.includes("documento")) return "file";
  if (text.includes("sincron") || text.includes("integración") || text.includes("error")) return "sync";
  if (text.includes("tarea") || text.includes("agenda") || text.includes("fecha")) return "calendar";

  return "spark";
}

function getPlanTheme(plan: AgentRecoveryPlan): WidgetTheme {
  const base = severityTheme[plan.severity] || severityTheme.low;
  return {
    ...base,
    icon: inferIcon(plan),
  };
}

function getImpactPills(plan: AgentRecoveryPlan) {
  const pills: string[] = [];

  pills.push(severityTheme[plan.severity]?.label || "Prioridad");
  pills.push(`${plan.plan_steps.length} pasos`);
  pills.push(
    plan.suggested_actions.some((action) => action.requires_confirmation)
      ? "Requiere aprobación"
      : "Acción disponible",
  );

  return pills;
}

function buildExecutionStream(plan: AgentRecoveryPlan) {
  return [
    "thinking...",
    "analizando caso detectado...",
    "revisando diagnóstico y evidencia...",
    "preparando plan de sanación...",
    ...plan.plan_steps.map((step) => `paso: ${step.title.toLowerCase()}...`),
    "plan listo para revisión.",
  ];
}

export function AgentCommandWidget({
  plans,
  lastAnalysisLabel = "Último análisis: ahora",
  isActive = true,
  isLoading = false,
  onAnalyzeNow,
  onApprovePlan,
  onSelectPlan,
  className,
}: AgentCommandWidgetProps) {
  const availablePlans = plans && plans.length > 0 ? plans : demoPlans;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<AgentWidgetMode>("compact");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [streamLines, setStreamLines] = useState<Array<{ text: string; type?: "thinking" | "done" }>>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedPlan = availablePlans[Math.min(selectedIndex, availablePlans.length - 1)] || availablePlans[0];
```

## Adapter source priority

```txt
3:  isAgentWidgetContractV1,
103:  widget_contract?: AgentWidgetContractV1;
104:  agent_widget_contract?: AgentWidgetContractV1;
117:  detected_cases?: AgentPromptDetectedCase[];
119:  recovery_plans?: AgentPromptRecoveryPlan[];
200:function normalizeWidgetContractRecoveryPlan(plan: AgentWidgetRecoveryPlan): AgentRecoveryPlan {
334:      message: "Este plan fue generado localmente desde detected_cases hasta conectar el agente real.",
340:export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
343:  if (isAgentWidgetContractV1(payload)) {
344:    return payload.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
347:  if (isAgentWidgetContractV1(payload.widget_contract)) {
348:    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
351:  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
352:    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
355:  const realRecoveryPlans = payload.recovery_plans || [];
361:  return (payload.detected_cases || []).map((detectedCase) =>
```

### agentPromptPayloadToRecoveryPlans area
```ts
        ? steps.map((step) => ({
            title: cleanText(step.title, "Paso"),
            description: cleanText(step.description, "Ejecutar este paso con validación."),
          }))
        : [
            { title: "Revisar", description: "Validar el estado actual del caso." },
            { title: "Preparar", description: "Preparar la acción recomendada." },
            { title: "Confirmar", description: "Solicitar aprobación antes de ejecutar." },
          ],
    suggested_actions:
      suggestedActions.length > 0
        ? suggestedActions
        : [
            {
              type: "review_record",
              label: "Revisar caso",
              requires_confirmation: true,
            },
          ],
    result: plan.result
      ? {
          title: cleanText(plan.result.title, "Plan listo"),
          message: cleanText(plan.result.message, "El plan quedó preparado."),
          data: (plan.result.data || []).map((item) => ({
            label: cleanText(item.label, "Dato"),
            value: cleanText(item.value, "-"),
          })),
        }
      : undefined,
  };
}

function detectedCaseToTemporaryRecoveryPlan(
  detectedCase: AgentPromptDetectedCase,
  payload: AgentPromptPayload,
): AgentRecoveryPlan {
  const caseKey = cleanText(detectedCase.case_key, `detected_case_${Math.random().toString(36).slice(2)}`);
  const severity = normalizeSeverity(detectedCase.severity);
  const sourceLabel =
    detectedCase.source?.label ||
    detectedCase.people?.client ||
    detectedCase.people?.lead ||
    detectedCase.people?.project ||
    detectedCase.source?.module ||
    "CRM";

  const amount = detectedCase.money?.amount ? String(detectedCase.money.amount) : null;
  const dueAt = detectedCase.timing?.due_at ? String(detectedCase.timing.due_at) : null;

  const resultData = [
    { label: "Prioridad", value: severity },
    { label: "Origen", value: sourceLabel },
    { label: "Confirmación", value: "Requerida" },
  ];

  if (dueAt) resultData.splice(2, 0, { label: "Fecha", value: dueAt.slice(0, 10) });
  if (amount) resultData.splice(2, 0, { label: "Monto", value: amount });

  return {
    case_key: caseKey,
    title: cleanText(detectedCase.title, "Caso detectado"),
    severity,
    message: cleanText(
      detectedCase.message || detectedCase.summary,
      "Encontré un caso que necesita atención y puedo preparar un plan de sanación.",
    ),
    diagnosis: cleanText(
      detectedCase.diagnosis || detectedCase.reason || detectedCase.summary,
      "El caso requiere revisión antes de ejecutar cualquier acción.",
    ),
    plan_steps: buildStepsFromDetectedCase(detectedCase),
    suggested_actions: fallbackActionsFromCase(payload, detectedCase),
    result: {
      title: "Plan temporal preparado",
      message: "Este plan fue generado localmente desde detected_cases hasta conectar el agente real.",
      data: resultData,
    },
  };
}

export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
  if (!payload) return [];

  if (isAgentWidgetContractV1(payload)) {
    return payload.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
  }

  if (isAgentWidgetContractV1(payload.widget_contract)) {
    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
  }

  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
  }

  const realRecoveryPlans = payload.recovery_plans || [];

  if (realRecoveryPlans.length > 0) {
    return realRecoveryPlans.map((plan) => normalizeRecoveryPlan(plan, payload));
  }

  return (payload.detected_cases || []).map((detectedCase) =>
    detectedCaseToTemporaryRecoveryPlan(detectedCase, payload),
  );
}

export function getAgentPayloadLastAnalysisLabel(payload?: AgentPromptPayload | null) {
  if (!payload?.generated_at) return "Último análisis: ahora";

  try {
    const date = new Date(payload.generated_at);

    return `Último análisis: ${date.toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    })}`;
  } catch {
    return "Último análisis: ahora";
  }
}
```

## Duplicate widget mounts

```txt
./src/components/dashboard-builder/widget-registry.ts:47:    title: "Autopilot del agente",
./src/components/dashboard-v2/dashboard-v2.tsx:27:import { AgentCommandWidgetConnected } from "@/components/agent";
./src/components/dashboard-v2/dashboard-v2.tsx:1751:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
./src/components/agent/AgentCommandWidgetConnected.tsx:2:import { AgentCommandWidget } from "./AgentCommandWidget";
./src/components/agent/AgentCommandWidgetConnected.tsx:9:type AgentCommandWidgetConnectedProps = {
./src/components/agent/AgentCommandWidgetConnected.tsx:14:  onApprovePlan?: React.ComponentProps<typeof AgentCommandWidget>["onApprovePlan"];
./src/components/agent/AgentCommandWidgetConnected.tsx:18:export function AgentCommandWidgetConnected({
./src/components/agent/AgentCommandWidgetConnected.tsx:25:}: AgentCommandWidgetConnectedProps) {
./src/components/agent/AgentCommandWidgetConnected.tsx:30:    <AgentCommandWidget
./src/components/agent/AgentCommandWidgetConnected.tsx:42:export default AgentCommandWidgetConnected;
./src/components/agent/agentPromptPayloadAdapter.ts:1:import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";
./src/components/agent/AgentCommandWidget.tsx:2:import "./AgentCommandWidget.css";
./src/components/agent/AgentCommandWidget.tsx:30:type AgentCommandWidgetProps = {
./src/components/agent/AgentCommandWidget.tsx:237:export function AgentCommandWidget({
./src/components/agent/AgentCommandWidget.tsx:246:}: AgentCommandWidgetProps) {
./src/components/agent/AgentCommandWidget.tsx:364:          <h2>Corevix Autopilot</h2>
./src/components/agent/AgentCommandWidget.tsx:389:              <div className="agent-label">Corevix Autopilot</div>
./src/components/agent/AgentCommandWidget.tsx:410:                  {selectedPlan.suggested_actions[0]?.label || "Resolver con Autopilot"}
./src/components/agent/AgentCommandWidget.tsx:448:              <h3 className="agent-stream-title">Autopilot está trabajando</h3>
./src/components/agent/AgentCommandWidget.tsx:490:export default AgentCommandWidget;
./src/components/agent/index.ts:2:  AgentCommandWidget,
./src/components/agent/index.ts:3:  default as AgentCommandWidgetDefault,
./src/components/agent/index.ts:4:} from "./AgentCommandWidget";
./src/components/agent/index.ts:7:  AgentCommandWidgetConnected,
./src/components/agent/index.ts:8:  default as AgentCommandWidgetConnectedDefault,
./src/components/agent/index.ts:9:} from "./AgentCommandWidgetConnected";
./src/components/agent/index.ts:20:} from "./AgentCommandWidget";
```

## Debug artifacts

```txt
./src/components/invoices/PayPalInvoiceButton.tsx:143:          window.alert("PayPal todavía no está conectado. Falta VITE_PAYPAL_CLIENT_ID.")
```

## Build smoke check

- OK: `npm run build` passed.
## Investigation summary

- OK: agentClient.ts contains a direct read from `agent_widget_contracts`.
- OK: agentClient.ts still contains fallback/read from `agent_operating_context`.
- OK: dashboard-v2.tsx references `fetchAgentWidgetContract`.
- CHECK: AgentCommandWidget.tsx references `onAnalyzeNow`. Inspect whether it is attached to the actual button.
- OK: AgentCommandWidgetConnected passes `onAnalyzeNow` into AgentCommandWidget.
- OK: dashboard render passes `refreshAgentPromptPayload` to widget.
- WARNING: debug artifacts remain in code. Review `debug-artifacts.txt`.
