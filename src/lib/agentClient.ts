const AGENT_URL = (import.meta.env.VITE_AGENT_URL || "http://localhost:8787").replace(/\/$/, "");

export type AgentChatResponse = {
  reply?: string;
  response?: string;
  message?: string;
  content?: string;
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

export async function sendAgentMessage(message: string) {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const response = await fetch(`${AGENT_URL}/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status} conectando con Corevix AI.`);
  }

  return response.json() as Promise<AgentChatResponse>;
}
