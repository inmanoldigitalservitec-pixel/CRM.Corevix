import type { ToolContext, ToolResult } from "../types";

type QueryResult<T> = {
  data: T[];
  error?: string;
};

type LeadRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_interaction_at?: string | null;
  next_follow_up?: string | null;
};

type TaskRow = {
  id: string;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
};

type InvoiceRow = {
  id: string;
  number?: string | null;
  status?: string | null;
  total?: number | string | null;
  due_date?: string | null;
};

type DealRow = {
  id: string;
  name?: string | null;
  stage?: string | null;
  value?: number | string | null;
  expected_close?: string | null;
  updated_at?: string | null;
};

type ProposalRow = {
  id: string;
  title?: string | null;
  number?: string | null;
  status?: string | null;
  amount?: number | string | null;
  valid_until?: string | null;
};

type ProjectRow = {
  id: string;
  name?: string | null;
  status?: string | null;
  due_date?: string | null;
};

type ConversationRow = {
  id: string;
  status?: string | null;
  subject?: string | null;
  last_message_body?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  whatsapp_contacts?: { name?: string | null; phone?: string | null } | null;
};

function normalizeStatus(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isClosedLead(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "won" || normalized === "lost" || normalized === "converted";
}

function isClosedDeal(stage?: string | null) {
  const normalized = normalizeStatus(stage);
  return normalized.includes("won") || normalized.includes("lost") || normalized.includes("ganad") || normalized.includes("perdid");
}

function isPaidInvoice(status?: string | null) {
  return normalizeStatus(status) === "paid";
}

function isCancelledInvoice(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "cancelled" || normalized === "canceled" || normalized === "void";
}

function isOpenInvoice(status?: string | null) {
  return !isPaidInvoice(status) && !isCancelledInvoice(status);
}

function isCompletedTask(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "completed" || normalized === "done";
}

function isPendingProposal(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "draft" || normalized === "pending" || normalized === "sent" || normalized === "viewed";
}

function isActiveProject(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized !== "completed" && normalized !== "cancelled" && normalized !== "canceled";
}

function isOpenConversation(status?: string | null) {
  return normalizeStatus(status) === "open";
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localTodayKey() {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateKeyFromISO(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const date = new Date(parsed);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateKeyInNextDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map((item) => Number(item));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const date = new Date(year, month - 1, day);
  return date >= start && date <= end;
}

function hoursSince(value?: string | null) {
  const parsed = Date.parse(String(value || ""));
  if (!Number.isFinite(parsed)) return Infinity;
  return (Date.now() - parsed) / 36e5;
}

function leadLabel(lead: LeadRow) {
  return lead.company_name || `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Lead sin nombre";
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

async function safeQuery<T>(query: PromiseLike<{ data: T[] | null; error: any }>): Promise<QueryResult<T>> {
  try {
    const result = await query;
    if (result.error) return { data: [], error: result.error.message || String(result.error) };
    return { data: result.data || [] };
  } catch (error: any) {
    return { data: [], error: error?.message || String(error) };
  }
}

async function loadLeads(ctx: ToolContext): Promise<QueryResult<LeadRow>> {
  const db = ctx.supabase as any;
  const rich = await safeQuery<LeadRow>(
    db
      .from("leads")
      .select("id,first_name,last_name,company_name,status,created_at,updated_at,last_interaction_at,next_follow_up")
      .eq("company_id", ctx.companyId)
      .order("updated_at", { ascending: false })
      .limit(120),
  );

  if (!rich.error) return rich;

  const fallback = await safeQuery<LeadRow>(
    db
      .from("leads")
      .select("id,first_name,last_name,company_name,status,created_at,updated_at")
      .eq("company_id", ctx.companyId)
      .order("updated_at", { ascending: false })
      .limit(120),
  );

  return fallback.error ? rich : fallback;
}

export async function agentDashboardContextTool(ctx: ToolContext): Promise<ToolResult> {
  const db = ctx.supabase as any;
  const today = localTodayKey();

  const [leadsResult, tasksResult, invoicesResult, dealsResult, proposalsResult, whatsappResult, emailResult, projectsResult] = await Promise.all([
    loadLeads(ctx),
    safeQuery<TaskRow>(
      db
        .from("tasks")
        .select("id,title,status,priority,due_date")
        .eq("company_id", ctx.companyId)
        .order("due_date", { ascending: true })
        .limit(120),
    ),
    safeQuery<InvoiceRow>(
      db
        .from("invoices")
        .select("id,number,status,total,due_date")
        .eq("company_id", ctx.companyId)
        .order("updated_at", { ascending: false })
        .limit(120),
    ),
    safeQuery<DealRow>(
      db
        .from("deals")
        .select("id,name,stage,value,expected_close,updated_at")
        .eq("company_id", ctx.companyId)
        .order("updated_at", { ascending: false })
        .limit(120),
    ),
    safeQuery<ProposalRow>(
      db
        .from("proposals")
        .select("id,title,number,status,amount,valid_until")
        .eq("company_id", ctx.companyId)
        .order("updated_at", { ascending: false })
        .limit(100),
    ),
    safeQuery<ConversationRow>(
      db
        .from("whatsapp_conversations")
        .select("id,status,last_message_body,last_message_at,unread_count,whatsapp_contacts(name,phone)")
        .eq("company_id", ctx.companyId)
        .order("last_message_at", { ascending: false })
        .limit(80),
    ),
    safeQuery<ConversationRow>(
      db
        .from("email_conversations")
        .select("id,status,subject,last_message_at,unread_count")
        .eq("company_id", ctx.companyId)
        .order("last_message_at", { ascending: false })
        .limit(80),
    ),
    safeQuery<ProjectRow>(
      db
        .from("projects")
        .select("id,name,status,due_date")
        .eq("company_id", ctx.companyId)
        .order("updated_at", { ascending: false })
        .limit(100),
    ),
  ]);

  const leads = leadsResult.data;
  const tasks = tasksResult.data;
  const invoices = invoicesResult.data;
  const deals = dealsResult.data;
  const proposals = proposalsResult.data;
  const whatsapp = whatsappResult.data;
  const email = emailResult.data;
  const projects = projectsResult.data;

  const openLeads = leads.filter((lead) => !isClosedLead(lead.status));
  const leadsNeedingFollowUp = openLeads
    .filter((lead) => {
      const staleUpdate = hoursSince(lead.updated_at || lead.created_at) > 24;
      const staleInteraction = lead.last_interaction_at ? hoursSince(lead.last_interaction_at) > 72 : false;
      const missingFollowUp = Object.prototype.hasOwnProperty.call(lead, "next_follow_up") ? !lead.next_follow_up : false;
      return staleUpdate || staleInteraction || missingFollowUp;
    })
    .slice(0, 5);

  const openTasks = tasks.filter((task) => !isCompletedTask(task.status));
  const overdueTasks = openTasks
    .filter((task) => {
      const dueKey = dateKeyFromISO(task.due_date);
      return Boolean(dueKey && dueKey < today);
    })
    .slice(0, 5);
  const tasksToday = openTasks.filter((task) => dateKeyFromISO(task.due_date) === today);

  const pendingInvoices = invoices.filter((invoice) => isOpenInvoice(invoice.status));
  const overdueInvoices = pendingInvoices
    .filter((invoice) => {
      const dueKey = dateKeyFromISO(invoice.due_date);
      return normalizeStatus(invoice.status) === "overdue" || Boolean(dueKey && dueKey < today);
    })
    .slice(0, 5);
  const receivableTotal = pendingInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);

  const openDeals = deals.filter((deal) => !isClosedDeal(deal.stage));
  const pipelineValue = openDeals.reduce((sum, deal) => sum + toNumber(deal.value), 0);
  const pendingProposals = proposals.filter((proposal) => isPendingProposal(proposal.status)).slice(0, 5);

  const whatsappOpen = whatsapp.filter((conversation) => isOpenConversation(conversation.status));
  const emailOpen = email.filter((conversation) => isOpenConversation(conversation.status));
  const activeProjects = projects.filter((project) => isActiveProject(project.status));
  const projectsAtRisk = activeProjects.filter((project) => {
    const dueKey = dateKeyFromISO(project.due_date);
    return Boolean(dueKey && dueKey < today);
  });

  const upcomingAgenda = [
    ...openTasks
      .filter((task) => {
        const dueKey = dateKeyFromISO(task.due_date);
        return Boolean(dueKey && isDateKeyInNextDays(dueKey, 7));
      })
      .slice(0, 5)
      .map((task) => ({ type: "task", title: task.title || "Tarea sin titulo", due_date: task.due_date })),
    ...activeProjects
      .filter((project) => {
        const dueKey = dateKeyFromISO(project.due_date);
        return Boolean(dueKey && isDateKeyInNextDays(dueKey, 7));
      })
      .slice(0, 5)
      .map((project) => ({ type: "project", title: project.name || "Proyecto sin nombre", due_date: project.due_date })),
  ].slice(0, 6);

  const errors = [
    leadsResult.error,
    tasksResult.error,
    invoicesResult.error,
    dealsResult.error,
    proposalsResult.error,
    whatsappResult.error,
    emailResult.error,
    projectsResult.error,
  ].filter(Boolean);

  const data = {
    generated_at: new Date().toISOString(),
    counts: {
      leads_need_followup: leadsNeedingFollowUp.length,
      open_leads: openLeads.length,
      overdue_tasks: overdueTasks.length,
      tasks_today: tasksToday.length,
      pending_invoices: pendingInvoices.length,
      overdue_invoices: overdueInvoices.length,
      receivable_total: receivableTotal,
      open_deals: openDeals.length,
      pipeline_value: pipelineValue,
      pending_proposals: pendingProposals.length,
      open_conversations: whatsappOpen.length + emailOpen.length,
      whatsapp_open: whatsappOpen.length,
      email_open: emailOpen.length,
      active_projects: activeProjects.length,
      projects_at_risk: projectsAtRisk.length,
      upcoming_agenda: upcomingAgenda.length,
    },
    priorities: {
      leads_need_followup: leadsNeedingFollowUp.map((lead) => ({ id: lead.id, name: leadLabel(lead), status: lead.status, updated_at: lead.updated_at })),
      overdue_tasks: overdueTasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, due_date: task.due_date })),
      overdue_invoices: overdueInvoices.map((invoice) => ({ id: invoice.id, number: invoice.number, status: invoice.status, total: invoice.total, due_date: invoice.due_date })),
      projects_at_risk: projectsAtRisk.slice(0, 5).map((project) => ({ id: project.id, name: project.name, status: project.status, due_date: project.due_date })),
    },
    sales: {
      receivable_total,
      receivable_total_formatted: formatMoney(receivableTotal),
      pipeline_value,
      pipeline_value_formatted: formatMoney(pipelineValue),
      open_deals: openDeals.slice(0, 5).map((deal) => ({ id: deal.id, name: deal.name, stage: deal.stage, value: deal.value, expected_close: deal.expected_close })),
      pending_proposals: pendingProposals.map((proposal) => ({ id: proposal.id, title: proposal.title || proposal.number, status: proposal.status, amount: proposal.amount, valid_until: proposal.valid_until })),
    },
    inbox: {
      whatsapp_open: whatsappOpen.slice(0, 5).map((item) => ({ id: item.id, contact: item.whatsapp_contacts?.name || item.whatsapp_contacts?.phone || "Contacto", unread_count: item.unread_count, last_message_at: item.last_message_at })),
      email_open: emailOpen.slice(0, 5).map((item) => ({ id: item.id, subject: item.subject || "Sin asunto", unread_count: item.unread_count, last_message_at: item.last_message_at })),
    },
    agenda: upcomingAgenda,
    partial_errors: errors,
  };

  return {
    ok: true,
    message: `Contexto del dashboard generado. Cobros por ${formatMoney(receivableTotal)}, ${openDeals.length} oportunidades abiertas, ${pendingInvoices.length} facturas pendientes, ${openTasks.length} tareas abiertas y ${whatsappOpen.length + emailOpen.length} conversaciones abiertas.`,
    data,
  };
}
