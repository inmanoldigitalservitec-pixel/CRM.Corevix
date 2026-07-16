import type { AgentRecoveryPlan,
  AgentSourceRecord,
  AgentRiskLevel, AgentSeverity } from "./AgentCommandWidget";
import {
  isAgentWidgetContractV1,
  type AgentWidgetContractV1,
  type AgentWidgetRecoveryPlan,
} from "./agentWidgetContract";

export type AgentPromptSeverity = "critical" | "high" | "medium" | "low" | string;

export type AgentPromptSuggestedAction = {
  action_id?: string | null;
  id?: string | null;
  case_key?: string | null;
  type?: string | null;
  label?: string | null;
  reason?: string | null;
  module?: string | null;
  priority?: AgentPromptSeverity | null;
  requires_confirmation?: boolean | null;
  requiresConfirmation?: boolean | null;
  risk_level?: "read" | "low_write" | "medium_write" | "sensitive" | string | null;
  required_fields?: string[] | null;
  tool_hint?: string | null;
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

export type AgentPromptSourceRecord = {
  type?: string | null;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
  due_at?: string | null;
  amount?: string | number | null;
  module?: string | null;
};

export type AgentPromptContextRefs = {
  source_event_ids?: string[];
  source_memory_keys?: string[];
  source_modules?: string[];
  full_record_ref?: {
    table?: string | null;
    id?: string | null;
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
  source_context_excerpt?: string | null;
  source_records?: AgentPromptSourceRecord[];
  context_refs?: AgentPromptContextRefs;
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
  status?: string;
  widget_contract?: AgentWidgetContractV1;
  agent_widget_contract?: AgentWidgetContractV1;
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

function normalizeRiskLevel(value: unknown): AgentRiskLevel | undefined {
  const normalized = String(value || "").trim();

  if (
    normalized === "read" ||
    normalized === "low_write" ||
    normalized === "medium_write" ||
    normalized === "sensitive"
  ) {
    return normalized;
  }

  return undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeSourceRecords(records: unknown): AgentSourceRecord[] {
  if (!Array.isArray(records)) return [];

  return records
    .filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object")
    .map((record) => ({
      id: String(record.id || record.record_id || record.uuid || "unknown"),
      type: String(record.type || record.module || record.entity_type || "record"),
      label:
        typeof record.label === "string"
          ? record.label
          : typeof record.name === "string"
            ? record.name
            : typeof record.title === "string"
              ? record.title
              : null,
      module: typeof record.module === "string" ? record.module : null,
      url: typeof record.url === "string" ? record.url : null,
      metadata:
        record.metadata && typeof record.metadata === "object"
          ? (record.metadata as Record<string, unknown>)
          : undefined,
    }));
}

function normalizeSuggestedAction(action: AgentPromptSuggestedAction) {
  return {
    action_id: cleanText(action.action_id || action.id, ""),
    type: cleanText(action.type, "review_record"),
    label: cleanText(action.label, "Revisar caso"),
    reason: action.reason || null,
    module: action.module || null,
    priority: action.priority ? normalizeSeverity(action.priority) : null,
    requires_confirmation: actionRequiresConfirmation(action),
    risk_level: normalizeRiskLevel(action.risk_level),
    required_fields: normalizeStringArray(action.required_fields),
    tool_hint: action.tool_hint || null,
    target: action.target
      ? {
          type: action.target.type || null,
          id: action.target.id || null,
          label: action.target.label || null,
          href: action.target.href || null,
          status: action.target.status || null,
        }
      : null,
    payload: action.payload || undefined,
  };
}

function actionsForCase(payload: AgentPromptPayload, caseKey: string) {
  return (payload.suggested_actions || [])
    .filter((action) => action.case_key === caseKey)
    .map(normalizeSuggestedAction);
}

function fallbackActionsFromCase(
  payload: AgentPromptPayload,
  detectedCase: AgentPromptDetectedCase,
): AgentRecoveryPlan["suggested_actions"] {
  const caseKey = cleanText(detectedCase.case_key, "unknown_case");
  const directActions = actionsForCase(payload, caseKey);

  if (directActions.length > 0) return directActions;

  return [
    {
      type: "review_record",
      label: "Revisar caso",
      requires_confirmation: false,
      risk_level: "read",
      required_fields: [],
      tool_hint: "get_record_by_id",
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
      title: "Acción recomendada",
      description: cleanText(recommendation, "Preparar una acción de seguimiento para este caso."),
    },
    {
      title: "Confirmación",
      description: "Solicitar aprobación antes de ejecutar cambios, mensajes o actualizaciones en el CRM.",
    },
  ];
}


function normalizeWidgetContractRecoveryPlan(plan: AgentWidgetRecoveryPlan): AgentRecoveryPlan {
  const steps = plan.plan_steps || plan.recommended_steps || [];
  const actions = plan.suggested_actions || plan.actions || [];

  return {
    case_key: cleanText(plan.case_key, "unknown_case"),
    case_type: plan.case_type,
    title: cleanText(plan.plan_title, "Caso detectado"),
    severity: normalizeSeverity(plan.severity),
    message: cleanText(
      plan.message,
      "El agente detectó un caso que requiere atención.",
    ),
    diagnosis: cleanText(
      plan.diagnosis,
      "Este caso requiere revisión y una acción controlada.",
    ),
    source_context_excerpt: plan.source_context_excerpt || "",
    source_records: normalizeSourceRecords(plan.source_records),
    context_refs: plan.context_refs,
    plan_steps:
      steps.length > 0
        ? steps.map((step) => ({
            title: cleanText(step.title, "Paso"),
            description: cleanText(step.description, "Ejecutar este paso con validación."),
          }))
        : [
            { title: "Diagnóstico", description: "Validar el caso detectado y su nivel de prioridad." },
            { title: "Preparación", description: "Preparar la acción recomendada antes de ejecutarla." },
            { title: "Confirmación", description: "Solicitar aprobación antes de modificar datos o contactar clientes." },
          ],
    suggested_actions: actions.map(normalizeSuggestedAction),
    result: {
      title: "Criterio de éxito",
      message: cleanText(
        plan.success_criteria,
        "El caso queda resuelto o con el próximo paso definido.",
      ),
      data: [
        { label: "Confirmación", value: plan.requires_confirmation ? "Requerida" : "No requerida" },
        { label: "Severidad", value: cleanText(plan.severity, "low") },
      ],
    },
  };
}

function normalizeRecoveryPlan(plan: AgentPromptRecoveryPlan, payload: AgentPromptPayload): AgentRecoveryPlan {
  const caseKey = cleanText(plan.case_key, `recovery_plan_${Math.random().toString(36).slice(2)}`);
  const steps = plan.plan_steps || plan.recommended_steps || [];

  const suggestedActions =
    plan.suggested_actions && plan.suggested_actions.length > 0
      ? plan.suggested_actions.map(normalizeSuggestedAction)
      : actionsForCase(payload, caseKey);

  return {
    case_key: caseKey,
    case_type: undefined,
    title: cleanText(plan.plan_title || plan.title, "Caso detectado"),
    severity: normalizeSeverity(plan.priority || plan.severity),
    message: cleanText(plan.message, "El agente detectó un caso que requiere atención."),
    diagnosis: cleanText(plan.diagnosis, "Este caso requiere revisión y una acción controlada."),
    source_context_excerpt: plan.source_context_excerpt || "",
    source_records: normalizeSourceRecords(plan.source_records),
    context_refs: plan.context_refs,
    plan_steps:
      steps.length > 0
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
              requires_confirmation: false,
              risk_level: "read",
              required_fields: [],
              tool_hint: "get_record_by_id",
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
    source_context_excerpt: [
      cleanText(detectedCase.title, "Caso detectado"),
      cleanText(detectedCase.summary, ""),
      cleanText(detectedCase.reason, ""),
      cleanText(detectedCase.recommendation, ""),
    ].filter(Boolean).join("\n").slice(0, 1800),
    source_records: normalizeSourceRecords([
      {
        type: detectedCase.source?.type || detectedCase.source?.module || "record",
        id: detectedCase.source?.id || null,
        label: detectedCase.source?.label || sourceLabel,
        href: detectedCase.source?.href || null,
        due_at: detectedCase.timing?.due_at || null,
        amount: detectedCase.money?.amount ?? null,
        module: detectedCase.source?.module || detectedCase.references?.source_modules?.[0] || null,
      },
    ]),
    context_refs: {
      source_event_ids: detectedCase.references?.source_event_ids || [],
      source_memory_keys: detectedCase.references?.source_memory_keys || [],
      source_modules: detectedCase.references?.source_modules || [],
      full_record_ref: {
        table: detectedCase.references?.full_record_table || null,
        id: detectedCase.references?.full_record_id || null,
      },
    },
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
