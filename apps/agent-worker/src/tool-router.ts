import type { ToolCall, ToolContext, ToolResult } from './types';
import { auditAgentToolAction } from './tool-audit';
import {
	addLeadNoteTool,
	convertLeadToClientTool,
	createLeadTool,
	listLeadsTool,
	searchLeadsTool,
	updateLeadStatusTool,
	updateLeadTool,
} from './tools/leads';
import { addClientNoteTool, createClientTool, listClientsTool, searchClientsTool, updateClientTool } from './tools/clients';
import {
	cancelCalendarEventTool,
	completeTaskTool,
	createCalendarEventTool,
	listCalendarEventsTool,
	listTasksTool,
	rescheduleTaskTool,
	updateCalendarEventTool,
	updateTaskTool,
} from './tools/tasks';
import {
	addTaskChecklistItemTool,
	addTaskCommentTool,
	completeTaskChecklistItemTool,
	deleteTaskChecklistItemTool,
	deleteTaskCommentTool,
	getTaskDetailTool,
	listTaskChecklistTool,
	listTaskCommentsTool,
	updateTaskChecklistItemTool,
} from './tools/task-collaboration';
import { createDemoForResolvedUser, createReminderForResolvedUser, createTaskForResolvedUser } from './tools/assignees';
import { crmSummaryTool } from './tools/summary';
import {
	addDealNoteTool,
	assignDealOwnerTool,
	createDealTool,
	linkDealToLeadTool,
	listDealsTool,
	searchDealsTool,
	updateDealStageTool,
	updateDealTool,
} from './tools/deals';
import {
	draftEmailReplyTool,
	draftWhatsappReplyTool,
	listEmailThreadsTool,
	listInboxConversationsTool,
	listWhatsappMessagesTool,
	searchEmailMessagesTool,
} from './tools/communication';
import { activityReportTool, agentDailyBriefingTool, pipelineReportTool, salesReportTool } from './tools/reports';
import { addGlobalNoteTool, getRecordByIdTool, globalSearchTool } from './tools/global';
import { listUnpaidInvoicesTool } from './tools/invoices';
import { createProjectTool, listProjectsTool } from './tools/projects';
import { createProposalTool } from './tools/proposals';
import { searchProductsTool } from './tools/products';

const ALLOWED_TOOLS = new Set([
	'create_lead',
	'search_leads',
	'list_leads',
	'update_lead',
	'update_lead_status',
	'add_lead_note',
	'convert_lead_to_client',
	'create_client',
	'search_clients',
	'list_clients',
	'update_client',
	'add_client_note',
	'create_task',
	'update_task',
	'complete_task',
	'reschedule_task',
	'add_task_note',
	'get_task_detail',
	'add_task_comment',
	'list_task_comments',
	'delete_task_comment',
	'add_task_checklist_item',
	'list_task_checklist',
	'update_task_checklist_item',
	'complete_task_checklist_item',
	'delete_task_checklist_item',
	'create_reminder',
	'create_crm_demo',
	'list_tasks',
	'create_calendar_event',
	'list_calendar_events',
	'update_calendar_event',
	'cancel_calendar_event',
	'crm_summary',
	'create_deal',
	'list_deals',
	'search_deals',
	'update_deal',
	'update_deal_stage',
	'add_deal_note',
	'link_deal_to_lead',
	'assign_deal_owner',
	'list_email_threads',
	'search_email_messages',
	'draft_email_reply',
	'list_inbox_conversations',
	'list_whatsapp_messages',
	'draft_whatsapp_reply',
	'sales_report',
	'pipeline_report',
	'activity_report',
	'agent_daily_briefing',
	'global_search',
	'get_record_by_id',
	'add_global_note',
	'create_project',
	'list_projects',
	'create_proposal',
	'search_products',
	'list_unpaid_invoices',
]);

async function runTool(call: ToolCall, ctx: ToolContext, fn: () => Promise<ToolResult>): Promise<ToolResult> {
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
		case 'create_lead':
			return runTool(call, ctx, () => createLeadTool(ctx, call.args));
		case 'search_leads':
			return runTool(call, ctx, () => searchLeadsTool(ctx, call.args));
		case 'list_leads':
			return runTool(call, ctx, () => listLeadsTool(ctx, call.args));
		case 'update_lead':
			return runTool(call, ctx, () => updateLeadTool(ctx, call.args));
		case 'update_lead_status':
			return runTool(call, ctx, () => updateLeadStatusTool(ctx, call.args));
		case 'add_lead_note':
			return runTool(call, ctx, () => addLeadNoteTool(ctx, call.args));
		case 'convert_lead_to_client':
			return runTool(call, ctx, () => convertLeadToClientTool(ctx, call.args));
		case 'create_client':
			return runTool(call, ctx, () => createClientTool(ctx, call.args));
		case 'search_clients':
			return runTool(call, ctx, () => searchClientsTool(ctx, call.args));
		case 'list_clients':
			return runTool(call, ctx, () => listClientsTool(ctx, call.args));
		case 'update_client':
			return runTool(call, ctx, () => updateClientTool(ctx, call.args));
		case 'add_client_note':
			return runTool(call, ctx, () => addClientNoteTool(ctx, call.args));
		case 'create_task':
			return runTool(call, ctx, () => createTaskForResolvedUser(ctx, call.args));
		case 'update_task':
			return runTool(call, ctx, () => updateTaskTool(ctx, call.args));
		case 'complete_task':
			return runTool(call, ctx, () => completeTaskTool(ctx, call.args));
		case 'reschedule_task':
			return runTool(call, ctx, () => rescheduleTaskTool(ctx, call.args));
		case 'add_task_note':
			return runTool(call, ctx, () => addTaskCommentTool(ctx, call.args));
		case 'get_task_detail':
			return runTool(call, ctx, () => getTaskDetailTool(ctx, call.args));
		case 'add_task_comment':
			return runTool(call, ctx, () => addTaskCommentTool(ctx, call.args));
		case 'list_task_comments':
			return runTool(call, ctx, () => listTaskCommentsTool(ctx, call.args));
		case 'delete_task_comment':
			return runTool(call, ctx, () => deleteTaskCommentTool(ctx, call.args));
		case 'add_task_checklist_item':
			return runTool(call, ctx, () => addTaskChecklistItemTool(ctx, call.args));
		case 'list_task_checklist':
			return runTool(call, ctx, () => listTaskChecklistTool(ctx, call.args));
		case 'update_task_checklist_item':
			return runTool(call, ctx, () => updateTaskChecklistItemTool(ctx, call.args));
		case 'complete_task_checklist_item':
			return runTool(call, ctx, () => completeTaskChecklistItemTool(ctx, call.args));
		case 'delete_task_checklist_item':
			return runTool(call, ctx, () => deleteTaskChecklistItemTool(ctx, call.args));
		case 'create_reminder':
			return runTool(call, ctx, () => createReminderForResolvedUser(ctx, call.args));
		case 'create_crm_demo':
			return runTool(call, ctx, () => createDemoForResolvedUser(ctx, call.args));
		case 'list_tasks':
			return runTool(call, ctx, () => listTasksTool(ctx, call.args));
		case 'create_calendar_event':
			return runTool(call, ctx, () => createCalendarEventTool(ctx, call.args));
		case 'list_calendar_events':
			return runTool(call, ctx, () => listCalendarEventsTool(ctx, call.args));
		case 'update_calendar_event':
			return runTool(call, ctx, () => updateCalendarEventTool(ctx, call.args));
		case 'cancel_calendar_event':
			return runTool(call, ctx, () => cancelCalendarEventTool(ctx, call.args));
		case 'crm_summary':
			return runTool(call, ctx, () => crmSummaryTool(ctx));
		case 'create_deal':
			return runTool(call, ctx, () => createDealTool(ctx, call.args));
		case 'list_deals':
			return runTool(call, ctx, () => listDealsTool(ctx, call.args));
		case 'search_deals':
			return runTool(call, ctx, () => searchDealsTool(ctx, call.args));
		case 'update_deal':
			return runTool(call, ctx, () => updateDealTool(ctx, call.args));
		case 'update_deal_stage':
			return runTool(call, ctx, () => updateDealStageTool(ctx, call.args));
		case 'add_deal_note':
			return runTool(call, ctx, () => addDealNoteTool(ctx, call.args));
		case 'link_deal_to_lead':
			return runTool(call, ctx, () => linkDealToLeadTool(ctx, call.args));
		case 'assign_deal_owner':
			return runTool(call, ctx, () => assignDealOwnerTool(ctx, call.args));
		case 'list_email_threads':
			return runTool(call, ctx, () => listEmailThreadsTool(ctx, call.args));
		case 'search_email_messages':
			return runTool(call, ctx, () => searchEmailMessagesTool(ctx, call.args));
		case 'draft_email_reply':
			return runTool(call, ctx, () => draftEmailReplyTool(ctx, call.args));
		case 'list_inbox_conversations':
			return runTool(call, ctx, () => listInboxConversationsTool(ctx, call.args));
		case 'list_whatsapp_messages':
			return runTool(call, ctx, () => listWhatsappMessagesTool(ctx, call.args));
		case 'draft_whatsapp_reply':
			return runTool(call, ctx, () => draftWhatsappReplyTool(ctx, call.args));
		case 'sales_report':
			return runTool(call, ctx, () => salesReportTool(ctx));
		case 'pipeline_report':
			return runTool(call, ctx, () => pipelineReportTool(ctx));
		case 'activity_report':
			return runTool(call, ctx, () => activityReportTool(ctx));
		case 'agent_daily_briefing':
			return runTool(call, ctx, () => agentDailyBriefingTool(ctx));
		case 'global_search':
			return runTool(call, ctx, () => globalSearchTool(ctx, call.args));
		case 'get_record_by_id':
			return runTool(call, ctx, () => getRecordByIdTool(ctx, call.args));
		case 'add_global_note':
			return runTool(call, ctx, () => addGlobalNoteTool(ctx, call.args));
		case 'create_project':
			return runTool(call, ctx, () => createProjectTool(ctx, call.args));
		case 'list_projects':
			return runTool(call, ctx, () => listProjectsTool(ctx, call.args));
		case 'create_proposal':
			return runTool(call, ctx, () => createProposalTool(ctx, call.args));
		case 'search_products':
			return runTool(call, ctx, () => searchProductsTool(ctx, call.args));
		case 'list_unpaid_invoices':
			return runTool(call, ctx, () => listUnpaidInvoicesTool(ctx));
		default:
			return {
				ok: false,
				error: `Tool no implementada: ${call.tool}`,
			};
	}
}
