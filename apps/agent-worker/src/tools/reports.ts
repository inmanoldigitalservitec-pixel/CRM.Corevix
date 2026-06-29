import type { ToolContext, ToolResult } from "../types";

function sum(rows: any[] | null | undefined, key: string) {
  return (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function countBy(rows: any[] | null | undefined, key: string) {
  return (rows || []).reduce((acc: Record<string, number>, row) => {
    const value = String(row?.[key] || "Sin definir");
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function valueBy(rows: any[] | null | undefined, groupKey: string, valueKey: string) {
  return (rows || []).reduce((acc: Record<string, number>, row) => {
    const group = String(row?.[groupKey] || "Sin definir");
    acc[group] = (acc[group] || 0) + Number(row?.[valueKey] || 0);
    return acc;
  }, {});
}

export async function salesReportTool(ctx: ToolContext): Promise<ToolResult> {
  const [{ data: leads, error: leadsError }, { data: deals, error: dealsError }, { data: tasks, error: tasksError }] = await Promise.all([
    ctx.supabase.from("leads").select("id,status,estimated_value,created_at").eq("company_id", ctx.companyId),
    ctx.supabase.from("deals").select("id,stage,value,probability,expected_close,created_at").eq("company_id", ctx.companyId),
    ctx.supabase.from("tasks").select("id,status,priority,due_date").eq("company_id", ctx.companyId),
  ]);

  const errors = [leadsError, dealsError, tasksError].filter(Boolean);
  if (errors.length) return { ok: false, error: errors.map((error) => error?.message).join(" | ") };

  const wonDeals = (deals || []).filter((deal: any) => String(deal.stage || "").toLowerCase().includes("won"));
  const openDeals = (deals || []).filter((deal: any) => !["won", "lost"].includes(String(deal.stage || "").toLowerCase()));

  return {
    ok: true,
    message: "Reporte de ventas generado.",
    data: {
      total_leads: leads?.length || 0,
      leads_by_status: countBy(leads, "status"),
      total_deals: deals?.length || 0,
      open_deals: openDeals.length,
      won_deals: wonDeals.length,
      open_pipeline_value: sum(openDeals, "value"),
      won_value: sum(wonDeals, "value"),
      deals_by_stage_value: valueBy(deals, "stage", "value"),
      open_tasks: (tasks || []).filter((task: any) => !["Completed", "completed"].includes(String(task.status))).length,
    },
  };
}

export async function pipelineReportTool(ctx: ToolContext): Promise<ToolResult> {
  const { data, error } = await ctx.supabase
    .from("deals")
    .select("id,name,stage,value,probability,expected_close,assigned_to,updated_at")
    .eq("company_id", ctx.companyId)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  const deals = data || [];

  return {
    ok: true,
    message: "Reporte de pipeline generado.",
    data: {
      total_deals: deals.length,
      count_by_stage: countBy(deals, "stage"),
      value_by_stage: valueBy(deals, "stage", "value"),
      top_open_deals: deals
        .filter((deal: any) => !["Won", "Lost"].includes(String(deal.stage)))
        .sort((a: any, b: any) => Number(b.value || 0) - Number(a.value || 0))
        .slice(0, 5),
    },
  };
}

export async function activityReportTool(ctx: ToolContext): Promise<ToolResult> {
  const [{ data: tasks }, { data: emailThreads }, { data: whatsappThreads }] = await Promise.all([
    ctx.supabase.from("tasks").select("id,status,priority,due_date,updated_at").eq("company_id", ctx.companyId).order("updated_at", { ascending: false }).limit(50),
    ctx.supabase.from("email_conversations").select("id,status,unread_count,last_message_at").eq("company_id", ctx.companyId).order("last_message_at", { ascending: false }).limit(50),
    ctx.supabase.from("crm_whatsapp_conversation_list").select("*").eq("company_id", ctx.companyId).order("last_message_at", { ascending: false, nullsFirst: false }).limit(50),
  ]);

  return {
    ok: true,
    message: "Reporte de actividad generado.",
    data: {
      tasks_by_status: countBy(tasks, "status"),
      urgent_tasks: (tasks || []).filter((task: any) => ["High", "Urgent", "high", "urgent"].includes(String(task.priority))).length,
      email_threads: emailThreads?.length || 0,
      unread_email_threads: (emailThreads || []).filter((thread: any) => Number(thread.unread_count || 0) > 0).length,
      whatsapp_threads: whatsappThreads?.length || 0,
      recent_tasks: (tasks || []).slice(0, 5),
    },
  };
}

export async function agentDailyBriefingTool(ctx: ToolContext): Promise<ToolResult> {
  const [sales, pipeline, activity] = await Promise.all([
    salesReportTool(ctx),
    pipelineReportTool(ctx),
    activityReportTool(ctx),
  ]);

  if (!sales.ok) return sales;
  if (!pipeline.ok) return pipeline;
  if (!activity.ok) return activity;

  return {
    ok: true,
    message: "Briefing diario generado.",
    data: {
      sales: sales.data,
      pipeline: pipeline.data,
      activity: activity.data,
    },
  };
}
