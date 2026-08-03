import { createFileRoute, Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  GitBranch,
  Mail,
  MessageCircle,
  Receipt,
  Send,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { MetricCard } from "@/components/crm/metric-card";
import { DataCard } from "@/components/crm/data-card";
import { ActivityFeed } from "@/components/crm/activity-feed";
import { EmailHtmlViewer } from "@/components/email/email-html-viewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { statusKey, useT } from "@/i18n";
import {
  DashboardMobileView,
  type MobileSummarySlide,
} from "@/components/dashboard-v2/dashboard-mobile-view";
import { DashboardV2 } from "@/components/dashboard-v2/dashboard-v2";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import { InvoiceDetailsPanel } from "@/components/invoices/invoice-details-panel";
import type { InvoiceActivityEvent } from "@/components/invoices/invoice-activity";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { type AttentionModule } from "@/lib/crm/attention-engine";
import { buildAttentionFeed } from "@/lib/crm/attention-feed";
import {
  applyAttentionMemory,
  loadAttentionMemoryFromSupabase,
  markAttentionNotifiedRemote,
  reconcileAttentionMemoryRemote,
} from "@/lib/crm/attention-memory";
import { syncAttentionNotifications } from "@/lib/crm/attention-notifications";
import {
  buildCalendarItems,
  type CalendarItem,
  type CalendarTone,
  type ContractCalendarSourceRow,
  type PaymentCalendarSourceRow,
  type SubscriptionCalendarSourceRow,
} from "@/lib/crm/calendar-items";
import {
  formatInvoiceDate,
  formatInvoiceDueDate,
  formatInvoiceMoney,
  getInvoiceBalance,
  getInvoiceCurrency,
} from "@/components/invoices/invoice-utils";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  isActiveProjectStatus,
  isApprovedProposalStatus,
  isClosedDealStageValue,
  isClosedLeadStatusValue,
  isCompletedTaskStatusValue,
  isOpenConversationStatus,
  isOpenInvoiceStatus,
  isOverdueInvoiceStatus,
  isPaidInvoiceStatus,
  isPendingProposalStatus,
  isSentInvoiceStatus,
  isWonDealStageValue,
  isLostDealStageValue,
  isNewLeadStatus,
  isSentOrOverdueInvoiceStatus,
  isSentOrViewedProposalStatus,
} from "@/lib/crm/status";
import { ATTENTION_PRIORITY_ORDER } from "@/lib/crm/attention-rules";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import {
  convertCurrencyAmount,
  convertToBaseCurrency,
  formatCurrencyAmount,
  normalizeCurrency,
  type CompanyCurrencySettings,
} from "@/lib/currency";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Corevix CRM" },
      { name: "description", content: "Business overview and key metrics" },
    ],
  }),
});

const ProjectWorkspaceDialog = lazy(() =>
  import("@/routes/projects").then((module) => ({ default: module.ProjectWorkspaceDialog })),
);
const TicketDetailDialog = lazy(() =>
  import("@/routes/tickets").then((module) => ({ default: module.TicketDetailDialog })),
);

type Urgency = "alta" | "media" | "baja";
type PriorityVariant = "danger" | "warning" | "purple" | "green";

type PriorityItem = {
  key: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  urgency: Urgency;
  count: number;
  variant: PriorityVariant;
  ctaLabel: string;
  to: string;
};

type LeadRow = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  last_interaction_at?: string | null;
};

type DealRow = {
  id: string;
  name?: string | null;
  stage: string;
  value: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | string | null;
  value_base?: number | string | null;
  expected_close?: string | null;
  updated_at?: string;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  company_id: string;
  updated_at: string;
  related_lead_id?: string | null;
  related_client_id: string | null;
  related_project_id: string | null;
  related_deal_id: string | null;
};
type TaskAssigneeRow = {
  id: string;
  task_id: string;
  user_id: string;
};

type ProjectRow = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number | null;
  start_date: string | null;
  due_date: string | null;
  priority?: string | null;
  budget: number | null;
  client_id: string | null;
  product_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  manager: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string | null;
};

type InvoiceRow = {
  id: string;
  company_id?: string | null;
  status: string;
  number?: string | null;
  client_id?: string | null;
  proposal_id?: string | null;
  product_id?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  discount?: number | string | null;
  total: number | string | null;
  notes?: string | null;
  date_issued?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  public_token?: string | null;
  payment_link?: string | null;
  paid_at?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  created_by?: string | null;
  invoice_data?: Record<string, unknown> | null;
  currency?: string | null;
  base_currency?: string | null;
  total_base?: number | string | null;
};

type ProposalRow = {
  id: string;
  company_id?: string | null;
  status: string;
  valid_until?: string | null;
  title?: string | null;
  number?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
  amount_base?: number | string | null;
  client_id?: string | null;
  product_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  whatsapp_conversation_id?: string | null;
  description?: string | null;
  content?: string | null;
  notes?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  updated_at?: string;
  template_id?: string | null;
  template_key?: string | null;
  proposal_data?: Record<string, unknown> | null;
  public_token?: string | null;
  viewed_at?: string | null;
  approved_at?: string | null;
};

type EstimateRow = {
  id: string;
  company_id?: string | null;
  number?: number | string | null;
  title?: string | null;
  status: string;
  client_id?: string | null;
  project_id?: string | null;
  deal_id?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  total?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
  total_base?: number | string | null;
  date_issued?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TicketRow = {
  id: string;
  ticket_number: number | null;
  company_id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  department: string;
  service: string | null;
  source: string;
  tags: string[] | null;
  client_id: string | null;
  contact_id: string | null;
  project_id: string | null;
  lead_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  last_reply_at: string | null;
  first_response_due_at: string | null;
  resolution_due_at?: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  author_type: string;
  author_profile_id: string | null;
  contact_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type ClientSummaryRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  status?: string | null;
  updated_at?: string | null;
  account_manager?: string | null;
};

type ProductSummaryRow = {
  id: string;
  name: string | null;
};

type ProfileSummaryRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  user_id: string | null;
  is_active: boolean | null;
};

type ClientProductRow = {
  id: string;
  client_id: string;
  product_id?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | string | null;
  billing_type?: string | null;
  updated_at?: string | null;
};

type WhatsAppConversationRow = {
  id: string;
  status: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  whatsapp_contacts?: { id: string; name: string | null; phone: string | null } | null;
};

type EmailConversationRow = {
  id: string;
  status: string | null;
  is_read?: boolean | null;
  last_message_at?: string | null;
  subject?: string | null;
};

type MetaConversationRow = {
  id: string;
  platform: "messenger" | "instagram" | string | null;
  status: string | null;
  sender_name?: string | null;
  last_message_text?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  created_at?: string | null;
};

type ActivityLogRow = {
  id: string;
  action: string;
  detail: string | null;
  entity_type: string;
  created_at: string;
};

type DashboardInlineWorkItem = {
  type: string;
  id?: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";
  href: string;
  meta?: string;
  dueLabel?: string;
};

type DashboardInboxChannel = "whatsapp" | "email" | "messenger" | "instagram";

type DashboardInboxSelection = {
  id: string;
  channel: DashboardInboxChannel;
  title: string;
  subtitle: string;
  status?: string | null;
  unreadCount?: number;
  href: string;
};

type DashboardInboxMessage = {
  id: string;
  direction: string;
  author: string;
  body: string;
  bodyHtml?: string | null;
  at: string;
};

type CalendarEventRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  type?: string | null;
  status?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean | null;
  created_at?: string | null;
};

function formatMoney(value: number | string | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, currency || "USD");
}

function baseAmount(
  value: number | string | null | undefined,
  currency: string | null | undefined,
  settings: CompanyCurrencySettings,
) {
  return convertToBaseCurrency(value, currency, settings);
}

function invoiceCurrency(invoice: InvoiceRow) {
  return normalizeCurrency(invoice.currency || String(invoice.invoice_data?.currency || ""));
}

function invoiceBaseAmount(invoice: InvoiceRow, settings: CompanyCurrencySettings) {
  if (invoice.total_base != null) {
    return convertCurrencyAmount(
      invoice.total_base,
      invoice.base_currency || settings.baseCurrency,
      settings.baseCurrency,
      settings.usdToDopRate,
    );
  }
  return Number(baseAmount(invoice.total, invoiceCurrency(invoice), settings));
}

function proposalBaseAmount(proposal: ProposalRow, settings: CompanyCurrencySettings) {
  if (proposal.amount_base != null) {
    return convertCurrencyAmount(
      proposal.amount_base,
      proposal.base_currency || settings.baseCurrency,
      settings.baseCurrency,
      settings.usdToDopRate,
    );
  }
  return Number(baseAmount(proposal.amount, proposal.currency || "USD", settings));
}

function dealBaseAmount(deal: DealRow, settings: CompanyCurrencySettings) {
  if (deal.value_base != null) {
    return convertCurrencyAmount(
      deal.value_base,
      deal.base_currency || settings.baseCurrency,
      settings.baseCurrency,
      settings.usdToDopRate,
    );
  }
  return Number(
    convertToBaseCurrency(deal.value, deal.currency || settings.baseCurrency, {
      baseCurrency: settings.baseCurrency,
      usdToDopRate: Number(deal.exchange_rate || settings.usdToDopRate),
      rateSource: settings.rateSource,
      rateUpdatedAt: settings.rateUpdatedAt,
    }),
  );
}

function convertedLabel(settings: CompanyCurrencySettings) {
  return `Convertido a ${settings.baseCurrency}`;
}

function urgencyLabel(u: Urgency) {
  if (u === "alta") return "Alta";
  if (u === "media") return "Media";
  return "Baja";
}

function priorityVariantFromKey(key: string): PriorityVariant {
  if (key === "overdue_tasks" || key === "leads_followup") return "danger";
  if (key === "pending_invoices") return "warning";
  if (key === "pending_proposals") return "purple";
  if (key === "wa_open") return "green";
  if (key === "projects_risk" || key === "calendar_overdue") return "warning";
  return "purple";
}

function priorityVariantStyles(variant: PriorityVariant) {
  if (variant === "danger") {
    return {
      card: "bg-[linear-gradient(180deg,#fff5f6,#fff)] border-[#ffd5dd]",
      icon: "bg-[#ffe4e9] text-[#e11d48]",
      number: "text-[#e11d48]",
      tag: "text-[#e11d48] bg-[#ffe6eb]",
      ctaOutline: "bg-white text-[#e11d48] border border-[rgba(225,29,72,0.35)] hover:bg-[#fff1f3]",
    };
  }
  if (variant === "warning") {
    return {
      card: "bg-[linear-gradient(180deg,#fff9ed,#fff)] border-[#ffe3ad]",
      icon: "bg-[#fff1d6] text-[#d97706]",
      number: "text-[#d97706]",
      tag: "text-[#d97706] bg-[#fff0d0]",
      ctaOutline: "bg-white text-[#d97706] border border-[rgba(245,158,11,0.4)] hover:bg-[#fff7e6]",
    };
  }
  if (variant === "green") {
    return {
      card: "bg-[linear-gradient(180deg,#effdf5,#fff)] border-[#c7f0d4]",
      icon: "bg-[#dcfce7] text-[#16a34a]",
      number: "text-[#16a34a]",
      tag: "text-[#16a34a] bg-[#dcfce7]",
      ctaOutline: "bg-white text-[#16a34a] border border-[rgba(22,163,74,0.35)] hover:bg-[#ecfdf3]",
    };
  }
  return {
    card: "bg-[linear-gradient(180deg,#f8f3ff,#fff)] border-[#decaff]",
    icon: "bg-[#eadcff] text-[#7c3aed]",
    number: "text-[#7c3aed]",
    tag: "text-[#7c3aed] bg-[#eadcff]",
    ctaOutline: "bg-white text-[#7c3aed] border border-[rgba(124,58,237,0.35)] hover:bg-[#f4efff]",
  };
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isClosedLeadStatus(status: string) {
  return isClosedLeadStatusValue(status);
}

function isClosedDealStage(stage: string) {
  return isClosedDealStageValue(stage);
}

function isWonDealStage(stage: string) {
  return isWonDealStageValue(stage);
}

function isLostDealStage(stage: string) {
  return isLostDealStageValue(stage);
}

function isCompletedTaskStatus(status: string) {
  return isCompletedTaskStatusValue(status);
}

function daysSince(iso?: string | null) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}

function leadLabel(lead: Pick<LeadRow, "first_name" | "last_name" | "company_name">) {
  return (
    lead.company_name ||
    `${lead.first_name || ""} ${lead.last_name || ""}`.trim() ||
    "Lead sin nombre"
  );
}

function clientLabel(client?: ClientSummaryRow | null) {
  if (!client) return "Cliente sin nombre";
  return client.company_name || client.contact_person || "Cliente sin nombre";
}

function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const dateOnlyMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function buildRelationLabel(args: {
  task: TaskRow;
  leadById: Map<string, LeadRow>;
  clientById: Map<string, ClientSummaryRow>;
  projectById: Map<string, ProjectRow>;
}) {
  const { task, leadById, clientById, projectById } = args;
  if (task.related_project_id) {
    const project = projectById.get(String(task.related_project_id));
    if (project?.name) return `Proyecto: ${project.name}`;
  }
  if (task.related_client_id) {
    const client = clientById.get(String(task.related_client_id));
    if (client) return `Cliente: ${clientLabel(client)}`;
  }
  if (task.related_lead_id) {
    const lead = leadById.get(String(task.related_lead_id));
    if (lead) return `Lead: ${leadLabel(lead)}`;
  }
  return "Sin relación";
}

function hoursSince(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 36e5;
}

function dateKeyFromISO(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localTodayKey() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateKeyInNextDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const dt = new Date(y, m - 1, d);
  return dt >= start && dt <= end;
}

function toDateKey(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return dateKeyFromISO(value);
}

function normalizeDashboardStatus(status: string | null | undefined) {
  return String(status || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function statusTone(
  status: string,
): "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral" {
  const normalized = normalizeDashboardStatus(status);
  if (
    normalized.includes("paid") ||
    normalized.includes("accepted") ||
    normalized.includes("closed")
  )
    return "green";
  if (
    normalized.includes("declined") ||
    normalized.includes("overdue") ||
    normalized.includes("urgent")
  )
    return "red";
  if (
    normalized.includes("partial") ||
    normalized.includes("expired") ||
    normalized.includes("hold")
  )
    return "orange";
  if (normalized.includes("proposal") || normalized.includes("revised")) return "purple";
  if (normalized.includes("progress") || normalized.includes("answered")) return "teal";
  if (normalized.includes("draft")) return "neutral";
  return "blue";
}

function normalizeDashboardTask(task: Partial<TaskRow>, companyId: string): TaskRow {
  return {
    id: String(task.id || ""),
    title: task.title || "Tarea sin titulo",
    description: task.description ?? null,
    status: task.status || "To Do",
    priority: task.priority || "Medium",
    assigned_to: task.assigned_to ?? null,
    due_date: task.due_date ?? null,
    created_at: task.created_at || task.updated_at || new Date().toISOString(),
    company_id: task.company_id || companyId,
    updated_at: task.updated_at || task.created_at || new Date().toISOString(),
    related_lead_id: task.related_lead_id ?? null,
    related_client_id: task.related_client_id ?? null,
    related_project_id: task.related_project_id ?? null,
    related_deal_id: task.related_deal_id ?? null,
  };
}

function normalizeDashboardProject(project: Partial<ProjectRow>, companyId: string): ProjectRow {
  return {
    id: String(project.id || ""),
    company_id: project.company_id || companyId,
    name: project.name || "Proyecto sin nombre",
    description: project.description ?? null,
    status: project.status || "Not Started",
    progress:
      typeof project.progress === "number"
        ? project.progress
        : Number.isFinite(Number(project.progress))
          ? Number(project.progress)
          : null,
    start_date: project.start_date ?? null,
    due_date: project.due_date ?? null,
    priority: project.priority ?? null,
    budget:
      project.budget == null
        ? null
        : Number.isFinite(Number(project.budget))
          ? Number(project.budget)
          : null,
    client_id: project.client_id ?? null,
    product_id: project.product_id ?? null,
    deal_id: project.deal_id ?? null,
    lead_id: project.lead_id ?? null,
    manager: project.manager ?? null,
    created_by: project.created_by ?? null,
    created_at: project.created_at || project.updated_at || new Date().toISOString(),
    updated_at: project.updated_at ?? null,
  };
}

function normalizeDashboardTicket(ticket: Partial<TicketRow>, companyId: string): TicketRow {
  return {
    id: String(ticket.id || ""),
    ticket_number:
      ticket.ticket_number == null
        ? null
        : Number.isFinite(Number(ticket.ticket_number))
          ? Number(ticket.ticket_number)
          : null,
    company_id: ticket.company_id || companyId,
    subject: ticket.subject || "Ticket sin asunto",
    description: ticket.description ?? null,
    status: ticket.status || "Open",
    priority: ticket.priority || "Medium",
    department: ticket.department || "Support",
    service: ticket.service ?? null,
    source: ticket.source || "manual",
    tags: ticket.tags ?? null,
    client_id: ticket.client_id ?? null,
    contact_id: ticket.contact_id ?? null,
    project_id: ticket.project_id ?? null,
    lead_id: ticket.lead_id ?? null,
    assigned_to: ticket.assigned_to ?? null,
    created_by: ticket.created_by ?? null,
    last_reply_at: ticket.last_reply_at ?? null,
    first_response_due_at: ticket.first_response_due_at ?? null,
    resolution_due_at: ticket.resolution_due_at ?? null,
    closed_at: ticket.closed_at ?? null,
    created_at: ticket.created_at || ticket.updated_at || new Date().toISOString(),
    updated_at: ticket.updated_at || ticket.created_at || new Date().toISOString(),
  };
}

function dashboardInlineToneClasses(tone?: DashboardInlineWorkItem["tone"]) {
  if (tone === "red") return "border-rose-100 bg-rose-50 text-rose-700";
  if (tone === "orange") return "border-orange-100 bg-orange-50 text-orange-700";
  if (tone === "green") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (tone === "purple") return "border-violet-100 bg-violet-50 text-violet-700";
  if (tone === "teal") return "border-teal-100 bg-teal-50 text-teal-700";
  return "border-blue-100 bg-blue-50 text-blue-700";
}

function dashboardInlineTypeLabel(type: string) {
  if (type === "calendar") return "Agenda";
  if (type === "sales") return "Ventas";
  if (type === "inbox") return "Inbox";
  return "Detalle";
}

function dashboardToneFromCalendarTone(tone: CalendarTone): DashboardInlineWorkItem["tone"] {
  if (tone === "violet") return "purple";
  if (tone === "amber" || tone === "orange") return "orange";
  if (tone === "emerald") return "green";
  if (tone === "sky") return "teal";
  if (tone === "slate") return "neutral";
  return "blue";
}

function extractEmailAddress(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || text;
}

function readDashboardObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readDashboardText(value: unknown) {
  return String(value || "").trim();
}

function formatDashboardDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-DO", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function useDashboardModalLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}

function DashboardInlineWorkItemDialog({
  item,
  onClose,
}: {
  item: DashboardInlineWorkItem | null;
  onClose: () => void;
}) {
  useDashboardModalLock(Boolean(item));

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dashboardInlineTypeLabel(item.type)}
      className="fixed inset-0 z-[70] grid max-w-full place-items-end overflow-x-hidden bg-slate-950/35 p-0 min-[700px]:place-items-center min-[700px]:p-6"
    >
      <div className="w-full max-w-[520px] rounded-t-[28px] bg-white p-4 shadow-2xl min-[700px]:rounded-[28px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${dashboardInlineToneClasses(item.tone)}`}
            >
              {dashboardInlineTypeLabel(item.type)}
            </span>
            <h2 className="mt-3 text-[20px] font-semibold leading-tight tracking-normal text-slate-950">
              {item.title}
            </h2>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">
              {item.subtitle || "Sin contexto adicional."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"
            aria-label="Cerrar detalle"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-2 rounded-[20px] border border-[#edf1f7] bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium text-slate-500">Estado</span>
            <span className="max-w-[58%] truncate text-right text-[13px] font-semibold text-slate-950">
              {item.badge || "—"}
            </span>
          </div>
          {item.meta ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-slate-500">Contexto</span>
              <span className="max-w-[58%] truncate text-right text-[13px] font-semibold text-slate-950">
                {item.meta}
              </span>
            </div>
          ) : null}
          {item.dueLabel ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-slate-500">Fecha</span>
              <span className="max-w-[58%] truncate text-right text-[13px] font-semibold text-slate-950">
                {item.dueLabel}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full bg-slate-50 text-[13px] font-semibold text-slate-700"
          >
            Volver
          </button>
          <a
            href={item.href}
            className="grid h-11 place-items-center rounded-full bg-slate-950 text-[13px] font-semibold text-white"
          >
            Abrir módulo
          </a>
        </div>
      </div>
    </div>
  );
}

function DashboardInboxDialog({
  selection,
  messages,
  loading,
  error,
  emailTo,
  emailReply,
  emailSending,
  emailSendError,
  onClose,
  onEmailToChange,
  onEmailReplyChange,
  onSendEmail,
}: {
  selection: DashboardInboxSelection | null;
  messages: DashboardInboxMessage[];
  loading: boolean;
  error: string | null;
  emailTo: string;
  emailReply: string;
  emailSending: boolean;
  emailSendError: string | null;
  onClose: () => void;
  onEmailToChange: (value: string) => void;
  onEmailReplyChange: (value: string) => void;
  onSendEmail: () => boolean | void | Promise<boolean | void>;
}) {
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  useDashboardModalLock(Boolean(selection));

  if (!selection) return null;

  const isEmail = selection.channel === "email";
  const selectedEmailMessage = isEmail ? messages[messages.length - 1] : null;
  const channelLabel =
    selection.channel === "email"
      ? "Email"
      : selection.channel === "whatsapp"
        ? "WhatsApp"
        : selection.channel === "instagram"
          ? "Instagram"
          : "Messenger";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Conversación de ${channelLabel}`}
      className="fixed inset-0 z-[80] flex h-[100dvh] max-w-full flex-col overflow-x-hidden bg-white text-slate-950 min-[760px]:grid min-[760px]:place-items-center min-[760px]:bg-slate-950/35 min-[760px]:p-6"
    >
      <section className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-white min-[760px]:h-[86vh] min-[760px]:max-w-[560px] min-[760px]:rounded-[28px] min-[760px]:shadow-2xl">
        <header className="shrink-0 border-b border-[#edf1f7] bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] min-[760px]:py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                {channelLabel}
              </span>
              <h2 className="mt-2 truncate text-[18px] font-semibold tracking-normal text-slate-950">
                {selection.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-slate-500">
                {selection.subtitle || selection.status || "Conversación"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"
              aria-label="Cerrar conversación"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
            <span className="text-[12px] font-semibold text-slate-600">
              {selection.unreadCount ? `${selection.unreadCount} sin leer` : "Sin pendientes"}
            </span>
            <a href={selection.href} className="text-[12px] font-semibold text-blue-600">
              Abrir inbox completo
            </a>
          </div>
        </header>

        <main
          className={`relative min-h-0 flex-1 overflow-y-auto ${
            isEmail ? "bg-white px-0 py-0" : "bg-[#f6f8fb] px-4 py-4"
          }`}
        >
          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : isEmail && selectedEmailMessage ? (
            <div className="min-h-full bg-white">
              {selectedEmailMessage.bodyHtml ? (
                <EmailHtmlViewer html={selectedEmailMessage.bodyHtml} />
              ) : (
                <div className="whitespace-pre-wrap px-5 py-4 text-[14px] leading-6 text-slate-800">
                  {selectedEmailMessage.body || "(Sin contenido)"}
                </div>
              )}
              <button
                type="button"
                onClick={() => setEmailComposerOpen(true)}
                className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[82] grid h-14 w-14 place-items-center rounded-full bg-[#0b57d0] text-white shadow-xl min-[760px]:absolute"
                aria-label="Responder email"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          ) : messages.length ? (
            <div className="space-y-3">
              {messages.map((message) => {
                const outbound = String(message.direction).toLowerCase() === "outbound";
                return (
                  <article
                    key={message.id}
                    className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[min(86%,420px)] overflow-hidden rounded-2xl px-3.5 py-3 shadow-sm ${
                        outbound
                          ? "bg-blue-600 text-white"
                          : "border border-[#edf1f7] bg-white text-slate-900"
                      }`}
                    >
                      <div
                        className={`mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold ${
                          outbound ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        <span className="truncate">{message.author}</span>
                        <span className="shrink-0">{formatShortDate(message.at)}</span>
                      </div>
                      {message.bodyHtml ? (
                        <div className="overflow-hidden rounded-xl bg-white text-slate-900">
                          <EmailHtmlViewer html={message.bodyHtml} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-5">
                          {message.body || "(Sin contenido)"}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#d9e0ea] bg-white py-10 text-center text-[13px] font-medium text-slate-500">
              No hay mensajes para mostrar.
            </p>
          )}
        </main>

        {!isEmail ? (
          <footer className="shrink-0 border-t border-[#edf1f7] bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 min-[760px]:py-3">
            <p className="text-center text-[12px] font-medium text-slate-500">
              Vista solo lectura en mobile.
            </p>
          </footer>
        ) : null}

        {isEmail && emailComposerOpen ? (
          <div className="fixed inset-0 z-[90] flex h-[100dvh] flex-col bg-white text-[#202124]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e8eaed] bg-[#f2f6fc] px-4">
              <div className="text-[14px] font-semibold">Reply</div>
              <button
                type="button"
                onClick={() => setEmailComposerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded hover:bg-[#e8eaed]"
                aria-label="Cerrar redacción"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-[#e8eaed] px-4">
              <div className="flex h-11 items-center gap-2 text-[14px]">
                <Mail className="h-4 w-4 shrink-0 text-[#5f6368]" />
                <span className="shrink-0 text-[#3c4043]">To</span>
                <input
                  value={emailTo}
                  onChange={(event) => onEmailToChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  placeholder="destinatario@email.com"
                />
              </div>
            </div>

            <div className="border-b border-[#e8eaed] px-4 py-3 text-[14px] text-[#3c4043]">
              {selection.title.startsWith("Re:")
                ? selection.title
                : `Re: ${selection.title}`.trim()}
            </div>

            <textarea
              value={emailReply}
              onChange={(event) => onEmailReplyChange(event.target.value)}
              className="min-h-0 flex-1 resize-none bg-white px-4 py-4 text-[15px] leading-6 outline-none"
              placeholder="Escribe tu respuesta..."
              autoFocus
            />

            {emailSendError ? (
              <p className="border-t border-[#fde2e2] bg-rose-50 px-4 py-2 text-[12px] font-medium text-rose-600">
                {emailSendError}
              </p>
            ) : null}

            <div className="flex shrink-0 items-center justify-between border-t border-[#e8eaed] bg-white px-4 py-3">
              <button
                type="button"
                onClick={async () => {
                  const sent = await onSendEmail();
                  if (sent !== false) setEmailComposerOpen(false);
                }}
                disabled={emailSending || !emailReply.trim() || !emailTo.trim()}
                className="flex h-10 items-center gap-2 rounded-full bg-[#0b57d0] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0842a0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {emailSending ? "Enviando..." : "Enviar"}
              </button>
              <button
                type="button"
                onClick={() => setEmailComposerOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
                aria-label="Descartar borrador"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DashboardInvoiceDetailDialog({
  invoice,
  items,
  itemsLoading,
  itemsError,
  summaryFields,
  issuerFields,
  clientFields,
  activity,
  currency,
  publicUrl,
  onClose,
}: {
  invoice: InvoiceRow | null;
  items: InvoiceDetailItem[];
  itemsLoading: boolean;
  itemsError: string | null;
  summaryFields: Array<{ label: string; value?: string | null; mono?: boolean }>;
  issuerFields: Array<{ label: string; value?: string | null; mono?: boolean }>;
  clientFields: Array<{ label: string; value?: string | null; mono?: boolean }>;
  activity: InvoiceActivityEvent[];
  currency: string;
  publicUrl?: string | null;
  onClose: () => void;
}) {
  useDashboardModalLock(Boolean(invoice));

  if (!invoice) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de factura"
      className="fixed inset-0 z-[80] flex h-[100dvh] max-w-full flex-col overflow-x-hidden bg-white text-slate-950 min-[760px]:grid min-[760px]:place-items-center min-[760px]:bg-slate-950/35 min-[760px]:p-6"
    >
      <section className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-white min-[760px]:h-[88vh] min-[760px]:max-w-[860px] min-[760px]:rounded-[28px] min-[760px]:shadow-2xl">
        <header className="shrink-0 border-b border-[#edf1f7] bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] min-[760px]:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-500">Factura</p>
              <h2 className="mt-1 truncate text-[20px] font-bold tracking-normal text-slate-950">
                {invoice.number || "Factura"}
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Estado: {invoice.status || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"
              aria-label="Cerrar factura"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
          <InvoiceDetailsPanel
            invoice={{
              number: invoice.number || "—",
              status: invoice.status || "—",
              date_issued: invoice.date_issued || null,
              due_date: invoice.due_date || null,
            }}
            actions={
              <a
                href={`/invoices?invoiceId=${encodeURIComponent(invoice.id)}`}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
              >
                Abrir factura completa
              </a>
            }
            summaryFields={summaryFields}
            issuerFields={issuerFields}
            clientFields={clientFields}
            items={items}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            activity={activity}
            currency={currency}
            total={formatInvoiceMoney(Number(invoice.total || 0), currency)}
            balance={formatInvoiceMoney(getInvoiceBalance(invoice as any), currency)}
            subtotal={formatInvoiceMoney(Number(invoice.subtotal || 0), currency)}
            tax={formatInvoiceMoney(Number(invoice.tax || 0), currency)}
            discount={formatInvoiceMoney(Number(invoice.discount || 0), currency)}
            notes={invoice.notes || null}
            publicUrl={publicUrl}
            formatMoney={formatInvoiceMoney}
          />
        </main>
      </section>
    </div>
  );
}

function DashboardProposalDetailDialog({
  proposal,
  clientName,
  productName,
  onClose,
}: {
  proposal: ProposalRow | null;
  clientName: string;
  productName: string;
  onClose: () => void;
}) {
  useDashboardModalLock(Boolean(proposal));

  if (!proposal) return null;

  const publicUrl =
    proposal.public_token && typeof window !== "undefined"
      ? `${window.location.origin}/proposal/public/${proposal.public_token}`
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de propuesta"
      className="fixed inset-0 z-[80] flex h-[100dvh] max-w-full flex-col overflow-x-hidden bg-white text-slate-950 min-[760px]:grid min-[760px]:place-items-center min-[760px]:bg-slate-950/35 min-[760px]:p-6"
    >
      <section className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-white min-[760px]:h-[88vh] min-[760px]:max-w-[720px] min-[760px]:rounded-[28px] min-[760px]:shadow-2xl">
        <header className="shrink-0 border-b border-[#edf1f7] bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] min-[760px]:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-500">Propuesta</p>
              <h2 className="mt-1 line-clamp-2 text-[20px] font-bold leading-tight tracking-normal text-slate-950">
                {proposal.number
                  ? `${proposal.number} · ${proposal.title || "Propuesta"}`
                  : proposal.title || "Propuesta"}
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Estado: {proposal.status || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"
              aria-label="Cerrar propuesta"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {publicUrl ? (
              <a
                href={publicUrl}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
              >
                Ver propuesta
              </a>
            ) : null}
            <a
              href={`/proposals?proposalId=${encodeURIComponent(proposal.id)}`}
              className="inline-flex h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
            >
              Abrir propuesta completa
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm min-[430px]:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="font-medium">
                <StatusBadge status={proposal.status || "—"} />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Producto</div>
              <div className="font-medium">{productName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Monto</div>
              <div className="font-medium">
                {formatMoney(toNumber(proposal.amount), proposal.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Válida hasta</div>
              <div className="font-medium">{proposal.valid_until || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cliente</div>
              <div className="font-medium">{clientName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Actualizado</div>
              <div className="font-medium">
                {proposal.updated_at ? new Date(proposal.updated_at).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {proposal.description ? (
            <div className="mt-5">
              <div className="text-xs text-muted-foreground">Descripción</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{proposal.description}</div>
            </div>
          ) : null}

          <div className="mt-5">
            <div className="text-xs text-muted-foreground">Contenido</div>
            <div className="mt-2 whitespace-pre-wrap rounded-[12px] border bg-muted/10 px-3 py-2 text-[12.5px]">
              {proposal.content || "—"}
            </div>
          </div>

          {proposal.notes ? (
            <div className="mt-5">
              <div className="text-xs text-muted-foreground">Notas</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{proposal.notes}</div>
            </div>
          ) : null}
        </main>
      </section>
    </div>
  );
}

function DashboardEstimateDetailDialog({
  estimate,
  clientName,
  projectName,
  dealName,
  converting,
  conversionMessage,
  conversionError,
  onClose,
  onConvert,
}: {
  estimate: EstimateRow | null;
  clientName: string;
  projectName: string;
  dealName: string;
  converting: boolean;
  conversionMessage: string | null;
  conversionError: string | null;
  onClose: () => void;
  onConvert: () => void | Promise<void>;
}) {
  useDashboardModalLock(Boolean(estimate));

  if (!estimate) return null;

  const converted = normalizeDashboardStatus(estimate.status).includes("converted");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de cotización"
      className="fixed inset-0 z-[80] flex h-[100dvh] max-w-full flex-col overflow-x-hidden bg-white text-slate-950 min-[760px]:grid min-[760px]:place-items-center min-[760px]:bg-slate-950/35 min-[760px]:p-6"
    >
      <section className="flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-white min-[760px]:h-[88vh] min-[760px]:max-w-[680px] min-[760px]:rounded-[28px] min-[760px]:shadow-2xl">
        <header className="shrink-0 border-b border-[#edf1f7] bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] min-[760px]:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-500">Cotización</p>
              <h2 className="mt-1 line-clamp-2 text-[20px] font-bold leading-tight tracking-normal text-slate-950">
                {estimate.number
                  ? `#${estimate.number} · ${estimate.title || "Cotización"}`
                  : estimate.title || "Cotización"}
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Estado: {estimate.status || "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-600"
              aria-label="Cerrar cotización"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <a
              href={`/estimates?estimateId=${encodeURIComponent(estimate.id)}`}
              className="inline-flex h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700"
            >
              Abrir cotización completa
            </a>
            {!converted ? (
              <button
                type="button"
                onClick={() => void onConvert()}
                disabled={converting}
                className="inline-flex h-8 items-center rounded-full bg-slate-950 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {converting ? "Convirtiendo..." : "Convertir en factura"}
              </button>
            ) : null}
          </div>

          {conversionMessage ? (
            <p className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {conversionMessage}
            </p>
          ) : null}
          {conversionError ? (
            <p className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {conversionError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 text-sm min-[430px]:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="font-medium">
                <StatusBadge status={estimate.status || "—"} />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-medium">
                {formatMoney(toNumber(estimate.total), estimate.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Subtotal</div>
              <div className="font-medium">
                {formatMoney(toNumber(estimate.subtotal), estimate.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Impuesto</div>
              <div className="font-medium">
                {formatMoney(toNumber(estimate.tax), estimate.currency)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Emitida</div>
              <div className="font-medium">{estimate.date_issued || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vence</div>
              <div className="font-medium">{estimate.expiry_date || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cliente</div>
              <div className="font-medium">{clientName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Proyecto</div>
              <div className="font-medium">{projectName}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Oportunidad</div>
              <div className="font-medium">{dealName}</div>
            </div>
          </div>

          {estimate.notes ? (
            <div className="mt-5">
              <div className="text-xs text-muted-foreground">Notas</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{estimate.notes}</div>
            </div>
          ) : null}

          <div className="mt-5 text-xs text-muted-foreground">
            Actualizado{" "}
            {estimate.updated_at ? new Date(estimate.updated_at).toLocaleDateString() : "—"}
          </div>
        </main>
      </section>
    </div>
  );
}

function DashboardPage() {
  const { profile, user } = useAuth();
  const { t } = useT();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const [error, setError] = useState<string | null>(null);
  const [attentionMemoryReady, setAttentionMemoryReady] = useState(false);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);
  const [selectedDashboardTask, setSelectedDashboardTask] = useState<TaskRow | null>(null);
  const [selectedDashboardProject, setSelectedDashboardProject] = useState<ProjectRow | null>(null);
  const [selectedDashboardTicket, setSelectedDashboardTicket] = useState<TicketRow | null>(null);
  const [selectedDashboardCalendarItem, setSelectedDashboardCalendarItem] =
    useState<CalendarItem | null>(null);
  const [selectedDashboardInvoice, setSelectedDashboardInvoice] = useState<InvoiceRow | null>(null);
  const [selectedDashboardProposal, setSelectedDashboardProposal] = useState<ProposalRow | null>(
    null,
  );
  const [selectedDashboardEstimate, setSelectedDashboardEstimate] = useState<EstimateRow | null>(
    null,
  );
  const [dashboardEstimateConverting, setDashboardEstimateConverting] = useState(false);
  const [dashboardEstimateConversionMessage, setDashboardEstimateConversionMessage] = useState<
    string | null
  >(null);
  const [dashboardEstimateConversionError, setDashboardEstimateConversionError] = useState<
    string | null
  >(null);
  const [dashboardInvoiceItems, setDashboardInvoiceItems] = useState<InvoiceDetailItem[]>([]);
  const [dashboardInvoiceItemsLoading, setDashboardInvoiceItemsLoading] = useState(false);
  const [dashboardInvoiceItemsError, setDashboardInvoiceItemsError] = useState<string | null>(null);
  const [selectedDashboardInbox, setSelectedDashboardInbox] =
    useState<DashboardInboxSelection | null>(null);
  const [dashboardInboxMessages, setDashboardInboxMessages] = useState<DashboardInboxMessage[]>([]);
  const [dashboardInboxLoading, setDashboardInboxLoading] = useState(false);
  const [dashboardInboxError, setDashboardInboxError] = useState<string | null>(null);
  const [dashboardInboxRefreshKey, setDashboardInboxRefreshKey] = useState(0);
  const [dashboardEmailTo, setDashboardEmailTo] = useState("");
  const [dashboardEmailReply, setDashboardEmailReply] = useState("");
  const [dashboardEmailSending, setDashboardEmailSending] = useState(false);
  const [dashboardEmailSendError, setDashboardEmailSendError] = useState<string | null>(null);
  const [selectedDashboardInlineItem, setSelectedDashboardInlineItem] =
    useState<DashboardInlineWorkItem | null>(null);
  const [selectedTicketMessages, setSelectedTicketMessages] = useState<TicketMessageRow[]>([]);
  const [ticketReply, setTicketReply] = useState("");
  const [ticketReplyInternal, setTicketReplyInternal] = useState(false);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [clientSummaries, setClientSummaries] = useState<ClientSummaryRow[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductSummaryRow[]>([]);
  const [profileSummaries, setProfileSummaries] = useState<ProfileSummaryRow[]>([]);
  const [clientProducts, setClientProducts] = useState<ClientProductRow[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskAssignees, setTaskAssignees] = useState<TaskAssigneeRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [calendarSubscriptions, setCalendarSubscriptions] = useState<
    SubscriptionCalendarSourceRow[]
  >([]);
  const [calendarContracts, setCalendarContracts] = useState<ContractCalendarSourceRow[]>([]);
  const [calendarPayments, setCalendarPayments] = useState<PaymentCalendarSourceRow[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>([]);
  const [waConversations, setWaConversations] = useState<WhatsAppConversationRow[]>([]);
  const [emailConversations, setEmailConversations] = useState<EmailConversationRow[]>([]);
  const [metaConversations, setMetaConversations] = useState<MetaConversationRow[]>([]);
  const [activities, setActivities] = useState<
    { id: string; action: string; detail: string; time: string }[]
  >([]);
  useEffect(() => {
    if (!profile?.company_id) {
      setError(
        "No hay una empresa asociada a este usuario. Revisa el perfil o la configuración de la compañía.",
      );
      return;
    }

    const cid = profile.company_id;
    setError(null);

    const db = supabase as any;

    const load = async () => {
      const loadLeads = async () => {
        const base = "id,first_name,last_name,company_name,status,source,created_at,updated_at";
        const withInteraction = `${base},last_interaction_at`;
        const res = await db
          .from("leads")
          .select(withInteraction)
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120);
        if (!res.error) return res;
        const msg = String(res.error.message || "").toLowerCase();
        if (!msg.includes("last_interaction_at")) return res;
        return db
          .from("leads")
          .select(base)
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120);
      };

      const loadTasks = async () => {
        const richSelect =
          "id,title,description,status,priority,assigned_to,due_date,created_at,company_id,updated_at,related_lead_id,related_client_id,related_project_id,related_deal_id";
        const res = await db
          .from("tasks")
          .select(richSelect)
          .eq("company_id", cid)
          .order("due_date", { ascending: true })
          .limit(120);
        if (!res.error) return res;
        return db
          .from("tasks")
          .select(
            "id,title,description,status,priority,assigned_to,due_date,created_at,company_id,updated_at",
          )
          .eq("company_id", cid)
          .order("due_date", { ascending: true })
          .limit(120);
      };

      const loadDeals = async () =>
        db
          .from("deals")
          .select(
            "id,name,stage,value,currency,base_currency,exchange_rate,value_base,expected_close,updated_at",
          )
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120);

      const loadProjects = async () =>
        db
          .from("projects")
          .select(
            "id,company_id,name,description,status,progress,start_date,due_date,priority,budget,client_id,product_id,deal_id,lead_id,manager,created_by,created_at,updated_at",
          )
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(100);

      const loadInvoices = async () =>
        db
          .from("invoices")
          .select("*")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);

      const loadProposals = async () => {
        const richSelect = "*";
        const res = await db
          .from("proposals")
          .select(richSelect)
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);
        if (!res.error) return res;
        return db
          .from("proposals")
          .select("*")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);
      };

      const loadEstimates = async () =>
        db
          .from("estimates")
          .select("*")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);

      const loadTickets = async () =>
        db
          .from("tickets")
          .select("*")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);

      const results = await Promise.allSettled([
        loadLeads(),
        db
          .from("clients")
          .select("id,company_name,contact_person,status,updated_at,account_manager")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(250),
        db.from("clients").select("id", { count: "exact" }).eq("company_id", cid),
        loadDeals(),
        loadTasks(),
        loadProjects(),
        loadInvoices(),
        loadProposals(),
        loadEstimates(),
        loadTickets(),
        db
          .from("subscriptions")
          .select("id,name,next_billing_date,status,amount,currency,base_currency,billing_cycle")
          .eq("company_id", cid)
          .not("next_billing_date", "is", null)
          .order("next_billing_date", { ascending: true })
          .limit(120),
        db
          .from("contracts")
          .select(
            "id,contract_number,subject,end_date,status,contract_value,currency,base_currency",
          )
          .eq("company_id", cid)
          .not("end_date", "is", null)
          .order("end_date", { ascending: true })
          .limit(120),
        db
          .from("payments")
          .select("id,payment_number,reference,payment_date,status,amount,currency,base_currency")
          .eq("company_id", cid)
          .not("payment_date", "is", null)
          .order("payment_date", { ascending: true })
          .limit(120),
        db
          .from("whatsapp_conversations")
          .select(
            "id, status, last_message, last_message_at, unread_count, whatsapp_contacts(id, name, phone)",
          )
          .eq("company_id", cid)
          .order("last_message_at", { ascending: false })
          .limit(50),
        db
          .from("email_conversations")
          .select("id, status, subject, last_message_at, is_read")
          .eq("company_id", cid)
          .order("last_message_at", { ascending: false })
          .limit(50),
        db
          .from("meta_conversations")
          .select(
            "id, platform, status, sender_name, last_message_text, last_message_at, unread_count, created_at",
          )
          .eq("company_id", cid)
          .in("platform", ["messenger", "instagram"])
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(80),
        db
          .from("activity_logs")
          .select("id, action, detail, created_at, entity_type")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
          .limit(10),
        db
          .from("calendar_events")
          .select("id,title,description,location,type,status,start_at,end_at,all_day,created_at")
          .eq("company_id", cid)
          .order("start_at", { ascending: true })
          .limit(120),
        db
          .from("client_products")
          .select(
            "id,client_id,product_id,status,start_date,end_date,price,billing_type,updated_at",
          )
          .eq("company_id", cid)
          .order("end_date", { ascending: true, nullsFirst: false })
          .limit(120),
        db.from("products").select("id,name").eq("company_id", cid).limit(250),
        db
          .from("profiles")
          .select("id,full_name,email,user_id,is_active")
          .eq("company_id", cid)
          .limit(250),
        db.from("task_assignees").select("id,task_id,user_id").eq("company_id", cid).limit(2000),
      ]);

      const getData = <T,>(index: number): T[] => {
        const r = results[index];
        if (r.status !== "fulfilled") return [];
        return (r.value?.data || []) as T[];
      };

      const getCount = (index: number) => {
        const r = results[index];
        if (r.status !== "fulfilled") return 0;
        return (
          (r.value?.count as number | null) ?? (r.value?.data?.length as number | undefined) ?? 0
        );
      };

      const hadErrors =
        results.some((r) => r.status === "rejected") ||
        results.some((r) => r.status === "fulfilled" && r.value?.error);
      if (hadErrors)
        setError("Algunas tarjetas no pudieron cargarse. El resto del dashboard sigue disponible.");

      setLeads(getData<LeadRow>(0));
      setClientSummaries(getData<ClientSummaryRow>(1));
      setClientsCount(getCount(2));
      setDeals(getData<DealRow>(3));
      setTasks(getData<Partial<TaskRow>>(4).map((task) => normalizeDashboardTask(task, cid)));
      setProjects(
        getData<Partial<ProjectRow>>(5).map((project) => normalizeDashboardProject(project, cid)),
      );
      setInvoices(getData<InvoiceRow>(6));
      setProposals(getData<ProposalRow>(7));
      setEstimates(getData<EstimateRow>(8));
      setTickets(
        getData<Partial<TicketRow>>(9).map((ticket) => normalizeDashboardTicket(ticket, cid)),
      );
      setCalendarSubscriptions(getData<SubscriptionCalendarSourceRow>(10));
      setCalendarContracts(getData<ContractCalendarSourceRow>(11));
      setCalendarPayments(getData<PaymentCalendarSourceRow>(12));
      setWaConversations(getData<WhatsAppConversationRow>(13));
      setEmailConversations(getData<EmailConversationRow>(14));
      setMetaConversations(getData<MetaConversationRow>(15));
      setCalendarEvents(getData<CalendarEventRow>(17));
      setClientProducts(getData<ClientProductRow>(18));
      setProductSummaries(getData<ProductSummaryRow>(19));
      setProfileSummaries(getData<ProfileSummaryRow>(20));
      setTaskAssignees(getData<TaskAssigneeRow>(21));

      const actRows = getData<ActivityLogRow>(16);
      setActivities(
        actRows.map((a) => ({
          id: a.id,
          action: a.action,
          detail: a.detail || `${a.action} ${a.entity_type}`,
          time: new Date(a.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      );
    };

    load();
  }, [profile?.company_id, calendarRefreshKey, salesRefreshKey, taskRefreshKey]);

  useEffect(() => {
    const companyId = profile?.company_id;
    const userId = user?.id;
    if (!companyId || !userId) {
      setAttentionMemoryReady(false);
      return;
    }

    let cancelled = false;
    const db = supabase as any;

    const run = async () => {
      const result = await loadAttentionMemoryFromSupabase(db, { companyId, userId });
      if (cancelled) return;
      if (result.error) {
        console.warn("No se pudo cargar la memoria de atención desde Supabase", result.error);
      }
      setAttentionMemoryReady(true);
    };

    setAttentionMemoryReady(false);
    void run();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, user?.id]);

  useEffect(() => {
    if (!selectedDashboardInbox?.id || !profile?.company_id) {
      setDashboardInboxMessages([]);
      setDashboardInboxError(null);
      setDashboardInboxLoading(false);
      return;
    }

    let cancelled = false;
    const db = supabase as any;

    const loadInboxMessages = async () => {
      setDashboardInboxLoading(true);
      setDashboardInboxError(null);
      setDashboardEmailSendError(null);
      setDashboardEmailReply("");

      try {
        if (selectedDashboardInbox.channel === "whatsapp") {
          const { data, error: messagesError } = await db
            .from("crm_whatsapp_messages")
            .select("*")
            .eq("conversation_id", selectedDashboardInbox.id)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;
          if (cancelled) return;
          setDashboardInboxMessages(
            (Array.isArray(data) ? data : []).map((message: any) => ({
              id: String(message.message_id || message.whatsapp_message_id || message.created_at),
              direction: String(message.direction || "inbound"),
              author:
                String(message.direction || "").toLowerCase() === "outbound" ? "Equipo" : "Cliente",
              body:
                message.content ||
                (message.message_type === "interactive_button" ? message.button_title : "") ||
                "",
              at: message.created_at,
            })),
          );
          return;
        }

        if (
          selectedDashboardInbox.channel === "messenger" ||
          selectedDashboardInbox.channel === "instagram"
        ) {
          const { data, error: messagesError } = await db
            .from("meta_messages")
            .select(
              "id, conversation_id, platform, direction, message_type, text, sent_at, created_at",
            )
            .eq("conversation_id", selectedDashboardInbox.id)
            .eq("company_id", profile.company_id)
            .eq("platform", selectedDashboardInbox.channel)
            .neq("message_type", "bot_state")
            .order("sent_at", { ascending: true, nullsFirst: true })
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;
          if (cancelled) return;
          setDashboardInboxMessages(
            (Array.isArray(data) ? data : []).map((message: any) => ({
              id: String(message.id || message.created_at),
              direction: String(message.direction || "inbound"),
              author:
                String(message.direction || "").toLowerCase() === "outbound" ? "Equipo" : "Cliente",
              body: message.text || "",
              at: message.sent_at || message.created_at,
            })),
          );
          return;
        }

        const { data, error: messagesError } = await db
          .from("email_messages")
          .select(
            "id,sender,recipient,subject,body,body_html,direction,is_read,sent_at,created_at,from_email,to_email,snippet",
          )
          .eq("conversation_id", selectedDashboardInbox.id)
          .order("sent_at", { ascending: true, nullsFirst: true })
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        const normalized = rows.map((message: any) => ({
          id: String(message.id || message.created_at),
          direction: String(message.direction || "inbound"),
          author:
            extractEmailAddress(message.from_email || message.sender) ||
            (String(message.direction || "").toLowerCase() === "outbound" ? "Equipo" : "Cliente"),
          body: message.body || message.snippet || "",
          bodyHtml: message.body_html || null,
          at: message.sent_at || message.created_at,
        }));
        setDashboardInboxMessages(normalized);

        const lastInbound = [...rows]
          .reverse()
          .find((message: any) => String(message.direction || "").toLowerCase() !== "outbound");
        setDashboardEmailTo(
          extractEmailAddress(lastInbound?.from_email || lastInbound?.sender || ""),
        );
      } catch (err) {
        if (cancelled) return;
        setDashboardInboxMessages([]);
        setDashboardInboxError(
          err instanceof Error ? err.message : "No se pudieron cargar los mensajes.",
        );
      } finally {
        if (!cancelled) setDashboardInboxLoading(false);
      }
    };

    void loadInboxMessages();
    return () => {
      cancelled = true;
    };
  }, [
    dashboardInboxRefreshKey,
    profile?.company_id,
    selectedDashboardInbox?.channel,
    selectedDashboardInbox?.id,
  ]);

  useEffect(() => {
    if (!selectedDashboardInvoice?.id || !profile?.company_id) {
      setDashboardInvoiceItems([]);
      setDashboardInvoiceItemsError(null);
      setDashboardInvoiceItemsLoading(false);
      return;
    }

    let cancelled = false;
    const db = supabase as any;
    const loadItems = async () => {
      setDashboardInvoiceItemsLoading(true);
      setDashboardInvoiceItemsError(null);
      const { data, error: itemsError } = await db
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", selectedDashboardInvoice.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (itemsError) {
        setDashboardInvoiceItems([]);
        setDashboardInvoiceItemsError(itemsError.message || "No se pudieron cargar los artículos.");
      } else {
        setDashboardInvoiceItems((Array.isArray(data) ? data : []) as InvoiceDetailItem[]);
      }
      setDashboardInvoiceItemsLoading(false);
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, selectedDashboardInvoice?.id]);

  const today = localTodayKey();
  const leadById = new Map(leads.map((lead) => [String(lead.id), lead]));
  const clientById = new Map(clientSummaries.map((client) => [String(client.id), client]));
  const productById = new Map(productSummaries.map((product) => [String(product.id), product]));
  const profileById = new Map(profileSummaries.map((item) => [String(item.id), item]));
  const profileByUserId = new Map(
    profileSummaries.filter((item) => item.user_id).map((item) => [String(item.user_id), item]),
  );
  const projectById = new Map(projects.map((project) => [String(project.id), project]));

  const openDeals = deals.filter((d) => !isClosedDealStage(d.stage));
  const pipelineValue = openDeals.reduce((s, d) => s + dealBaseAmount(d, currencySettings), 0);
  const moneyBase = (value: number | string | null | undefined) =>
    formatMoney(value, currencySettings.baseCurrency);
  const moneyConvertedHint = convertedLabel(currencySettings);

  const overdueTasks = tasks.filter((t) => {
    if (isCompletedTaskStatus(t.status)) return false;
    const dueKey = toDateKey(t.due_date);
    if (!dueKey) return false;
    return dueKey < today;
  });
  const openTasksCount = tasks.filter((task) => !isCompletedTaskStatus(task.status)).length;
  const tasksDueTodayCount = tasks.filter((t) => {
    if (isCompletedTaskStatus(t.status)) return false;
    const dueKey = toDateKey(t.due_date);
    return dueKey === today;
  }).length;

  const pendingProposals = proposals.filter((p) => isPendingProposalStatus(p.status));
  const approvedProposalsNoPaymentCount = proposals.filter((p) =>
    isApprovedProposalStatus(p.status),
  ).length;

  const invoicesPending = invoices.filter((i) => isOpenInvoiceStatus(i.status));
  const invoicesOverdue = invoices.filter((i) => {
    const dueKey = toDateKey(i.due_date);
    if (!dueKey) return isOverdueInvoiceStatus(i.status);
    return !isPaidInvoiceStatus(i.status) && dueKey < today;
  });
  const invoicesSent = invoices.filter((i) => isSentInvoiceStatus(i.status));
  const paidRevenue = invoices
    .filter((i) => isPaidInvoiceStatus(i.status))
    .reduce((s, i) => s + invoiceBaseAmount(i, currencySettings), 0);
  const receivableTotal = invoicesPending.reduce(
    (s, i) => s + invoiceBaseAmount(i, currencySettings),
    0,
  );

  const waOpen = waConversations.filter((c) => isOpenConversationStatus(c.status)).length;
  const emailOpen = emailConversations.filter((c) => isOpenConversationStatus(c.status)).length;
  const messengerOpen = metaConversations.filter(
    (c) => String(c.platform).toLowerCase() === "messenger" && isOpenConversationStatus(c.status),
  ).length;
  const instagramOpen = metaConversations.filter(
    (c) => String(c.platform).toLowerCase() === "instagram" && isOpenConversationStatus(c.status),
  ).length;
  const inboxPendingTotal = waOpen + messengerOpen + instagramOpen;
  const inboxConversationTotal = waConversations.length + metaConversations.length;

  const projectsActiveCount = projects.filter((p) => isActiveProjectStatus(p.status)).length;
  const projectsAtRisk = projects.filter((p) => {
    if (!isActiveProjectStatus(p.status)) return false;
    const dueKey = toDateKey(p.due_date);
    if (!dueKey) return false;
    return dueKey < today;
  });
  const projectsDueThisWeekCount = projects.filter((p) => {
    if (!isActiveProjectStatus(p.status)) return false;
    const dueKey = toDateKey(p.due_date);
    if (!dueKey) return false;
    return isDateKeyInNextDays(dueKey, 7);
  }).length;

  const leadsNeedingFollowUp = leads.filter((l) => {
    if (isClosedLeadStatus(l.status)) return false;
    const stale = hoursSince(l.updated_at) > 24;
    return stale;
  });

  const leadsActiveCount = leads.filter((l) => !isClosedLeadStatus(l.status)).length;
  const newLeadsToday = leads.filter((l) => dateKeyFromISO(l.created_at) === today).length;
  const openTaskLeadIds = new Set(
    tasks
      .filter((task) => !isCompletedTaskStatus(task.status) && task.related_lead_id)
      .map((task) => String(task.related_lead_id)),
  );

  const leadAttentionItems = leads
    .filter((lead) => !isClosedLeadStatus(lead.status))
    .map((lead) => {
      const reasons: string[] = [];
      if (!openTaskLeadIds.has(String(lead.id))) reasons.push("Sin próxima tarea");
      if (lead.last_interaction_at && hoursSince(lead.last_interaction_at) > 72)
        reasons.push("Sin interacción reciente");
      if (isNewLeadStatus(lead.status) && daysSince(lead.created_at) >= 2)
        reasons.push("Sigue en New");
      return { lead, reasons };
    })
    .filter((item) => item.reasons.length > 0)
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        String(a.lead.updated_at).localeCompare(String(b.lead.updated_at)),
    )
    .slice(0, 8);

  const upcomingTasksCount = tasks.filter((t) => {
    if (isCompletedTaskStatus(t.status)) return false;
    const dueKey = toDateKey(t.due_date);
    if (!dueKey) return false;
    return isDateKeyInNextDays(dueKey, 7);
  }).length;
  const overdueTaskItems = overdueTasks
    .map((task) => ({
      ...task,
      relation: buildRelationLabel({ task, leadById, clientById, projectById }),
    }))
    .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))
    .slice(0, 8);
  const staleDealItems = deals
    .filter((deal) => !isClosedDealStage(deal.stage) && daysSince(deal.updated_at) >= 7)
    .map((deal) => ({
      ...deal,
      displayValueBase: dealBaseAmount(deal, currencySettings),
    }))
    .sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at))
    .slice(0, 8);
  const pendingProposalItems = pendingProposals
    .map((proposal) => ({
      ...proposal,
      clientName: proposal.client_id
        ? clientLabel(clientById.get(String(proposal.client_id)))
        : null,
    }))
    .slice(0, 8);
  const pendingInvoiceItems = invoicesPending
    .map((invoice) => ({
      ...invoice,
      isOverdue:
        isOverdueInvoiceStatus(invoice.status) ||
        (!!toDateKey(invoice.due_date) &&
          String(invoice.status || "").toLowerCase() !== "paid" &&
          String(toDateKey(invoice.due_date)) < today),
      clientName: invoice.client_id ? clientLabel(clientById.get(String(invoice.client_id))) : null,
    }))
    .sort(
      (a, b) =>
        Number(b.isOverdue) - Number(a.isOverdue) ||
        String(a.due_date || "").localeCompare(String(b.due_date || "")),
    )
    .slice(0, 8);
  const overdueCalendarEvents = calendarEvents
    .filter((event) => {
      const status = normalizeDashboardStatus(event.status);
      if (status.includes("complete") || status.includes("done") || status.includes("cancel"))
        return false;
      const startAt = event.start_at ? Date.parse(event.start_at) : Number.NaN;
      if (!Number.isFinite(startAt)) return false;
      return startAt < Date.now();
    })
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
    .slice(0, 8);
  const upcomingCalendarEvents = calendarEvents
    .filter((event) => {
      const status = normalizeDashboardStatus(event.status);
      if (status.includes("complete") || status.includes("done") || status.includes("cancel"))
        return false;
      const startAt = event.start_at ? Date.parse(event.start_at) : Number.NaN;
      if (!Number.isFinite(startAt)) return false;
      return startAt >= Date.now();
    })
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))
    .slice(0, 8);

  const rawAttentionEvents = buildAttentionFeed({
    leads,
    tasks,
    projects,
    invoices,
    proposals,
    tickets,
    calendarEvents,
    clients: clientSummaries,
    clientProducts,
    clientsById: clientById,
    leadsById: leadById,
    projectsById: projectById,
    conversations: {
      whatsappOpen: waOpen,
      messengerOpen,
      instagramOpen,
      emailOpen,
    },
  });
  const attentionMemoryScope =
    profile?.company_id && user?.id ? { companyId: profile.company_id, userId: user.id } : null;
  const attentionEvents = applyAttentionMemory(rawAttentionEvents, attentionMemoryScope);
  const attentionNotificationKey = attentionEvents
    .slice(0, 5)
    .map((event) =>
      [
        event.id,
        event.ruleId,
        event.module,
        event.score,
        event.severity,
        event.title,
        event.summary,
      ].join("::"),
    )
    .join("|");

  useEffect(() => {
    if (!attentionMemoryScope || !attentionMemoryReady || !rawAttentionEvents.length) return;
    const db = supabase as any;
    void reconcileAttentionMemoryRemote(db, attentionMemoryScope, rawAttentionEvents).then(
      (result) => {
        if (result.error) {
          console.warn("No se pudo guardar la memoria de atención en Supabase", result.error);
        }
      },
    );
  }, [
    profile?.company_id,
    user?.id,
    attentionMemoryReady,
    rawAttentionEvents.length,
    attentionNotificationKey,
  ]);

  useEffect(() => {
    const companyId = profile?.company_id;
    const userId = user?.id;
    if (!companyId || !userId || !attentionMemoryReady || !attentionEvents.length) return;

    let cancelled = false;
    const db = supabase as any;

    const run = async () => {
      const result = await syncAttentionNotifications(
        db,
        attentionEvents,
        { companyId, userId },
        5,
      );
      if (cancelled) return;
      if (!result.error) {
        const memoryResult = await markAttentionNotifiedRemote(
          db,
          { companyId, userId },
          attentionEvents.slice(0, 5),
        );
        if (memoryResult.error) {
          console.warn(
            "No se pudo guardar la marca de notificación de atención",
            memoryResult.error,
          );
        }
        return;
      }
      console.error("No se pudieron sincronizar las notificaciones de atención", result.error);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, user?.id, attentionMemoryReady, attentionNotificationKey]);

  useEffect(() => {
    if (!selectedDashboardTicket?.id) {
      setSelectedTicketMessages([]);
      setTicketReply("");
      setTicketReplyInternal(false);
      return;
    }

    let cancelled = false;
    const db = supabase as any;

    const loadMessages = async () => {
      const { data, error: messagesError } = await db
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", selectedDashboardTicket.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (messagesError) {
        console.warn("No se pudieron cargar los mensajes del ticket", messagesError);
        setSelectedTicketMessages([]);
        return;
      }
      setSelectedTicketMessages((data || []) as TicketMessageRow[]);
    };

    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedDashboardTicket?.id]);

  const attentionModuleScores = attentionEvents.reduce<Record<AttentionModule, number>>(
    (acc, event) => {
      acc[event.module] = Math.max(acc[event.module] || 0, event.score);
      return acc;
    },
    {} as Record<AttentionModule, number>,
  );
  const moduleScore = (module: AttentionModule) => attentionModuleScores[module] || 0;
  const priorityModuleByKey: Record<string, AttentionModule> = {
    leads_followup: "leads",
    overdue_tasks: "tasks",
    pending_invoices: "invoices",
    pending_proposals: "proposals",
    wa_open: "inbox",
    projects_risk: "projects",
    calendar_overdue: "calendar",
  };
  const priorityRuleByKey: Record<string, string> = {
    leads_followup: "leads_needs_follow_up",
    overdue_tasks: "tasks_overdue",
    pending_invoices: "pending_invoices",
    pending_proposals: "proposals_pending_response",
    wa_open: "wa_open",
    projects_risk: "projects_risk",
    calendar_overdue: "calendar_overdue",
  };

  const priorities: PriorityItem[] = [];
  if (leadsNeedingFollowUp.length > 0) {
    priorities.push({
      key: "leads_followup",
      icon: Users,
      title: "Leads sin seguimiento",
      description: "Contacta leads desactualizados o sin próximo follow-up.",
      urgency: "alta",
      count: leadsNeedingFollowUp.length,
      variant: priorityVariantFromKey("leads_followup"),
      ctaLabel: "Ver leads",
      to: "/leads",
    });
  }
  if (overdueTasks.length > 0) {
    priorities.push({
      key: "overdue_tasks",
      icon: AlertTriangle,
      title: "Tareas atrasadas",
      description: "Tienes tareas vencidas que requieren atención.",
      urgency: "alta",
      count: overdueTasks.length,
      variant: priorityVariantFromKey("overdue_tasks"),
      ctaLabel: "Ver tareas",
      to: "/tasks",
    });
  }
  if (invoicesPending.length > 0) {
    priorities.push({
      key: "pending_invoices",
      icon: Receipt,
      title: "Facturas por cobrar",
      description: "Revisa facturas enviadas o vencidas y prioriza el cobro.",
      urgency: invoicesOverdue.length > 0 ? "alta" : "media",
      count: invoicesPending.length,
      variant: priorityVariantFromKey("pending_invoices"),
      ctaLabel: "Ver facturas",
      to: "/invoices",
    });
  }
  if (pendingProposals.length > 0) {
    priorities.push({
      key: "pending_proposals",
      icon: FileText,
      title: "Propuestas pendientes",
      description: "Hay propuestas esperando respuesta del cliente.",
      urgency: "media",
      count: pendingProposals.length,
      variant: priorityVariantFromKey("pending_proposals"),
      ctaLabel: "Ver propuestas",
      to: "/proposals",
    });
  }
  if (inboxPendingTotal > 0) {
    priorities.push({
      key: "wa_open",
      icon: MessageCircle,
      title: "Meta Inbox pendiente",
      description: "Atiende WhatsApp, Messenger e Instagram para no perder intención comercial.",
      urgency: "media",
      count: inboxPendingTotal,
      variant: priorityVariantFromKey("wa_open"),
      ctaLabel: "Abrir Meta Inbox",
      to: "/whatsapp-web",
    });
  }
  if (projectsAtRisk.length > 0) {
    priorities.push({
      key: "projects_risk",
      icon: Clock,
      title: "Proyectos próximos a vencer",
      description: "Hay proyectos con fecha vencida o muy próximos al límite.",
      urgency: "alta",
      count: projectsAtRisk.length,
      variant: priorityVariantFromKey("projects_risk"),
      ctaLabel: "Ver proyectos",
      to: "/projects",
    });
  }
  if (overdueCalendarEvents.length > 0) {
    priorities.push({
      key: "calendar_overdue",
      icon: Clock,
      title: "Eventos vencidos",
      description: "Hay recordatorios o citas que ya pasaron y siguen pendientes.",
      urgency: "media",
      count: overdueCalendarEvents.length,
      variant: priorityVariantFromKey("calendar_overdue"),
      ctaLabel: "Abrir calendario",
      to: "/calendar",
    });
  }

  const prioritiesSorted = [...priorities].sort(
    (a, b) =>
      moduleScore(priorityModuleByKey[b.key] || "tasks") -
        moduleScore(priorityModuleByKey[a.key] || "tasks") ||
      ATTENTION_PRIORITY_ORDER.indexOf(priorityRuleByKey[a.key] || a.key) -
        ATTENTION_PRIORITY_ORDER.indexOf(priorityRuleByKey[b.key] || b.key),
  );
  const totalActions = prioritiesSorted.reduce((s, p) => s + (p.count || 0), 0);

  const kpis = [
    {
      label: "Leads activos",
      value: leadsActiveCount,
      icon: Users,
      iconClassName: "text-[#1d62f9]",
      iconChipClassName: "bg-[#edf5ff]",
    },
    {
      label: "Pipeline abierto",
      value: moneyBase(pipelineValue),
      icon: GitBranch,
      iconClassName: "text-[#1d62f9]",
      iconChipClassName: "bg-[#edf5ff]",
    },
    {
      label: "Propuestas pendientes",
      value: pendingProposals.length,
      icon: FileText,
      iconClassName: "text-[#7c3aed]",
      iconChipClassName: "bg-[#f4efff]",
    },
    {
      label: "Facturas por cobrar",
      value: moneyBase(receivableTotal),
      icon: Receipt,
      iconClassName: "text-[#f59e0b]",
      iconChipClassName: "bg-[#fff7e6]",
    },
    {
      label: "Proyectos activos",
      value: projectsActiveCount,
      icon: Building2,
      iconClassName: "text-[#16a34a]",
      iconChipClassName: "bg-[#ecfdf3]",
    },
  ];

  const pipelineStageOrder = [
    "New Lead",
    "Discovery",
    "Qualified",
    "Proposal Sent",
    "Won",
  ] as const;
  const pipelineDeals = deals.filter((d) => String(d.stage || "").toLowerCase() !== "lost");
  const stageAgg = pipelineDeals.reduce<Record<string, { count: number; value: number }>>(
    (acc, d) => {
      const stage = d.stage || "New Lead";
      const prev = acc[stage] || { count: 0, value: 0 };
      acc[stage] = {
        count: prev.count + 1,
        value: prev.value + dealBaseAmount(d, currencySettings),
      };
      return acc;
    },
    {},
  );
  const pipelineStages = pipelineStageOrder.map((stage) => ({
    stage,
    count: stageAgg[stage]?.count || 0,
    value: stageAgg[stage]?.value || 0,
  }));
  const pipelineTotalValue = pipelineStages.reduce((s, st) => s + st.value, 0);

  const agendaItems = [
    ...upcomingCalendarEvents.map((event) => ({
      kind: "Calendario",
      title: event.title || "Evento programado",
      dateKey: toDateKey(event.start_at),
      to: "/calendar",
    })),
    ...tasks
      .filter((t) => !isCompletedTaskStatus(t.status))
      .map((t) => ({
        kind: "Tarea",
        title: t.title || "Tarea sin título",
        dateKey: toDateKey(t.due_date),
        to: "/tasks",
      })),
    ...invoices
      .filter((i) => isSentOrOverdueInvoiceStatus(i.status))
      .map((i) => ({
        kind: "Factura",
        title: i.number ? `Factura ${i.number}` : "Factura por cobrar",
        dateKey: toDateKey(i.due_date),
        to: "/invoices",
      })),
    ...proposals
      .filter((p) => isSentOrViewedProposalStatus(p.status))
      .map((p) => ({
        kind: "Propuesta",
        title: p.title || (p.number ? `Propuesta ${p.number}` : "Propuesta por vencer"),
        dateKey: toDateKey(p.valid_until),
        to: "/proposals",
      })),
    ...projects
      .filter((p) => isActiveProjectStatus(p.status))
      .map((p) => ({
        kind: "Proyecto",
        title: "Entrega de proyecto",
        dateKey: toDateKey(p.due_date),
        to: "/projects",
      })),
  ]
    .filter((x): x is { kind: string; title: string; dateKey: string; to: string } =>
      Boolean(x.dateKey),
    )
    .sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));

  const agendaToday = agendaItems.filter((i) => i.dateKey === today).slice(0, 6);
  const agendaWeek = agendaItems
    .filter((i) => i.dateKey !== today && isDateKeyInNextDays(i.dateKey, 7))
    .slice(0, 6);

  const pendingConversations = [
    ...waConversations
      .filter((c) => isOpenConversationStatus(c.status))
      .slice(0, 3)
      .map((c) => ({
        id: `wa:${c.id}`,
        name: c.whatsapp_contacts?.name || "Contacto",
        channel: "WhatsApp",
        preview: c.last_message || "Sin mensaje reciente.",
        at: c.last_message_at || "",
        to: "/whatsapp-web",
      })),
    ...metaConversations
      .filter((c) => isOpenConversationStatus(c.status))
      .slice(0, 4)
      .map((c) => ({
        id: `meta:${c.id}`,
        name:
          c.sender_name ||
          (String(c.platform).toLowerCase() === "instagram"
            ? "Usuario de Instagram"
            : "Usuario de Messenger"),
        channel: String(c.platform).toLowerCase() === "instagram" ? "Instagram" : "Messenger",
        preview: c.last_message_text || "Sin mensaje reciente.",
        at: c.last_message_at || c.created_at || "",
        to: "/whatsapp-web",
      })),
  ].slice(0, 6);

  const attentionCards = [
    {
      key: "leads",
      module: "leads",
      title: "Leads que necesitan seguimiento",
      icon: Users,
      to: "/leads",
      empty: "No hay leads urgentes por revisar.",
      items: leadAttentionItems,
      render: (item: (typeof leadAttentionItems)[number]) => (
        <>
          <div className="text-[13px] font-semibold truncate">{leadLabel(item.lead)}</div>
          <div className="mt-1 text-[12px] font-medium text-[#667085]">
            {item.reasons.join(" · ")}
          </div>
        </>
      ),
    },
    {
      key: "tasks",
      module: "tasks",
      title: "Tareas atrasadas",
      icon: AlertTriangle,
      to: "/tasks",
      empty: "No hay tareas vencidas ahora mismo.",
      items: overdueTaskItems,
      render: (item: (typeof overdueTaskItems)[number]) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold truncate">
              {item.title || "Tarea sin título"}
            </div>
            <span className="shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-[#fff1f3] text-[#e11d48]">
              {item.priority || "Media"}
            </span>
          </div>
          <div className="mt-1 text-[12px] font-medium text-[#667085]">{item.relation}</div>
          <div className="mt-1 text-[12px] font-semibold text-[#e11d48]">
            Vence: {formatShortDate(item.due_date)}
          </div>
        </>
      ),
    },
    {
      key: "deals",
      module: "projects",
      title: "Deals estancados",
      icon: GitBranch,
      to: "/pipeline",
      empty: "No hay oportunidades estancadas por ahora.",
      items: staleDealItems,
      render: (item: (typeof staleDealItems)[number]) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold truncate">
              {item.name || "Oportunidad sin nombre"}
            </div>
            <span className="text-[12px] font-extrabold text-[#1d62f9]">
              {moneyBase(item.displayValueBase)}
            </span>
          </div>
          <div className="mt-1 text-[12px] font-medium text-[#667085]">Etapa: {item.stage}</div>
          <div className="mt-1 text-[12px] font-medium text-[#667085]">
            Cierre: {item.expected_close ? formatShortDate(item.expected_close) : "Sin fecha"} ·{" "}
            {Math.floor(daysSince(item.updated_at))}d sin cambios
          </div>
        </>
      ),
    },
    {
      key: "proposals",
      module: "proposals",
      title: "Propuestas pendientes",
      icon: FileText,
      to: "/proposals",
      empty: "No hay propuestas pendientes de respuesta.",
      items: pendingProposalItems,
      render: (item: (typeof pendingProposalItems)[number]) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold truncate">
              {item.title || item.number || "Propuesta sin título"}
            </div>
            <span className="shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-[#f4efff] text-[#7c3aed]">
              {item.status || "Pendiente"}
            </span>
          </div>
          <div className="mt-1 text-[12px] font-medium text-[#667085]">
            {item.clientName || "Sin cliente vinculado"}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[#475467]">
            {item.amount != null
              ? formatMoney(toNumber(item.amount), item.currency)
              : "Monto no disponible"}
          </div>
        </>
      ),
    },
    {
      key: "invoices",
      module: "invoices",
      title: "Facturas pendientes o vencidas",
      icon: Receipt,
      to: "/invoices",
      empty: "No hay facturas pendientes por cobrar.",
      items: pendingInvoiceItems,
      render: (item: (typeof pendingInvoiceItems)[number]) => (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold truncate">
              {item.number ? `Factura ${item.number}` : "Factura pendiente"}
            </div>
            <span
              className={
                "shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold " +
                (item.isOverdue ? "bg-[#fff1f3] text-[#e11d48]" : "bg-[#fff7e6] text-[#d97706]")
              }
            >
              {item.status || (item.isOverdue ? "Overdue" : "Pending")}
            </span>
          </div>
          <div className="mt-1 text-[12px] font-medium text-[#667085]">
            {item.clientName || "Sin cliente vinculado"}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-[#475467]">
            {formatMoney(toNumber(item.total), invoiceCurrency(item))} ·{" "}
            {item.due_date ? `Vence ${formatShortDate(item.due_date)}` : "Sin vencimiento"}
          </div>
        </>
      ),
    },
  ];
  const attentionCardsSorted = [...attentionCards].sort(
    (a, b) =>
      moduleScore((b.module as AttentionModule) || "tasks") -
        moduleScore((a.module as AttentionModule) || "tasks") || a.title.localeCompare(b.title),
  );

  const dashboardPercent = (value: number, total: number) => {
    if (!total || total <= 0) return "0%";
    return `${Math.min(100, Math.max(0, Math.round((value / total) * 100)))}%`;
  };

  const dashboardInitials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CL";

  const dashboardTodayLabel = new Date().toLocaleDateString("es-DO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dashboardKpiRatio = (current: number, total: number) =>
    total > 0 ? `${current} / ${total}` : "0";

  const dashboardV2Kpis = [
    {
      label: "Facturas por cobrar",
      value: dashboardKpiRatio(invoicesPending.length, invoices.length),
      helper: moneyBase(receivableTotal),
      progressLabel: invoicesPending.length ? `Faltan ${invoicesPending.length}` : "Todo cobrado",
      progressCurrent: invoicesPending.length,
      progressTotal: Math.max(invoices.length, invoicesPending.length, 1),
      tone: invoicesOverdue.length ? ("orange" as const) : ("green" as const),
      icon: DollarSign,
    },
    {
      label: "Oportunidades abiertas",
      value: dashboardKpiRatio(openDeals.length, deals.length),
      helper: moneyBase(pipelineValue),
      progressLabel: openDeals.length ? `Faltan ${openDeals.length}` : "Pipeline limpio",
      progressCurrent: openDeals.length,
      progressTotal: Math.max(deals.length, openDeals.length, 1),
      tone: "blue" as const,
      icon: TrendingUp,
    },
    {
      label: "Tareas pendientes",
      value: dashboardKpiRatio(openTasksCount, tasks.length),
      helper: overdueTasks.length ? `${overdueTasks.length} atrasadas` : "Sin atrasos",
      progressLabel: openTasksCount ? `Faltan ${openTasksCount}` : "Todo listo",
      progressCurrent: openTasksCount,
      progressTotal: Math.max(tasks.length, openTasksCount, 1),
      tone: overdueTasks.length ? ("orange" as const) : ("neutral" as const),
      icon: Clock,
    },
    {
      label: "Propuestas",
      value: dashboardKpiRatio(pendingProposals.length, proposals.length),
      helper: "Esperando respuesta",
      progressLabel: pendingProposals.length
        ? `Faltan ${pendingProposals.length}`
        : "Sin pendientes",
      progressCurrent: pendingProposals.length,
      progressTotal: Math.max(proposals.length, pendingProposals.length, 1),
      tone: "purple" as const,
      icon: FileText,
    },
    {
      label: "Meta Inbox",
      value: dashboardKpiRatio(inboxPendingTotal, inboxConversationTotal),
      helper: "Por atender",
      progressLabel: inboxPendingTotal ? `Faltan ${inboxPendingTotal}` : "Meta limpio",
      progressCurrent: inboxPendingTotal,
      progressTotal: Math.max(inboxConversationTotal, inboxPendingTotal, 1),
      tone: inboxPendingTotal ? ("red" as const) : ("neutral" as const),
      icon: MessageCircle,
    },
    {
      label: "Proyectos",
      value: dashboardKpiRatio(projectsActiveCount, projects.length),
      helper: projectsAtRisk.length ? `${projectsAtRisk.length} en riesgo` : "En ejecución",
      progressLabel: projectsActiveCount ? `${projectsActiveCount} activos` : "Sin activos",
      progressCurrent: projectsActiveCount,
      progressTotal: Math.max(projects.length, projectsActiveCount, 1),
      tone: "teal" as const,
      icon: Building2,
    },
  ];

  const dashboardV2Actions = [
    ...pendingConversations.slice(0, 3).map((conversation) => ({
      title: `Responder ${conversation.channel}`,
      relatedTo: conversation.name,
      due: conversation.preview || "Mensaje pendiente",
      priority: "Alta" as const,
      button: "Responder",
      icon: MessageCircle,
      tone: "green" as const,
      href: conversation.to,
    })),
    ...invoicesOverdue.slice(0, 2).map((invoice) => ({
      title: invoice.number ? `Cobrar factura ${invoice.number}` : "Cobrar factura vencida",
      relatedTo: invoice.client_id
        ? clientLabel(clientById.get(String(invoice.client_id)))
        : "Sin cliente",
      due: invoice.due_date ? `Venció ${formatShortDate(invoice.due_date)}` : "Factura vencida",
      priority: "Alta" as const,
      button: "Ver factura",
      icon: DollarSign,
      tone: "red" as const,
      href: "/invoices",
    })),
    ...leadAttentionItems.slice(0, 2).map((item) => ({
      title: "Dar seguimiento a prospecto",
      relatedTo: leadLabel(item.lead),
      due: item.reasons[0] || "Sin seguimiento",
      priority: "Media" as const,
      button: "Abrir lead",
      icon: Users,
      tone: "blue" as const,
      href: "/leads",
    })),
    ...pendingProposalItems.slice(0, 2).map((proposal) => ({
      title: proposal.title || proposal.number || "Propuesta pendiente",
      relatedTo: proposal.clientName || "Sin cliente",
      due: proposal.valid_until
        ? `Vence ${formatShortDate(proposal.valid_until)}`
        : "Esperando respuesta",
      priority: "Media" as const,
      button: "Ver propuesta",
      icon: FileText,
      tone: "purple" as const,
      href: "/proposals",
    })),
    ...projectsAtRisk.slice(0, 2).map((project) => ({
      title: project.name || "Proyecto por revisar",
      relatedTo: "Producción",
      due: project.due_date ? `Entrega ${formatShortDate(project.due_date)}` : "Revisar avance",
      priority: "Alta" as const,
      button: "Ver proyecto",
      icon: Building2,
      tone: "orange" as const,
      href: "/projects",
    })),
    ...overdueTaskItems.slice(0, 2).map((task) => ({
      title: task.title || "Tarea atrasada",
      relatedTo: task.relation || "Sin relación",
      due: task.due_date ? `Venció ${formatShortDate(task.due_date)}` : "Sin fecha",
      priority: "Media" as const,
      button: "Abrir tarea",
      icon: AlertTriangle,
      tone: "orange" as const,
      href: "/tasks",
    })),
  ].slice(0, 8);

  const dashboardRelativeDateLabel = (dateKey: string) => {
    if (dateKey < today) return "Vencida";
    if (dateKey === today) return "Hoy";

    const [year, month, day] = dateKey.split("-").map((value) => Number(value));
    const target = new Date(year, month - 1, day);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - start.getTime()) / 86400000);

    if (diffDays === 1) return "Mañana";
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} días`;

    return formatShortDate(dateKey);
  };

  const dashboardScheduleSubtitle = (item: { kind: string; title: string; dateKey: string }) => {
    if (item.kind === "Calendario")
      return item.dateKey < today ? "Evento pendiente" : "Evento programado";
    if (item.kind === "Tarea") return "Tarea pendiente";
    if (item.kind === "Factura")
      return item.dateKey < today ? "Factura vencida" : "Factura por cobrar";
    if (item.kind === "Propuesta") return "Propuesta pendiente";
    if (item.kind === "Proyecto") return "Entrega de proyecto";
    return item.kind;
  };

  const dashboardV2Schedule: [string, string, string, string][] = agendaItems
    .slice(0, 8)
    .map((item) => [
      dashboardRelativeDateLabel(item.dateKey),
      item.title,
      dashboardScheduleSubtitle(item),
      item.dateKey < today
        ? "red"
        : item.kind === "Factura"
          ? "orange"
          : item.kind === "Propuesta"
            ? "purple"
            : item.kind === "Proyecto"
              ? "teal"
              : "blue",
    ]);

  const dashboardCalendarItems = buildCalendarItems({
    calendarEvents,
    tasks,
    invoices,
    proposals,
    projects,
    estimates,
    tickets,
    subscriptions: calendarSubscriptions,
    contracts: calendarContracts,
    payments: calendarPayments,
  }).sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));

  const collectionTotal = Math.max(receivableTotal + paidRevenue, 1);
  const dashboardV2CollectionRows: [string, string, string, string][] = [
    [
      "Por cobrar",
      moneyBase(receivableTotal),
      dashboardPercent(receivableTotal, collectionTotal),
      "bg-blue-500",
    ],
    [
      "Vencido",
      moneyBase(invoicesOverdue.reduce((s, i) => s + invoiceBaseAmount(i, currencySettings), 0)),
      dashboardPercent(
        invoicesOverdue.reduce((s, i) => s + invoiceBaseAmount(i, currencySettings), 0),
        collectionTotal,
      ),
      "bg-rose-500",
    ],
    [
      "Cobrado",
      moneyBase(paidRevenue),
      dashboardPercent(paidRevenue, collectionTotal),
      "bg-emerald-500",
    ],
  ];

  const dashboardPipelineMax = Math.max(...pipelineStages.map((stage) => stage.value), 1);
  const dashboardV2Pipeline: [string, number, string, number, string][] = pipelineStages.map(
    (stage, index) => [
      stage.stage,
      stage.count,
      moneyBase(stage.value),
      Math.max(4, Math.round((stage.value / dashboardPipelineMax) * 100)),
      index === 0
        ? "bg-blue-200"
        : index === 1
          ? "bg-blue-300"
          : index === 2
            ? "bg-violet-400"
            : index === 3
              ? "bg-orange-300"
              : "bg-emerald-300",
    ],
  );

  const dashboardV2Clients: [string, string, string, string, string][] = [
    ...pendingInvoiceItems.map((invoice) => {
      const name = invoice.clientName || "Cliente sin nombre";
      return [
        dashboardInitials(name),
        name,
        invoice.isOverdue ? "Factura vencida" : "Factura pendiente",
        invoice.status || "Pendiente",
        invoice.isOverdue ? "red" : "orange",
      ] as [string, string, string, string, string];
    }),
    ...pendingProposalItems.map((proposal) => {
      const name = proposal.clientName || "Cliente sin nombre";
      return [
        dashboardInitials(name),
        name,
        "Propuesta sin respuesta",
        proposal.status || "Pendiente",
        "purple",
      ] as [string, string, string, string, string];
    }),
    ...leadAttentionItems.map((item) => {
      const name = leadLabel(item.lead);
      return [
        dashboardInitials(name),
        name,
        item.reasons[0] || "Necesita seguimiento",
        "Revisar",
        "orange",
      ] as [string, string, string, string, string];
    }),
  ].slice(0, 8);

  const dashboardV2LeadAttention: [string, string, string, string, string][] = leadAttentionItems
    .map(
      (item) =>
        [
          leadLabel(item.lead),
          item.reasons.join(" · ") || "Necesita seguimiento",
          item.lead.status || "Revisar",
          item.reasons.length > 1 ? "red" : "orange",
          "/leads",
        ] as [string, string, string, string, string],
    )
    .slice(0, 8);

  const dashboardV2ProjectRisks: [string, string, string, string, string][] = [
    ...overdueCalendarEvents.map(
      (event) =>
        [
          event.title || "Evento pendiente",
          `Debió ocurrir ${formatShortDate(event.start_at)}`,
          event.status || "Programado",
          "orange",
          "/calendar",
        ] as [string, string, string, string, string],
    ),
    ...projectsAtRisk.map(
      (project) =>
        [
          project.name || "Proyecto sin nombre",
          project.due_date ? `Venció ${formatShortDate(project.due_date)}` : "Fecha vencida",
          project.status || "Activo",
          "red",
          "/projects",
        ] as [string, string, string, string, string],
    ),
    ...projects
      .filter((project) => {
        if (!isActiveProjectStatus(project.status)) return false;
        const dueKey = toDateKey(project.due_date);
        return Boolean(dueKey && dueKey >= today && isDateKeyInNextDays(dueKey, 7));
      })
      .map(
        (project) =>
          [
            project.name || "Proyecto sin nombre",
            project.due_date ? `Vence ${formatShortDate(project.due_date)}` : "Próximo a vencer",
            project.status || "Activo",
            "orange",
            "/projects",
          ] as [string, string, string, string, string],
      ),
  ].slice(0, 8);

  const dashboardV2InvoiceRows: [string, string, string, string, string][] = pendingInvoiceItems
    .map(
      (invoice) =>
        [
          invoice.number ? `Factura ${invoice.number}` : "Factura pendiente",
          `${invoice.clientName || "Sin cliente vinculado"} · ${formatMoney(toNumber(invoice.total), invoiceCurrency(invoice))}`,
          invoice.isOverdue ? "Vencida" : invoice.status || "Pendiente",
          invoice.isOverdue ? "red" : "orange",
          "/invoices",
        ] as [string, string, string, string, string],
    )
    .slice(0, 8);

  const dashboardV2ProposalRows: [string, string, string, string, string][] = pendingProposalItems
    .map(
      (proposal) =>
        [
          proposal.title || proposal.number || "Propuesta pendiente",
          `${proposal.clientName || "Sin cliente vinculado"} · ${
            proposal.amount != null
              ? formatMoney(toNumber(proposal.amount), proposal.currency)
              : "Sin monto"
          }`,
          proposal.valid_until
            ? `Vence ${formatShortDate(proposal.valid_until)}`
            : proposal.status || "Pendiente",
          proposal.valid_until && String(toDateKey(proposal.valid_until)) < today
            ? "red"
            : "purple",
          "/proposals",
        ] as [string, string, string, string, string],
    )
    .slice(0, 8);

  const dashboardStatusRows = (
    labels: string[],
    rows: { status: string }[],
    toneForLabel?: (
      label: string,
    ) => "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral",
  ): [
    string,
    number,
    number,
    "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral",
  ][] => {
    const total = Math.max(rows.length, 1);

    return labels.map((label) => {
      const labelKey = normalizeDashboardStatus(label);
      const count = rows.filter((row) => {
        const status = normalizeDashboardStatus(row.status);
        if (labelKey === "not sent")
          return status.includes("not sent") || status.includes("not sent");
        if (labelKey === "open") return status.includes("open") || status.includes("view");
        return status.includes(labelKey);
      }).length;

      return [
        label,
        count,
        Math.round((count / total) * 100),
        toneForLabel?.(label) || statusTone(label),
      ];
    });
  };

  const invoiceDocumentRows = [
    {
      status: "Draft",
      count: invoices.filter((invoice) =>
        normalizeDashboardStatus(invoice.status).includes("draft"),
      ).length,
    },
    {
      status: "Not Sent",
      count: invoices.filter((invoice) =>
        normalizeDashboardStatus(invoice.status).includes("not sent"),
      ).length,
    },
    {
      status: "Unpaid",
      count: invoices.filter(
        (invoice) =>
          isOpenInvoiceStatus(invoice.status) &&
          !isOverdueInvoiceStatus(invoice.status) &&
          !normalizeDashboardStatus(invoice.status).includes("partial"),
      ).length,
    },
    {
      status: "Partially Paid",
      count: invoices.filter((invoice) =>
        normalizeDashboardStatus(invoice.status).includes("partial"),
      ).length,
    },
    { status: "Overdue", count: invoicesOverdue.length },
    {
      status: "Paid",
      count: invoices.filter((invoice) => isPaidInvoiceStatus(invoice.status)).length,
    },
  ];
  const invoiceDocumentTotal = Math.max(
    invoiceDocumentRows.reduce((sum, row) => sum + row.count, 0),
    1,
  );
  const dashboardV2SalesDocumentsOverview = {
    invoices: invoiceDocumentRows.map((row) => [
      row.status,
      row.count,
      Math.round((row.count / invoiceDocumentTotal) * 100),
      statusTone(row.status),
    ]) as [
      string,
      number,
      number,
      "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral",
    ][],
    estimates: dashboardStatusRows(["Draft", "Sent", "Expired", "Declined", "Accepted"], estimates),
    proposals: dashboardStatusRows(
      ["Draft", "Sent", "Open", "Revised", "Declined", "Accepted"],
      proposals,
    ),
    totals: [
      ["Outstanding Invoices", moneyBase(receivableTotal), receivableTotal ? "orange" : "neutral"],
      [
        "Past Due Invoices",
        moneyBase(
          invoicesOverdue.reduce(
            (sum, invoice) => sum + invoiceBaseAmount(invoice, currencySettings),
            0,
          ),
        ),
        invoicesOverdue.length ? "red" : "neutral",
      ],
      ["Paid Invoices", moneyBase(paidRevenue), paidRevenue ? "green" : "neutral"],
    ] as [string, string, "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral"][],
  };

  const openTasks = tasks.filter((task) => !isCompletedTaskStatus(task.status));
  const completedTasks = tasks.filter((task) => isCompletedTaskStatus(task.status));
  const currentUserTaskIds = new Set(
    [user?.id, profile?.user_id, profile?.id].filter(Boolean).map((id) => String(id)),
  );
  const taskAssigneesByTaskId = taskAssignees.reduce((map, row) => {
    const current = map.get(row.task_id) || [];
    current.push(row.user_id);
    map.set(row.task_id, current);
    return map;
  }, new Map<string, string[]>());
  const isTaskAssignedToCurrentUser = (task: TaskRow) => {
    const assignedIds = [task.assigned_to, ...(taskAssigneesByTaskId.get(task.id) || [])].filter(
      Boolean,
    );
    return assignedIds.some((userId) => currentUserTaskIds.has(String(userId)));
  };
  const myOpenTasks = openTasks.filter(isTaskAssignedToCurrentUser);
  const myCompletedTasks = completedTasks.filter(isTaskAssignedToCurrentUser);
  const teamOpenTasksCount = Math.max(openTasks.length - myOpenTasks.length, 0);
  const dashboardV2TodoItems = {
    pending: myOpenTasks.slice(0, 8).map((task) => ({
      id: task.id,
      title: task.title || "Tarea sin título",
      subtitle: task.due_date ? formatShortDate(task.due_date) : "Sin fecha",
      tone: (toDateKey(task.due_date) && String(toDateKey(task.due_date)) < today
        ? "red"
        : "orange") as "red" | "orange",
      href: "/tasks",
      completed: false,
    })),
    completed: myCompletedTasks.slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title || "Tarea completada",
      subtitle: task.due_date ? formatShortDate(task.due_date) : task.status || "Completada",
      tone: "green" as const,
      href: "/tasks",
      completed: true,
    })),
    teamPendingCount: teamOpenTasksCount,
  };

  const dashboardV2ReportSnapshot: [
    string,
    string,
    string,
    "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral",
  ][] = [
    [
      "Ingresos cobrados",
      moneyBase(paidRevenue),
      paidRevenue > 0 ? `Facturas pagadas · ${moneyConvertedHint}` : "Sin pagos registrados",
      paidRevenue > 0 ? "green" : "neutral",
    ],
    [
      "Por cobrar",
      moneyBase(receivableTotal),
      invoicesOverdue.length
        ? `${invoicesOverdue.length} vencidas · ${moneyConvertedHint}`
        : moneyConvertedHint,
      invoicesOverdue.length ? "orange" : "blue",
    ],
    [
      "Pipeline abierto",
      moneyBase(pipelineValue),
      `${openDeals.length} oportunidades · ${moneyConvertedHint}`,
      openDeals.length ? "blue" : "neutral",
    ],
    [
      "Propuestas pendientes",
      String(pendingProposals.length),
      approvedProposalsNoPaymentCount
        ? `${approvedProposalsNoPaymentCount} aprobadas`
        : "Esperando respuesta",
      pendingProposals.length ? "purple" : "neutral",
    ],
  ];

  const dashboardFallbackActivities: [string, string, string, typeof DollarSign][] = [
    ...pendingInvoiceItems
      .slice(0, 3)
      .map(
        (invoice) =>
          [
            invoice.isOverdue
              ? invoice.number
                ? `Factura vencida ${invoice.number}`
                : "Factura vencida"
              : invoice.number
                ? `Factura pendiente ${invoice.number}`
                : "Factura pendiente",
            `${invoice.clientName || "Sin cliente vinculado"} · ${
              invoice.due_date ? formatShortDate(invoice.due_date) : "Sin vencimiento"
            }`,
            formatMoney(toNumber(invoice.total), invoiceCurrency(invoice)),
            DollarSign,
          ] as [string, string, string, typeof DollarSign],
      ),

    ...pendingProposalItems
      .slice(0, 3)
      .map(
        (proposal) =>
          [
            proposal.title || proposal.number || "Propuesta pendiente",
            `${proposal.clientName || "Sin cliente vinculado"} · ${proposal.status || "Pendiente"}`,
            proposal.amount != null
              ? formatMoney(toNumber(proposal.amount), proposal.currency)
              : "",
            FileText,
          ] as [string, string, string, typeof DollarSign],
      ),

    ...overdueTaskItems
      .slice(0, 3)
      .map(
        (task) =>
          [
            task.title || "Tarea pendiente",
            `${task.relation || "Sin relación"} · ${
              task.due_date ? formatShortDate(task.due_date) : "Sin fecha"
            }`,
            "",
            AlertTriangle,
          ] as [string, string, string, typeof DollarSign],
      ),

    ...staleDealItems
      .slice(0, 3)
      .map(
        (deal) =>
          [
            deal.name || "Oportunidad sin nombre",
            `${deal.stage || "Sin etapa"} · ${deal.updated_at ? formatShortDate(deal.updated_at) : "Sin fecha"}`,
            moneyBase(deal.displayValueBase),
            TrendingUp,
          ] as [string, string, string, typeof DollarSign],
      ),
  ];

  const dashboardV2Activities: [string, string, string, typeof DollarSign][] =
    activities.length > 0
      ? activities
          .slice(0, 8)
          .map((activity) => [
            activity.action || "Actividad",
            `${activity.detail || "Movimiento reciente"} · ${activity.time}`,
            "",
            DollarSign,
          ])
      : dashboardFallbackActivities.slice(0, 8);

  const dashboardWorkCenterFullLimit = 24;
  const dashboardCommunicationItems = [
    ...waConversations.map((conversation) => ({
      id: conversation.id,
      channelKey: "whatsapp" as const,
      channel: "WhatsApp",
      name:
        conversation.whatsapp_contacts?.name ||
        conversation.whatsapp_contacts?.phone ||
        "Contacto de WhatsApp",
      preview: conversation.last_message || "Sin mensaje reciente.",
      count: String(Number(conversation.unread_count ?? 0)),
      tone: Number(conversation.unread_count ?? 0) > 0 ? "green" : "neutral",
      href: "/whatsapp-web",
      at: conversation.last_message_at || "",
      status: conversation.status,
    })),
    ...metaConversations.map((conversation) => {
      const platform = String(conversation.platform || "").toLowerCase();
      const isInstagram = platform === "instagram";

      return {
        id: conversation.id,
        channelKey: (isInstagram ? "instagram" : "messenger") as DashboardInboxChannel,
        channel: isInstagram ? "Instagram" : "Messenger",
        name:
          conversation.sender_name ||
          (isInstagram ? "Usuario de Instagram" : "Usuario de Messenger"),
        preview: conversation.last_message_text || "Sin mensaje reciente.",
        count: String(Number(conversation.unread_count ?? 0)),
        tone:
          Number(conversation.unread_count ?? 0) > 0
            ? isInstagram
              ? "purple"
              : "blue"
            : "neutral",
        href: "/whatsapp-web",
        at: conversation.last_message_at || conversation.created_at || "",
        status: conversation.status,
      };
    }),
  ]
    .filter(
      (conversation) =>
        Number(conversation.count) > 0 || conversation.preview !== "Sin mensaje reciente.",
    )
    .sort((a, b) => {
      const at = a.at ? Date.parse(a.at) : 0;
      const bt = b.at ? Date.parse(b.at) : 0;
      return bt - at;
    })
    .slice(0, dashboardWorkCenterFullLimit);
  const dashboardV2Communications: [string, string, string, string, string, string][] =
    dashboardCommunicationItems.map((conversation) => [
      conversation.channel,
      conversation.name,
      conversation.preview,
      conversation.count,
      conversation.tone,
      conversation.href,
    ]);
  const dashboardV2EmailRows: [string, string, string, string, string][] = emailConversations
    .slice()
    .sort((a, b) => {
      if (a.is_read === false && b.is_read !== false) return -1;
      if (a.is_read !== false && b.is_read === false) return 1;
      const at = a.last_message_at ? Date.parse(a.last_message_at) : 0;
      const bt = b.last_message_at ? Date.parse(b.last_message_at) : 0;
      return bt - at;
    })
    .slice(0, dashboardWorkCenterFullLimit)
    .map((conversation) => [
      conversation.subject || "Email sin asunto",
      conversation.last_message_at
        ? `Recibido ${formatShortDate(conversation.last_message_at)}`
        : "Sin fecha reciente",
      conversation.is_read === false ? "No leído" : "Leído",
      conversation.is_read === false ? "blue" : "neutral",
      "/email",
    ]);

  const workCenterTaskItems = openTasks
    .map((task) => {
      const dueKey = toDateKey(task.due_date);
      const overdue = Boolean(dueKey && dueKey < today);
      return {
        id: task.id,
        type: "task" as const,
        title: task.title || "Tarea sin título",
        subtitle: buildRelationLabel({ task, leadById, clientById, projectById }),
        badge: task.status || "Pendiente",
        tone: (overdue
          ? "red"
          : normalizeDashboardStatus(task.priority).includes("high")
            ? "orange"
            : "blue") as "blue" | "orange" | "red",
        href: `/tasks?taskId=${encodeURIComponent(task.id)}`,
        meta: task.due_date ? formatShortDate(task.due_date) : "Sin fecha",
        dueLabel: task.due_date ? formatShortDate(task.due_date) : "Sin fecha",
      };
    })
    .slice(0, dashboardWorkCenterFullLimit);
  const workCenterProjectItems = projects
    .filter((project) => isActiveProjectStatus(project.status))
    .map((project) => {
      const dueKey = toDateKey(project.due_date);
      return {
        id: project.id,
        type: "project" as const,
        title: project.name || "Proyecto sin nombre",
        subtitle: project.due_date
          ? `Entrega ${formatShortDate(project.due_date)}`
          : "Sin fecha de entrega",
        badge: project.status || "Activo",
        tone: (dueKey && dueKey < today ? "red" : "teal") as "red" | "teal",
        href: `/projects?projectId=${encodeURIComponent(project.id)}`,
        dueLabel: project.due_date ? formatShortDate(project.due_date) : "Sin fecha",
      };
    })
    .slice(0, dashboardWorkCenterFullLimit);
  const workCenterTicketItems = tickets
    .filter((ticket) => !normalizeDashboardStatus(ticket.status).includes("closed"))
    .map((ticket) => ({
      id: ticket.id,
      type: "ticket" as const,
      title: ticket.subject || ticket.ticket_number || "Ticket sin asunto",
      subtitle: ticket.resolution_due_at
        ? `Vence ${formatShortDate(ticket.resolution_due_at)}`
        : ticket.ticket_number || "Sin SLA",
      badge: ticket.status || "Open",
      tone: statusTone(ticket.priority || ticket.status),
      href: `/tickets?ticketId=${encodeURIComponent(ticket.id)}`,
      meta: ticket.priority || "Sin prioridad",
      dueLabel: ticket.resolution_due_at ? formatShortDate(ticket.resolution_due_at) : undefined,
    }))
    .slice(0, dashboardWorkCenterFullLimit);
  const workCenterSalesItems = [
    ...pendingInvoiceItems.map((invoice) => ({
      id: invoice.id,
      type: "sales" as const,
      title: invoice.number ? `Factura ${invoice.number}` : "Factura pendiente",
      subtitle: `${invoice.clientName || "Sin cliente vinculado"} · ${formatMoney(toNumber(invoice.total), invoiceCurrency(invoice))}`,
      badge: invoice.isOverdue ? "Vencida" : invoice.status || "Pendiente",
      tone: (invoice.isOverdue ? "red" : "orange") as "red" | "orange",
      href: `/invoices?invoiceId=${encodeURIComponent(invoice.id)}`,
      meta: "invoice",
      dueLabel: invoice.due_date ? formatShortDate(invoice.due_date) : undefined,
    })),
    ...pendingProposalItems.map((proposal) => ({
      id: proposal.id,
      type: "sales" as const,
      title: proposal.title || proposal.number || "Propuesta pendiente",
      subtitle: `${proposal.clientName || "Sin cliente vinculado"} · ${
        proposal.amount != null
          ? formatMoney(toNumber(proposal.amount), proposal.currency)
          : "Sin monto"
      }`,
      badge: proposal.valid_until
        ? `Vence ${formatShortDate(proposal.valid_until)}`
        : proposal.status || "Pendiente",
      tone: (proposal.valid_until && String(toDateKey(proposal.valid_until)) < today
        ? "red"
        : "purple") as "red" | "purple",
      href: `/proposals?proposalId=${encodeURIComponent(proposal.id)}`,
      meta: "proposal",
      dueLabel: proposal.valid_until ? formatShortDate(proposal.valid_until) : undefined,
    })),
    ...estimates
      .filter((estimate) => !normalizeDashboardStatus(estimate.status).includes("converted"))
      .map((estimate) => ({
        id: estimate.id,
        type: "sales" as const,
        title: estimate.number
          ? `Cotización #${estimate.number}`
          : estimate.title || "Cotización pendiente",
        subtitle: `${estimate.title || "Sin título"} · ${formatMoney(toNumber(estimate.total), estimate.currency)}`,
        badge: estimate.expiry_date
          ? `Vence ${formatShortDate(estimate.expiry_date)}`
          : estimate.status || "Pendiente",
        tone: (estimate.expiry_date && String(toDateKey(estimate.expiry_date)) < today
          ? "red"
          : "blue") as "red" | "blue",
        href: `/estimates?estimateId=${encodeURIComponent(estimate.id)}`,
        meta: "estimate",
        dueLabel: estimate.expiry_date ? formatShortDate(estimate.expiry_date) : undefined,
      })),
  ].slice(0, dashboardWorkCenterFullLimit);
  const dashboardV2WorkCenter = {
    tasks: workCenterTaskItems,
    projects: workCenterProjectItems,
    tickets: workCenterTicketItems,
    inbox: dashboardCommunicationItems.map((conversation) => ({
      id: conversation.id,
      type: "inbox" as const,
      title: `${conversation.channel}: ${conversation.name}`,
      subtitle: conversation.preview,
      badge: Number(conversation.count) > 0 ? `${conversation.count} nuevo` : "Abierto",
      tone: conversation.tone as
        | "blue"
        | "green"
        | "orange"
        | "red"
        | "purple"
        | "teal"
        | "neutral",
      href: conversation.href,
      meta: conversation.channelKey,
      dueLabel: conversation.at ? formatShortDate(conversation.at) : undefined,
    })),
    calendar: dashboardCalendarItems.slice(0, dashboardWorkCenterFullLimit).map((item) => ({
      id: item.id,
      type: "calendar" as const,
      title: item.title,
      subtitle: item.context || item.description || "Agenda",
      badge: dashboardRelativeDateLabel(toDateKey(item.start) || today),
      tone: dashboardToneFromCalendarTone(item.tone),
      href: item.href,
      meta: item.context || undefined,
      dueLabel: formatShortDate(item.start),
    })),
    sales: workCenterSalesItems,
  };

  const updateDashboardTaskStatus = async (taskId: string, status: "Completed" | "In Progress") => {
    if (!profile?.company_id) return;

    // Supabase generated types in this project do not cover every CRM table used here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
      .eq("company_id", profile.company_id);

    if (updateError) throw updateError;
    setTaskRefreshKey((key) => key + 1);
  };

  const sendDashboardEmailReply = async () => {
    if (!selectedDashboardInbox || selectedDashboardInbox.channel !== "email") return;
    const to = dashboardEmailTo.trim();
    const body = dashboardEmailReply.trim();
    if (!to || !body || dashboardEmailSending) return false;

    setDashboardEmailSending(true);
    setDashboardEmailSendError(null);
    const { data, error: sendError } = await supabase.functions.invoke("gmail-send-message", {
      body: {
        to,
        subject: selectedDashboardInbox.title.startsWith("Re:")
          ? selectedDashboardInbox.title
          : `Re: ${selectedDashboardInbox.title}`.trim(),
        body,
        attachments: [],
        conversation_id: selectedDashboardInbox.id,
      },
    });
    setDashboardEmailSending(false);

    const resultError = (data as any)?.error || sendError;
    if (resultError) {
      setDashboardEmailSendError(
        String(
          (data as any)?.error || (sendError as any)?.message || "No se pudo enviar el email.",
        ),
      );
      return false;
    }

    setDashboardEmailReply("");
    setDashboardInboxRefreshKey((key) => key + 1);
    return true;
  };

  const convertDashboardEstimateToInvoice = async () => {
    if (!selectedDashboardEstimate?.id || dashboardEstimateConverting) return;

    setDashboardEstimateConverting(true);
    setDashboardEstimateConversionMessage(null);
    setDashboardEstimateConversionError(null);

    const { data, error: convertError } = await (supabase as any).rpc(
      "convert_estimate_to_invoice",
      {
        p_estimate_id: selectedDashboardEstimate.id,
      },
    );

    setDashboardEstimateConverting(false);

    if (convertError) {
      setDashboardEstimateConversionError(
        convertError.message || "No se pudo convertir la cotización.",
      );
      return;
    }

    const first = Array.isArray(data) ? data[0] : data;
    setDashboardEstimateConversionMessage(
      first?.created
        ? "Cotización convertida en factura."
        : "Ya existe una factura para esta cotización.",
    );
    setSelectedDashboardEstimate((current) =>
      current ? { ...current, status: "Converted", updated_at: new Date().toISOString() } : current,
    );
    setEstimates((current) =>
      current.map((estimate) =>
        estimate.id === selectedDashboardEstimate.id
          ? { ...estimate, status: "Converted", updated_at: new Date().toISOString() }
          : estimate,
      ),
    );
    setSalesRefreshKey((key) => key + 1);
  };

  const completeDashboardTask = (taskId: string) => updateDashboardTaskStatus(taskId, "Completed");
  const startDashboardTask = (taskId: string) => updateDashboardTaskStatus(taskId, "In Progress");
  const openDashboardWorkItem = (item: DashboardInlineWorkItem) => {
    if (item.type === "calendar") {
      const calendarItem = dashboardCalendarItems.find((row) => row.id === item.id);
      if (!calendarItem) return false;
      setSelectedDashboardCalendarItem(calendarItem);
      return true;
    }
    if (item.type === "inbox") {
      const channel = item.meta as DashboardInboxChannel | undefined;
      if (!item.id || !channel) return false;
      const conversation = dashboardCommunicationItems.find(
        (row) => row.id === item.id && row.channelKey === channel,
      );
      setSelectedDashboardInbox({
        id: item.id,
        channel,
        title: conversation?.name || item.title,
        subtitle: conversation?.preview || item.subtitle,
        status: conversation?.status,
        unreadCount: Number(conversation?.count || 0),
        href: conversation?.href || item.href,
      });
      return true;
    }
    if (item.type === "sales") {
      if (item.meta === "invoice" && item.id) {
        const invoice = invoices.find((row) => row.id === item.id);
        if (!invoice) return false;
        setSelectedDashboardInvoice(invoice);
        return true;
      }
      if (item.meta === "proposal" && item.id) {
        const proposal = proposals.find((row) => row.id === item.id);
        if (!proposal) return false;
        setSelectedDashboardProposal(proposal);
        return true;
      }
      if (item.meta === "estimate" && item.id) {
        const estimate = estimates.find((row) => row.id === item.id);
        if (!estimate) return false;
        setDashboardEstimateConversionMessage(null);
        setDashboardEstimateConversionError(null);
        setSelectedDashboardEstimate(estimate);
        return true;
      }
      setSelectedDashboardInlineItem(item);
      return true;
    }
    if (!item.id) return false;
    if (item.type === "task") {
      const task = tasks.find((row) => row.id === item.id);
      if (!task) return false;
      setSelectedDashboardTask(task);
      return true;
    }
    if (item.type === "project") {
      const project = projects.find((row) => row.id === item.id);
      if (!project) return false;
      setSelectedDashboardProject(project);
      return true;
    }
    if (item.type === "ticket") {
      const ticket = tickets.find((row) => row.id === item.id);
      if (!ticket) return false;
      setSelectedDashboardTicket(ticket);
      return true;
    }
    return false;
  };
  const selectedProjectTasks = selectedDashboardProject
    ? tasks.filter((task) => task.related_project_id === selectedDashboardProject.id)
    : [];
  const selectedProjectStats = (() => {
    if (!selectedDashboardProject) {
      return { total: 0, completed: 0, abiertas: 0, overdue: 0, pct: 0 };
    }
    const total = selectedProjectTasks.length;
    const completed = selectedProjectTasks.filter((task) =>
      isCompletedTaskStatus(task.status),
    ).length;
    const abiertas = Math.max(0, total - completed);
    const overdue = selectedProjectTasks.filter((task) => {
      if (isCompletedTaskStatus(task.status)) return false;
      const dueKey = toDateKey(task.due_date);
      return Boolean(dueKey && dueKey < today);
    }).length;
    const projectProgress = selectedDashboardProject.progress;
    const pct =
      total > 0
        ? Math.round((completed / total) * 100)
        : typeof projectProgress === "number"
          ? Math.min(100, Math.max(0, Math.round(projectProgress)))
          : 0;
    return { total, completed, abiertas, overdue, pct };
  })();
  const selectedProjectMeta = selectedDashboardProject
    ? {
        stats: selectedProjectStats,
        isOverdue: Boolean(
          selectedDashboardProject.due_date &&
          isActiveProjectStatus(selectedDashboardProject.status) &&
          String(toDateKey(selectedDashboardProject.due_date)) < today,
        ),
        hasRisk: false,
      }
    : null;
  if (selectedProjectMeta) {
    selectedProjectMeta.hasRisk = selectedProjectMeta.isOverdue || selectedProjectStats.overdue > 0;
  }
  const selectedProjectClientName = selectedDashboardProject?.client_id
    ? clientLabel(clientById.get(String(selectedDashboardProject.client_id)))
    : "—";
  const selectedProjectProductName = selectedDashboardProject?.product_id
    ? productById.get(String(selectedDashboardProject.product_id))?.name || "—"
    : "—";
  const selectedProjectDealName = selectedDashboardProject?.deal_id
    ? deals.find((deal) => deal.id === selectedDashboardProject.deal_id)?.name || "—"
    : "—";
  const selectedProjectLeadName = selectedDashboardProject?.lead_id
    ? leadLabel(
        leadById.get(String(selectedDashboardProject.lead_id)) || {
          first_name: "",
          last_name: "",
          company_name: null,
        },
      )
    : "—";
  const selectedProjectManagerProfile = selectedDashboardProject?.manager
    ? profileById.get(String(selectedDashboardProject.manager)) ||
      profileByUserId.get(String(selectedDashboardProject.manager))
    : null;
  const selectedProjectManagerName =
    selectedProjectManagerProfile?.full_name ||
    selectedProjectManagerProfile?.email ||
    selectedDashboardProject?.manager ||
    "—";
  const selectedInvoiceData = readDashboardObject(selectedDashboardInvoice?.invoice_data);
  const selectedInvoiceClient = selectedDashboardInvoice?.client_id
    ? clientById.get(String(selectedDashboardInvoice.client_id))
    : null;
  const selectedInvoiceProduct = selectedDashboardInvoice?.product_id
    ? productById.get(String(selectedDashboardInvoice.product_id))
    : null;
  const selectedInvoiceProposal = selectedDashboardInvoice?.proposal_id
    ? proposals.find((proposal) => proposal.id === selectedDashboardInvoice.proposal_id)
    : null;
  const selectedInvoiceCurrency = selectedDashboardInvoice
    ? getInvoiceCurrency(selectedDashboardInvoice as any, {
        proposalCurrency: selectedInvoiceProposal?.currency,
      })
    : "USD";
  const selectedInvoicePublicUrl =
    selectedDashboardInvoice?.public_token && typeof window !== "undefined"
      ? `${window.location.origin}/invoice/public/${selectedDashboardInvoice.public_token}`
      : null;
  const selectedInvoiceClientLabel =
    selectedInvoiceClient?.company_name ||
    readDashboardText(selectedInvoiceData.clientCompany) ||
    readDashboardText(selectedInvoiceData.clientName) ||
    selectedInvoiceClient?.contact_person ||
    "Cliente sin nombre";
  const selectedInvoiceProductLabel =
    selectedInvoiceProduct?.name ||
    readDashboardText(selectedInvoiceData.productName) ||
    selectedInvoiceProposal?.title ||
    "—";
  const selectedInvoiceSummaryFields = selectedDashboardInvoice
    ? [
        { label: "Número", value: selectedDashboardInvoice.number || "—", mono: true },
        { label: "Cliente", value: selectedInvoiceClientLabel },
        {
          label: "Contacto",
          value:
            readDashboardText(selectedInvoiceData.clientName) ||
            selectedInvoiceClient?.contact_person ||
            readDashboardText(selectedInvoiceData.clientEmail) ||
            null,
        },
        { label: "Producto / servicio", value: selectedInvoiceProductLabel },
        {
          label: "Propuesta",
          value: selectedInvoiceProposal
            ? `${selectedInvoiceProposal.number || "Propuesta"}${
                selectedInvoiceProposal.title ? ` · ${selectedInvoiceProposal.title}` : ""
              }`
            : null,
        },
        { label: "Fecha emitida", value: formatInvoiceDate(selectedDashboardInvoice.date_issued) },
        { label: "Vencimiento", value: formatInvoiceDueDate(selectedDashboardInvoice.due_date) },
        { label: "Enviada", value: formatDashboardDateTime(selectedDashboardInvoice.sent_at) },
        { label: "Vista", value: formatDashboardDateTime(selectedDashboardInvoice.viewed_at) },
        { label: "Pagada", value: formatDashboardDateTime(selectedDashboardInvoice.paid_at) },
        { label: "Token público", value: selectedDashboardInvoice.public_token, mono: true },
      ]
    : [];
  const selectedInvoiceIssuerFields = [
    { label: "Nombre", value: readDashboardText(selectedInvoiceData.issuerName) },
    { label: "ID fiscal", value: readDashboardText(selectedInvoiceData.issuerTaxId) },
    { label: "Correo", value: readDashboardText(selectedInvoiceData.issuerEmail) },
    { label: "Teléfono", value: readDashboardText(selectedInvoiceData.issuerPhone) },
    { label: "Dirección", value: readDashboardText(selectedInvoiceData.issuerAddress) },
    { label: "Sitio web", value: readDashboardText(selectedInvoiceData.issuerWebsite) },
  ];
  const selectedInvoiceClientFields = selectedDashboardInvoice
    ? [
        {
          label: "Nombre",
          value:
            readDashboardText(selectedInvoiceData.clientName) ||
            selectedInvoiceClient?.contact_person,
        },
        {
          label: "Empresa",
          value:
            readDashboardText(selectedInvoiceData.clientCompany) ||
            selectedInvoiceClient?.company_name ||
            readDashboardText(selectedInvoiceData.clientName) ||
            selectedInvoiceClient?.contact_person,
        },
        { label: "Correo", value: readDashboardText(selectedInvoiceData.clientEmail) },
        { label: "Teléfono", value: readDashboardText(selectedInvoiceData.clientPhone) },
        { label: "ID fiscal", value: readDashboardText(selectedInvoiceData.clientTaxId) },
        { label: "Dirección", value: readDashboardText(selectedInvoiceData.clientAddress) },
        { label: "Producto / servicio", value: selectedInvoiceProductLabel },
      ]
    : [];
  const selectedInvoiceActivity = selectedDashboardInvoice
    ? ([
        {
          key: "created",
          title: "Factura creada",
          description: selectedDashboardInvoice.number || "Factura",
          rawDate: selectedDashboardInvoice.created_at,
        },
        {
          key: "updated",
          title: "Factura actualizada",
          description: selectedDashboardInvoice.number || "Factura",
          rawDate:
            selectedDashboardInvoice.updated_at &&
            selectedDashboardInvoice.updated_at !== selectedDashboardInvoice.created_at
              ? selectedDashboardInvoice.updated_at
              : null,
        },
        {
          key: "sent",
          title: "Factura enviada",
          description: "La factura tiene fecha de envío registrada.",
          rawDate: selectedDashboardInvoice.sent_at,
        },
        {
          key: "viewed",
          title: "Factura vista",
          description: "La factura tiene fecha de visualización registrada.",
          rawDate: selectedDashboardInvoice.viewed_at,
        },
        {
          key: "paid",
          title: "Factura pagada",
          description: "La factura tiene fecha de pago registrada.",
          rawDate: selectedDashboardInvoice.paid_at,
        },
      ]
        .filter((event) => event.rawDate)
        .sort(
          (a, b) => new Date(String(b.rawDate)).getTime() - new Date(String(a.rawDate)).getTime(),
        )
        .map((event) => ({
          key: event.key,
          title: event.title,
          description: event.description,
          date: formatDashboardDateTime(event.rawDate),
        })) as InvoiceActivityEvent[])
    : [];
  const selectedProposalClientName = selectedDashboardProposal?.client_id
    ? clientLabel(clientById.get(String(selectedDashboardProposal.client_id)))
    : "—";
  const selectedProposalProductName = selectedDashboardProposal?.product_id
    ? productById.get(String(selectedDashboardProposal.product_id))?.name || "—"
    : "—";
  const selectedEstimateClientName = selectedDashboardEstimate?.client_id
    ? clientLabel(clientById.get(String(selectedDashboardEstimate.client_id)))
    : "—";
  const selectedEstimateProjectName = selectedDashboardEstimate?.project_id
    ? projectById.get(String(selectedDashboardEstimate.project_id))?.name || "—"
    : "—";
  const selectedEstimateDealName = selectedDashboardEstimate?.deal_id
    ? deals.find((deal) => deal.id === selectedDashboardEstimate.deal_id)?.name || "—"
    : "—";
  const selectedTicketClientName = selectedDashboardTicket?.client_id
    ? clientLabel(clientById.get(String(selectedDashboardTicket.client_id)))
    : t("tickets.noClient");
  const selectedTicketProjectName = selectedDashboardTicket?.project_id
    ? projectById.get(String(selectedDashboardTicket.project_id))?.name || t("tickets.noProject")
    : t("tickets.noProject");
  const selectedTicketAssignedProfile = selectedDashboardTicket?.assigned_to
    ? profileById.get(String(selectedDashboardTicket.assigned_to)) ||
      profileByUserId.get(String(selectedDashboardTicket.assigned_to))
    : null;
  const selectedTicketAssignedName =
    selectedTicketAssignedProfile?.full_name ||
    selectedTicketAssignedProfile?.email ||
    t("tickets.unassigned");
  const ticketLabelFor = (value: string) => {
    const key = statusKey(value);
    const label = t(key);
    return label === key ? value : label;
  };
  const updateDashboardTicketStatus = async (ticket: TicketRow, status: string) => {
    if (!profile?.company_id) return;
    const { error: updateError, data } = await (supabase as any)
      .from("tickets")
      .update({ status })
      .eq("id", ticket.id)
      .eq("company_id", profile.company_id)
      .select("*")
      .single();

    if (updateError) throw updateError;
    const normalized = normalizeDashboardTicket(data || { ...ticket, status }, profile.company_id);
    setTickets((current) => current.map((item) => (item.id === ticket.id ? normalized : item)));
    setSelectedDashboardTicket((current) => (current?.id === ticket.id ? normalized : current));
  };
  const addDashboardTicketMessage = async () => {
    if (!selectedDashboardTicket || !profile?.company_id || !ticketReply.trim()) return;
    const { error: insertError } = await (supabase as any).from("ticket_messages").insert({
      ticket_id: selectedDashboardTicket.id,
      company_id: profile.company_id,
      author_type: "staff",
      author_profile_id: profile.id || null,
      body: ticketReply.trim(),
      is_internal: ticketReplyInternal,
    });

    if (insertError) throw insertError;
    setTicketReply("");
    setTicketReplyInternal(false);

    const { data } = await (supabase as any)
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", selectedDashboardTicket.id)
      .order("created_at", { ascending: true });
    setSelectedTicketMessages((data || []) as TicketMessageRow[]);

    const now = new Date().toISOString();
    const updated = normalizeDashboardTicket(
      { ...selectedDashboardTicket, last_reply_at: now, updated_at: now },
      profile.company_id,
    );
    setTickets((current) =>
      current.map((ticket) => (ticket.id === selectedDashboardTicket.id ? updated : ticket)),
    );
    setSelectedDashboardTicket(updated);
  };
  const overdueInvoiceTotal = invoicesOverdue.reduce(
    (sum, invoice) => sum + invoiceBaseAmount(invoice, currencySettings),
    0,
  );
  const pendingProposalTotal = pendingProposalItems.reduce(
    (sum, proposal) => sum + proposalBaseAmount(proposal, currencySettings),
    0,
  );
  const pendingEventCount = overdueCalendarEvents.length + upcomingCalendarEvents.length;
  const percentNumber = (value: number, total: number) =>
    Number(dashboardPercent(value, Math.max(total, 1)).replace("%", ""));
  const latestPendingConversation = pendingConversations[0];
  const nextAgendaItem = agendaItems[0];
  const mobileSummarySlideCandidates: Array<MobileSummarySlide | null> = [
    invoicesOverdue.length > 0
      ? {
          type: "invoice_overdue",
          title: "Facturas vencidas",
          value: String(invoicesOverdue.length),
          detail: moneyBase(overdueInvoiceTotal),
          href: "/invoices",
          tone: "red",
          ctaLabel: "Ver vencidas",
          chart: {
            kind: "percent",
            showPercentLabel: false,
          },
          previewItems: pendingInvoiceItems[0]
            ? [
                {
                  label: pendingInvoiceItems[0].number
                    ? `Factura ${pendingInvoiceItems[0].number}`
                    : "Factura pendiente",
                  value: pendingInvoiceItems[0].clientName || "Sin cliente vinculado",
                  meta: formatMoney(
                    toNumber(pendingInvoiceItems[0].total),
                    invoiceCurrency(pendingInvoiceItems[0]),
                  ),
                  tone: pendingInvoiceItems[0].isOverdue ? "red" : "orange",
                },
              ]
            : [],
          percent: percentNumber(overdueInvoiceTotal, collectionTotal),
        }
      : null,
    invoicesPending.length > 0 || receivableTotal > 0
      ? {
          type: "receivable",
          title: "Facturas por cobrar",
          value: String(invoicesPending.length),
          detail: moneyBase(receivableTotal),
          href: "/invoices",
          tone: "blue",
          ctaLabel: "Ver facturas",
          chart: {
            kind: "bars",
            segments: [
              {
                label: "Cobrado",
                value: moneyBase(paidRevenue),
                percent: percentNumber(paidRevenue, collectionTotal),
                tone: "green",
              },
              {
                label: "Pendiente",
                value: moneyBase(receivableTotal),
                percent: percentNumber(receivableTotal, collectionTotal),
                tone: "blue",
              },
              {
                label: "Vencido",
                value: moneyBase(overdueInvoiceTotal),
                percent: percentNumber(overdueInvoiceTotal, collectionTotal),
                tone: "red",
              },
            ],
          },
          percent: percentNumber(receivableTotal, collectionTotal),
        }
      : null,
    leadAttentionItems.length > 0
      ? {
          type: "leads",
          title: "Leads sin seguimiento",
          value: String(leadAttentionItems.length),
          detail: "Sin seguimiento +72h",
          href: "/leads",
          tone: "orange",
          ctaLabel: "Ver leads",
          chart: { kind: "list" },
          previewItems: leadAttentionItems.slice(0, 2).map((item) => ({
            label: leadLabel(item.lead),
            value: item.reasons[0] || "Sin seguimiento",
            meta: item.lead.status || undefined,
            tone: item.reasons.length > 1 ? "red" : "orange",
          })),
          percent: percentNumber(leadAttentionItems.length, leadsActiveCount),
        }
      : null,
    pendingProposals.length > 0
      ? {
          type: "proposals",
          title: "Propuestas pendientes",
          value: String(pendingProposals.length),
          detail: moneyBase(pendingProposalTotal),
          href: "/proposals",
          tone: "purple",
          ctaLabel: "Ver propuestas",
          chart: { kind: "list" },
          previewItems: pendingProposalItems[0]
            ? [
                {
                  label:
                    pendingProposalItems[0].title || pendingProposalItems[0].number || "Propuesta",
                  value: pendingProposalItems[0].clientName || "Sin cliente vinculado",
                  meta:
                    pendingProposalItems[0].amount != null
                      ? formatMoney(
                          toNumber(pendingProposalItems[0].amount),
                          pendingProposalItems[0].currency,
                        )
                      : undefined,
                  tone: "purple",
                },
              ]
            : [],
          percent: percentNumber(pendingProposals.length, proposals.length),
        }
      : null,
    overdueTasks.length > 0
      ? {
          type: "tasks",
          title: "Tareas vencidas",
          value: String(overdueTasks.length),
          detail: `${openTasksCount} pendientes`,
          href: "/tasks",
          tone: "orange",
          ctaLabel: "Ver tareas",
          chart: { kind: "list" },
          previewItems: overdueTaskItems.slice(0, 2).map((task) => ({
            label: task.title || "Tarea sin título",
            value: task.relation || "Sin relación",
            meta: task.due_date ? formatShortDate(task.due_date) : undefined,
            tone: "orange",
          })),
          percent: percentNumber(overdueTasks.length, openTasksCount),
        }
      : null,
    projectsAtRisk.length > 0
      ? {
          type: "projects",
          title: "Proyectos en riesgo",
          value: String(projectsAtRisk.length),
          detail: `${projectsActiveCount} activos`,
          href: "/projects",
          tone: "teal",
          ctaLabel: "Ver proyectos",
          chart: { kind: "timeline" },
          previewItems: projectsAtRisk.slice(0, 2).map((project) => ({
            label: project.name || "Proyecto sin nombre",
            value: project.due_date ? formatShortDate(project.due_date) : "Sin fecha",
            meta: project.status || undefined,
            tone: "teal",
          })),
          percent: percentNumber(projectsAtRisk.length, projectsActiveCount),
        }
      : null,
    pendingEventCount > 0
      ? {
          type: "calendar",
          title: "Eventos pendientes",
          value: String(pendingEventCount),
          detail: `${agendaToday.length} hoy`,
          href: "/calendar",
          tone: "blue",
          ctaLabel: "Abrir calendario",
          chart: { kind: "timeline" },
          previewItems: nextAgendaItem
            ? [
                {
                  label: dashboardRelativeDateLabel(nextAgendaItem.dateKey),
                  value: nextAgendaItem.title,
                  meta: nextAgendaItem.kind,
                  tone: "blue",
                },
              ]
            : [],
          percent: percentNumber(agendaToday.length, pendingEventCount),
        }
      : null,
    inboxPendingTotal > 0
      ? {
          type: "messages",
          title: "Meta Inbox pendiente",
          value: String(inboxPendingTotal),
          detail: `WA ${waOpen} · IG ${instagramOpen} · Messenger ${messengerOpen}`,
          href: "/whatsapp-web",
          tone: "red",
          ctaLabel: "Abrir Meta Inbox",
          chart: { kind: "chat" },
          previewItems: latestPendingConversation
            ? [
                {
                  label: latestPendingConversation.channel,
                  value: latestPendingConversation.preview,
                  meta: latestPendingConversation.name,
                  tone: latestPendingConversation.channel === "Instagram" ? "purple" : "blue",
                },
              ]
            : [],
          percent: percentNumber(inboxPendingTotal, inboxConversationTotal),
        }
      : null,
  ];
  const actionableMobileSummarySlides = mobileSummarySlideCandidates.filter(
    (slide): slide is MobileSummarySlide => Boolean(slide),
  );
  const mobileSummarySlides: MobileSummarySlide[] =
    actionableMobileSummarySlides.length > 0
      ? actionableMobileSummarySlides
      : [
          {
            type: "tasks",
            title: "Todo está en orden",
            detail: "No hay pendientes importantes por atender en este momento.",
            tone: "green",
            chart: { kind: "none" },
          },
        ];

  const dashboardSharedProps = {
    kpis: dashboardV2Kpis,
    actions: dashboardV2Actions,
    schedule: dashboardV2Schedule,
    collectionRows: dashboardV2CollectionRows,
    pipeline: dashboardV2Pipeline,
    clients: dashboardV2Clients,
    activities: dashboardV2Activities,
    communications: dashboardV2Communications,
    emailRows: dashboardV2EmailRows,
    leadsAttention: dashboardV2LeadAttention,
    projectRisks: dashboardV2ProjectRisks,
    invoiceRows: dashboardV2InvoiceRows,
    proposalRows: dashboardV2ProposalRows,
    reportSnapshot: dashboardV2ReportSnapshot,
    salesDocumentsOverview: dashboardV2SalesDocumentsOverview,
    workCenter: dashboardV2WorkCenter,
    todoItems: dashboardV2TodoItems,
    calendarItems: dashboardCalendarItems,
    onCalendarRefresh: () => setCalendarRefreshKey((key) => key + 1),
    onTaskComplete: completeDashboardTask,
    onTaskStart: startDashboardTask,
    summarySlides: mobileSummarySlides,
    todayLabel: dashboardTodayLabel,
    collectionPeriodLabel: "Este mes⌄",
    pipelinePeriodLabel: "Pipeline⌄",
  };

  return (
    <>
      <div className="min-h-screen bg-white min-[900px]:hidden">
        <DashboardMobileView
          {...dashboardSharedProps}
          error={error}
          userName={profile?.full_name || null}
          onWorkItemOpen={openDashboardWorkItem}
        />
      </div>
      <TaskDetailDialog
        open={!!selectedDashboardTask}
        onOpenChange={(open) => !open && setSelectedDashboardTask(null)}
        task={selectedDashboardTask}
        profiles={profileSummaries}
        canEdit
        onUpdateTask={async (taskId, patch) => {
          if (!profile?.company_id) return;
          const { error: updateError } = await (supabase as any)
            .from("tasks")
            .update(patch)
            .eq("id", taskId)
            .eq("company_id", profile.company_id);
          if (updateError) throw updateError;
          setTasks((current) =>
            current.map((task) => (task.id === taskId ? ({ ...task, ...patch } as TaskRow) : task)),
          );
          setSelectedDashboardTask((current) =>
            current?.id === taskId ? ({ ...current, ...patch } as TaskRow) : current,
          );
        }}
        onAssigneesChanged={() => setTaskRefreshKey((key) => key + 1)}
        onComplete={async () => {
          if (!selectedDashboardTask?.id) return;
          await updateDashboardTaskStatus(selectedDashboardTask.id, "Completed");
          setSelectedDashboardTask((current) =>
            current ? { ...current, status: "Completed" } : current,
          );
        }}
        onSetInProgress={async () => {
          if (!selectedDashboardTask?.id) return;
          await updateDashboardTaskStatus(selectedDashboardTask.id, "In Progress");
          setSelectedDashboardTask((current) =>
            current ? { ...current, status: "In Progress" } : current,
          );
        }}
      />
      {selectedDashboardProject && selectedProjectMeta ? (
        <Suspense fallback={null}>
          <ProjectWorkspaceDialog
            project={selectedDashboardProject}
            meta={selectedProjectMeta}
            tasks={selectedProjectTasks}
            clientName={selectedProjectClientName}
            productName={selectedProjectProductName}
            dealName={selectedProjectDealName}
            leadName={selectedProjectLeadName}
            managerName={selectedProjectManagerName}
            canEdit={false}
            canDelete={false}
            canCreateTask={false}
            canEditTasks
            onClose={() => setSelectedDashboardProject(null)}
            onEdit={() => undefined}
            onDelete={() => undefined}
            onCreateTask={() => undefined}
            onCompleteTask={async (task) => {
              await updateDashboardTaskStatus(task.id, "Completed");
              setTasks((current) =>
                current.map((row) =>
                  row.id === task.id
                    ? { ...row, status: "Completed", updated_at: new Date().toISOString() }
                    : row,
                ),
              );
            }}
          />
        </Suspense>
      ) : null}
      {selectedDashboardTicket ? (
        <Suspense fallback={null}>
          <TicketDetailDialog
            ticket={selectedDashboardTicket}
            messages={selectedTicketMessages}
            clientName={selectedTicketClientName}
            projectName={selectedTicketProjectName}
            assignedName={selectedTicketAssignedName}
            profileById={profileById}
            reply={ticketReply}
            replyInternal={ticketReplyInternal}
            labelFor={ticketLabelFor}
            t={t}
            canEdit={false}
            onClose={() => setSelectedDashboardTicket(null)}
            onStatusChange={updateDashboardTicketStatus}
            onEdit={() => undefined}
            onReplyChange={setTicketReply}
            onReplyInternalChange={setTicketReplyInternal}
            onAddMessage={addDashboardTicketMessage}
          />
        </Suspense>
      ) : null}
      <DashboardInlineWorkItemDialog
        item={selectedDashboardInlineItem}
        onClose={() => setSelectedDashboardInlineItem(null)}
      />
      <CalendarEventDetailDialog
        event={selectedDashboardCalendarItem}
        onClose={() => setSelectedDashboardCalendarItem(null)}
      />
      <DashboardInvoiceDetailDialog
        invoice={selectedDashboardInvoice}
        items={dashboardInvoiceItems}
        itemsLoading={dashboardInvoiceItemsLoading}
        itemsError={dashboardInvoiceItemsError}
        summaryFields={selectedInvoiceSummaryFields}
        issuerFields={selectedInvoiceIssuerFields}
        clientFields={selectedInvoiceClientFields}
        activity={selectedInvoiceActivity}
        currency={selectedInvoiceCurrency}
        publicUrl={selectedInvoicePublicUrl}
        onClose={() => {
          setSelectedDashboardInvoice(null);
          setDashboardInvoiceItems([]);
          setDashboardInvoiceItemsError(null);
        }}
      />
      <DashboardProposalDetailDialog
        proposal={selectedDashboardProposal}
        clientName={selectedProposalClientName}
        productName={selectedProposalProductName}
        onClose={() => setSelectedDashboardProposal(null)}
      />
      <DashboardEstimateDetailDialog
        estimate={selectedDashboardEstimate}
        clientName={selectedEstimateClientName}
        projectName={selectedEstimateProjectName}
        dealName={selectedEstimateDealName}
        converting={dashboardEstimateConverting}
        conversionMessage={dashboardEstimateConversionMessage}
        conversionError={dashboardEstimateConversionError}
        onClose={() => {
          setSelectedDashboardEstimate(null);
          setDashboardEstimateConversionMessage(null);
          setDashboardEstimateConversionError(null);
        }}
        onConvert={convertDashboardEstimateToInvoice}
      />
      <DashboardInboxDialog
        selection={selectedDashboardInbox}
        messages={dashboardInboxMessages}
        loading={dashboardInboxLoading}
        error={dashboardInboxError}
        emailTo={dashboardEmailTo}
        emailReply={dashboardEmailReply}
        emailSending={dashboardEmailSending}
        emailSendError={dashboardEmailSendError}
        onClose={() => {
          setSelectedDashboardInbox(null);
          setDashboardInboxMessages([]);
          setDashboardInboxError(null);
          setDashboardEmailTo("");
          setDashboardEmailReply("");
          setDashboardEmailSendError(null);
        }}
        onEmailToChange={setDashboardEmailTo}
        onEmailReplyChange={setDashboardEmailReply}
        onSendEmail={sendDashboardEmailReply}
      />
      <div className="hidden min-[900px]:block">
        <DashboardV2 {...dashboardSharedProps} />
      </div>
    </>
  );

  return (
    <div className="bg-[#f6f8fb] text-[#111827] p-4 sm:p-6 space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.04em]">{t("nav.dashboard")}</h1>
          <p className="mt-1 text-[13px] font-medium text-[#667085]">
            Bienvenido, <strong className="text-[#111827]">{profile?.full_name || "—"}</strong>.
            Este es tu resumen comercial y operativo de hoy.
          </p>
          <p className="mt-2 text-[13px] font-semibold text-[#475467]">
            Hoy tienes <strong className="text-[#111827]">{newLeadsToday}</strong> leads nuevos,{" "}
            <strong className="text-[#111827]">{pendingProposals.length}</strong> propuestas
            pendientes, <strong className="text-[#111827]">{invoicesPending.length}</strong>{" "}
            facturas por cobrar y <strong className="text-[#111827]">{upcomingTasksCount}</strong>{" "}
            tareas próximas.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[18px] border border-[#e6eaf0] bg-white px-4 py-3 text-sm text-[#667085] shadow-[0_8px_26px_rgba(15,23,42,0.05)]">
          {error}
        </div>
      )}

      <DataCard
        noPadding
        className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="h-[38px] w-[38px] rounded-[14px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                <TrendingUp className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[19px] font-semibold tracking-[-0.035em]">Centro de acción</h2>
                <p className="mt-1 text-[13px] font-medium text-[#667085]">
                  Hoy tienes <strong className="text-[#111827]">{totalActions}</strong> acciones
                  importantes para no perder oportunidades.
                </p>
              </div>
            </div>
            <Link
              to={"/tasks" as any}
              className="inline-flex h-10 items-center justify-center rounded-[14px] bg-[#111827] px-4 text-[13px] font-extrabold text-white shadow-[0_14px_24px_rgba(17,24,39,0.22)] hover:opacity-95"
            >
              Abrir seguimiento
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {prioritiesSorted.length === 0 ? (
              <div className="xl:col-span-5 rounded-[18px] border border-[#e6eaf0] bg-[#f9fafc] p-6 text-center">
                <div className="text-[15px] font-extrabold tracking-[-0.02em]">
                  No hay alertas críticas en este momento.
                </div>
                <div className="mt-1 text-[13px] font-medium text-[#667085]">
                  Puedes seguir trabajando con normalidad y volver más tarde para revisar cambios.
                </div>
              </div>
            ) : (
              prioritiesSorted.slice(0, 5).map((p) => {
                const st = priorityVariantStyles(p.variant);
                const Icon = p.icon;
                const isHigh = p.urgency === "alta";
                const tagClass = isHigh ? "text-[#e11d48] bg-[#ffe6eb]" : st.tag;
                const tagText = urgencyLabel(p.urgency);
                return (
                  <div
                    key={p.key}
                    className={
                      "min-h-[214px] rounded-[18px] border p-[18px] flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] " +
                      st.card
                    }
                  >
                    <div
                      className={
                        "h-[42px] w-[42px] rounded-[15px] grid place-items-center " + st.icon
                      }
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold text-[#667085] uppercase tracking-[0.08em]">
                        Acción
                      </div>
                      <h4 className="text-[15px] font-semibold tracking-[-0.02em]">{p.title}</h4>
                      <div
                        className={
                          "mt-2 text-[36px] leading-[0.85] font-extrabold tracking-[-0.06em] " +
                          st.number
                        }
                      >
                        {p.count}
                      </div>
                      <p className="mt-2 text-[13px] leading-[1.5] text-[#475467] min-h-[40px]">
                        {p.description}
                      </p>
                    </div>
                    <div className="mt-auto grid gap-3">
                      <span
                        className={
                          "inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-extrabold " +
                          tagClass
                        }
                      >
                        <span className="inline-block h-[7px] w-[7px] rounded-full bg-current" />
                        Prioridad: {tagText}
                      </span>
                      <Link
                        to={p.to as any}
                        className={
                          "inline-flex h-10 items-center justify-center rounded-[14px] px-3 text-[13px] font-extrabold " +
                          st.ctaOutline
                        }
                      >
                        {p.ctaLabel}
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DataCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {kpis.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            icon={m.icon as any}
            iconClassName={m.iconClassName}
            iconChipClassName={(m as any).iconChipClassName}
            variant="reference"
            size="default"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {attentionCardsSorted.map((card) => {
          const Icon = card.icon;
          return (
            <DataCard
              key={card.key}
              noPadding
              className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-semibold tracking-[-0.035em]">
                        {card.title}
                      </h3>
                      <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                        Lista corta para actuar rápido sin salir del dashboard.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={card.to as any}
                    className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                  >
                    Abrir módulo
                  </Link>
                </div>

                <div className="mt-4 rounded-[16px] border border-[#e6eaf0] bg-white overflow-hidden">
                  {card.items.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] font-medium text-[#667085]">
                      {card.empty}
                    </div>
                  ) : (
                    card.items.map((item: any, index: number) => (
                      <div
                        key={`${card.key}:${item.id || index}`}
                        className="px-4 py-3 border-t first:border-t-0 border-[#eef2f6]"
                      >
                        {card.render(item)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DataCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="grid gap-4">
          <DataCard
            noPadding
            className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                    <GitBranch className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em]">
                      Pipeline de ventas
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      Resumen por etapa.
                    </p>
                  </div>
                </div>
                <Link
                  to={"/pipeline" as any}
                  className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                >
                  Ver pipeline
                </Link>
              </div>

              <div className="mt-4 grid gap-3">
                {pipelineStages.every((s) => s.count === 0) ? (
                  <div className="rounded-[16px] border border-[#e6eaf0] bg-[#f9fafc] px-4 py-4 text-[13px] font-medium text-[#667085]">
                    No hay deals todavía. Crea un deal para empezar a visualizar tu pipeline.
                  </div>
                ) : (
                  <>
                    {pipelineStages.map((s) => {
                      const pct =
                        pipelineTotalValue > 0
                          ? Math.round((s.value / pipelineTotalValue) * 100)
                          : 0;
                      const bar =
                        pipelineTotalValue > 0
                          ? Math.max(6, Math.round((s.value / pipelineTotalValue) * 100))
                          : 0;
                      return (
                        <div
                          key={s.stage}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-3"
                        >
                          <div className="min-w-0">
                            <strong className="block text-[13px] font-semibold">{s.stage}</strong>
                            <span className="text-[12px] font-semibold text-[#667085]">
                              {s.count} deal(s)
                            </span>
                            <div className="mt-2 h-2 rounded-full bg-[#edf2f7] overflow-hidden">
                              <span
                                className="block h-full rounded-full bg-[linear-gradient(90deg,#1d62f9,#60a5fa)]"
                                style={{ width: `${bar}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right text-[13px] font-extrabold whitespace-nowrap">
                            {moneyBase(s.value)}
                          </div>
                          <div className="h-7 w-[52px] rounded-full bg-[#f3f6fb] grid place-items-center text-[12px] font-extrabold text-[#667085]">
                            {pct}%
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-2 pt-4 border-t border-[#e6eaf0] flex items-center justify-between font-extrabold">
                      <span>Total</span>
                      <span className="text-[18px] text-[#1d62f9]">
                        {moneyBase(pipelineTotalValue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DataCard>

          <DataCard
            noPadding
            className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                    <DollarSign className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em]">
                      Propuestas y cobros
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      Lo que requiere atención en ventas y finanzas.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={"/proposals" as any}
                    className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                  >
                    Ver propuestas
                  </Link>
                  <span className="text-[#d0d5dd]">•</span>
                  <Link
                    to={"/invoices" as any}
                    className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                  >
                    Ver facturas
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    icon: FileText,
                    iconChip: "bg-[#f4efff] text-[#7c3aed]",
                    label: "Propuestas pendientes",
                    value: String(pendingProposals.length),
                  },
                  {
                    icon: CheckSquare,
                    iconChip: "bg-[#ecfdf3] text-[#16a34a]",
                    label: "Aprobadas (sin cobro)",
                    value: String(approvedProposalsNoPaymentCount),
                  },
                  {
                    icon: Receipt,
                    iconChip: "bg-[#fff7e6] text-[#f59e0b]",
                    label: "Facturas enviadas",
                    value: String(invoicesSent.length),
                  },
                  {
                    icon: AlertTriangle,
                    iconChip: "bg-[#fff1f3] text-[#e11d48]",
                    label: "Facturas vencidas",
                    value: String(invoicesOverdue.length),
                  },
                  {
                    icon: Receipt,
                    iconChip: "bg-[#f0f7ff] text-[#1d62f9]",
                    label: "Total por cobrar",
                    value: moneyBase(receivableTotal),
                  },
                  {
                    icon: TrendingUp,
                    iconChip: "bg-[#ecfdf3] text-[#16a34a]",
                    label: "Ingresos cobrados",
                    value: moneyBase(paidRevenue),
                  },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center gap-3 rounded-[15px] border border-[#e6eaf0] bg-white p-3.5"
                  >
                    <div
                      className={
                        "h-[34px] w-[34px] rounded-[12px] grid place-items-center " + b.iconChip
                      }
                    >
                      <b.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[12px] font-semibold text-[#667085] truncate">
                        {b.label}
                      </span>
                      <strong className="block text-[15px] font-semibold mt-1 truncate">
                        {b.value}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DataCard>

          <DataCard
            noPadding
            className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                    <MessageCircle className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em]">
                      Meta Inbox pendiente
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      WhatsApp, Messenger e Instagram por responder.
                    </p>
                  </div>
                </div>
                <Link
                  to={"/whatsapp-web" as any}
                  className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                >
                  Abrir Meta Inbox
                </Link>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-3 rounded-[16px] border border-[#c7f0d4] bg-[#f0fdf5] p-4">
                    <div className="h-[34px] w-[34px] rounded-[12px] grid place-items-center bg-[#dcfce7] text-[#16a34a]">
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <strong className="block text-[18px]">{waOpen}</strong>
                      <span className="block text-[12px] font-bold text-[#667085]">
                        WhatsApp abiertos
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-[16px] border border-[#cfe4ff] bg-[#f0f7ff] p-4">
                    <div className="h-[34px] w-[34px] rounded-[12px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <strong className="block text-[18px]">{messengerOpen + instagramOpen}</strong>
                      <span className="block text-[12px] font-bold text-[#667085]">
                        Redes abiertas
                      </span>
                    </div>
                  </div>
                </div>

                {pendingConversations.length === 0 ? (
                  <div className="rounded-[16px] border border-[#e6eaf0] bg-[#f9fafc] p-4 text-[13px] font-medium text-[#667085]">
                    Todo respondido por ahora.
                  </div>
                ) : (
                  <div className="rounded-[16px] border border-[#e6eaf0] bg-white overflow-hidden">
                    {pendingConversations.map((c) => (
                      <div
                        key={c.id}
                        className="px-4 py-3 border-b last:border-b-0 border-[#eef2f6] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-[13px] truncate">{c.name}</strong>
                            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-[#edf5ff] text-[#1d62f9]">
                              {c.channel}
                            </span>
                          </div>
                          <div className="mt-1 text-[12px] font-semibold text-[#667085] truncate">
                            {c.preview}
                          </div>
                        </div>
                        <Link
                          to={c.to as any}
                          className="shrink-0 inline-flex h-9 items-center justify-center rounded-[12px] border border-[#dbe7ff] bg-white px-3 text-[12px] font-extrabold text-[#1d62f9] hover:bg-[#f0f6ff]"
                        >
                          Abrir
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DataCard>
        </div>

        <div className="grid gap-4">
          <DataCard
            noPadding
            className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                    <Building2 className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em]">Producción</h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      Proyectos y tareas en curso.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={"/tasks" as any}
                    className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                  >
                    Ver tareas
                  </Link>
                  <span className="text-[#d0d5dd]">•</span>
                  <Link
                    to={"/projects" as any}
                    className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                  >
                    Ver proyectos
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    icon: Building2,
                    iconChip: "bg-[#ecfdf3] text-[#16a34a]",
                    label: "Proyectos activos",
                    value: String(projectsActiveCount),
                  },
                  {
                    icon: AlertTriangle,
                    iconChip: "bg-[#fff1f3] text-[#e11d48]",
                    label: "Tareas atrasadas",
                    value: String(overdueTasks.length),
                  },
                  {
                    icon: Clock,
                    iconChip: "bg-[#f0f7ff] text-[#1d62f9]",
                    label: "Tareas para hoy",
                    value: String(tasksDueTodayCount),
                  },
                  {
                    icon: Clock,
                    iconChip: "bg-[#fff7e6] text-[#f59e0b]",
                    label: "Entregas esta semana",
                    value: String(projectsDueThisWeekCount),
                  },
                ].map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center gap-3 rounded-[15px] border border-[#e6eaf0] bg-white p-3.5"
                  >
                    <div
                      className={
                        "h-[34px] w-[34px] rounded-[12px] grid place-items-center " + b.iconChip
                      }
                    >
                      <b.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[12px] font-semibold text-[#667085] truncate">
                        {b.label}
                      </span>
                      <strong className="block text-[15px] font-semibold mt-1 truncate">
                        {b.value}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DataCard>

          <DataCard
            noPadding
            className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                    <Clock className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em]">
                      Agenda próxima
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      Vencimientos y próximos hitos.
                    </p>
                  </div>
                </div>
                <Link
                  to={"/calendar" as any}
                  className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                >
                  Ver calendario
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-[16px] border border-[#e6eaf0] bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafc] text-[12px] font-extrabold text-[#667085]">
                    Hoy
                  </div>
                  {agendaToday.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] font-medium text-[#667085]">
                      Nada programado para hoy.
                    </div>
                  ) : (
                    agendaToday.map((i) => (
                      <div
                        key={`${i.kind}:${i.title}:${i.dateKey}`}
                        className="px-4 py-3 border-t border-[#eef2f6] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-extrabold text-[#667085] uppercase tracking-[0.08em]">
                            {i.kind}
                          </div>
                          <div className="text-[13px] font-semibold truncate">{i.title}</div>
                        </div>
                        <Link
                          to={i.to as any}
                          className="shrink-0 inline-flex h-8 items-center justify-center rounded-[12px] border border-[#dbe7ff] bg-white px-3 text-[12px] font-extrabold text-[#1d62f9] hover:bg-[#f0f6ff]"
                        >
                          Abrir
                        </Link>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-[16px] border border-[#e6eaf0] bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-[#f9fafc] text-[12px] font-extrabold text-[#667085]">
                    Esta semana
                  </div>
                  {agendaWeek.length === 0 ? (
                    <div className="px-4 py-4 text-[13px] font-medium text-[#667085]">
                      Sin vencimientos próximos.
                    </div>
                  ) : (
                    agendaWeek.map((i) => (
                      <div
                        key={`${i.kind}:${i.title}:${i.dateKey}`}
                        className="px-4 py-3 border-t border-[#eef2f6] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-[#f3f6fb] text-[#667085]">
                              {i.dateKey}
                            </span>
                            <span className="text-[11px] font-extrabold text-[#667085] uppercase tracking-[0.08em]">
                              {i.kind}
                            </span>
                          </div>
                          <div className="mt-1 text-[13px] font-semibold truncate">{i.title}</div>
                        </div>
                        <Link
                          to={i.to as any}
                          className="shrink-0 inline-flex h-8 items-center justify-center rounded-[12px] border border-[#dbe7ff] bg-white px-3 text-[12px] font-extrabold text-[#1d62f9] hover:bg-[#f0f6ff]"
                        >
                          Abrir
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DataCard>

          <DataCard
            noPadding
            className="rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-[30px] w-[30px] rounded-[11px] grid place-items-center bg-[#eaf1ff] text-[#1d62f9]">
                    <CheckSquare className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.035em]">
                      Actividad reciente
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      Cambios relevantes en tu CRM.
                    </p>
                  </div>
                </div>
                <Link
                  to={"/reports" as any}
                  className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                >
                  Ver reportes
                </Link>
              </div>

              <div className="mt-4">
                <ActivityFeed
                  title=""
                  items={
                    activities.length > 0
                      ? activities
                      : [
                          {
                            id: "empty",
                            action: "Sin actividad",
                            detail: "No hay actividad reciente todavía.",
                            time: t("dashboard.now"),
                          },
                        ]
                  }
                />
              </div>
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  );
}
