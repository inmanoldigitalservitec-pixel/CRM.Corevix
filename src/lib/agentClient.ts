import { supabase } from "@/integrations/supabase/client";

const AGENT_URL = (import.meta.env.VITE_AGENT_URL || "http://localhost:8787").replace(/\/$/, "");

export type AgentChatHistoryMessage = { role: "user" | "assistant"; content: string };
export type AgentToolScope = "general" | "leads" | "clients" | "tasks" | "pipeline" | "reports" | "communication" | "projects" | "finance";

type AgentChatResponse = {
  reply?: string;
  response?: string;
  message?: string;
  content?: string;
  [key: string]: unknown;
};

type SendAgentMessageOptions = {
  debug?: boolean;
  toolScope?: AgentToolScope | null;
};

export function getAgentUrl() {
  return AGENT_URL;
}

export function extractAgentReply(data: unknown) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "No recibi respuesta del agente.";

  const payload = data as AgentChatResponse;
  const reply = payload.reply || payload.response || payload.message || payload.content;

  if (typeof reply === "string" && reply.trim()) return reply;

  return JSON.stringify(data, null, 2);
}

export async function sendAgentMessage(
  message: string,
  history: AgentChatHistoryMessage[] = [],
  options: SendAgentMessageOptions = {},
) {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("No hay sesion activa de Supabase. Inicia sesion otra vez en el CRM.");
  }

  const trimmedHistory = history
    .filter((item) => item?.content?.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 2000),
    }));

  const response = await fetch(`${AGENT_URL}/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message,
      history: trimmedHistory,
      debug: Boolean(options.debug),
      tool_scope: options.toolScope || null,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status} conectando con Corevix AI.`);
  }

  return response.json() as Promise<AgentChatResponse>;
}
