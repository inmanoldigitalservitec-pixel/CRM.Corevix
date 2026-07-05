import { useEffect, useMemo, useState } from "react";
import "./AgentCommandWidget.css";

export type AgentWidgetMode = "compact" | "review" | "executing" | "result";

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

  function handleTogglePlan() {
    if (!hasPlans) return;
    setMode((current) => (current === "compact" ? "review" : "compact"));
  }

  async function handleStartExecution() {
    if (!hasPlans) return;
    setMode("executing");
    setStreamLines([]);
    setShowResult(false);
    onSelectPlan?.(selectedPlan);

    let step = 0;

    function nextLine() {
      if (step < stream.length) {
        const text = stream[step];
        setStreamLines((current) => [
          ...current,
          {
            text,
            type: step === 0 ? "thinking" : undefined,
          },
        ]);

        step += 1;
        window.setTimeout(nextLine, step === 1 ? 700 : 850);
        return;
      }

      setStreamLines((current) => [...current, { text: "listo.", type: "done" }]);
      setMode("result");
      window.setTimeout(() => setShowResult(true), 280);
    }

    nextLine();

    await onApprovePlan?.(selectedPlan);
  }

  const result = selectedPlan.result || {
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
                <button className="agent-primary-btn" type="button" onClick={handleStartExecution} disabled={!hasPlans}>
                  Resolver con Autopilot
                </button>
              </div>
            </div>
          </div>
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
