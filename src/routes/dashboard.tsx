import { createFileRoute, Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  GitBranch,
  MessageCircle,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/crm/metric-card";
import { DataCard } from "@/components/crm/data-card";
import { ActivityFeed } from "@/components/crm/activity-feed";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n";
import { DashboardV2 } from "@/components/dashboard-v2/dashboard-v2";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Corevix CRM" },
      { name: "description", content: "Business overview and key metrics" },
    ],
  }),
});

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
  next_follow_up?: string | null;
};

type DealRow = {
  id: string;
  name?: string | null;
  stage: string;
  value: number | string | null;
  expected_close?: string | null;
  updated_at?: string;
};

type TaskRow = {
  id: string;
  title?: string | null;
  status: string;
  priority?: string | null;
  due_date: string | null;
  related_lead_id?: string | null;
  related_client_id?: string | null;
  related_project_id?: string | null;
};

type ProjectRow = {
  id: string;
  name?: string | null;
  status: string;
  due_date: string | null;
};

type InvoiceRow = {
  id: string;
  status: string;
  total: number | string | null;
  due_date?: string | null;
  number?: string | null;
  client_id?: string | null;
};

type ProposalRow = {
  id: string;
  status: string;
  valid_until?: string | null;
  title?: string | null;
  number?: string | null;
  amount?: number | string | null;
  client_id?: string | null;
  updated_at?: string;
};

type ClientSummaryRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
};

type WhatsAppConversationRow = {
  id: string;
  status: string | null;
  last_message_body?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  whatsapp_contacts?: { id: string; name: string | null; phone: string | null } | null;
};

type EmailConversationRow = {
  id: string;
  status: string | null;
  last_message_at?: string | null;
  subject?: string | null;
  unread_count?: number | null;
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

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
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
  if (key === "projects_risk") return "warning";
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
  const s = String(status || "").toLowerCase();
  return s === "won" || s === "lost" || s === "converted";
}

function isClosedDealStage(stage: string) {
  const s = String(stage || "").toLowerCase();
  return isWonDealStage(stage) || isLostDealStage(stage);
}

function isWonDealStage(stage: string) {
  const s = String(stage || "")
    .trim()
    .toLowerCase();
  return (
    s === "won" ||
    s === "closed won" ||
    s.includes("closed won") ||
    s.includes("ganad") ||
    s.includes("win")
  );
}

function isLostDealStage(stage: string) {
  const s = String(stage || "")
    .trim()
    .toLowerCase();
  return (
    s === "lost" ||
    s === "closed lost" ||
    s.includes("closed lost") ||
    s.includes("perdid") ||
    s.includes("lost")
  );
}

function isCompletedTaskStatus(status: string) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  return s === "completed" || s === "done" || s === "cancelled";
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
  const date = new Date(value);
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

function DashboardPage() {
  const { profile } = useAuth();
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [clientSummaries, setClientSummaries] = useState<ClientSummaryRow[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [waConversations, setWaConversations] = useState<WhatsAppConversationRow[]>([]);
  const [emailConversations, setEmailConversations] = useState<EmailConversationRow[]>([]);
  const [metaConversations, setMetaConversations] = useState<MetaConversationRow[]>([]);
  const [activities, setActivities] = useState<
    { id: string; action: string; detail: string; time: string }[]
  >([]);

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;
    setLoading(true);
    setError(null);

    const db = supabase as any;

    const load = async () => {
      const loadLeads = async () => {
        const base =
          "id,first_name,last_name,company_name,status,source,created_at,updated_at,next_follow_up";
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
          "id,title,status,priority,due_date,related_lead_id,related_client_id,related_project_id";
        const res = await db
          .from("tasks")
          .select(richSelect)
          .eq("company_id", cid)
          .order("due_date", { ascending: true })
          .limit(120);
        if (!res.error) return res;
        return db
          .from("tasks")
          .select("id,title,status,priority,due_date")
          .eq("company_id", cid)
          .order("due_date", { ascending: true })
          .limit(120);
      };

      const loadDeals = async () =>
        db
          .from("deals")
          .select("id,name,stage,value,expected_close,updated_at")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(120);

      const loadProjects = async () =>
        db
          .from("projects")
          .select("id,name,status,due_date")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(100);

      const loadInvoices = async () =>
        db
          .from("invoices")
          .select("id,status,total,due_date,number,client_id")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);

      const loadProposals = async () => {
        const richSelect = "id,status,valid_until,title,number,amount,client_id,updated_at";
        const res = await db
          .from("proposals")
          .select(richSelect)
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);
        if (!res.error) return res;
        return db
          .from("proposals")
          .select("id,status,valid_until,title,number,updated_at")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(80);
      };

      const results = await Promise.allSettled([
        loadLeads(),
        db
          .from("clients")
          .select("id,company_name,contact_person")
          .eq("company_id", cid)
          .order("updated_at", { ascending: false })
          .limit(250),
        db.from("clients").select("id", { count: "exact" }).eq("company_id", cid),
        loadDeals(),
        loadTasks(),
        loadProjects(),
        loadInvoices(),
        loadProposals(),
        db
          .from("whatsapp_conversations")
          .select(
            "id, status, last_message_body, last_message_at, unread_count, whatsapp_contacts(id, name, phone)",
          )
          .eq("company_id", cid)
          .order("last_message_at", { ascending: false })
          .limit(50),
        db
          .from("email_conversations")
          .select("id, status, subject, last_message_at, unread_count")
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
      setTasks(getData<TaskRow>(4));
      setProjects(getData<ProjectRow>(5));
      setInvoices(getData<InvoiceRow>(6));
      setProposals(getData<ProposalRow>(7));
      setWaConversations(getData<WhatsAppConversationRow>(8));
      setEmailConversations(getData<EmailConversationRow>(9));
      setMetaConversations(getData<MetaConversationRow>(10));

      const actRows = getData<ActivityLogRow>(11);
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

      setLoading(false);
    };

    load();
  }, [profile?.company_id]);

  if (loading)
    return (
      <div className="p-6">
        <LoadingMetrics count={12} />
      </div>
    );

  const today = localTodayKey();
  const leadById = new Map(leads.map((lead) => [String(lead.id), lead]));
  const clientById = new Map(clientSummaries.map((client) => [String(client.id), client]));
  const projectById = new Map(projects.map((project) => [String(project.id), project]));

  const openDeals = deals.filter((d) => !isClosedDealStage(d.stage));
  const pipelineValue = openDeals.reduce((s, d) => s + toNumber(d.value), 0);

  const overdueTasks = tasks.filter((t) => {
    if (isCompletedTaskStatus(t.status)) return false;
    const dueKey = toDateKey(t.due_date);
    if (!dueKey) return false;
    return dueKey < today;
  });
  const tasksDueTodayCount = tasks.filter((t) => {
    if (isCompletedTaskStatus(t.status)) return false;
    const dueKey = toDateKey(t.due_date);
    return dueKey === today;
  }).length;

  const pendingProposalStates = new Set(["draft", "pending", "sent", "viewed"]);
  const pendingProposals = proposals.filter((p) =>
    pendingProposalStates.has(String(p.status || "").toLowerCase()),
  );
  const approvedProposalsNoPaymentCount = proposals.filter((p) =>
    ["Accepted", "Approved"].includes(p.status),
  ).length;

  const invoicesPending = invoices.filter(
    (i) => !["paid", "cancelled", "void"].includes(String(i.status || "").toLowerCase()),
  );
  const invoicesOverdue = invoices.filter((i) => {
    const dueKey = toDateKey(i.due_date);
    if (!dueKey) return String(i.status || "").toLowerCase() === "overdue";
    return String(i.status || "").toLowerCase() !== "paid" && dueKey < today;
  });
  const invoicesSent = invoices.filter((i) => String(i.status || "").toLowerCase() === "sent");
  const paidRevenue = invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + toNumber(i.total), 0);
  const receivableTotal = invoicesPending.reduce((s, i) => s + toNumber(i.total), 0);

  const waOpen = waConversations.filter((c) => String(c.status).toLowerCase() === "open").length;
  const emailOpen = emailConversations.filter(
    (c) => String(c.status).toLowerCase() === "open",
  ).length;
  const messengerOpen = metaConversations.filter(
    (c) =>
      String(c.platform).toLowerCase() === "messenger" && String(c.status).toLowerCase() === "open",
  ).length;
  const instagramOpen = metaConversations.filter(
    (c) =>
      String(c.platform).toLowerCase() === "instagram" && String(c.status).toLowerCase() === "open",
  ).length;
  const inboxPendingTotal = waOpen + messengerOpen + instagramOpen + emailOpen;

  const projectsActiveCount = projects.filter(
    (p) => p.status !== "Completed" && p.status !== "Cancelled",
  ).length;
  const projectsAtRisk = projects.filter((p) => {
    if (p.status === "Completed" || p.status === "Cancelled") return false;
    const dueKey = toDateKey(p.due_date);
    if (!dueKey) return false;
    return dueKey < today;
  });
  const projectsDueThisWeekCount = projects.filter((p) => {
    if (p.status === "Completed" || p.status === "Cancelled") return false;
    const dueKey = toDateKey(p.due_date);
    if (!dueKey) return false;
    return isDateKeyInNextDays(dueKey, 7);
  }).length;

  const leadsNeedingFollowUp = leads.filter((l) => {
    if (isClosedLeadStatus(l.status)) return false;
    const stale = hoursSince(l.updated_at) > 24;
    const hasNextFollowUpField = Object.prototype.hasOwnProperty.call(l, "next_follow_up");
    const missingFollowUp = hasNextFollowUpField ? !l.next_follow_up : false;
    return stale || missingFollowUp;
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
      if (String(lead.status || "").toLowerCase() === "new" && daysSince(lead.created_at) >= 2)
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
        String(invoice.status || "").toLowerCase() === "overdue" ||
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
      title: "Conversaciones sin responder",
      description: "Atiende WhatsApp y Email abiertos para no perder intención comercial.",
      urgency: "media",
      count: inboxPendingTotal,
      variant: priorityVariantFromKey("wa_open"),
      ctaLabel: "Abrir inbox",
      to: "/whatsapp",
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

  const priorityOrder = [
    "leads_followup",
    "overdue_tasks",
    "pending_invoices",
    "pending_proposals",
    "wa_open",
    "projects_risk",
  ];
  const prioritiesSorted = [...priorities].sort(
    (a, b) => priorityOrder.indexOf(a.key) - priorityOrder.indexOf(b.key),
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
      value: formatMoney(pipelineValue),
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
      value: formatMoney(receivableTotal),
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
      acc[stage] = { count: prev.count + 1, value: prev.value + toNumber(d.value) };
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
    ...tasks
      .filter((t) => t.status !== "Completed" && t.status !== "Cancelled")
      .map((t) => ({
        kind: "Tarea",
        title: t.title || "Tarea sin título",
        dateKey: toDateKey(t.due_date),
        to: "/tasks",
      })),
    ...invoices
      .filter((i) => ["Sent", "Overdue"].includes(i.status))
      .map((i) => ({
        kind: "Factura",
        title: i.number ? `Factura ${i.number}` : "Factura por cobrar",
        dateKey: toDateKey(i.due_date),
        to: "/invoices",
      })),
    ...proposals
      .filter((p) => ["Sent", "Viewed"].includes(p.status))
      .map((p) => ({
        kind: "Propuesta",
        title: p.title || (p.number ? `Propuesta ${p.number}` : "Propuesta por vencer"),
        dateKey: toDateKey(p.valid_until),
        to: "/proposals",
      })),
    ...projects
      .filter((p) => p.status !== "Completed" && p.status !== "Cancelled")
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
      .filter((c) => String(c.status).toLowerCase() === "open")
      .slice(0, 3)
      .map((c) => ({
        id: `wa:${c.id}`,
        name: c.whatsapp_contacts?.name || "Contacto",
        channel: "WhatsApp",
        preview: c.last_message_body || "Sin mensaje reciente.",
        to: "/whatsapp",
      })),
    ...metaConversations
      .filter((c) => String(c.status).toLowerCase() === "open")
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
        to: "/whatsapp",
      })),
    ...emailConversations
      .filter((c) => String(c.status).toLowerCase() === "open")
      .slice(0, 3)
      .map((c) => ({
        id: `em:${c.id}`,
        name: "Email",
        channel: "Email",
        preview: c.subject || "Sin asunto.",
        to: "/email",
      })),
  ].slice(0, 6);

  const attentionCards = [
    {
      key: "leads",
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
              {formatMoney(toNumber(item.value))}
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
            {item.amount != null ? formatMoney(toNumber(item.amount)) : "Monto no disponible"}
          </div>
        </>
      ),
    },
    {
      key: "invoices",
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
            {formatMoney(toNumber(item.total))} ·{" "}
            {item.due_date ? `Vence ${formatShortDate(item.due_date)}` : "Sin vencimiento"}
          </div>
        </>
      ),
    },
  ];

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

  const dashboardV2Kpis = [
    {
      label: "Dinero por cobrar",
      value: formatMoney(receivableTotal),
      helper: invoicesOverdue.length ? `${invoicesOverdue.length} vencidas` : "Todo al día",
      tone: invoicesOverdue.length ? ("orange" as const) : ("green" as const),
      icon: DollarSign,
    },
    {
      label: "Oportunidades",
      value: String(openDeals.length),
      helper: formatMoney(pipelineValue),
      tone: "blue" as const,
      icon: TrendingUp,
    },
    {
      label: "Tareas atrasadas",
      value: String(overdueTasks.length),
      helper: overdueTasks.length ? "Necesitan acción" : "Sin atrasos",
      tone: overdueTasks.length ? ("orange" as const) : ("neutral" as const),
      icon: Clock,
    },
    {
      label: "Propuestas",
      value: String(pendingProposals.length),
      helper: "Esperando respuesta",
      tone: "purple" as const,
      icon: FileText,
    },
    {
      label: "Mensajes",
      value: String(inboxPendingTotal),
      helper: "Por atender",
      tone: inboxPendingTotal ? ("red" as const) : ("neutral" as const),
      icon: MessageCircle,
    },
    {
      label: "Proyectos",
      value: String(projectsActiveCount),
      helper: "En ejecución",
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

  const collectionTotal = Math.max(receivableTotal + paidRevenue, 1);
  const dashboardV2CollectionRows: [string, string, string, string][] = [
    [
      "Por cobrar",
      formatMoney(receivableTotal),
      dashboardPercent(receivableTotal, collectionTotal),
      "bg-blue-500",
    ],
    [
      "Vencido",
      formatMoney(invoicesOverdue.reduce((s, i) => s + toNumber(i.total), 0)),
      dashboardPercent(
        invoicesOverdue.reduce((s, i) => s + toNumber(i.total), 0),
        collectionTotal,
      ),
      "bg-rose-500",
    ],
    [
      "Cobrado",
      formatMoney(paidRevenue),
      dashboardPercent(paidRevenue, collectionTotal),
      "bg-emerald-500",
    ],
  ];

  const dashboardPipelineMax = Math.max(...pipelineStages.map((stage) => stage.value), 1);
  const dashboardV2Pipeline: [string, number, string, number, string][] = pipelineStages.map(
    (stage, index) => [
      stage.stage,
      stage.count,
      formatMoney(stage.value),
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
            formatMoney(toNumber(invoice.total)),
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
            proposal.amount != null ? formatMoney(toNumber(proposal.amount)) : "",
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
            formatMoney(toNumber(deal.value)),
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

  const dashboardV2Communications: [string, string, string, string, string, string][] = [
    ...waConversations.map((conversation) => ({
      channel: "WhatsApp",
      name:
        conversation.whatsapp_contacts?.name ||
        conversation.whatsapp_contacts?.phone ||
        "Contacto de WhatsApp",
      preview: conversation.last_message_body || "Sin mensaje reciente.",
      count: String(Number(conversation.unread_count ?? 0)),
      tone: Number(conversation.unread_count ?? 0) > 0 ? "green" : "neutral",
      href: "/whatsapp",
      at: conversation.last_message_at || "",
    })),
    ...metaConversations.map((conversation) => {
      const platform = String(conversation.platform || "").toLowerCase();
      const isInstagram = platform === "instagram";

      return {
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
        href: "/whatsapp",
        at: conversation.last_message_at || conversation.created_at || "",
      };
    }),
    ...emailConversations.map((conversation) => ({
      channel: "Email",
      name: conversation.subject || "Email sin asunto",
      preview: conversation.status || "Correo pendiente.",
      count: String(Number(conversation.unread_count ?? 0)),
      tone: Number(conversation.unread_count ?? 0) > 0 ? "red" : "neutral",
      href: "/email",
      at: conversation.last_message_at || "",
    })),
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
    .slice(0, 8)
    .map((conversation) => [
      conversation.channel,
      conversation.name,
      conversation.preview,
      conversation.count,
      conversation.tone,
      conversation.href,
    ]);

  return (
    <DashboardV2
      kpis={dashboardV2Kpis}
      actions={dashboardV2Actions}
      schedule={dashboardV2Schedule}
      collectionRows={dashboardV2CollectionRows}
      pipeline={dashboardV2Pipeline}
      clients={dashboardV2Clients}
      activities={dashboardV2Activities}
      communications={dashboardV2Communications}
      todayLabel={dashboardTodayLabel}
      collectionPeriodLabel="Este mes⌄"
      pipelinePeriodLabel="Pipeline⌄"
    />
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
        {attentionCards.map((card) => {
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
                            {formatMoney(s.value)}
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
                        {formatMoney(pipelineTotalValue)}
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
                    value: formatMoney(receivableTotal),
                  },
                  {
                    icon: TrendingUp,
                    iconChip: "bg-[#ecfdf3] text-[#16a34a]",
                    label: "Ingresos cobrados",
                    value: formatMoney(paidRevenue),
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
                      Inbox pendiente
                    </h3>
                    <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                      WhatsApp y Email por responder.
                    </p>
                  </div>
                </div>
                <Link
                  to={"/whatsapp" as any}
                  className="text-[13px] font-extrabold text-[#1d62f9] hover:underline whitespace-nowrap"
                >
                  Abrir inbox
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
                      <FileText className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <strong className="block text-[18px]">{emailOpen}</strong>
                      <span className="block text-[12px] font-bold text-[#667085]">
                        Emails pendientes
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
