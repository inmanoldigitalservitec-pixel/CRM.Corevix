import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CheckSquare,
  Clock3,
  FileText,
  FolderKanban,
  History,
  PackageSearch,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { AgentToolContext, AgentWidgetMetric, AgentWidgetRow } from "./agentToolContext";
import type { AgentThread } from "./useAgentChatController";
import "./AgentContextPanel.css";

type AgentContextPanelProps = {
  context: AgentToolContext | null;
  threads: AgentThread[];
  activeThreadId: string;
  loadingHistory: boolean;
  historyError: string | null;
  onNewThread: () => void;
  onLoadThread: (threadId: string) => void;
};

type PanelMode = "context" | "history";
type FocusedTone = "blue" | "orange" | "purple" | "teal" | "slate";

type FocusedToolMeta = {
  title: string;
  eyebrow: string;
  description: string;
  empty: string;
  nextStep: string;
  tone: FocusedTone;
  icon: typeof Users;
};

const FOCUSED_TOOL_META: Partial<Record<string, FocusedToolMeta>> = {
  create_lead: {
    title: "Lead creado",
    eyebrow: "Ventas",
    description: "Nuevo prospecto registrado en el CRM.",
    empty: "El lead fue procesado, pero no hay detalle visual disponible.",
    nextStep: "Crea una tarea de seguimiento para no dejar enfriar este prospecto.",
    tone: "blue",
    icon: UserPlus,
  },
  search_leads: {
    title: "Leads encontrados",
    eyebrow: "Ventas",
    description: "Coincidencias reales del CRM para trabajar seguimiento comercial.",
    empty: "No hay leads que coincidan con esta busqueda.",
    nextStep: "Abre el lead correcto o pide crear una tarea de seguimiento.",
    tone: "blue",
    icon: Users,
  },
  update_lead_status: {
    title: "Lead actualizado",
    eyebrow: "Ventas",
    description: "Estado comercial actualizado en el CRM.",
    empty: "No hay detalle visual para este cambio de estado.",
    nextStep: "Pide ver el lead o crear una siguiente accion comercial.",
    tone: "blue",
    icon: UserCheck,
  },
  create_task: {
    title: "Tarea creada",
    eyebrow: "Operacion",
    description: "Nueva accion operativa registrada en el CRM.",
    empty: "La tarea fue procesada, pero no hay detalle visual disponible.",
    nextStep: "Revisa prioridad y fecha para organizar el siguiente bloque de trabajo.",
    tone: "purple",
    icon: CheckSquare,
  },
  create_reminder: {
    title: "Recordatorio creado",
    eyebrow: "Agenda",
    description: "Seguimiento programado desde el CRM.",
    empty: "El recordatorio fue procesado, pero no hay detalle visual disponible.",
    nextStep: "Cuando llegue la fecha, puedes pedirle al agente ejecutar el seguimiento.",
    tone: "purple",
    icon: Clock3,
  },
  create_crm_demo: {
    title: "Demo CRM creada",
    eyebrow: "Agenda",
    description: "Actividad comercial preparada para una demostracion.",
    empty: "La demo fue procesada, pero no hay detalle visual disponible.",
    nextStep: "Antes de la demo, pide revisar el lead o preparar una propuesta.",
    tone: "purple",
    icon: BriefcaseBusiness,
  },
  list_tasks: {
    title: "Tareas pendientes",
    eyebrow: "Operacion",
    description: "Tareas reales del CRM para organizar el proximo bloque de trabajo.",
    empty: "No hay tareas con ese filtro.",
    nextStep: "Resuelve primero las tareas de prioridad alta o con fecha mas cercana.",
    tone: "purple",
    icon: CheckSquare,
  },
  crm_summary: {
    title: "Resumen CRM",
    eyebrow: "Dashboard",
    description: "Lectura general con los indicadores reales disponibles.",
    empty: "No hay indicadores disponibles para mostrar.",
    nextStep: "Usa este resumen para decidir si conviene revisar leads, tareas, cobros o proyectos.",
    tone: "blue",
    icon: BarChart3,
  },
  create_deal: {
    title: "Oportunidad creada",
    eyebrow: "Pipeline",
    description: "Nueva oportunidad registrada en ventas.",
    empty: "La oportunidad fue procesada, pero no hay detalle visual disponible.",
    nextStep: "Agrega seguimiento, propuesta o fecha esperada de cierre.",
    tone: "blue",
    icon: BriefcaseBusiness,
  },
  list_deals: {
    title: "Oportunidades",
    eyebrow: "Pipeline",
    description: "Deals reales del CRM para priorizar ventas.",
    empty: "No hay oportunidades con ese filtro.",
    nextStep: "Prioriza oportunidades con mayor valor o cierre mas cercano.",
    tone: "blue",
    icon: BriefcaseBusiness,
  },
  list_unpaid_invoices: {
    title: "Cobros pendientes",
    eyebrow: "Facturacion",
    description: "Facturas no pagadas ordenadas para priorizar seguimiento.",
    empty: "No hay facturas pendientes para mostrar.",
    nextStep: "Prioriza las vencidas o las de mayor monto antes de contactar clientes.",
    tone: "orange",
    icon: ReceiptText,
  },
  create_project: {
    title: "Proyecto creado",
    eyebrow: "Proyectos",
    description: "Nuevo proyecto operativo registrado en el CRM.",
    empty: "El proyecto fue procesado, pero no hay detalle visual disponible.",
    nextStep: "Define tareas, fechas y responsables para mantenerlo en movimiento.",
    tone: "teal",
    icon: FolderKanban,
  },
  list_projects: {
    title: "Proyectos",
    eyebrow: "Proyectos",
    description: "Proyectos reales del CRM con estado y prioridad.",
    empty: "No hay proyectos con ese filtro.",
    nextStep: "Revisa proyectos activos con entrega cercana o prioridad alta.",
    tone: "teal",
    icon: FolderKanban,
  },
  create_proposal: {
    title: "Propuesta creada",
    eyebrow: "Propuestas",
    description: "Nueva propuesta comercial registrada en el CRM.",
    empty: "La propuesta fue procesada, pero no hay detalle visual disponible.",
    nextStep: "Pide revisar la propuesta o crear una tarea de seguimiento al cliente.",
    tone: "teal",
    icon: FileText,
  },
  search_products: {
    title: "Productos encontrados",
    eyebrow: "Catalogo",
    description: "Productos o servicios reales disponibles para vender.",
    empty: "No hay productos que coincidan con esta busqueda.",
    nextStep: "Usa el producto correcto para preparar una oportunidad o propuesta.",
    tone: "slate",
    icon: PackageSearch,
  },
};

function toneClass(tone?: string) {
  return tone ? `is-${tone}` : "is-slate";
}

function ContextEmptyState() {
  return (
    <div className="agent-context-empty">
      <div className="agent-context-empty-icon"><Sparkles className="h-4 w-4" /></div>
      <h3>Contexto CRM</h3>
      <p>Pide algo sobre leads, tareas, facturas, oportunidades, proyectos o productos. El panel mostrara datos reales cuando haya contexto util del CRM.</p>
    </div>
  );
}

function MetricAction({ metric }: { metric: AgentWidgetMetric }) {
  const action = metric.actions?.[0];
  const className = `agent-context-metric ${toneClass(metric.tone)} ${action ? "is-clickable" : ""}`;
  const body = (
    <>
      <strong>{metric.value}</strong>
      <span>{metric.label}</span>
      {action ? <em>{action.label}</em> : null}
    </>
  );

  return action ? (
    <a key={metric.id} href={action.href} className={className}>{body}</a>
  ) : (
    <div key={metric.id} className={className}>{body}</div>
  );
}

function FocusedWidgetRow({ row }: { row: AgentWidgetRow }) {
  const action = row.actions?.[0];
  const body = (
    <>
      <span className={`agent-focused-row-icon ${toneClass(row.tone)}`} />
      <div>
        <strong>{row.title}</strong>
        {row.subtitle ? <small>{row.subtitle}</small> : null}
      </div>
      {row.value ? <b>{row.value}</b> : null}
      {action ? <em>{action.label}</em> : null}
    </>
  );

  return action ? (
    <a href={action.href} className="agent-focused-row is-clickable">{body}</a>
  ) : (
    <div className="agent-focused-row">{body}</div>
  );
}

function FocusedToolWidget({ context, meta }: { context: AgentToolContext; meta: FocusedToolMeta }) {
  const Icon = meta.icon;
  const count = context.metrics?.length ? context.metrics.length : context.rows.length;
  const visibleRows = context.rows.slice(0, 6);

  return (
    <div className="agent-focused-widget">
      <section className={`agent-focused-hero is-${meta.tone}`}>
        <div className="agent-focused-icon"><Icon className="h-4 w-4" /></div>
        <div>
          <span>{meta.eyebrow}</span>
          <h3>{meta.title}</h3>
          <p>{count ? meta.description : meta.empty}</p>
        </div>
        <strong>{count}</strong>
      </section>

      {context.primaryAction ? (
        <a href={context.primaryAction.href} className={`agent-context-primary-action is-${context.primaryAction.tone || meta.tone}`}>
          {context.primaryAction.label}
        </a>
      ) : null}

      {context.metrics?.length ? (
        <section className="agent-context-card agent-focused-list-card">
          <div className="agent-context-metrics">
            {context.metrics.map((metric) => <MetricAction key={metric.id} metric={metric} />)}
          </div>
        </section>
      ) : null}

      {visibleRows.length ? (
        <section className="agent-context-card agent-focused-list-card">
          <div className="agent-focused-list-head">
            <span>Resultados</span>
            {context.rows.length > visibleRows.length ? <small>Mostrando {visibleRows.length} de {context.rows.length}</small> : null}
          </div>
          <div className="agent-focused-list">
            {visibleRows.map((row) => <FocusedWidgetRow key={row.id} row={row} />)}
          </div>
        </section>
      ) : null}

      <section className="agent-focused-next-step">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{meta.nextStep}</span>
      </section>
    </div>
  );
}

function ContextView({ context }: { context: AgentToolContext | null }) {
  if (!context) return <ContextEmptyState />;

  if (context.status === "error") {
    return (
      <section className="agent-context-card is-error">
        <h3>{context.title}</h3>
        <p>{context.summary || "No se pudo cargar este contexto."}</p>
      </section>
    );
  }

  const focusedMeta = FOCUSED_TOOL_META[context.tool];
  if (focusedMeta) {
    return <FocusedToolWidget context={context} meta={focusedMeta} />;
  }

  if (context.status === "empty") {
    return (
      <section className="agent-context-card">
        <h3>{context.title}</h3>
        <p>{context.summary || "No hay datos relevantes para mostrar en este momento."}</p>
      </section>
    );
  }

  return (
    <div className="agent-context-stack">
      <section className="agent-context-card is-highlighted">
        <h3>{context.title}</h3>
        {context.summary ? <p>{context.summary}</p> : null}
        {context.primaryAction ? (
          <a href={context.primaryAction.href} className={`agent-context-primary-action is-${context.primaryAction.tone || "blue"}`}>
            {context.primaryAction.label}
          </a>
        ) : null}
      </section>

      {context.metrics?.length ? (
        <section className="agent-context-card">
          <div className="agent-context-metrics">
            {context.metrics.map((metric) => <MetricAction key={metric.id} metric={metric} />)}
          </div>
        </section>
      ) : null}

      {context.rows.length ? (
        <section className="agent-context-card">
          <div className="agent-context-rows">
            {context.rows.slice(0, 6).map((row) => {
              const action = row.actions?.[0];
              const body = (
                <>
                  <span className={`agent-context-dot ${toneClass(row.tone)}`} />
                  <div>
                    <strong>{row.title}</strong>
                    {row.subtitle ? <small>{row.subtitle}</small> : null}
                  </div>
                  {row.value ? <b>{row.value}</b> : null}
                  {action ? <em>{action.label}</em> : null}
                </>
              );

              return action ? (
                <a key={row.id} href={action.href} className="agent-context-row is-clickable">{body}</a>
              ) : (
                <div key={row.id} className="agent-context-row">{body}</div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function HistoryView({
  threads,
  activeThreadId,
  loadingHistory,
  historyError,
  onLoadThread,
}: Pick<AgentContextPanelProps, "threads" | "activeThreadId" | "loadingHistory" | "historyError" | "onLoadThread">) {
  return (
    <div className="agent-context-history-view">
      <div className="agent-context-search">
        <Search className="h-4 w-4" />
        <input placeholder="Buscar chats" />
      </div>

      <p className="agent-context-label">{loadingHistory ? "Cargando..." : "Conversaciones"}</p>
      {historyError ? <p className="agent-context-error">{historyError}</p> : null}

      <div className="agent-context-thread-list">
        {threads.map((thread) => {
          const active = thread.id === activeThreadId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onLoadThread(thread.id)}
              className={`agent-context-thread ${active ? "is-active" : ""}`}
            >
              <strong>{thread.title}</strong>
              <span>{thread.preview}</span>
              <small><Clock3 className="h-3 w-3" /> {thread.updatedAt}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgentContextPanel({
  context,
  threads,
  activeThreadId,
  loadingHistory,
  historyError,
  onNewThread,
  onLoadThread,
}: AgentContextPanelProps) {
  const [mode, setMode] = useState<PanelMode>("context");

  return (
    <aside className="agent-context-panel">
      <div className="agent-context-actions">
        <button type="button" onClick={onNewThread} className="agent-context-new-chat">
          <Plus className="h-4 w-4" />
          Nuevo chat
        </button>
        <div className="agent-context-tabs" aria-label="Panel del agente">
          <button type="button" className={mode === "context" ? "is-active" : ""} onClick={() => setMode("context")}>Contexto</button>
          <button type="button" className={mode === "history" ? "is-active" : ""} onClick={() => setMode("history")}><History className="h-3.5 w-3.5" /> Historial</button>
        </div>
      </div>

      <div className="agent-context-body">
        {mode === "context" ? (
          <ContextView context={context} />
        ) : (
          <HistoryView
            threads={threads}
            activeThreadId={activeThreadId}
            loadingHistory={loadingHistory}
            historyError={historyError}
            onLoadThread={onLoadThread}
          />
        )}
      </div>
    </aside>
  );
}
