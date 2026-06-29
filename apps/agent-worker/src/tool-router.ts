import type { ToolCall, ToolContext, ToolResult } from "./types";
import { auditAgentToolAction } from "./tool-audit";
import {
  addLeadNoteTool,
  convertLeadToClientTool,
  createLeadTool,
  listLeadsTool,
  searchLeadsTool,
  updateLeadStatusTool,
  updateLeadTool,
} from "./tools/leads";
import {
  addClientNoteTool,
  createClientTool,
  listClientsTool,
  searchClientsTool,
  updateClientTool,
} from "./tools/clients";
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

async function runTool(
  call: ToolCall,
  ctx: ToolContext,
  fn: () => Promise<ToolResult>,
): Promise<ToolResult> {
  const result = await fn();
  return auditAgentToolAction(ctx, call, result);
}

export async function executeTool(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
  if (!ALLOWED_TOOLS.has(call.tool)) {
    return {
      ok: false,
      error: `Tool no permitida: ${call.tool}`,
    };
  }

  switch (call.tool) {
    case "create_lead":
      return runTool(call, ctx, () => createLeadTool(ctx, call.args));

    case "search_leads":
      return runTool(call, ctx, () => searchLeadsTool(ctx, call.args));

    case "list_leads":
      return runTool(call, ctx, () => listLeadsTool(ctx, call.args));

    case "update_lead":
      return runTool(call, ctx, () => updateLeadTool(ctx, call.args));

    case "update_lead_status":
      return runTool(call, ctx, () => updateLeadStatusTool(ctx, call.args));

    case "add_lead_note":
      return runTool(call, ctx, () => addLeadNoteTool(ctx, call.args));

    case "convert_lead_to_client":
      return runTool(call, ctx, () => convertLeadToClientTool(ctx, call.args));

    case "create_client":
      return runTool(call, ctx, () => createClientTool(ctx, call.args));

    case "search_clients":
      return runTool(call, ctx, () => searchClientsTool(ctx, call.args));

    case "list_clients":
      return runTool(call, ctx, () => listClientsTool(ctx, call.args));

    case "update_client":
      return runTool(call, ctx, () => updateClientTool(ctx, call.args));

    case "add_client_note":
      return runTool(call, ctx, () => addClientNoteTool(ctx, call.args));

    case "create_task":
      return runTool(call, ctx, () => createTaskTool(ctx, call.args));

    case "create_reminder":
      return runTool(call, ctx, () => createReminderTool(ctx, call.args));

    case "create_crm_demo":
      return runTool(call, ctx, () => createCrmDemoTool(ctx, call.args));

    case "list_tasks":
      return runTool(call, ctx, () => listTasksTool(ctx, call.args));

    case "crm_summary":
      return runTool(call, ctx, () => crmSummaryTool(ctx));

    case "create_deal":
      return runTool(call, ctx, () => createDealTool(ctx, call.args));

    case "list_deals":
      return runTool(call, ctx, () => listDealsTool(ctx, call.args));

    case "create_project":
      return runTool(call, ctx, () => createProjectTool(ctx, call.args));

    case "list_projects":
      return runTool(call, ctx, () => listProjectsTool(ctx, call.args));

    case "create_proposal":
      return runTool(call, ctx, () => createProposalTool(ctx, call.args));

    case "search_products":
      return runTool(call, ctx, () => searchProductsTool(ctx, call.args));

    case "list_unpaid_invoices":
      return runTool(call, ctx, () => listUnpaidInvoicesTool(ctx));

    default:
      return {
        ok: false,
        error: `Tool no implementada: ${call.tool}`,
      };
  }
}
