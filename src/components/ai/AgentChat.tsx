import { useEffect, useRef } from "react";
import { Bot, PanelLeft, Plus, Search, Send, Sparkles } from "lucide-react";
import { getAgentUrl } from "@/lib/agentClient";
import { AGENT_CHAT_STARTERS, useAgentChatController } from "./useAgentChatController";
import "./AgenticAgentShell.css";

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

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

        <form className="flex gap-2 border-t border-[#e6eaf0] p-3" onSubmit={(event) => { event.preventDefault(); handleSend(); }}>
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
      <div className="agentic-ai-layout">
        <aside className={`agentic-ai-history ${sidebarOpen ? "" : "is-closed"}`}>
          <button type="button" onClick={newThread} className="agentic-ai-new-chat">
            <Plus className="h-4 w-4" />
            Nuevo chat
          </button>

          <div className="agentic-ai-search">
            <Search />
            <input placeholder="Buscar chats" />
          </div>

          <div className="agentic-ai-history-list">
            <p className="agentic-ai-section-label">{loadingHistory ? "Cargando..." : "Recientes"}</p>

            {historyError ? <p className="agentic-ai-error">{historyError}</p> : null}

            <div className="agentic-ai-thread-list">
              {threads.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => loadThreadMessages(thread.id)}
                    className={`agentic-ai-thread ${active ? "is-active" : ""}`}
                  >
                    <strong>{thread.title}</strong>
                    <span>{thread.preview}</span>
                    <small>{thread.updatedAt}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="agentic-ai-main">
          <header className="agentic-ai-topbar">
            <div className="agentic-ai-title-row">
              <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="agentic-ai-toggle" aria-label="Abrir historial">
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
                        handleSend();
                      }}
                    >
                      <button type="button" className="agentic-ai-input-action" aria-label="Nueva accion"><Plus className="h-4 w-4" /></button>
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Pregúntale algo a Corevix AI..."
                        rows={1}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <button type="submit" disabled={loading || !text.trim()} className="agentic-ai-send" aria-label="Enviar"><Send className="h-4 w-4" /></button>
                    </form>

                    <div className="agentic-ai-starters">
                      {AGENT_CHAT_STARTERS.map((starter) => (
                        <button key={starter} type="button" onClick={() => handleSend(starter)}>
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
                <form
                  className="agentic-ai-dock-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSend();
                  }}
                >
                  <button type="button" className="agentic-ai-input-action" aria-label="Nueva accion"><Plus className="h-4 w-4" /></button>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Escribe un mensaje para Corevix AI..."
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button type="submit" disabled={loading || !text.trim()} className="agentic-ai-send" aria-label="Enviar"><Send className="h-4 w-4" /></button>
                </form>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
