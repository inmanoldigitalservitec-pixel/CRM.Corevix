import type { ToolCall, ToolContext, ToolResult } from "./types";

const IMPORTANT_TOOLS = new Set([
  "create_lead",
  "update_lead_status",
  "create_task",
  "create_reminder",
  "create_crm_demo",
  "create_deal",
  "create_project",
  "create_proposal",
  "create_client",
]);

const TOOL_LABELS: Record<string, string> = {
  create_lead: "Lead creado",
  update_lead_status: "Lead actualizado",
  create_task: "Tarea creada",
  create_reminder: "Recordatorio creado",
  create_crm_demo: "Demo creada",
  create_deal: "Oportunidad creada",
  create_project: "Proyecto creado",
  create_proposal: "Propuesta creada",
  create_client: "Cliente creado",
};

function pickTarget(args: Record<string, any>, result: ToolResult) {
  const data = result?.data || {};

  const fullLeadName =
    data.first_name || data.last_name
      ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim()
      : null;

  return (
    fullLeadName ||
    data.title ||
    data.name ||
    data.company_name ||
    data.number ||
    args.title ||
    args.name ||
    args.lead_name ||
    args.client_name ||
    args.company_name ||
    args.number ||
    "acción realizada"
  );
}

function getRecordId(result: ToolResult) {
  const data = result?.data;
  if (!data) return null;

  if (Array.isArray(data)) return null;

  return typeof data.id === "string" ? data.id : null;
}

function safeMetadata(call: ToolCall, result: ToolResult) {
  const args = call.args || {};
  const data = result?.data || {};

  return {
    source: "corevix_agent_worker",
    actor: "corevix_ai",
    tool: call.tool,
    ok: result.ok,
    args_summary: {
      title: args.title ?? null,
      name: args.name ?? null,
      lead_name: args.lead_name ?? null,
      client_name: args.client_name ?? null,
      company_name: args.company_name ?? null,
      status: args.status ?? null,
      due_date: args.due_date ?? null,
      amount: args.amount ?? null,
      value: args.value ?? null,
      stage: args.stage ?? null,
    },
    result_summary: {
      id: data?.id ?? null,
      title: data?.title ?? null,
      name: data?.name ?? null,
      number: data?.number ?? null,
      status: data?.status ?? null,
      message: result.message ?? null,
    },
  };
}

export async function auditAgentToolAction(
  ctx: ToolContext,
  call: ToolCall,
  result: ToolResult,
): Promise<ToolResult> {
  if (!result?.ok) return result;
  if (!IMPORTANT_TOOLS.has(call.tool)) return result;

  const label = TOOL_LABELS[call.tool] || "Acción realizada";
  const target = pickTarget(call.args || {}, result);
  const recordId = getRecordId(result);

  const title = `Corevix AI: ${label}`;
  const message = result.message || `El agente ejecutó ${call.tool}: ${target}.`;

  try {
    await ctx.supabase.from("notifications").insert({
      company_id: ctx.companyId,
      user_id: ctx.userId,
      title,
      message,
      type: "agent_action",
      link: "/ai-assistant",
      read: false,
    });
  } catch (error) {
    console.error("[agent-audit] notification insert failed", {
      tool: call.tool,
      error,
    });
  }

  try {
    await ctx.supabase.from("activity_logs").insert({
      company_id: ctx.companyId,
      user_id: ctx.userId,
      entity_type: "agent_tool",
      entity_id: recordId,
      action: call.tool,
      detail: message,
      metadata: safeMetadata(call, result),
    });
  } catch (error) {
    console.error("[agent-audit] activity log insert failed", {
      tool: call.tool,
      error,
    });
  }

  return result;
}
