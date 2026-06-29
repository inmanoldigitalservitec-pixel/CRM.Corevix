import { useState } from "react";
import { CheckSquare, Clock3, History, Plus, ReceiptText, Search, Sparkles, Users } from "lucide-react";
import type { AgentToolContext, AgentWidgetRow } from "./agentToolContext";
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

type FocusedToolMeta = {
  title: string;
  eyebrow: string;
  description: string;
  empty: string;
  nextStep: string;
  tone: "blue" | "orange" | "purple";
  icon: typeof Users;
};

const FOCUSED_TOOL_META: Partial<Record<string, FocusedToolMeta>> = {
  search_leads: {
    title: "Leads encontrados",
    eyebrow: "Ventas",
    description: "Coincidencias reales del CRM para trabajar seguimiento comercial.",
    empty: "No hay leads que coincidan con esta búsqueda.",
    nextStep: "Abre el lead correcto o pide crear una tarea de seguimiento.",
    tone: "blue",
    icon: Users,
  },
  list_unpaid_invoices: {
    title: "Cobros pendientes",
    eyebrow: "Facturación",
    description: "Facturas no pagadas ordenadas para priorizar seguimiento.",
    empty: "No hay facturas pendientes para mostrar.",
    nextStep: "Prioriza las vencidas o las de mayor monto antes de contactar clientes.",
    tone: "orange",
    icon: ReceiptText,
  },
  list_tasks: {
    title: "Tareas pendientes",
    eyebrow: "Operación",
    description: "Tareas reales del CRM para organizar el próximo bloque de trabajo.",
    empty: "No hay tareas con ese filtro.",
    nextStep: "Resuelve primero las tareas de prioridad alta o con fecha más cercana.",
    tone: "purple",
    icon: CheckSquare,
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
      <p>Pide algo sobre leads, tareas, facturas, oportunidades, proyectos o productos. El panel mostrara datos reales cuando haya contexto útil del CRM.</p>
    </div>
  );
}

function FocusedWidgetRow({ row }: { row: AgentWidgetRow }) {
  return (
    <div className="agent-focused-row">
      <span className={`agent-focused-row-icon ${toneClass(row.tone)}`} />
      <div>
        <strong>{row.title}</strong>
        {row.subtitle ? <small>{row.subtitle}</small> : null}
      </div>
      {row.value ? <b>{row.value}</b> : null}
    </div>
  );
}

function FocusedToolWidget({ context, meta }: { context: AgentToolContext; meta: FocusedToolMeta }) {
  const Icon = meta.icon;
  const count = context.rows.length;
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

      {count ? (
        <section className="agent-context-card agent-focused-list-card">
          <div className="agent-focused-list-head">
            <span>Resultados</span>
            {count > visibleRows.length ? <small>Mostrando {visibleRows.length} de {count}</small> : null}
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
      </section>

      {context.metrics?.length ? (
        <section className="agent-context-card">
          <div className="agent-context-metrics">
            {context.metrics.map((metric) => (
              <div key={metric.id} className={`agent-context-metric ${toneClass(metric.tone)}`}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {context.rows.length ? (
        <section className="agent-context-card">
          <div className="agent-context-rows">
            {context.rows.slice(0, 6).map((row) => (
              <div key={row.id} className="agent-context-row">
                <span className={`agent-context-dot ${toneClass(row.tone)}`} />
                <div>
                  <strong>{row.title}</strong>
                  {row.subtitle ? <small>{row.subtitle}</small> : null}
                </div>
                {row.value ? <b>{row.value}</b> : null}
              </div>
            ))}
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
