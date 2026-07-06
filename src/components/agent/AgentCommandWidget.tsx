import { useEffect, useMemo, useState } from "react";
import { resolveAgentActionIntent, type ResolveAgentActionIntentResponse } from "../../lib/agentClient";
import "./AgentCommandWidget.css";

export type AgentWidgetMode = "compact" | "review" | "decision" | "collecting_fields" | "confirming" | "executing" | "result";

export type AgentSeverity = "critical" | "high" | "medium" | "low";

export type AgentRiskLevel = "read" | "low_write" | "medium_write" | "sensitive";

export type AgentSourceRecord = {
  type: string;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
  due_at?: string | null;
  amount?: string | number | null;
  module?: string | null;
};

export type AgentActionTarget = {
  type?: string | null;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
};

export type AgentRecoveryPlan = {
  case_key: string;
  case_type?: string;
  title: string;
  severity: AgentSeverity;
  message: string;
  diagnosis: string;
  source_context_excerpt?: string;
  source_records?: AgentSourceRecord[];
  context_refs?: {
    source_event_ids?: string[];
    source_memory_keys?: string[];
    source_modules?: string[];
    full_record_ref?: {
      table?: string | null;
      id?: string | null;
    } | null;
  };
  plan_steps: Array<{
    title: string;
    description: string;
  }>;
  suggested_actions: Array<{
    action_id?: string;
    type: string;
    label: string;
    reason?: string | null;
    module?: string | null;
    priority?: AgentSeverity | null;
    requires_confirmation: boolean;
    risk_level?: AgentRiskLevel;
    required_fields?: string[];
    tool_hint?: string | null;
    target?: AgentActionTarget | null;
    payload?: Record<string, string | number | boolean | null>;
  }>;
  result?: {
    title: string;
    message: string;
    data: Array<{ label: string; value: string }>;
  };
};

type AgentSuggestedAction = AgentRecoveryPlan["suggested_actions"][number];

type PendingActionStatus =
  | "selected"
  | "collecting_fields"
  | "ready_to_confirm"
  | "confirmed_mock"
  | "cancelled";

type PendingAgentAction = {
  planCaseKey: string;
  planTitle: string;
  action: AgentSuggestedAction;
  values: Record<string, string>;
  missingFields: string[];
  status: PendingActionStatus;
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
  const availablePlans = plans && plans.length > 0 ? plans : [];
  const hasPlans = availablePlans.length > 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<AgentWidgetMode>("compact");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [streamLines, setStreamLines] = useState<Array<{ text: string; type?: "thinking" | "done" }>>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAgentAction | null>(null);
  const [selectedSuggestedActionId, setSelectedSuggestedActionId] = useState<string>("");
  const [customAutopilotInstruction, setCustomAutopilotInstruction] = useState("");
  const [resolvedIntent, setResolvedIntent] = useState<ResolveAgentActionIntentResponse | null>(null);
  const [isResolvingIntent, setIsResolvingIntent] = useState(false);


  const selectedPlan = availablePlans[Math.min(selectedIndex, availablePlans.length - 1)] || {
    case_key: "system::all_clear",
    title: "Todo está bien por ahora",
    severity: "low",
    message: "No encontré acciones pendientes que requieran intervención del agente.",
    diagnosis: "El agente no tiene contratos activos para mostrar en este momento.",
    plan_steps: [
      {
        title: "Sin acciones críticas",
        description: "Cuando el agente detecte algo importante, aparecerá aquí con un plan claro."
      }
    ],
    suggested_actions: [],
    result: {
      title: "Sistema estable",
      message: "No hay planes de recuperación pendientes.",
      data: [
        { label: "Estado", value: "Todo bien" }
      ]
    }
  };

  const theme = useMemo(() => getPlanTheme(selectedPlan), [selectedPlan]);
  const impactPills = useMemo(() => getImpactPills(selectedPlan), [selectedPlan]);
  const stream = useMemo(() => buildExecutionStream(selectedPlan), [selectedPlan]);

  const rootClassName = [
    "agent-command-widget",
    mode === "compact" ? "compact" : "",
    mode === "executing" || mode === "result" ? "executing" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (availablePlans.length <= 1) return;
    if (mode !== "compact") return;

    const timer = window.setInterval(() => {
      setIsTransitioning(true);

      window.setTimeout(() => {
        setSelectedIndex((current) => (current + 1) % availablePlans.length);
        setIsTransitioning(false);
      }, 280);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [availablePlans.length, mode]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [plans?.length]);

  async function handleAnalyzeNow() {
    if (isAnalyzing || isLoading) return;

    setIsAnalyzing(true);

    try {
      await onAnalyzeNow?.();
      setSelectedIndex(0);
      setMode("compact");
    } finally {
      window.setTimeout(() => setIsAnalyzing(false), 450);
    }
  }

  function getSuggestedActionKey(action: AgentSuggestedAction, index: number) {
    return (
      action.action_id ||
      `${action.type || "action"}-${action.tool_hint || "tool"}-${index}`
    );
  }

  function getHumanFieldLabel(field: string) {
    const normalized = field.toLowerCase();

    const labels: Record<string, string> = {
      client_id: "cliente",
      lead_id: "prospecto",
      task_id: "tarea",
      project_id: "proyecto",
      invoice_id: "factura",
      proposal_id: "propuesta",
      assignee_id: "responsable",
      owner_id: "responsable",
      responsible_id: "responsable",
      new_due_date: "nueva fecha",
      due_at: "fecha",
      dueAt: "fecha",
      message: "mensaje",
      body: "mensaje",
      amount: "monto",
      reason: "razón",
    };

    return labels[field] || labels[normalized] || field.replace(/_/g, " ");
  }

  function getSourceRecordIdForField(plan: AgentRecoveryPlan, field: string) {
    const normalized = field.toLowerCase();
    const sourceRecords = plan.source_records || [];

    const wantedType =
      normalized === "client_id"
        ? "client"
        : normalized === "lead_id"
          ? "lead"
          : normalized === "task_id"
            ? "task"
            : normalized === "project_id"
              ? "project"
              : normalized === "invoice_id"
                ? "invoice"
                : normalized === "proposal_id"
                  ? "proposal"
                  : "";

    if (!wantedType) return "";

    const record = sourceRecords.find((item) => {
      const type = String(item.type || "").toLowerCase();
      const module = String(item.module || "").toLowerCase();

      return (
        type === wantedType ||
        module === wantedType ||
        module === `${wantedType}s`
      );
    });

    return record?.id ? String(record.id).trim() : "";
  }

  function getTargetIdForField(action: AgentSuggestedAction, field: string) {
    const normalized = field.toLowerCase();
    const targetType = String(action.target?.type || "").toLowerCase();
    const targetId = action.target?.id ? String(action.target.id).trim() : "";

    if (!targetId) return "";

    if (normalized === "client_id" && targetType === "client") return targetId;
    if (normalized === "lead_id" && targetType === "lead") return targetId;
    if (normalized === "task_id" && targetType === "task") return targetId;
    if (normalized === "project_id" && targetType === "project") return targetId;
    if (normalized === "invoice_id" && targetType === "invoice") return targetId;
    if (normalized === "proposal_id" && targetType === "proposal") return targetId;

    if (normalized === "target_id") return targetId;

    return "";
  }

  function getInferredRequiredFieldValue(
    plan: AgentRecoveryPlan,
    action: AgentSuggestedAction,
    field: string,
    values: Record<string, string> = {},
  ) {
    const directValue = values[field];

    if (directValue) return directValue;

    const payloadValue = getActionPayloadValue(action, field);

    if (payloadValue) return payloadValue;

    const targetValue = getTargetIdForField(action, field);

    if (targetValue) return targetValue;

    const sourceRecordValue = getSourceRecordIdForField(plan, field);

    if (sourceRecordValue) return sourceRecordValue;

    return "";
  }

  function getActionPayloadValue(action: AgentSuggestedAction, field: string) {
    const payload = action.payload || {};
    const value = payload[field];

    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function getMissingRequiredFields(
    plan: AgentRecoveryPlan,
    action: AgentSuggestedAction,
    values: Record<string, string> = {},
  ) {
    return (action.required_fields || [])
      .map((field) => String(field || "").trim())
      .filter(Boolean)
      .filter((field) => {
        const providedValue = getInferredRequiredFieldValue(plan, action, field, values);
        return !String(providedValue || "").trim();
      });
  }

  function buildPendingAction(
    plan: AgentRecoveryPlan,
    action: AgentSuggestedAction,
    values: Record<string, string> = {},
  ): PendingAgentAction {
    const missingFields = getMissingRequiredFields(plan, action, values);

    return {
      planCaseKey: plan.case_key,
      planTitle: plan.title,
      action,
      values,
      missingFields,
      status: missingFields.length > 0 ? "collecting_fields" : "ready_to_confirm",
    };
  }

  function handleTogglePlan() {
    if (!hasPlans) return;
    setMode((current) => (current === "compact" ? "review" : "compact"));
  }

  function getFieldPrompt(field: string, action: AgentSuggestedAction) {
    const normalized = field.toLowerCase();
    const targetLabel = action.target?.label || action.label || action.type;

    if (normalized === "client_id") {
      return `¿A qué cliente quieres relacionar "${targetLabel}"?`;
    }

    if (normalized === "lead_id") {
      return `¿A qué prospecto quieres relacionar "${targetLabel}"?`;
    }

    if (normalized === "task_id") {
      return "¿A qué tarea quieres relacionar esta acción?";
    }

    if (normalized === "project_id") {
      return `¿A qué proyecto quieres relacionar "${targetLabel}"?`;
    }

    if (normalized === "invoice_id") {
      return "¿A qué factura quieres relacionar esta acción?";
    }

    if (normalized === "proposal_id") {
      return "¿A qué propuesta quieres relacionar esta acción?";
    }

    if (normalized === "new_due_date" || normalized === "due_at" || normalized === "dueat") {
      return `¿Para qué fecha quieres mover "${targetLabel}"?`;
    }

    if (normalized === "assignee_id" || normalized === "owner_id" || normalized === "responsible_id") {
      return `¿A quién quieres asignar "${targetLabel}"?`;
    }

    if (normalized === "message" || normalized === "body") {
      return "¿Qué mensaje quieres usar?";
    }

    if (normalized === "amount") {
      return "¿Qué monto debo usar?";
    }

    if (normalized === "reason") {
      return "¿Cuál es la razón o nota para esta acción?";
    }

    return `Falta ${getHumanFieldLabel(field)}. ¿Qué valor debo usar?`;
  }

  function getActionValueForConfirmation(
    action: AgentSuggestedAction,
    values: Record<string, string>,
    field: string,
  ) {
    return values[field] || getActionPayloadValue(action, field) || "pendiente";
  }

  function buildConfirmationMessage(
    plan: AgentRecoveryPlan,
    action: AgentSuggestedAction,
    values: Record<string, string>,
  ) {
    const requiredFields = action.required_fields || [];
    const fieldLines = requiredFields.length
      ? requiredFields
          .map((field) => `${getHumanFieldLabel(field)}: ${getActionValueForConfirmation(action, values, field)}`)
          .join("\n")
      : "No faltan campos requeridos.";

    return [
      "Corevix Autopilot",
      "",
      `Caso: ${plan.title}`,
      `Acción: ${action.label || action.type}`,
      `Tool: ${action.tool_hint || "sin tool"}`,
      `Riesgo: ${action.risk_level || "medium_write"}`,
      "",
      "Campos:",
      fieldLines,
      "",
      "¿Confirmas esta intención?",
    ].join("\n");
  }

  function getPrimarySuggestedAction(plan: AgentRecoveryPlan) {
    const actions = plan.suggested_actions || [];

    if (actions.length === 0) return null;

    const scored = actions.map((action, index) => {
      const missingFields = getMissingRequiredFields(plan, action);
      const technicalPenalty = missingFields.filter((field) =>
        field.toLowerCase().endsWith("_id"),
      ).length;

      return {
        action,
        index,
        score: missingFields.length + technicalPenalty * 3,
      };
    });

    scored.sort((a, b) => a.score - b.score || a.index - b.index);

    return scored[0]?.action || actions[0] || null;
  }

  function compactJson(value: unknown) {
    try {
      return JSON.stringify(value ?? null, null, 2);
    } catch {
      return "null";
    }
  }

  function formatPlanRecordsForAgent(plan: AgentRecoveryPlan) {
    const records = plan.source_records || [];

    if (!records.length) return "none";

    return records
      .slice(0, 6)
      .map((record, index) => {
        const parts = [
          `${index + 1}. type: ${record.type || "record"}`,
          record.id ? `id: ${record.id}` : "",
          record.label ? `label: ${record.label}` : "",
          record.status ? `status: ${record.status}` : "",
          record.due_at ? `due_at: ${record.due_at}` : "",
          record.amount !== null && record.amount !== undefined ? `amount: ${record.amount}` : "",
          record.module ? `module: ${record.module}` : "",
          record.href ? `href: ${record.href}` : "",
        ].filter(Boolean);

        return parts.join(" | ");
      })
      .join("\n");
  }

  function formatPlanStepsForAgent(plan: AgentRecoveryPlan) {
    const steps = plan.plan_steps || [];

    if (!steps.length) return "none";

    return steps
      .slice(0, 6)
      .map((step, index) => `${index + 1}. ${step.title}: ${step.description}`)
      .join("\n");
  }

  function formatSuggestedActionsForAgent(plan: AgentRecoveryPlan) {
    const actions = plan.suggested_actions || [];

    if (!actions.length) return "none";

    return actions
      .slice(0, 4)
      .map((action, index) => {
        const parts = [
          `${index + 1}. label: ${action.label || action.type}`,
          `type: ${action.type}`,
          action.reason ? `reason: ${action.reason}` : "",
          action.tool_hint ? `tool_hint: ${action.tool_hint}` : "",
          action.risk_level ? `risk_level: ${action.risk_level}` : "",
          action.required_fields?.length ? `required_fields: ${action.required_fields.join(", ")}` : "",
          action.target ? `target: ${compactJson(action.target)}` : "",
          action.payload ? `payload: ${compactJson(action.payload)}` : "",
        ].filter(Boolean);

        return parts.join("\n   ");
      })
      .join("\n");
  }

  function buildAgentPromptFromSelectedPlan(plan: AgentRecoveryPlan) {
    return [
      "ALERTA_CRM:",
      `title: ${plan.title}`,
      `type: ${plan.case_type || "record"}`,
      `severity: ${plan.severity}`,
      `case_key: ${plan.case_key}`,
      "",
      "SNAPSHOT_MESSAGE:",
      plan.message || "none",
      "",
      "SNAPSHOT_DIAGNOSIS:",
      plan.diagnosis || "none",
      "",
      "EVIDENCE:",
      plan.source_context_excerpt || "none",
      "",
      "RELATED_RECORDS:",
      formatPlanRecordsForAgent(plan),
      "",
      "SUGGESTED_ACTIONS:",
      formatSuggestedActionsForAgent(plan),
      "",
      "CONTEXT_REFS:",
      compactJson(plan.context_refs || null),
      "",
      "OPERATING_RULES:",
      "- Trata esta alerta como un snapshot inicial, no como estado definitivo.",
      "- Verifica el estado actual con las tools antes de recomendar o modificar datos.",
      "- Si falta información, pregunta solo lo necesario.",
      "- Si vas a modificar datos del CRM, confirma antes de ejecutar.",
    ].join("\n");
  }

  function launchAgentChatWithSelectedPlan() {
    if (!hasPlans) return;

    onSelectPlan?.(selectedPlan);

    const prompt = buildAgentPromptFromSelectedPlan(selectedPlan);

    try {
      window.sessionStorage.setItem("corevix.autopilot.pendingPrompt", prompt);
      window.sessionStorage.setItem("corevix.autopilot.pendingCaseKey", selectedPlan.case_key);
      window.sessionStorage.setItem("corevix.autopilot.pendingCaseTitle", selectedPlan.title);
    } catch {
      // sessionStorage puede fallar en modo privado; navegamos igual.
    }

    window.location.assign("/ai-assistant?source=autopilot_widget");
  }

  function handleOpenDecisionPanel() {
    // Flujo viejo archivado:
    // antes abría decision/collecting_fields/confirming dentro del widget.
    // ahora el widget solo lanza el caso seleccionado al chat del agente.
    launchAgentChatWithSelectedPlan();
  }

  function getSelectedAutopilotAction(): AgentSuggestedAction | null {
    const customInstruction = customAutopilotInstruction.trim();
    const suggestedActions = selectedPlan.suggested_actions || [];
    const selectedAction =
      suggestedActions.find((candidate, index) => getSuggestedActionKey(candidate, index) === selectedSuggestedActionId) ||
      getPrimarySuggestedAction(selectedPlan);

    if (customInstruction && selectedAction) {
      return {
        ...selectedAction,
        action_id: selectedAction.action_id || "custom_instruction",
        type: selectedAction.type || "custom_instruction",
        label: customInstruction,
        reason: `Instrucción escrita por el usuario: ${customInstruction}`,
        requires_confirmation: true,
        payload: {
          ...(selectedAction.payload || {}),
          user_instruction: customInstruction,
        },
      };
    }

    if (customInstruction) {
      return {
        action_id: "custom_instruction",
        type: "custom_instruction",
        label: customInstruction,
        reason: `Instrucción escrita por el usuario: ${customInstruction}`,
        module: selectedPlan.case_type || null,
        priority: selectedPlan.severity,
        requires_confirmation: true,
        risk_level: "medium_write",
        required_fields: [],
        tool_hint: "custom_instruction",
        target: null,
        payload: {
          user_instruction: customInstruction,
        },
      };
    }

    return selectedAction;
  }

  function getToolDisplayName(toolHint?: string | null, actionLabel?: string | null) {
    const tool = String(toolHint || "").toLowerCase();
    const label = String(actionLabel || "").toLowerCase();

    if (tool === "complete_task") return "Completar tarea";
    if (tool === "reschedule_task") return "Reprogramar tarea";
    if (tool === "get_record_by_id") return "Consultar registro";
    if (tool === "get_task_by_id") return "Consultar tarea";
    if (tool === "create_task") return "Crear tarea";
    if (tool === "draft_email") return "Preparar correo";
    if (tool === "prepare_followup_message") return "Preparar seguimiento";
    if (tool === "prepare_collection_followup") return "Preparar seguimiento de cobro";

    if (label.includes("revisar") && label.includes("tarea")) return "Consultar tarea";
    if (label.includes("cerrar") || label.includes("resuelta")) return "Completar tarea";
    if (label.includes("mover") || label.includes("reprogram")) return "Reprogramar tarea";

    return "Herramienta de Autopilot";
  }

  function buildActionFromResolvedIntent(
    resolved: ResolveAgentActionIntentResponse,
    fallbackAction?: AgentSuggestedAction | null,
  ): AgentSuggestedAction {
    return {
      action_id: resolved.intent.action_id || fallbackAction?.action_id || "resolved_intent",
      type: resolved.intent.type || fallbackAction?.type || "custom_instruction",
      label: resolved.intent.label || fallbackAction?.label || "Acción de Autopilot",
      reason: resolved.intent.reason || fallbackAction?.reason || null,
      module: resolved.intent.module || fallbackAction?.module || selectedPlan.case_type || null,
      priority: fallbackAction?.priority || selectedPlan.severity,
      requires_confirmation: resolved.intent.requires_confirmation !== false,
      risk_level: resolved.intent.risk_level || fallbackAction?.risk_level || "medium_write",
      required_fields: resolved.intent.required_fields || fallbackAction?.required_fields || [],
      tool_hint: resolved.intent.tool_hint || fallbackAction?.tool_hint || null,
      target: (resolved.intent.target as AgentActionTarget | null) || fallbackAction?.target || null,
      payload: {
        ...(fallbackAction?.payload || {}),
        ...(resolved.intent.payload as Record<string, string | number | boolean | null>),
      },
    };
  }

  function buildPendingActionFromResolvedIntent(
    resolved: ResolveAgentActionIntentResponse,
    fallbackAction?: AgentSuggestedAction | null,
  ): PendingAgentAction {
    const action = buildActionFromResolvedIntent(resolved, fallbackAction);
    const missingFields = resolved.missing_fields || [];

    return {
      planCaseKey: resolved.case_key || selectedPlan.case_key,
      planTitle: resolved.case_title || selectedPlan.title,
      action,
      values: resolved.values || {},
      missingFields,
      status: missingFields.length > 0 ? "collecting_fields" : "ready_to_confirm",
    };
  }

  async function resolveCurrentIntent(
    selectedAction: AgentSuggestedAction | null,
    values: Record<string, string> = {},
  ) {
    const resolved = await resolveAgentActionIntent({
      case_key: selectedPlan.case_key,
      case_type: selectedPlan.case_type || null,
      case_title: selectedPlan.title,
      case_summary: selectedPlan.message || selectedPlan.diagnosis,
      user_instruction: customAutopilotInstruction.trim() || null,
      selected_action: selectedAction as unknown as Record<string, unknown> | null,
      suggested_actions: selectedPlan.suggested_actions as unknown as Array<Record<string, unknown>>,
      source_records: (selectedPlan.source_records || []) as unknown as Array<Record<string, unknown>>,
      context_refs: (selectedPlan.context_refs || null) as unknown as Record<string, unknown> | null,
      values,
      plan: selectedPlan as unknown as Record<string, unknown>,
    });

    setResolvedIntent(resolved);

    return resolved;
  }

  function getResolvedFieldQuestion(field: string) {
    return resolvedIntent?.field_questions.find((question) => question.field === field);
  }

  function handlePendingFieldChange(field: string, value: string) {
    setPendingAction((current) => {
      if (!current) return current;

      const values = {
        ...current.values,
        [field]: value,
      };

      const missingFields = getMissingRequiredFields(selectedPlan, current.action, values);

      return {
        ...current,
        values,
        missingFields,
        status: missingFields.length > 0 ? "collecting_fields" : "ready_to_confirm",
      };
    });
  }

  async function handleContinueAfterFields() {
    if (!pendingAction) return;

    setIsResolvingIntent(true);

    try {
      const resolved = await resolveCurrentIntent(pendingAction.action, pendingAction.values);
      const nextPending = buildPendingActionFromResolvedIntent(resolved, pendingAction.action);

      setPendingAction(nextPending);

      if (nextPending.missingFields.length > 0) {
        setMode("collecting_fields");
        return;
      }

      setMode("confirming");
    } catch (error) {
      const finalMissingFields = getMissingRequiredFields(
        selectedPlan,
        pendingAction.action,
        pendingAction.values,
      );

      if (finalMissingFields.length > 0) {
        setPendingAction({
          ...pendingAction,
          missingFields: finalMissingFields,
          status: "collecting_fields",
        });
        return;
      }

      setPendingAction({
        ...pendingAction,
        missingFields: [],
        status: "ready_to_confirm",
      });

      setMode("confirming");
    } finally {
      setIsResolvingIntent(false);
    }
  }

  function handleCancelPendingAction() {
    if (pendingAction) {
      setPendingAction({
        ...pendingAction,
        status: "cancelled",
      });
    }

    setStreamLines([]);
    setShowResult(false);
    setMode("decision");
  }

  function handleConfirmPendingAction() {
    if (!pendingAction) return;

    const confirmedPending: PendingAgentAction = {
      ...pendingAction,
      missingFields: [],
      status: "confirmed_mock",
    };

    setPendingAction(confirmedPending);
    setMode("executing");
    setShowResult(false);

    setStreamLines([
      {
        text: "Confirmación humana recibida.",
        type: "thinking",
      },
      {
        text: `Acción confirmada: ${confirmedPending.action.label || confirmedPending.action.type}`,
      },
      {
        text: `Herramienta sugerida: ${getToolDisplayName(
          confirmedPending.action.tool_hint,
          confirmedPending.action.label,
        )}. Riesgo: ${confirmedPending.action.risk_level || "medium_write"}.`,
      },
      {
        text: "Phase 3B completada. La intención queda confirmada dentro del widget, sin ejecución real.",
        type: "done",
      },
    ]);

    window.setTimeout(() => {
      setMode("result");
      setShowResult(true);
    }, 450);
  }

  async function handleStartExecution() {
    if (!hasPlans || isResolvingIntent) return;

    const selectedAction = getSelectedAutopilotAction();

    setStreamLines([]);
    setShowResult(false);
    onSelectPlan?.(selectedPlan);

    if (!selectedAction && !customAutopilotInstruction.trim()) {
      setPendingAction(null);
      setResolvedIntent(null);
      setStreamLines([
        { text: "No hay una acción sugerida ni una instrucción escrita para este caso.", type: "done" },
      ]);
      setMode("executing");
      return;
    }

    setIsResolvingIntent(true);

    try {
      const resolved = await resolveCurrentIntent(selectedAction, {});
      const nextPending = buildPendingActionFromResolvedIntent(resolved, selectedAction);

      setPendingAction(nextPending);

      if (nextPending.missingFields.length > 0) {
        setMode("collecting_fields");
        return;
      }

      setMode("confirming");
    } catch (error) {
      const fallbackAction = selectedAction;

      if (!fallbackAction) {
        setPendingAction(null);
        setStreamLines([
          {
            text: error instanceof Error
              ? error.message
              : "No se pudo resolver la intención con Autopilot.",
            type: "done",
          },
        ]);
        setMode("executing");
        return;
      }

      const fallbackPending = buildPendingAction(selectedPlan, fallbackAction, {});
      setPendingAction(fallbackPending);

      if (fallbackPending.missingFields.length > 0) {
        setMode("collecting_fields");
        return;
      }

      setMode("confirming");
    } finally {
      setIsResolvingIntent(false);
    }
  }

  const result =
    pendingAction?.status === "confirmed_mock"
      ? {
          title: "Intención confirmada",
          message:
            "La intención fue confirmada dentro del widget. La ejecución real todavía no se ejecuta; se conectará en la próxima fase.",
          data: [
            { label: "Acción", value: pendingAction.action.label || pendingAction.action.type },
            { label: "Herramienta", value: getToolDisplayName(pendingAction.action.tool_hint, pendingAction.action.label) },
            { label: "Riesgo", value: pendingAction.action.risk_level || "medium_write" },
            { label: "Estado", value: "Confirmada sin ejecutar" },
          ],
        }
      : selectedPlan.result || {
    title: "Plan listo",
    message: "El agente preparó el plan de sanación. La ejecución real requiere confirmación.",
    data: [
      { label: "Caso", value: selectedPlan.severity },
      { label: "Acciones", value: String(selectedPlan.suggested_actions.length) },
      { label: "Estado", value: "Pendiente" },
    ],
  };

  return (
    <section
      className={rootClassName}
      style={
        {
          "--agent-accent": theme.color,
          "--agent-soft": theme.soft,
        } as React.CSSProperties
      }
    >
      <div className="agent-widget-top">
        <div className="agent-brand-row">
          <h2>Corevix Autopilot</h2>
          <span className={`agent-active-pill ${isActive ? "is-active" : "is-paused"}`}>
            <span className="agent-active-dot" />
            {isActive ? "Activo" : "Pausado"}
          </span>
          <span className="agent-last-check">{lastAnalysisLabel}</span>
        </div>

        <button className="agent-analyze-btn" type="button" onClick={handleAnalyzeNow} disabled={isAnalyzing || isLoading}>
          {isAnalyzing || isLoading ? "Revisando actividad..." : "Analizar ahora"}
        </button>
      </div>

      <div className="agent-headline">
        {hasPlans ? (
          <>
            Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
          </>
        ) : (
          <>No hay acciones pendientes para resolver ahora.</>
        )}
      </div>

      <div className="agent-review-mode">
        <article className="agent-main-card">
          {mode === "decision" ? (
            <div className="agent-decision-mode">
              <div className="agent-decision-header">
                <span className="agent-section-eyebrow">Autopilot</span>
                <h3>¿Qué quieres hacer con este caso?</h3>
                <p>{selectedPlan.title}</p>
              </div>

              {selectedPlan.suggested_actions.length > 0 ? (
                <div className="agent-suggested-action-list">
                  {selectedPlan.suggested_actions.map((action, index) => {
                    const actionKey = getSuggestedActionKey(action, index);
                    const isSelected = selectedSuggestedActionId === actionKey;

                    return (
                      <button
                        key={actionKey}
                        className={`agent-suggested-action-btn ${isSelected ? "is-selected" : ""}`}
                        type="button"
                        onClick={() => setSelectedSuggestedActionId(actionKey)}
                      >
                        <strong>{action.label || action.type || `Acción ${index + 1}`}</strong>
                        {action.reason ? <span>{action.reason}</span> : null}
                        <small>
                          {getToolDisplayName(action.tool_hint, action.label)} · {action.risk_level || "medium_write"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="agent-empty-hint">Este caso no tiene acciones sugeridas todavía.</p>
              )}

              <label className="agent-custom-instruction-field">
                <span>O escribe exactamente qué quieres que haga Autopilot:</span>
                <textarea
                  value={customAutopilotInstruction}
                  onChange={(event) => setCustomAutopilotInstruction(event.target.value)}
                  placeholder="Ejemplo: mueve esta tarea para el próximo lunes y agrega una nota interna..."
                  rows={4}
                />
                <small>Si escribes aquí, esta instrucción tendrá prioridad sobre los botones.</small>
              </label>

              <div className="agent-decision-actions">
                <button
                  className="agent-secondary-btn"
                  type="button"
                  onClick={() => setMode("review")}
                >
                  Volver
                </button>
                <button
                  className="agent-primary-btn"
                  type="button"
                  onClick={handleStartExecution}
                  disabled={
                    isResolvingIntent ||
                    (!customAutopilotInstruction.trim() &&
                      !selectedSuggestedActionId &&
                      selectedPlan.suggested_actions.length === 0)
                  }
                >
                  {isResolvingIntent ? "Resolviendo..." : "Continuar con Autopilot"}
                </button>
              </div>
            </div>
          ) : mode === "collecting_fields" ? (
            <div className="agent-form-slide">
              <div className="agent-decision-header">
                <span className="agent-section-eyebrow">Datos necesarios</span>
                <h3>Necesito algunos datos antes de continuar</h3>
                <p>{resolvedIntent?.agent_message || pendingAction?.action.label || selectedPlan.title}</p>
              </div>

              <div className="agent-field-list">
                {(pendingAction?.missingFields || []).map((field) => (
                  <label className="agent-field-control" key={field}>
                    <span>{getResolvedFieldQuestion(field)?.label || getHumanFieldLabel(field)}</span>
                    {getResolvedFieldQuestion(field)?.input_type === "textarea" ? (
                      <textarea
                        value={pendingAction?.values[field] || ""}
                        onChange={(event) => handlePendingFieldChange(field, event.target.value)}
                        placeholder={getResolvedFieldQuestion(field)?.question || getFieldPrompt(field, pendingAction?.action || getSelectedAutopilotAction() || selectedPlan.suggested_actions[0])}
                        rows={4}
                      />
                    ) : (
                      <input
                        type={getResolvedFieldQuestion(field)?.input_type === "date" ? "date" : "text"}
                        value={pendingAction?.values[field] || ""}
                        onChange={(event) => handlePendingFieldChange(field, event.target.value)}
                        placeholder={getResolvedFieldQuestion(field)?.question || getFieldPrompt(field, pendingAction?.action || getSelectedAutopilotAction() || selectedPlan.suggested_actions[0])}
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className="agent-decision-actions">
                <button
                  className="agent-secondary-btn"
                  type="button"
                  onClick={() => setMode("decision")}
                >
                  Volver
                </button>
                <button
                  className="agent-primary-btn"
                  type="button"
                  onClick={handleContinueAfterFields}
                  disabled={isResolvingIntent || (pendingAction?.missingFields || []).length > 0}
                >
                  {isResolvingIntent ? "Resolviendo..." : "Continuar a confirmación"}
                </button>
              </div>
            </div>
          ) : mode === "confirming" ? (
            <div className="agent-confirm-slide">
              <div className="agent-decision-header">
                <span className="agent-section-eyebrow">Confirmación humana</span>
                <h3>Confirma antes de que Autopilot continúe</h3>
                <p>{resolvedIntent?.agent_message || pendingAction?.planTitle || selectedPlan.title}</p>
              </div>

              <div className="agent-confirm-card">
                <div>
                  <span>Acción</span>
                  <strong>{pendingAction?.action.label || pendingAction?.action.type || "Sin acción"}</strong>
                </div>
                <div>
                  <span>Tool sugerida</span>
                  <strong>{getToolDisplayName(pendingAction?.action.tool_hint, pendingAction?.action.label)}</strong>
                </div>
                <div>
                  <span>Riesgo</span>
                  <strong>{pendingAction?.action.risk_level || "medium_write"}</strong>
                </div>
              </div>

              {(pendingAction?.action.required_fields || []).length > 0 ? (
                <div className="agent-confirm-fields">
                  {(pendingAction?.action.required_fields || []).map((field) => (
                    <div className="agent-confirm-field" key={field}>
                      <span>{getHumanFieldLabel(field)}</span>
                      <strong>
                        {pendingAction
                          ? getInferredRequiredFieldValue(
                              selectedPlan,
                              pendingAction.action,
                              field,
                              pendingAction.values,
                            ) || "pendiente"
                          : "pendiente"}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="agent-empty-hint">No faltan campos requeridos para esta intención.</p>
              )}

              {resolvedIntent?.confirmation_summary?.lines?.length ? (
                <div className="agent-confirm-fields">
                  {resolvedIntent.confirmation_summary.lines.map((line) => (
                    <div className="agent-confirm-field" key={line}>
                      <span>Resumen</span>
                      <strong>{line}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="agent-confirm-note">
                {resolvedIntent?.confirmation_summary?.message ||
                  "Esta confirmación todavía no ejecuta cambios reales. La ejecución se conectará en la siguiente fase."}
              </div>

              <div className="agent-decision-actions">
                <button
                  className="agent-secondary-btn"
                  type="button"
                  onClick={handleCancelPendingAction}
                >
                  Cancelar
                </button>
                <button
                  className="agent-secondary-btn"
                  type="button"
                  onClick={() =>
                    pendingAction?.action.required_fields?.length
                      ? setMode("collecting_fields")
                      : setMode("decision")
                  }
                >
                  Editar
                </button>
                <button
                  className="agent-primary-btn"
                  type="button"
                  onClick={handleConfirmPendingAction}
                >
                  Confirmar intención
                </button>
              </div>
            </div>
          ) : (
            <div className={`agent-event-shell ${isTransitioning ? "slide-out" : ""}`}>
              <div className="agent-event-icon">
                <Icon name={theme.icon} />
              </div>

              <div>
                <div className="agent-label">Corevix Autopilot</div>

                <div className="agent-event-title-row">
                  <h3 className="agent-event-title">{selectedPlan.title}</h3>
                  <span className="agent-severity">{theme.label}</span>
                </div>

                <p className="agent-event-message">{selectedPlan.message || selectedPlan.diagnosis}</p>

                <div className="agent-promise">{selectedPlan.diagnosis}</div>

                <div className="agent-impact-row">
                  {impactPills.map((item) => (
                    <span className="agent-impact-pill" key={item}>
                      {item}
                    </span>
                  ))}
                </div>

                <div className="agent-action-row">
                  <button
                    className="agent-primary-btn"
                    type="button"
                    onClick={handleOpenDecisionPanel}
                    disabled={!hasPlans}
                  >
                    Resolver con Autopilot
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>
      </div>

      <div className="agent-execution-mode">
        <div className="agent-stream-panel">
          <div className="agent-stream-header">
            <div className="agent-stream-mark" />
            <div>
              <h3 className="agent-stream-title">Autopilot está trabajando</h3>
              <p className="agent-stream-subtitle">El agente irá mostrando lo que está haciendo en tiempo real.</p>
            </div>
          </div>

          <div className="agent-stream-body">
            {streamLines.map((line, index) => (
              <div className={`agent-stream-line ${line.type || ""}`} key={`${line.text}-${index}`}>
                {line.text}
              </div>
            ))}
            {mode === "executing" ? <span className="agent-cursor" /> : null}
          </div>

          <div className={`agent-result-mini ${showResult ? "visible" : ""}`}>
            <div className="agent-result-title">{result.title}</div>
            <p className="agent-result-copy">{result.message}</p>

            <div className="agent-result-data">
              {result.data.map((item) => (
                <div className="agent-data-chip" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="agent-action-row">
              <button className="agent-primary-btn" type="button" onClick={() => setMode("review")}>
                Volver al widget
              </button>
              <button className="agent-secondary-btn" type="button" onClick={() => setMode("compact")}>
                Ocultar plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AgentCommandWidget;
