import type { ToolContext, ToolResult } from "../types";

export async function createTaskTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const title = String(args.title || "").trim();

  if (!title) {
    return { ok: false, error: "Falta el título de la tarea." };
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

  if (error) return { ok: false, error: error.message };

  if (data?.due_date) {
    const calendarType = args.calendar_type || "task";
    const notificationTitle =
      calendarType === "demo"
        ? "Demo CRM creada"
        : calendarType === "reminder"
          ? "Recordatorio creado"
          : "Tarea creada";

    await ctx.supabase.from("notifications").insert({
      company_id: ctx.companyId,
      user_id: ctx.userId,
      title: notificationTitle,
      message: `${data.title} quedó programado para ${data.due_date}.`,
      type: calendarType,
      link: "/calendar",
      read: false,
    });

    await ctx.supabase.from("calendar_events").insert({
      company_id: ctx.companyId,
      user_id: ctx.userId,
      title: data.title,
      description: data.description ?? null,
      type: calendarType,
      status: "scheduled",
      start_at: data.due_date,
      all_day: true,
      related_task_id: data.id,
      metadata: {
        created_from: "corevix_agent",
        task_id: data.id,
      },
    });
  }

  return {
    ok: true,
    message: `Listo, creé la tarea "${data.title}".`,
    data,
  };
}

export async function createReminderTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  return createTaskTool(ctx, {
    ...args,
    title: args.title || args.reminder || "Recordatorio",
    description: args.description || args.notes || "Recordatorio creado desde Corevix AI.",
    priority: args.priority || "medium",
    status: args.status || "pending",
    calendar_type: "reminder",
  });
}

export async function createCrmDemoTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const leadName = args.lead_name || args.client_name || args.name || "prospecto";
  const dueDate = args.due_date || args.demo_date || null;

  return createTaskTool(ctx, {
    ...args,
    title: args.title || `Demo CRM con ${leadName}`,
    description:
      args.description ||
      `Preparar y realizar demo del CRM con ${leadName}.${args.phone ? ` Teléfono: ${args.phone}.` : ""}${args.notes ? ` Notas: ${args.notes}` : ""}`,
    due_date: dueDate,
    priority: args.priority || "high",
    status: "pending",
    calendar_type: "demo",
  });
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

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: data?.length
      ? `Tienes ${data.length} tarea(s) ${status === "all" ? "" : status}.`
      : "No encontré tareas pendientes.",
    data,
  };
}
