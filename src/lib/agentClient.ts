import { supabase } from "@/integrations/supabase/client";

const AGENT_URL = (import.meta.env.VITE_AGENT_URL || "http://localhost:8787").replace(/\/$/, "");

export type AgentChatHistoryMessage = { role: "user" | "assistant"; content: string };

type AgentChatResponse = {
  reply?: string;
  response?: string;
  message?: string;
  content?: string;
  [key: string]: unknown;
};

type AgentDashboardContextResponse = {
  ok?: boolean;
  data?: unknown;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export function getAgentUrl() {
  return AGENT_URL;
}

export function extractAgentReply(data: unknown) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "No recibí respuesta del agente.";

  const payload = data as AgentChatResponse;
  const reply = payload.reply || payload.response || payload.message || payload.content;

  if (typeof reply === "string" && reply.trim()) return reply;

  return JSON.stringify(data, null, 2);
}

async function getAccessToken() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("No hay sesión activa de Supabase. Inicia sesión otra vez en el CRM.");
  }

  return accessToken;
}

export async function getAgentDashboardContext() {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${AGENT_URL}/agent/dashboard-context`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status} cargando el contexto del dashboard.`);
  }

  return response.json() as Promise<AgentDashboardContextResponse>;
}

export async function sendAgentMessage(message: string, history: AgentChatHistoryMessage[] = []) {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${AGENT_URL}/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message,
      history: history
        .filter((item) => item?.content?.trim())
        .slice(-10)
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 2000),
        })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status} conectando con Corevix AI.`);
  }

  return response.json() as Promise<AgentChatResponse>;
}
