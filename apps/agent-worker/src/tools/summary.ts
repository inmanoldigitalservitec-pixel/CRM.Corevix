import type { ToolContext, ToolResult } from "../types";

export async function crmSummaryTool(ctx: ToolContext): Promise<ToolResult> {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  const [leadsResult, tasksResult, invoicesResult, projectsResult] = await Promise.all([
    ctx.supabase
      .from("leads")
      .select("id,status,created_at")
      .eq("company_id", ctx.companyId)
      .gte("created_at", start.toISOString()),

    ctx.supabase
      .from("tasks")
      .select("id,status,due_date")
      .eq("company_id", ctx.companyId)
      .neq("status", "completed"),

    ctx.supabase
      .from("invoices")
      .select("id,status,total,due_date")
      .eq("company_id", ctx.companyId)
      .neq("status", "paid"),

    ctx.supabase
      .from("projects")
      .select("id,status")
      .eq("company_id", ctx.companyId)
      .neq("status", "completed"),
  ]);

  const errors = [leadsResult.error, tasksResult.error, invoicesResult.error, projectsResult.error].filter(Boolean);

  if (errors.length) {
    return {
      ok: false,
      error: errors.map((error) => error?.message).join(" | "),
    };
  }

  return {
    ok: true,
    message: "Resumen del CRM generado.",
    data: {
      new_leads_today: leadsResult.data?.length ?? 0,
      open_tasks: tasksResult.data?.length ?? 0,
      unpaid_invoices: invoicesResult.data?.length ?? 0,
      active_projects: projectsResult.data?.length ?? 0,
    },
  };
}
