import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Phone,
  Plus,
  Sidebar,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { DetailSheet } from "@/components/crm/detail-sheet";
import { CrmDetailEmptyState, CrmDetailRow, CrmDetailSection } from "@/components/crm/crm-detail";
import { SearchFilters } from "@/components/crm/search-filters";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads — Corevix CRM" }, { name: "description", content: "Gestiona leads y seguimientos" }] }),
});

const STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"] as const;
const SOURCES = ["Website", "WhatsApp", "Referral", "Social Media", "Cold Call", "Email Campaign", "Event"] as const;

type LeadStatus = (typeof STATUSES)[number];
type Source = (typeof SOURCES)[number];
type StageTab = "all" | "new" | "discovery" | "qualified" | "proposal_ready" | "proposal_sent" | "closed";
type LeadChipFilter = "all" | "no_followup" | "today" | "high_intent" | "no_owner" | "with_proposal" | "without_proposal";
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

type AssignableRole = "sales_agent" | "manager" | "admin" | "super_admin";

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

function getLeadName(lead: Lead) {
  return `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Lead sin nombre";
}

function getLeadPrimaryLabel(lead: Lead) {
  const company = (lead.company_name || "").trim();
  if (company) return company;
  const person = getLeadName(lead).trim();
  if (person && person !== "Lead sin nombre") return person;
  const email = (lead.email || "").trim();
  if (email) return email;
  const phone = (lead.whatsapp || lead.phone || "").trim();
  if (phone) return phone;
  return "Prospecto sin nombre";
}

function getLeadSecondaryLabel(lead: Lead) {
  const person = getLeadName(lead).trim();
  const company = (lead.company_name || "").trim();
  if (company && person && person !== "Lead sin nombre") return person;
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

function formatCurrency(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
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

function getOwnerLabel(lead: Lead, currentUserId?: string) {
  if (!lead.assigned_to) return "Sin asignar";
  if (currentUserId && lead.assigned_to === currentUserId) return "Tú";
  return "Equipo";
}

function buildCsv(leads: Lead[]) {
  const headers = ["Lead", "Empresa", "Email", "Fuente", "Valor"];
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
  const { user, profile } = useAuth();
  const { can, role } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [valueFilter, setValueFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stageTab, setStageTab] = useState<StageTab>("all");
  const [leadChipFilter, setLeadChipFilter] = useState<LeadChipFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: leads, loading, create, update, remove } = useCrud<Lead>({ table: "leads" });

  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [openingWhatsapp, setOpeningWhatsapp] = useState(false);
  const [convertingClient, setConvertingClient] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpValues, setFollowUpValues] = useState<{
    title: string;
    due_date: string;
    priority: string;
    description: string;
  }>({ title: "", due_date: "", priority: "Medium", description: "" });
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [signalsByLeadId, setSignalsByLeadId] = useState<Record<string, LeadSignals>>({});

  const selectedLead = useMemo(() => {
    return leads.find((lead) => lead.id === selectedLeadId) || null;
  }, [leads, selectedLeadId]);

  const canViewAllLeads = role === "super_admin" || role === "admin" || role === "manager";
  const canAssign = role === "super_admin" || role === "admin" || role === "manager";
  const isSalesUser = role === "sales_agent";

  const assignableUsers = useMemo(() => {
    const allowed: AssignableRole[] = ["sales_agent", "manager", "admin", "super_admin"];
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
        .select("id, lead_id, stage, created_at")
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
    if (role === "sales_agent") setOwnerFilter("team");
  }, [role]);

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

      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_company_team_members", {
        _search: null,
        _role: null,
        _is_active: true,
        _department: null,
      });

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

  function getAssigneeLabel(lead: Lead) {
    if (!lead.assigned_to) return "Sin asignar";
    const member = assigneeByUserId.get(lead.assigned_to);
    const base = member?.full_name || "Asignado";
    if (user?.id && lead.assigned_to === user.id) return `${base} (Tú)`;
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
    if (!enforceOwnLeadForSales(lead, "Solo puedes crear oportunidades para tus propios prospectos")) return;
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
      toast.message("Este lead ya tiene una oportunidad creada");
      window.location.href = "/pipeline";
      return;
    }

    const stageName = await getInitialDealStageName(profile.company_id);

    const leadName = getLeadName(lead);
    const companyOrName = lead.company_name || leadName;
    const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : null;
    const service = meta
      ? (meta as any).selected_service ?? (meta as any).service
      : null;
    const serviceLabel = typeof service === "string" && service.trim().length ? service.trim() : null;

    const dealName = serviceLabel ? `${serviceLabel} — ${companyOrName}` : `Oportunidad — ${companyOrName}`;
    const assignedTo = lead.assigned_to || user?.id || null;
    const value = Number(lead.estimated_value || 0);

    const payloadBase: Record<string, unknown> = {
      company_id: profile.company_id,
      lead_id: lead.id,
      name: dealName,
      value: Number.isFinite(value) ? value : 0,
      probability: 50,
      expected_close: null,
      stage: stageName,
      assigned_to: assignedTo,
      created_by: user?.id,
      notes: null,
    };

    const { data: created, error: createErr } = await (supabase as any)
      .from("deals")
      .insert(payloadBase)
      .select("id")
      .single();

    // If company has custom stage names but DB still uses enum, retry with a safe default.
    if (createErr && String(createErr.message || "").toLowerCase().includes("enum")) {
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
      window.location.href = "/pipeline";
      return created2;
    }

    if (createErr) {
      toast.error(createErr.message || "No se pudo crear la oportunidad");
      return;
    }

    toast.success("Oportunidad creada");
    window.location.href = "/pipeline";
    return created;
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
    if (!enforceOwnLeadForSales(lead, "Solo puedes convertir a cliente tus propios prospectos")) return;
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

      const assigneeUserId = lead.assigned_to || user?.id || null;
      const accountManagerProfileId = assigneeUserId
        ? assigneeByUserId.get(assigneeUserId)?.profile_id || profile?.id || null
        : profile?.id || null;

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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    const leadLabel = lead.company_name || getLeadName(lead) || lead.email || lead.phone || lead.whatsapp || "prospecto";
    const sourceHint = lead.source_channel || lead.source || "—";
    setFollowUpValues({
      title: `Dar seguimiento a ${leadLabel}`,
      due_date: dueDate,
      priority: "Medium",
      description: `Seguimiento creado desde Prospectos.\nFuente: ${sourceHint}`,
    });
    setFollowUpOpen(true);
  }

  async function handleCreateFollowUpTask(lead: Lead) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }

    const canCreateFollowUp = can("tasks.create") && (canViewAllLeads || lead.assigned_to === user?.id);
    if (!canCreateFollowUp) {
      toast.error("No tienes permiso para crear seguimiento");
      return;
    }

    if (!followUpValues.title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    if (!followUpValues.due_date) {
      toast.error("Selecciona una fecha de seguimiento");
      return;
    }

    setFollowUpSaving(true);
    try {
      const assignedTo = lead.assigned_to || user?.id || null;
      const { error } = await (supabase as any).from("tasks").insert({
        company_id: profile.company_id,
        title: followUpValues.title.trim(),
        description: followUpValues.description.trim() || null,
        status: "To Do",
        priority: followUpValues.priority || "Medium",
        due_date: followUpValues.due_date,
        assigned_to: assignedTo,
        created_by: user?.id,
        related_lead_id: lead.id,
      });
      if (error) {
        toast.error(error.message || "No se pudo crear el seguimiento");
        return;
      }
      toast.success("Seguimiento creado correctamente.");
      setFollowUpOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo crear el seguimiento";
      toast.error(message);
    } finally {
      setFollowUpSaving(false);
    }
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
      .reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
    return { total, newLeads, needsFollowUp, readyForProposal, potentialValue };
  }, [leads]);

  const tabCounts = useMemo(() => {
    const all = leads.length;
    const newCount = leads.filter((l) => l.status === "New").length;
    const discovery = leads.filter((l) => l.status === "Contacted").length;
    const qualified = leads.filter((l) => l.status === "Qualified" || l.status === "Negotiation").length;
    const proposalReady = leads.filter((l) => l.status === "Qualified").length;
    const proposalSent = leads.filter((l) => l.status === "Proposal Sent" || l.status === "Negotiation").length;
    const closed = leads.filter((l) => l.status === "Won" || l.status === "Lost").length;
    return { all, new: newCount, discovery, qualified, proposal_ready: proposalReady, proposal_sent: proposalSent, closed };
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const isOwnLead = !!user?.id && lead.assigned_to === user.id;
      const isAssignedLead = Boolean(lead.assigned_to);
      const matchSearch = `${getLeadName(lead)} ${lead.company_name || ""} ${lead.email || ""}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchSource = sourceFilter === "all" || lead.source === sourceFilter;
      const matchChannel = channelFilter === "all" || getLeadChannelKey(lead) === channelFilter;
      const matchOwner = isSalesUser
        ? (ownerFilter === "mine" ? isOwnLead : isAssignedLead)
        : ownerFilter === "all" ||
          (ownerFilter === "mine" && lead.assigned_to === user?.id) ||
          (ownerFilter === "team" && !!lead.assigned_to) ||
          (ownerFilter === "unassigned" && !lead.assigned_to);
      const value = Number(lead.estimated_value || 0);
      const matchValue =
        valueFilter === "all" ||
        (valueFilter === "low" && value < 5000) ||
        (valueFilter === "mid" && value >= 5000 && value < 15000) ||
        (valueFilter === "high" && value >= 15000);
      const matchTab =
        stageTab === "all" ||
        (stageTab === "new" && lead.status === "New") ||
        (stageTab === "discovery" && lead.status === "Contacted") ||
        (stageTab === "qualified" && (lead.status === "Qualified" || lead.status === "Negotiation")) ||
        (stageTab === "proposal_ready" && lead.status === "Qualified") ||
        (stageTab === "proposal_sent" && (lead.status === "Proposal Sent" || lead.status === "Negotiation")) ||
        (stageTab === "closed" && (lead.status === "Won" || lead.status === "Lost"));

      const isToday = (() => {
        const todayKey = toDateKey(new Date().toISOString());
        if (!todayKey) return false;
        const lastKey = toDateKey(lead.last_interaction_at || lead.updated_at || lead.created_at);
        return !!lastKey && lastKey === todayKey;
      })();

      const highIntent = (() => {
        const valueHigh = Number(lead.estimated_value || 0) >= 15000;
        const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : null;
        const hot = meta ? Boolean((meta as any).is_hot_lead ?? (meta as any).ready_for_sales ?? (meta as any).high_intent) : false;
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

      return matchSearch && matchStatus && matchSource && matchChannel && matchOwner && matchValue && matchTab && matchChip;
    });
  }, [channelFilter, isSalesUser, leadChipFilter, leads, ownerFilter, search, sourceFilter, stageTab, statusFilter, user?.id, valueFilter]);

  function enforceOwnLeadForSales(lead: Lead, message: string) {
    if (!isSalesUser) return true;
    if (!user?.id) return false;
    if (lead.assigned_to !== user.id) {
      toast.error(message);
      return false;
    }
    return true;
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((lead) => selectedIds.includes(lead.id));
  const someVisibleSelected = filtered.some((lead) => selectedIds.includes(lead.id));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can(editLead ? "leads.edit" : "leads.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const data = {
      first_name: fd.get("first_name") as string,
      last_name: fd.get("last_name") as string,
      company_name: (fd.get("company_name") as string) || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      source: (fd.get("source") as string) || "Website",
      status: (fd.get("status") as string) || "New",
      estimated_value: Number(fd.get("estimated_value")) || 0,
      notes: (fd.get("notes") as string) || null,
    };

    try {
      if (editLead) {
        await update(editLead.id, data);
        toast.success("Lead actualizado");
      } else {
        await create(data);
        toast.success("Lead creado");
      }
      setDialogOpen(false);
      setEditLead(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el lead";
      toast.error(message);
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
      toast.success("Lead eliminado");
      setDeleteId(null);
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
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

  const toggleSelected = (leadId: string) => {
    setSelectedIds((current) => (current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]));
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filtered.some((lead) => lead.id === id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...filtered.map((lead) => lead.id)])));
  };

  const openDetail = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setDetailOpen(true);
  };

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


  const exportSelected = () => {
    const selectedLeads = leads.filter((lead) => selectedIds.includes(lead.id));
    if (selectedLeads.length < 2) return;
    const csv = buildCsv(selectedLeads);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `corevix-leads-${selectedLeads.length}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState />;

  return (
    <div
      data-demo="leads-main"
      className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_30%_0%,rgba(29,98,249,0.08),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f6f8fb_54%)] text-[#101828]"
    >
      <div className={cn("grid h-[calc(100vh-72px)] min-h-[720px] overflow-hidden", detailOpen ? "2xl:grid-cols-[minmax(0,1fr)_390px]" : "grid-cols-1")}>
        <div className="min-w-0 overflow-auto px-4 py-5 sm:px-6 2xl:px-7 2xl:py-6">
          <div className="mb-4 2xl:mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="w-fit text-[26px] font-semibold leading-none tracking-[-0.03em] transition-colors duration-200 hover:text-[#1d62f9]">
                Leads
              </h1>
              <p className="mt-2 lg:mt-3 text-[14px] font-[650] text-[#667085]">
                Gestiona contactos, seguimientos y oportunidades desde una sola lista.{" "}
                <span className="text-[#98a2b3]">({stats.total} prospectos)</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                className={cn(
                  "inline-flex h-[38px] items-center gap-2 rounded-[12px] border px-[13px] text-[13px] font-semibold shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all duration-200",
                  selectedIds.length >= 2
                    ? "border-[#1d62f9] bg-[#1d62f9] text-white shadow-[0_12px_28px_rgba(29,98,249,0.22)] hover:-translate-y-[1px]"
                    : "hidden",
                )}
                onClick={exportSelected}
                type="button"
              >
                <Download className="h-4 w-4" />
                Exportar seleccionados
                <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-white/20 px-[7px] text-[12px]">
                  {selectedIds.length}
                </span>
              </button>
              <button
                className="inline-flex h-[38px] items-center gap-2 rounded-[12px] border border-[#e6eaf0] bg-white px-[13px] text-[13px] font-semibold text-[#344054] shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#bdd1ff] hover:text-[#1d62f9]"
                onClick={() => setDetailOpen((current) => !current)}
                type="button"
              >
                <Sidebar className="h-4 w-4" />
                Ver detalle
              </button>
              {can("leads.create") && (
                <button
                  data-demo="leads-new-lead-button"
                  className="inline-flex h-[38px] items-center gap-2 rounded-[12px] bg-[#1d62f9] px-[13px] text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(29,98,249,0.20)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#0f52dd]"
                  onClick={() => {
                    setEditLead(null);
                    setDialogOpen(true);
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo lead
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <section className="mb-3 lg:mb-4 2xl:mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {[
              {
                label: "Nuevos leads",
                labelCompact: "Nuevos",
                value: stats.newLeads,
                meta: "Últimos 7 días",
                metaTone: "text-[#1d62f9]",
                icon: Users,
                tone: "bg-[#eaf1ff] text-[#1d62f9]",
              },
              {
                label: "Necesitan seguimiento",
                labelCompact: "Seguimiento",
                value: stats.needsFollowUp,
                meta: "Alertas activas",
                metaTone: "text-[#e11d48]",
                icon: Target,
                tone: "bg-[#fff1f3] text-[#e11d48]",
              },
              {
                label: "Listos para propuesta",
                labelCompact: "Propuesta",
                value: stats.readyForProposal,
                meta: "Calificados",
                metaTone: "text-[#7c3aed]",
                icon: FileText,
                tone: "bg-[#f3ecff] text-[#7c3aed]",
              },
              {
                label: "Valor potencial",
                labelCompact: "Valor",
                value: formatCurrency(stats.potentialValue),
                meta: "Oportunidades abiertas",
                metaTone: "text-[#16a34a]",
                icon: Star,
                tone: "bg-[#ecfdf3] text-[#16a34a]",
              },
            ].map((stat) => (
              <article
                key={stat.label}
                className={cn(
                  "group relative flex items-center gap-2.5 overflow-hidden rounded-[16px] border border-[#e6eaf0] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.045)] transition-all duration-200 hover:-translate-y-[2px] hover:border-[#cbd8ee] hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]",
                  "min-h-[56px] px-3 py-2.5",
                  "2xl:min-h-[72px] 2xl:px-3.5 2xl:py-3",
                )}
              >
                <div
                  className={cn(
                    "grid place-items-center rounded-full transition-transform duration-200 group-hover:scale-[1.06] group-hover:-rotate-2",
                    "h-8 w-8 2xl:h-9 2xl:w-9",
                    stat.tone,
                  )}
                >
                  <stat.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <strong className="block text-[16px] font-semibold tracking-[-0.015em] transition-colors group-hover:text-[#1d62f9]">
                      {stat.value}
                    </strong>
                    <span className="block text-[11px] font-semibold text-[#667085] 2xl:hidden truncate">
                      {stat.labelCompact}
                    </span>
                  </div>
                  <span className="hidden 2xl:block mb-0.5 text-[11px] font-medium text-[#667085] transition-colors group-hover:text-[#1d62f9]">
                    {stat.label}
                  </span>
                  <small className={cn("hidden 2xl:block text-[10px] font-normal", stat.metaTone)}>{stat.meta}</small>
                </div>
              </article>
            ))}
          </section>

          {false && import.meta.env.DEV && (
            <div className="mb-5 rounded-[16px] border border-[#e6eaf0] bg-white/75 px-4 py-3 text-xs text-[#667085] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div>Debug (DEV only)</div>
              <div>User: <span className="font-mono">{user?.email || "—"}</span></div>
              <div>company_id: <span className="font-mono">{profile?.company_id || "—"}</span></div>
            </div>
          )}

          <section className="overflow-hidden rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] pb-0 pt-[18px]">
              {[
                { key: "all", label: "Todos", countKey: "all" },
                { key: "new", label: "Nuevos", countKey: "new" },
                { key: "discovery", label: "Discovery", countKey: "discovery" },
                { key: "qualified", label: "Calificados", countKey: "qualified" },
                { key: "proposal_ready", label: "Propuesta lista", countKey: "proposal_ready" },
                { key: "proposal_sent", label: "Propuesta enviada", countKey: "proposal_sent" },
                { key: "closed", label: "Ganados / Perdidos", countKey: "closed" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={cn(
                    "flex h-[36px] items-center gap-2 rounded-[12px] px-3 text-[12px] font-medium text-[#475467] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#f3f7ff] hover:text-[#1d62f9]",
                    stageTab === tab.key && "bg-[#eaf1ff] text-[#1d62f9]",
                  )}
                  onClick={() => setStageTab(tab.key as StageTab)}
                  type="button"
                >
                  {tab.label}
                  <span className="opacity-75">{tabCounts[tab.countKey as keyof typeof tabCounts]}</span>
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                {[
                  { key: "all" as const, label: "Todos" },
                  { key: "whatsapp" as const, label: "WhatsApp" },
                  { key: "website" as const, label: "Website" },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cn(
                      "h-[34px] rounded-[12px] px-3 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-[1px]",
                      channelFilter === c.key ? "bg-[#111827] text-white" : "bg-[#f2f4f7] text-[#475467] hover:bg-[#eaf1ff] hover:text-[#1d62f9]",
                    )}
                    onClick={() => setChannelFilter(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-b border-[#e6eaf0] px-[18px] py-3 2xl:py-4">
              <SearchFilters
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar leads..."
                className="gap-2.5 2xl:gap-3"
                filters={[
                  {
                    key: "status",
                    placeholder: "Estado",
                    value: statusFilter,
                    onChange: setStatusFilter,
                    includeAllOption: false,
                    options: [
                      { label: "Estado", value: "all" },
                      ...STATUSES.map((status) => ({ label: getStatusLabel(status), value: status })),
                    ],
                    width: "w-32 2xl:w-44",
                  },
                  {
                    key: "source",
                    placeholder: "Fuente",
                    value: sourceFilter,
                    onChange: setSourceFilter,
                    includeAllOption: false,
                    options: [
                      { label: "Fuente", value: "all" },
                      ...SOURCES.map((source) => ({ label: getSourceLabel(source), value: source })),
                    ],
                    width: "w-32 2xl:w-44",
                  },
                  {
                    key: "owner",
                    placeholder: "Responsable",
                    value: ownerFilter,
                    onChange: setOwnerFilter,
                    includeAllOption: false,
                    options:
                      role === "sales_agent"
                        ? [
                            { label: "Todos asignados", value: "team" },
                            { label: "Mis prospectos", value: "mine" },
                          ]
                        : [
                            { label: "Responsable", value: "all" },
                            { label: "Solo yo", value: "mine" },
                            { label: "Asignados", value: "team" },
                            { label: "Sin asignar", value: "unassigned" },
                          ],
                    width: "w-40 2xl:w-56",
                  },
                  {
                    key: "value",
                    placeholder: "Valor",
                    value: valueFilter,
                    onChange: setValueFilter,
                    includeAllOption: false,
                    options: [
                      { label: "Valor", value: "all" },
                      { label: "Menos de $5k", value: "low" },
                      { label: "$5k - $15k", value: "mid" },
                      { label: "Más de $15k", value: "high" },
                    ],
                    width: "w-32 2xl:w-44",
                  },
                ]}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-[#667085]">Filtros rápidos:</span>
                {[
                  { key: "all", label: "Todos" },
                  { key: "no_followup", label: "Sin seguimiento" },
                  { key: "today", label: "Hoy" },
                  { key: "high_intent", label: "Alta intención" },
                  { key: "no_owner", label: "Sin responsable" },
                  { key: "with_proposal", label: "Con propuesta" },
                  { key: "without_proposal", label: "Sin propuesta" },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={cn(
                      "h-[32px] rounded-[12px] border px-3 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-[1px]",
                      leadChipFilter === c.key ? "bg-[#111827] text-white border-[#111827]" : "bg-white text-[#475467] border-[#e6eaf0] hover:border-[#bdd1ff] hover:bg-[#f3f7ff] hover:text-[#1d62f9]",
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
                  {leads.length === 0 ? "No hay prospectos todavía." : "No hay prospectos con este filtro."}
                </h3>
                <p className="mt-2 text-sm font-[650] text-[#667085]">
                  {leads.length === 0
                    ? "Cuando alguien contacte por WhatsApp, email o formulario, aparecerá aquí si muestra interés comercial."
                    : "Prueba ajustando los filtros o la búsqueda."}
                </p>
                {can("leads.create") && (
                  <Button className="mt-4 bg-[#1d62f9]" onClick={() => { setEditLead(null); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo lead
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
	                      <tr>
                        <th className="w-[42px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">
                          <button
                            className="grid h-7 w-7 place-items-center rounded-[9px] transition-all duration-200 hover:scale-[1.08] hover:bg-[#eaf1ff]"
                            onClick={toggleSelectAll}
                            type="button"
                            title="Seleccionar todos"
                          >
                            <span
                              className={cn(
                                "grid h-4 w-4 place-items-center rounded-[5px] border border-[#d8e1ee] bg-white text-white",
                                allVisibleSelected && "border-[#1d62f9] bg-[#1d62f9]",
                                !allVisibleSelected && someVisibleSelected && "border-[#1d62f9] bg-[#1d62f9]",
                              )}
                            >
                              {allVisibleSelected ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                              {!allVisibleSelected && someVisibleSelected ? <Minus className="h-3 w-3 stroke-[3]" /> : null}
                            </span>
                          </button>
	                        </th>
		                        <th className="w-[260px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">Lead</th>
		                        <th className="hidden 2xl:table-cell w-[210px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">Interés</th>
		                        <th className="hidden lg:table-cell w-[210px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">Etapa</th>
		                        <th className="hidden 2xl:table-cell w-[140px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">Valor</th>
		                        <th className="hidden lg:table-cell w-[170px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">Última actividad</th>
		                        <th className="hidden 2xl:table-cell w-[190px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085]">Responsable</th>
		                        <th className="w-[200px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-left text-[11px] font-semibold text-[#667085] hidden sm:table-cell">Próximo paso</th>
		                        <th className="w-[220px] 2xl:w-[240px] border-b border-[#e6eaf0] bg-[#fbfcff] px-3 py-2.5 2xl:py-3 text-right text-[11px] font-semibold text-[#667085]">Acciones</th>
		                      </tr>
                    </thead>
                    <tbody>
	                      {filtered.map((lead, index) => {
	                        const isSelected = selectedLeadId === lead.id;
	                        const isMultiSelected = selectedIds.includes(lead.id);
	                        const showChecked = isSelected || isMultiSelected;
	                        const interest = getInterestLabel(lead) || "Sin interés definido";
	                        const needsFollowUp = leadNeedsFollowUpUi(lead);
	                        const nextStep = getNextStepLabel(lead, needsFollowUp);
	                        const lastActivity = lead.last_interaction_at || lead.updated_at || lead.created_at;
	                        const companyLabel = (lead.company_name || "").trim() || getLeadPrimaryLabel(lead);
	                        const personLabel =
	                          getLeadName(lead) !== "Lead sin nombre" ? getLeadName(lead) : (lead.email || lead.whatsapp || lead.phone || "—");
	                        const sourceLabel = getLeadSourceDisplay(lead);

	                        return (
                          <tr
                            key={lead.id}
                            className={cn(
                              "cursor-pointer border-b border-[#eef2f6] transition-all duration-150 hover:translate-x-[3px] hover:bg-[#f4f8ff] hover:shadow-[inset_3px_0_0_rgba(29,98,249,.35),0_10px_30px_rgba(15,23,42,.05)]",
                              isSelected && "bg-[#f4f8ff] shadow-[inset_3px_0_0_#1d62f9]",
                              isMultiSelected && "bg-[#f4f8ff] shadow-[inset_3px_0_0_#1d62f9]",
                            )}
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setDetailOpen(true);
                            }}
                          >
                            <td className="px-3 py-2 2xl:py-3" onClick={(event) => event.stopPropagation()}>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-[9px] transition-all duration-200 hover:scale-[1.08] hover:bg-[#eaf1ff]"
                                onClick={() => toggleSelected(lead.id)}
                                type="button"
                              >
                                <span
                                  className={cn(
                                    "grid h-[18px] w-[18px] place-items-center rounded-[6px] border border-[#d8e1ee] bg-white text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-200",
                                    showChecked && "border-[#1d62f9] bg-[#1d62f9] shadow-[0_0_0_3px_rgba(29,98,249,0.12)]",
                                  )}
                                >
                                  {showChecked ? <Check className="h-3.5 w-3.5 stroke-[3.2]" /> : null}
                                </span>
                              </button>
                            </td>

	                            <td className="px-3 py-2 2xl:py-3">
	                              <button
	                                className="flex w-full items-center gap-3 rounded-[14px] px-2 py-1 text-left transition-all duration-200 hover:translate-x-[2px] hover:bg-[#eef5ff] hover:shadow-[0_10px_24px_rgba(29,98,249,.08)]"
	                                onClick={(event) => {
	                                  event.stopPropagation();
	                                  openDetail(lead);
	                                }}
	                                type="button"
	                              >
                                <div
                                  className={cn(
                                    "grid h-[42px] w-[42px] shrink-0 aspect-square place-items-center rounded-full text-[14px] font-semibold transition-all duration-200",
                                    getAvatarTone(index),
                                  )}
                                >
                                  {getInitials(lead)}
	                                </div>
	                                <div className="min-w-0">
	                                  <strong className="mb-[2px] block truncate text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-200 hover:text-[#1d62f9]">
	                                    {companyLabel}
	                                  </strong>
	                                  <span className="block truncate text-[12px] font-normal leading-[1.25] text-[#667085]">
	                                    {personLabel}
	                                  </span>
	                                  <div className="mt-[6px] flex flex-wrap items-center gap-2">
	                                    <span className={cn("inline-flex w-max items-center rounded-full px-2 py-0.5 text-[10px] font-medium", getSourceTone(sourceLabel))}>
	                                      {getSourceLabel(sourceLabel)}
	                                    </span>
	                                  </div>
	                                  <div className="mt-1.5 text-[11px] font-semibold text-[#98a2b3] 2xl:hidden">
	                                    Responsable: <span className="text-[#667085]">{getAssigneeLabel(lead)}</span>
	                                  </div>
	                                  <div className="mt-1.5 text-[11px] font-semibold text-[#98a2b3] 2xl:hidden">
	                                    Valor: <span className="text-[#667085]">{formatCurrency(lead.estimated_value)}</span>
	                                  </div>
	                                  <div className="mt-1 text-[11px] font-semibold text-[#101828] sm:hidden">
	                                    Próximo: <span className="text-[#667085]">{nextStep}</span>
	                                  </div>
	                                </div>
	                              </button>
	                            </td>

		                            <td className="hidden 2xl:table-cell px-3 py-2 2xl:py-3">
		                              <span className="block truncate text-[13px] font-medium text-[#101828]">
		                                {interest}
		                              </span>
		                            </td>

		                            <td className="hidden lg:table-cell px-3 py-2 2xl:py-3">
		                              <div className="flex items-center gap-2">
		                                <span className={cn("inline-flex w-max items-center rounded-full px-2 py-0.5 text-[10px] font-medium", getStatusTone(lead.status))}>
		                                  {getStatusLabel(lead.status)}
		                                </span>
		                                {needsFollowUp ? (
		                                  <span className="inline-flex w-max items-center rounded-full bg-[#fff1f3] px-2 py-0.5 text-[10px] font-semibold text-[#e11d48]">
		                                    Seguimiento
		                                  </span>
		                                ) : null}
		                              </div>
		                            </td>

	                            <td className="hidden 2xl:table-cell px-3 py-2 2xl:py-3">
	                              <span className="whitespace-nowrap text-[13px] font-semibold text-[#111827] transition-all duration-200 hover:scale-[1.02] hover:text-[#16a34a]">
	                                {formatCurrency(lead.estimated_value)}
	                              </span>
	                            </td>

		                            <td className="hidden lg:table-cell px-3 py-2 2xl:py-3">
		                              <div className="text-[13px] font-medium text-[#101828] truncate">{formatRelativeDate(lastActivity)}</div>
		                              <div className="mt-0.5 text-[11px] font-semibold text-[#98a2b3]">{formatDateShort(lastActivity)}</div>
		                            </td>

		                            <td className="hidden 2xl:table-cell px-3 py-2 2xl:py-3">
		                              <div className="flex items-center gap-[9px] whitespace-nowrap text-[13px] font-medium text-[#344054] min-w-0">
		                                <span className="grid h-7 w-7 shrink-0 aspect-square place-items-center rounded-full bg-[linear-gradient(135deg,#0f172a,#64748b)] text-[11px] font-semibold text-white">
		                                  {getAssigneeLabel(lead).slice(0, 2).toUpperCase()}
		                                </span>
                                <span className="truncate">{getAssigneeLabel(lead)}</span>
                              </div>
                            </td>

		                            <td className="hidden sm:table-cell px-3 py-2 2xl:py-3">
		                              <div className="text-[13px] font-semibold text-[#101828] truncate">{nextStep}</div>
		                              {needsFollowUp ? (
		                                <div className="mt-0.5 text-[11px] font-semibold text-[#e11d48]">Necesita atención</div>
		                              ) : null}
		                            </td>

		                            <td className="px-3 py-2 2xl:py-3">
		                              <div className="flex items-center justify-end gap-2">
		                                <button
		                                  className="inline-flex h-8 items-center rounded-[12px] border border-[#e6eaf0] bg-white px-3 text-[12px] font-semibold text-[#344054] hover:border-[#bdd1ff] hover:bg-[#f3f7ff] hover:text-[#1d62f9]"
		                                  onClick={(event) => {
		                                    event.stopPropagation();
		                                    openDetail(lead);
		                                  }}
		                                  type="button"
		                                >
		                                  Ver
		                                </button>
		                                <button
		                                  className="inline-flex h-8 items-center rounded-[12px] border border-[#16a34a] bg-[#ecfdf3] px-3 text-[12px] font-semibold text-[#16a34a] hover:opacity-95"
		                                  onClick={(event) => {
		                                    event.stopPropagation();
		                                    void handleOpenWhatsAppFromLead(lead);
		                                  }}
		                                  type="button"
		                                >
		                                  Contactar
		                                </button>
		                                <button
		                                  className="hidden 2xl:inline-flex h-8 items-center rounded-[12px] border border-[#e6eaf0] bg-white px-3 text-[12px] font-semibold text-[#344054] hover:border-[#bdd1ff] hover:bg-[#f3f7ff] hover:text-[#1d62f9]"
		                                  onClick={(event) => {
		                                    event.stopPropagation();
		                                    toast.message("Crear propuesta próximamente");
		                                  }}
		                                  type="button"
		                                >
		                                  Crear propuesta
		                                </button>
		                                <DropdownMenu>
		                                  <DropdownMenuTrigger asChild>
		                                    <button
		                                      className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] border border-[#e6eaf0] bg-white text-[#475467] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#bdd1ff] hover:bg-[#f5f9ff] hover:text-[#1d62f9]"
		                                      onClick={(event) => event.stopPropagation()}
		                                      type="button"
		                                      aria-label="Más acciones"
		                                    >
		                                      <MoreHorizontal className="h-4 w-4" />
		                                    </button>
		                                  </DropdownMenuTrigger>
		                                  <DropdownMenuContent align="end">
		                                    <DropdownMenuItem onClick={() => openDetail(lead)}>Ver</DropdownMenuItem>
		                                    <DropdownMenuItem onClick={() => toast.message("Crear propuesta próximamente")}>Crear propuesta</DropdownMenuItem>
		                                    <DropdownMenuItem disabled={!can("leads.edit")} onClick={() => can("leads.edit") && openEdit(lead)}>
		                                      Editar
		                                    </DropdownMenuItem>
		                                    <DropdownMenuItem disabled={!can("deals.create")} onClick={() => void handleCreateDealFromLead(lead)}>
		                                      Crear deal
		                                    </DropdownMenuItem>
		                                    <DropdownMenuItem disabled={!can("tasks.create")} onClick={() => { setSelectedLeadId(lead.id); setFollowUpOpen(true); }}>
		                                      Crear seguimiento
		                                    </DropdownMenuItem>
		                                    <DropdownMenuItem
		                                      disabled={!can("leads.edit")}
		                                      onClick={() => {
		                                        if (!enforceOwnLeadForSales(lead, "Solo puedes modificar tus propios prospectos")) return;
		                                        if (!can("leads.edit")) return;
		                                        void update(lead.id, { status: "Lost" } as any);
		                                      }}
		                                    >
		                                      Marcar perdido
		                                    </DropdownMenuItem>
		                                    <DropdownMenuItem
		                                      disabled={!can("leads.delete")}
		                                      onClick={() => can("leads.delete") && setDeleteId(lead.id)}
		                                      className="text-destructive focus:text-destructive"
		                                    >
		                                      Eliminar
		                                    </DropdownMenuItem>
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

                <div className="flex flex-wrap items-center justify-between gap-4 px-[18px] py-[15px] text-[13px] font-[700] text-[#667085]">
                  <span>Mostrando {filtered.length ? 1 : 0} a {filtered.length} de {leads.length} leads</span>
                  <div className="flex items-center gap-2">
                    <button className="grid h-[34px] w-[34px] place-items-center rounded-[10px] text-[#475467] transition-all duration-200 hover:-translate-y-[2px] hover:scale-[1.04] hover:bg-[#eaf1ff]">‹</button>
                    <button className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[#eaf1ff] font-[850] text-[#1d62f9]">1</button>
                    <button className="grid h-[34px] w-[34px] place-items-center rounded-[10px] text-[#475467] transition-all duration-200 hover:-translate-y-[2px] hover:scale-[1.04] hover:bg-[#eaf1ff]">›</button>
                  </div>
                  <label className="flex items-center gap-2">
                    Filas por página
                    <select className="h-[38px] rounded-[11px] border border-[#e6eaf0] bg-white px-3 font-[850] text-[#475467] outline-none">
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
          icon={<Users className="h-5 w-5 text-blue-600" />}
          badges={
            selectedLead ? (
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", getSourceTone(getLeadSourceDisplay(selectedLead)))}>
                {getSourceLabel(getLeadSourceDisplay(selectedLead))}
              </span>
            ) : null
          }
	          fields={
	            selectedLead
	              ? [
	                  { label: "Empresa", value: selectedLead.company_name || "—" },
	                  { label: "Email", value: selectedLead.email || "—" },
	                  { label: "Teléfono", value: selectedLead.phone || "—" },
	                  { label: "WhatsApp", value: selectedLead.whatsapp || "—" },
	                  { label: "Responsable", value: getAssigneeLabel(selectedLead) },
	                  { label: "Interés", value: getInterestLabel(selectedLead) || "Sin interés definido" },
	                  { label: "Valor estimado", value: selectedLead.estimated_value || 0, type: "currency" },
	                  { label: "Última actividad", value: formatDate(selectedLead.last_interaction_at || selectedLead.updated_at || selectedLead.created_at) },
	                  { label: "Próximo paso", value: getNextStepLabel(selectedLead, leadNeedsFollowUpUi(selectedLead)) },
	                ]
	              : []
	          }
	        >
          {selectedLead ? (
            <div className="space-y-4">
              <div data-demo="leads-quick-actions">
              <CrmDetailSection
                title="Acciones rápidas"
                icon={<Target className="h-3.5 w-3.5" />}
                action={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                        Más
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={!can("leads.edit")} onClick={() => can("leads.edit") && openEdit(selectedLead)}>
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
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-9 justify-start gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => void handleOpenWhatsAppFromLead(selectedLead)}
                    disabled={openingWhatsapp}
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2"
                    onClick={() => {
                      if (!selectedLead.email) {
                        toast.message("Este lead no tiene email");
                        return;
                      }
                      window.location.href = `mailto:${selectedLead.email}`;
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2"
                    onClick={() => {
                      if (!selectedLead.phone) {
                        toast.message("Este lead no tiene teléfono");
                        return;
                      }
                      window.location.href = `tel:${selectedLead.phone}`;
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    Llamar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2"
                    onClick={() => openFollowUpDialog(selectedLead)}
                    disabled={!can("tasks.create") || (isSalesUser && selectedLead.assigned_to !== user?.id)}
                    title={!can("tasks.create") ? "Sin permiso" : undefined}
                  >
                    <Calendar className="h-4 w-4" />
                    Seguimiento
                  </Button>
                </div>
              </CrmDetailSection>
              </div>

              <div data-demo="leads-followup">
              <CrmDetailSection
                title="Seguimiento"
                icon={<Calendar className="h-3.5 w-3.5" />}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs"
                    onClick={() => openFollowUpDialog(selectedLead)}
                    disabled={!can("tasks.create") || (isSalesUser && selectedLead.assigned_to !== user?.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Crear
                  </Button>
                }
              >
                {signalsLoading ? (
                  <CrmDetailEmptyState>Cargando...</CrmDetailEmptyState>
                ) : signalsByLeadId[selectedLead.id]?.hasActiveTask ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold truncate">{signalsByLeadId[selectedLead.id]?.nextTaskTitle || "Seguimiento"}</div>
                    <div className="text-[13px] text-muted-foreground">
                      {formatDateShort(signalsByLeadId[selectedLead.id]?.nextTaskDueDate)} · {signalsByLeadId[selectedLead.id]?.nextTaskStatus || "—"}
                    </div>
                  </div>
                ) : (
                  <CrmDetailEmptyState>Este prospecto no tiene seguimiento programado.</CrmDetailEmptyState>
                )}
                {signalsError ? <div className="mt-2 text-xs font-medium text-destructive">{signalsError}</div> : null}
              </CrmDetailSection>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-9 bg-[#1d62f9] hover:bg-[#0f52dd]"
                  onClick={() => void handleConvertLeadToClient(selectedLead)}
                  disabled={convertingClient || !can("clients.create") || (isSalesUser && selectedLead.assigned_to !== user?.id)}
                  title={!can("clients.create") ? "Sin permiso" : undefined}
                >
                  Convertir a cliente
                </Button>
                {signalsByLeadId[selectedLead.id]?.hasDeal ? (
                  <Button variant="outline" className="h-9" onClick={() => { window.location.href = "/pipeline"; }}>
                    Ver oportunidad
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => void handleCreateDealFromLead(selectedLead)}
                    disabled={!can("deals.create") || (isSalesUser && selectedLead.assigned_to !== user?.id)}
                    title={!can("deals.create") ? "Sin permiso" : undefined}
                  >
                    Crear oportunidad
                  </Button>
                )}
              </div>

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
                              await update(selectedLead.id, { assigned_to: value === "unassigned" ? null : value });
                              toast.success("Responsable actualizado");
                            } catch (err: unknown) {
                              const message = err instanceof Error ? err.message : "No se pudo asignar";
                              toast.error(message);
                            }
                          }}
                          disabled={!can("leads.edit") || teamLoading}
                        >
                          <SelectTrigger className="h-9 rounded-[12px] text-[13px] font-medium">
                            <SelectValue placeholder="Selecciona vendedor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                            {assignableUsers.map((m, index) => (
                              <SelectItem key={`${m.user_id}-${index}`} value={m.user_id}>
                                {m.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {teamError ? <small className="mt-1 block text-xs font-medium text-destructive">{teamError}</small> : null}
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
                  <CrmDetailRow label="Servicio de interés" value={selectedServiceLabel || "—"} />
                </div>
              </CrmDetailSection>
              </div>

              <div data-demo="leads-last-activity">
              <CrmDetailSection title="Última actividad" icon={<Check className="h-3.5 w-3.5" />}>
                <div className="text-sm">
                  <div className="font-medium">{selectedLead.last_interaction_at ? "Interacción registrada" : "Lead creado"}</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{formatDate(selectedLead.last_interaction_at || selectedLead.created_at)}</div>
                </div>
              </CrmDetailSection>
              </div>
            </div>
          ) : null}
        </DetailSheet>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editLead ? "Editar lead" : "Nuevo lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nombre</Label><Input name="first_name" defaultValue={editLead?.first_name} placeholder="Nombre" required /></div>
              <div className="space-y-1.5"><Label>Apellido</Label><Input name="last_name" defaultValue={editLead?.last_name} placeholder="Apellido" required /></div>
            </div>
            <div className="space-y-1.5"><Label>Empresa</Label><Input name="company_name" defaultValue={editLead?.company_name || ""} placeholder="Empresa" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" defaultValue={editLead?.email || ""} placeholder="email@empresa.com" /></div>
              <div className="space-y-1.5"><Label>Teléfono</Label><Input name="phone" defaultValue={editLead?.phone || ""} placeholder="+1 809 555 0000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fuente</Label>
                <Select name="source" defaultValue={editLead?.source || "Website"}>
                  <SelectTrigger><SelectValue placeholder="Selecciona fuente" /></SelectTrigger>
                  <SelectContent>{SOURCES.map((source) => <SelectItem key={source} value={source}>{getSourceLabel(source)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select name="status" defaultValue={editLead?.status || "New"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Valor estimado</Label><Input name="estimated_value" type="number" defaultValue={editLead?.estimated_value || ""} placeholder="0" /></div>
            </div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea name="notes" defaultValue={editLead?.notes || ""} placeholder="Añade notas..." rows={4} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditLead(null); }}>Cancelar</Button>
              <Button type="submit">{editLead ? "Guardar cambios" : "Crear lead"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={followUpOpen} onOpenChange={(open) => { setFollowUpOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Crear seguimiento</DialogTitle></DialogHeader>
          {selectedLead ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreateFollowUpTask(selectedLead);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={followUpValues.title}
                  onChange={(e) => setFollowUpValues((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={followUpValues.due_date}
                    onChange={(e) => setFollowUpValues((p) => ({ ...p, due_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridad</Label>
                  <Select
                    value={followUpValues.priority}
                    onValueChange={(v) => setFollowUpValues((p) => ({ ...p, priority: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Low", "Medium", "High", "Urgent"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nota</Label>
                <Textarea
                  value={followUpValues.description}
                  onChange={(e) => setFollowUpValues((p) => ({ ...p, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFollowUpOpen(false)} disabled={followUpSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={followUpSaving || !can("tasks.create")}>
                  {followUpSaving ? "Guardando..." : "Crear seguimiento"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">Selecciona un prospecto.</div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lead</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
