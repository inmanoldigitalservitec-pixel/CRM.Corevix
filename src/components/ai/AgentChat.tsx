import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, KeyboardEvent } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CheckSquare,
  ChevronUp,
  FolderKanban,
  Keyboard,
  MessageSquare,
  PanelLeft,
  Plus,
  Receipt,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { getAgentUrl, type AgentToolScope } from "@/lib/agentClient";
import { AgentContextPanel } from "./AgentContextPanel";
import { getLatestAgentToolContext, type AgentToolContext, type AgentWidgetTone } from "./agentToolContext";
import { AGENT_CHAT_STARTERS, useAgentChatController } from "./useAgentChatController";
import "./AgenticAgentShell.css";
import "./AgenticPrompt.css";

type ScopeSuggestion = { scope: AgentToolScope; label: string; reason: string };
type ComposerToolMeta = {
  title: string;
  eyebrow: string;
  nextStep: string;
  tone: AgentWidgetTone;
  icon: ElementType;
};

const SCOPE_LABELS: Record<AgentToolScope, string> = {
  general: "General",
  leads: "Leads",
  clients: "Clientes",
  tasks: "Tareas",
  pipeline: "Pipeline",
  reports: "Reportes",
  communication: "Comunicación",
  projects: "Proyectos",
  finance: "Finanzas",
};

const SCOPE_ICONS: Record<AgentToolScope, ElementType> = {
  general: Sparkles,
  leads: Users,
  clients: Building2,
  tasks: CheckSquare,
  pipeline: TrendingUp,
  reports: BarChart3,
  communication: MessageSquare,
  projects: FolderKanban,
  finance: Receipt,
};

const COMPOSER_TOOL_META: Partial<Record<string, ComposerToolMeta>> = {
  create_lead: {
    title: "Lead creado",
    eyebrow: "Ventas",
    nextStep: "Crea una tarea de seguimiento para no dejar enfriar este prospecto.",
    tone: "blue",
    icon: Users,
  },
  search_leads: {
    title: "Leads encontrados",
    eyebrow: "Ventas",
    nextStep: "Abre el lead correcto o pide crear una tarea de seguimiento.",
    tone: "blue",
    icon: Users,
  },
  update_lead: {
    title: "Lead actualizado",
    eyebrow: "Ventas",
    nextStep: "Pide ver el lead o crear la siguiente accion comercial.",
    tone: "blue",
    icon: Users,
  },
  update_lead_status: {
    title: "Lead actualizado",
    eyebrow: "Ventas",
    nextStep: "Pide ver el lead o crear la siguiente accion comercial.",
    tone: "blue",
    icon: Users,
  },
  create_client: {
    title: "Cliente creado",
    eyebrow: "Clientes",
    nextStep: "Agrega una nota o tarea para el siguiente contacto.",
    tone: "teal",
    icon: Building2,
  },
  create_task: {
    title: "Tarea creada",
    eyebrow: "Operacion",
    nextStep: "Revisa prioridad y fecha para organizar el siguiente bloque de trabajo.",
    tone: "purple",
    icon: CheckSquare,
  },
  update_task: {
    title: "Tarea actualizada",
    eyebrow: "Operacion",
    nextStep: "Pide ver tareas pendientes o programa el proximo seguimiento.",
    tone: "purple",
    icon: CheckSquare,
  },
  complete_task: {
    title: "Tarea completada",
    eyebrow: "Operacion",
    nextStep: "Pide el siguiente pendiente o revisa tareas atrasadas.",
    tone: "teal",
    icon: CheckSquare,
  },
  create_reminder: {
    title: "Recordatorio creado",
    eyebrow: "Agenda",
    nextStep: "Cuando llegue la fecha, puedes pedirle al agente ejecutar el seguimiento.",
    tone: "purple",
    icon: CheckSquare,
  },
  create_crm_demo: {
    title: "Demo CRM creada",
    eyebrow: "Agenda",
    nextStep: "Antes de la demo, pide revisar el lead o preparar una propuesta.",
    tone: "purple",
    icon: CheckSquare,
  },
  create_deal: {
    title: "Oportunidad creada",
    eyebrow: "Pipeline",
    nextStep: "Agrega seguimiento, propuesta o fecha esperada de cierre.",
    tone: "blue",
    icon: TrendingUp,
  },
  update_deal: {
    title: "Oportunidad actualizada",
    eyebrow: "Pipeline",
    nextStep: "Revisa la etapa y define el proximo paso comercial.",
    tone: "blue",
    icon: TrendingUp,
  },
  update_deal_stage: {
    title: "Etapa actualizada",
    eyebrow: "Pipeline",
    nextStep: "Revisa la probabilidad y fecha esperada de cierre.",
    tone: "blue",
    icon: TrendingUp,
  },
  crm_summary: {
    title: "Resumen CRM",
    eyebrow: "Dashboard",
    nextStep: "Usa este resumen para decidir si conviene revisar leads, tareas, cobros o proyectos.",
    tone: "blue",
    icon: BarChart3,
  },
  list_tasks: {
    title: "Tareas pendientes",
    eyebrow: "Operacion",
    nextStep: "Resuelve primero las tareas de prioridad alta o con fecha mas cercana.",
    tone: "purple",
    icon: CheckSquare,
  },
  list_deals: {
    title: "Oportunidades",
    eyebrow: "Pipeline",
    nextStep: "Prioriza oportunidades con mayor valor o cierre mas cercano.",
    tone: "blue",
    icon: TrendingUp,
  },
  list_unpaid_invoices: {
    title: "Cobros pendientes",
    eyebrow: "Facturacion",
    nextStep: "Prioriza las vencidas o las de mayor monto antes de contactar clientes.",
    tone: "orange",
    icon: Receipt,
  },
  create_project: {
    title: "Proyecto creado",
    eyebrow: "Proyectos",
    nextStep: "Define tareas, fechas y responsables para mantenerlo en movimiento.",
    tone: "teal",
    icon: FolderKanban,
  },
  list_projects: {
    title: "Proyectos",
    eyebrow: "Proyectos",
    nextStep: "Revisa proyectos activos con entrega cercana o prioridad alta.",
    tone: "teal",
    icon: FolderKanban,
  },
};

const SCOPE_KEYWORDS: Array<{ scope: AgentToolScope; words: string[] }> = [
  { scope: "leads", words: ["lead", "leads", "prospecto", "prospectos", "interesado", "cliente potencial", "contacto nuevo", "nuevo contacto"] },
  { scope: "clients", words: ["cliente", "clientes", "empresa", "empresas", "cuenta", "cuentas", "contacto", "contactos"] },
  { scope: "tasks", words: ["tarea", "tareas", "recordatorio", "recordatorios", "recuerdame", "recuérdame", "agenda", "agendar", "calendario", "cita", "reunion", "reunión", "demo", "seguimiento"] },
  { scope: "pipeline", words: ["pipeline", "deal", "deals", "oportunidad", "oportunidades", "venta", "ventas", "negocio", "negocios", "etapa", "probabilidad", "cierre"] },
  { scope: "reports", words: ["reporte", "reportes", "resumen", "briefing", "metricas", "métricas", "dashboard", "actividad", "rendimiento"] },
  { scope: "communication", words: ["email", "correo", "correos", "gmail", "outlook", "whatsapp", "mensaje", "mensajes", "inbox", "bandeja", "conversacion", "conversación", "borrador", "responder"] },
  { scope: "projects", words: ["proyecto", "proyectos", "project", "projects", "entrega", "implementacion", "implementación"] },
  { scope: "finance", words: ["factura", "facturas", "invoice", "invoices", "pago", "pagos", "cobro", "cobros", "deuda", "vencida", "vencidas"] },
];

function normalizeScopeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectScopeSuggestion(value: string, selectedScope: AgentToolScope | null): ScopeSuggestion | null {
  if (selectedScope) return null;
  const text = normalizeScopeText(value);
  if (text.length < 3) return null;

  for (const item of SCOPE_KEYWORDS) {
    const reason = item.words.find((word) => text.includes(normalizeScopeText(word)));
    if (reason) return { scope: item.scope, label: SCOPE_LABELS[item.scope], reason };
  }

  return null;
}

function toneClass(tone?: string) {
  return tone ? `is-${tone}` : "is-slate";
}

function isActionTool(tool: string) {
  return /^(create|update|complete|reschedule|add|convert|link|assign|cancel|draft)_/.test(tool);
}

function ScopeIcon({ scope, className = "h-3.5 w-3.5" }: { scope: AgentToolScope; className?: string }) {
  const Icon = SCOPE_ICONS[scope] || Sparkles;
  return <Icon className={className} />;
}

function AgentComposerActionPanel({
  context,
  expanded,
  onToggle,
}: {
  context: AgentToolContext | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!context) return null;

  const meta = COMPOSER_TOOL_META[context.tool];
  const Icon = meta?.icon || SCOPE_ICONS.general;
  const tone = meta?.tone || context.rows[0]?.tone || context.metrics?.[0]?.tone || "slate";
  const count = context.metrics?.length ? context.metrics.length : context.rows.length;
  const countLabel = context.status === "error" ? "!" : isActionTool(context.tool) ? `+${Math.max(count, 1)}` : String(count || 1);
  const title = meta?.title || context.title;
  const summary = context.rows[0]?.subtitle || context.summary || meta?.nextStep || "Accion procesada por Corevix AI.";
  const visibleRows = context.rows.slice(0, 4);
  const visibleMetrics = context.metrics?.slice(0, 4) || [];

  return (
    <div className={`agentic-ai-action-panel ${expanded ? "is-expanded" : ""} ${toneClass(tone)}`}>
      <button type="button" className="agentic-ai-action-summary" onClick={onToggle} aria-expanded={expanded}>
        <span className="agentic-ai-action-count">{countLabel}</span>
        <span className="agentic-ai-action-copy">
          <strong>{title}</strong>
          <small>{summary}</small>
        </span>
        <span className="agentic-ai-action-expand"><ChevronUp className="h-4 w-4" /></span>
      </button>

      <div className="agentic-ai-action-details" aria-hidden={!expanded}>
        <div className="agentic-ai-action-tool-pill">
          <Icon className="h-3.5 w-3.5" />
          <span>{meta?.eyebrow || context.kind}</span>
          <b>{context.tool}</b>
        </div>

        {visibleMetrics.length ? (
          <div className="agentic-ai-action-metrics">
            {visibleMetrics.map((metric) => (
              <div key={metric.id} className={`agentic-ai-action-metric ${toneClass(metric.tone)}`}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        ) : null}

        {visibleRows.length ? (
          <div className="agentic-ai-action-rows">
            {visibleRows.map((row) => (
              <div key={row.id} className="agentic-ai-action-row">
                <span className={`agentic-ai-action-row-dot ${toneClass(row.tone || tone)}`} />
                <span>
                  <strong>{row.title}</strong>
                  {row.subtitle ? <small>{row.subtitle}</small> : null}
                </span>
                {row.value ? <b>{row.value}</b> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="agentic-ai-action-empty">
            <strong>{context.status === "error" ? "Hubo un problema" : title}</strong>
            <span>{context.summary || meta?.nextStep || "No hay detalle adicional disponible."}</span>
          </div>
        )}

        <div className="agentic-ai-action-next">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{meta?.nextStep || "Pide al agente el proximo paso o abre el registro relacionado."}</span>
        </div>
      </div>
    </div>
  );
}

export function AgentChat({
  compact = false,
  fullscreen = false,
}: {
  compact?: boolean;
  fullscreen?: boolean;
}) {
  const {
    threads,
    activeThreadId,
    messages,
    text,
    setText,
    loading,
    loadingHistory,
    historyError,
    sidebarOpen,
    setSidebarOpen,
    loadThreadMessages,
    newThread,
    handleSend,
  } = useAgentChatController();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedScope, setSelectedScope] = useState<AgentToolScope | null>(null);
  const [composerPanelOpen, setComposerPanelOpen] = useState(false);
  const activeToolContext = getLatestAgentToolContext(messages);
  const activeToolKey = `${activeToolContext?.tool || ""}:${activeToolContext?.rows[0]?.id || ""}:${activeToolContext?.summary || ""}`;
  const scopeSuggestion = useMemo(() => detectScopeSuggestion(text, selectedScope), [text, selectedScope]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 156)}px`;
  };

  const scrollToLatestMessage = (behavior: ScrollBehavior = "auto") => {
    window.requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  };

  const submitAgentMessage = (message?: string) => {
    void handleSend(message, selectedScope);
    setSelectedScope(null);
    setComposerPanelOpen(false);
    scrollToLatestMessage("smooth");
  };

  const toggleComposerPanel = () => {
    setComposerPanelOpen((value) => !value);
    window.setTimeout(() => scrollToLatestMessage("smooth"), 80);
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Tab" && scopeSuggestion) {
      event.preventDefault();
      setSelectedScope(scopeSuggestion.scope);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitAgentMessage();
    }
  };

  const handleTextareaFocus = () => {
    window.setTimeout(() => scrollToLatestMessage("smooth"), 120);
    window.setTimeout(() => scrollToLatestMessage("smooth"), 340);
  };

  const scopeControl = (
    <div className="agentic-ai-scope-layer" aria-live="polite">
      {selectedScope ? (
        <span className="agentic-ai-tool-pill is-selected">
          <span className="agentic-ai-tool-pill-icon"><ScopeIcon scope={selectedScope} /></span>
          <span>{SCOPE_LABELS[selectedScope]}</span>
          <button type="button" onClick={() => setSelectedScope(null)} aria-label="Quitar tool seleccionada">
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : null}
      {scopeSuggestion ? (
        <button
          type="button"
          className="agentic-ai-tool-suggestion"
          onClick={() => setSelectedScope(scopeSuggestion.scope)}
          aria-label={`Usar tools de ${scopeSuggestion.label}`}
        >
          <span className="agentic-ai-tool-pill-icon"><ScopeIcon scope={scopeSuggestion.scope} /></span>
          <span>Usar {scopeSuggestion.label}</span>
          <span className="agentic-ai-tab-hint"><Keyboard className="h-3 w-3" /> Tab</span>
        </button>
      ) : null}
    </div>
  );

  useEffect(() => {
    if (!fullscreen || typeof window === "undefined") return;

    const updateVisualViewportInset = () => {
      const viewport = window.visualViewport;
      const bottomInset = viewport
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0;

      document.documentElement.style.setProperty("--corevix-visual-bottom", `${bottomInset}px`);
    };

    updateVisualViewportInset();
    window.addEventListener("resize", updateVisualViewportInset);
    window.visualViewport?.addEventListener("resize", updateVisualViewportInset);
    window.visualViewport?.addEventListener("scroll", updateVisualViewportInset);

    return () => {
      window.removeEventListener("resize", updateVisualViewportInset);
      window.visualViewport?.removeEventListener("resize", updateVisualViewportInset);
      window.visualViewport?.removeEventListener("scroll", updateVisualViewportInset);
      document.documentElement.style.removeProperty("--corevix-visual-bottom");
    };
  }, [fullscreen]);

  useEffect(() => {
    setComposerPanelOpen(false);
  }, [activeToolKey]);

  useEffect(() => {
    scrollToLatestMessage();
    const timer = window.setTimeout(() => scrollToLatestMessage("smooth"), 80);
    return () => window.clearTimeout(timer);
  }, [messages.length, loading]);

  useEffect(() => {
    resizeTextarea();
  }, [text, messages.length, fullscreen, selectedScope]);

  const chatMessages = (
    <>
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";
        return (
          <div key={msg.id || `${msg.role}-${index}`} className={isUser ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? "bg-[#1d62f9] text-white" : "border border-[#e6eaf0] bg-white text-[#111827]"}`}>
              {msg.content}
            </div>
          </div>
        );
      })}
      {loading && <p className="text-sm text-[#667085]">Pensando...</p>}
    </>
  );

  if (!fullscreen) {
    return (
      <div className={`flex h-full flex-col overflow-hidden bg-white ${compact ? "" : "min-h-[620px]"}`}>
        <div className="border-b border-[#e6eaf0] px-4 py-3">
          <h2 className="text-base font-black text-[#111827]">Corevix AI</h2>
          <p className="truncate text-xs font-semibold text-[#667085]">Agente conectado · {getAgentUrl()}</p>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcfe] p-4">
          {loadingHistory ? <p className="text-sm text-[#667085]">Cargando historial...</p> : chatMessages}
        </div>

        <form className="flex gap-2 border-t border-[#e6eaf0] p-3" onSubmit={(event) => { event.preventDefault(); submitAgentMessage(); }}>
          <input className="h-11 flex-1 rounded-2xl border border-[#e6eaf0] px-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pregúntale algo a Corevix AI..." />
          <button className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1d62f9] text-white disabled:opacity-50" type="submit" disabled={loading || !text.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="agentic-ai-shell">
      <div className={`agentic-ai-layout ${sidebarOpen ? "" : "is-panel-closed"}`}>
        <div className={`agentic-ai-panel-slot ${sidebarOpen ? "" : "is-closed"}`}>
          <AgentContextPanel
            context={activeToolContext}
            threads={threads}
            activeThreadId={activeThreadId}
            loadingHistory={loadingHistory}
            historyError={historyError}
            onNewThread={newThread}
            onLoadThread={loadThreadMessages}
          />
        </div>

        <main className="agentic-ai-main">
          <header className="agentic-ai-topbar">
            <div className="agentic-ai-title-row">
              <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="agentic-ai-toggle" aria-label="Abrir panel CRM">
                <PanelLeft className="h-4 w-4" />
              </button>
              <div className="agentic-ai-title">
                <h1>Corevix AI</h1>
                <p>Historial guardado · OpenClaw local · Tools CRM activas</p>
              </div>
            </div>
            <span className="agentic-ai-url">{getAgentUrl()}</span>
          </header>

          <section className="agentic-ai-stage">
            <div className="agentic-ai-core">
              {loadingHistory ? (
                <div className="agentic-ai-empty">
                  <div className="agentic-ai-thinking">
                    <span>Cargando historial</span>
                    <span className="agentic-ai-dots"><span /><span /><span /></span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="agentic-ai-empty">
                  <div className="agentic-ai-empty-inner">
                    <div className="agentic-ai-orb"><Bot className="h-6 w-6" /></div>
                    <p className="agentic-ai-kicker">Corevix AI</p>
                    <h2>¿Qué toca ahora, Inmanol?</h2>
                    <p>Pregunta algo y el agente usa OpenClaw con tus tools reales del CRM. La interfaz cambia, la conexión se mantiene.</p>

                    <form
                      className="agentic-ai-hero-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitAgentMessage();
                      }}
                    >
                      <button type="button" className="agentic-ai-input-action" aria-label="Nueva accion"><Plus className="h-4 w-4" /></button>
                      {scopeControl}
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Pregúntale algo a Corevix AI..."
                        rows={1}
                        onFocus={handleTextareaFocus}
                        onKeyDown={handlePromptKeyDown}
                      />
                      <button type="submit" disabled={loading || !text.trim()} className="agentic-ai-send" aria-label="Enviar"><Send className="h-4 w-4" /></button>
                    </form>

                    <div className="agentic-ai-starters">
                      {AGENT_CHAT_STARTERS.map((starter) => (
                        <button key={starter} type="button" onClick={() => submitAgentMessage(starter)}>
                          <Sparkles className="h-4 w-4" />
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="agentic-ai-chat">
                  <div ref={scrollRef} className="agentic-ai-scroll">
                    <div className="agentic-ai-stream">
                      {messages.map((msg, index) => {
                        const isUser = msg.role === "user";
                        return (
                          <div key={msg.id || `${msg.role}-${index}`} className={`agentic-ai-message ${isUser ? "is-user" : "is-assistant"}`}>
                            <div className="agentic-ai-bubble">{msg.content}</div>
                          </div>
                        );
                      })}
                      {loading ? (
                        <div className="agentic-ai-message is-assistant">
                          <div className="agentic-ai-thinking">
                            <span>Pensando</span>
                            <span className="agentic-ai-dots"><span /><span /><span /></span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {messages.length > 0 ? (
              <div className="agentic-ai-dock">
                <div className={`agentic-ai-composer-stack ${composerPanelOpen ? "is-expanded" : ""} ${activeToolContext ? "has-action" : ""}`}>
                  <AgentComposerActionPanel context={activeToolContext} expanded={composerPanelOpen} onToggle={toggleComposerPanel} />
                  <form
                    className="agentic-ai-dock-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitAgentMessage();
                    }}
                  >
                    <button type="button" className="agentic-ai-input-action" aria-label="Nueva accion"><Plus className="h-4 w-4" /></button>
                    {scopeControl}
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Escribe un mensaje para Corevix AI..."
                      rows={1}
                      onFocus={handleTextareaFocus}
                      onKeyDown={handlePromptKeyDown}
                    />
                    <button type="submit" disabled={loading || !text.trim()} className="agentic-ai-send" aria-label="Enviar"><Send className="h-4 w-4" /></button>
                  </form>
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
