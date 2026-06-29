import type { MouseEvent, ReactNode, RefObject } from "react";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Circle,
  Copy,
  DollarSign,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  X,
} from "lucide-react";
import { extractAgentReply, sendAgentMessage } from "@/lib/agentClient";
import "./AgenticDashboard.css";
import "./AgenticDashboardIcons.css";

type IntentKey = "priorities" | "invoices" | "pipeline" | "messages" | "default";
type ToolKey = "auto" | "crm" | "leads" | "clients" | "pipeline" | "invoices" | "tasks" | "messages" | "projects" | "documents";

type IntentConfig = {
  contexts: string[];
  chips: string[];
  title: string;
  summary: string;
  points: string[];
  actions: string[];
  panelSummary: string;
};

type ChatMessage =
  | { id: string; type: "user"; text: string; tool: ToolKey }
  | { id: string; type: "ai"; intent: IntentKey; reply: string };

type ToolOption = {
  key: ToolKey;
  label: string;
  prompt: string;
  patterns: RegExp[];
};

const toolOptions: ToolOption[] = [
  { key: "auto", label: "Auto", prompt: "", patterns: [] },
  {
    key: "crm",
    label: "CRM",
    prompt: "Usa el contexto general del CRM.",
    patterns: [/\bcrm\b/i, /\bnegocio\b/i, /\bresumen general\b/i, /\bempresa\b/i],
  },
  {
    key: "leads",
    label: "Leads",
    prompt: "Usa la tool/contexto de leads y prospectos.",
    patterns: [/\bleads?\b/i, /\bprospectos?\b/i, /\bseguimiento\b/i, /\bcontactar\b/i],
  },
  {
    key: "clients",
    label: "Clientes",
    prompt: "Usa la tool/contexto de clientes y cuentas.",
    patterns: [/\bclientes?\b/i, /\bcuentas?\b/i, /\bcontacto\b/i, /\bempresa\b/i],
  },
  {
    key: "pipeline",
    label: "Pipeline",
    prompt: "Usa la tool/contexto de pipeline y oportunidades.",
    patterns: [/\bpipeline\b/i, /\boportunidades?\b/i, /\bdeals?\b/i, /\bcerrar\b/i, /\bnegociaci[oó]n\b/i, /\bventa\b/i],
  },
  {
    key: "invoices",
    label: "Facturas",
    prompt: "Usa la tool/contexto de facturas y cobros.",
    patterns: [/\bfacturas?\b/i, /\bcobros?\b/i, /\bvencid[ao]s?\b/i, /\bpago\b/i, /\bpor cobrar\b/i, /\binvoices?\b/i],
  },
  {
    key: "tasks",
    label: "Tareas",
    prompt: "Usa la tool/contexto de tareas.",
    patterns: [/\btareas?\b/i, /\bpendientes?\b/i, /\batrasad[ao]s?\b/i, /\bprioridad(es)?\b/i, /\bagenda\b/i],
  },
  {
    key: "messages",
    label: "Mensajes",
    prompt: "Usa la tool/contexto de mensajes y bandejas.",
    patterns: [/\bmensajes?\b/i, /\bwhatsapp\b/i, /\bcorreo\b/i, /\bemail\b/i, /\bbandeja\b/i, /\bresponde(r)?\b/i],
  },
  {
    key: "projects",
    label: "Proyectos",
    prompt: "Usa la tool/contexto de proyectos.",
    patterns: [/\bproyectos?\b/i, /\bproducci[oó]n\b/i, /\bentregas?\b/i, /\bdeadline\b/i, /\briesgo\b/i],
  },
  {
    key: "documents",
    label: "Docs",
    prompt: "Usa la tool/contexto de documentos y propuestas.",
    patterns: [/\bdocs?\b/i, /\bdocumentos?\b/i, /\bpropuestas?\b/i, /\bcontratos?\b/i, /\barchivos?\b/i],
  },
];

const intentConfig: Record<IntentKey, IntentConfig> = {
  priorities: {
    contexts: ["priorities", "pipeline", "actions", "activity", "agenda"],
    chips: ["Prioridades", "Pipeline", "Actividad", "Agenda"],
    title: "Prioridad recomendada",
    summary:
      "Cobrar facturas vencidas, responder conversaciones abiertas y dar seguimiento a propuestas activas debe ir primero.",
    points: [
      "El agente cruza facturas, tareas, pipeline y actividad reciente.",
      "Las prioridades se organizan por impacto en caja y avance comercial.",
      "Puedes convertir la recomendacion en una accion dentro del CRM.",
    ],
    actions: ["Revisar prioridad", "Crear seguimiento", "Abrir actividad"],
    panelSummary:
      "Plan recomendado: cobrar pendientes, responder conversaciones activas y reactivar oportunidades abiertas.",
  },
  invoices: {
    contexts: ["invoices", "actions", "activity"],
    chips: ["Facturas", "Cobros", "Actividad"],
    title: "Cobro recomendado",
    summary:
      "El agente revisa facturas pendientes, vencidas y por vencer para sugerir el siguiente cobro.",
    points: [
      "Se priorizan facturas vencidas y montos con impacto directo en caja.",
      "El contexto incluye numero, estado, fecha de vencimiento y cliente relacionado.",
      "La siguiente accion puede ser abrir factura, recordar pago o programar seguimiento.",
    ],
    actions: ["Enviar recordatorio", "Abrir factura", "Programar seguimiento"],
    panelSummary:
      "Accion sugerida: revisar cobros pendientes y preparar recordatorios para facturas vencidas.",
  },
  pipeline: {
    contexts: ["pipeline", "actions", "activity"],
    chips: ["Pipeline", "Oportunidades", "Actividad"],
    title: "Oportunidades a priorizar",
    summary:
      "El agente analiza oportunidades abiertas, propuestas enviadas y negociaciones para encontrar cierres probables.",
    points: [
      "El pipeline se organiza por etapa, valor, probabilidad y actividad reciente.",
      "Las oportunidades con respuesta reciente deben moverse primero.",
      "Puedes pedir follow-up, tarea comercial o resumen por etapa.",
    ],
    actions: ["Ver oportunidades", "Enviar follow-up", "Crear tarea comercial"],
    panelSummary:
      "Accion sugerida: dar seguimiento a propuestas y negociaciones con mayor probabilidad de cierre.",
  },
  messages: {
    contexts: ["messages", "actions", "activity"],
    chips: ["Mensajes", "Clientes", "Actividad"],
    title: "Mensajes pendientes",
    summary:
      "El agente revisa conversaciones abiertas y detecta mensajes conectados a leads, clientes y oportunidades.",
    points: [
      "Las conversaciones con impacto comercial suben de prioridad.",
      "El contexto puede relacionarse con propuestas, clientes o tareas pendientes.",
      "Puedes pedir respuesta sugerida o abrir la bandeja del CRM.",
    ],
    actions: ["Responder mensajes", "Abrir bandeja", "Crear seguimiento"],
    panelSummary:
      "Accion sugerida: responder primero las conversaciones conectadas a oportunidades activas.",
  },
  default: {
    contexts: ["priorities", "actions", "activity"],
    chips: ["Prioridades", "Acciones", "Actividad"],
    title: "Contexto preparado",
    summary:
      "Corevix AI preparo el contexto mas util del CRM para trabajar sobre prioridades, actividad reciente y acciones sugeridas.",
    points: [
      "Puedes pedirme que cobre, responda, priorice o analice oportunidades.",
      "Los paneles se adaptan segun la intencion de tu mensaje.",
      "El dashboard se mantiene visible mientras conversas con el agente.",
    ],
    actions: ["Revisar prioridades", "Ver actividad", "Crear siguiente accion"],
    panelSummary:
      "Corevix AI esta listo para ayudarte a ejecutar la siguiente accion dentro del CRM.",
  },
};

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function detectSuggestedTool(text: string): ToolKey | null {
  const clean = text.trim();
  if (!clean) return null;

  for (const tool of toolOptions) {
    if (tool.key === "auto") continue;
    if (tool.patterns.some((pattern) => pattern.test(clean))) return tool.key;
  }

  return null;
}

function detectIntent(text: string, tool: ToolKey): IntentKey {
  if (tool === "invoices") return "invoices";
  if (tool === "pipeline" || tool === "leads" || tool === "clients" || tool === "documents") return "pipeline";
  if (tool === "messages") return "messages";
  if (tool === "tasks" || tool === "projects" || tool === "crm") return "priorities";

  const clean = text.toLowerCase();
  if (clean.includes("factura") || clean.includes("cobrar") || clean.includes("vencida") || clean.includes("cobro")) return "invoices";
  if (clean.includes("oportunidad") || clean.includes("cerrar") || clean.includes("pipeline") || clean.includes("propuesta")) return "pipeline";
  if (clean.includes("mensaje") || clean.includes("responde") || clean.includes("bandeja") || clean.includes("whatsapp")) return "messages";
  if (clean.includes("prioridad") || clean.includes("hoy") || clean.includes("toca") || clean.includes("pendiente")) return "priorities";
  return "default";
}

function toolLabel(tool: ToolKey) {
  return toolOptions.find((item) => item.key === tool)?.label || "Auto";
}

function buildToolMessage(text: string, tool: ToolKey) {
  const selected = toolOptions.find((item) => item.key === tool);
  if (!selected || !selected.prompt) return text;
  return `${selected.prompt}\n\nSolicitud del usuario: ${text}`;
}

function ContextCard({ name, activeContexts, highlightedContext, children }: { name: string; activeContexts: string[]; highlightedContext: string; children: ReactNode }) {
  const isActive = activeContexts.includes(name);
  const isHighlighted = highlightedContext === name;

  return (
    <section className={["context-card", isActive ? "show" : "", isHighlighted ? "is-highlighted" : ""].join(" ")} data-context={name}>
      {children}
    </section>
  );
}

function DataRow({ icon, iconClass, title, subtitle, value, valueClass = "pill" }: { icon: ReactNode; iconClass: string; title: string; subtitle: string; value: string; valueClass?: "pill" | "amount" }) {
  return (
    <div className="data-row">
      <div className={`data-icon ${iconClass}`}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {valueClass === "amount" ? <b>{value}</b> : <span className="pill">{value}</span>}
    </div>
  );
}

function SmartToolButton({ selectedTool, suggestedTool, onAccept, onClear }: { selectedTool: ToolKey; suggestedTool: ToolKey | null; onAccept: () => void; onClear: () => void }) {
  const hasSelected = selectedTool !== "auto";

  return (
    <button
      type="button"
      className={`input-btn smart-tool-btn ${hasSelected ? "has-tool" : suggestedTool ? "has-suggestion" : ""}`}
      onClick={hasSelected ? onClear : onAccept}
      aria-label={hasSelected ? "Quitar tool" : "Aceptar tool sugerida"}
      title={hasSelected ? "Quitar tool" : suggestedTool ? `Usar ${toolLabel(suggestedTool)}` : "Tool auto"}
    >
      {hasSelected ? <X /> : <Plus />}
    </button>
  );
}

function AgentInput({
  value,
  onChange,
  onSubmit,
  inputRef,
  selectedTool,
  onSelectTool,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  selectedTool: ToolKey;
  onSelectTool: (tool: ToolKey) => void;
  placeholder: string;
}) {
  const suggestedTool = selectedTool === "auto" ? detectSuggestedTool(value) : null;

  function acceptSuggestion() {
    if (!suggestedTool) return;
    onSelectTool(suggestedTool);
  }

  return (
    <div className="agent-input">
      {selectedTool !== "auto" ? (
        <span className="input-tool-pill">
          {toolLabel(selectedTool)}
          <button type="button" onClick={() => onSelectTool("auto")} aria-label="Quitar tool"><X /></button>
        </span>
      ) : null}

      <SmartToolButton
        selectedTool={selectedTool}
        suggestedTool={suggestedTool}
        onAccept={acceptSuggestion}
        onClear={() => onSelectTool("auto")}
      />

      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Tab" && suggestedTool) {
            event.preventDefault();
            onSelectTool(suggestedTool);
            return;
          }
          if (event.key === "Backspace" && !value && selectedTool !== "auto") {
            onSelectTool("auto");
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        type="text"
        placeholder={placeholder}
      />

      {suggestedTool ? <span className="tool-suggestion">Tab para usar {toolLabel(suggestedTool)}</span> : null}
      <button type="submit" className="input-btn send-btn" aria-label="Enviar"><SendHorizontal /></button>
    </div>
  );
}

function AiReply({ intent, reply }: { intent: IntentKey; reply: string }) {
  const config = intentConfig[intent] || intentConfig.default;
  const finalReply = reply.trim() || config.summary;

  return (
    <div className="ai-card">
      <h3>{config.title}</h3>
      <p>{finalReply}</p>
      <ul className="ai-list">
        {config.points.map((point) => <li key={point}>{point}</li>)}
      </ul>
      <div className="ai-actions">
        {config.actions.map((action, index) => (
          <button key={action} type="button" className={index === 0 ? "ai-action-btn" : "ai-secondary-btn"}>{action}</button>
        ))}
      </div>
      <div className="feedback">
        <span><ThumbsUp /></span>
        <span><ThumbsDown /></span>
        <span><RefreshCw /></span>
        <span><Copy /></span>
        <span><MoreHorizontal /></span>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="thinking-bubble">
      <span>Analizando CRM</span>
      <div className="dots"><span /><span /><span /></div>
    </div>
  );
}

export function AgentChat(_props: { compact?: boolean; fullscreen?: boolean } = {}) {
  const [conversationMode, setConversationMode] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat");
  const [heroPrompt, setHeroPrompt] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeIntent, setActiveIntent] = useState<IntentKey>("default");
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolKey>("auto");
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const config = intentConfig[activeIntent] || intentConfig.default;
  const highlightedContext = config.contexts[0];

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2400);
  }

  function selectTool(tool: ToolKey) {
    setSelectedTool(tool);
    if (tool !== "auto") showToast(`Tool seleccionada: ${toolLabel(tool)}`);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean) {
      showToast("Escribe una instruccion para Corevix AI.");
      return;
    }

    const tool = selectedTool;
    const intent = detectIntent(clean, tool);
    const agentMessage = buildToolMessage(clean, tool);
    const recentHistory = messages.slice(-8).map((message) => ({
      role: message.type === "user" ? "user" as const : "assistant" as const,
      content: message.type === "user" ? message.text : message.reply,
    }));

    setActiveIntent(intent);
    setConversationMode(true);
    setMobileTab("chat");
    setMessages((current) => [...current, { id: uid("user"), type: "user", text: clean, tool }]);
    setHeroPrompt("");
    setChatPrompt("");
    setIsThinking(true);

    try {
      const data = await sendAgentMessage(agentMessage, recentHistory);
      const reply = extractAgentReply(data);
      setMessages((current) => [...current, { id: uid("ai"), type: "ai", intent, reply }]);
    } catch (error: any) {
      const reply = `No pude conectar con Corevix AI: ${error?.message || "intenta de nuevo."}`;
      setMessages((current) => [...current, { id: uid("ai"), type: "ai", intent, reply }]);
      showToast("No pude conectar con el agente.");
    } finally {
      setIsThinking(false);
      window.setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }

  function resetCleanView() {
    setConversationMode(false);
    setMobileTab("chat");
    heroInputRef.current?.focus();
    showToast("Volviste a la vista limpia del dashboard.");
  }

  function handleActionClick(event: MouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest("button");
    if (!button || !button.matches(".action-btn, .ghost-btn, .ai-action-btn, .ai-secondary-btn")) return;
    const originalText = button.textContent || "Accion";
    button.textContent = "Preparando...";
    button.setAttribute("disabled", "true");
    window.setTimeout(() => {
      button.textContent = "Listo";
      showToast("Accion preparada: " + originalText);
      window.setTimeout(() => {
        button.textContent = originalText;
        button.removeAttribute("disabled");
      }, 1200);
    }, 800);
  }

  return (
    <div className="agentic-dashboard" onClick={handleActionClick}>
      <section className="agent-shell">
        <div className={`agent-stage ${conversationMode ? "conversation-mode" : ""}`} data-mobile-tab={mobileTab}>
          <div className="mobile-tabs">
            {["chat", "data", "actions"].map((tab) => (
              <button type="button" key={tab} className={mobileTab === tab ? "active" : ""} onClick={() => setMobileTab(tab)}>
                {tab === "chat" ? "Chat" : tab === "data" ? "Datos" : "Acciones"}
              </button>
            ))}
          </div>

          <aside className="context-column left-context">
            <ContextCard name="priorities" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Prioridades detectadas</h3>
              <DataRow icon={<AlertTriangle />} iconClass="danger" title="Facturas vencidas" subtitle="Cobros pendientes del CRM" value="$15,680" valueClass="amount" />
              <DataRow icon={<MessageSquare />} iconClass="msg" title="Mensajes sin responder" subtitle="Conversaciones abiertas" value="2" />
              <DataRow icon={<FileText />} iconClass="doc" title="Propuestas abiertas" subtitle="Esperando seguimiento" value="6" />
            </ContextCard>

            <ContextCard name="invoices" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Facturas relevantes</h3>
              <DataRow icon={<DollarSign />} iconClass="danger" title="Facturas vencidas" subtitle="Estado Overdue / Pending" value="$15,680" valueClass="amount" />
              <DataRow icon={<DollarSign />} iconClass="money" title="Por cobrar" subtitle="Facturas enviadas" value="$8,400" />
            </ContextCard>

            <ContextCard name="pipeline" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Pipeline</h3>
              <div className="progress-list">
                {[["Prospectos", "7", "68%"], ["Propuesta enviada", "6", "58%"], ["Negociacion", "4", "42%"]].map(([label, value, width]) => (
                  <div className="progress-item" key={label}>
                    <strong><span>{label}</span><span>{value}</span></strong>
                    <div className="bar"><span style={{ width }} /></div>
                  </div>
                ))}
              </div>
            </ContextCard>

            <ContextCard name="messages" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Mensajes recientes</h3>
              <DataRow icon={<MessageSquare />} iconClass="msg" title="WhatsApp Inbox" subtitle="Conversaciones abiertas" value="12m" />
              <DataRow icon={<MessageSquare />} iconClass="msg" title="Email Inbox" subtitle="Solicitudes sin responder" value="1h" />
            </ContextCard>
          </aside>

          <section className="center-column">
            <div className="snapshot">
              <div className="snap-item"><span className="snap-dot money"><DollarSign /></span><strong>$909,050</strong><span>por cobrar</span></div>
              <div className="snap-item"><span className="snap-dot deal"><TrendingUp /></span><strong>17</strong><span>oportunidades</span></div>
              <div className="snap-item"><span className="snap-dot msg"><MessageSquare /></span><strong>2</strong><span>mensajes</span></div>
              <div className="snap-item"><span className="snap-dot danger"><AlertTriangle /></span><strong>1</strong><span>vencida</span></div>
              <div className="snap-item"><span className="snap-dot doc"><FileText /></span><strong>6</strong><span>propuestas</span></div>
            </div>

            <div className="agent-core">
              <div className="welcome">
                <div className="welcome-inner">
                  <div className="spark"><Sparkles /></div>
                  <p className="agent-label">Corevix AI</p>
                  <h1>¿Qué toca ahora, Inma?</h1>
                  <p className="subtitle">El agente es el centro, pero el dashboard sigue vivo: pregunta algo y Corevix AI abre solo la data que necesitas.</p>

                  <form className="agent-form" onSubmit={(event) => { event.preventDefault(); void sendMessage(heroPrompt); }}>
                    <AgentInput
                      value={heroPrompt}
                      onChange={setHeroPrompt}
                      onSubmit={() => void sendMessage(heroPrompt)}
                      inputRef={heroInputRef}
                      selectedTool={selectedTool}
                      onSelectTool={selectTool}
                      placeholder="Pidele algo a Corevix AI..."
                    />
                  </form>

                  <div className="quick-actions">
                    <button type="button" onClick={() => void sendMessage("Revisa mis prioridades de hoy")}><Target /> Prioridades de hoy</button>
                    <button type="button" onClick={() => void sendMessage("Muestrame las facturas vencidas")}><DollarSign /> Facturas vencidas</button>
                    <button type="button" onClick={() => void sendMessage("Que oportunidades debo cerrar primero")}><TrendingUp /> Cerrar oportunidades</button>
                    <button type="button" onClick={() => void sendMessage("Responde los mensajes pendientes")}><MessageSquare /> Mensajes pendientes</button>
                  </div>
                </div>
              </div>

              <div className="chat-view">
                <div className="chat-head">
                  <button type="button" className="clean-btn" onClick={resetCleanView}><ArrowLeft /> Vista limpia</button>
                  <div className="context-chips">
                    {selectedTool !== "auto" ? <span className="chip"><Bot /> Tool: {toolLabel(selectedTool)}</span> : null}
                    {config.chips.map((chip) => <span className="chip" key={chip}><Circle /> {chip}</span>)}
                  </div>
                </div>

                <div className="chat-scroll">
                  <div className="chat-stream">
                    {messages.map((message) => (
                      <div className={`chat-message ${message.type}`} key={message.id}>
                        <div className="bubble">
                          {message.type === "user" ? (
                            <>
                              {message.tool !== "auto" ? <span className="message-tool">{toolLabel(message.tool)}</span> : null}
                              {message.text}
                            </>
                          ) : <AiReply intent={message.intent} reply={message.reply} />}
                        </div>
                      </div>
                    ))}
                    {isThinking && <div className="chat-message ai thinking-message"><div className="bubble"><ThinkingBubble /></div></div>}
                  </div>
                </div>

                <form className="chat-input-dock" onSubmit={(event) => { event.preventDefault(); void sendMessage(chatPrompt); }}>
                  <AgentInput
                    value={chatPrompt}
                    onChange={setChatPrompt}
                    onSubmit={() => void sendMessage(chatPrompt)}
                    inputRef={chatInputRef}
                    selectedTool={selectedTool}
                    onSelectTool={selectTool}
                    placeholder="Escribe un mensaje para Corevix AI..."
                  />
                </form>
              </div>
            </div>
          </section>

          <aside className="context-column right-context">
            <ContextCard name="actions" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Acciones sugeridas</h3>
              <p>{config.panelSummary}</p>
              <div className="panel-actions">
                {config.actions.map((action, index) => <button key={action} type="button" className={index === 0 ? "action-btn" : "ghost-btn"}>{action}</button>)}
              </div>
            </ContextCard>

            <ContextCard name="activity" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Actividad relacionada</h3>
              <DataRow icon={<MessageSquare />} iconClass="msg" title="Conversacion respondida" subtitle="Sobre propuesta CRM" value="12m" />
              <DataRow icon={<AlertTriangle />} iconClass="danger" title="Nueva factura vencida" subtitle="Modulo de facturas" value="45m" />
              <DataRow icon={<FileText />} iconClass="doc" title="Propuesta enviada" subtitle="Pipeline comercial" value="2h" />
            </ContextCard>

            <ContextCard name="agenda" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Agenda</h3>
              <DataRow icon={<CalendarClock />} iconClass="deal" title="Llamada seguimiento" subtitle="Cliente activo" value="AM" />
              <DataRow icon={<BriefcaseBusiness />} iconClass="doc" title="Reunion con cliente" subtitle="Proyecto abierto" value="PM" />
            </ContextCard>
          </aside>
        </div>
      </section>

      <div className={`toast ${toast ? "show" : ""}`}>
        <strong>Corevix AI</strong>
        <span>{toast || "Preparando accion..."}</span>
      </div>
    </div>
  );
}
