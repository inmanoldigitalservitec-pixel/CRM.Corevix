import type { ToolCall, ToolContext, ToolResult } from "./types";
import { createLeadTool, searchLeadsTool, updateLeadStatusTool } from "./tools/leads";
import { createTaskTool, createReminderTool, createCrmDemoTool, listTasksTool } from "./tools/tasks";
import { crmSummaryTool } from "./tools/summary";
import { createDealTool, listDealsTool } from "./tools/deals";
import { listUnpaidInvoicesTool } from "./tools/invoices";
import { createProjectTool, listProjectsTool } from "./tools/projects";
import { createProposalTool } from "./tools/proposals";
import { searchProductsTool } from "./tools/products";

const ALLOWED_TOOLS = new Set([
  "create_lead",
  "search_leads",
  "update_lead_status",
  "create_task",
  "create_reminder",
  "create_crm_demo",
  "list_tasks",
  "crm_summary",
  "create_deal",
  "list_deals",
  "create_project",
  "list_projects",
  "create_proposal",
  "search_products",
  "list_unpaid_invoices",
]);

export async function executeTool(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
  if (!ALLOWED_TOOLS.has(call.tool)) {
    return {
      ok: false,
      error: `Tool no permitida: ${call.tool}`,
    };
  }

  switch (call.tool) {
    case "create_lead":
      return createLeadTool(ctx, call.args);

    case "search_leads":
      return searchLeadsTool(ctx, call.args);

    case "update_lead_status":
      return updateLeadStatusTool(ctx, call.args);

    case "create_task":
      return createTaskTool(ctx, call.args);

    case "create_reminder":
      return createReminderTool(ctx, call.args);

    case "create_crm_demo":
      return createCrmDemoTool(ctx, call.args);

    case "list_tasks":
      return listTasksTool(ctx, call.args);

    case "crm_summary":
      return crmSummaryTool(ctx);

    case "create_deal":
      return createDealTool(ctx, call.args);

    case "list_deals":
      return listDealsTool(ctx, call.args);

    case "create_project":
      return createProjectTool(ctx, call.args);

    case "list_projects":
      return listProjectsTool(ctx, call.args);

    case "create_proposal":
      return createProposalTool(ctx, call.args);

    case "search_products":
      return searchProductsTool(ctx, call.args);

    case "list_unpaid_invoices":
      return listUnpaidInvoicesTool(ctx);

    default:
      return {
        ok: false,
        error: `Tool no implementada: ${call.tool}`,
      };
  }
}
