import type { ToolContext, ToolResult } from "../types";

export async function createTaskTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const title = String(args.title || "").trim();

  if (!title) {
    return {
      ok: false,
      error: "Falta el título de la tarea.",
    };
  }

  const payload = {
    company_id: ctx.companyId,
    title,
    description: args.description ?? null,
    due_date: args.due_date ?? null,
    priority: args.priority ?? "medium",
    status: args.status ?? "pending",
    assigned_to: args.assigned_to ?? null,
    created_by: ctx.userId,
    related_lead_id: args.related_lead_id ?? null,
    related_client_id: args.related_client_id ?? null,
    related_deal_id: args.related_deal_id ?? null,
    related_project_id: args.related_project_id ?? null,
  };

  const { data, error } = await ctx.supabase
    .from("tasks")
    .insert(payload)
    .select("id,title,description,due_date,priority,status,created_at")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    message: `Listo, creé la tarea "${data.title}".`,
    data,
  };
}

export async function listTasksTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const status = args.status ?? "pending";

  let query = ctx.supabase
    .from("tasks")
    .select("id,title,description,due_date,priority,status,created_at")
    .eq("company_id", ctx.companyId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(20);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    message: data?.length
      ? `Tienes ${data.length} tarea(s) ${status === "all" ? "" : status}.`
      : "No encontré tareas pendientes.",
    data,
  };
}
