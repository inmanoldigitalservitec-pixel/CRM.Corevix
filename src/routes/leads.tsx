import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Eye,
  FileText,
  FolderOpen,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Pencil,
  Plus,
  Sidebar,
  Star,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import {
  convertCurrencyAmount,
  convertToBaseCurrency,
  formatCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyAmount,
  type CurrencyCode,
} from "@/lib/currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { openGlobalTaskCreate } from "@/components/tasks/global-task-create-host";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { DetailSheet } from "@/components/crm/detail-sheet";
import { CrmDetailEmptyState, CrmDetailRow, CrmDetailSection } from "@/components/crm/crm-detail";
import {
  CrmDetailActionGrid,
  CrmDetailLineButton,
  CrmDetailSelectTrigger,
} from "@/components/crm/crm-detail-layout";
import { PageHeader } from "@/components/crm/page-header";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";
import { QuickCreateDialog } from "@/components/crm/quick-create-dialog";
import { LeadNotesPanel } from "@/components/leads/lead-notes-panel";

export const Route = createFileRoute("/leads")({
  validateSearch: (search: Record<string, unknown>): { leadId?: string } => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
  }),
  component: LeadsPage,
  head: () => ({
    meta: [
      { title: "Leads — Corevix CRM" },
      { name: "description", content: "Gestiona leads y seguimientos" },
    ],
  }),
});

const STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
] as const;
const SOURCES = [
  "Website",
  "WhatsApp",
  "Referral",
  "Social Media",
  "Cold Call",
  "Email Campaign",
  "Event",
] as const;

type LeadStatus = (typeof STATUSES)[number];
type Source = (typeof SOURCES)[number];
type StageTab =
  | "all"
  | "new"
  | "discovery"
  | "qualified"
  | "proposal_ready"
  | "proposal_sent"
  | "closed";
type LeadChipFilter =
  | "all"
  | "no_followup"
  | "today"
  | "high_intent"
  | "no_owner"
  | "with_proposal"
  | "without_proposal";
type ChannelFilter = "all" | "whatsapp" | "website";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company_name: string | null;
  source: string;
  status: string;
  assigned_to: string | null;
  estimated_value: number | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  estimated_value_base?: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  source_channel: string | null;
  source_platform: string | null;
  source_detail: string | null;
  first_touch_channel: string | null;
  last_touch_channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  last_interaction_at: string | null;
}

type AssignableRole = "sales_agent" | "collaborator" | "manager" | "admin" | "super_admin";

type TeamMember = {
  profile_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  role: string;
};

type LeadSignals = {
  hasActiveTask: boolean;
  nextTaskTitle: string | null;
  nextTaskDueDate: string | null;
  nextTaskStatus: string | null;
  hasDeal: boolean;
  latestDealStage: string | null;
  latestDealValue: number | null;
  latestDealCurrency: string | null;
  latestDealBaseCurrency: string | null;
  latestDealExchangeRate: number | null;
  latestDealValueBase: number | null;
};

type DealStageRow = {
  id: string;
  name: string;
  display_order?: number | null;
  color?: string | null;
};

type DealRow = {
  id: string;
  company_id: string;
  name: string;
  value: number | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  value_base?: number | null;
  probability: number | null;
  expected_close: string | null;
  stage: string;
  lead_id: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  category?: string | null;
  base_price?: number | null;
  currency?: string | null;
  is_active?: boolean | null;
};

type DealProductRow = {
  id: string;
  deal_id: string;
  product_id: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

type ProductWorkflowRow = {
  id: string;
  product_id: string;
  name: string;
  is_active: boolean | null;
};

type ProductWorkflowStepRow = {
  id: string;
  workflow_id: string;
  product_id: string;
  title: string;
  description: string | null;
  step_order: number;
  default_priority: string | null;
  default_duration_days: number | null;
  assigned_role: string | null;
  is_active: boolean | null;
};

function normalizePhoneForWhatsApp(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type LeadKpiTone = "neutral" | "success" | "warning" | "danger" | "info";

function leadRiskTone(value: number, warningAt: number, dangerAt: number): LeadKpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function LeadKpi({
  label,
  value,
  tone = "neutral",
  active = false,
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: LeadKpiTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const toneClass: Record<LeadKpiTone, string> = {
    neutral: "text-slate-950",
    success: "text-emerald-600",
    warning: "text-orange-500",
    danger: "text-rose-600",
    info: "text-blue-600",
  };

  const content = (
    <>
      <div className="text-xs font-normal uppercase text-slate-500">{label}</div>
      <div className={`mt-2 truncate text-xl font-normal ${toneClass[tone]}`}>{value}</div>
    </>
  );

  if (!onClick) {
    return <div className="min-w-0 border-b border-slate-100 pb-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 border-b pb-3 text-left transition hover:border-slate-300 ${
        active ? "border-blue-500" : "border-slate-100"
      }`}
    >
      {content}
    </button>
  );
}

function getLeadName(lead: Lead) {
  return `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Prospecto sin nombre";
}

function getLeadPrimaryLabel(lead: Lead) {
  const company = (lead.company_name || "").trim();
  if (company) return company;
  const person = getLeadName(lead).trim();
  if (person && person !== "Prospecto sin nombre") return person;
  const email = (lead.email || "").trim();
  if (email) return email;
  const phone = (lead.whatsapp || lead.phone || "").trim();
  if (phone) return phone;
  return "Prospecto sin nombre";
}

function getLeadSecondaryLabel(lead: Lead) {
  const person = getLeadName(lead).trim();
  const company = (lead.company_name || "").trim();
  if (company && person && person !== "Prospecto sin nombre") return person;
  return lead.email || lead.whatsapp || lead.phone || "—";
}

function formatDateShort(date: string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatRelativeDate(input: string | null | undefined) {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "—";
  const now = new Date();
  const ms = now.getTime() - dt.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 2) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Hace ${days} d`;
}

function toDateKey(input: string | null | undefined) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getInterestLabel(lead: Lead) {
  const meta = lead.metadata;
  if (!meta || typeof meta !== "object") return null;
  const v = (meta as any).selected_service ?? (meta as any).service;
  return typeof v === "string" && v.trim().length ? v.trim() : null;
}

function getStageTab(status: string): StageTab {
  if (status === "New") return "new";
  if (status === "Contacted") return "discovery";
  if (status === "Qualified") return "qualified";
  if (status === "Proposal Sent" || status === "Negotiation") return "proposal_sent";
  if (status === "Won" || status === "Lost") return "closed";
  return "all";
}

function getNextStepLabel(lead: Lead, needsFollowUp: boolean) {
  const status = String(lead.status || "");
  if (status === "Won") return "Ver proyecto / cliente";
  if (status === "Lost") return "Revisar motivo";
  if (status === "Proposal Sent" || status === "Negotiation") return "Dar seguimiento";
  if (status === "Qualified") return "Crear propuesta";
  if (status === "Contacted") return "Hacer discovery";
  if (status === "New") return needsFollowUp ? "Contactar" : "Contactar";
  return "Revisar";
}

function getLeadChannelKey(lead: Lead): ChannelFilter {
  const c = (lead.last_touch_channel || lead.source_channel || "").toLowerCase();
  if (c === "whatsapp") return "whatsapp";
  if (c === "website") return "website";
  const s = (lead.source || "").toLowerCase();
  if (s.includes("whatsapp")) return "whatsapp";
  if (s.includes("website") || s.includes("sitio")) return "website";
  return "all";
}

function getLeadSourceDisplay(lead: Lead) {
  const channel = (lead.last_touch_channel || lead.source_channel || "").toLowerCase();
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "website") return "Website";
  if (channel === "instagram") return "Instagram";
  if (channel === "messenger") return "Messenger";
  return lead.source || "—";
}

function getInitials(lead: Lead) {
  const fullName = getLeadName(lead);
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function getAvatarTone(index: number) {
  const tones = [
    "bg-[#f0e7ff] text-[#7c3aed]",
    "bg-[#ffe8f4] text-[#be185d]",
    "bg-[#ecfdf3] text-[#15803d]",
    "bg-[#fff3e8] text-[#c2410c]",
    "bg-[#fef9c3] text-[#a16207]",
    "bg-[#eaf1ff] text-[#1d62f9]",
    "bg-[#fff1f3] text-[#e11d48]",
  ];
  return tones[index % tones.length];
}

function formatCurrency(value: number | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, currency || "USD");
}

function readLeadBaseValue(lead: Lead, baseCurrency: CurrencyCode, usdToDopRate: number) {
  return convertToBaseCurrency(lead.estimated_value || 0, lead.currency || baseCurrency, {
    baseCurrency,
    usdToDopRate,
    rateSource: "manual",
    rateUpdatedAt: null,
  });
}

function formatLeadOriginalValue(lead: Lead) {
  return formatCurrency(lead.estimated_value || 0, lead.currency || "USD");
}

function readLeadPipelineBaseValue(
  lead: Lead,
  signal: LeadSignals | undefined,
  baseCurrency: CurrencyCode,
  usdToDopRate: number,
) {
  if (signal?.hasDeal && signal.latestDealValue != null) {
    return convertToBaseCurrency(
      signal.latestDealValue || 0,
      signal.latestDealCurrency || baseCurrency,
      {
        baseCurrency,
        usdToDopRate,
        rateSource: "manual",
        rateUpdatedAt: null,
      },
    );
  }

  return readLeadBaseValue(lead, baseCurrency, usdToDopRate);
}

function formatLeadPipelineOriginalValue(lead: Lead, signal: LeadSignals | undefined) {
  if (signal?.hasDeal && signal.latestDealValue != null) {
    return formatCurrency(
      signal.latestDealValue,
      signal.latestDealCurrency || lead.currency || "USD",
    );
  }

  return formatLeadOriginalValue(lead);
}

function readDealBaseValue(deal: DealRow, baseCurrency: CurrencyCode, usdToDopRate: number) {
  const storedBaseAmount = Number(deal.value_base);
  if (deal.value_base != null && Number.isFinite(storedBaseAmount)) {
    return convertCurrencyAmount(
      storedBaseAmount,
      deal.base_currency || baseCurrency,
      baseCurrency,
      deal.exchange_rate || usdToDopRate,
    );
  }

  return convertToBaseCurrency(deal.value || 0, deal.currency || baseCurrency, {
    baseCurrency,
    usdToDopRate,
    rateSource: "manual",
    rateUpdatedAt: null,
  });
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    New: "Nuevo",
    Contacted: "Contactado",
    Qualified: "Calificado",
    "Proposal Sent": "Propuesta enviada",
    Negotiation: "Negociación",
    Won: "Ganado",
    Lost: "Perdido",
  };
  return map[status] || status;
}

function getStatusTone(status: string) {
  const tones: Record<string, string> = {
    New: "bg-[#eaf1ff] text-[#1d62f9]",
    Contacted: "bg-[#fff7e6] text-[#d97706]",
    Qualified: "bg-[#f3ecff] text-[#7c3aed]",
    "Proposal Sent": "bg-[#efeaff] text-[#6d28d9]",
    Negotiation: "bg-[#fff3e8] text-[#f97316]",
    Won: "bg-[#ecfdf3] text-[#16a34a]",
    Lost: "bg-[#f2f4f7] text-[#667085]",
  };
  return tones[status] || "bg-[#f2f4f7] text-[#475467]";
}

function getSourceLabel(source: string) {
  const map: Record<string, string> = {
    Website: "Sitio Web",
    WhatsApp: "WhatsApp",
    Referral: "Referral",
    "Social Media": "Redes Sociales",
    "Cold Call": "Llamada en frío",
    "Email Campaign": "Campaña email",
    Event: "Evento",
  };
  return map[source] || source;
}

function getSourceTone(source: string) {
  const key = (source || "").toLowerCase();

  if (key.includes("whatsapp")) return "bg-[#dcfce7] text-[#16a34a]";
  if (key.includes("social media") || key.includes("redes")) return "bg-[#eaf1ff] text-[#1d62f9]";

  const randomTones = [
    "bg-[#f0e7ff] text-[#7c3aed]",
    "bg-[#ffe8f4] text-[#be185d]",
    "bg-[#fff3e8] text-[#c2410c]",
    "bg-[#fef9c3] text-[#a16207]",
    "bg-[#eef2ff] text-[#4338ca]",
    "bg-[#fff1f3] text-[#e11d48]",
    "bg-[#e0f2fe] text-[#0369a1]",
  ];

  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = (hash + source.charCodeAt(i) * (i + 1)) % 9973;
  return randomTones[hash % randomTones.length];
}

function getLeadTags(lead: Lead) {
  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : null;
  const raw = meta ? (meta as any).tags : null;
  if (!Array.isArray(raw)) return [] as string[];
  return raw.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 3);
}

function getOwnerLabel(lead: Lead, currentUserId?: string) {
  if (!lead.assigned_to) return "Sin asignar";
  if (currentUserId && lead.assigned_to === currentUserId) return "Tú";
  return "Equipo";
}

function buildCsv(leads: Lead[]) {
  const headers = ["Prospecto", "Empresa", "Email", "Fuente", "Valor"];
  const rows = leads.map((lead) => [
    getLeadName(lead),
    lead.company_name || "",
    lead.email || "",
    getSourceLabel(lead.source),
    String(lead.estimated_value || 0),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function LeadsPage() {
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { user, profile } = useAuth();
  const routeSearch = Route.useSearch();
  const { can, role } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [valueFilter, setValueFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickLeadOpen, setQuickLeadOpen] = useState(false);
  const [quickProposalOpen, setQuickProposalOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [leadFormCurrency, setLeadFormCurrency] = useState<CurrencyCode>(
    currencySettings.baseCurrency,
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stageTab, setStageTab] = useState<StageTab>("all");
  const [leadChipFilter, setLeadChipFilter] = useState<LeadChipFilter>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingLeadStatusId, setUpdatingLeadStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    setLeadFormCurrency(normalizeCurrency(editLead?.currency || currencySettings.baseCurrency));
  }, [currencySettings.baseCurrency, dialogOpen, editLead?.currency]);

  const {
    data: leads,
    loading,
    create,
    update,
    remove,
    fetch: fetchLeads,
  } = useCrud<Lead>({ table: "leads" });

  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [openingWhatsapp, setOpeningWhatsapp] = useState(false);
  const [convertingClient, setConvertingClient] = useState(false);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [signalsByLeadId, setSignalsByLeadId] = useState<Record<string, LeadSignals>>({});
  const [dealStages, setDealStages] = useState<DealStageRow[]>([]);
  const [leadDeals, setLeadDeals] = useState<DealRow[]>([]);
  const [leadDealsLoading, setLeadDealsLoading] = useState(false);
  const [activeProducts, setActiveProducts] = useState<ProductRow[]>([]);
  const [dealProducts, setDealProducts] = useState<DealProductRow[]>([]);
  const [dealProductsByProductId, setDealProductsByProductId] = useState<
    Record<string, ProductRow | undefined>
  >({});
  const [editingDeal, setEditingDeal] = useState<DealRow | null>(null);
  const [dealProductDraft, setDealProductDraft] = useState({
    product_id: "",
    quantity: "1",
    unit_price: "",
  });
  const [savingDeal, setSavingDeal] = useState(false);
  const [closingDeal, setClosingDeal] = useState<"won" | "lost" | null>(null);
  const [lostDeal, setLostDeal] = useState<DealRow | null>(null);
  const [lostReason, setLostReason] = useState("Precio");
  const [lostNote, setLostNote] = useState("");
  const [creatingProjectDealId, setCreatingProjectDealId] = useState<string | null>(null);
  const sendLeadNotification = async (title: string, message: string, link = "/leads") => {
    if (!profile?.company_id || !user?.id) return;
    await createAttentionNotification(
      supabase,
      { companyId: profile.company_id, userId: user.id },
      { title, message, type: "attention:leads", link },
    ).catch(() => {});
  };

  const selectedLead = useMemo(() => {
    return leads.find((lead) => lead.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  const canViewAllLeads = role === "super_admin" || role === "admin" || role === "manager";
  const canAssign = role === "super_admin" || role === "admin" || role === "manager";
  const isSalesUser = role === "sales_agent" || role === "collaborator";

  const assignableUsers = useMemo(() => {
    const allowed: AssignableRole[] = [
      "sales_agent",
      "collaborator",
      "manager",
      "admin",
      "super_admin",
    ];
    return team
      .filter((m) => m.is_active)
      .filter((m) => allowed.includes(m.role as AssignableRole))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [team]);

  const assigneeByUserId = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of team) map.set(m.user_id, m);
    return map;
  }, [team]);

  const assigneeByProfileId = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of team) map.set(m.profile_id, m);
    return map;
  }, [team]);

  const selectedServiceLabel = useMemo(() => {
    const meta = selectedLead?.metadata;
    if (!meta || typeof meta !== "object") return null;
    const v = (meta as any).selected_service ?? (meta as any).service;
    return typeof v === "string" && v.trim().length ? v.trim() : null;
  }, [selectedLead?.metadata]);

  const loadSignals = useCallback(async () => {
    if (!profile?.company_id) {
      setSignalsByLeadId({});
      setSignalsError(null);
      setSignalsLoading(false);
      return;
    }
    if (!leads.length) {
      setSignalsByLeadId({});
      setSignalsError(null);
      setSignalsLoading(false);
      return;
    }

    setSignalsLoading(true);
    setSignalsError(null);

    const leadIds = Array.from(new Set(leads.map((l) => l.id))).slice(0, 200);
    const activeTaskStatuses = ["To Do", "In Progress", "Waiting"];

    const [tasksRes, dealsRes] = await Promise.all([
      (supabase as any)
        .from("tasks")
        .select("id, related_lead_id, title, due_date, status, priority, assigned_to, created_at")
        .eq("company_id", profile.company_id)
        .in("related_lead_id", leadIds)
        .in("status", activeTaskStatuses)
        .order("due_date", { ascending: true, nullsFirst: true })
        .limit(500),
      (supabase as any)
        .from("deals")
        .select(
          "id, lead_id, stage, value, currency, base_currency, exchange_rate, value_base, created_at",
        )
        .eq("company_id", profile.company_id)
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (tasksRes.error) {
      setSignalsError(tasksRes.error.message);
      setSignalsByLeadId({});
      setSignalsLoading(false);
      return;
    }
    if (dealsRes.error) {
      setSignalsError(dealsRes.error.message);
      setSignalsByLeadId({});
      setSignalsLoading(false);
      return;
    }

    const next: Record<string, LeadSignals> = {};
    for (const id of leadIds) {
      next[id] = {
        hasActiveTask: false,
        nextTaskTitle: null,
        nextTaskDueDate: null,
        nextTaskStatus: null,
        hasDeal: false,
        latestDealStage: null,
        latestDealValue: null,
        latestDealCurrency: null,
        latestDealBaseCurrency: null,
        latestDealExchangeRate: null,
        latestDealValueBase: null,
      };
    }

    for (const t of tasksRes.data || []) {
      const leadId = t.related_lead_id;
      if (!leadId || !next[leadId]) continue;
      // keep earliest due_date task (query ordered by due_date asc)
      if (!next[leadId].hasActiveTask) {
        next[leadId].hasActiveTask = true;
        next[leadId].nextTaskTitle = t.title || null;
        next[leadId].nextTaskDueDate = t.due_date || null;
        next[leadId].nextTaskStatus = t.status || null;
      }
    }

    for (const d of dealsRes.data || []) {
      const leadId = d.lead_id;
      if (!leadId || !next[leadId]) continue;
      if (!next[leadId].hasDeal) {
        next[leadId].hasDeal = true;
        next[leadId].latestDealStage = d.stage || null;
        next[leadId].latestDealValue = d.value == null ? null : Number(d.value);
        next[leadId].latestDealCurrency = d.currency || null;
        next[leadId].latestDealBaseCurrency = d.base_currency || null;
        next[leadId].latestDealExchangeRate =
          d.exchange_rate == null ? null : Number(d.exchange_rate);
        next[leadId].latestDealValueBase = d.value_base == null ? null : Number(d.value_base);
      }
    }

    setSignalsByLeadId(next);
    setSignalsLoading(false);
  }, [leads, profile?.company_id]);

  useEffect(() => {
    let cancelled = false;
    void loadSignals().catch((e: any) => {
      if (cancelled) return;
      setSignalsError(e?.message ?? "No se pudieron cargar señales");
      setSignalsByLeadId({});
      setSignalsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadSignals]);

  useRealtimeTable({
    table: "tasks",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadSignals();
    },
  });

  useRealtimeTable({
    table: "deals",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadSignals();
    },
  });

  const selectedDeal = leadDeals[0] || null;

  const refreshLeadDeals = useCallback(async () => {
    if (!profile?.company_id || !selectedLeadId) {
      setLeadDeals([]);
      setDealProducts([]);
      setDealProductsByProductId({});
      return;
    }

    setLeadDealsLoading(true);
    try {
      const db = supabase as any;
      const [{ data: stagesData, error: stagesError }, { data: dealsData, error: dealsError }] =
        await Promise.all([
          db
            .from("deal_stages")
            .select("id,name,display_order,color")
            .eq("company_id", profile.company_id)
            .order("display_order", { ascending: true }),
          db
            .from("deals")
            .select(
              "id,company_id,name,value,currency,base_currency,exchange_rate,exchange_rate_source,exchange_rate_updated_at,value_base,probability,expected_close,stage,lead_id,assigned_to,notes,created_at,updated_at",
            )
            .eq("company_id", profile.company_id)
            .eq("lead_id", selectedLeadId)
            .order("updated_at", { ascending: false }),
        ]);

      if (stagesError) throw stagesError;
      if (dealsError) throw dealsError;

      const nextDeals = (dealsData || []) as DealRow[];
      setDealStages((stagesData || []) as DealStageRow[]);
      setLeadDeals(nextDeals);

      const deal = nextDeals[0];
      if (!deal) {
        setDealProducts([]);
        setDealProductsByProductId({});
        return;
      }

      const [{ data: productsData }, { data: dealProductsData, error: dealProductsError }] =
        await Promise.all([
          db
            .from("products")
            .select("id,name,category,base_price,currency,is_active")
            .eq("company_id", profile.company_id)
            .eq("is_active", true)
            .order("name", { ascending: true })
            .limit(200),
          db
            .from("deal_products")
            .select("id,deal_id,product_id,quantity,unit_price,total_price")
            .eq("company_id", profile.company_id)
            .eq("deal_id", deal.id)
            .order("created_at", { ascending: true }),
        ]);

      if (dealProductsError) throw dealProductsError;

      const productsList = (productsData || []) as ProductRow[];
      const dealProductsList = (dealProductsData || []) as DealProductRow[];
      const productMap: Record<string, ProductRow | undefined> = {};
      for (const product of productsList) productMap[String(product.id)] = product;

      const missingProductIds = dealProductsList
        .map((item) => String(item.product_id))
        .filter((id) => id && !productMap[id]);
      if (missingProductIds.length) {
        const { data: extraProducts } = await db
          .from("products")
          .select("id,name,category,base_price,currency,is_active")
          .eq("company_id", profile.company_id)
          .in("id", Array.from(new Set(missingProductIds)));
        for (const product of (extraProducts || []) as ProductRow[]) {
          productMap[String(product.id)] = product;
        }
      }

      setActiveProducts(productsList);
      setDealProducts(dealProductsList);
      setDealProductsByProductId(productMap);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cargar la oportunidad del prospecto.");
    } finally {
      setLeadDealsLoading(false);
    }
  }, [profile?.company_id, selectedLeadId]);

  useEffect(() => {
    if (!detailOpen) return;
    void refreshLeadDeals();
  }, [detailOpen, refreshLeadDeals]);

  useRealtimeTable({
    table: "deal_products",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id && detailOpen),
    onChange: () => {
      void refreshLeadDeals();
    },
  });

  function leadNeedsFollowUp(lead: Lead) {
    const closed = lead.status === "Won" || lead.status === "Lost";
    if (closed) return false;
    if (!lead.assigned_to) return false;
    const sig = signalsByLeadId[lead.id];
    if (!sig) return false;
    return !sig.hasActiveTask;
  }

  function leadNeedsFollowUpUi(lead: Lead) {
    const closed = lead.status === "Won" || lead.status === "Lost";
    if (closed) return false;
    // Signal-based: no active next task
    if (leadNeedsFollowUp(lead)) return true;

    // Time-based heuristic: stale activity
    const last = lead.last_interaction_at || lead.updated_at || lead.created_at;
    const lastMs = last ? Date.parse(last) : NaN;
    if (!Number.isFinite(lastMs)) return false;
    const days = (Date.now() - lastMs) / 86400000;
    if (lead.status === "New" && days >= 0.75) return true;
    if (lead.status === "Contacted" && days >= 2) return true;
    if (lead.status === "Qualified" && days >= 3) return true;
    if (lead.status === "Proposal Sent" && days >= 4) return true;
    if (lead.status === "Negotiation" && days >= 3) return true;
    return false;
  }

  useEffect(() => {
    // Default sales-agent view: all assigned leads (not unassigned).
    if (role === "sales_agent" || role === "collaborator") setOwnerFilter("team");
  }, [role]);

  const isLeadAssignedToCurrentUser = (assignedTo?: string | null) => {
    if (!assignedTo) return false;
    return assignedTo === profile?.id || assignedTo === user?.id;
  };

  useEffect(() => {
    let cancelled = false;
    const loadTeam = async () => {
      if (!profile?.company_id) {
        setTeam([]);
        setTeamError(null);
        setTeamLoading(false);
        return;
      }

      setTeamLoading(true);
      setTeamError(null);

      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc(
        "get_company_team_members",
        {
          _search: null,
          _role: null,
          _is_active: true,
          _department: null,
        },
      );

      if (!cancelled && !rpcErr && Array.isArray(rpcData)) {
        setTeam(
          rpcData.map((r: any) => ({
            profile_id: r.profile_id,
            user_id: r.user_id,
            full_name: r.full_name,
            email: r.email ?? null,
            is_active: r.is_active !== false,
            role: r.role,
          })),
        );
        setTeamLoading(false);
        return;
      }

      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, user_id, full_name, email, is_active")
          .eq("company_id", profile.company_id)
          .eq("is_active", true),
        (supabase as any).from("user_roles").select("user_id, role"),
      ]);

      if (cancelled) return;
      if (pErr) {
        setTeamError(pErr.message);
        setTeam([]);
        setTeamLoading(false);
        return;
      }
      if (rErr) {
        setTeamError(rErr.message);
        setTeam([]);
        setTeamLoading(false);
        return;
      }

      const roleByUserId = new Map<string, string>();
      for (const row of roles || []) {
        if (!roleByUserId.has(row.user_id)) roleByUserId.set(row.user_id, row.role);
      }

      setTeam(
        (profiles || []).map((p: any) => ({
          profile_id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email ?? null,
          is_active: p.is_active !== false,
          role: roleByUserId.get(p.user_id) || "viewer",
        })),
      );
      setTeamLoading(false);
    };

    void loadTeam().catch((e: any) => {
      if (cancelled) return;
      setTeamError(e?.message ?? "No se pudo cargar el equipo");
      setTeam([]);
      setTeamLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  function getAssigneeUserId(assignedTo?: string | null) {
    const currentUserId = user?.id || profile?.user_id || null;
    if (!assignedTo) return currentUserId;

    const byUser = assigneeByUserId.get(assignedTo);
    if (byUser?.user_id) return byUser.user_id;

    const byProfile = assigneeByProfileId.get(assignedTo);
    if (byProfile?.user_id) return byProfile.user_id;

    if (assignedTo === user?.id || assignedTo === profile?.user_id) return assignedTo;
    if (assignedTo === profile?.id) return currentUserId;

    return currentUserId;
  }

  function getAssigneeProfileId(assignedTo?: string | null) {
    if (!assignedTo) return profile?.id || null;
    const byProfile = assigneeByProfileId.get(assignedTo);
    if (byProfile?.profile_id) return byProfile.profile_id;
    const byUser = assigneeByUserId.get(assignedTo);
    if (byUser?.profile_id) return byUser.profile_id;
    if (assignedTo === profile?.id) return assignedTo;
    return profile?.id || null;
  }

  function isWonStageName(name?: string | null) {
    const value = String(name || "").toLowerCase();
    return value.includes("won") || value.includes("ganad");
  }

  function isLostStageName(name?: string | null) {
    const value = String(name || "").toLowerCase();
    return value.includes("lost") || value.includes("perdid");
  }

  function findWonStageName() {
    return (
      dealStages.find((stage) => ["Won", "Closed Won", "Ganado"].includes(stage.name))?.name ||
      dealStages.find((stage) => isWonStageName(stage.name))?.name ||
      "Won"
    );
  }

  function findLostStageName() {
    return (
      dealStages.find((stage) => ["Lost", "Closed Lost", "Perdido"].includes(stage.name))?.name ||
      dealStages.find((stage) => isLostStageName(stage.name))?.name ||
      "Lost"
    );
  }

  function appendDealNote(existing: string | null, line: string) {
    const base = String(existing || "").trim();
    return base ? `${base}\n${line}` : line;
  }

  function getAssigneeLabel(lead: Lead) {
    if (!lead.assigned_to) return "Sin asignar";
    const member =
      assigneeByProfileId.get(lead.assigned_to) || assigneeByUserId.get(lead.assigned_to);
    const base = member?.full_name || "Asignado";
    if (isLeadAssignedToCurrentUser(lead.assigned_to)) return `${base} (Tú)`;
    return base;
  }

  async function getInitialDealStageName(companyId: string): Promise<string> {
    const { data, error } = await (supabase as any)
      .from("deal_stages")
      .select("name, display_order")
      .eq("company_id", companyId)
      .order("display_order", { ascending: true })
      .limit(1);
    if (!error && Array.isArray(data) && data[0]?.name) return String(data[0].name);
    return "New Opportunity";
  }

  async function handleCreateDealFromLead(lead: Lead) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }
    if (
      !enforceOwnLeadForSales(lead, "Solo puedes crear oportunidades para tus propios prospectos")
    )
      return;
    if (!can("deals.create")) {
      toast.error("No tienes permiso para crear oportunidades");
      return;
    }

    // Prevent accidental duplicates.
    const { data: existing, error: existingErr } = await (supabase as any)
      .from("deals")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) {
      toast.error(existingErr.message || "No se pudo validar si ya existe oportunidad");
      return;
    }
    if (existing?.id) {
      toast.message("Este prospecto ya tiene una oportunidad creada");
      await refreshLeadDeals();
      return;
    }

    const stageName = await getInitialDealStageName(profile.company_id);

    const leadName = getLeadName(lead);
    const companyOrName = lead.company_name || leadName;
    const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : null;
    const service = meta ? ((meta as any).selected_service ?? (meta as any).service) : null;
    const serviceLabel =
      typeof service === "string" && service.trim().length ? service.trim() : null;

    const dealName = serviceLabel
      ? `${serviceLabel} — ${companyOrName}`
      : `Oportunidad — ${companyOrName}`;
    const assignedTo = getAssigneeUserId(lead.assigned_to);
    const currency = normalizeCurrency(lead.currency || currencySettings.baseCurrency);
    const value = normalizeCurrencyAmount(lead.estimated_value || 0, currency);

    const payloadBase: Record<string, unknown> = {
      company_id: profile.company_id,
      lead_id: lead.id,
      name: dealName,
      value: Number.isFinite(value) ? value : 0,
      currency,
      probability: 50,
      expected_close: null,
      stage: stageName,
      assigned_to: assignedTo,
      created_by: profile.id,
      notes: null,
    };

    const { data: created, error: createErr } = await (supabase as any)
      .from("deals")
      .insert(payloadBase)
      .select("id")
      .single();

    // If company has custom stage names but DB still uses enum, retry with a safe default.
    if (
      createErr &&
      String(createErr.message || "")
        .toLowerCase()
        .includes("enum")
    ) {
      const { data: created2, error: createErr2 } = await (supabase as any)
        .from("deals")
        .insert({ ...payloadBase, stage: "New Opportunity" })
        .select("id")
        .single();
      if (createErr2) {
        toast.error(createErr2.message || "No se pudo crear la oportunidad");
        return;
      }
      toast.success("Oportunidad creada");
      await logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id,
        action: "deal_created",
        entityType: "deals",
        entityId: created2?.id ? String(created2.id) : null,
        detail: `Oportunidad creada desde prospecto: ${dealName}`,
        metadata: { lead_id: lead.id, stage: "New Opportunity" },
      }).catch(() => {});
      await refreshLeadDeals();
      void loadSignals();
      return created2;
    }

    if (createErr) {
      toast.error(createErr.message || "No se pudo crear la oportunidad");
      return;
    }

    toast.success("Oportunidad creada");
    await logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id,
      action: "deal_created",
      entityType: "deals",
      entityId: created?.id ? String(created.id) : null,
      detail: `Oportunidad creada desde prospecto: ${dealName}`,
      metadata: { lead_id: lead.id, stage: stageName },
    }).catch(() => {});
    await refreshLeadDeals();
    void loadSignals();
    return created;
  }

  async function updateDealStage(deal: DealRow, stage: string) {
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para editar oportunidades.");
      return;
    }
    const { error } = await (supabase as any).from("deals").update({ stage }).eq("id", deal.id);
    if (error) {
      toast.error(error.message || "No se pudo mover la oportunidad.");
      return;
    }
    setLeadDeals((current) =>
      current.map((item) => (item.id === deal.id ? { ...item, stage } : item)),
    );
    void logActivityEvent({
      companyId: profile?.company_id ?? "",
      userId: profile?.id || null,
      action: "deal_moved",
      entityType: "deals",
      entityId: deal.id,
      detail: `Oportunidad movida a ${stage}: ${deal.name}`,
      metadata: { stage, source: "leads" },
    }).catch(() => {});
    toast.success("Etapa actualizada.");
  }

  async function saveDealEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingDeal) return;
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para editar oportunidades.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const currency = normalizeCurrency(editingDeal.currency || currencySettings.baseCurrency);
    const value = normalizeCurrencyAmount(form.get("value"), currency);
    const payload = {
      name: String(form.get("name") || "").trim() || editingDeal.name,
      value: Number.isFinite(value) ? value : 0,
      currency,
      probability: Number(form.get("probability") || 50) || 50,
      expected_close: String(form.get("expected_close") || "").trim() || null,
      stage: String(form.get("stage") || editingDeal.stage),
    };

    setSavingDeal(true);
    try {
      const { error } = await (supabase as any)
        .from("deals")
        .update(payload)
        .eq("id", editingDeal.id);
      if (error) throw error;
      setLeadDeals((current) =>
        current.map((item) => (item.id === editingDeal.id ? { ...item, ...payload } : item)),
      );
      setEditingDeal(null);
      toast.success("Oportunidad actualizada.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar la oportunidad.");
    } finally {
      setSavingDeal(false);
    }
  }

  async function markDealWon(deal: DealRow) {
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para cerrar oportunidades.");
      return;
    }
    const stage = findWonStageName();
    const note = appendDealNote(
      deal.notes,
      `[${new Date().toISOString()}] Oportunidad marcada como ganada desde Prospectos.`,
    );
    setClosingDeal("won");
    try {
      const { error } = await (supabase as any)
        .from("deals")
        .update({ stage, notes: note })
        .eq("id", deal.id);
      if (error) throw error;
      if (selectedLeadId) {
        await update(selectedLeadId, { status: "Won" } as any).catch(() => {});
      }
      setLeadDeals((current) =>
        current.map((item) => (item.id === deal.id ? { ...item, stage, notes: note } : item)),
      );
      toast.success("Oportunidad marcada como ganada.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo marcar como ganada.");
    } finally {
      setClosingDeal(null);
    }
  }

  async function markDealLost() {
    if (!lostDeal) return;
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para cerrar oportunidades.");
      return;
    }
    const stage = findLostStageName();
    const note = appendDealNote(
      lostDeal.notes,
      `[${new Date().toISOString()}] Oportunidad marcada como perdida. Razón: ${lostReason}${
        lostNote.trim() ? `. Nota: ${lostNote.trim()}` : ""
      }.`,
    );
    setClosingDeal("lost");
    try {
      const { error } = await (supabase as any)
        .from("deals")
        .update({ stage, notes: note })
        .eq("id", lostDeal.id);
      if (error) throw error;
      if (selectedLeadId) {
        await update(selectedLeadId, { status: "Lost" } as any).catch(() => {});
      }
      setLeadDeals((current) =>
        current.map((item) => (item.id === lostDeal.id ? { ...item, stage, notes: note } : item)),
      );
      setLostDeal(null);
      setLostNote("");
      toast.success("Oportunidad marcada como perdida.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo marcar como perdida.");
    } finally {
      setClosingDeal(null);
    }
  }

  async function addDealProduct(deal: DealRow) {
    if (!profile?.company_id) return;
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para editar productos de la oportunidad.");
      return;
    }
    const productId = dealProductDraft.product_id;
    if (!productId) {
      toast.error("Selecciona un producto.");
      return;
    }
    if (dealProducts.some((item) => String(item.product_id) === productId)) {
      toast.message("Ese producto ya está asociado.");
      return;
    }
    const product = activeProducts.find((item) => String(item.id) === productId);
    const quantity = Math.max(1, Number(dealProductDraft.quantity || 1) || 1);
    const unitPrice =
      Number(dealProductDraft.unit_price || product?.base_price || deal.value || 0) || 0;

    const { error } = await (supabase as any).from("deal_products").insert({
      company_id: profile.company_id,
      deal_id: deal.id,
      product_id: productId,
      quantity,
      unit_price: unitPrice,
    });
    if (error) {
      toast.error(error.message || "No se pudo asociar el producto.");
      return;
    }
    setDealProductDraft({ product_id: "", quantity: "1", unit_price: "" });
    await refreshLeadDeals();
    toast.success("Producto asociado.");
  }

  async function removeDealProduct(rowId: string) {
    if (!profile?.company_id) return;
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para editar productos de la oportunidad.");
      return;
    }
    const { error } = await (supabase as any)
      .from("deal_products")
      .delete()
      .eq("company_id", profile.company_id)
      .eq("id", rowId);
    if (error) {
      toast.error(error.message || "No se pudo quitar el producto.");
      return;
    }
    setDealProducts((current) => current.filter((item) => item.id !== rowId));
    toast.success("Producto removido.");
  }

  async function createProjectFromWonDeal(deal: DealRow) {
    if (!profile?.company_id || !profile?.id) return;
    if (!can("projects.create")) {
      toast.error("No tienes permiso para crear proyectos.");
      return;
    }
    if (!isWonStageName(deal.stage)) {
      toast.error("Primero marca la oportunidad como ganada.");
      return;
    }
    const dealProduct = dealProducts[0];
    const product = dealProduct
      ? dealProductsByProductId[String(dealProduct.product_id)]
      : activeProducts[0];
    if (!product?.id) {
      toast.error("Asocia un producto antes de crear el proyecto.");
      return;
    }

    setCreatingProjectDealId(deal.id);
    try {
      const db = supabase as any;
      const { data: existingProject, error: existingError } = await db
        .from("projects")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("deal_id", deal.id)
        .eq("product_id", product.id)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingProject?.id) {
        toast.message("Esta oportunidad ya tiene proyecto creado.");
        return;
      }

      const { data: workflow, error: workflowError } = await db
        .from("product_workflows")
        .select("id,product_id,name,is_active")
        .eq("company_id", profile.company_id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (workflowError) throw workflowError;
      if (!workflow?.id) {
        toast.error("Este producto no tiene workflow activo.");
        return;
      }

      const { data: steps, error: stepsError } = await db
        .from("product_workflow_steps")
        .select(
          "id,workflow_id,product_id,title,description,step_order,default_priority,default_duration_days,assigned_role,is_active",
        )
        .eq("company_id", profile.company_id)
        .eq("workflow_id", workflow.id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("step_order", { ascending: true });
      if (stepsError) throw stepsError;
      const workflowSteps = (steps || []) as ProductWorkflowStepRow[];
      if (!workflowSteps.length) {
        toast.error("El workflow activo no tiene pasos.");
        return;
      }

      const startDate = new Date();
      const toDate = (date: Date) => date.toISOString().slice(0, 10);
      const addDays = (days: number) => {
        const next = new Date(startDate);
        next.setDate(next.getDate() + days);
        return toDate(next);
      };
      const totalDays = workflowSteps.reduce(
        (sum, step) => sum + Math.max(0, Number(step.default_duration_days || 0)),
        0,
      );

      const projectName = selectedLead?.company_name
        ? `${product.name} - ${selectedLead.company_name}`
        : `${product.name} - ${deal.name}`;
      const { data: project, error: projectError } = await db
        .from("projects")
        .insert({
          company_id: profile.company_id,
          name: projectName,
          deal_id: deal.id,
          lead_id: deal.lead_id || selectedLeadId,
          product_id: product.id,
          start_date: toDate(startDate),
          due_date: totalDays > 0 ? addDays(totalDays) : null,
          status: "Not Started",
          budget: Number(deal.value || 0),
          description: `Proyecto creado desde oportunidad ganada.\nProducto: ${product.name}\nWorkflow: ${workflow.name}`,
          progress: 0,
          manager: null,
        })
        .select("id")
        .single();
      if (projectError) throw projectError;

      let cursor = 0;
      const tasksPayload = workflowSteps.map((step) => {
        cursor += Math.max(1, Number(step.default_duration_days || 1));
        return {
          company_id: profile.company_id,
          title: step.title,
          description: step.description || null,
          status: "To Do",
          priority: step.default_priority || "Medium",
          assigned_to: getAssigneeUserId(deal.assigned_to),
          due_date: addDays(cursor),
          related_project_id: project.id,
          related_lead_id: deal.lead_id || selectedLeadId,
          related_deal_id: deal.id,
        };
      });
      const { error: tasksError } = await db.from("tasks").insert(tasksPayload);
      if (tasksError) throw tasksError;
      toast.success("Proyecto y tareas creados.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear el proyecto.");
    } finally {
      setCreatingProjectDealId(null);
    }
  }

  async function handleOpenWhatsAppFromLead(lead: Lead) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }

    setOpeningWhatsapp(true);
    try {
      const { data, error } = await (supabase as any)
        .from("crm_whatsapp_conversation_list")
        .select("conversation_id, last_message_at, conversation_updated_at")
        .eq("company_id", profile.company_id)
        .eq("lead_id", lead.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("conversation_updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        toast.error(error.message || "No se pudo buscar la conversación");
        return;
      }

      const conversationId = data?.conversation_id ? String(data.conversation_id) : null;
      if (conversationId) {
        window.location.href = `/whatsapp?conversationId=${encodeURIComponent(conversationId)}`;
        return;
      }

      const normalized = normalizePhoneForWhatsApp(lead.whatsapp || lead.phone);
      if (!normalized) {
        toast.error("Este prospecto no tiene teléfono disponible.");
        return;
      }

      window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo abrir WhatsApp";
      toast.error(message);
    } finally {
      setOpeningWhatsapp(false);
    }
  }

  async function handleConvertLeadToClient(lead: Lead) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }
    if (!enforceOwnLeadForSales(lead, "Solo puedes convertir a cliente tus propios prospectos"))
      return;
    if (!can("clients.create")) {
      toast.error("No tienes permiso para convertir a cliente");
      return;
    }

    setConvertingClient(true);
    try {
      const companyId = profile.company_id;

      // Duplicate check: prefer email, then phone (clients has no lead_id column in this repo).
      if (lead.email) {
        const { data: existingByEmail, error: emailErr } = await (supabase as any)
          .from("clients")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", lead.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (emailErr) {
          toast.error(emailErr.message || "No se pudo validar duplicados");
          return;
        }
        if (existingByEmail?.id) {
          toast.message("Este prospecto ya fue convertido en cliente.");
          window.location.href = "/clients";
          return;
        }
      } else {
        const phoneCandidate = lead.phone || lead.whatsapp;
        if (phoneCandidate) {
          const digits = phoneCandidate.replace(/\D/g, "");
          const phoneMatch = digits.length ? digits : phoneCandidate;
          const { data: existingByPhone, error: phoneErr } = await (supabase as any)
            .from("clients")
            .select("id")
            .eq("company_id", companyId)
            .or(`phone.eq.${phoneMatch},whatsapp.eq.${phoneMatch}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (phoneErr) {
            toast.error(phoneErr.message || "No se pudo validar duplicados");
            return;
          }
          if (existingByPhone?.id) {
            toast.message("Este prospecto ya fue convertido en cliente.");
            window.location.href = "/clients";
            return;
          }
        }
      }

      const leadName = getLeadName(lead);
      const companyName =
        lead.company_name?.trim() ||
        leadName ||
        lead.email ||
        lead.phone ||
        lead.whatsapp ||
        "Cliente sin nombre";

      const contactPerson = leadName || null;
      const phone = lead.phone || lead.whatsapp || null;
      const whatsapp = lead.whatsapp || lead.phone || null;

      const accountManagerProfileId = lead.assigned_to || profile.id || null;

      const { data: created, error: createErr } = await (supabase as any)
        .from("clients")
        .insert({
          company_id: companyId,
          company_name: companyName,
          contact_person: contactPerson,
          email: lead.email || null,
          phone,
          whatsapp,
          status: "Active",
          account_manager: accountManagerProfileId,
          notes: lead.notes || null,
        })
        .select("id")
        .single();

      if (createErr) {
        toast.error(createErr.message || "No se pudo convertir a cliente");
        return;
      }

      toast.success("Cliente creado correctamente.");
      await logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id,
        action: "client_created",
        entityType: "clients",
        entityId: created?.id ? String(created.id) : null,
        detail: `Cliente creado desde prospecto: ${companyName}`,
        metadata: { lead_id: lead.id },
      }).catch(() => {});
      window.location.href = "/clients";
      return created;
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo convertir a cliente";
      toast.error(message);
    } finally {
      setConvertingClient(false);
    }
  }

  function openFollowUpDialog(lead: Lead) {
    const canCreateFollowUp =
      can("tasks.create") && (canViewAllLeads || isLeadAssignedToCurrentUser(lead.assigned_to));
    if (!canCreateFollowUp) {
      toast.error("No tienes permiso para crear seguimiento");
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    const leadLabel =
      lead.company_name ||
      getLeadName(lead) ||
      lead.email ||
      lead.phone ||
      lead.whatsapp ||
      "prospecto";
    const sourceHint = lead.source_channel || lead.source || "—";
    setSelectedLeadId(lead.id);
    openGlobalTaskCreate({
      initialValues: {
        title: `Dar seguimiento a ${leadLabel}`,
        dueDate,
        priority: "Medium",
        description: `Seguimiento creado desde Prospectos.\nFuente: ${sourceHint}`,
        assignedTo: getAssigneeUserId(lead.assigned_to) || undefined,
        leadId: lead.id,
      },
    });
  }

  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((l) => {
      const t = Date.parse(String(l.created_at || ""));
      if (!Number.isFinite(t)) return false;
      return (Date.now() - t) / 86400000 <= 7;
    }).length;
    const needsFollowUp = leads.filter((l) => leadNeedsFollowUpUi(l)).length;
    const readyForProposal = leads.filter((l) => l.status === "Qualified").length;
    const potentialValue = leads
      .filter((l) => !["Won", "Lost"].includes(String(l.status || "")))
      .reduce(
        (sum, l) =>
          sum +
          readLeadPipelineBaseValue(
            l,
            signalsByLeadId[l.id],
            currencySettings.baseCurrency,
            currencySettings.usdToDopRate,
          ),
        0,
      );
    return { total, newLeads, needsFollowUp, readyForProposal, potentialValue };
  }, [currencySettings.baseCurrency, currencySettings.usdToDopRate, leads, signalsByLeadId]);

  const tabCounts = useMemo(() => {
    const all = leads.length;
    const newCount = leads.filter((l) => l.status === "New").length;
    const discovery = leads.filter((l) => l.status === "Contacted").length;
    const qualified = leads.filter(
      (l) => l.status === "Qualified" || l.status === "Negotiation",
    ).length;
    const proposalReady = leads.filter((l) => l.status === "Qualified").length;
    const proposalSent = leads.filter(
      (l) => l.status === "Proposal Sent" || l.status === "Negotiation",
    ).length;
    const closed = leads.filter((l) => l.status === "Won" || l.status === "Lost").length;
    return {
      all,
      new: newCount,
      discovery,
      qualified,
      proposal_ready: proposalReady,
      proposal_sent: proposalSent,
      closed,
    };
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const isOwnLead = isLeadAssignedToCurrentUser(lead.assigned_to);
      const isAssignedLead = Boolean(lead.assigned_to);
      const matchSearch = `${getLeadName(lead)} ${lead.company_name || ""} ${lead.email || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchChannel = channelFilter === "all" || getLeadChannelKey(lead) === channelFilter;
      const matchOwner = isSalesUser
        ? ownerFilter === "mine"
          ? isOwnLead
          : isAssignedLead
        : ownerFilter === "all" ||
          (ownerFilter === "mine" && isOwnLead) ||
          (ownerFilter === "team" && !!lead.assigned_to) ||
          (ownerFilter === "unassigned" && !lead.assigned_to);
      const value = readLeadPipelineBaseValue(
        lead,
        signalsByLeadId[lead.id],
        currencySettings.baseCurrency,
        currencySettings.usdToDopRate,
      );
      const matchValue =
        valueFilter === "all" ||
        (valueFilter === "low" && value < 5000) ||
        (valueFilter === "mid" && value >= 5000 && value < 15000) ||
        (valueFilter === "high" && value >= 15000);
      const matchTab =
        stageTab === "all" ||
        (stageTab === "new" && lead.status === "New") ||
        (stageTab === "discovery" && lead.status === "Contacted") ||
        (stageTab === "qualified" &&
          (lead.status === "Qualified" || lead.status === "Negotiation")) ||
        (stageTab === "proposal_ready" && lead.status === "Qualified") ||
        (stageTab === "proposal_sent" &&
          (lead.status === "Proposal Sent" || lead.status === "Negotiation")) ||
        (stageTab === "closed" && (lead.status === "Won" || lead.status === "Lost"));

      const isToday = (() => {
        const todayKey = toDateKey(new Date().toISOString());
        if (!todayKey) return false;
        const lastKey = toDateKey(lead.last_interaction_at || lead.updated_at || lead.created_at);
        return !!lastKey && lastKey === todayKey;
      })();

      const highIntent = (() => {
        const valueHigh =
          readLeadPipelineBaseValue(
            lead,
            signalsByLeadId[lead.id],
            currencySettings.baseCurrency,
            currencySettings.usdToDopRate,
          ) >= 15000;
        const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : null;
        const hot = meta
          ? Boolean(
              (meta as any).is_hot_lead ??
              (meta as any).ready_for_sales ??
              (meta as any).high_intent,
            )
          : false;
        return valueHigh || hot;
      })();

      const hasProposal = lead.status === "Proposal Sent" || lead.status === "Negotiation";
      const matchChip =
        leadChipFilter === "all" ||
        (leadChipFilter === "no_followup" && leadNeedsFollowUpUi(lead)) ||
        (leadChipFilter === "today" && isToday) ||
        (leadChipFilter === "high_intent" && highIntent) ||
        (leadChipFilter === "no_owner" && !lead.assigned_to) ||
        (leadChipFilter === "with_proposal" && hasProposal) ||
        (leadChipFilter === "without_proposal" && !hasProposal);

      return (
        matchSearch &&
        matchStatus &&
        matchSource &&
        matchChannel &&
        matchOwner &&
        matchValue &&
        matchTab &&
        matchChip
      );
    });
  }, [
    channelFilter,
    isSalesUser,
    leadChipFilter,
    leads,
    ownerFilter,
    search,
    signalsByLeadId,
    sourceFilter,
    stageTab,
    statusFilter,
    user?.id,
    profile?.id,
    valueFilter,
    currencySettings.baseCurrency,
    currencySettings.usdToDopRate,
  ]);

  function enforceOwnLeadForSales(lead: Lead, message: string) {
    if (!isSalesUser) return true;
    if (!isLeadAssignedToCurrentUser(lead.assigned_to)) {
      toast.error(message);
      return false;
    }
    return true;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can(editLead ? "leads.edit" : "leads.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const currency = normalizeCurrency(
      String(fd.get("currency") || editLead?.currency || currencySettings.baseCurrency),
    );
    const data = {
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      company_name: (fd.get("company_name") as string) || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      source: (fd.get("source") as string) || "Website",
      status: (fd.get("status") as string) || "New",
      estimated_value: normalizeCurrencyAmount(fd.get("estimated_value"), currency),
      currency,
      notes: (fd.get("notes") as string) || null,
    };

    try {
      if (editLead) {
        await update(editLead.id, data);
        void sendLeadNotification(
          "Prospecto actualizado",
          `${data.first_name || "Prospecto"} ${data.last_name || ""}`.trim() || "Prospecto",
        );
        toast.success("Prospecto actualizado");
      } else {
        await create(data);
        void sendLeadNotification(
          "Prospecto creado",
          `${data.first_name || "Prospecto"} ${data.last_name || ""}`.trim() || "Prospecto",
        );
        toast.success("Prospecto creado");
      }
      setDialogOpen(false);
      setEditLead(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message?: unknown }).message || "No se pudo guardar el lead")
            : "No se pudo guardar el lead";

      const isDuplicatePhone =
        message.toLowerCase().includes("duplicate key") &&
        message.includes("ux_leads_company_phone");

      if (isDuplicatePhone) {
        toast.error(
          "Ya existe un lead con ese teléfono. Busca el contacto existente antes de crear otro.",
        );
        return;
      }

      toast.error(`No se pudo guardar lead: ${message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!can("leads.delete")) {
      toast.error("No tienes permiso para eliminar");
      return;
    }
    try {
      await remove(deleteId);
      toast.success("Prospecto eliminado");
      setDeleteId(null);
      if (selectedLeadId === deleteId) {
        setSelectedLeadId(null);
        setDetailOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar";
      toast.error(message);
    }
  };

  const openEdit = (lead: Lead) => {
    if (!enforceOwnLeadForSales(lead, "Solo puedes editar tus propios prospectos")) return;
    setEditLead(lead);
    setDialogOpen(true);
  };

  const openDetail = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setDetailOpen(true);
  };

  useEffect(() => {
    const leadId = routeSearch.leadId;
    if (!leadId) return;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    setSelectedLeadId(lead.id);
    setDetailOpen(true);
  }, [leads, routeSearch.leadId]);

  useEffect(() => {
    const openDemoLeadFromStorage = () => {
      try {
        const storedLeadId = localStorage.getItem("crm_demo_lead_id");
        if (!storedLeadId) return;
        setSelectedLeadId(storedLeadId);
        setDetailOpen(true);
      } catch {}
    };

    const onDemoOpenLeadDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ leadId?: string; open?: boolean }>).detail;
      const leadId = detail?.leadId || "10000000-0000-4000-8000-000000000102";

      setSelectedLeadId((current) => (current === leadId ? current : leadId));
      setDetailOpen((current) => (current ? current : true));
    };

    openDemoLeadFromStorage();

    window.addEventListener("crm-demo-open-lead-detail", onDemoOpenLeadDetail);
    return () => window.removeEventListener("crm-demo-open-lead-detail", onDemoOpenLeadDetail);
  }, []);

  if (loading) return <LoadingState />;

  const stageTabs = [
    { key: "all", label: "Todos", countKey: "all" },
    { key: "new", label: "Nuevos", countKey: "new" },
    { key: "discovery", label: "Discovery", countKey: "discovery" },
    { key: "qualified", label: "Calificados", countKey: "qualified" },
    { key: "proposal_ready", label: "Propuesta lista", countKey: "proposal_ready" },
    { key: "proposal_sent", label: "Propuesta enviada", countKey: "proposal_sent" },
    { key: "closed", label: "Cerrados", countKey: "closed" },
  ];
  const quickFilters = [
    { key: "all", label: "Todos" },
    { key: "no_followup", label: "Sin seguimiento" },
    { key: "today", label: "Hoy" },
    { key: "high_intent", label: "Alta intención" },
    { key: "no_owner", label: "Sin responsable" },
    { key: "with_proposal", label: "Con propuesta" },
    { key: "without_proposal", label: "Sin propuesta" },
  ];
  const mobileStageFilters = [
    { key: "all", label: "Todas las etapas", countKey: "all" },
    { key: "new", label: "Nuevos", countKey: "new" },
    { key: "qualified", label: "Calificados", countKey: "qualified" },
    { key: "proposal_sent", label: "Con propuesta", countKey: "proposal_sent" },
    { key: "closed", label: "Cerrados", countKey: "closed" },
  ];
  const mobileQuickFilters = [
    { key: "all", label: "Todos los focos" },
    { key: "no_followup", label: "Sin seguimiento" },
    { key: "today", label: "Actividad hoy" },
    { key: "high_intent", label: "Alta intención" },
    { key: "no_owner", label: "Sin responsable" },
  ];
  return (
    <div data-demo="leads-main" className="min-h-[calc(100vh-72px)] bg-white text-[#101828]">
      <div className="grid min-h-[calc(100vh-72px)] grid-cols-1">
        <div className="w-full min-w-0 overflow-auto px-3 py-3 sm:px-4 lg:px-5">
          <div className="mb-3 hidden md:block">
            <PageHeader
              title="Leads"
              subtitle={`Gestiona contactos, seguimientos y oportunidades desde una sola lista. ${stats.total} prospectos.`}
            />
          </div>

          <GlobalKpiStrip
            title="Leads"
            subtitle="Prospectos, seguimientos y oportunidades"
            actionLabel={can("leads.create") ? "Nuevo prospecto" : undefined}
            onAction={
              can("leads.create")
                ? () => {
                    setEditLead(null);
                    setDialogOpen(true);
                  }
                : undefined
            }
            actionIcon={<Plus className="h-3.5 w-3.5" />}
            items={[
              {
                key: "leads-summary",
                label: "Potencial",
                value: formatCurrency(stats.potentialValue, currencySettings.baseCurrency),
                helper: `${filtered.length} visibles de ${stats.total} prospectos`,
                icon: Target,
                tone: "purple",
                meta: [
                  { label: "Nuevos", value: stats.newLeads, tone: "blue" },
                  { label: "Seguimiento", value: stats.needsFollowUp, tone: "red" },
                  { label: "Propuesta", value: stats.readyForProposal, tone: "purple" },
                ],
              },
            ]}
          >
            <div className="mt-2 grid w-full grid-cols-2 gap-2">
              <Select value={stageTab} onValueChange={(value) => setStageTab(value as StageTab)}>
                <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mobileStageFilters.map((tab) => (
                    <SelectItem key={tab.key} value={tab.key}>
                      {tab.label} · {tabCounts[tab.countKey as keyof typeof tabCounts]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={leadChipFilter}
                onValueChange={(value) => setLeadChipFilter(value as LeadChipFilter)}
              >
                <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mobileQuickFilters.map((filter) => (
                    <SelectItem key={filter.key} value={filter.key}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GlobalKpiStrip>

          <section
            data-demo="leads-insights-bar"
            className="hidden grid-cols-4 gap-x-8 gap-y-4 md:grid"
          >
            <LeadKpi label="Total" value={stats.total} />
            <LeadKpi label="Nuevos" value={stats.newLeads} tone="info" />
            <LeadKpi
              label="Seguimiento"
              value={stats.needsFollowUp}
              tone={leadRiskTone(stats.needsFollowUp, 1, 5)}
            />
            <LeadKpi
              label="Potencial"
              value={formatCurrency(stats.potentialValue, currencySettings.baseCurrency)}
              tone="success"
            />
          </section>

          {false && import.meta.env.DEV && (
            <div className="mb-5 rounded-[16px] border border-[#e6eaf0] bg-white/75 px-4 py-3 text-xs text-[#667085] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div>Debug (DEV only)</div>
              <div>
                User: <span className="font-mono">{user?.email || "—"}</span>
              </div>
              <div>
                company_id: <span className="font-mono">{profile?.company_id || "—"}</span>
              </div>
            </div>
          )}

          <section className="mt-4 border-y border-slate-100 bg-white md:mt-0 md:overflow-hidden">
            <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:flex">
              <div className="flex flex-wrap items-center gap-2">
                {can("leads.create") && (
                  <CrmDetailLineButton
                    data-demo="leads-new-lead-button"
                    className="h-9 border-blue-600 bg-blue-600 px-3 text-white hover:border-blue-700 hover:bg-blue-700 hover:text-white"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => {
                      setEditLead(null);
                      setDialogOpen(true);
                    }}
                  >
                    Nuevo prospecto
                  </CrmDetailLineButton>
                )}
                <CrmDetailLineButton
                  icon={<Sidebar className="h-4 w-4" />}
                  onClick={() => setDetailOpen((current) => !current)}
                >
                  Ver detalle
                </CrmDetailLineButton>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar leads..."
                  className="h-9 w-72 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 md:flex">
              {stageTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={cn(
                    "flex h-8 items-center gap-1.5 border-b px-1 text-[12px] font-normal text-slate-500 transition hover:border-slate-300 hover:text-slate-950",
                    stageTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent",
                  )}
                  onClick={() => setStageTab(tab.key as StageTab)}
                  type="button"
                >
                  {tab.label}
                  <span className="opacity-75">
                    {tabCounts[tab.countKey as keyof typeof tabCounts]}
                  </span>
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                {[{ key: "all" as const, label: "Todos" }].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cn(
                      "h-8 border-b px-1 text-[12px] font-normal transition",
                      channelFilter === c.key
                        ? "border-slate-950 text-slate-950"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-950",
                    )}
                    onClick={() => setChannelFilter(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden border-b border-slate-100 px-4 py-2 md:block">
              <div className="hidden flex-wrap items-center gap-2 md:flex">
                <span className="text-[12px] font-normal text-slate-500">Filtros rápidos:</span>
                {quickFilters.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cn(
                      "h-8 border-b px-1 text-[11.5px] font-normal transition",
                      leadChipFilter === c.key
                        ? "border-slate-950 text-slate-950"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-950",
                    )}
                    onClick={() => setLeadChipFilter(c.key as LeadChipFilter)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#eaf1ff] text-[#1d62f9]">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-[16px] font-semibold tracking-[-0.015em]">
                  {leads.length === 0
                    ? "No hay prospectos todavía."
                    : "No hay prospectos con este filtro."}
                </h3>
                <p className="mt-2 text-sm font-[650] text-[#667085]">
                  {leads.length === 0
                    ? "Cuando alguien contacte por WhatsApp, email o formulario, aparecerá aquí si muestra interés comercial."
                    : "Prueba ajustando los filtros o la búsqueda."}
                </p>
                {can("leads.create") && (
                  <Button
                    className="mt-4 bg-[#1d62f9]"
                    onClick={() => {
                      setEditLead(null);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo prospecto
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-0 md:hidden">
                  {filtered.map((lead, index) => {
                    const isSelected = selectedLeadId === lead.id;
                    const interest = getInterestLabel(lead) || "Sin interés definido";
                    const needsFollowUp = leadNeedsFollowUpUi(lead);
                    const nextStep = getNextStepLabel(lead, needsFollowUp);
                    const lastActivity =
                      lead.last_interaction_at || lead.updated_at || lead.created_at;
                    const companyLabel =
                      (lead.company_name || "").trim() || getLeadPrimaryLabel(lead);
                    const personLabel =
                      getLeadName(lead) !== "Prospecto sin nombre"
                        ? getLeadName(lead)
                        : lead.email || lead.whatsapp || lead.phone || "—";
                    const sourceLabel = getLeadSourceDisplay(lead);

                    return (
                      <article
                        key={lead.id}
                        data-demo={index === 0 ? "leads-first-mobile-card" : undefined}
                        className={cn(
                          "border-b border-slate-100 bg-white px-4 py-3 text-left transition-colors active:scale-[0.992] hover:bg-slate-50/40",
                          isSelected && "bg-blue-50/30",
                        )}
                      >
                        <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => openDetail(lead)}
                            className={cn(
                              "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-[12px] font-semibold",
                              getAvatarTone(index),
                            )}
                          >
                            {getInitials(lead)}
                          </button>
                          <button
                            type="button"
                            onClick={() => openDetail(lead)}
                            className="min-w-0 pt-0.5 text-left"
                          >
                            <div className="truncate text-[15px] font-normal leading-5 text-slate-950">
                              {companyLabel}
                            </div>
                            <div className="mt-0.5 truncate text-[12.5px] font-normal leading-4 text-slate-500">
                              {personLabel}
                            </div>
                          </button>
                          <span
                            className={cn(
                              "inline-flex min-h-6 max-w-[92px] shrink-0 items-center rounded-full px-2.5 text-[11px] font-bold",
                              getStatusTone(lead.status),
                            )}
                          >
                            {getStatusLabel(lead.status)}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 pl-[76px] max-[380px]:pl-0">
                          <div className="min-w-0">
                            <div className="text-[10px] font-normal uppercase text-slate-400">
                              Interés
                            </div>
                            <div className="mt-1 truncate text-[12.5px] font-normal text-slate-600">
                              {interest}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-normal uppercase text-slate-400">
                              Valor
                            </div>
                            <div className="mt-1 truncate text-[12.5px] font-normal text-slate-900">
                              {formatLeadPipelineOriginalValue(lead, signalsByLeadId[lead.id])}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-[12.5px] font-normal text-slate-600">
                              {nextStep}
                            </span>
                            {needsFollowUp ? (
                              <span className="shrink-0 rounded-full bg-[#fff1f3] px-2 py-0.5 text-[10px] font-bold text-[#e11d48]">
                                Seguimiento
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[12px] font-normal text-slate-400">
                            <span className="truncate">
                              {getSourceLabel(sourceLabel)} · {getAssigneeLabel(lead)}
                            </span>
                            <span className="shrink-0">{formatRelativeDate(lastActivity)}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              className="inline-flex h-8 items-center border-b border-slate-200 bg-transparent px-0 text-[12px] font-normal text-slate-950"
                              onClick={() => openDetail(lead)}
                              type="button"
                            >
                              Ver
                            </button>
                            <button
                              className="inline-flex h-8 items-center border-b border-emerald-200 bg-transparent px-0 text-[12px] font-normal text-emerald-700"
                              onClick={() => void handleOpenWhatsAppFromLead(lead)}
                              type="button"
                            >
                              Contactar
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-[1500px] w-full border-collapse table-auto">
                    <thead>
                      <tr>
                        <th className="w-[210px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Nombre</th>
                        <th className="w-[190px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Empresa</th>
                        <th className="w-[220px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Email</th>
                        <th className="w-[150px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Teléfono</th>
                        <th className="w-[120px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Valor</th>
                        <th className="w-[170px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Etiquetas</th>
                        <th className="w-[170px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Responsable</th>
                        <th className="w-[165px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Estado</th>
                        <th className="w-[135px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Fuente</th>
                        <th className="w-[145px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Último contacto</th>
                        <th className="w-[130px] border-b border-slate-100 bg-white px-3 py-2 text-left text-[11px] font-normal text-slate-500">Creado</th>
                        <th className="w-[145px] border-b border-slate-100 bg-white px-3 py-2 text-right text-[11px] font-normal text-slate-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((lead, index) => {
                        const isSelected = selectedLeadId === lead.id;
                        const lastActivity = lead.last_interaction_at || lead.updated_at || lead.created_at;
                        const sourceLabel = getLeadSourceDisplay(lead);
                        const tags = getLeadTags(lead);

                        return (
                          <tr
                            key={lead.id}
                            className={cn(
                              "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/40",
                              isSelected && "bg-blue-50/30",
                            )}
                            onClick={() => openDetail(lead)}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2.5">
                                <div className={cn(
                                  "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                                  getAvatarTone(index),
                                )}>
                                  {getInitials(lead)}
                                </div>
                                <span className="truncate text-[13px] font-normal text-slate-900">{getLeadName(lead)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-[13px] font-normal text-slate-600">{lead.company_name || "—"}</td>
                            <td className="px-3 py-2 text-[13px] font-normal text-slate-600">{lead.email || "—"}</td>
                            <td className="px-3 py-2 text-[13px] font-normal text-slate-600">{lead.phone || lead.whatsapp || "—"}</td>
                            <td className="px-3 py-2 text-[13px] font-normal text-slate-900">
                              {formatLeadPipelineOriginalValue(lead, signalsByLeadId[lead.id])}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {tags.length ? tags.map((tag) => (
                                  <span key={tag} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{tag}</span>
                                )) : <span className="text-[12px] text-slate-400">—</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 text-[13px] font-normal text-slate-600">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#0f172a,#64748b)] text-[10px] font-semibold text-white">
                                  {getAssigneeLabel(lead).slice(0, 2).toUpperCase()}
                                </span>
                                <span className="truncate">{getAssigneeLabel(lead)}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                              <Select
                                value={lead.status}
                                onValueChange={(value) => void handleInlineStatusChange(lead, value)}
                                disabled={updatingLeadStatusId === lead.id || !can("leads.edit")}
                              >
                                <SelectTrigger className={cn(
                                  "h-7 w-[150px] rounded-md border px-2 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0",
                                  getStatusTone(lead.status),
                                )}>
                                  <SelectValue>{getStatusLabel(lead.status)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <span className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                                getSourceTone(sourceLabel),
                              )}>
                                {getSourceLabel(sourceLabel)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-[13px] font-normal text-slate-700">{formatRelativeDate(lastActivity)}</div>
                              <div className="mt-0.5 text-[11px] text-slate-400">{formatDateShort(lastActivity)}</div>
                            </td>
                            <td className="px-3 py-2 text-[13px] font-normal text-slate-600">{formatDateShort(lead.created_at)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="inline-flex h-7 items-center border-b border-slate-200 bg-transparent px-0 text-[11.5px] font-normal text-slate-950 hover:border-slate-400"
                                  onClick={(event) => { event.stopPropagation(); openDetail(lead); }}
                                  type="button"
                                >Ver</button>
                                <button
                                  className="inline-flex h-7 items-center border-b border-emerald-200 bg-transparent px-0 text-[11.5px] font-normal text-emerald-700 hover:border-emerald-500"
                                  onClick={(event) => { event.stopPropagation(); void handleOpenWhatsAppFromLead(lead); }}
                                  type="button"
                                >Contactar</button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="grid h-7 w-7 shrink-0 place-items-center border-b border-slate-200 bg-transparent text-slate-500 hover:border-slate-400"
                                      onClick={(event) => event.stopPropagation()}
                                      type="button"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDetail(lead)}>Ver</DropdownMenuItem>
                                    <DropdownMenuItem disabled={!can("leads.edit")} onClick={() => can("leads.edit") && openEdit(lead)}>Editar</DropdownMenuItem>
                                    <DropdownMenuItem disabled={!can("deals.create")} onClick={() => void handleCreateDealFromLead(lead)}>Crear oportunidad</DropdownMenuItem>
                                    <DropdownMenuItem disabled={!can("tasks.create")} onClick={() => openFollowUpDialog(lead)}>Crear seguimiento</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5 text-[12px] font-normal text-slate-500">
                  <span>
                    Mostrando {filtered.length ? 1 : 0} a {filtered.length} de {leads.length} leads
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="grid h-[34px] w-[34px] place-items-center border-b border-transparent text-[#475467] transition hover:border-slate-300">
                      ‹
                    </button>
                    <button className="grid h-[34px] w-[34px] place-items-center border-b border-blue-600 font-normal text-[#1d62f9]">
                      1
                    </button>
                    <button className="grid h-[34px] w-[34px] place-items-center border-b border-transparent text-[#475467] transition hover:border-slate-300">
                      ›
                    </button>
                  </div>
                  <label className="flex items-center gap-2">
                    Filas por página
                    <select className="h-[38px] border-0 border-b border-slate-200 bg-white px-0 font-normal text-[#475467] outline-none">
                      <option>20</option>
                      <option>50</option>
                      <option>100</option>
                    </select>
                  </label>
                </div>
              </>
            )}
          </section>
        </div>

        <DetailSheet
          open={detailOpen && !!selectedLead}
          onClose={() => setDetailOpen(false)}
          title={selectedLead ? getLeadPrimaryLabel(selectedLead) : "Detalle del lead"}
          subtitle={selectedLead ? getLeadSecondaryLabel(selectedLead) : undefined}
          status={selectedLead?.status}
          accent="blue"
          size="lg"
          presentation="modal"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          badges={
            selectedLead ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                  getSourceTone(getLeadSourceDisplay(selectedLead)),
                )}
              >
                {getSourceLabel(getLeadSourceDisplay(selectedLead))}
              </span>
            ) : null
          }
          fields={[]}
        >
          {selectedLead ? (
            <Tabs defaultValue="overview" className="w-full space-y-4">
              <TabsList
                data-demo="lead-detail-tabs"
                className="flex h-auto w-full justify-start overflow-x-auto rounded-none border-b border-slate-100 bg-white p-0"
              >
                {[
                  ["overview", "Resumen", Users],
                  ["followup", "Seguimiento", Calendar],
                  ["opportunity", "Oportunidad", Target],
                  ["notes", "Notas", FileText],
                  ["activity", "Actividad", Check],
                ].map(([value, label, Icon]) => {
                  const TabIcon = Icon as typeof Users;
                  return (
                    <TabsTrigger
                      key={String(value)}
                      value={String(value)}
                      className="min-w-fit shrink-0 gap-1.5 rounded-none border-b-2 border-transparent bg-white px-3 py-2.5 text-xs font-normal text-slate-500 shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                    >
                      <TabIcon className="hidden h-3.5 w-3.5 sm:block" />
                      {String(label)}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="overview" className="space-y-4 data-[state=inactive]:hidden">
                <div data-demo="leads-quick-actions">
                  <CrmDetailSection
                    title="Acciones rápidas"
                    icon={<Target className="h-3.5 w-3.5" />}
                    action={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <CrmDetailLineButton className="h-8">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            Más
                          </CrmDetailLineButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={!can("leads.edit")}
                            onClick={() => can("leads.edit") && openEdit(selectedLead)}
                          >
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!can("leads.delete")}
                            onClick={() => can("leads.delete") && setDeleteId(selectedLead.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  >
                    <CrmDetailActionGrid
                      actions={[
                        {
                          key: "whatsapp",
                          label: openingWhatsapp ? "Abriendo..." : "Abrir WhatsApp",
                          icon: <MessageCircle className="h-4 w-4" />,
                          tone: "success",
                          onClick: () => void handleOpenWhatsAppFromLead(selectedLead),
                          disabled:
                            openingWhatsapp ||
                            !normalizePhoneForWhatsApp(selectedLead.whatsapp || selectedLead.phone),
                          title: !normalizePhoneForWhatsApp(
                            selectedLead.whatsapp || selectedLead.phone,
                          )
                            ? "Este prospecto no tiene teléfono o WhatsApp válido."
                            : undefined,
                        },
                        {
                          key: "email",
                          label: "Email",
                          icon: <Mail className="h-4 w-4" />,
                          onClick: () => {
                            if (!selectedLead.email) {
                              toast.message("Este prospecto no tiene email");
                              return;
                            }
                            window.location.href = `mailto:${selectedLead.email}`;
                          },
                        },
                        {
                          key: "call",
                          label: "Llamar",
                          icon: <Phone className="h-4 w-4" />,
                          onClick: () => {
                            if (!selectedLead.phone) {
                              toast.message("Este prospecto no tiene teléfono");
                              return;
                            }
                            window.location.href = `tel:${selectedLead.phone}`;
                          },
                        },
                        {
                          key: "follow-up",
                          label: "Crear seguimiento",
                          icon: <Calendar className="h-4 w-4" />,
                          onClick: () => openFollowUpDialog(selectedLead),
                          disabled:
                            !can("tasks.create") ||
                            (isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to)),
                          title: !can("tasks.create")
                            ? "No tienes permiso para crear seguimiento."
                            : isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to)
                              ? "Solo puedes crear seguimiento para tus propios prospectos."
                              : undefined,
                        },
                        {
                          key: "proposal",
                          label: "Crear propuesta",
                          icon: <FileText className="h-4 w-4" />,
                          onClick: () => setQuickProposalOpen(true),
                          disabled:
                            !can("deals.create") ||
                            (isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to)),
                          title: !can("deals.create")
                            ? "No tienes permiso para crear propuestas."
                            : isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to)
                              ? "Solo puedes crear propuestas para tus propios prospectos."
                              : undefined,
                        },
                      ]}
                    />
                    <div className="pt-2 text-[11px] font-normal text-slate-500">
                      {!can("leads.edit")
                        ? "No tienes permiso para editar este prospecto."
                        : "Edita, contacta y avanza este prospecto desde aquí."}
                    </div>
                  </CrmDetailSection>
                </div>
              </TabsContent>

              <TabsContent value="followup" className="space-y-4 data-[state=inactive]:hidden">
                <div data-demo="leads-followup">
                  <CrmDetailSection
                    title="Seguimiento"
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    action={
                      <CrmDetailLineButton
                        className="h-8"
                        onClick={() => openFollowUpDialog(selectedLead)}
                        disabled={
                          !can("tasks.create") ||
                          (isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Crear
                      </CrmDetailLineButton>
                    }
                  >
                    {signalsLoading ? (
                      <CrmDetailEmptyState>Cargando seguimiento...</CrmDetailEmptyState>
                    ) : signalsByLeadId[selectedLead.id]?.hasActiveTask ? (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold truncate">
                          {signalsByLeadId[selectedLead.id]?.nextTaskTitle || "Seguimiento"}
                        </div>
                        <div className="text-[13px] text-muted-foreground">
                          {formatDateShort(signalsByLeadId[selectedLead.id]?.nextTaskDueDate)} ·{" "}
                          {signalsByLeadId[selectedLead.id]?.nextTaskStatus || "—"}
                        </div>
                      </div>
                    ) : (
                      <CrmDetailEmptyState>
                        Este prospecto no tiene seguimiento programado.
                      </CrmDetailEmptyState>
                    )}
                    {signalsError ? (
                      <div className="mt-2 text-xs font-medium text-destructive">
                        {signalsError}
                      </div>
                    ) : null}
                  </CrmDetailSection>
                </div>
              </TabsContent>

              <TabsContent value="opportunity" className="space-y-4 data-[state=inactive]:hidden">
                <CrmDetailSection
                  title="Oportunidad comercial"
                  icon={<Target className="h-3.5 w-3.5" />}
                  action={
                    selectedDeal ? (
                      <CrmDetailLineButton
                        className="h-8"
                        onClick={() => setEditingDeal(selectedDeal)}
                        disabled={!can("deals.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </CrmDetailLineButton>
                    ) : null
                  }
                >
                  {leadDealsLoading ? (
                    <CrmDetailEmptyState>Cargando oportunidad...</CrmDetailEmptyState>
                  ) : selectedDeal ? (
                    <div className="space-y-3">
                      <div className="min-w-0 border-b border-slate-100 pb-3">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-normal text-slate-950">
                              {selectedDeal.name}
                            </div>
                            <div className="mt-1 text-xs font-normal text-slate-500">
                              {formatCurrency(
                                selectedDeal.value,
                                selectedDeal.currency || currencySettings.baseCurrency,
                              )}{" "}
                              · {selectedDeal.probability || 50}% prob.
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full border border-slate-100 bg-white px-2.5 py-1 text-[11px] font-normal text-slate-600">
                            {selectedDeal.stage}
                          </span>
                        </div>

                        <div className="mt-3">
                          <Label className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                            Etapa
                          </Label>
                          <Select
                            value={selectedDeal.stage}
                            onValueChange={(stage) => void updateDealStage(selectedDeal, stage)}
                            disabled={!can("deals.edit")}
                          >
                            <CrmDetailSelectTrigger className="mt-1 text-[12px] text-slate-700">
                              <SelectValue placeholder="Etapa" />
                            </CrmDetailSelectTrigger>
                            <SelectContent className="border-slate-200 bg-white shadow-none">
                              {dealStages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.name}>
                                  {stage.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                        <CrmDetailLineButton
                          onClick={() => void markDealWon(selectedDeal)}
                          disabled={!can("deals.edit") || closingDeal === "won"}
                        >
                          {closingDeal === "won" ? "Guardando..." : "Ganada"}
                        </CrmDetailLineButton>
                        <CrmDetailLineButton
                          tone="danger"
                          onClick={() => setLostDeal(selectedDeal)}
                          disabled={!can("deals.edit") || closingDeal === "lost"}
                        >
                          Perdida
                        </CrmDetailLineButton>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <div className="text-xs font-extrabold uppercase tracking-[0.06em] text-slate-400">
                          Productos
                        </div>
                        {dealProducts.length ? (
                          <div className="divide-y divide-slate-100 border-y border-slate-100">
                            {dealProducts.map((row) => {
                              const product = dealProductsByProductId[String(row.product_id)];
                              return (
                                <div
                                  key={row.id}
                                  className="flex min-w-0 items-center justify-between gap-3 py-2.5"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-normal text-slate-950">
                                      {product?.name || "Producto"}
                                    </div>
                                    <div className="text-xs font-normal text-slate-500">
                                      {Number(row.quantity || 1)} x{" "}
                                      {formatCurrency(
                                        row.unit_price || product?.base_price || 0,
                                        product?.currency || currencySettings.baseCurrency,
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-slate-400"
                                    onClick={() => void removeDealProduct(row.id)}
                                    disabled={!can("deals.edit")}
                                    aria-label="Quitar producto"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <CrmDetailEmptyState>
                            Esta oportunidad no tiene productos asociados.
                          </CrmDetailEmptyState>
                        )}

                        <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-2">
                          <Select
                            value={dealProductDraft.product_id}
                            onValueChange={(value) =>
                              setDealProductDraft((current) => ({
                                ...current,
                                product_id: value,
                                unit_price:
                                  activeProducts.find((item) => String(item.id) === value)
                                    ?.base_price != null
                                    ? String(
                                        activeProducts.find((item) => String(item.id) === value)
                                          ?.base_price,
                                      )
                                    : current.unit_price,
                              }))
                            }
                            disabled={!can("deals.edit")}
                          >
                            <CrmDetailSelectTrigger className="text-[12px] text-slate-700">
                              <SelectValue placeholder="Agregar producto" />
                            </CrmDetailSelectTrigger>
                            <SelectContent className="border-slate-200 bg-white shadow-none">
                              {activeProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <CrmDetailLineButton
                            onClick={() => void addDealProduct(selectedDeal)}
                            disabled={!can("deals.edit") || !dealProductDraft.product_id}
                          >
                            Añadir
                          </CrmDetailLineButton>
                        </div>
                      </div>

                      <CrmDetailLineButton
                        className="w-full"
                        icon={<FolderOpen className="h-4 w-4" />}
                        onClick={() => void createProjectFromWonDeal(selectedDeal)}
                        disabled={
                          !can("projects.create") ||
                          !isWonStageName(selectedDeal.stage) ||
                          creatingProjectDealId === selectedDeal.id
                        }
                        title={
                          !isWonStageName(selectedDeal.stage)
                            ? "Primero marca la oportunidad como ganada."
                            : undefined
                        }
                      >
                        {creatingProjectDealId === selectedDeal.id
                          ? "Creando proyecto..."
                          : "Crear proyecto"}
                      </CrmDetailLineButton>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <CrmDetailEmptyState>
                        Este prospecto todavía no tiene oportunidad comercial.
                      </CrmDetailEmptyState>
                      <CrmDetailLineButton
                        onClick={() => void handleCreateDealFromLead(selectedLead)}
                        disabled={
                          !can("deals.create") ||
                          (isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to))
                        }
                      >
                        Crear oportunidad
                      </CrmDetailLineButton>
                    </div>
                  )}
                </CrmDetailSection>

                <Button
                  className="h-9 w-full bg-[#1d62f9] hover:bg-[#0f52dd]"
                  onClick={() => void handleConvertLeadToClient(selectedLead)}
                  disabled={
                    convertingClient ||
                    !can("clients.create") ||
                    (isSalesUser && !isLeadAssignedToCurrentUser(selectedLead.assigned_to))
                  }
                >
                  {convertingClient ? "Convirtiendo..." : "Convertir a cliente"}
                </Button>
              </TabsContent>

              <TabsContent value="overview" className="space-y-4 data-[state=inactive]:hidden">
                <div data-demo="leads-assignment">
                  <CrmDetailSection title="Asignación" icon={<Users className="h-3.5 w-3.5" />}>
                    <CrmDetailRow
                      label="Responsable"
                      value={
                        canAssign ? (
                          <div className="min-w-[220px]">
                            <Select
                              value={selectedLead.assigned_to || "unassigned"}
                              onValueChange={async (value) => {
                                if (!can("leads.edit")) return;
                                try {
                                  await update(selectedLead.id, {
                                    assigned_to: value === "unassigned" ? null : value,
                                  });
                                  void sendLeadNotification(
                                    "Responsable actualizado",
                                    `${getLeadPrimaryLabel(selectedLead)} quedó asignado.`,
                                  );
                                  toast.success("Responsable actualizado");
                                } catch (err: unknown) {
                                  const message =
                                    err instanceof Error ? err.message : "No se pudo asignar";
                                  toast.error(message);
                                }
                              }}
                              disabled={!can("leads.edit") || teamLoading}
                            >
                              <CrmDetailSelectTrigger className="text-[13px]">
                                <SelectValue placeholder="Selecciona vendedor" />
                              </CrmDetailSelectTrigger>
                              <SelectContent className="border-slate-200 bg-white shadow-none">
                                <SelectItem value="unassigned">Sin asignar</SelectItem>
                                {assignableUsers.map((m, index) => (
                                  <SelectItem key={`${m.user_id}-${index}`} value={m.user_id}>
                                    {m.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {teamError ? (
                              <small className="mt-1 block text-xs font-medium text-destructive">
                                {teamError}
                              </small>
                            ) : null}
                          </div>
                        ) : (
                          <span className="font-medium">{getAssigneeLabel(selectedLead)}</span>
                        )
                      }
                    />
                  </CrmDetailSection>
                </div>

                <div data-demo="leads-contact">
                  <CrmDetailSection title="Contacto" icon={<Phone className="h-3.5 w-3.5" />}>
                    <div className="space-y-2">
                      <CrmDetailRow label="Teléfono" value={selectedLead.phone || "—"} />
                      <CrmDetailRow label="WhatsApp" value={selectedLead.whatsapp || "—"} />
                      <CrmDetailRow
                        label="Servicio de interés"
                        value={selectedServiceLabel || "—"}
                      />
                    </div>
                  </CrmDetailSection>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 data-[state=inactive]:hidden">
                <div data-demo="leads-last-activity">
                  <CrmDetailSection
                    title="Última actividad"
                    icon={<Check className="h-3.5 w-3.5" />}
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {selectedLead.last_interaction_at
                          ? "Interacción registrada"
                          : "Prospecto creado"}
                      </div>
                      <div className="mt-1 text-[13px] text-muted-foreground">
                        {formatDate(selectedLead.last_interaction_at || selectedLead.created_at)}
                      </div>
                    </div>
                  </CrmDetailSection>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 data-[state=inactive]:hidden">
                <LeadNotesPanel leadId={selectedLead.id} canEdit={can("leads.edit")} />
              </TabsContent>
            </Tabs>
          ) : null}
        </DetailSheet>
      </div>

      <QuickCreateDialog
        type="lead"
        open={quickLeadOpen}
        onOpenChange={setQuickLeadOpen}
        context={{
          sourceType: "manual",
          prefill: {
            source: "Website",
            status: "New",
          },
        }}
        onCreated={() => {
          void fetchLeads();
        }}
      />

      <QuickCreateDialog
        type="proposal"
        open={quickProposalOpen}
        onOpenChange={setQuickProposalOpen}
        context={
          selectedLead
            ? {
                sourceType: "lead",
                sourceId: selectedLead.id,
                prefill: {
                  lead_id: selectedLead.id,
                  title: `Propuesta — ${getLeadPrimaryLabel(selectedLead)}`,
                  amount: selectedLead.estimated_value || "",
                  currency: selectedLead.currency || currencySettings.baseCurrency,
                  description: getInterestLabel(selectedLead) || selectedLead.notes || "",
                  valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
                },
              }
            : undefined
        }
        onCreated={async () => {
          if (selectedLead && can("leads.edit")) {
            await update(selectedLead.id, { status: "Proposal Sent" } as any);
            void sendLeadNotification(
              "Propuesta vinculada",
              `${getLeadPrimaryLabel(selectedLead)} pasó a Proposal Sent.`,
              "/proposals",
            );
          }
          void fetchLeads();
          toast.success("Propuesta vinculada al prospecto.");
        }}
      />

      <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
        <DialogContent className="w-screen max-w-none rounded-none sm:max-w-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Editar oportunidad</DialogTitle>
          </DialogHeader>
          {editingDeal ? (
            <form onSubmit={saveDealEdit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input name="name" defaultValue={editingDeal.name} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    name="value"
                    type="number"
                    step={getCurrencyStep(editingDeal.currency || currencySettings.baseCurrency)}
                    inputMode={getCurrencyInputMode(
                      editingDeal.currency || currencySettings.baseCurrency,
                    )}
                    defaultValue={String(
                      normalizeCurrencyAmount(
                        editingDeal.value || 0,
                        editingDeal.currency || currencySettings.baseCurrency,
                      ),
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={normalizeCurrency(editingDeal.currency || currencySettings.baseCurrency)}
                    onValueChange={(value) =>
                      setEditingDeal((current) =>
                        current ? { ...current, currency: normalizeCurrency(value) } : current,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOP">RD$</SelectItem>
                      <SelectItem value="USD">US$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Probabilidad</Label>
                  <Input
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={String(editingDeal.probability || 50)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cierre esperado</Label>
                <Input
                  name="expected_close"
                  type="date"
                  defaultValue={editingDeal.expected_close || ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select
                  value={editingDeal.stage}
                  onValueChange={(stage) =>
                    setEditingDeal((current) => (current ? { ...current, stage } : current))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {dealStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.name}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingDeal(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingDeal}>
                  {savingDeal ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!lostDeal} onOpenChange={(open) => !open && setLostDeal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar oportunidad como perdida</AlertDialogTitle>
            <AlertDialogDescription>
              Registra una razón para mantener claro el historial comercial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Razón</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Precio">Precio</SelectItem>
                  <SelectItem value="Timing">Timing</SelectItem>
                  <SelectItem value="Competencia">Competencia</SelectItem>
                  <SelectItem value="Sin respuesta">Sin respuesta</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nota</Label>
              <Textarea
                value={lostNote}
                onChange={(event) => setLostNote(event.target.value)}
                placeholder="Detalle opcional..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingDeal === "lost"}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void markDealLost()}
              disabled={closingDeal === "lost"}
            >
              {closingDeal === "lost" ? "Guardando..." : "Marcar perdida"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CrmCreationDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditLead(null);
        }}
        title={editLead ? "Editar prospecto" : "Nuevo prospecto"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Nombre</Label>
              <Input
                name="first_name"
                defaultValue={editLead?.first_name}
                placeholder="Nombre"
                className={crmFormStyles.input}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Apellido</Label>
              <Input
                name="last_name"
                defaultValue={editLead?.last_name}
                placeholder="Apellido"
                className={crmFormStyles.input}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Empresa</Label>
            <Input
              name="company_name"
              defaultValue={editLead?.company_name || ""}
              placeholder="Empresa"
              className={crmFormStyles.input}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Email</Label>
              <Input
                name="email"
                type="email"
                defaultValue={editLead?.email || ""}
                placeholder="email@empresa.com"
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Teléfono</Label>
              <Input
                name="phone"
                defaultValue={editLead?.phone || ""}
                placeholder="+1 809 555 0000"
                className={crmFormStyles.input}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Fuente</Label>
              <Select name="source" defaultValue={editLead?.source || "Website"}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Selecciona fuente" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {getSourceLabel(source)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select name="status" defaultValue={editLead?.status || "New"}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Valor estimado</Label>
              <Input
                name="estimated_value"
                type="number"
                step={getCurrencyStep(leadFormCurrency)}
                inputMode={getCurrencyInputMode(leadFormCurrency)}
                defaultValue={
                  editLead?.estimated_value != null
                    ? String(normalizeCurrencyAmount(editLead.estimated_value, leadFormCurrency))
                    : ""
                }
                placeholder="0"
                className={crmFormStyles.input}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Moneda</Label>
              <Select
                name="currency"
                value={leadFormCurrency}
                onValueChange={(value) => setLeadFormCurrency(normalizeCurrency(value))}
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOP">RD$ Peso dominicano</SelectItem>
                  <SelectItem value="USD">US$ Dólares</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Notas</Label>
            <Textarea
              name="notes"
              defaultValue={editLead?.notes || ""}
              placeholder="Añade notas..."
              rows={4}
              className={crmFormStyles.textarea}
            />
          </div>
          <div className={crmFormStyles.footer}>
            <Button
              type="button"
              variant="ghost"
              className={crmFormStyles.cancelButton}
              onClick={() => {
                setDialogOpen(false);
                setEditLead(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className={crmFormStyles.primaryButton}>
              {editLead ? "Guardar cambios" : "Crear prospecto"}
            </Button>
          </div>
        </form>
      </CrmCreationDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lead</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
