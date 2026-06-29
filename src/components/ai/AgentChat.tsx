import { useRef, useState } from "react";
import { extractAgentReply, sendAgentMessage } from "@/lib/agentClient";
import "./AgenticDashboard.css";

type IntentKey = "priorities" | "invoices" | "pipeline" | "messages" | "default";

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
  | { id: string; type: "user"; text: string }
  | { id: string; type: "ai"; intent: IntentKey; reply: string };

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

const navItems: Array<[string, string, boolean, string]> = [
  ["⌂", "Inicio", false, "/dashboard"],
  ["▦", "Dashboard", false, "/dashboard"],
  ["♙", "Leads", false, "/leads"],
  ["▣", "Clientes", false, "/clients"],
  ["⌘", "Pipeline", false, "/pipeline"],
  ["○", "Bandeja", true, "/whatsapp"],
  ["▤", "Facturas", false, "/invoices"],
  ["▧", "Propuestas", false, "/proposals"],
];

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function detectIntent(text: string): IntentKey {
  const clean = text.toLowerCase();

  if (clean.includes("factura") || clean.includes("cobrar") || clean.includes("vencida") || clean.includes("cobro")) {
    return "invoices";
  }

  if (clean.includes("oportunidad") || clean.includes("cerrar") || clean.includes("pipeline") || clean.includes("propuesta")) {
    return "pipeline";
  }

  if (clean.includes("mensaje") || clean.includes("responde") || clean.includes("bandeja") || clean.includes("whatsapp")) {
    return "messages";
  }

  if (clean.includes("prioridad") || clean.includes("hoy") || clean.includes("toca") || clean.includes("pendiente")) {
    return "priorities";
  }

  return "default";
}

function ContextCard({
  name,
  activeContexts,
  highlightedContext,
  children,
}: {
  name: string;
  activeContexts: string[];
  highlightedContext: string;
  children: React.ReactNode;
}) {
  const isActive = activeContexts.includes(name);
  const isHighlighted = highlightedContext === name;

  return (
    <section
      className={[
        "context-card",
        isActive ? "show" : "",
        isHighlighted ? "is-highlighted" : "",
      ].join(" ")}
      data-context={name}
    >
      {children}
    </section>
  );
}

function DataRow({
  icon,
  iconClass,
  title,
  subtitle,
  value,
  valueClass = "pill",
}: {
  icon: string;
  iconClass: string;
  title: string;
  subtitle: string;
  value: string;
  valueClass?: "pill" | "amount";
}) {
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

function AiReply({ intent, reply }: { intent: IntentKey; reply: string }) {
  const config = intentConfig[intent] || intentConfig.default;
  const finalReply = reply.trim() || config.summary;

  return (
    <div className="ai-card">
      <h3>{config.title}</h3>
      <p>{finalReply}</p>

      <ul className="ai-list">
        {config.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="ai-actions">
        {config.actions.map((action, index) => (
          <button key={action} type="button" className={index === 0 ? "ai-action-btn" : "ai-secondary-btn"}>
            {action}
          </button>
        ))}
      </div>

      <div className="feedback">
        <span>👍</span>
        <span>👎</span>
        <span>↻</span>
        <span>⧉</span>
        <span>•••</span>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="thinking-bubble">
      <span>Analizando CRM</span>
      <div className="dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function AgentChat(_props: { compact?: boolean; fullscreen?: boolean } = {}) {
  const [activeNav, setActiveNav] = useState("Inicio");
  const [conversationMode, setConversationMode] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat");
  const [heroPrompt, setHeroPrompt] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeIntent, setActiveIntent] = useState<IntentKey>("default");
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState("");
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

  async function sendMessage(text: string) {
    const clean = text.trim();

    if (!clean) {
      showToast("Escribe una instruccion para Corevix AI.");
      return;
    }

    const intent = detectIntent(clean);
    const recentHistory = messages
      .filter((message) => message.type === "user" || message.type === "ai")
      .slice(-8)
      .map((message) => ({
        role: message.type === "user" ? "user" as const : "assistant" as const,
        content: message.type === "user" ? message.text : message.reply,
      }));

    setActiveIntent(intent);
    setConversationMode(true);
    setMobileTab("chat");
    setMessages((current) => [...current, { id: uid("user"), type: "user", text: clean }]);
    setHeroPrompt("");
    setChatPrompt("");
    setIsThinking(true);

    try {
      const data = await sendAgentMessage(clean, recentHistory);
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

  function handleActionClick(event: React.MouseEvent<HTMLDivElement>) {
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
      <div className="app">
        <aside className="sidebar">
          <div className="brand">Corevix</div>

          <nav className="nav">
            {navItems.map(([icon, label, hasBadge, href], index) => (
              <a
                href={href}
                key={label}
                className={`nav-item ${activeNav === label ? "active" : ""}`}
                onClick={() => setActiveNav(label)}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-text">{label}</span>
                {hasBadge && <span className="badge">2</span>}
                {index === 4 && <span className="nav-divider-marker" />}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="sidebar-ai"
            onClick={() => {
              if (conversationMode) chatInputRef.current?.focus();
              else heroInputRef.current?.focus();
              showToast("Corevix AI listo para trabajar con tu CRM.");
            }}
          >
            ✦
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="search">
              <span>⌕</span>
              <input type="text" placeholder="Buscar leads, clientes, tareas..." />
              <kbd>⌘ K</kbd>
            </div>

            <div className="top-actions">
              <button type="button" className="circle-btn">?</button>
              <span>Ayuda</span>
              <button type="button" className="circle-btn">⌁</button>
              <button type="button" className="avatar">IC</button>
              <span>Inma</span>
              <span>⌄</span>
            </div>
          </header>

          <section className="agent-shell">
            <div
              className={`agent-stage ${conversationMode ? "conversation-mode" : ""}`}
              data-mobile-tab={mobileTab}
            >
              <div className="mobile-tabs">
                {["chat", "data", "actions"].map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    className={mobileTab === tab ? "active" : ""}
                    onClick={() => setMobileTab(tab)}
                  >
                    {tab === "chat" ? "Chat" : tab === "data" ? "Datos" : "Acciones"}
                  </button>
                ))}
              </div>

              <aside className="context-column left-context">
                <ContextCard name="priorities" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Prioridades detectadas</h3>
                  <DataRow icon="!" iconClass="danger" title="Facturas vencidas" subtitle="Cobros pendientes del CRM" value="$15,680" valueClass="amount" />
                  <DataRow icon="□" iconClass="msg" title="Mensajes sin responder" subtitle="Conversaciones abiertas" value="2" />
                  <DataRow icon="▤" iconClass="doc" title="Propuestas abiertas" subtitle="Esperando seguimiento" value="6" />
                </ContextCard>

                <ContextCard name="invoices" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Facturas relevantes</h3>
                  <DataRow icon="$" iconClass="danger" title="Facturas vencidas" subtitle="Estado Overdue / Pending" value="$15,680" valueClass="amount" />
                  <DataRow icon="$" iconClass="money" title="Por cobrar" subtitle="Facturas enviadas" value="$8,400" />
                </ContextCard>

                <ContextCard name="pipeline" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Pipeline</h3>
                  <div className="progress-list">
                    {[
                      ["Prospectos", "7", "68%"],
                      ["Propuesta enviada", "6", "58%"],
                      ["Negociacion", "4", "42%"],
                    ].map(([label, value, width]) => (
                      <div className="progress-item" key={label}>
                        <strong><span>{label}</span><span>{value}</span></strong>
                        <div className="bar"><span style={{ width }} /></div>
                      </div>
                    ))}
                  </div>
                </ContextCard>

                <ContextCard name="messages" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Mensajes recientes</h3>
                  <DataRow icon="□" iconClass="msg" title="WhatsApp Inbox" subtitle="Conversaciones abiertas" value="12m" />
                  <DataRow icon="□" iconClass="msg" title="Email Inbox" subtitle="Solicitudes sin responder" value="1h" />
                </ContextCard>
              </aside>

              <section className="center-column">
                <div className="snapshot">
                  <div className="snap-item"><span className="snap-dot money">$</span><strong>$909,050</strong><span>por cobrar</span></div>
                  <div className="snap-item"><span className="snap-dot deal">⌁</span><strong>17</strong><span>oportunidades</span></div>
                  <div className="snap-item"><span className="snap-dot msg">□</span><strong>2</strong><span>mensajes</span></div>
                  <div className="snap-item"><span className="snap-dot danger">!</span><strong>1</strong><span>vencida</span></div>
                  <div className="snap-item"><span className="snap-dot doc">▤</span><strong>6</strong><span>propuestas</span></div>
                </div>

                <div className="agent-core">
                  <div className="welcome">
                    <div className="welcome-inner">
                      <div className="spark">✦</div>
                      <p className="agent-label">Corevix AI</p>
                      <h1>¿Qué toca ahora, Inma?</h1>
                      <p className="subtitle">
                        El agente es el centro, pero el dashboard sigue vivo: pregunta algo y Corevix AI abre solo la data que necesitas.
                      </p>

                      <form className="agent-input" onSubmit={(event) => {
                        event.preventDefault();
                        void sendMessage(heroPrompt);
                      }}>
                        <button type="button" className="input-btn">+</button>
                        <input
                          ref={heroInputRef}
                          value={heroPrompt}
                          onChange={(event) => setHeroPrompt(event.target.value)}
                          type="text"
                          placeholder="Pidele algo a Corevix AI..."
                        />
                        <button type="button" className="mode-btn">Inteligente ⌄</button>
                        <button type="submit" className="input-btn send-btn">↗</button>
                      </form>

                      <div className="quick-actions">
                        <button type="button" onClick={() => void sendMessage("Revisa mis prioridades de hoy")}>✧ Prioridades de hoy</button>
                        <button type="button" onClick={() => void sendMessage("Muestrame las facturas vencidas")}>$ Facturas vencidas</button>
                        <button type="button" onClick={() => void sendMessage("Que oportunidades debo cerrar primero")}>⌁ Cerrar oportunidades</button>
                        <button type="button" onClick={() => void sendMessage("Responde los mensajes pendientes")}>□ Mensajes pendientes</button>
                      </div>
                    </div>
                  </div>

                  <div className="chat-view">
                    <div className="chat-head">
                      <button type="button" className="clean-btn" onClick={resetCleanView}>← Vista limpia</button>
                      <div className="context-chips">
                        {config.chips.map((chip) => <span className="chip" key={chip}>● {chip}</span>)}
                      </div>
                    </div>

                    <div className="chat-scroll">
                      <div className="chat-stream">
                        {messages.map((message) => (
                          <div className={`chat-message ${message.type}`} key={message.id}>
                            <div className="bubble">
                              {message.type === "user" ? message.text : <AiReply intent={message.intent} reply={message.reply} />}
                            </div>
                          </div>
                        ))}

                        {isThinking && (
                          <div className="chat-message ai thinking-message">
                            <div className="bubble"><ThinkingBubble /></div>
                          </div>
                        )}
                      </div>
                    </div>

                    <form className="chat-input-dock" onSubmit={(event) => {
                      event.preventDefault();
                      void sendMessage(chatPrompt);
                    }}>
                      <div className="agent-input">
                        <button type="button" className="input-btn">+</button>
                        <input
                          ref={chatInputRef}
                          value={chatPrompt}
                          onChange={(event) => setChatPrompt(event.target.value)}
                          type="text"
                          placeholder="Escribe un mensaje para Corevix AI..."
                        />
                        <button type="button" className="mode-btn">Inteligente ⌄</button>
                        <button type="submit" className="input-btn send-btn">↗</button>
                      </div>
                    </form>
                  </div>
                </div>
              </section>

              <aside className="context-column right-context">
                <ContextCard name="actions" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Acciones sugeridas</h3>
                  <p>{config.panelSummary}</p>
                  <div className="panel-actions">
                    {config.actions.map((action, index) => (
                      <button key={action} type="button" className={index === 0 ? "action-btn" : "ghost-btn"}>{action}</button>
                    ))}
                  </div>
                </ContextCard>

                <ContextCard name="activity" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Actividad relacionada</h3>
                  <DataRow icon="□" iconClass="msg" title="Conversacion respondida" subtitle="Sobre propuesta CRM" value="12m" />
                  <DataRow icon="▧" iconClass="danger" title="Nueva factura vencida" subtitle="Modulo de facturas" value="45m" />
                  <DataRow icon="▤" iconClass="doc" title="Propuesta enviada" subtitle="Pipeline comercial" value="2h" />
                </ContextCard>

                <ContextCard name="agenda" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Agenda</h3>
                  <DataRow icon="11" iconClass="deal" title="Llamada seguimiento" subtitle="Cliente activo" value="AM" />
                  <DataRow icon="15" iconClass="doc" title="Reunion con cliente" subtitle="Proyecto abierto" value="PM" />
                </ContextCard>

                <ContextCard name="empty" activeContexts={config.contexts} highlightedContext={highlightedContext}>
                  <h3>Estado del CRM</h3>
                  <div className="empty-state">No hay informacion critica adicional para esta consulta.</div>
                </ContextCard>
              </aside>
            </div>
          </section>
        </main>
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>
        <strong>Corevix AI</strong>
        <span>{toast || "Preparando accion..."}</span>
      </div>
    </div>
  );
}
