#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Creating AgentCommandWidget"
echo "=========================================="
echo ""

COMPONENT_DIR="./src/components/agent"
TSX_FILE="$COMPONENT_DIR/AgentCommandWidget.tsx"
CSS_FILE="$COMPONENT_DIR/AgentCommandWidget.css"
INDEX_FILE="$COMPONENT_DIR/index.ts"
BACKUP_DIR="./agent-ready-patch/backups-agent-widget-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$COMPONENT_DIR"
mkdir -p "$BACKUP_DIR"

if [ -f "$TSX_FILE" ]; then
  cp "$TSX_FILE" "$BACKUP_DIR/AgentCommandWidget.tsx.bak"
fi

if [ -f "$CSS_FILE" ]; then
  cp "$CSS_FILE" "$BACKUP_DIR/AgentCommandWidget.css.bak"
fi

if [ -f "$INDEX_FILE" ]; then
  cp "$INDEX_FILE" "$BACKUP_DIR/index.ts.bak"
fi

cat > "$TSX_FILE" <<'TSX'
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
    setMode((current) => (current === "compact" ? "review" : "compact"));
  }

  async function handleStartExecution() {
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
        Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
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
                <button className="agent-primary-btn" type="button" onClick={handleStartExecution}>
                  {selectedPlan.suggested_actions[0]?.label || "Resolver con Autopilot"}
                </button>
                <button className="agent-secondary-btn" type="button" onClick={handleTogglePlan}>
                  {mode === "compact" ? "Ver plan completo" : "Ocultar plan completo"}
                </button>
              </div>
            </div>
          </div>
        </article>

        <aside className="agent-plan-card">
          <div className="agent-plan-head">
            <div>
              <h3>Plan que voy a ejecutar</h3>
              <p>Plan individual para este caso detectado</p>
            </div>
            <span className="agent-severity">{theme.label}</span>
          </div>

          <div className="agent-plan-list">
            {selectedPlan.plan_steps.map((step, index) => (
              <div className="agent-plan-step" key={`${step.title}-${index}`}>
                <span className="agent-step-number">{index + 1}</span>
                <div>
                  <div className="agent-step-title">{step.title}</div>
                  <div className="agent-step-copy">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
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
TSX

cat > "$CSS_FILE" <<'CSS'
.agent-command-widget {
  width: min(1180px, 100%);
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #dbe5f3;
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(26, 50, 88, 0.08);
  overflow: hidden;
  color: #07111f;
}

.agent-command-widget * {
  box-sizing: border-box;
}

.agent-widget-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid #eef2f8;
}

.agent-brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.agent-brand-row h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.agent-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  background: #f1f4f9;
  color: #52617e;
  font-size: 13px;
  font-weight: 700;
}

.agent-active-pill.is-active {
  background: #e9f9ef;
  color: #109638;
}

.agent-active-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 rgba(22, 198, 83, 0.45);
  animation: agentBreathe 1.8s ease-in-out infinite;
}

@keyframes agentBreathe {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(22, 198, 83, 0.4);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(22, 198, 83, 0);
  }
}

.agent-last-check {
  color: #35456b;
  font-size: 14px;
  font-weight: 500;
}

.agent-analyze-btn,
.agent-secondary-btn,
.agent-primary-btn {
  border: 1px solid #d9e3f2;
  background: #fff;
  color: #09111f;
  border-radius: 10px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.agent-analyze-btn:disabled,
.agent-secondary-btn:disabled,
.agent-primary-btn:disabled {
  opacity: 0.65;
  pointer-events: none;
}

.agent-analyze-btn:hover,
.agent-secondary-btn:hover {
  transform: translateY(-1px);
  border-color: #b9c9e4;
  box-shadow: 0 10px 24px rgba(32, 68, 126, 0.08);
}

.agent-primary-btn {
  background: #0b5cff;
  color: #fff;
  border-color: #0b5cff;
  box-shadow: 0 14px 28px rgba(11, 92, 255, 0.18);
}

.agent-primary-btn:hover {
  transform: translateY(-1px);
  background: #004ee5;
}

.agent-headline {
  padding: 0 22px 18px;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.agent-headline strong {
  color: #0b5cff;
}

.agent-review-mode {
  padding: 0 22px 22px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
}

.agent-main-card,
.agent-plan-card {
  border: 1px solid #dbe5f3;
  border-radius: 16px;
  background: #fff;
  min-height: 310px;
}

.agent-main-card {
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.agent-main-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid rgba(11, 92, 255, 0);
  border-radius: inherit;
  pointer-events: none;
  animation: agentDetectPulse 5s ease infinite;
}

@keyframes agentDetectPulse {
  0%,
  75%,
  100% {
    border-color: rgba(11, 92, 255, 0);
  }

  85% {
    border-color: rgba(11, 92, 255, 0.28);
  }
}

.agent-event-shell {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 18px;
  transition:
    opacity 0.34s ease,
    transform 0.34s ease;
}

.agent-event-shell.slide-out {
  opacity: 0;
  transform: translateX(-24px);
}

.agent-event-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--agent-soft);
  color: var(--agent-accent);
}

.agent-event-icon svg {
  width: 25px;
  height: 25px;
  stroke-width: 2.2;
}

.agent-label {
  color: #0b2b73;
  font-size: 13px;
  font-weight: 850;
  margin-bottom: 8px;
}

.agent-event-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.agent-event-title {
  margin: 0;
  font-size: 23px;
  letter-spacing: -0.025em;
}

.agent-severity {
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--agent-soft);
  color: var(--agent-accent);
  font-size: 12px;
  font-weight: 850;
}

.agent-event-message {
  color: #172957;
  font-size: 16px;
  line-height: 1.55;
  margin: 14px 0 0;
  max-width: 640px;
  font-weight: 560;
}

.agent-promise {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f7faff;
  border: 1px solid #dce8ff;
  color: #102a68;
  line-height: 1.5;
  font-size: 14px;
}

.agent-impact-row {
  margin-top: 18px;
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.agent-impact-pill {
  border: 1px solid #d9e5f8;
  background: #f8fbff;
  color: #173466;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 13px;
  font-weight: 700;
}

.agent-action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.agent-plan-card {
  padding: 20px;
}

.agent-plan-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid #edf2f8;
}

.agent-plan-head h3 {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.agent-plan-head p {
  margin: 5px 0 0;
  color: #42537c;
  font-size: 13px;
}

.agent-plan-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.agent-plan-step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
}

.agent-step-number {
  width: 25px;
  height: 25px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #edf4ff;
  color: #0b5cff;
  font-size: 12px;
  font-weight: 850;
}

.agent-step-title {
  font-size: 14px;
  font-weight: 850;
}

.agent-step-copy {
  margin-top: 2px;
  color: #35456b;
  font-size: 13px;
  line-height: 1.42;
}

.agent-command-widget.compact .agent-headline,
.agent-command-widget.compact .agent-plan-card,
.agent-command-widget.compact .agent-promise,
.agent-command-widget.compact .agent-impact-row {
  display: none;
}

.agent-command-widget.compact .agent-review-mode {
  display: block;
}

.agent-command-widget.compact .agent-main-card {
  min-height: auto;
  padding: 18px;
}

.agent-command-widget.compact .agent-event-shell {
  grid-template-columns: 44px 1fr;
  align-items: center;
}

.agent-command-widget.compact .agent-event-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.agent-command-widget.compact .agent-event-title {
  font-size: 18px;
}

.agent-command-widget.compact .agent-event-message {
  font-size: 14px;
  margin-top: 6px;
  max-width: 720px;
}

.agent-command-widget.compact .agent-action-row {
  margin-top: 16px;
}

.agent-execution-mode {
  display: none;
  padding: 0 22px 22px;
}

.agent-command-widget.executing .agent-review-mode,
.agent-command-widget.executing .agent-headline {
  display: none;
}

.agent-command-widget.executing .agent-execution-mode {
  display: block;
}

.agent-stream-panel {
  border: 1px solid #dbe5f3;
  border-radius: 16px;
  background:
    radial-gradient(circle at 12% 0%, rgba(11, 92, 255, 0.06), transparent 34%),
    #fff;
  padding: 24px;
  min-height: 300px;
}

.agent-stream-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.agent-stream-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(145deg, #0b5cff, #79a8ff);
  box-shadow: 0 14px 30px rgba(11, 92, 255, 0.22);
}

.agent-stream-title {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.agent-stream-subtitle {
  margin: 2px 0 0;
  color: #52617e;
  font-size: 13px;
}

.agent-stream-body {
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    "Liberation Mono",
    monospace;
  font-size: 14px;
  line-height: 1.85;
  color: #10244d;
  min-height: 150px;
}

.agent-stream-line {
  opacity: 0;
  transform: translateY(5px);
  animation: agentLineIn 0.22s ease forwards;
}

@keyframes agentLineIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.agent-stream-line.thinking {
  color: #0b5cff;
  font-weight: 800;
}

.agent-stream-line.done {
  color: #13a048;
}

.agent-cursor {
  display: inline-block;
  width: 7px;
  height: 16px;
  margin-left: 3px;
  background: #0b5cff;
  vertical-align: -3px;
  animation: agentBlink 0.9s steps(2) infinite;
}

@keyframes agentBlink {
  50% {
    opacity: 0;
  }
}

.agent-result-mini {
  display: none;
  margin-top: 18px;
  border-top: 1px solid #edf2f8;
  padding-top: 18px;
}

.agent-result-mini.visible {
  display: block;
  animation: agentLineIn 0.24s ease forwards;
}

.agent-result-title {
  color: #0f7d35;
  font-weight: 900;
  font-size: 15px;
  margin-bottom: 6px;
}

.agent-result-copy {
  margin: 0;
  color: #1d2c4f;
  font-size: 14px;
  line-height: 1.5;
}

.agent-result-data {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.agent-data-chip {
  border: 1px solid #dfe8f5;
  border-radius: 12px;
  padding: 11px 12px;
  background: #fbfdff;
}

.agent-data-chip span {
  display: block;
  color: #6a7894;
  font-size: 12px;
  font-weight: 750;
  margin-bottom: 4px;
}

.agent-data-chip strong {
  font-size: 14px;
}

@media (max-width: 860px) {
  .agent-widget-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .agent-review-mode {
    grid-template-columns: 1fr;
  }

  .agent-plan-card,
  .agent-main-card {
    min-height: auto;
  }

  .agent-result-data {
    grid-template-columns: 1fr;
  }
}
CSS

cat > "$INDEX_FILE" <<'TS'
export {
  AgentCommandWidget,
  default as AgentCommandWidgetDefault,
} from "./AgentCommandWidget";

export type {
  AgentRecoveryPlan,
  AgentSeverity,
  AgentWidgetMode,
} from "./AgentCommandWidget";
TS

echo ""
echo "Archivos creados:"
echo "- $TSX_FILE"
echo "- $CSS_FILE"
echo "- $INDEX_FILE"
echo ""
echo "Backups si existían archivos anteriores:"
echo "$BACKUP_DIR"
echo ""
echo "Ahora corre:"
echo "npm run build"
