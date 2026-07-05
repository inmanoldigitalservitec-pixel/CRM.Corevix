## 09-agent-client-full
```
import { supabase } from "@/integrations/supabase/client";

const AGENT_URL = (import.meta.env.VITE_AGENT_URL || "http://localhost:8787").replace(/\/$/, "");

export type AgentChatHistoryMessage = { role: "user" | "assistant"; content: string };
export type AgentToolScope =
  | "general"
  | "leads"
  | "clients"
  | "tasks"
  | "pipeline"
  | "reports"
  | "communication"
  | "projects"
  | "finance";
export type AgentPlanSeverity = "critical" | "high" | "medium" | "low";
export type AgentPlanState =
  | "new"
  | "reviewed"
  | "approved"
  | "executing"
  | "completed"
  | "dismissed"
  | "expired";

export type AgentPlanAction = {
  id: string;
  type: string;
  label: string;
  reason?: string;
  module?: string;
  target?: {
    type?: string;
    id?: string | null;
    label?: string | null;
    href?: string | null;
    status?: string | null;
  } | null;
  priority?: AgentPlanSeverity;
  requiresConfirmation?: boolean;
  payload?: Record<string, string | number | boolean | null>;
};

export type AgentDailyPlanRow = {
  id?: string;
  cycle_date: string;
  case_key: string;
  case_type: string;
  case_title: string;
  case_summary: string | null;
  case_severity: AgentPlanSeverity;
  plan_title: string;
  plan_summary: string;
  generated_plan?: {
    title?: string;
    summary?: string;
    actions?: AgentPlanAction[];
    rationale?: string | null;
  } | null;
  suggested_actions?: AgentPlanAction[] | null;
  state: AgentPlanState;
  state_reason?: string | null;
  source_modules?: string[] | null;
  source_event_ids?: string[] | null;
  source_memory_keys?: string[] | null;
  reminder_count?: number | null;
  last_reminded_at?: string | null;
  next_reminder_at?: string | null;
  reviewed_at?: string | null;
  approved_at?: string | null;
  executing_at?: string | null;
  completed_at?: string | null;
  dismissed_at?: string | null;
  expired_at?: string | null;
  metadata?: Record<string, unknown> | null;
  snapshot_base?: {
    generatedAt?: string;
    headline?: string;
    counts?: Record<string, number>;
  } | null;
  detected_case?: {
    title?: string;
    summary?: string;
    severity?: AgentPlanSeverity;
    sourceModules?: string[];
    item?: {
      title?: string;
      summary?: string;
      urgencyReason?: string;
      recommendation?: string;
      client?: string | null;
      project?: string | null;
      lead?: string | null;
      amount?: string | null;
      dueAt?: string | null;
      href?: string | null;
      bucket?: string;
      kind?: string;
      actions?: AgentPlanAction[];
    };
  } | null;
};

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

type AgentDailyPlansResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: {
    cycle_date?: string;
    snapshot?: Record<string, unknown>;
    plans?: AgentDailyPlanRow[];
  };
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

async function getAgentAccessToken() {
  const sessionResult = await supabase.auth.getSession();
  const session = sessionResult.data.session;

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("No hay sesion activa de Supabase. Inicia sesion otra vez en el CRM.");
  }

  return accessToken;
}

export async function sendAgentMessage(
  message: string,
  history: AgentChatHistoryMessage[] = [],
  options: SendAgentMessageOptions = {},
) {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const accessToken = await getAgentAccessToken();

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

export async function fetchAgentDailyPlans(cycleDate?: string) {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const accessToken = await getAgentAccessToken();
  const url = new URL(`${AGENT_URL}/agent/daily-plans/today`);
  if (cycleDate) {
    url.searchParams.set("cycle_date", cycleDate);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json()) as AgentDailyPlansResponse;

  if (!response.ok || payload.ok === false) {
    throw new Error(
      payload.error || payload.message || `Error ${response.status} cargando planes del agente.`,
    );
  }

  return {
    cycleDate: payload.data?.cycle_date || cycleDate || null,
    plans: payload.data?.plans || [],
    snapshot: payload.data?.snapshot || null,
    message: payload.message || null,
  };
}

export async function syncAgentDailyPlans(
  options: {
    cycleDate?: string;
    expireMissing?: boolean;
  } = {},
) {
  if (!AGENT_URL) {
    throw new Error("Falta configurar VITE_AGENT_URL para conectar con Corevix AI.");
  }

  const accessToken = await getAgentAccessToken();
  const response = await fetch(`${AGENT_URL}/agent/daily-plans/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      cycle_date: options.cycleDate || null,
      expire_missing: options.expireMissing ?? true,
    }),
  });

  const payload = (await response.json()) as AgentDailyPlansResponse;

  if (!response.ok || payload.ok === false) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Error ${response.status} sincronizando planes del agente.`,
    );
  }

  return {
    cycleDate: payload.data?.cycle_date || options.cycleDate || null,
    plans: payload.data?.plans || [],
    snapshot: payload.data?.snapshot || null,
    message: payload.message || null,
  };
}


export type AgentPromptPayloadRow = {
  id?: string;
  company_id?: string | null;
```
