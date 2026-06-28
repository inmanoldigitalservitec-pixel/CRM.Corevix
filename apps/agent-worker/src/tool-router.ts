import type { ToolCall, ToolContext, ToolResult } from "./types";
import { createLeadTool, searchLeadsTool } from "./tools/leads";
import { createTaskTool, listTasksTool } from "./tools/tasks";
import { crmSummaryTool } from "./tools/summary";
import { createClientTool, searchClientsTool } from "./tools/clients";
import { createDealTool, listDealsTool } from "./tools/deals";
import { listUnpaidInvoicesTool } from "./tools/invoices";

const ALLOWED_TOOLS = new Set([
  "create_lead",
  "search_leads",
  "create_task",
  "list_tasks",
  "crm_summary",
  "create_client",
  "search_clients",
  "create_deal",
  "list_deals",
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

    case "create_task":
      return createTaskTool(ctx, call.args);

    case "list_tasks":
      return listTasksTool(ctx, call.args);

    case "crm_summary":
      return crmSummaryTool(ctx);

    case "create_client":
      return createClientTool(ctx, call.args);

    case "search_clients":
      return searchClientsTool(ctx, call.args);

    case "create_deal":
      return createDealTool(ctx, call.args);

    case "list_deals":
      return listDealsTool(ctx, call.args);

    case "list_unpaid_invoices":
      return listUnpaidInvoicesTool(ctx);

    default:
      return {
        ok: false,
        error: `Tool no implementada: ${call.tool}`,
      };
  }
}
