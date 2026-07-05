# Agent Widget Phase 4 Investigation

Generated at: Sun Jul  5 16:11:47 AST 2026

## File existence

- OK: `./src/components/agent/AgentCommandWidget.tsx`
- OK: `./src/components/agent/AgentCommandWidgetConnected.tsx`
- OK: `./src/components/agent/agentPromptPayloadAdapter.ts`
- OK: `./src/components/agent/index.ts`
- OK: `./src/components/dashboard-v2/dashboard-v2.tsx`
- OK: `./src/lib/agentClient.ts`
- OK: `./apps/agent-worker/src/agent-operating-context.ts`
- OK: `./apps/agent-worker/src/agent-daily-plans.ts`
- OK: `./src/lib/crm/agent-plan-generation.ts`
- OK: `./src/lib/crm/agent-plans.ts`

## Contract markers

```txt
./src/components/dashboard-v2/dashboard-v2.tsx:29:import { fetchAgentPromptPayload } from "@/lib/agentClient";
./src/components/dashboard-v2/dashboard-v2.tsx:1544:  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(null);
./src/components/dashboard-v2/dashboard-v2.tsx:1545:  const [isAgentPromptPayloadLoading, setIsAgentPromptPayloadLoading] = useState(false);
./src/components/dashboard-v2/dashboard-v2.tsx:1547:  const refreshAgentPromptPayload = useCallback(async () => {
./src/components/dashboard-v2/dashboard-v2.tsx:1548:    setIsAgentPromptPayloadLoading(true);
./src/components/dashboard-v2/dashboard-v2.tsx:1551:      const result = await fetchAgentPromptPayload();
./src/components/dashboard-v2/dashboard-v2.tsx:1552:      setAgentPromptPayload(result.payload);
./src/components/dashboard-v2/dashboard-v2.tsx:1555:      setAgentPromptPayload(null);
./src/components/dashboard-v2/dashboard-v2.tsx:1557:      setIsAgentPromptPayloadLoading(false);
./src/components/dashboard-v2/dashboard-v2.tsx:1562:    void refreshAgentPromptPayload();
./src/components/dashboard-v2/dashboard-v2.tsx:1563:  }, [refreshAgentPromptPayload]);
./src/components/dashboard-v2/dashboard-v2.tsx:1720:          render: () => <AgentCommandWidgetConnected payload={agentPromptPayload} isLoading={isAgentPromptPayloadLoading} onAnalyzeNow={refreshAgentPromptPayload} />,
./src/components/agent/AgentCommandWidgetConnected.tsx:6:  type AgentPromptPayload,
./src/components/agent/AgentCommandWidgetConnected.tsx:10:  payload?: AgentPromptPayload | null;
./src/components/agent/agentPromptPayloadAdapter.ts:1:import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";
./src/components/agent/agentPromptPayloadAdapter.ts:13:  requires_confirmation?: boolean | null;
./src/components/agent/agentPromptPayloadAdapter.ts:69:export type AgentPromptRecoveryPlan = {
./src/components/agent/agentPromptPayloadAdapter.ts:85:  suggested_actions?: AgentPromptSuggestedAction[];
./src/components/agent/agentPromptPayloadAdapter.ts:86:  requires_confirmation?: boolean | null;
./src/components/agent/agentPromptPayloadAdapter.ts:87:  success_criteria?: string | null;
./src/components/agent/agentPromptPayloadAdapter.ts:95:export type AgentPromptPayload = {
./src/components/agent/agentPromptPayloadAdapter.ts:96:  schema_version?: string;
./src/components/agent/agentPromptPayloadAdapter.ts:109:  detected_cases?: AgentPromptDetectedCase[];
./src/components/agent/agentPromptPayloadAdapter.ts:110:  suggested_actions?: AgentPromptSuggestedAction[];
./src/components/agent/agentPromptPayloadAdapter.ts:111:  recovery_plans?: AgentPromptRecoveryPlan[];
./src/components/agent/agentPromptPayloadAdapter.ts:134:  if (typeof action.requires_confirmation === "boolean") return action.requires_confirmation;
./src/components/agent/agentPromptPayloadAdapter.ts:139:function actionsForCase(payload: AgentPromptPayload, caseKey: string) {
./src/components/agent/agentPromptPayloadAdapter.ts:140:  return (payload.suggested_actions || [])
./src/components/agent/agentPromptPayloadAdapter.ts:145:      requires_confirmation: actionRequiresConfirmation(action),
./src/components/agent/agentPromptPayloadAdapter.ts:149:function fallbackActionsFromCase(payload: AgentPromptPayload, detectedCase: AgentPromptDetectedCase) {
./src/components/agent/agentPromptPayloadAdapter.ts:159:      requires_confirmation: true,
./src/components/agent/agentPromptPayloadAdapter.ts:191:function normalizeRecoveryPlan(plan: AgentPromptRecoveryPlan, payload: AgentPromptPayload): AgentRecoveryPlan {
./src/components/agent/agentPromptPayloadAdapter.ts:196:    plan.suggested_actions && plan.suggested_actions.length > 0
./src/components/agent/agentPromptPayloadAdapter.ts:197:      ? plan.suggested_actions.map((action) => ({
./src/components/agent/agentPromptPayloadAdapter.ts:200:          requires_confirmation: actionRequiresConfirmation(action),
./src/components/agent/agentPromptPayloadAdapter.ts:221:    suggested_actions:
./src/components/agent/agentPromptPayloadAdapter.ts:228:              requires_confirmation: true,
./src/components/agent/agentPromptPayloadAdapter.ts:246:  payload: AgentPromptPayload,
./src/components/agent/agentPromptPayloadAdapter.ts:247:): AgentRecoveryPlan {
./src/components/agent/agentPromptPayloadAdapter.ts:283:    suggested_actions: fallbackActionsFromCase(payload, detectedCase),
./src/components/agent/agentPromptPayloadAdapter.ts:286:      message: "Este plan fue generado localmente desde detected_cases hasta conectar el agente real.",
./src/components/agent/agentPromptPayloadAdapter.ts:292:export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
./src/components/agent/agentPromptPayloadAdapter.ts:295:  const realRecoveryPlans = payload.recovery_plans || [];
./src/components/agent/agentPromptPayloadAdapter.ts:301:  return (payload.detected_cases || []).map((detectedCase) =>
./src/components/agent/agentPromptPayloadAdapter.ts:306:export function getAgentPayloadLastAnalysisLabel(payload?: AgentPromptPayload | null) {
./src/components/agent/AgentCommandWidget.tsx:8:export type AgentRecoveryPlan = {
./src/components/agent/AgentCommandWidget.tsx:18:  suggested_actions: Array<{
./src/components/agent/AgentCommandWidget.tsx:21:    requires_confirmation: boolean;
./src/components/agent/AgentCommandWidget.tsx:31:  plans?: AgentRecoveryPlan[];
./src/components/agent/AgentCommandWidget.tsx:36:  onApprovePlan?: (plan: AgentRecoveryPlan) => void | Promise<void>;
./src/components/agent/AgentCommandWidget.tsx:37:  onSelectPlan?: (plan: AgentRecoveryPlan) => void;
./src/components/agent/AgentCommandWidget.tsx:77:const demoPlans: AgentRecoveryPlan[] = [
./src/components/agent/AgentCommandWidget.tsx:102:    suggested_actions: [
./src/components/agent/AgentCommandWidget.tsx:106:        requires_confirmation: true,
./src/components/agent/AgentCommandWidget.tsx:111:        requires_confirmation: true,
./src/components/agent/AgentCommandWidget.tsx:191:function inferIcon(plan: AgentRecoveryPlan): AgentIconName {
./src/components/agent/AgentCommandWidget.tsx:204:function getPlanTheme(plan: AgentRecoveryPlan): WidgetTheme {
./src/components/agent/AgentCommandWidget.tsx:212:function getImpactPills(plan: AgentRecoveryPlan) {
./src/components/agent/AgentCommandWidget.tsx:218:    plan.suggested_actions.some((action) => action.requires_confirmation)
./src/components/agent/AgentCommandWidget.tsx:226:function buildExecutionStream(plan: AgentRecoveryPlan) {
./src/components/agent/AgentCommandWidget.tsx:347:      { label: "Acciones", value: String(selectedPlan.suggested_actions.length) },
./src/components/agent/AgentCommandWidget.tsx:410:                  {selectedPlan.suggested_actions[0]?.label || "Resolver con Autopilot"}
./src/components/agent/index.ts:17:  AgentRecoveryPlan,
./src/components/agent/index.ts:23:  AgentPromptPayload,
./src/components/agent/index.ts:25:  AgentPromptRecoveryPlan,
./src/lib/crm/agent-plan-generation.ts:227:      suggested_actions: reservedAgentPlan.actions,
./src/lib/crm/agent-plan-generation.ts:253:          expected_output: "recovery_plans",
./src/lib/crm/agent-plan-generation.ts:256:        recovery_plans: [],
./src/lib/crm/agent-plans.ts:62:  suggested_actions: AttentionRecommendedAction[];
./src/lib/crm/agent-plans.ts:103:  suggested_actions: AttentionRecommendedAction[];
./src/lib/agentClient.ts:60:  suggested_actions?: AgentPlanAction[] | null;
./src/lib/agentClient.ts:278:export type AgentPromptPayloadRow = {
./src/lib/agentClient.ts:288:export type FetchAgentPromptPayloadOptions = {
./src/lib/agentClient.ts:293:export type FetchAgentPromptPayloadResult = {
./src/lib/agentClient.ts:294:  row: AgentPromptPayloadRow | null;
./src/lib/agentClient.ts:299:export async function fetchAgentPromptPayload(
./src/lib/agentClient.ts:300:  options: FetchAgentPromptPayloadOptions = {},
./src/lib/agentClient.ts:301:): Promise<FetchAgentPromptPayloadResult> {
./src/lib/agentClient.ts:322:  const row = (data || null) as AgentPromptPayloadRow | null;
./src/lib/agentClient.ts:334:  const nestedPayload = context.agent_prompt_payload;
./apps/agent-worker/src/agent-operating-context.ts:137:		requires_confirmation:
./apps/agent-worker/src/agent-operating-context.ts:140:				: typeof action?.requires_confirmation === 'boolean'
./apps/agent-worker/src/agent-operating-context.ts:141:					? action.requires_confirmation
./apps/agent-worker/src/agent-operating-context.ts:158:		const actions = plan?.suggested_actions || plan?.generated_plan?.actions || [];
./apps/agent-worker/src/agent-operating-context.ts:193:			suggested_actions: actions.map(compactActionForAgent),
./apps/agent-worker/src/agent-operating-context.ts:221:		suggested_actions: (plan?.suggested_actions || []).map(compactActionForAgent),
./apps/agent-worker/src/agent-operating-context.ts:320:			actions: plan.generated_plan?.actions || plan.suggested_actions || [],
./apps/agent-worker/src/agent-operating-context.ts:347:		schema_version: contextVersion(),
./apps/agent-worker/src/agent-operating-context.ts:392:		detected_cases: detectedCases,
./apps/agent-worker/src/agent-operating-context.ts:403:				read_from: 'detected_cases',
./apps/agent-worker/src/agent-operating-context.ts:404:				write_to: 'recovery_plans',
./apps/agent-worker/src/agent-operating-context.ts:411:			expected_output: 'recovery_plans',
./apps/agent-worker/src/agent-operating-context.ts:412:			notes: 'El CRM detecta casos. El agente futuro debe crear planes de sanación usando detected_cases.',
./apps/agent-worker/src/agent-operating-context.ts:414:		recovery_plans: [],
./apps/agent-worker/src/agent-daily-plans.ts:95:	suggested_actions: WorkerAction[];
./apps/agent-worker/src/agent-daily-plans.ts:997:			suggested_actions: reservedAgentPlan.actions,
./apps/agent-worker/src/agent-daily-plans.ts:1034:					expected_output: 'recovery_plans',
./apps/agent-worker/src/agent-daily-plans.ts:1037:				recovery_plans: [],
./supabase/migrations/20260705133000_agent_daily_plans.sql:17:  suggested_actions jsonb not null default '[]'::jsonb,
```

## Current adapter types

```ts
import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";

export type AgentPromptSeverity = "critical" | "high" | "medium" | "low" | string;

export type AgentPromptSuggestedAction = {
  action_id?: string | null;
  case_key?: string | null;
  type?: string | null;
  label?: string | null;
  reason?: string | null;
  module?: string | null;
  priority?: AgentPromptSeverity | null;
  requires_confirmation?: boolean | null;
  requiresConfirmation?: boolean | null;
  target?: {
    type?: string | null;
    id?: string | null;
    label?: string | null;
    href?: string | null;
    status?: string | null;
  } | null;
  payload?: Record<string, string | number | boolean | null> | null;
};

export type AgentPromptDetectedCase = {
  case_key?: string | null;
  case_type?: string | null;
  severity?: AgentPromptSeverity | null;
  title?: string | null;
  summary?: string | null;
  message?: string | null;
  diagnosis?: string | null;
  bucket?: string | null;
  kind?: string | null;
  score?: number | null;
  source?: {
    module?: string | null;
    type?: string | null;
    id?: string | null;
    label?: string | null;
    href?: string | null;
  } | null;
  people?: {
    client?: string | null;
    lead?: string | null;
    project?: string | null;
  } | null;
  timing?: {
    due_at?: string | null;
    next_reminder_at?: string | null;
    last_reminded_at?: string | null;
    reminder_count?: number | null;
  } | null;
  money?: {
    amount?: string | number | null;
  } | null;
  reason?: string | null;
  recommendation?: string | null;
  available_action_ids?: string[];
  references?: {
    source_event_ids?: string[];
    source_memory_keys?: string[];
    source_modules?: string[];
    full_record_table?: string | null;
    full_record_id?: string | null;
  } | null;
};

export type AgentPromptRecoveryPlan = {
  case_key?: string | null;
  plan_title?: string | null;
  title?: string | null;
  priority?: AgentPromptSeverity | null;
  severity?: AgentPromptSeverity | null;
  message?: string | null;
  diagnosis?: string | null;
  recommended_steps?: Array<{
    title?: string | null;
    description?: string | null;
  }>;
  plan_steps?: Array<{
    title?: string | null;
    description?: string | null;
  }>;
  suggested_actions?: AgentPromptSuggestedAction[];
  requires_confirmation?: boolean | null;
  success_criteria?: string | null;
  result?: {
    title?: string | null;
    message?: string | null;
    data?: Array<{ label?: string | null; value?: string | number | null }>;
  } | null;
};

export type AgentPromptPayload = {
  schema_version?: string;
  generated_at?: string;
  cycle?: {
    date?: string;
    period?: string;
    timezone?: string;
    company_id?: string;
    user_id?: string;
  };
  summary?: {
    headline?: string;
    counts?: Record<string, number>;
  };
  detected_cases?: AgentPromptDetectedCase[];
  suggested_actions?: AgentPromptSuggestedAction[];
  recovery_plans?: AgentPromptRecoveryPlan[];
  constraints?: unknown;
  action_contract?: unknown;
  output_contract?: unknown;
  references?: unknown;
};

function normalizeSeverity(value?: AgentPromptSeverity | null): AgentSeverity {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "critical" || normalized === "crítico" || normalized === "critico") return "critical";
  if (normalized === "high" || normalized === "alta" || normalized === "alto") return "high";
  if (normalized === "medium" || normalized === "media" || normalized === "medio") return "medium";

  return "low";
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();
  return text || fallback;
}

function actionRequiresConfirmation(action: AgentPromptSuggestedAction) {
  if (typeof action.requires_confirmation === "boolean") return action.requires_confirmation;
  if (typeof action.requiresConfirmation === "boolean") return action.requiresConfirmation;
  return true;
}

function actionsForCase(payload: AgentPromptPayload, caseKey: string) {
  return (payload.suggested_actions || [])
    .filter((action) => action.case_key === caseKey)
    .map((action) => ({
      type: cleanText(action.type, "review_record"),
      label: cleanText(action.label, "Revisar caso"),
      requires_confirmation: actionRequiresConfirmation(action),
    }));
}

function fallbackActionsFromCase(payload: AgentPromptPayload, detectedCase: AgentPromptDetectedCase) {
  const caseKey = cleanText(detectedCase.case_key, "unknown_case");
  const directActions = actionsForCase(payload, caseKey);

  if (directActions.length > 0) return directActions;

  return [
    {
      type: "review_record",
      label: "Revisar caso",
      requires_confirmation: true,
    },
  ];
}

function buildStepsFromDetectedCase(detectedCase: AgentPromptDetectedCase) {
  const sourceModule = detectedCase.source?.module || detectedCase.references?.source_modules?.[0] || "CRM";
  const recommendation = detectedCase.recommendation || "Definir el próximo paso antes de ejecutar acciones.";

  return [
    {
      title: "Diagnóstico",
      description: cleanText(
        detectedCase.reason || detectedCase.summary,
        "Revisar el caso detectado y validar por qué requiere atención.",
      ),
    },
    {
      title: "Contexto",
      description: `Validar información en ${sourceModule}, incluyendo estado, responsable, cliente y fechas relevantes.`,
    },
    {
```
## AgentCommandWidget props

```txt
4:export type AgentWidgetMode = "compact" | "review" | "executing" | "result";
6:export type AgentSeverity = "critical" | "high" | "medium" | "low";
8:export type AgentRecoveryPlan = {
30:type AgentCommandWidgetProps = {
237:export function AgentCommandWidget({
```

### Top of AgentCommandWidget.tsx
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
```
## AgentCommandWidgetConnected

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
## fetchAgentPromptPayload

```txt
278:export type AgentPromptPayloadRow = {
288:export type FetchAgentPromptPayloadOptions = {
293:export type FetchAgentPromptPayloadResult = {
294:  row: AgentPromptPayloadRow | null;
299:export async function fetchAgentPromptPayload(
300:  options: FetchAgentPromptPayloadOptions = {},
301:): Promise<FetchAgentPromptPayloadResult> {
322:  const row = (data || null) as AgentPromptPayloadRow | null;
```

### fetchAgentPromptPayload block
```ts
  return {
    cycleDate: payload.data?.cycle_date || options.cycleDate || null,
    plans: payload.data?.plans || [],
    snapshot: payload.data?.snapshot || null,
    message: payload.message || null,
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

```
## Backend payload generation

```txt
128:const AGENT_BRIEF_VERSION = 'agent_brief_v1';
155:function compactDetectedCasesFromPlans(plans: any[]) {
200:				system_should_generate_plans: false,
201:				agent_should_generate_plans: true,
212:function compactPlansForCompatibility(plans: any[]) {
229:			system_should_generate_plans: false,
230:			agent_should_generate_plans: true,
267:function timelineGroupsFromPlans(plans: any[]) {
286:function recentChangesFromPlans(plans: any[]) {
330:	plans: any[];
335:	const detectedCases = compactDetectedCasesFromPlans(plans);
336:	const compactPlans = compactPlansForCompatibility(plans);
360:			should_prepare_plans: plans.length > 0,
392:		detected_cases: detectedCases,
393:		agent_brief: {
394:			version: AGENT_BRIEF_VERSION,
397:			rules: {
398:				system_should_generate_plans: false,
399:				agent_should_generate_plans: true,
403:				read_from: 'detected_cases',
404:				write_to: 'recovery_plans',
411:			expected_output: 'recovery_plans',
412:			notes: 'El CRM detecta casos. El agente futuro debe crear planes de sanación usando detected_cases.',
414:		recovery_plans: [],
415:		rules: {
416:			system_should_generate_plans: false,
417:			agent_should_generate_plans: true,
420:		plans: compactPlans,
426:			hard_rules: [
433:				format: 'daily_agent_briefing',
481:			plans: plans.map((plan: any) => ({
570:			plans: plansResult.data?.plans || [],
```

### contextJson area estimate
```ts
			should_prepare_plans: plans.length > 0,
			should_execute_without_confirmation: false,
		},
		summary: {
			headline: snapshot.headline || 'No hay eventos de atención activos.',
			counts: snapshot.counts || {
				total: 0,
				critical: 0,
				high: 0,
				medium: 0,
				low: 0,
				overdue: 0,
				dueToday: 0,
				upcoming: 0,
				recent: 0,
				open: 0,
			},
			guidance,
		},
		top_priorities: topPriorities,
		risks,
		upcoming_commitments: upcomingCommitments,
		recent_changes: recentChangesFromPlans(plans),
		stale_opportunities: staleOpportunities,
		timeline: {
			groups: timelineGroupsFromPlans(plans),
		},
		module_summaries: moduleSummaries,
		action_queue: actionQueue,
		notifications: {
			drafts: notifications,
		},
		detected_cases: detectedCases,
		agent_brief: {
			version: AGENT_BRIEF_VERSION,
			mission: 'Evaluar casos detectados y preparar planes de sanación cuando el agente esté instalado.',
			counts: agentBriefCounts,
			rules: {
				system_should_generate_plans: false,
				agent_should_generate_plans: true,
				execute_without_confirmation: false,
			},
			input_contract: {
				read_from: 'detected_cases',
				write_to: 'recovery_plans',
				full_details_table: 'agent_daily_plans',
			},
		},
		agent_workspace: {
			status: 'reserved_for_future_agent',
			agent_enabled: false,
			expected_output: 'recovery_plans',
			notes: 'El CRM detecta casos. El agente futuro debe crear planes de sanación usando detected_cases.',
		},
		recovery_plans: [],
		rules: {
			system_should_generate_plans: false,
			agent_should_generate_plans: true,
			execute_without_confirmation: false,
		},
		plans: compactPlans,
		memory: {
			entries: memoryEntries,
		},
		agent_instructions: {
			mission: 'Analiza este contexto operativo del CRM y prepara planes accionables, claros y priorizados para mostrar al usuario.',
			hard_rules: [
				'No ejecutes acciones sin confirmación explícita del usuario.',
				'No inventes datos que no estén en este contexto.',
				'Prioriza riesgos críticos, eventos atrasados y compromisos de hoy antes de optimizaciones menores.',
				'Si propones acciones, usa primero las acciones sugeridas ya incluidas en este contexto.',
			],
			expected_output: {
				format: 'daily_agent_briefing',
				include: [
					'caso principal',
					'por qué importa',
					'plan paso a paso',
					'acciones sugeridas',
					'riesgos de no actuar',
					'qué puede aprobar el usuario',
				],
			},
		},
	};
}

export async function refreshAgentOperatingContext(ctx: ToolContext, options: AgentOperatingContextOptions = {}) {
	const now = options.now || new Date();
	const cycleDate = options.cycleDate || localDateKey(now);
	const syncResult = await syncDailyAgentPlans(ctx, {
```
## Legacy duplicated sections

- `plans:`: 28 occurrence(s)
- `timeline`: 94 occurrence(s)
- `recent_changes`: 1 occurrence(s)
- `module_summaries`: 1 occurrence(s)
- `top_priorities`: 1 occurrence(s)
- `risks`: 69 occurrence(s)
- `action_queue`: 1 occurrence(s)
- `notifications`: 116 occurrence(s)
- `agent_workspace`: 3 occurrence(s)
- `agent_instructions`: 1 occurrence(s)
## Proposed final contract

```json
{
  "schema_version": "agent_widget_contract_v1",
  "status": "ready",
  "generated_at": "2026-07-05T20:00:00.000Z",
  "summary": {
    "total_cases": 12,
    "critical": 3,
    "high": 5,
    "medium": 2,
    "low": 2
  },
  "recovery_plans": [
    {
      "case_key": "risk::tasks::task::123",
      "case_type": "task_overdue",
      "plan_title": "Sanar tarea vencida",
      "severity": "critical",
      "message": "Encontré una tarea vencida que puede afectar el cumplimiento.",
      "diagnosis": "La tarea está vencida y puede afectar el seguimiento del cliente o la entrega interna.",
      "recommended_steps": [
        {
          "title": "Confirmar estado",
          "description": "Verificar si la tarea ya fue completada fuera del CRM."
        },
        {
          "title": "Reprogramar o reasignar",
          "description": "Si no fue completada, mover la fecha y asignar un responsable."
        }
      ],
      "suggested_actions": [
        {
          "action_id": "reschedule_task::123",
          "type": "reschedule_task",
          "label": "Reprogramar tarea",
          "requires_confirmation": true,
          "payload": {
            "task_id": "123",
            "new_due_date": "2026-07-08"
          }
        }
      ],
      "requires_confirmation": true,
      "success_criteria": "La tarea queda completada, reprogramada o reasignada con responsable claro."
    }
  ]
}
```

## Proposed TypeScript types

```ts
export type AgentWidgetContractStatus =
  | "idle"
  | "analyzing"
  | "ready"
  | "executing"
  | "done"
  | "error";

export type AgentWidgetSeverity = "critical" | "high" | "medium" | "low";

export type AgentWidgetContractSummary = {
  total_cases: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type AgentWidgetRecommendedStep = {
  title: string;
  description: string;
};

export type AgentWidgetSuggestedAction = {
  action_id: string;
  type: string;
  label: string;
  requires_confirmation: boolean;
  payload?: Record<string, string | number | boolean | null>;
};

export type AgentWidgetRecoveryPlan = {
  case_key: string;
  case_type?: string;
  plan_title: string;
  severity: AgentWidgetSeverity;
  message?: string;
  diagnosis: string;
  recommended_steps: AgentWidgetRecommendedStep[];
  suggested_actions: AgentWidgetSuggestedAction[];
  requires_confirmation: boolean;
  success_criteria: string;
};

export type AgentWidgetContractV1 = {
  schema_version: "agent_widget_contract_v1";
  status: AgentWidgetContractStatus;
  generated_at: string;
  summary: AgentWidgetContractSummary;
  recovery_plans: AgentWidgetRecoveryPlan[];
};
```

## Build smoke check

- OK: `npm run build` passed.
## Recommendations

- PENDING: No existe todavía un tipo/contrato explícito `agent_widget_contract_v1` en el código.
- OK: El widget conectado ya existe y/o está montado.
- OK: Existe `fetchAgentPromptPayload` o referencias al fetch del payload.
- OK: Hay referencias actuales a `recovery_plans`.
- NEXT: Implementar Fase 4A creando `src/components/agent/agentWidgetContract.ts`.
- NEXT: Actualizar adapter para aceptar explícitamente `AgentWidgetContractV1`.
- NEXT: Mantener compatibilidad temporal con `agent_prompt_payload.detected_cases` hasta instalar el agente real.
