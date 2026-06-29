import { useEffect, useRef, useState } from "react";
import { Bot, PanelLeft, Plus, Search, Send, Sparkles } from "lucide-react";
import { extractAgentReply, getAgentUrl, sendAgentMessage } from "@/lib/agentClient";
import {
  appendAiChatMessage,
  createAiChatThread,
  listAiChatMessages,
  listAiChatThreads,
  updateAiChatThread,
  type AiChatMessage,
  type AiChatThread,
} from "@/lib/aiChatHistory";

type Message = { id?: string; role: "user" | "assistant"; content: string; created_at?: string };
type Thread = { id: string; title: string; preview: string; updatedAt: string; isLocal?: boolean };

const LOCAL_THREAD_ID = "local-new";

const STARTERS = [
  "Resume mis leads de hoy",
  "Qué tareas tengo pendientes",
  "Qué facturas están vencidas",
  "Dame un resumen del pipeline",
];


function formatOpenClawUsageLine(openclaw: unknown) {
  const payload = openclaw as any;
  const debug = payload?.final || payload;

  if (!debug) return "";

  const usage = debug?.usage;
  const model = debug?.model || "modelo desconocido";
  const responseId = debug?.id ? ` · ${String(debug.id).slice(0, 13)}...` : "";

  if (!usage) {
    return `\n\n---\nOpenClaw: ${model}${responseId}\nCréditos Codex restantes: no disponible desde el gateway`;
  }

  const input = usage.input_tokens ?? "?";
  const output = usage.output_tokens ?? "?";
  const total = usage.total_tokens ?? "?";

  return `\n\n---\nOpenClaw: ${model} · input ${input} · output ${output} · total ${total}${responseId}\nCréditos Codex restantes: no disponible desde el gateway`;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "Ahora";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ahora";

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString();
}

function threadFromDb(thread: AiChatThread): Thread {
  return {
    id: thread.id,
    title: thread.title || "Nuevo chat",
    preview: thread.preview || "Sin mensajes todavía",
    updatedAt: formatUpdatedAt(thread.updated_at),
  };
}

function messageFromDb(message: AiChatMessage): Message {
  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    created_at: message.created_at,
  };
}

function makeLocalThread(): Thread {
  return {
    id: LOCAL_THREAD_ID,
    title: "Nuevo chat",
    preview: "Sin mensajes todavía",
    updatedAt: "Ahora",
    isLocal: true,
  };
}

export function AgentChat({
  compact = false,
  fullscreen = false,
}: {
  compact?: boolean;
  fullscreen?: boolean;
}) {
  const [threads, setThreads] = useState<Thread[]>([makeLocalThread()]);
  const [activeThreadId, setActiveThreadId] = useState(LOCAL_THREAD_ID);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({
    [LOCAL_THREAD_ID]: [],
  });
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const messages = messagesByThread[activeThreadId] || [];

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const dbThreads = await listAiChatThreads();

        if (cancelled) return;

        if (!dbThreads.length) {
          setThreads([makeLocalThread()]);
          setActiveThreadId(LOCAL_THREAD_ID);
          setMessagesByThread({ [LOCAL_THREAD_ID]: [] });
          return;
        }

        const mapped = dbThreads.map(threadFromDb);
        const firstId = mapped[0].id;

        setThreads(mapped);
        setActiveThreadId(firstId);

        const dbMessages = await listAiChatMessages(firstId);
        if (cancelled) return;

        setMessagesByThread({ [firstId]: dbMessages.map(messageFromDb) });
      } catch (error: any) {
        if (!cancelled) {
          setHistoryError(error?.message || "No pude cargar el historial del chat.");
          setThreads([makeLocalThread()]);
          setActiveThreadId(LOCAL_THREAD_ID);
          setMessagesByThread({ [LOCAL_THREAD_ID]: [] });
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    loadThreads();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function loadThreadMessages(threadId: string) {
    setActiveThreadId(threadId);
    setText("");

    if (threadId === LOCAL_THREAD_ID) return;
    if (messagesByThread[threadId]) return;

    try {
      const dbMessages = await listAiChatMessages(threadId);
      setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: dbMessages.map(messageFromDb),
      }));
    } catch (error: any) {
      setHistoryError(error?.message || "No pude cargar los mensajes.");
    }
  }

  function newThread() {
    const local = makeLocalThread();

    setThreads((prev) => {
      const withoutOldLocal = prev.filter((thread) => thread.id !== LOCAL_THREAD_ID);
      return [local, ...withoutOldLocal];
    });

    setMessagesByThread((prev) => ({ ...prev, [LOCAL_THREAD_ID]: [] }));
    setActiveThreadId(LOCAL_THREAD_ID);
    setText("");
  }

  function updateThreadPreviewLocal(threadId: string, userText: string, assistantText?: string) {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              title: thread.title === "Nuevo chat" ? userText.slice(0, 42) : thread.title,
              preview: (assistantText || userText).slice(0, 72),
              updatedAt: "Ahora",
            }
          : thread,
      ),
    );
  }

  function replaceLocalThread(tempId: string, dbThread: AiChatThread) {
    const mapped = threadFromDb(dbThread);

    setThreads((prev) => [mapped, ...prev.filter((thread) => thread.id !== tempId)]);
    setMessagesByThread((prev) => {
      const localMessages = prev[tempId] || [];
      const next = { ...prev, [dbThread.id]: localMessages };
      delete next[tempId];
      return next;
    });
    setActiveThreadId(dbThread.id);
  }

  async function ensureThread(threadId: string, userText: string) {
    if (threadId !== LOCAL_THREAD_ID) return threadId;

    const dbThread = await createAiChatThread({
      title: userText.slice(0, 42) || "Nuevo chat",
      preview: userText.slice(0, 72),
    });

    replaceLocalThread(threadId, dbThread);

    return dbThread.id;
  }

  async function handleSend(raw = text) {
    const userText = raw.trim();
    if (!userText || loading) return;

    if (userText.toLowerCase() === "/debug") {
      const nextDebugMode = !debugMode;
      setDebugMode(nextDebugMode);
      setText("");
      setMessagesByThread((prev) => ({
        ...prev,
        [activeThreadId]: [
          ...(prev[activeThreadId] || []),
          {
            role: "assistant",
            content: nextDebugMode ? "Modo debug activado." : "Modo debug desactivado.",
          },
        ],
      }));
      return;
    }

    const currentThreadId = activeThreadId;
    setText("");
    setLoading(true);

    setMessagesByThread((prev) => ({
      ...prev,
      [currentThreadId]: [...(prev[currentThreadId] || []), { role: "user", content: userText }],
    }));
    updateThreadPreviewLocal(currentThreadId, userText);

    let persistedThreadId = currentThreadId;

    try {
      persistedThreadId = await ensureThread(currentThreadId, userText);

      await appendAiChatMessage(persistedThreadId, "user", userText);

      const recentHistory = messages
        .filter((item) => item.content.trim())
        .slice(-10);

      const data = await sendAgentMessage(userText, recentHistory);
      const baseReply = extractAgentReply(data);
      const reply = debugMode ? `${baseReply}${formatOpenClawUsageLine((data as any)?.openclaw)}` : baseReply;

      await appendAiChatMessage(persistedThreadId, "assistant", reply, {
        agent_response: data,
      });

      await updateAiChatThread(persistedThreadId, {
        title: userText.slice(0, 42),
        preview: reply.slice(0, 72),
      });

      setMessagesByThread((prev) => ({
        ...prev,
        [persistedThreadId]: [...(prev[persistedThreadId] || []), { role: "assistant", content: reply }],
      }));
      updateThreadPreviewLocal(persistedThreadId, userText, reply);
    } catch (error: any) {
      const reply = `Error conectando con Corevix AI: ${error?.message || "No se pudo conectar."}`;

      try {
        if (persistedThreadId && persistedThreadId !== LOCAL_THREAD_ID) {
          await appendAiChatMessage(persistedThreadId, "assistant", reply, { error: true });
          await updateAiChatThread(persistedThreadId, { preview: reply.slice(0, 72) });
        }
      } catch {
        // Evita tapar el error principal.
      }

      setMessagesByThread((prev) => ({
        ...prev,
        [persistedThreadId]: [...(prev[persistedThreadId] || []), { role: "assistant", content: reply }],
      }));
      updateThreadPreviewLocal(persistedThreadId, userText, reply);
    } finally {
      setLoading(false);
    }
  }

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
    <div className="flex h-full min-h-0 overflow-hidden bg-[#fbfbfa]">
      <aside className={`${sidebarOpen ? "flex" : "hidden"} w-[292px] shrink-0 flex-col border-r border-[#e5e7eb] bg-[#f3f3f0] p-3 lg:flex`}>
        <button
          type="button"
          onClick={newThread}
          className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111827] text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          Nuevo chat
        </button>

        <div className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-[#deded8] bg-white px-3">
          <Search className="h-4 w-4 text-[#6b7280]" />
          <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar chats" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-2 py-2 text-[11px] font-black uppercase tracking-wide text-[#6b7280]">
            {loadingHistory ? "Cargando..." : "Recientes"}
          </p>

          {historyError ? (
            <div className="mb-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {historyError}
            </div>
          ) : null}

          <div className="space-y-1">
            {threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => loadThreadMessages(thread.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left transition ${active ? "bg-white shadow-sm" : "hover:bg-white/70"}`}
                >
                  <p className="truncate text-sm font-bold text-[#111827]">{thread.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#6b7280]">{thread.preview}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af]">{thread.updatedAt}</p>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white/85 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5e7eb] bg-white text-[#374151] lg:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-black text-[#111827]">Corevix AI</h1>
              <p className="text-xs font-semibold text-[#6b7280]">Historial guardado · OpenClaw local</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-[#dce8e2] bg-white px-2.5 py-1 text-[11px] font-black text-[#008069] sm:inline">
            {getAgentUrl()}
          </span>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {loadingHistory ? (
            <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center text-sm font-semibold text-[#6b7280]">
              Cargando historial...
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-[#111827] text-white">
                <Bot className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-[#111827]">Hola, Inmanol</h2>
              <p className="mt-2 text-sm font-semibold text-[#6b7280]">¿Cómo puedo ayudarte hoy?</p>

              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => handleSend(starter)}
                    className="rounded-2xl border border-[#e5e7eb] bg-white p-4 text-left text-sm font-bold text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Sparkles className="mb-3 h-4 w-4 text-[#1d62f9]" />
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id || `${msg.role}-${index}`} className={isUser ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${isUser ? "bg-[#111827] text-white" : "bg-transparent text-[#111827]"}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex items-center gap-2 text-sm font-semibold text-[#6b7280]">
                  <Sparkles className="h-4 w-4 animate-pulse text-[#1d62f9]" />
                  Pensando...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#e5e7eb] bg-[#fbfbfa] px-4 py-4">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-[#dcdedc] bg-white p-2 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Pregúntale algo a Corevix AI..."
              rows={1}
              className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-[15px] outline-none placeholder:text-[#9ca3af]"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#111827] text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
