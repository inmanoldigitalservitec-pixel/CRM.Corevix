import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckSquare,
  Copy,
  DollarSign,
  FileText,
  GitBranch,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Receipt,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { extractAgentReply, sendAgentMessage } from "@/lib/agentClient";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  isActiveProjectStatus,
  isClosedDealStageValue,
  isClosedLeadStatusValue,
  isCompletedTaskStatusValue,
  isOpenConversationStatus,
  isOpenInvoiceStatus,
  isOverdueInvoiceStatus,
  isPaidInvoiceStatus,
  isPendingProposalStatus,
} from "@/lib/crm/status";
import "./AgenticDashboard.css";
import "./AgenticDashboardIcons.css";
import "./AgenticDashboardPhase1.css";

type IntentKey = "priorities" | "invoices" | "pipeline" | "messages" | "default";
type ToolKey = "auto" | "crm" | "leads" | "clients" | "pipeline" | "invoices" | "tasks" | "messages" | "projects" | "documents";

type IntentConfig = {
  contexts: string[];
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

type AgentDashboardStats = {
  loading: boolean;
  error: string | null;
  leadsNeedFollowUp: number;
  openLeads: number;
  overdueTasks: number;
  tasksToday: number;
  upcomingAgenda: number;
  receivableTotal: number;
  pendingInvoices: number;
  overdueInvoices: number;
  openDeals: number;
  pipelineValue: number;
  pendingProposals: number;
  inboxPending: number;
  whatsappOpen: number;
  emailOpen: number;
  activeProjects: number;
  projectsAtRisk: number;
};

type LeadRow = {
  id: string;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_interaction_at?: string | null;
  next_follow_up?: string | null;
};

type DealRow = {
  id: string;
  stage: string | null;
  value: number | string | null;
};

type TaskRow = {
  id: string;
  status: string | null;
  due_date: string | null;
};

type ProjectRow = {
  id: string;
  status: string | null;
  due_date: string | null;
};

type InvoiceRow = {
  id: string;
  status: string | null;
  total: number | string | null;
  due_date?: string | null;
};

type ProposalRow = {
  id: string;
  status: string | null;
  valid_until?: string | null;
};

type ConversationRow = {
  id: string;
  status: string | null;
};

const emptyStats: AgentDashboardStats = {
  loading: true,
  error: null,
  leadsNeedFollowUp: 0,
  openLeads: 0,
  overdueTasks: 0,
  tasksToday: 0,
  upcomingAgenda: 0,
  receivableTotal: 0,
  pendingInvoices: 0,
  overdueInvoices: 0,
  openDeals: 0,
  pipelineValue: 0,
  pendingProposals: 0,
  inboxPending: 0,
  whatsappOpen: 0,
  emailOpen: 0,
  activeProjects: 0,
  projectsAtRisk: 0,
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
    contexts: ["priorities", "agenda", "actions"],
    title: "Prioridad recomendada",
    summary: "Primero conviene atender lo que afecta seguimiento, cobros y conversaciones abiertas.",
    points: [
      "El contexto lateral muestra solo indicadores reales del CRM.",
      "Puedes pedirme que liste, priorice o cree el siguiente seguimiento.",
    ],
    actions: ["Ver tareas", "Ver leads", "Ver facturas"],
    panelSummary: "Enfocate en tareas vencidas, leads sin seguimiento y cobros pendientes.",
  },
  invoices: {
    contexts: ["invoices", "actions", "agenda"],
    title: "Cobro recomendado",
    summary: "Revisemos facturas pendientes y vencidas para priorizar seguimiento financiero.",
    points: [
      "El panel muestra cobros reales del CRM.",
      "Puedes pedir la lista de facturas pendientes para que OpenClaw use la tool correspondiente.",
    ],
    actions: ["Ver facturas", "Listar pendientes"],
    panelSummary: "Accion sugerida: revisar cobros pendientes y pedir al agente la lista de facturas no pagadas.",
  },
  pipeline: {
    contexts: ["pipeline", "actions", "agenda"],
    title: "Oportunidades a priorizar",
    summary: "El pipeline abierto y las propuestas pendientes ayudan a decidir el siguiente movimiento comercial.",
    points: [
      "Usa el contexto de oportunidades para pedir seguimiento, resumen o creacion de tarea.",
      "Las propuestas pendientes deben revisarse antes de abrir mas trabajo comercial.",
    ],
    actions: ["Ver pipeline", "Ver propuestas"],
    panelSummary: "Accion sugerida: revisar oportunidades abiertas y propuestas pendientes.",
  },
  messages: {
    contexts: ["messages", "actions", "agenda"],
    title: "Mensajes pendientes",
    summary: "Las conversaciones abiertas son una senal directa de atencion comercial pendiente.",
    points: [
      "El panel separa WhatsApp y Email cuando hay datos disponibles.",
      "Puedes pedir una respuesta sugerida o abrir la bandeja correspondiente.",
    ],
    actions: ["Abrir WhatsApp", "Abrir Email"],
    panelSummary: "Accion sugerida: responder primero conversaciones abiertas con intencion comercial.",
  },
  default: {
    contexts: ["priorities", "actions", "agenda"],
    title: "Contexto preparado",
    summary: "Listo. Puedo ayudarte a priorizar, cobrar, responder mensajes o analizar oportunidades del CRM.",
    points: [
      "El chat sigue conectado al agente real.",
      "Los widgets muestran contexto minimo del CRM para no saturar la pantalla.",
    ],
    actions: ["Ver resumen", "Ver actividad"],
    panelSummary: "Corevix AI esta listo para ayudarte a ejecutar la siguiente accion dentro del CRM.",
  },
};

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function dateKeyFromISO(iso?: string | null) {
  const parsed = Date.parse(String(iso || ""));
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localTodayKey() {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateKey(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return dateKeyFromISO(value);
}

function hoursSince(iso?: string | null) {
  const parsed = Date.parse(String(iso || ""));
  if (!Number.isFinite(parsed)) return Infinity;
  return (Date.now() - parsed) / 36e5;
}

function isDateKeyInNextDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map((item) => Number(item));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const date = new Date(year, month - 1, day);
  return date >= start && date <= end;
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
  const visiblePoints = config.points.slice(0, 2);

  return (
    <div className="ai-card ai-card-compact">
      <h3>{config.title}</h3>
      <p>{finalReply}</p>
      {visiblePoints.length ? (
        <ul className="ai-list compact-list">
          {visiblePoints.map((point) => <li key={point}>{point}</li>)}
        </ul>
      ) : null}
      <div className="feedback compact-feedback">
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

function ActionLink({ to, children, primary = false }: { to: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link to={to} className={primary ? "action-btn" : "ghost-btn"}>
      {children}
    </Link>
  );
}

function getActionLinks(intent: IntentKey) {
  if (intent === "invoices") {
    return [
      { to: "/invoices", label: "Ver facturas" },
      { to: "/dashboard", label: "Ver resumen" },
    ];
  }
  if (intent === "pipeline") {
    return [
      { to: "/pipeline", label: "Ver pipeline" },
      { to: "/proposals", label: "Ver propuestas" },
    ];
  }
  if (intent === "messages") {
    return [
      { to: "/whatsapp", label: "Abrir WhatsApp" },
      { to: "/email", label: "Abrir Email" },
    ];
  }
  return [
    { to: "/tasks", label: "Ver tareas" },
    { to: "/leads", label: "Ver leads" },
    { to: "/invoices", label: "Ver facturas" },
  ];
}

export function AgentChat(_props: { compact?: boolean; fullscreen?: boolean } = {}) {
  const { profile } = useAuth();
  const [conversationMode, setConversationMode] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat");
  const [heroPrompt, setHeroPrompt] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeIntent, setActiveIntent] = useState<IntentKey>("default");
  const [isThinking, setIsThinking] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolKey>("auto");
  const [stats, setStats] = useState<AgentDashboardStats>(emptyStats);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const config = intentConfig[activeIntent] || intentConfig.default;
  const highlightedContext = config.contexts[0];
  const valuePlaceholder = stats.loading ? "..." : "0";

  useEffect(() => {
    if (!profile?.company_id) {
      setStats({ ...emptyStats, loading: false, error: "No hay empresa asociada al usuario." });
      return;
    }

    let cancelled = false;
    const cid = profile.company_id;
    const db = supabase as any;

    async function loadDashboardContext() {
      setStats((current) => ({ ...current, loading: true, error: null }));

      const results = await Promise.allSettled([
        db
          .from("leads")
          .select("id,status,created_at,updated_at,last_interaction_at,next_follow_up")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120),
        db
          .from("tasks")
          .select("id,status,due_date")
          .eq("company_id", cid)
          .order("due_date", { ascending: true })
          .limit(120),
        db
          .from("invoices")
          .select("id,status,total,due_date")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120),
        db
          .from("deals")
          .select("id,stage,value")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120),
        db
          .from("proposals")
          .select("id,status,valid_until")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(100),
        db
          .from("whatsapp_conversations")
          .select("id,status")
          .eq("company_id", cid)
          .limit(80),
        db
          .from("email_conversations")
          .select("id,status")
          .eq("company_id", cid)
          .limit(80),
        db
          .from("projects")
          .select("id,status,due_date")
          .eq("company_id", cid)
          .limit(100),
      ]);

      if (cancelled) return;

      const getData = <T,>(index: number): T[] => {
        const result = results[index];
        if (result.status !== "fulfilled" || result.value?.error) return [];
        return (result.value?.data || []) as T[];
      };

      const hadError = results.some((result) => result.status === "rejected" || (result.status === "fulfilled" && result.value?.error));
      const today = localTodayKey();
      const leads = getData<LeadRow>(0);
      const tasks = getData<TaskRow>(1);
      const invoices = getData<InvoiceRow>(2);
      const deals = getData<DealRow>(3);
      const proposals = getData<ProposalRow>(4);
      const whatsapp = getData<ConversationRow>(5);
      const email = getData<ConversationRow>(6);
      const projects = getData<ProjectRow>(7);

      const openLeads = leads.filter((lead) => !isClosedLeadStatusValue(String(lead.status || "")));
      const leadsNeedFollowUp = openLeads.filter((lead) => {
        const staleUpdate = hoursSince(lead.updated_at || lead.created_at) > 24;
        const staleInteraction = lead.last_interaction_at ? hoursSince(lead.last_interaction_at) > 72 : false;
        const missingFollowUp = Object.prototype.hasOwnProperty.call(lead, "next_follow_up") ? !lead.next_follow_up : false;
        return staleUpdate || staleInteraction || missingFollowUp;
      }).length;

      const openTasks = tasks.filter((task) => !isCompletedTaskStatusValue(String(task.status || "")));
      const overdueTasks = openTasks.filter((task) => {
        const dueKey = toDateKey(task.due_date);
        return Boolean(dueKey && dueKey < today);
      }).length;
      const tasksToday = openTasks.filter((task) => toDateKey(task.due_date) === today).length;
      const taskAgenda = openTasks.filter((task) => {
        const dueKey = toDateKey(task.due_date);
        return Boolean(dueKey && isDateKeyInNextDays(dueKey, 7));
      }).length;

      const pendingInvoiceRows = invoices.filter((invoice) => isOpenInvoiceStatus(String(invoice.status || "")));
      const overdueInvoiceRows = invoices.filter((invoice) => {
        const dueKey = toDateKey(invoice.due_date);
        return isOverdueInvoiceStatus(String(invoice.status || "")) || Boolean(dueKey && !isPaidInvoiceStatus(String(invoice.status || "")) && dueKey < today);
      });
      const receivableTotal = pendingInvoiceRows.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

      const openDealRows = deals.filter((deal) => !isClosedDealStageValue(String(deal.stage || "")));
      const pipelineValue = openDealRows.reduce((sum, deal) => sum + toNumber(deal.value), 0);
      const pendingProposalRows = proposals.filter((proposal) => isPendingProposalStatus(String(proposal.status || "")));
      const whatsappOpen = whatsapp.filter((conversation) => isOpenConversationStatus(conversation.status)).length;
      const emailOpen = email.filter((conversation) => isOpenConversationStatus(conversation.status)).length;
      const activeProjectRows = projects.filter((project) => isActiveProjectStatus(String(project.status || "")));
      const projectsAtRisk = activeProjectRows.filter((project) => {
        const dueKey = toDateKey(project.due_date);
        return Boolean(dueKey && dueKey < today);
      }).length;
      const projectAgenda = activeProjectRows.filter((project) => {
        const dueKey = toDateKey(project.due_date);
        return Boolean(dueKey && isDateKeyInNextDays(dueKey, 7));
      }).length;

      setStats({
        loading: false,
        error: hadError ? "Algunos indicadores no pudieron cargarse." : null,
        leadsNeedFollowUp,
        openLeads: openLeads.length,
        overdueTasks,
        tasksToday,
        upcomingAgenda: taskAgenda + projectAgenda,
        receivableTotal,
        pendingInvoices: pendingInvoiceRows.length,
        overdueInvoices: overdueInvoiceRows.length,
        openDeals: openDealRows.length,
        pipelineValue,
        pendingProposals: pendingProposalRows.length,
        inboxPending: whatsappOpen + emailOpen,
        whatsappOpen,
        emailOpen,
        activeProjects: activeProjectRows.length,
        projectsAtRisk,
      });
    }

    void loadDashboardContext();

    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2400);
  }

  function selectTool(tool: ToolKey) {
    setSelectedTool(tool);
    if (tool !== "auto") showToast(`Tool seleccionada: ${toolLabel(tool)}`);
  }

  function openConversationLayer() {
    setActiveIntent("default");
    setConversationMode(true);
    setMobileTab("chat");
    setHeroPrompt("");
    setChatPrompt("");
    setIsThinking(false);
    window.setTimeout(() => chatInputRef.current?.focus(), 50);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean) {
      showToast("Escribe una instruccion para Corevix AI.");
      return;
    }

    if (clean === ".") {
      openConversationLayer();
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

  const actionLinks = getActionLinks(activeIntent);

  return (
    <div className="agentic-dashboard">
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
              <h3>Atencion ahora</h3>
              {stats.error ? <p>{stats.error}</p> : null}
              <DataRow icon={<Users />} iconClass="deal" title="Leads sin seguimiento" subtitle="Prospectos abiertos que requieren accion" value={stats.loading ? valuePlaceholder : String(stats.leadsNeedFollowUp)} />
              <DataRow icon={<AlertTriangle />} iconClass="danger" title="Tareas atrasadas" subtitle="Pendientes con fecha vencida" value={stats.loading ? valuePlaceholder : String(stats.overdueTasks)} />
              <DataRow icon={<Receipt />} iconClass="money" title="Facturas por cobrar" subtitle="Pendientes o enviadas" value={stats.loading ? valuePlaceholder : formatMoney(stats.receivableTotal)} valueClass="amount" />
            </ContextCard>

            <ContextCard name="invoices" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Cobros</h3>
              <DataRow icon={<AlertTriangle />} iconClass="danger" title="Facturas vencidas" subtitle="Requieren seguimiento" value={stats.loading ? valuePlaceholder : String(stats.overdueInvoices)} />
              <DataRow icon={<Receipt />} iconClass="money" title="Facturas pendientes" subtitle="No pagadas" value={stats.loading ? valuePlaceholder : String(stats.pendingInvoices)} />
              <DataRow icon={<DollarSign />} iconClass="money" title="Total por cobrar" subtitle="Monto abierto" value={stats.loading ? valuePlaceholder : formatMoney(stats.receivableTotal)} valueClass="amount" />
            </ContextCard>

            <ContextCard name="pipeline" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Ventas</h3>
              <DataRow icon={<GitBranch />} iconClass="deal" title="Oportunidades abiertas" subtitle="Deals activos" value={stats.loading ? valuePlaceholder : String(stats.openDeals)} />
              <DataRow icon={<TrendingUp />} iconClass="deal" title="Pipeline abierto" subtitle="Valor estimado" value={stats.loading ? valuePlaceholder : formatMoney(stats.pipelineValue)} valueClass="amount" />
              <DataRow icon={<FileText />} iconClass="doc" title="Propuestas pendientes" subtitle="Esperando respuesta" value={stats.loading ? valuePlaceholder : String(stats.pendingProposals)} />
            </ContextCard>

            <ContextCard name="messages" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Bandejas</h3>
              <DataRow icon={<MessageSquare />} iconClass="msg" title="Conversaciones abiertas" subtitle="WhatsApp y Email" value={stats.loading ? valuePlaceholder : String(stats.inboxPending)} />
              <DataRow icon={<MessageSquare />} iconClass="msg" title="WhatsApp" subtitle="Conversaciones abiertas" value={stats.loading ? valuePlaceholder : String(stats.whatsappOpen)} />
              <DataRow icon={<MessageSquare />} iconClass="msg" title="Email" subtitle="Conversaciones abiertas" value={stats.loading ? valuePlaceholder : String(stats.emailOpen)} />
            </ContextCard>
          </aside>

          <section className="center-column">
            <div className="snapshot">
              <div className="snap-item"><span className="snap-dot money"><DollarSign /></span><strong>{stats.loading ? valuePlaceholder : formatMoney(stats.receivableTotal)}</strong><span>por cobrar</span></div>
              <div className="snap-item"><span className="snap-dot deal"><TrendingUp /></span><strong>{stats.loading ? valuePlaceholder : String(stats.openDeals)}</strong><span>oportunidades</span></div>
              <div className="snap-item"><span className="snap-dot msg"><MessageSquare /></span><strong>{stats.loading ? valuePlaceholder : String(stats.inboxPending)}</strong><span>mensajes</span></div>
              <div className="snap-item"><span className="snap-dot danger"><CheckSquare /></span><strong>{stats.loading ? valuePlaceholder : String(stats.tasksToday)}</strong><span>hoy</span></div>
              <div className="snap-item"><span className="snap-dot doc"><FileText /></span><strong>{stats.loading ? valuePlaceholder : String(stats.pendingProposals)}</strong><span>propuestas</span></div>
            </div>

            <div className="agent-core">
              <div className="welcome">
                <div className="welcome-inner">
                  <div className="spark"><Sparkles /></div>
                  <p className="agent-label">Corevix AI</p>
                  <h1>¿Qué toca ahora, Inma?</h1>
                  <p className="subtitle">Pregunta algo y Corevix AI usa el CRM real para ayudarte a priorizar, cobrar, responder o avanzar oportunidades.</p>

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
                    <button type="button" onClick={() => void sendMessage("Dame un resumen del CRM de hoy")}><Target /> Resumen de hoy</button>
                    <button type="button" onClick={() => void sendMessage("Muestrame las facturas pendientes")}><DollarSign /> Facturas pendientes</button>
                    <button type="button" onClick={() => void sendMessage("Que oportunidades debo priorizar")}><TrendingUp /> Oportunidades</button>
                    <button type="button" onClick={() => void sendMessage("Que mensajes tengo pendientes")}><MessageSquare /> Mensajes pendientes</button>
                  </div>
                </div>
              </div>

              <div className="chat-view">
                <div className="chat-head chat-head-clean">
                  <button type="button" className="clean-btn" onClick={resetCleanView}><ArrowLeft /> Vista limpia</button>
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
              <h3>Siguiente paso</h3>
              <p>{config.panelSummary}</p>
              <div className="panel-actions">
                {actionLinks.map((action, index) => (
                  <ActionLink key={action.to} to={action.to} primary={index === 0}>{action.label}</ActionLink>
                ))}
              </div>
            </ContextCard>

            <ContextCard name="agenda" activeContexts={config.contexts} highlightedContext={highlightedContext}>
              <h3>Agenda breve</h3>
              <DataRow icon={<CheckSquare />} iconClass="danger" title="Tareas para hoy" subtitle="Pendientes con fecha de hoy" value={stats.loading ? valuePlaceholder : String(stats.tasksToday)} />
              <DataRow icon={<CalendarClock />} iconClass="deal" title="Proximos 7 dias" subtitle="Tareas y entregas" value={stats.loading ? valuePlaceholder : String(stats.upcomingAgenda)} />
              <DataRow icon={<BriefcaseBusiness />} iconClass="doc" title="Proyectos activos" subtitle="Trabajo en curso" value={stats.loading ? valuePlaceholder : String(stats.activeProjects)} />
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
