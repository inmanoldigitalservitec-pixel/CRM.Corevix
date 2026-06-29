import { getCorevixSkillsPrompt } from "./skills";
import type { ChatBody, ChatHistoryMessage, Env } from "./types";
import { createSupabaseAdmin } from "./supabase";
import { getUserContext } from "./auth";
import { parseToolCall } from "./tool-parser";
import { executeTool } from "./tool-router";

const AVAILABLE_TOOLS = [
  "create_lead",
  "search_leads",
  "list_leads",
  "update_lead",
  "update_lead_status",
  "add_lead_note",
  "convert_lead_to_client",
  "create_client",
  "search_clients",
  "list_clients",
  "update_client",
  "add_client_note",
  "create_task",
  "update_task",
  "complete_task",
  "reschedule_task",
  "add_task_note",
  "create_reminder",
  "create_crm_demo",
  "list_tasks",
  "create_calendar_event",
  "list_calendar_events",
  "update_calendar_event",
  "cancel_calendar_event",
  "crm_summary",
  "create_deal",
  "list_deals",
  "search_deals",
  "update_deal",
  "update_deal_stage",
  "add_deal_note",
  "link_deal_to_lead",
  "assign_deal_owner",
  "create_project",
  "list_projects",
  "create_proposal",
  "search_products",
  "list_unpaid_invoices",
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json(null);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "corevix-agent-worker",
        openclaw_gateway_url: env.OPENCLAW_GATEWAY_URL,
        tools: AVAILABLE_TOOLS,
      });
    }

    if (url.pathname === "/agent/chat" && request.method === "POST") {
      return handleAgentChat(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};

async function handleAgentChat(request: Request, env: Env) {
  try {
    const body = (await request.json()) as ChatBody;

    if (!body.message?.trim()) {
      return json({ error: "Missing message" }, 400);
    }

    const supabase = createSupabaseAdmin(env);
    const userContext = await getUserContext(request, supabase);

    const openclaw = await askOpenClaw(env, body.message, body.history);
    const toolCall = parseToolCall(openclaw.text);

    if (!toolCall) {
      return json({
        reply: openclaw.text,
        mode: "chat",
        openclaw: openclaw.debug,
      });
    }

    const toolResult = await executeTool(toolCall, {
      supabase,
      companyId: userContext.companyId,
      userId: userContext.userId,
    });

    if (!toolResult.ok) {
      const final = await askOpenClawFinalResponse(env, body.message, toolCall, toolResult);

      return json({
        reply: final.text,
        mode: "tool",
        tool: toolCall.tool,
        tool_result: toolResult,
        openclaw: {
          initial: openclaw.debug,
          final: final.debug,
        },
      });
    }

    const final = await askOpenClawFinalResponse(env, body.message, toolCall, toolResult);

    return json({
      reply: final.text,
      mode: "tool",
      tool: toolCall.tool,
      tool_result: toolResult,
      openclaw: {
        initial: openclaw.debug,
        final: final.debug,
      },
    });
  } catch (error: any) {
    return json(
      {
        error: "Agent worker error",
        message: error?.message ?? "Unknown error",
      },
      500,
    );
  }
}

async function askOpenClaw(env: Env, userMessage: string, history: ChatHistoryMessage[] = []) {
  const openclawResponse = await fetch(`${env.OPENCLAW_GATEWAY_URL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      model: "openclaw/default",
      input: buildSystemPrompt(userMessage, history),
    }),
  });

  const data: any = await openclawResponse.json();

  if (!openclawResponse.ok) {
    throw new Error(data?.error?.message ?? "OpenClaw error");
  }

  const text =
    data?.output?.[0]?.content?.find((item: any) => item.type === "output_text")?.text ??
    data?.output_text ??
    "OpenClaw respondió, pero no pude extraer el texto.";

  return {
    text,
    debug: getOpenClawDebug(data),
  };
}

async function askOpenClawFinalResponse(env: Env, userMessage: string, toolCall: any, toolResult: any) {
  const openclawResponse = await fetch(`${env.OPENCLAW_GATEWAY_URL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      model: "openclaw/default",
      input: buildFinalResponsePrompt(userMessage, toolCall, toolResult),
    }),
  });

  const data: any = await openclawResponse.json();

  if (!openclawResponse.ok) {
    return {
      text: toolResult.message ?? `No pude redactar la respuesta final: ${toolResult.error ?? "error desconocido"}`,
      debug: getOpenClawDebug(data),
    };
  }

  const text =
    data?.output?.[0]?.content?.find((item: any) => item.type === "output_text")?.text ??
    data?.output_text ??
    toolResult.message ??
    "Acción ejecutada correctamente.";

  return {
    text,
    debug: getOpenClawDebug(data),
  };
}

function buildFinalResponsePrompt(userMessage: string, toolCall: any, toolResult: any) {
  return `
Eres Corevix AI, el asistente interno del CRM Corevix.

SKILLS ACTIVAS:
${getCorevixSkillsPrompt()}

Tu tarea ahora NO es llamar otra tool.
Tu tarea es redactar una respuesta final humana usando el resultado real de la tool.

REGLAS:
- Responde en español natural.
- No respondas seco.
- No digas solo conteos si hay datos.
- Muestra la información útil del CRM.
- Si faltan datos, dilo de forma natural.
- Sugiere un próximo paso razonable.
- No inventes información.
- No digas que hiciste algo que la tool no confirmó.
- No devuelvas JSON.
- No menciones detalles técnicos como tool_call, payload, raw JSON o Supabase.

Mensaje original del usuario:
${userMessage}

Tool ejecutada:
${JSON.stringify(toolCall, null, 2)}

Resultado real de la tool:
${JSON.stringify(toolResult, null, 2)}

Redacta la respuesta final para el usuario:
  `.trim();
}

function getOpenClawDebug(data: any) {
  return {
    id: data?.id ?? null,
    model: data?.model ?? null,
    status: data?.status ?? null,
    created_at: data?.created_at ?? null,
    usage: data?.usage ?? null,
  };
}

function formatChatHistory(history: ChatHistoryMessage[] = []) {
  const cleanHistory = history
    .filter((item) => item?.content?.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role === "assistant" ? "Corevix AI" : "Usuario",
      content: item.content.trim().slice(0, 2000),
    }));

  if (!cleanHistory.length) {
    return "No hay historial reciente.";
  }

  return cleanHistory.map((item, index) => `${index + 1}. ${item.role}: ${item.content}`).join("\n");
}

function buildSystemPrompt(userMessage: string, history: ChatHistoryMessage[] = []) {
  return `
Eres Corevix AI, el asistente interno del CRM Corevix.

Puedes responder normalmente o solicitar una tool.

SKILLS ACTIVAS:
${getCorevixSkillsPrompt()}

HISTORIAL RECIENTE DEL CHAT:
${formatChatHistory(history)}

Usa este historial solo como contexto conversacional reciente.
No repitas el historial.
No inventes datos.
Si el usuario dice "ese", "eso", "él", "ella", "lo anterior" o "hazlo igual", usa este historial para entender la referencia.

TOOLS DISPONIBLES:

${AVAILABLE_TOOLS.map((tool, index) => `${index + 1}. ${tool}`).join("\n")}

ARGS RESUMIDOS POR TOOL:
- create_lead: name, first_name, last_name, phone, whatsapp, email, company_name, source, notes, estimated_value, status.
- search_leads: query.
- list_leads: status, limit.
- update_lead: lead_id o name/query, más campos editables del lead.
- update_lead_status: lead_id o name/query, status.
- add_lead_note: lead_id o name/query, note.
- convert_lead_to_client: lead_id o name/query, company_name opcional, status opcional, notes opcional.
- create_client: company_name/name, contact_person/contact_name, email, phone, whatsapp, address, city, country, tax_id, website, industry, status, account_manager, tags, notes.
- search_clients: query.
- list_clients: status, limit.
- update_client: client_id o name/query/company_name, más campos editables del cliente.
- add_client_note: client_id o name/query/company_name, note.
- create_task: title, description, due_date, priority: Low | Medium | High | Urgent, status: To Do | In Progress | Completed | Cancelled, assigned_to, related_lead_id, related_client_id, related_deal_id, related_project_id.
- update_task: task_id o title/query, title, description, due_date, priority, status, assigned_to, related IDs.
- complete_task: task_id o title/query.
- reschedule_task: task_id o title/query, due_date/date/start_at.
- add_task_note: task_id o title/query, note.
- create_reminder: title, due_date, priority.
- create_crm_demo: lead_name/client_name/name, phone, due_date/demo_date, notes.
- list_tasks: status, limit.
- create_calendar_event: title/name, start_at/date/due_date, end_at, description/notes, location, type, all_day.
- list_calendar_events: type, status, from, to, limit.
- update_calendar_event: event_id o title/query, title, description, location, start_at/date, end_at, type, status, all_day.
- cancel_calendar_event: event_id o title/query.
- crm_summary: sin args.
- create_deal: name/title, lead_id, stage, value, probability, expected_close, assigned_to, notes.
- list_deals: stage, limit.
- search_deals: query/name/title.
- update_deal: deal_id o name/query/title, name/title, stage, value, probability, expected_close, assigned_to, lead_id, notes.
- update_deal_stage: deal_id o name/query/title, stage/new_stage/to_stage.
- add_deal_note: deal_id o name/query/title, note.
- link_deal_to_lead: deal_id o name/query/title, lead_id.
- assign_deal_owner: deal_id o name/query/title, assigned_to/owner_id/user_id.
- create_project: name, description, lead_id, client_id, deal_id, product_id, budget, start_date, due_date, priority.
- list_projects: status.
- create_proposal: title, amount, currency, description, lead_id, client_id, deal_id, product_id, valid_until.
- search_products: query.
- list_unpaid_invoices: sin args.

REGLAS:
- Responde en español.
- Si el usuario solo conversa o pregunta algo general, responde normal.
- Si el usuario pide crear, buscar, listar, editar, convertir, anotar, completar, mover, asignar, reprogramar o resumir datos reales del CRM, responde SOLO con JSON.
- No uses markdown cuando respondas JSON.
- No inventes IDs.
- Si falta un dato obligatorio, pide aclaración en texto normal.
- Solo puedes usar una tool por mensaje.
- Nunca digas que creaste o modificaste algo si no recibiste resultado de la tool.
- No borres datos.
- No modifiques pagos, facturas o montos todavía.

FORMATO EXACTO PARA TOOL:
{
  "type": "tool_call",
  "tool": "create_lead",
  "args": {}
}

Mensaje del usuario:
${userMessage}
  `.trim();
}

function json(data: any, status = 200) {
  return new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
