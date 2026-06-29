import { useEffect, useState } from "react";
import { extractAgentReply, sendAgentMessage } from "@/lib/agentClient";
import {
  appendAiChatMessage,
  createAiChatThread,
  listAiChatMessages,
  listAiChatThreads,
  updateAiChatThread,
  type AiChatMessage,
  type AiChatThread,
} from "@/lib/aiChatHistory";
import { mapAgentToolContext, type AgentToolContext } from "./agentToolContext";

export type AgentMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  toolContext?: AgentToolContext | null;
};
export type AgentThread = { id: string; title: string; preview: string; updatedAt: string; isLocal?: boolean };

export const LOCAL_THREAD_ID = "local-new";

export const AGENT_CHAT_STARTERS = [
  "Resume mis leads de hoy",
  "Qué tareas tengo pendientes",
  "Qué facturas están vencidas",
  "Dame un resumen del pipeline",
];

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function normalizeRouterText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()\[\]{}'"`´]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isOnlyOneOf(message: string, options: string[]) {
  const normalized = normalizeRouterText(message);
  return options.includes(normalized);
}

function getLocalLightweightReply(message: string): string | null {
  const normalized = normalizeRouterText(message);

  if (!normalized) return null;

  if (
    isOnlyOneOf(message, [
      "hola",
      "hey",
      "ey",
      "hello",
      "hi",
      "buenas",
      "buenos dias",
      "buen dia",
      "buenas tardes",
      "buenas noches",
      "saludos",
      "que tal",
      "como estas",
      "como esta",
    ])
  ) {
    return "¡Hey! Estoy aquí. Dime qué quieres revisar o hacer en el CRM.";
  }

  if (
    isOnlyOneOf(message, [
      "gracias",
      "muchas gracias",
      "ok gracias",
      "perfecto gracias",
      "listo gracias",
      "thanks",
      "thank you",
    ])
  ) {
    return "Con gusto. Cuando quieras seguimos.";
  }

  if (
    isOnlyOneOf(message, [
      "ok",
      "okay",
      "dale",
      "perfecto",
      "bien",
      "listo",
      "entendido",
      "claro",
      "cool",
    ])
  ) {
    return "Perfecto.";
  }

  if (
    isOnlyOneOf(message, [
      "quien eres",
      "quien eres tu",
      "que eres",
      "como te llamas",
      "eres corevix ai",
    ])
  ) {
    return "Soy Corevix AI, tu asistente dentro del CRM. Puedo ayudarte a revisar datos, crear registros, actualizar información y organizar el trabajo del equipo.";
  }

  if (
    isOnlyOneOf(message, [
      "ayuda",
      "help",
      "que puedes hacer",
      "que puedes hacer por mi",
      "que sabes hacer",
      "como puedes ayudarme",
      "que haces",
    ])
  ) {
    return "Puedo ayudarte con leads, clientes, tareas, calendario, pipeline, reportes, búsqueda global y borradores de comunicación. Por ejemplo: “crea un lead”, “lista mis tareas”, “dame un briefing diario” o “busca globalmente a Juan”.";
  }

  return null;
}

function isInternalDebugMessage(message: AgentMessage) {
  return message.role === "assistant" && message.content.startsWith("Modo debug ");
}

function logBrowserAgentDebug(userText: string, recentHistory: AgentMessage[], response: unknown) {
  const historyChars = recentHistory.reduce((total, item) => total + item.content.length, 0);
  const payload = response as any;
  const localRouter = payload?.agent_debug?.local_router;

  console.groupCollapsed("[Corevix AI debug] contexto y tokens");
  console.log(localRouter ? "Frontend -> router local" : "Frontend -> worker", {
    message_chars: userText.length,
    message_estimated_tokens: estimateTokens(userText),
    history_items_sent: localRouter ? 0 : recentHistory.length,
    history_chars_sent: localRouter ? 0 : historyChars,
    history_estimated_tokens: localRouter
      ? 0
      : estimateTokens(userText) + estimateTokens(recentHistory.map((item) => item.content).join("\n")),
    skipped_worker: Boolean(localRouter),
    saved_openclaw_tokens: Boolean(localRouter),
  });
  console.log(
    localRouter ? "Worker -> OpenClaw" : "Worker -> OpenClaw",
    localRouter || payload?.agent_debug || "El worker no devolvio agent_debug. Verifica que el worker este actualizado/reiniciado.",
  );
  console.groupEnd();
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

function threadFromDb(thread: AiChatThread): AgentThread {
  return {
    id: thread.id,
    title: thread.title || "Nuevo chat",
    preview: thread.preview || "Sin mensajes todavía",
    updatedAt: formatUpdatedAt(thread.updated_at),
  };
}

function toolContextFromAgentResponse(agentResponse: unknown) {
  const payload = agentResponse as any;
  return mapAgentToolContext(payload?.tool, payload?.tool_result);
}

function messageFromDb(message: AiChatMessage): AgentMessage {
  const metadata = message.metadata || {};
  const agentResponse = (metadata as any).agent_response;

  return {
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    created_at: message.created_at,
    toolContext: message.role === "assistant" ? toolContextFromAgentResponse(agentResponse) : null,
  };
}

function makeLocalThread(): AgentThread {
  return {
    id: LOCAL_THREAD_ID,
    title: "Nuevo chat",
    preview: "Sin mensajes todavía",
    updatedAt: "Ahora",
    isLocal: true,
  };
}

export function useAgentChatController() {
  const [threads, setThreads] = useState<AgentThread[]>([makeLocalThread()]);
  const [activeThreadId, setActiveThreadId] = useState(LOCAL_THREAD_ID);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, AgentMessage[]>>({
    [LOCAL_THREAD_ID]: [],
  });
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

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
            content: nextDebugMode
              ? "Modo debug activado. Las métricas saldrán en la consola del navegador."
              : "Modo debug desactivado.",
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
        .filter((item) => item.content.trim() && !isInternalDebugMessage(item))
        .slice(-10);

      const localReply = getLocalLightweightReply(userText);

      if (localReply) {
        const localResponse = {
          mode: "local_chat",
          reply: localReply,
          agent_debug: {
            local_router: {
              route: "local_chat",
              reason: "obvious_non_tool_message",
              worker_request_sent: false,
              openclaw_request_sent: false,
              estimated_openclaw_tokens_used: 0,
            },
          },
        };

        if (debugMode) logBrowserAgentDebug(userText, recentHistory, localResponse);

        await appendAiChatMessage(persistedThreadId, "assistant", localReply, {
          agent_response: localResponse,
        });

        await updateAiChatThread(persistedThreadId, {
          title: userText.slice(0, 42),
          preview: localReply.slice(0, 72),
        });

        setMessagesByThread((prev) => ({
          ...prev,
          [persistedThreadId]: [...(prev[persistedThreadId] || []), { role: "assistant", content: localReply }],
        }));
        updateThreadPreviewLocal(persistedThreadId, userText, localReply);
        return;
      }

      const data = await sendAgentMessage(userText, recentHistory, { debug: debugMode });
      if (debugMode) logBrowserAgentDebug(userText, recentHistory, data);

      const reply = extractAgentReply(data);
      const toolContext = toolContextFromAgentResponse(data);

      await appendAiChatMessage(persistedThreadId, "assistant", reply, {
        agent_response: data,
      });

      await updateAiChatThread(persistedThreadId, {
        title: userText.slice(0, 42),
        preview: reply.slice(0, 72),
      });

      setMessagesByThread((prev) => ({
        ...prev,
        [persistedThreadId]: [
          ...(prev[persistedThreadId] || []),
          { role: "assistant", content: reply, toolContext },
        ],
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

  return {
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
    debugMode,
    loadThreadMessages,
    newThread,
    handleSend,
  };
}
