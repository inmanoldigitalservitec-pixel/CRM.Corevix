import { getCorevixSkillsPrompt } from "./skills";
import type { ChatBody, Env } from "./types";
import { createSupabaseAdmin } from "./supabase";
import { getUserContext } from "./auth";
import { parseToolCall } from "./tool-parser";
import { executeTool } from "./tool-router";

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
        tools: ["create_lead", "search_leads", "create_task", "list_tasks", "crm_summary", "create_client", "search_clients", "create_deal", "list_deals", "list_unpaid_invoices"],
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

    const openclawText = await askOpenClaw(env, body.message);
    const toolCall = parseToolCall(openclawText);

    if (!toolCall) {
      return json({
        reply: openclawText,
        mode: "chat",
      });
    }

    const toolResult = await executeTool(toolCall, {
      supabase,
      companyId: userContext.companyId,
      userId: userContext.userId,
    });

    if (!toolResult.ok) {
      const finalReply = await askOpenClawFinalResponse(env, body.message, toolCall, toolResult);

      return json({
        reply: finalReply,
        mode: "tool",
        tool: toolCall.tool,
        tool_result: toolResult,
      });
    }

    const finalReply = await askOpenClawFinalResponse(env, body.message, toolCall, toolResult);

    return json({
      reply: finalReply,
      mode: "tool",
      tool: toolCall.tool,
      tool_result: toolResult,
    });
  } catch (error: any) {
    return json(
      {
        error: "Agent worker error",
        message: error?.message ?? "Unknown error",
      },
      500
    );
  }
}

async function askOpenClaw(env: Env, userMessage: string) {
  const openclawResponse = await fetch(`${env.OPENCLAW_GATEWAY_URL}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENCLAW_GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      model: "openclaw/default",
      input: buildSystemPrompt(userMessage),
    }),
  });

  const data: any = await openclawResponse.json();

  if (!openclawResponse.ok) {
    throw new Error(data?.error?.message ?? "OpenClaw error");
  }

  return (
    data?.output?.[0]?.content?.find((item: any) => item.type === "output_text")?.text ??
    data?.output_text ??
    "OpenClaw respondió, pero no pude extraer el texto."
  );
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
    return toolResult.message ?? `No pude redactar la respuesta final: ${toolResult.error ?? "error desconocido"}`;
  }

  return (
    data?.output?.[0]?.content?.find((item: any) => item.type === "output_text")?.text ??
    data?.output_text ??
    toolResult.message ??
    "Acción ejecutada correctamente."
  );
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


function buildSystemPrompt(userMessage: string) {
  return `
Eres Corevix AI, el asistente interno del CRM Corevix.

Puedes responder normalmente o solicitar una tool.

SKILLS ACTIVAS:
${getCorevixSkillsPrompt()}

TOOLS DISPONIBLES:

1. create_lead
Crea un lead nuevo.
Args:
{
  "name": "Nombre completo opcional",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "phone": "Teléfono",
  "whatsapp": "WhatsApp",
  "email": "Email",
  "company_name": "Empresa",
  "source": "Origen",
  "notes": "Notas",
  "estimated_value": 0
}

2. search_leads
Busca leads por nombre, teléfono, WhatsApp, email o empresa.
Args:
{
  "query": "texto de búsqueda"
}

3. create_task
Crea una tarea interna.
Args:
{
  "title": "Título",
  "description": "Descripción",
  "due_date": "YYYY-MM-DD",
  "priority": "low | medium | high",
  "status": "pending",
  "related_lead_id": "uuid opcional",
  "related_client_id": "uuid opcional",
  "related_deal_id": "uuid opcional",
  "related_project_id": "uuid opcional"
}

4. list_tasks
Lista tareas.
Args:
{
  "status": "pending | completed | all"
}

5. crm_summary
Genera un resumen básico del CRM.
Args: {}

6. create_client
Crea un cliente nuevo.
Args:
{
  "company_name": "Nombre de empresa",
  "contact_person": "Persona de contacto",
  "phone": "Teléfono",
  "email": "Email",
  "status": "active",
  "tags": []
}

7. search_clients
Busca clientes por empresa, contacto, teléfono o email.
Args:
{
  "query": "texto de búsqueda"
}

8. create_deal
Crea una oportunidad/deal.
Args:
{
  "name": "Nombre de la oportunidad",
  "lead_id": "uuid opcional",
  "stage": "new",
  "value": 0,
  "expected_close": "YYYY-MM-DD",
  "notes": "Notas"
}

9. list_deals
Lista oportunidades/deals.
Args:
{
  "stage": "all | new | qualified | proposal | won | lost"
}

10. list_unpaid_invoices
Lista facturas pendientes de pago.
Args: {}

REGLAS:
- Responde en español.
- Si el usuario solo conversa o pregunta algo general, responde normal.
- Si el usuario pide crear, buscar, listar o resumir datos reales del CRM, responde SOLO con JSON.
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
