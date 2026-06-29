import { useState } from "react";
import { Clock3, History, Plus, Search, Sparkles } from "lucide-react";
import type { AgentToolContext } from "./agentToolContext";
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

function toneClass(tone?: string) {
  return tone ? `is-${tone}` : "is-slate";
}

function ContextEmptyState() {
  return (
    <div className="agent-context-empty">
      <div className="agent-context-empty-icon"><Sparkles className="h-4 w-4" /></div>
      <h3>Contexto CRM</h3>
      <p>Pide algo sobre leads, tareas, facturas, oportunidades, proyectos o productos. El panel mostrara datos reales cuando una tool devuelva contexto.</p>
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
