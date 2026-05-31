import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, BriefcaseBusiness, Calendar as CalendarIcon, DollarSign, Eye, Filter, Mail, MessageCircle, Phone, Plus, Trophy, TrendingUp, Package, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DetailSheet } from "@/components/crm/detail-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { LoadingMetrics } from "@/components/crm/loading-state";
import { EmptyState } from "@/components/crm/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { usePermissions } from "@/hooks/use-permissions";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { logActivityEvent } from "@/lib/activity-log";

export const Route = createFileRoute("/pipeline")({
  component: PipelinePage,
  head: () => ({ meta: [{ title: "Pipeline — Corevix CRM" }] }),
});

interface DealStage {
  id: string;
  name: string;
  display_order: number;
  color: string | null;
}

interface Deal {
  id: string;
  name: string;
  value: number;
  probability: number | null;
  expected_close: string | null;
  stage: string;
  lead_id?: string | null;
  assigned_to?: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

type ProductRow = {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  base_price: number | null;
  currency: string | null;
  is_active: boolean | null;
};

type DealProductRow = {
  id: string;
  deal_id: string;
  product_id: string;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

type ProposalRow = {
  id: string;
  deal_id: string | null;
  lead_id: string | null;
  product_id: string | null;
  created_at: string;
};

type ProductWorkflowRow = {
  id: string;
  product_id: string;
  name: string;
  is_active: boolean;
};

type ProductWorkflowStepRow = {
  id: string;
  workflow_id: string;
  product_id: string;
  title: string;
  description: string | null;
  step_order: number;
  default_priority: string;
  default_duration_days: number;
  assigned_role: string | null;
  is_active: boolean;
};

type ViewMode = "board" | "list";
type DealStatusFilter = "active" | "won" | "lost" | "all";
type AssignedFilter = "all" | "me" | "team" | "unassigned";
type CloseDatePreset = "any" | "today" | "week" | "month" | "range" | "none";

type CompanyTeamMember = {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
};

type LeadRow = {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company_name: string | null;
  source: string | null;
  source_channel: string | null;
  estimated_value?: number | null;
  notes?: string | null;
  product_interest?: string | null;
  status: string;
  assigned_to: string | null;
};

type ClientRow = {
  id: string;
  company_id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  status: string;
  assigned_to: string | null;
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: unknown) {
  return `$${toNumber(value).toLocaleString()}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeHex(input: string) {
  const c = input.trim();
  if (!c) return null;
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
    if (hex.length === 6) return `#${hex}`.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string) {
  const n = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return { r, g, b };
}

function rgba(hex: string, a: number) {
  const h = normalizeHex(hex);
  if (!h) return `rgba(29, 98, 249, ${a})`;
  const { r, g, b } = hexToRgb(h);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function stageDefaults(name: string) {
  // Match the reference palette per stage name (falls back to keyword heuristics).
  const exact = name.trim();
  const exactMap: Record<string, string> = {
    "New Opportunity": "#1d62f9",
    Discovery: "#0891b2",
    Qualified: "#16a34a",
    "Proposal Preparation": "#7c3aed",
    "Proposal Sent": "#7c3aed",
    Negotiation: "#f97316",
    "Contract Sent": "#d97706",
    Won: "#16a34a",
    Lost: "#e11d48",
  };
  if (exactMap[exact]) return exactMap[exact];

  const s = exact.toLowerCase();
  if (s.includes("new")) return "#1d62f9";
  if (s.includes("discover")) return "#0891b2";
  if (s.includes("qualif")) return "#16a34a";
  if (s.includes("proposal")) return "#7c3aed";
  if (s.includes("negot")) return "#f97316";
  if (s.includes("contract")) return "#d97706";
  if (s.includes("won")) return "#16a34a";
  if (s.includes("lost")) return "#e11d48";
  return "#1d62f9";
}

function isWonStageName(name: string) {
  const s = name.trim().toLowerCase();
  return s === "won" || s === "closed won" || s.includes("closed won") || s.includes("ganad") || s.includes("win");
}

function isLostStageName(name: string) {
  const s = name.trim().toLowerCase();
  return s === "lost" || s === "closed lost" || s.includes("closed lost") || s.includes("perdid") || s.includes("lost");
}

function parseIsoDateOnly(input: string) {
  // Expects YYYY-MM-DD. Returns Date at local midnight.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizePhoneForWhatsApp(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

function formatPersonName(first?: string | null, last?: string | null) {
  const full = `${first || ""} ${last || ""}`.trim();
  return full || null;
}

function formatDateLabel(input?: string | null) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString();
}

function toIsoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function PipelinePage() {
  const { profile, user, roles } = useAuth();
  const { can } = usePermissions();
  const [stages, setStages] = useState<DealStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [deleteDealId, setDeleteDealId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedSearch, setArchivedSearch] = useState("");
  const [newDealStageOverride, setNewDealStageOverride] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [boardStagePage, setBoardStagePage] = useState(0);
  const [newDeal, setNewDeal] = useState({ name: "", value: "", probability: "50", expected_close: "", stage: "", source_type: "", lead_id: "", client_id: "" });
  const [dealIdsByStage, setDealIdsByStage] = useState<Record<string, string[]>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status: DealStatusFilter;
    selectedStages: string[];
    assigned: AssignedFilter;
    valueMin: string;
    valueMax: string;
    probMin: string;
    probMax: string;
    closePreset: CloseDatePreset;
    closeFrom: string;
    closeTo: string;
    followUpStaleDays: string; // empty = off
  }>({
    status: "active",
    selectedStages: [],
    assigned: "all",
    valueMin: "",
    valueMax: "",
    probMin: "",
    probMax: "",
    closePreset: "any",
    closeFrom: "",
    closeTo: "",
    followUpStaleDays: "",
  });

  const [team, setTeam] = useState<CompanyTeamMember[]>([]);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpValues, setFollowUpValues] = useState({ title: "", due_date: "", priority: "Medium", description: "" });
  const [closingAsWon, setClosingAsWon] = useState(false);
  const [closingAsLost, setClosingAsLost] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState<string>("Precio");
  const [lostNote, setLostNote] = useState<string>("");
  const [convertClientDialogOpen, setConvertClientDialogOpen] = useState(false);
  const [convertingClient, setConvertingClient] = useState(false);
  const [pendingWonDealId, setPendingWonDealId] = useState<string | null>(null);

  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectCandidateDealId, setProjectCandidateDealId] = useState<string | null>(null);
  const [productCandidates, setProductCandidates] = useState<ProductRow[]>([]);

  const [dealLeadOptions, setDealLeadOptions] = useState<LeadRow[]>([]);
  const [dealClientOptions, setDealClientOptions] = useState<ClientRow[]>([]);
  const [dealSourceOptionsLoading, setDealSourceOptionsLoading] = useState(false);

  useEffect(() => {
    if (!profile?.company_id || !dialogOpen) return;

    const loadDealSourceOptions = async () => {
      setDealSourceOptionsLoading(true);
      try {
        const db = supabase as any;
        const [{ data: leadsData, error: leadsError }, { data: clientsData }] = await Promise.all([
          db
            .from("leads")
            .select("id,company_id,first_name,last_name,company_name,email,phone,whatsapp,status,source,source_channel,estimated_value,notes,product_interest,created_at,updated_at")
            .eq("company_id", profile.company_id)
            .order("updated_at", { ascending: false })
            .limit(50),
          db
            .from("clients")
            .select("id,company_id,company_name,contact_person,email,phone,whatsapp,status,created_at,updated_at")
            .eq("company_id", profile.company_id)
            .order("updated_at", { ascending: false })
            .limit(50),
        ]);

        if (leadsError) {
          const { data: fallbackLeadsData } = await db
            .from("leads")
            .select("id,company_id,first_name,last_name,company_name,email,phone,whatsapp,status,source,source_channel,created_at,updated_at")
            .eq("company_id", profile.company_id)
            .order("updated_at", { ascending: false })
            .limit(50);
          setDealLeadOptions((fallbackLeadsData || []) as LeadRow[]);
        } else {
          setDealLeadOptions((leadsData || []) as LeadRow[]);
        }
        setDealClientOptions((clientsData || []) as ClientRow[]);
      } finally {
        setDealSourceOptionsLoading(false);
      }
    };

    void loadDealSourceOptions();
  }, [dialogOpen, profile?.company_id]);

  const openWhatsappForDeal = async (deal: Deal) => {
    if (!profile?.company_id) return;

    try {
      const db = supabase as any;
      const leadId = deal.lead_id ? String(deal.lead_id) : null;

      if (leadId) {
        const { data, error } = await db
          .from("crm_whatsapp_conversation_list")
          .select("conversation_id")
          .eq("company_id", profile.company_id)
          .eq("lead_id", leadId)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data?.conversation_id) {
          window.location.href = `/whatsapp?conversationId=${encodeURIComponent(String(data.conversation_id))}`;
          return;
        }
      }

      toast.info("No encontré una conversación de WhatsApp para este deal.");
      window.location.href = "/whatsapp";
    } catch (e: any) {
      toast.error(e?.message || "No se pudo abrir WhatsApp.");
      window.location.href = "/whatsapp";
    }
  };
  const [dealProductsByProductId, setDealProductsByProductId] = useState<Record<string, DealProductRow | undefined>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<ProductWorkflowRow | null>(null);
  const [activeWorkflowSteps, setActiveWorkflowSteps] = useState<ProductWorkflowStepRow[]>([]);

  const [relatedLeadById, setRelatedLeadById] = useState<Record<string, LeadRow | undefined>>({});
  const [nextTaskByLeadId, setNextTaskByLeadId] = useState<Record<string, TaskRow | undefined>>({});
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [activeProducts, setActiveProducts] = useState<ProductRow[]>([]);
  const [activeProductsLoading, setActiveProductsLoading] = useState(false);
  const [dealProducts, setDealProducts] = useState<DealProductRow[]>([]);
  const [dealProductsLoading, setDealProductsLoading] = useState(false);
  const [dealProductsProductById, setDealProductsProductById] = useState<Record<string, ProductRow | undefined>>({});

  const [addDealProductValues, setAddDealProductValues] = useState<{ product_id: string; quantity: string; unit_price: string }>({
    product_id: "",
    quantity: "1",
    unit_price: "",
  });
  const [addingDealProduct, setAddingDealProduct] = useState(false);
  const [removingDealProductId, setRemovingDealProductId] = useState<string | null>(null);

  useEffect(() => {
    const onDemoOpenDealDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ dealId?: string; open?: boolean }>).detail;
      const dealId = detail?.dealId || "10000000-0000-4000-8000-000000000105";

      if (detail?.open === false) {
        setSelectedDeal(null);
        return;
      }

      const foundDeal = deals.find((d) => String(d.id) === String(dealId));

      if (foundDeal) {
        setSelectedDeal((current) => (current?.id === foundDeal.id ? current : foundDeal));
        return;
      }

      try {
        localStorage.setItem("crm_demo_pending_deal_id", dealId);
      } catch {}
    };

    try {
      const pendingDealId = localStorage.getItem("crm_demo_pending_deal_id");
      if (pendingDealId) {
        const foundDeal = deals.find((d) => String(d.id) === String(pendingDealId));
        if (foundDeal) {
          setSelectedDeal(foundDeal);
          localStorage.removeItem("crm_demo_pending_deal_id");
        }
      }
    } catch {}

    window.addEventListener("crm-demo-open-deal-detail", onDemoOpenDealDetail);
    return () => window.removeEventListener("crm-demo-open-deal-detail", onDemoOpenDealDetail);
  }, [deals]);

  const closePipelineDetailSafely = () => {
    try {
      const storedTour = localStorage.getItem("crm_demo_tour_v1");
      const storedDemoDealId = localStorage.getItem("crm_demo_deal_id");

      if (storedTour && storedDemoDealId && selectedDeal?.id === storedDemoDealId) {
        return;
      }
    } catch {}

    setSelectedDeal(null);
  };

  const selectedLead = selectedDeal?.lead_id ? relatedLeadById[String(selectedDeal.lead_id)] : undefined;
  const selectedNextTask = selectedDeal?.lead_id ? nextTaskByLeadId[String(selectedDeal.lead_id)] : undefined;
  const selectedSourceLead = useMemo(
    () => (newDeal.source_type === "lead" && newDeal.lead_id ? dealLeadOptions.find((lead) => String(lead.id) === String(newDeal.lead_id)) || null : null),
    [dealLeadOptions, newDeal.lead_id, newDeal.source_type],
  );
  const selectedSourceClient = useMemo(
    () => (newDeal.source_type === "client" && newDeal.client_id ? dealClientOptions.find((client) => String(client.id) === String(newDeal.client_id)) || null : null),
    [dealClientOptions, newDeal.client_id, newDeal.source_type],
  );

  const db = supabase as any;

  const dealRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const loadActiveProducts = useCallback(async () => {
    if (!profile?.company_id) {
      setActiveProducts([]);
      setActiveProductsLoading(false);
      return;
    }
    setActiveProductsLoading(true);
    try {
      const { data, error } = await db
        .from("products")
        .select("id,company_id,name,category,base_price,currency,is_active")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(2000);
      if (error) {
        setActiveProducts([]);
        return;
      }
      setActiveProducts((data || []) as ProductRow[]);
    } finally {
      setActiveProductsLoading(false);
    }
  }, [db, profile?.company_id]);

  const loadDealProducts = useCallback(async () => {
    if (!profile?.company_id || !selectedDeal?.id) {
      setDealProducts([]);
      setDealProductsProductById({});
      setDealProductsLoading(false);
      return;
    }
    setDealProductsLoading(true);
    try {
      const { data: rows, error } = await db
        .from("deal_products")
        .select("id,deal_id,product_id,quantity,unit_price,total_price")
        .eq("company_id", profile.company_id)
        .eq("deal_id", selectedDeal.id)
        .order("created_at", { ascending: true });
      if (error) {
        setDealProducts([]);
        setDealProductsProductById({});
        return;
      }
      const list = (rows || []) as DealProductRow[];
      setDealProducts(list);

      const ids = Array.from(new Set(list.map((r) => String(r.product_id)).filter(Boolean)));
      if (!ids.length) {
        setDealProductsProductById({});
        return;
      }

      // Use already-loaded active products first; fetch missing ids to be safe.
      const fromActive: Record<string, ProductRow | undefined> = {};
      const activeById = new Map(activeProducts.map((p) => [String(p.id), p]));
      const missing: string[] = [];
      for (const id of ids) {
        const hit = activeById.get(id);
        fromActive[id] = hit;
        if (!hit) missing.push(id);
      }
      if (!missing.length) {
        setDealProductsProductById(fromActive);
        return;
      }

      const { data: extra, error: extraErr } = await db
        .from("products")
        .select("id,company_id,name,category,base_price,currency,is_active")
        .eq("company_id", profile.company_id)
        .in("id", missing)
        .limit(2000);
      if (extraErr) {
        setDealProductsProductById(fromActive);
        return;
      }
      for (const p of (extra || []) as ProductRow[]) {
        fromActive[String(p.id)] = p;
      }
      setDealProductsProductById(fromActive);
    } finally {
      setDealProductsLoading(false);
    }
  }, [activeProducts, db, profile?.company_id, selectedDeal?.id]);

  // If React re-renders during a drag (we update order on dragover), the DOM node can be replaced and
  // the native `dragend` event might not fire on the original element. This global fallback ensures
  // we don't leave a card "stuck" in the dragging visual state.
  useEffect(() => {
    const onEnd = () => {
      setDraggedDealId(null);
      setDragOverStage(null);
    };
    window.addEventListener("dragend", onEnd);
    return () => window.removeEventListener("dragend", onEnd);
  }, []);

  useEffect(() => {
    void loadActiveProducts();
  }, [loadActiveProducts]);

  useEffect(() => {
    void loadDealProducts();
  }, [loadDealProducts]);

  const pipelineStages = useMemo(() => stages.filter((s) => !isWonStageName(s.name) && !isLostStageName(s.name)), [stages]);
  const DESKTOP_STAGES_PER_PAGE = 6;
  const stagePages = useMemo(() => {
    const pages: { label: string; from: number; to: number }[] = [];
    for (let i = 0; i < pipelineStages.length; i += DESKTOP_STAGES_PER_PAGE) {
      const from = i;
      const to = Math.min(pipelineStages.length, i + DESKTOP_STAGES_PER_PAGE);
      pages.push({ label: `${from + 1}–${to}`, from, to });
    }
    return pages;
  }, [pipelineStages.length]);

  const visiblePipelineStages = useMemo(() => {
    if (pipelineStages.length <= DESKTOP_STAGES_PER_PAGE) return pipelineStages;
    const page = Math.min(Math.max(0, boardStagePage), stagePages.length - 1);
    const window = stagePages[page];
    return pipelineStages.slice(window.from, window.to);
  }, [boardStagePage, pipelineStages, stagePages]);
  const wonStageNames = useMemo(() => new Set(stages.filter((s) => isWonStageName(s.name)).map((s) => s.name)), [stages]);
  const lostStageNames = useMemo(() => {
    // Fallback: even if the company doesn't have a `deal_stages` row for "Lost",
    // deals can still be in enum stage "Lost". Treat it as archived.
    const set = new Set(stages.filter((s) => isLostStageName(s.name)).map((s) => s.name));
    set.add("Lost");
    return set;
  }, [stages]);
  const archiveStageName = useMemo(() => {
    const lost = stages.find((s) => isLostStageName(s.name))?.name;
    return lost || "Lost";
  }, [stages]);

  const isSalesAgent = useMemo(() => roles?.includes("sales_agent") ?? false, [roles]);

  const isDealAssignedToCurrentUser = useCallback(
    (assignedTo?: string | null) => {
      if (!assignedTo) return false;
      return assignedTo === profile?.id || assignedTo === user?.id;
    },
    [profile?.id, user?.id],
  );

  function canEditDeal(deal: Deal) {
    if (!can("deals.edit")) return false;
    if (!isSalesAgent) return true;
    return isDealAssignedToCurrentUser(deal.assigned_to);
  }

  function canCreateTaskForDeal(deal: Deal) {
    if (!can("tasks.create")) return false;
    if (!isSalesAgent) return true;
    return isDealAssignedToCurrentUser(deal.assigned_to);
  }

  function canManageDealProducts(deal: Deal) {
    const isAdminLike = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
    if (isAdminLike) return true;
    if (isSalesAgent) return isDealAssignedToCurrentUser(deal.assigned_to);
    return false;
  }

  function findWonStageName() {
    const preferred = ["Won", "Closed Won", "Ganado", "Cerrado ganado", "Cerrado Ganado"];
    for (const name of preferred) {
      const hit = stages.find((s) => s.name === name);
      if (hit) return hit.name;
    }
    const flagged = stages.find((s) => isWonStageName(s.name));
    if (flagged) return flagged.name;
    const fuzzy = stages.find((s) => {
      const n = s.name.toLowerCase();
      return n.includes("won") || n.includes("ganad");
    });
    return fuzzy?.name || "Won";
  }

  function findLostStageName() {
    const preferred = ["Lost", "Closed Lost", "Perdido", "Cerrado perdido", "Cerrado Perdido"];
    for (const name of preferred) {
      const hit = stages.find((s) => s.name === name);
      if (hit) return hit.name;
    }
    const flagged = stages.find((s) => isLostStageName(s.name));
    if (flagged) return flagged.name;
    const fuzzy = stages.find((s) => {
      const n = s.name.toLowerCase();
      return n.includes("lost") || n.includes("perdid");
    });
    return fuzzy?.name || "Lost";
  }

  function appendNote(existing: string | null, line: string) {
    const base = (existing || "").trim();
    if (!base) return line;
    return `${base}\n${line}`;
  }

  async function loadProductCandidatesForDeal(deal: Deal) {
    if (!profile?.company_id) return { products: [] as ProductRow[], dealProducts: [] as DealProductRow[] };
    const cid = profile.company_id;

    const { data: dealProducts, error: dpErr } = await db
      .from("deal_products")
      .select("id,deal_id,product_id,quantity,unit_price,total_price")
      .eq("company_id", cid)
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false });
    if (dpErr) throw new Error(dpErr.message || "No se pudieron cargar los productos del deal");

    const idsFromDealProducts = Array.isArray(dealProducts) ? dealProducts.map((r: any) => String(r.product_id)) : [];

    let candidateIds = idsFromDealProducts;

    if (!candidateIds.length) {
      const { data: proposals, error: pErr } = await db
        .from("proposals")
        .select("id,deal_id,lead_id,product_id,created_at")
        .eq("company_id", cid)
        .eq("deal_id", deal.id)
        .not("product_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (pErr) throw new Error(pErr.message || "No se pudieron cargar propuestas del deal");
      candidateIds = Array.isArray(proposals) ? proposals.map((r: any) => String(r.product_id)) : [];
    }

    if (!candidateIds.length && deal.lead_id) {
      const { data: proposals, error: pErr } = await db
        .from("proposals")
        .select("id,deal_id,lead_id,product_id,created_at")
        .eq("company_id", cid)
        .eq("lead_id", deal.lead_id)
        .not("product_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      if (pErr) throw new Error(pErr.message || "No se pudieron cargar propuestas del lead");
      candidateIds = Array.isArray(proposals) ? proposals.map((r: any) => String(r.product_id)) : [];
    }

    const uniqueCandidateIds = Array.from(new Set(candidateIds.filter(Boolean)));
    if (!uniqueCandidateIds.length) return { products: [], dealProducts: (dealProducts || []) as DealProductRow[] };

    const { data: products, error: prodErr } = await db
      .from("products")
      .select("id,company_id,name,category,base_price,currency,is_active")
      .eq("company_id", cid)
      .in("id", uniqueCandidateIds)
      .order("name", { ascending: true });
    if (prodErr) throw new Error(prodErr.message || "No se pudieron cargar productos");

    return { products: (products || []) as ProductRow[], dealProducts: (dealProducts || []) as DealProductRow[] };
  }

  async function loadActiveWorkflowForProduct(productId: string) {
    if (!profile?.company_id) return { workflow: null as ProductWorkflowRow | null, steps: [] as ProductWorkflowStepRow[] };
    const cid = profile.company_id;

    const { data: wf, error: wfErr } = await db
      .from("product_workflows")
      .select("id,product_id,name,is_active")
      .eq("company_id", cid)
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (wfErr) throw new Error(wfErr.message || "No se pudo cargar el workflow del producto");
    const workflow = (wf as ProductWorkflowRow | null) ?? null;
    if (!workflow?.id) return { workflow: null, steps: [] };

    const { data: steps, error: stepsErr } = await db
      .from("product_workflow_steps")
      .select("id,workflow_id,product_id,title,description,step_order,default_priority,default_duration_days,assigned_role,is_active")
      .eq("company_id", cid)
      .eq("workflow_id", workflow.id)
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("step_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (stepsErr) throw new Error(stepsErr.message || "No se pudieron cargar los pasos del workflow");

    return { workflow, steps: (steps || []) as ProductWorkflowStepRow[] };
  }

  async function openCreateProjectPromptForDeal(deal: Deal) {
    if (!profile?.company_id) return;
    setProjectCandidateDealId(deal.id);
    setCreateProjectDialogOpen(true);
    setWorkflowLoading(true);
    setActiveWorkflow(null);
    setActiveWorkflowSteps([]);
    setProductCandidates([]);
    setSelectedProductId(null);
    setDealProductsByProductId({});

    try {
      const lead = deal.lead_id ? relatedLeadById[String(deal.lead_id)] || null : null;
      const { products, dealProducts } = await loadProductCandidatesForDeal(deal);
      setProductCandidates(products);
      const map: Record<string, DealProductRow | undefined> = {};
      for (const dp of dealProducts) map[String(dp.product_id)] = dp;
      setDealProductsByProductId(map);

      if (!products.length) {
        toast.message("Esta oportunidad no tiene producto asociado. Asocia un producto para crear un proyecto automáticamente.");
        setWorkflowLoading(false);
        return;
      }

      const initialProductId = products[0]?.id ? String(products[0].id) : null;
      setSelectedProductId(initialProductId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo preparar la creación de proyecto";
      toast.error(msg);
      setCreateProjectDialogOpen(false);
    } finally {
      setWorkflowLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!createProjectDialogOpen || !selectedProductId) return;
      setWorkflowLoading(true);
      try {
        const { workflow, steps } = await loadActiveWorkflowForProduct(selectedProductId);
        if (cancelled) return;
        setActiveWorkflow(workflow);
        setActiveWorkflowSteps(steps);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "No se pudo cargar el workflow";
        toast.error(msg);
        setActiveWorkflow(null);
        setActiveWorkflowSteps([]);
      } finally {
        if (!cancelled) setWorkflowLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [createProjectDialogOpen, selectedProductId, profile?.company_id]);

  async function handleCreateProjectFromWonDeal() {
    if (!profile?.company_id || !profile?.id) return;
    if (!projectCandidateDealId) return;

    const deal = deals.find((d) => d.id === projectCandidateDealId) || selectedDeal;
    if (!deal) return;

    if (!selectedProductId) {
      toast.error("Selecciona un producto para crear el proyecto.");
      return;
    }

    const product = productCandidates.find((p) => String(p.id) === String(selectedProductId)) || null;
    if (!product) {
      toast.error("No se pudo cargar el producto seleccionado.");
      return;
    }

    if (!activeWorkflow?.id) {
      toast.error("Este producto no tiene workflow activo. Define un workflow en /products primero.");
      return;
    }
    if (!activeWorkflowSteps.length) {
      toast.error("El workflow activo no tiene pasos activos.");
      return;
    }

    setCreatingProject(true);
    try {
      const cid = profile.company_id;
      const lead = deal.lead_id ? relatedLeadById[String(deal.lead_id)] || null : null;

      const { data: existingProject, error: existingErr } = await db
        .from("projects")
        .select("id,name,deal_id,product_id")
        .eq("company_id", cid)
        .eq("deal_id", deal.id)
        .eq("product_id", product.id)
        .limit(1)
        .maybeSingle();
      if (existingErr) {
        toast.error(existingErr.message || "No se pudo validar duplicados de proyecto");
        return;
      }
      const startDate = new Date();
      const startDateIso = toIsoDateOnly(startDate);
      const totalDays = activeWorkflowSteps.reduce((sum, s) => sum + Math.max(0, Number(s.default_duration_days || 0)), 0);
      const dueDateIso = totalDays > 0 ? toIsoDateOnly(addDays(startDate, totalDays)) : null;

      const managerProfileId = deal.assigned_to
        ? teamByProfileId.get(String(deal.assigned_to))?.profile_id || teamByUserId.get(String(deal.assigned_to))?.profile_id || profile.id
        : profile.id;
      const projectName = lead?.company_name?.trim() ? `${product.name} — ${lead.company_name}` : `${product.name} — ${deal.name}`;

      let projectId: string | null = existingProject?.id ? String(existingProject.id) : null;
      if (!projectId) {
        const { data: createdProject, error: createErr } = await db
          .from("projects")
          .insert({
            company_id: cid,
            name: projectName,
            deal_id: deal.id,
            lead_id: deal.lead_id || null,
            product_id: product.id,
            manager: null,
            start_date: startDateIso,
            due_date: dueDateIso,
            status: "Not Started",
            budget: Number(deal.value || 0),
            description: `Proyecto creado desde oportunidad ganada.\nProducto: ${product.name}\nWorkflow: ${activeWorkflow.name}`,
            progress: 0,
          })
          .select("id")
          .single();
        if (createErr) {
          toast.error(createErr.message || "No se pudo crear el proyecto");
          return;
        }
        projectId = String(createdProject.id);
      }

      const { data: existingTasks, error: tErr } = await db
        .from("tasks")
        .select("id")
        .eq("company_id", cid)
        .eq("related_project_id", projectId)
        .limit(1);
      if (tErr) {
        toast.error(tErr.message || "No se pudo validar duplicados de tareas");
        return;
      }
      if ((existingTasks || []).length) {
        toast.message("Ya existe un proyecto y tareas vinculadas. No se generaron nuevas tareas.");
        setCreateProjectDialogOpen(false);
        return;
      }

      let cursor = 0;
      const tasksPayload = activeWorkflowSteps
        .slice()
        .sort((a, b) => a.step_order - b.step_order)
        .map((step) => {
          cursor += Math.max(1, Number(step.default_duration_days || 1));
          const due = toIsoDateOnly(addDays(startDate, cursor));
          return {
            company_id: cid,
            title: step.title,
            description: step.description || null,
            status: "To Do",
            priority: (step.default_priority as any) || "Medium",
            assigned_to: managerProfileId,
            due_date: due,
            related_project_id: projectId,
            related_client_id: null,
            related_lead_id: deal.lead_id || null,
            related_deal_id: deal.id,
          };
        });

      const { error: insertTasksErr } = await db.from("tasks").insert(tasksPayload);
      if (insertTasksErr) {
        toast.error(insertTasksErr.message || "Proyecto creado, pero no se pudieron generar tareas.");
        setCreateProjectDialogOpen(false);
        return;
      }

      toast.success("Proyecto y tareas creados correctamente.");
      setCreateProjectDialogOpen(false);
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleAddDealProduct(deal: Deal) {
    if (!profile?.company_id) return;
    if (!canManageDealProducts(deal)) {
      toast.error("No tienes permiso para asociar productos a esta oportunidad");
      return;
    }
    const productId = String(addDealProductValues.product_id || "").trim();
    if (!productId) {
      toast.error("Selecciona un producto");
      return;
    }
    const existing = dealProducts.find((r) => String(r.product_id) === productId);
    if (existing) {
      toast.message("Este producto ya está asociado a la oportunidad.");
      return;
    }

    const qty = Math.max(1, Math.round(Number(addDealProductValues.quantity || 1)));
    const product = activeProducts.find((p) => String(p.id) === productId) || dealProductsProductById[productId] || null;
    const suggestedUnit = product?.base_price ?? deal.value ?? 0;
    const unitPriceRaw = addDealProductValues.unit_price.trim();
    const unitPrice = unitPriceRaw ? Number(unitPriceRaw) : Number(suggestedUnit || 0);

    setAddingDealProduct(true);
    try {
      const { error } = await db.from("deal_products").insert({
        company_id: profile.company_id,
        deal_id: deal.id,
        product_id: productId,
        quantity: qty,
        unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      });
      if (error) {
        const msg = String(error.message || "");
        if (msg.toLowerCase().includes("duplicate") || msg.includes("23505")) {
          toast.message("Este producto ya está asociado a la oportunidad.");
          return;
        }
        toast.error(error.message || "No se pudo asociar el producto");
        return;
      }
      toast.success("Producto asociado a la oportunidad");
      const insertedProduct = activeProducts.find((p) => String(p.id) === productId) || (product ? (product as ProductRow) : null);
      if (insertedProduct) {
        setDealProductsProductById((prev) => ({ ...prev, [productId]: insertedProduct }));
      }
      setAddDealProductValues({ product_id: "", quantity: "1", unit_price: "" });
      // refresh
      setSelectedDeal((prev) => (prev ? { ...prev } : prev));
      // reload list by re-triggering effect using selectedDeal.id (same). Fetch manually:
      const { data: rows } = await db
        .from("deal_products")
        .select("id,deal_id,product_id,quantity,unit_price,total_price")
        .eq("company_id", profile.company_id)
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: true });
      setDealProducts((rows || []) as DealProductRow[]);
    } finally {
      setAddingDealProduct(false);
    }
  }

  async function handleRemoveDealProduct(deal: Deal, rowId: string) {
    if (!profile?.company_id) return;
    if (!canManageDealProducts(deal)) {
      toast.error("No tienes permiso para quitar productos de esta oportunidad");
      return;
    }
    setRemovingDealProductId(rowId);
    try {
      const { error } = await db.from("deal_products").delete().eq("company_id", profile.company_id).eq("id", rowId);
      if (error) {
        toast.error(error.message || "No se pudo quitar el producto");
        return;
      }
      setDealProducts((prev) => prev.filter((r) => String(r.id) !== String(rowId)));
      toast.success("Producto removido");
    } finally {
      setRemovingDealProductId(null);
    }
  }

  const loadPipelineData = useCallback(async () => {
    if (!profile?.company_id) {
      setStages([]);
      setDeals([]);
      setDealIdsByStage({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const cid = profile.company_id;
    const [{ data: s, error: sErr }, { data: d, error: dErr }] = await Promise.all([
      db.from("deal_stages").select("id,company_id,name,display_order,color,created_at,updated_at").eq("company_id", cid).order("display_order"),
      db
        .from("deals")
        .select("id,company_id,name,value,probability,expected_close,stage,lead_id,assigned_to,notes,created_at,updated_at")
        .eq("company_id", cid)
        .order("created_at", { ascending: false }),
    ]);
    if (sErr) toast.error(sErr.message);
    if (dErr) toast.error(dErr.message);
    const nextStages = (s || []) as DealStage[];
    const nextDeals = (d || []) as Deal[];
    setStages(nextStages);
    setDeals(nextDeals);

    const byStage: Record<string, string[]> = {};
    for (const stage of nextStages.filter((st) => !isWonStageName(st.name) && !isLostStageName(st.name))) {
      byStage[stage.name] = [];
    }
    for (const deal of nextDeals) {
      if (!byStage[deal.stage]) byStage[deal.stage] = [];
      byStage[deal.stage].push(deal.id);
    }
    setDealIdsByStage(byStage);

    if (nextStages.length && !newDeal.stage) {
      setNewDeal((p) => ({ ...p, stage: nextStages[0].name }));
    }
    setLoading(false);
  }, [db, newDeal.stage, profile?.company_id]);

  useEffect(() => {
    void loadPipelineData();
  }, [loadPipelineData]);

  const loadTeam = useCallback(async () => {
    if (!profile?.company_id) {
      setTeam([]);
      return;
    }

    const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_company_team_members", {
      _search: null,
      _role: null,
      _is_active: true,
      _department: null,
    });

    if (!rpcErr && Array.isArray(rpcData)) {
      setTeam(
        rpcData.map((r: any) => ({
          profile_id: r.profile_id,
          user_id: r.user_id,
          full_name: r.full_name ?? null,
          email: r.email ?? null,
          is_active: r.is_active !== false,
          role: r.role,
        })),
      );
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

    if (pErr || rErr) {
      setTeam([]);
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
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        is_active: p.is_active !== false,
        role: roleByUserId.get(p.user_id) || "viewer",
      })),
    );
  }, [profile?.company_id]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  useRealtimeTable({
    table: "deal_stages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadPipelineData();
    },
  });

  useRealtimeTable({
    table: "deals",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadPipelineData();
    },
  });

  useRealtimeTable({
    table: "products",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadActiveProducts();
    },
  });

  useRealtimeTable({
    table: "deal_products",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadDealProducts();
    },
  });

  const teamByUserId = useMemo(() => {
    const m = new Map<string, CompanyTeamMember>();
    for (const member of team) {
      if (member?.user_id) m.set(member.user_id, member);
    }
    return m;
  }, [team]);

  const teamByProfileId = useMemo(() => {
    const m = new Map<string, CompanyTeamMember>();
    for (const member of team) {
      if (member?.profile_id) m.set(member.profile_id, member);
    }
    return m;
  }, [team]);

  const loadRelated = useCallback(async () => {
    if (!profile?.company_id) return;
    if (!selectedDeal) return;

    const leadId = selectedDeal.lead_id ? String(selectedDeal.lead_id) : null;
    if (!leadId) return;

    setRelatedLoading(true);
    try {
      const tasksPromise = leadId
        ? (supabase as any)
            .from("tasks")
            .select("id,title,due_date,priority,status,assigned_to")
            .eq("company_id", profile.company_id)
            .eq("related_lead_id", leadId)
            .in("status", ["To Do", "In Progress", "Waiting"])
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const [leadRes, taskRes] = await Promise.all([
        leadId
          ? (supabase as any)
              .from("leads")
              .select("id,company_id,first_name,last_name,email,phone,whatsapp,company_name,source,source_channel,status,assigned_to")
              .eq("company_id", profile.company_id)
              .eq("id", leadId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        tasksPromise,
      ]);

      if (!leadRes.error && leadRes.data && leadId) {
        setRelatedLeadById((prev) => ({ ...prev, [leadId]: leadRes.data as LeadRow }));
      }
      if (!taskRes.error && taskRes.data && leadId) {
        setNextTaskByLeadId((prev) => ({ ...prev, [leadId]: taskRes.data as TaskRow }));
      } else if (leadId) {
        setNextTaskByLeadId((prev) => ({ ...prev, [leadId]: undefined }));
      }
    } finally {
      setRelatedLoading(false);
    }
  }, [profile?.company_id, selectedDeal]);

  useEffect(() => {
    void loadRelated();
  }, [loadRelated]);

  useRealtimeTable({
    table: "tasks",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadRelated();
    },
  });

  useRealtimeTable({
    table: "leads",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadRelated();
    },
  });

  useRealtimeTable({
    table: "clients",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadRelated();
    },
  });

  const dealById = useMemo(() => {
    const m = new Map<string, Deal>();
    deals.forEach((d) => m.set(d.id, d));
    return m;
  }, [deals]);

  const pipelineTotal = useMemo(() => {
    return deals
      .filter((d) => !wonStageNames.has(d.stage) && !lostStageNames.has(d.stage))
      .reduce((s, d) => s + toNumber(d.value), 0);
  }, [deals, wonStageNames, lostStageNames]);

  const wonTotal = useMemo(() => deals.filter((d) => wonStageNames.has(d.stage)).reduce((s, d) => s + toNumber(d.value), 0), [deals, wonStageNames]);
  const openDealsCount = useMemo(() => deals.filter((d) => !wonStageNames.has(d.stage) && !lostStageNames.has(d.stage)).length, [deals, wonStageNames, lostStageNames]);
  const avgDeal = useMemo(() => (openDealsCount > 0 ? Math.round(pipelineTotal / openDealsCount) : 0), [pipelineTotal, openDealsCount]);
  const winRate = useMemo(() => {
    const closed = deals.filter((d) => wonStageNames.has(d.stage) || lostStageNames.has(d.stage)).length;
    const won = deals.filter((d) => wonStageNames.has(d.stage)).length;
    return closed > 0 ? Math.round((won / closed) * 100) : 0;
  }, [deals, wonStageNames, lostStageNames]);

  const archivedDeals = useMemo(() => {
    const base = deals.filter((d) => lostStageNames.has(d.stage));
    const q = archivedSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((d) => {
      const hay = `${d.name} ${d.notes || ""} ${d.stage}`.toLowerCase();
      return hay.includes(q);
    });
  }, [deals, lostStageNames, archivedSearch]);

  const selectedStagesSet = useMemo(() => new Set(filters.selectedStages), [filters.selectedStages]);

  const dealMatchesFilters = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const dayMs = 1000 * 60 * 60 * 24;

    const valueMin = filters.valueMin.trim() === "" ? null : Number(filters.valueMin);
    const valueMax = filters.valueMax.trim() === "" ? null : Number(filters.valueMax);
    const probMin = filters.probMin.trim() === "" ? null : Number(filters.probMin);
    const probMax = filters.probMax.trim() === "" ? null : Number(filters.probMax);
    const staleDays = filters.followUpStaleDays.trim() === "" ? null : Number(filters.followUpStaleDays);

    const closeFrom = filters.closeFrom ? parseIsoDateOnly(filters.closeFrom) : null;
    const closeTo = filters.closeTo ? parseIsoDateOnly(filters.closeTo) : null;

    return (deal: Deal) => {
      // Status
      if (filters.status === "active") {
        if (wonStageNames.has(deal.stage) || lostStageNames.has(deal.stage)) return false;
      } else if (filters.status === "won") {
        if (!wonStageNames.has(deal.stage)) return false;
      } else if (filters.status === "lost") {
        if (!lostStageNames.has(deal.stage)) return false;
      }

      // Stage selection
      if (selectedStagesSet.size > 0 && !selectedStagesSet.has(deal.stage)) return false;

      // Assigned
      if (filters.assigned === "me") {
        if (!isDealAssignedToCurrentUser(deal.assigned_to)) return false;
      } else if (filters.assigned === "team") {
        if (!deal.assigned_to) return false;
      } else if (filters.assigned === "unassigned") {
        if (deal.assigned_to) return false;
      }

      // Value range
      if (valueMin !== null && toNumber(deal.value) < valueMin) return false;
      if (valueMax !== null && toNumber(deal.value) > valueMax) return false;

      // Probability range
      const prob = clamp(deal.probability ?? 50, 0, 100);
      if (probMin !== null && prob < probMin) return false;
      if (probMax !== null && prob > probMax) return false;

      // Expected close date
      if (filters.closePreset !== "any") {
        const close = deal.expected_close ? parseIsoDateOnly(deal.expected_close) : null;
        if (filters.closePreset === "none") {
          if (close) return false;
        } else {
          if (!close) return false;
          const closeDay = startOfDay(close);

          if (filters.closePreset === "today") {
            if (closeDay.getTime() !== today.getTime()) return false;
          } else if (filters.closePreset === "week") {
            const end = new Date(today);
            end.setDate(end.getDate() + 7);
            if (!(closeDay >= today && closeDay < end)) return false;
          } else if (filters.closePreset === "month") {
            const end = new Date(today);
            end.setMonth(end.getMonth() + 1);
            if (!(closeDay >= today && closeDay < end)) return false;
          } else if (filters.closePreset === "range") {
            if (closeFrom && closeDay < closeFrom) return false;
            if (closeTo && closeDay > closeTo) return false;
          }
        }
      }

      // Follow-up (stale)
      if (staleDays !== null && Number.isFinite(staleDays) && staleDays > 0) {
        const ts = deal.updated_at || deal.created_at;
        if (!ts) return false;
        const ageDays = Math.floor((Date.now() - new Date(ts).getTime()) / dayMs);
        if (ageDays < staleDays) return false;
      }

      return true;
    };
  }, [
    filters.status,
    filters.selectedStages,
    filters.assigned,
    filters.valueMin,
    filters.valueMax,
    filters.probMin,
    filters.probMax,
    filters.closePreset,
    filters.closeFrom,
    filters.closeTo,
    filters.followUpStaleDays,
    profile?.user_id,
    wonStageNames,
    lostStageNames,
    selectedStagesSet,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.selectedStages.length) n++;
    if (filters.assigned !== "all") n++;
    if (filters.valueMin.trim() || filters.valueMax.trim()) n++;
    if (filters.probMin.trim() || filters.probMax.trim()) n++;
    if (filters.closePreset !== "any") n++;
    if (filters.followUpStaleDays.trim()) n++;
    if (filters.status !== "active") n++;
    return n;
  }, [filters]);

  const moveDealInState = (dealId: string, toStage: string, insertBeforeId: string | null) => {
    const current = dealById.get(dealId);
    const fromStage = current?.stage || null;
    setDealIdsByStage((prev) => {
      const next: Record<string, string[]> = { ...prev };
      const ensure = (stage: string) => {
        if (!next[stage]) next[stage] = [];
      };
      ensure(toStage);
      if (fromStage) ensure(fromStage);

      // Remove from all stages (ensures id isn't duplicated).
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((id) => id !== dealId);
      }

      const list = [...next[toStage]];
      if (insertBeforeId) {
        const idx = list.indexOf(insertBeforeId);
        if (idx >= 0) list.splice(idx, 0, dealId);
        else list.push(dealId);
      } else {
        list.push(dealId);
      }
      next[toStage] = list;
      return next;
    });
  };

  const moveDealStage = async (dealId: string, stageName: string) => {
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para editar oportunidades");
      return;
    }
    const deal = dealById.get(dealId);
    if (!deal) return;

    moveDealInState(dealId, stageName, null);
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: stageName } : d)));

    const { error } = await db.from("deals").update({ stage: stageName }).eq("id", dealId);
    if (error) {
      toast.error(error.message || "No se pudo mover la oportunidad");
      return;
    }
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "deal_moved",
      entityType: "deals",
      entityId: dealId,
      detail: `Oportunidad movida a ${stageName}: ${deal.name}`,
      metadata: { stage: stageName, source: "manual" },
    }).catch(() => {});
    toast.success(`Oportunidad movida a ${stageName}`);
  };

  const getNextStageName = (currentStageName: string) => {
    const idx = pipelineStages.findIndex((s) => s.name === currentStageName);
    if (idx < 0) return null;
    return pipelineStages[idx + 1]?.name || null;
  };

  const createFollowUpTask = async (deal: Deal) => {
    if (!profile?.company_id) return;
    if (!profile?.id) {
      toast.error("No se pudo identificar el perfil actual");
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + 1);
    const dueDate = due.toISOString().split("T")[0];
    const payload = {
      company_id: profile.company_id,
      title: `Seguimiento: ${deal.name}`,
      description: deal.notes ? `Oportunidad: ${deal.name}\n\n${deal.notes}` : `Oportunidad: ${deal.name}`,
      due_date: dueDate,
      status: "To Do",
      priority: "High",
      related_lead_id: deal.lead_id || null,
      related_client_id: null,
      assigned_to:
        (deal.assigned_to
          ? teamByProfileId.get(String(deal.assigned_to))?.profile_id || teamByUserId.get(String(deal.assigned_to))?.profile_id
          : null) || profile.id,
    };
    const { error } = await db.from("tasks").insert(payload);
    if (error) {
      toast.error(error.message || "No se pudo crear la tarea");
      return;
    }
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "task_created",
      entityType: "tasks",
      detail: `Tarea creada desde pipeline: ${payload.title}`,
      metadata: { related_deal_id: deal.id, related_lead_id: deal.lead_id || null },
    }).catch(() => {});
    toast.success("Tarea creada");
  };

  function openFollowUpDialogForDeal(deal: Deal) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    const label = deal.name || "oportunidad";
    setFollowUpValues({
      title: `Dar seguimiento a ${label}`,
      due_date: dueDate,
      priority: "Medium",
      description: `Seguimiento creado desde Pipeline.\nOportunidad: ${deal.name}`,
    });
    setFollowUpOpen(true);
  }

  async function handleCreateFollowUpTaskFromDeal(deal: Deal) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }
    if (!profile?.id) {
      toast.error("No se pudo identificar el perfil actual");
      return;
    }
    if (!can("tasks.create")) {
      toast.error("No tienes permiso para crear tareas");
      return;
    }
    if (!canCreateTaskForDeal(deal)) {
      toast.error("No tienes permiso para crear seguimiento en esta oportunidad.");
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
      const assignedTo =
        (deal.assigned_to
          ? teamByProfileId.get(String(deal.assigned_to))?.profile_id || teamByUserId.get(String(deal.assigned_to))?.profile_id
          : null) || profile.id;
      const payload: Record<string, any> = {
        company_id: profile.company_id,
        title: followUpValues.title.trim(),
        description: followUpValues.description.trim() || null,
        status: "To Do",
        priority: followUpValues.priority || "Medium",
        due_date: followUpValues.due_date,
        assigned_to: assignedTo,
        related_client_id: null,
        related_lead_id: deal.lead_id || null,
      };

      const { error } = await db.from("tasks").insert(payload);
      if (error) {
        toast.error(error.message || "No se pudo crear el seguimiento");
        return;
      }

      if (deal.lead_id) {
        const leadId = String(deal.lead_id);
        setNextTaskByLeadId((prev) => ({
          ...prev,
          [leadId]: {
            id: "new",
            title: payload.title,
            due_date: payload.due_date,
            priority: payload.priority,
            status: payload.status,
            assigned_to: payload.assigned_to,
          },
        }));
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

  async function handleOpenWhatsAppFromLead(lead: LeadRow) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }
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
    }
  }

  async function handleMarkDealAsWon(deal: Deal) {
    if (!canEditDeal(deal)) {
      toast.error("No tienes permiso para realizar esta acción.");
      return;
    }
    const wonStage = findWonStageName();
    if (!wonStage) {
      toast.error("No se encontró una etapa de ganado en el pipeline.");
      return;
    }

    setClosingAsWon(true);
    try {
      const ts = new Date().toISOString();
      const nextNotes = appendNote(deal.notes, `[${ts}] Oportunidad marcada como ganada.`);
      const { error } = await db.from("deals").update({ stage: wonStage, notes: nextNotes }).eq("id", deal.id);
      if (error) {
        toast.error(error.message || "No se pudo actualizar la oportunidad.");
        return;
      }

      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "deal_moved",
        entityType: "deals",
        entityId: deal.id,
        detail: `Oportunidad marcada como ganada: ${deal.name}`,
        metadata: { stage: wonStage, outcome: "won" },
      }).catch(() => {});

      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: wonStage, notes: nextNotes } : d)));
      setSelectedDeal((prev) => (prev?.id === deal.id ? { ...prev, stage: wonStage, notes: nextNotes } : prev));

      toast.success("Oportunidad marcada como ganada.");

      if (deal.lead_id) {
        setPendingWonDealId(deal.id);
        setConvertClientDialogOpen(true);
        return;
      }

      void openCreateProjectPromptForDeal(deal);
    } finally {
      setClosingAsWon(false);
    }
  }

  async function createClientFromLead(lead: LeadRow, deal: Deal) {
    if (!profile?.company_id) throw new Error("No hay contexto de empresa");
    if (!profile?.id) throw new Error("No se pudo identificar el perfil actual");

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
      if (emailErr) throw new Error(emailErr.message || "No se pudo validar duplicados");
      if (existingByEmail?.id) return String(existingByEmail.id);
    } else {
      const phoneCandidate = lead.phone || lead.whatsapp;
      if (phoneCandidate) {
        const digits = phoneCandidate.replace(/\D/g, "");
        const phoneMatch = digits.length ? digits : phoneCandidate;
        const { data: existingByPhone, error: phoneErr } = await (supabase as any)
          .from("clients")
          .select("id,phone,whatsapp")
          .eq("company_id", companyId)
          .or(`phone.eq.${phoneMatch},whatsapp.eq.${phoneMatch}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (phoneErr) throw new Error(phoneErr.message || "No se pudo validar duplicados");
        if (existingByPhone?.id) return String(existingByPhone.id);
      }
    }

    const leadName = formatPersonName(lead.first_name, lead.last_name);
    const companyName = lead.company_name?.trim() || leadName || lead.email || lead.phone || lead.whatsapp || "Cliente sin nombre";
    const contactPerson = leadName || null;
    const phone = lead.phone || lead.whatsapp || null;
    const whatsapp = lead.whatsapp || lead.phone || null;

    const accountManagerProfileId =
      (deal.assigned_to
        ? teamByProfileId.get(String(deal.assigned_to))?.profile_id || teamByUserId.get(String(deal.assigned_to))?.profile_id
        : null) || profile.id || null;

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
      })
      .select("id")
      .single();

    if (createErr) throw new Error(createErr.message || "No se pudo crear el cliente");
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "client_created",
      entityType: "clients",
      entityId: String(created.id),
      detail: `Cliente creado desde oportunidad ganada: ${companyName}`,
      metadata: { lead_id: lead.id, deal_id: deal.id },
    }).catch(() => {});
    return String(created.id);
  }

  async function handleConvertWonDealToClient() {
    if (!pendingWonDealId) return;
    const deal = deals.find((d) => d.id === pendingWonDealId) || selectedDeal;
    if (!deal) return;

    if (!can("clients.create")) {
      toast.error("No tienes permiso para crear clientes.");
      return;
    }
    if (!canEditDeal(deal)) {
      toast.error("No tienes permiso para realizar esta acción.");
      return;
    }
    if (!deal.lead_id) {
      toast.error("Esta oportunidad no tiene prospecto conectado.");
      return;
    }

    const lead = relatedLeadById[String(deal.lead_id)];
    if (!lead) {
      toast.error("No se pudo cargar el prospecto relacionado.");
      return;
    }

    setConvertingClient(true);
    try {
      await createClientFromLead(lead, deal);
      toast.success("Cliente creado correctamente.");
      setConvertClientDialogOpen(false);
      void openCreateProjectPromptForDeal(deal);
    } catch (e) {
      const message = e instanceof Error ? e.message : "La oportunidad fue marcada como ganada, pero no se pudo crear el cliente.";
      toast.error(message);
      setConvertClientDialogOpen(false);
    } finally {
      setConvertingClient(false);
      setPendingWonDealId(null);
    }
  }

  async function handleMarkDealAsLost(deal: Deal, reason: string, note: string) {
    if (!canEditDeal(deal)) {
      toast.error("No tienes permiso para realizar esta acción.");
      return;
    }
    const lostStage = findLostStageName();
    if (!lostStage) {
      toast.error("No se encontró una etapa de perdido en el pipeline.");
      return;
    }

    setClosingAsLost(true);
    try {
      const ts = new Date().toISOString();
      const msg = note?.trim()
        ? `[${ts}] Oportunidad marcada como perdida. Razón: ${reason}. Nota: ${note.trim()}`
        : `[${ts}] Oportunidad marcada como perdida. Razón: ${reason}.`;
      const nextNotes = appendNote(deal.notes, msg);

      const { error } = await db.from("deals").update({ stage: lostStage, notes: nextNotes }).eq("id", deal.id);
      if (error) {
        toast.error(error.message || "No se pudo actualizar la oportunidad.");
        return;
      }

      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "deal_moved",
        entityType: "deals",
        entityId: deal.id,
        detail: `Oportunidad marcada como perdida: ${deal.name}`,
        metadata: { stage: lostStage, outcome: "lost", reason },
      }).catch(() => {});

      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: lostStage, notes: nextNotes } : d)));
      setSelectedDeal((prev) => (prev?.id === deal.id ? { ...prev, stage: lostStage, notes: nextNotes } : prev));
      toast.success("Oportunidad marcada como perdida.");
      setLostDialogOpen(false);
      setLostNote("");
    } finally {
      setClosingAsLost(false);
    }
  }

  const getDragAfterId = (orderedIds: string[], draggingId: string, y: number) => {
    let closestId: string | null = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    for (const id of orderedIds) {
      if (id === draggingId) continue;
      const el = dealRefs.current[id];
      if (!el) continue;
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestId = id;
      }
    }
    return closestId;
  };

  const handleDropCommit = async (stageName: string) => {
    if (!draggedDealId) return;
    if (!can("deals.edit")) {
      toast.error("No tienes permiso para editar deals");
      setDraggedDealId(null);
      setDragOverStage(null);
      return;
    }
    const deal = dealById.get(draggedDealId);
    if (!deal) return;
    setDragOverStage(null);

    if (deal.stage === stageName) {
      toast.success(`Deal movido a ${stageName}`);
      setDraggedDealId(null);
      return;
    }

    // Optimistic UI (dealIdsByStage already updated during dragover).
    setDeals((prev) => prev.map((d) => (d.id === draggedDealId ? { ...d, stage: stageName } : d)));

    const { error } = await db.from("deals").update({ stage: stageName }).eq("id", draggedDealId);
    if (error) {
      toast.error(error.message || "No se pudo mover el deal");
      // Rollback: refetch is safest (no order column to reconcile).
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        if (!profile?.company_id) return;
        const cid = profile.company_id;
        const [{ data: d2 }] = await Promise.all([
          db
            .from("deals")
            .select("id,company_id,name,value,probability,expected_close,stage,lead_id,assigned_to,notes,created_at,updated_at")
            .eq("company_id", cid)
            .order("created_at", { ascending: false }),
        ]);
        setDeals((d2 || []) as Deal[]);
      })();
      return;
    }

    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "deal_moved",
      entityType: "deals",
      entityId: draggedDealId,
      detail: `Oportunidad movida a ${stageName}: ${deal.name}`,
      metadata: { stage: stageName, source: "drag" },
    }).catch(() => {});

    toast.success(`Deal movido a ${stageName}`);
    setDraggedDealId(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    if (!can(editDeal ? "deals.edit" : "deals.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    if (!editDeal) {
      if (!newDeal.source_type) {
        toast.error("Selecciona si la oportunidad viene de un prospecto, cliente o sin contacto.");
        return;
      }

      if (newDeal.source_type === "lead" && !newDeal.lead_id) {
        toast.error("Selecciona un prospecto para conectar la oportunidad.");
        return;
      }
    }

    if (editDeal) {
      const { error } = await db
        .from("deals")
        .update({
          name: newDeal.name,
          value: Number(newDeal.value) || 0,
          probability: Number(newDeal.probability) || 50,
          expected_close: newDeal.expected_close || null,
          stage: newDealStageOverride || newDeal.stage,
        })
        .eq("id", editDeal.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "deal_updated",
        entityType: "deals",
        entityId: editDeal.id,
        detail: `Oportunidad actualizada: ${newDeal.name}`,
        metadata: { stage: newDealStageOverride || newDeal.stage },
      }).catch(() => {});
      toast.success("Oportunidad actualizada");
      setDialogOpen(false);
      setEditDeal(null);
    } else {
      const { error } = await db.from("deals").insert({
        company_id: profile.company_id,
        name: newDeal.name,
        value: Number(newDeal.value) || 0,
        probability: Number(newDeal.probability) || 50,
        expected_close: newDeal.expected_close || null,
        stage: newDealStageOverride || newDeal.stage,
        lead_id: newDeal.source_type === "lead" && newDeal.lead_id ? newDeal.lead_id : null,
        assigned_to: null,
        created_by: profile?.id || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "deal_created",
        entityType: "deals",
        detail: `Oportunidad creada: ${newDeal.name}`,
        metadata: {
          stage: newDealStageOverride || newDeal.stage,
          lead_id: newDeal.source_type === "lead" ? newDeal.lead_id || null : null,
        },
      }).catch(() => {});
      toast.success("Oportunidad creada");
      setDialogOpen(false);
    }

    setNewDealStageOverride(null);
    setNewDeal({ name: "", value: "", probability: "50", expected_close: "", stage: stages[0]?.name || "", source_type: "", lead_id: "", client_id: "" });
    // Refetch deals only
    if (!profile?.company_id) return;
    const cid = profile.company_id;
    const { data: d2 } = await db
      .from("deals")
      .select("id,company_id,name,value,probability,expected_close,stage,lead_id,assigned_to,notes,created_at,updated_at")
      .eq("company_id", cid)
      .order("created_at", { ascending: false });
    const nextDeals = (d2 || []) as Deal[];
    setDeals(nextDeals);
    const byStage: Record<string, string[]> = {};
    for (const stage of stages.filter((st) => !isWonStageName(st.name) && !isLostStageName(st.name))) {
      byStage[stage.name] = [];
    }
    for (const deal of nextDeals) {
      if (!byStage[deal.stage]) byStage[deal.stage] = [];
      byStage[deal.stage].push(deal.id);
    }
    setDealIdsByStage(byStage);
  };

  const restoreArchivedDeal = async (dealId: string) => {
    if (!profile?.company_id) return;
    const firstActive = pipelineStages[0]?.name;
    if (!firstActive) {
      toast.error("No hay etapas activas para restaurar");
      return;
    }

    const { error } = await db.from("deals").update({ stage: firstActive }).eq("id", dealId);
    if (error) {
      toast.error(error.message || "No se pudo restaurar");
      return;
    }

    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: firstActive } : d)));
    setDealIdsByStage((prev) => {
      const next: Record<string, string[]> = { ...prev };
      for (const k of Object.keys(next)) next[k] = next[k].filter((id) => id !== dealId);
      if (!next[firstActive]) next[firstActive] = [];
      next[firstActive] = [dealId, ...next[firstActive]];
      return next;
    });
    toast.success("Oportunidad restaurada");
  };

  if (loading) return <div className="p-6"><LoadingMetrics count={6} /></div>;

  return (
    <div data-demo="pipeline-main" className="min-h-[calc(100vh-72px)] bg-[#f6f8fb] text-[#101828]">
      <div className="px-4 sm:px-5 lg:px-6 py-4">
        <div className="min-w-[1120px]">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-[52px] w-[52px] rounded-[18px] grid place-items-center text-white bg-[linear-gradient(135deg,#1d62f9,#0ea5e9)] shadow-[0_14px_28px_rgba(29,98,249,0.18)]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-[26px] leading-none tracking-[-0.03em] font-semibold">Pipeline de Ventas</h1>
                <div className="mt-2 text-[13px] font-normal text-[#667085] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    Pipeline: <strong className="text-[#1d62f9] font-semibold">${pipelineTotal.toLocaleString()}</strong>
                  </span>
                  <span className="text-[#cbd5e1]">·</span>
                  <span>
                    Abiertas: <strong className="text-[#101828] font-semibold">{openDealsCount}</strong>
                  </span>
                  <span className="text-[#cbd5e1]">·</span>
                  <span>
                    Ticket: <strong className="text-[#101828] font-semibold">${avgDeal.toLocaleString()}</strong>
                  </span>
                  <span className="text-[#cbd5e1]">·</span>
                  <span>
                    Win rate: <strong className="text-[#101828] font-semibold">{winRate}%</strong>
                  </span>
                  <span className="text-[#cbd5e1]">·</span>
                  <span>
                    Ganado: <strong className="text-[#1d62f9] font-semibold">${wonTotal.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            </div>

            {can("deals.create") && (
              <button
                data-demo="pipeline-new-deal-button"
                className="h-[42px] px-[14px] rounded-[13px] bg-[#1d62f9] text-white font-semibold text-[13px] flex items-center gap-2 shadow-[0_12px_24px_rgba(29,98,249,0.20)] hover:opacity-95"
                onClick={() => {
                  setEditDeal(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Nueva oportunidad
              </button>
            )}
          </div>

          {/* Tools */}
          <div className="flex items-center gap-2 mb-5">
            <button
              className={
                "h-[38px] px-[13px] rounded-[12px] border text-[13px] font-semibold flex items-center gap-2 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all " +
                (viewMode === "board"
                  ? "bg-[#1d62f9] text-white border-[#1d62f9] shadow-[0_12px_26px_rgba(29,98,249,0.22)]"
                  : "bg-white text-[#344054] border-[#e6eaf0] hover:-translate-y-[1px] hover:border-[#bdd1ff]")
              }
              onClick={() => setViewMode("board")}
            >
              <BarChart3 className="h-4 w-4" /> Tablero
            </button>
            <button
              className={
                "h-[38px] px-[13px] rounded-[12px] border text-[13px] font-semibold flex items-center gap-2 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all " +
                (viewMode === "list"
                  ? "bg-[#1d62f9] text-white border-[#1d62f9] shadow-[0_12px_26px_rgba(29,98,249,0.22)]"
                  : "bg-white text-[#344054] border-[#e6eaf0] hover:-translate-y-[1px] hover:border-[#bdd1ff]")
              }
              onClick={() => setViewMode("list")}
            >
              <Filter className="h-4 w-4" /> Lista
            </button>
            <button
              className={
                "h-[38px] px-[13px] rounded-[12px] border text-[13px] font-semibold flex items-center gap-2 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all " +
                (archivedOpen
                  ? "bg-[#1d62f9] text-white border-[#1d62f9] shadow-[0_12px_26px_rgba(29,98,249,0.22)]"
                  : "bg-white text-[#344054] border-[#e6eaf0] hover:-translate-y-[1px] hover:border-[#bdd1ff]")
              }
              onClick={() => setArchivedOpen(true)}
              type="button"
            >
              Archivados
            </button>
            <div className="ml-auto">
              <button
                className="h-[38px] px-[13px] rounded-[12px] border border-[#e6eaf0] bg-white text-[#344054] text-[13px] font-semibold flex items-center gap-2 shadow-[0_8px_22px_rgba(15,23,42,0.05)] hover:-translate-y-[1px] hover:border-[#bdd1ff]"
                onClick={() => setFiltersOpen(true)}
                type="button"
              >
                <Filter className="h-4 w-4" /> Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#eaf1ff] px-2 text-[12px] font-black text-[#1d62f9]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

      {pipelineStages.length === 0 ? (
        <EmptyState icon={<DollarSign className="h-6 w-6" />} title="No hay etapas en el pipeline" description="Configura etapas para empezar a mover oportunidades." />
      ) : (
        <>
          {viewMode === "list" ? (
            <div className="rounded-[22px] border border-[#e6eaf0] bg-[rgba(255,255,255,0.78)] shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-5">
              <div className="text-[13px] font-semibold text-[#667085]">La vista de lista estará disponible pronto (usa el tablero para mover oportunidades).</div>
            </div>
          ) : (
            <>
              {pipelineStages.length > DESKTOP_STAGES_PER_PAGE ? (
                <div className="hidden lg:flex items-center justify-end gap-2 mb-3">
                  <span className="text-[12px] font-semibold text-[#667085]">Etapas visibles</span>
                  <Select value={String(Math.min(boardStagePage, stagePages.length - 1))} onValueChange={(v) => setBoardStagePage(Number(v) || 0)}>
                    <SelectTrigger className="h-9 w-[140px] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stagePages.map((p, i) => (
                        <SelectItem key={p.label} value={String(i)}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div
                data-demo="pipeline-board"
                className="flex gap-3 overflow-x-auto pb-6 lg:grid lg:overflow-x-hidden lg:pb-0"
                style={{ gridTemplateColumns: `repeat(${visiblePipelineStages.length || 1}, minmax(0, 1fr))` }}
              >
                {visiblePipelineStages.map((stage, localIdx) => {
                  const pageOffset = pipelineStages.length > DESKTOP_STAGES_PER_PAGE ? stagePages[Math.min(Math.max(0, boardStagePage), stagePages.length - 1)]?.from || 0 : 0;
                  const idx = pageOffset + localIdx;
                  const stageColor = normalizeHex(stage.color || "") || stageDefaults(stage.name);
                  const stageSoft = rgba(stageColor, 0.1);
                  const stageShadow = rgba(stageColor, 0.22);
                  const stageIds = dealIdsByStage[stage.name] || [];
                  const stageDeals = stageIds
                    .map((id) => dealById.get(id))
                    .filter((d): d is Deal => Boolean(d) && dealMatchesFilters(d as Deal));
                  const isDragOver = dragOverStage === stage.name;
                  const stageValueTotal = stageDeals.reduce((s, d) => s + toNumber(d.value), 0);

                  return (
                    <div
                      key={stage.id}
                      data-demo={`pipeline-stage-${idx + 1}`}
                      data-stage={stage.name}
                      className={
                      "relative overflow-hidden rounded-[20px] border bg-[rgba(255,255,255,0.78)] shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition-all flex flex-col flex-none w-[260px] lg:w-auto lg:flex-1 lg:min-w-0 lg:h-[calc(100vh-290px)] " +
                      (isDragOver ? " -translate-y-[2px]" : "")
                      }
                      style={{
                        borderColor: isDragOver ? stageColor : "#e6eaf0",
                        boxShadow: isDragOver ? "0 20px 56px rgba(15, 23, 42, 0.11)" : undefined,
                      }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggedDealId) return;
                      setDragOverStage(stage.name);
                      const ordered = dealIdsByStage[stage.name] || [];
                      const afterId = getDragAfterId(ordered, draggedDealId, e.clientY);
                      moveDealInState(draggedDealId, stage.name, afterId);
                    }}
                    onDragLeave={(e) => {
                      const related = e.relatedTarget as Node | null;
                      if (related && (e.currentTarget as HTMLElement).contains(related)) return;
                      setDragOverStage((prev) => (prev === stage.name ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverStage(null);
                      setDraggedDealId(null);
                      // eslint-disable-next-line @typescript-eslint/no-floating-promises
                      handleDropCommit(stage.name);
                    }}
                    >
                      <div className="absolute left-0 right-0 top-0 h-1" style={{ background: stageColor }} />
                    <div className="px-3.5 pt-3.5 pb-3 grid gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-6 w-6 rounded-[9px] grid place-items-center text-white text-[12px] font-black shrink-0"
                          style={{ background: stageColor, boxShadow: `0 10px 20px ${stageShadow}` }}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[13px] font-semibold tracking-[-0.015em] truncate" style={{ color: stageColor }}>
                            {stage.name}
                          </h3>
                          <div className="mt-0.5 text-[11px] font-semibold text-[#667085]">
                            {stageDeals.length} oportunidades · ${stageValueTotal.toLocaleString()}
                          </div>
                        </div>
                        </div>

                        {can("deals.create") ? (
                          <button
                            type="button"
                            className="h-8 w-8 rounded-[12px] border border-[#dbe7ff] bg-white text-[#1d62f9] grid place-items-center shadow-[0_8px_18px_rgba(15,23,42,0.08)] hover:bg-[#f0f6ff] shrink-0"
                            onClick={() => {
                              setNewDealStageOverride(stage.name);
                              setNewDeal((p) => ({ ...p, stage: stage.name }));
                              setEditDeal(null);
                              setDialogOpen(true);
                            }}
                            aria-label="Nuevo deal en esta etapa"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <div className="text-[11px] font-medium text-[#98a2b3] hidden lg:block">Arrastra y suelta</div>
                    </div>

                    <div
                      className="px-2.5 pb-3 grid gap-2 min-h-[160px] transition-colors flex-1 overflow-y-auto"
                      style={{ background: isDragOver ? rgba(stageColor, 0.07) : "transparent" }}
                    >
                      {stageDeals.length === 0 ? (
                        <div className="rounded-[12px] border border-dashed border-[#dbe3ee] bg-white/70 px-3 py-4 text-center text-[12px] font-medium text-[#98a2b3]">
                          No hay oportunidades en esta etapa.
                        </div>
                      ) : null}
                      {stageDeals.map((deal) => {
                        const prob = clamp(deal.probability ?? 50, 0, 100);
                        const borderHover = rgba(stageColor, 0.38);
                        return (
                          <div
                            key={deal.id}
                            ref={(el) => {
                              dealRefs.current[deal.id] = el;
                            }}
                            draggable
                            onDragStart={(e) => {
                              setDraggedDealId(deal.id);
                              setDragOverStage(stage.name);
                              // Some browsers require dataTransfer to be set to enable drag.
                              e.dataTransfer.setData("text/plain", deal.id);
                            }}
                            onDragEnd={() => {
                              setDraggedDealId(null);
                              setDragOverStage(null);
                            }}
                            className={
                              "group relative select-none cursor-grab rounded-[16px] border bg-white p-2.5 shadow-[0_10px_18px_rgba(15,23,42,0.05)] transition-all " +
                              (draggedDealId === deal.id ? "opacity-50 rotate-[2deg] scale-[0.98] cursor-grabbing" : "")
                            }
                            style={{ borderColor: "#e6eaf0" }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = borderHover;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = "#e6eaf0";
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <strong className="block text-[13px] font-semibold tracking-[-0.015em] line-clamp-2">
                                  {deal.name}
                                </strong>
                                <span className="block text-[11px] font-medium text-[#667085] line-clamp-1">
                                {deal.lead_id ? "Prospecto conectado" : "Prospecto: —"}
                                </span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-[26px] w-[26px] rounded-[10px] grid place-items-center text-[#667085] hover:bg-[#f2f5f9]">
                                    •••
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setSelectedDeal(deal)}>Ver detalle</DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditDeal(deal);
                                      setNewDeal({
                                        name: deal.name,
                                        value: String(deal.value ?? 0),
                                        probability: String(deal.probability ?? 50),
                                        expected_close: deal.expected_close || "",
                                        stage: deal.stage,
                                      });
                                      setDialogOpen(true);
                                    }}
                                  >
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => createFollowUpTask(deal)}>Crear tarea</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const next = getNextStageName(deal.stage);
                                      if (!next) {
                                        toast.error("No hay siguiente etapa");
                                        return;
                                      }
                                      await moveDealStage(deal.id, next);
                                    }}
                                  >
                                    Mover a la siguiente etapa
                                  </DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Mover a…</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="max-h-72 overflow-auto">
                                      {pipelineStages.map((s) => (
                                        <DropdownMenuItem key={s.id} onClick={() => moveDealStage(deal.id, s.name)}>
                                          {s.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => moveDealStage(deal.id, archiveStageName)}>
                                    Archivar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteDealId(deal.id)}
                                  >
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center justify-between gap-3 mb-2.5">
                              <div className="text-[16px] font-semibold tracking-[-0.02em]" style={{ color: stageColor }}>
                                ${toNumber(deal.value).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="text-[12px] font-medium text-[#475467]">{prob}%</div>
                                <div className="h-1.5 w-[74px] rounded-full bg-[#e8edf3] overflow-hidden">
                                  <span className="block h-full rounded-full" style={{ width: `${prob}%`, background: stageColor }} />
                                </div>
                              </div>
                            </div>

                            {deal.expected_close && (
                              <div className="flex items-center gap-2 text-[11px] font-medium text-[#475467] mb-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{formatDateLabel(deal.expected_close)}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 rounded-[9px] px-2 py-1 text-[11px] font-medium" style={{ background: stageSoft, color: stageColor }}>
                                <DollarSign className="h-3.5 w-3.5" /> Oportunidad
                              </span>
                            </div>

                            <div className="absolute right-3.5 bottom-3.5 flex gap-1.5 opacity-0 translate-y-1 pointer-events-none transition-all group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
                              <button
                                className="h-[30px] w-[30px] rounded-[10px] border border-[#dbe7ff] bg-white text-[#1d62f9] grid place-items-center shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedDeal(deal);
                                }}
                                type="button"
                                aria-label="Abrir detalles del deal"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                className="h-[30px] w-[30px] rounded-[10px] border border-[#dbe7ff] bg-white text-[#1d62f9] grid place-items-center shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void openWhatsappForDeal(deal);
                                }}
                                type="button"
                                aria-label="Abrir conversación de WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editDeal ? "Editar oportunidad" : "Nueva oportunidad"}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            {!editDeal ? (
              <div className="rounded-[14px] border bg-muted/20 p-3">
                <Label>Origen de la oportunidad</Label>
                <Select
                  value={newDeal.source_type || undefined}
                  onValueChange={(v) =>
                    setNewDeal({
                      ...newDeal,
                      source_type: v,
                      lead_id: v === "lead" ? newDeal.lead_id : "",
                      client_id: v === "client" ? newDeal.client_id : "",
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona el origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Prospecto existente</SelectItem>
                    <SelectItem value="client">Cliente existente</SelectItem>
                    <SelectItem value="none">Sin contacto todavía</SelectItem>
                  </SelectContent>
                </Select>

                {newDeal.source_type === "lead" ? (
                  <div className="mt-3">
                    <Label>Prospecto</Label>
                    <Select
                      value={newDeal.lead_id}
                      onValueChange={(v) => {
                        const lead = dealLeadOptions.find((l) => String(l.id) === String(v));
                        const label =
                          lead?.company_name ||
                          [lead?.first_name, lead?.last_name].filter(Boolean).join(" ") ||
                          lead?.email ||
                          lead?.phone ||
                          "Nueva oportunidad";

                        setNewDeal({
                          ...newDeal,
                          lead_id: v,
                          name: newDeal.name || label,
                          value: newDeal.value || (lead?.estimated_value ? String(lead.estimated_value) : ""),
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={dealSourceOptionsLoading ? "Cargando prospectos…" : "Selecciona un prospecto"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dealLeadOptions.map((lead) => {
                          const label =
                            lead.company_name ||
                            [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
                            lead.email ||
                            lead.phone ||
                            String(lead.id);

                          return (
                            <SelectItem key={lead.id} value={lead.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {newDeal.source_type === "client" ? (
                  <div className="mt-3">
                    <Label>Cliente</Label>
                    <Select
                      value={newDeal.client_id}
                      onValueChange={(v) => {
                        const client = dealClientOptions.find((c) => String(c.id) === String(v));
                        const label =
                          client?.company_name ||
                          client?.contact_person ||
                          client?.email ||
                          client?.phone ||
                          "Nueva oportunidad";

                        setNewDeal({
                          ...newDeal,
                          client_id: v,
                          name: newDeal.name || label,
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={dealSourceOptionsLoading ? "Cargando clientes…" : "Selecciona un cliente"} />
                      </SelectTrigger>
                      <SelectContent>
                        {dealClientOptions.map((client) => {
                          const label =
                            client.company_name ||
                            client.contact_person ||
                            client.email ||
                            client.phone ||
                            String(client.id);

                          return (
                            <SelectItem key={client.id} value={client.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {!editDeal && activeProducts.length > 0 ? (
                  <div className="mt-3">
                    <Label>Producto o servicio</Label>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        const product = activeProducts.find((p) => String(p.id) === String(v));
                        if (!product) return;
                        const contactLabel =
                          selectedSourceLead?.company_name ||
                          formatPersonName(selectedSourceLead?.first_name, selectedSourceLead?.last_name) ||
                          selectedSourceClient?.company_name ||
                          selectedSourceClient?.contact_person ||
                          "";
                        const suggestedName = contactLabel ? `${product.name} — ${contactLabel}` : product.name;
                        setNewDeal((current) => ({
                          ...current,
                          name: suggestedName,
                          value: current.value || (product.base_price != null ? String(product.base_price) : ""),
                        }));
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={activeProductsLoading ? "Cargando productos…" : "Selecciona un producto para sugerir nombre y valor"} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}{product.base_price != null ? ` · ${money(product.base_price)}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {!editDeal && (selectedSourceLead || selectedSourceClient) ? (
                  <div className="mt-3 rounded-[12px] border bg-white px-3 py-2.5 text-xs text-muted-foreground space-y-1.5">
                    <div className="font-medium text-foreground">Usa la información del prospecto o cliente para crear la oportunidad más rápido.</div>
                    <div>Los datos de contacto se muestran como referencia y no se guardan dentro de la oportunidad.</div>

                    {selectedSourceLead ? (
                      <div className="grid gap-1 pt-1">
                        <div><span className="font-medium text-foreground">Prospecto:</span> {selectedSourceLead.company_name || formatPersonName(selectedSourceLead.first_name, selectedSourceLead.last_name) || "—"}</div>
                        <div><span className="font-medium text-foreground">Contacto:</span> {formatPersonName(selectedSourceLead.first_name, selectedSourceLead.last_name) || "—"}</div>
                        <div><span className="font-medium text-foreground">Teléfono:</span> {selectedSourceLead.phone || "—"}</div>
                        <div><span className="font-medium text-foreground">WhatsApp:</span> {selectedSourceLead.whatsapp || "—"}</div>
                        <div><span className="font-medium text-foreground">Email:</span> {selectedSourceLead.email || "—"}</div>
                        <div><span className="font-medium text-foreground">Origen:</span> {selectedSourceLead.source_channel || selectedSourceLead.source || "—"}</div>
                        <div><span className="font-medium text-foreground">Valor estimado:</span> {selectedSourceLead.estimated_value != null ? money(selectedSourceLead.estimated_value) : "—"}</div>
                        <div><span className="font-medium text-foreground">Interés de producto:</span> {selectedSourceLead.product_interest || "—"}</div>
                        <div><span className="font-medium text-foreground">Contexto comercial:</span> {selectedSourceLead.notes || "—"}</div>
                      </div>
                    ) : null}

                    {selectedSourceClient ? (
                      <div className="grid gap-1 pt-1">
                        <div><span className="font-medium text-foreground">Empresa:</span> {selectedSourceClient.company_name || "—"}</div>
                        <div><span className="font-medium text-foreground">Contacto:</span> {selectedSourceClient.contact_person || "—"}</div>
                        <div><span className="font-medium text-foreground">Teléfono:</span> {selectedSourceClient.phone || "—"}</div>
                        <div><span className="font-medium text-foreground">WhatsApp:</span> {selectedSourceClient.whatsapp || "—"}</div>
                        <div><span className="font-medium text-foreground">Email:</span> {selectedSourceClient.email || "—"}</div>
                        <div><span className="font-medium text-foreground">Estado:</span> {selectedSourceClient.status || "—"}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {newDeal.source_type === "none" ? (
                  <div className="mt-3 rounded-[12px] border bg-white px-3 py-3 text-xs text-muted-foreground space-y-3">
                    <p>
                      Esta oportunidad no tiene un prospecto o cliente conectado. Para mantener el historial completo, primero crea un cliente y luego vuelve a crear la oportunidad.
                    </p>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          window.location.href = "/clients";
                        }}
                      >
                        Crear nuevo cliente
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {(editDeal || newDeal.source_type === "none" || (newDeal.source_type === "lead" && newDeal.lead_id) || (newDeal.source_type === "client" && newDeal.client_id)) ? (
              <>
            <div><Label>Nombre de la oportunidad</Label><Input placeholder="Nombre de la oportunidad" value={newDeal.name} onChange={(e) => setNewDeal({ ...newDeal, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor ($)</Label><Input type="number" placeholder="0" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })} /></div>
              <div><Label>Probabilidad (%)</Label><Input type="number" placeholder="50" value={newDeal.probability} onChange={(e) => setNewDeal({ ...newDeal, probability: e.target.value })} min="0" max="100" /></div>
            </div>
            <div><Label>Cierre esperado</Label><Input type="date" value={newDeal.expected_close} onChange={(e) => setNewDeal({ ...newDeal, expected_close: e.target.value })} /></div>
            <div><Label>Etapa</Label>
              <Select value={newDeal.stage} onValueChange={(v) => setNewDeal({ ...newDeal, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editDeal ? "Guardar" : "Crear oportunidad"}</Button>
            </div>
              </>
            ) : (
              <div className="rounded-[14px] border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                Selecciona un prospecto, cliente o la opción “Sin contacto todavía” para continuar creando la oportunidad.
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedDeal && (
	        <DetailSheet
	          open={!!selectedDeal}
	          onClose={closePipelineDetailSafely}
	          title={selectedDeal.name}
	          accent="green"
	          icon={<BriefcaseBusiness className="h-5 w-5 text-emerald-600" />}
	          status={selectedDeal.stage}
	          onEdit={can("deals.edit") ? () => {
            setEditDeal(selectedDeal);
            setNewDeal({
              name: selectedDeal.name,
              value: String(selectedDeal.value ?? 0),
              probability: String(selectedDeal.probability ?? 50),
              expected_close: selectedDeal.expected_close || "",
              stage: selectedDeal.stage,
              source_type: selectedDeal.lead_id ? "lead" : "none",
              lead_id: selectedDeal.lead_id || "",
            });
            setDialogOpen(true);
          } : undefined}
          onDelete={can("deals.delete") ? () => setDeleteDealId(selectedDeal.id) : undefined}
          fieldGroupDataDemo="pipeline-detail-summary"
          fields={[
            { label: "Etapa", value: selectedDeal.stage, type: "badge" },
            { label: "Valor", value: selectedDeal.value, type: "currency" },
            { label: "Probabilidad", value: `${selectedDeal.probability ?? 50}%` },
            { label: "Cierre esperado", value: selectedDeal.expected_close },
            {
              label: "Responsable",
              value: selectedDeal.assigned_to ? (teamByProfileId.get(String(selectedDeal.assigned_to))?.full_name || teamByUserId.get(String(selectedDeal.assigned_to))?.full_name || String(selectedDeal.assigned_to)) : null,
            },
            { label: "Cliente", value: null },
            { label: "Prospecto", value: selectedDeal.lead_id ? "Conectado" : null },
          ]}
          notes={selectedDeal.notes || undefined}
        >
          <div className="space-y-4">
            {(() => {
              const isWon = wonStageNames.has(selectedDeal.stage);
              const isLost = lostStageNames.has(selectedDeal.stage);
              return (
                <div data-demo="pipeline-close" className="rounded-[16px] border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cierre de oportunidad</div>
                      <div className="mt-1 text-sm font-medium text-muted-foreground">
                        {isWon ? "Oportunidad cerrada como ganada." : isLost ? "Oportunidad cerrada como perdida." : "Marca el resultado final cuando esté listo."}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={!canEditDeal(selectedDeal) || isWon || isLost || closingAsLost || closingAsWon}
                        onClick={() => setLostDialogOpen(true)}
                      >
                        Marcar perdida
                      </Button>
                      <Button
                        size="sm"
                        className="h-9"
                        disabled={!canEditDeal(selectedDeal) || isWon || isLost || closingAsLost || closingAsWon}
                        onClick={() => void handleMarkDealAsWon(selectedDeal)}
                      >
                        Marcar ganada
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div data-demo="pipeline-commercial-summary" className="rounded-[16px] border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Resumen comercial</div>
                  <div className="mt-1 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Valor</div>
                      <div className="font-semibold">${toNumber(selectedDeal.value).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Probabilidad</div>
                      <div className="font-semibold">{clamp(selectedDeal.probability ?? 50, 0, 100)}%</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Cierre esperado</div>
                      <div className="font-semibold">{selectedDeal.expected_close ? formatDateLabel(selectedDeal.expected_close) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Responsable</div>
                      <div className="font-semibold">
                        {selectedDeal.assigned_to ? teamByProfileId.get(String(selectedDeal.assigned_to))?.full_name || teamByUserId.get(String(selectedDeal.assigned_to))?.full_name || "—" : "Sin asignar"}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  disabled={!canCreateTaskForDeal(selectedDeal)}
                  title={!canCreateTaskForDeal(selectedDeal) ? "No tienes permiso para crear tareas en esta oportunidad." : "Crear seguimiento para esta oportunidad."}
                  onClick={() => openFollowUpDialogForDeal(selectedDeal)}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Crear seguimiento
                </Button>
              </div>
            </div>

            <div data-demo="pipeline-prospect" className="rounded-[16px] border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Prospecto</div>
                {selectedDeal.lead_id ? (
                  <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => (window.location.href = "/leads")}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No conectado</span>
                )}
              </div>

              {relatedLoading && selectedDeal.lead_id ? (
                <div className="mt-2 text-sm text-muted-foreground">Cargando…</div>
              ) : selectedLead ? (
                <div className="mt-2 space-y-2 text-sm">
                  <div className="font-semibold">
                    {selectedLead.company_name ||
                      formatPersonName(selectedLead.first_name, selectedLead.last_name) ||
                      selectedLead.email ||
                      selectedLead.phone ||
                      "Prospecto"}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[13px]">
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Email</div>
                      <div className="font-medium">{selectedLead.email || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Teléfono</div>
                      <div className="font-medium">{selectedLead.whatsapp || selectedLead.phone || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Fuente</div>
                      <div className="font-medium">{selectedLead.source_channel || selectedLead.source || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Estado</div>
                      <div className="font-medium">{selectedLead.status || "—"}</div>
                    </div>
                  </div>
                </div>
              ) : selectedDeal.lead_id ? (
                <div className="mt-2 text-sm text-muted-foreground">No se pudo cargar el prospecto.</div>
              ) : null}
            </div>

            <div className="rounded-[16px] border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</div>
                <span className="text-xs text-muted-foreground">Sin enlace directo</span>
              </div>

              <div className="mt-2 text-sm text-muted-foreground">
                Este deal no guarda un `client_id` directo en el esquema actual. Usa el prospecto relacionado para el contexto comercial.
              </div>
            </div>

            <div data-demo="pipeline-deal-products" className="rounded-[16px] border bg-white p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Productos de la oportunidad</div>
                <div className="text-xs text-muted-foreground">{dealProducts.length ? `${dealProducts.length} asociado(s)` : "Sin productos"}</div>
              </div>

              {dealProductsLoading ? (
                <div className="mt-2 text-sm text-muted-foreground">Cargando productos…</div>
              ) : dealProducts.length ? (
                <div className="mt-3 space-y-2">
                  {dealProducts.map((row) => {
                    const product = dealProductsProductById[String(row.product_id)];
                    const qty = Math.max(1, Number(row.quantity || 1));
                    const unit = toNumber(row.unit_price);
                    const total = row.total_price != null ? toNumber(row.total_price) : qty * unit;
                    return (
                      <div key={row.id} className="flex items-start justify-between gap-3 rounded-[12px] border bg-background p-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div className="text-[13px] font-medium truncate">{product?.name || String(row.product_id)}</div>
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            {qty} × {money(unit)} = <span className="font-medium text-foreground">{money(total)}</span>
                          </div>
                        </div>
                        {canManageDealProducts(selectedDeal) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={removingDealProductId === row.id}
                            onClick={() => void handleRemoveDealProduct(selectedDeal, row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">
                  No hay productos asociados. Asocia el producto vendido para crear proyectos con el workflow correcto.
                </div>
              )}

              {canManageDealProducts(selectedDeal) ? (
                <div className="mt-4 rounded-[12px] border bg-background p-3">
                  <div className="text-xs font-semibold text-muted-foreground">Agregar producto</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Select
                        value={addDealProductValues.product_id}
                        onValueChange={(v) => {
                          const nextProductId = String(v || "");
                          const product = activeProducts.find((p) => String(p.id) === nextProductId) || null;
                          const suggestedUnit = product?.base_price ?? selectedDeal.value ?? 0;
                          setAddDealProductValues((p) => ({
                            ...p,
                            product_id: nextProductId,
                            unit_price: p.unit_price.trim() ? p.unit_price : String(toNumber(suggestedUnit) || 0),
                          }));
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={activeProductsLoading ? "Cargando productos…" : "Selecciona un producto"} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.category ? `${p.name} · ${p.category}` : p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="h-9"
                      type="number"
                      min="1"
                      value={addDealProductValues.quantity}
                      onChange={(e) => setAddDealProductValues((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="Qty"
                    />
                    <Input
                      className="h-9"
                      type="number"
                      value={addDealProductValues.unit_price}
                      onChange={(e) => setAddDealProductValues((p) => ({ ...p, unit_price: e.target.value }))}
                      placeholder="Unit $"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      className="h-8"
                      disabled={addingDealProduct || !addDealProductValues.product_id}
                      onClick={() => void handleAddDealProduct(selectedDeal)}
                    >
                      {addingDealProduct ? "Agregando…" : "Agregar"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div data-demo="pipeline-followup" className="rounded-[16px] border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Seguimiento</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  disabled={!canCreateTaskForDeal(selectedDeal)}
                  title={!canCreateTaskForDeal(selectedDeal) ? "No tienes permiso para crear tareas en esta oportunidad." : "Crear una tarea de seguimiento."}
                  onClick={() => openFollowUpDialogForDeal(selectedDeal)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear tarea
                </Button>
              </div>
              {wonStageNames.has(selectedDeal.stage) ? (
                <div className="mt-2 text-sm text-muted-foreground">Oportunidad cerrada como ganada.</div>
              ) : lostStageNames.has(selectedDeal.stage) ? (
                <div className="mt-2 text-sm text-muted-foreground">Oportunidad cerrada como perdida.</div>
              ) : selectedDeal.lead_id ? (
                selectedNextTask ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="font-semibold truncate">{selectedNextTask.title}</div>
                    <div className="text-[13px] text-muted-foreground">
                      {selectedNextTask.due_date ? `Para ${formatDateLabel(selectedNextTask.due_date)}` : "Sin fecha"}
                      {" · "}
                      {selectedNextTask.priority || "—"}
                      {" · "}
                      {selectedNextTask.status}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">No hay seguimiento programado por ahora.</div>
                )
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">Conecta un prospecto para ver seguimientos.</div>
              )}
            </div>

            <div data-demo="pipeline-actions" className="rounded-[16px] border bg-white p-4">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Acciones rápidas</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10 justify-start gap-2"
                  disabled={!selectedLead || !(selectedLead.whatsapp || selectedLead.phone)}
                  onClick={() => selectedLead && void handleOpenWhatsAppFromLead(selectedLead)}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="h-10 justify-start gap-2"
                  disabled={!selectedLead?.email}
                  onClick={() => {
                    if (!selectedLead?.email) return;
                    window.open(`mailto:${selectedLead.email}`, "_blank");
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  className="h-10 justify-start gap-2"
                  disabled={!selectedLead || !(selectedLead.phone || selectedLead.whatsapp)}
                  onClick={() => {
                    const phone = selectedLead?.phone || selectedLead?.whatsapp;
                    if (!phone) return;
                    window.open(`tel:${phone}`, "_self");
                  }}
                >
                  <Phone className="h-4 w-4" />
                  Llamar
                </Button>
                <Button
                  variant="outline"
                  className="h-10 justify-start gap-2"
                  disabled={!canCreateTaskForDeal(selectedDeal)}
                  title={!canCreateTaskForDeal(selectedDeal) ? "No tienes permiso para crear tareas en esta oportunidad." : undefined}
                  onClick={() => openFollowUpDialogForDeal(selectedDeal)}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Crear tarea
                </Button>
              </div>
            </div>
          </div>
        </DetailSheet>
      )}

      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear seguimiento</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedDeal) return;
              void handleCreateFollowUpTaskFromDeal(selectedDeal);
            }}
          >
            <div>
              <Label>Título</Label>
              <Input value={followUpValues.title} onChange={(e) => setFollowUpValues((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={followUpValues.due_date} onChange={(e) => setFollowUpValues((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select value={followUpValues.priority} onValueChange={(v) => setFollowUpValues((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={followUpValues.description} onChange={(e) => setFollowUpValues((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFollowUpOpen(false)} disabled={followUpSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={followUpSaving || !selectedDeal}>
                {followUpSaving ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lostDialogOpen}
        onOpenChange={(open) => {
          setLostDialogOpen(open);
          if (!open) {
            setLostNote("");
            setLostReason("Precio");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar oportunidad como perdida</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedDeal) return;
              void handleMarkDealAsLost(selectedDeal, lostReason, lostNote);
            }}
          >
            <div>
              <Label>Razón</Label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Precio">Precio</SelectItem>
                  <SelectItem value="No respondió">No respondió</SelectItem>
                  <SelectItem value="No era el momento">No era el momento</SelectItem>
                  <SelectItem value="Eligió otra opción">Eligió otra opción</SelectItem>
                  <SelectItem value="No era buen fit">No era buen fit</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nota (opcional)</Label>
              <Input value={lostNote} onChange={(e) => setLostNote(e.target.value)} placeholder="Ej: presupuesto fuera de rango" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLostDialogOpen(false)} disabled={closingAsLost}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={closingAsLost || !selectedDeal}>
                {closingAsLost ? "Guardando..." : "Marcar perdida"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={convertClientDialogOpen}
        onOpenChange={(open) => {
          setConvertClientDialogOpen(open);
          if (!open) {
            setPendingWonDealId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir a cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta oportunidad no tiene cliente conectado. ¿Quieres convertir el prospecto en cliente ahora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={convertingClient}>Más tarde</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConvertWonDealToClient()} disabled={convertingClient}>
              {convertingClient ? "Convirtiendo..." : "Convertir ahora"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={createProjectDialogOpen}
        onOpenChange={(open) => {
          setCreateProjectDialogOpen(open);
          if (!open) {
            setProjectCandidateDealId(null);
            setProductCandidates([]);
            setSelectedProductId(null);
            setActiveWorkflow(null);
            setActiveWorkflowSteps([]);
            setDealProductsByProductId({});
          }
        }}
      >
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Crear proyecto desde producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Quieres crear un proyecto para ejecutar el producto vendido y generar tareas desde su workflow?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {productCandidates.length ? (
              <div>
                <Label>Producto</Label>
                <Select value={selectedProductId || ""} onValueChange={(v) => setSelectedProductId(v || null)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCandidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProductId && dealProductsByProductId[selectedProductId]?.quantity ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Cantidad: {dealProductsByProductId[selectedProductId]?.quantity}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Esta oportunidad no tiene producto asociado. Asocia un producto para crear un proyecto automáticamente.
              </div>
            )}

            {workflowLoading ? (
              <div className="text-sm text-muted-foreground">Cargando workflow…</div>
            ) : selectedProductId ? (
              activeWorkflow ? (
                <div className="rounded-[12px] border bg-background p-3 text-sm">
                  <div className="font-semibold">{activeWorkflow.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Pasos activos: {activeWorkflowSteps.length}
                  </div>
                </div>
              ) : (
                <div className="rounded-[12px] border bg-background p-3 text-sm text-muted-foreground">
                  Este producto no tiene workflow activo. Defínelo en <span className="font-mono">/products</span>.
                </div>
              )
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingProject}>Más tarde</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleCreateProjectFromWonDeal()}
              disabled={creatingProject || !selectedProductId || !activeWorkflow?.id || !activeWorkflowSteps.length}
            >
              {creatingProject ? "Creando..." : "Crear proyecto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDealId} onOpenChange={(o) => { if (!o) setDeleteDealId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar deal</AlertDialogTitle>
            <AlertDialogDescription>Esto no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteDealId) return;
                if (!can("deals.delete")) {
                  toast.error("No tienes permiso para eliminar");
                  return;
                }
                const { error } = await db.from("deals").delete().eq("id", deleteDealId);
                if (error) {
                  toast.error(error.message || "No se pudo eliminar");
                  return;
                }
                toast.success("Oportunidad eliminada");
                setDeals((prev) => prev.filter((d) => d.id !== deleteDealId));
                setDealIdsByStage((prev) => {
                  const next: Record<string, string[]> = { ...prev };
                  for (const k of Object.keys(next)) next[k] = next[k].filter((id) => id !== deleteDealId);
                  return next;
                });
                if (selectedDeal?.id === deleteDealId) setSelectedDeal(null);
                setDeleteDealId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={archivedOpen}
        onOpenChange={(open) => {
          setArchivedOpen(open);
          if (!open) setArchivedSearch("");
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>Archivados</SheetTitle>
            <SheetDescription>Oportunidades movidas a etapa perdida. Puedes restaurarlas o eliminarlas.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid gap-3">
            <Input placeholder="Buscar archivados..." value={archivedSearch} onChange={(e) => setArchivedSearch(e.target.value)} />

            {archivedDeals.length === 0 ? (
              <div className="rounded-[16px] border border-[#e6eaf0] bg-white p-4 text-sm font-normal text-[#667085]">
                No hay oportunidades archivadas por ahora.
              </div>
            ) : (
              <div className="grid gap-3">
                {archivedDeals
                  .slice()
                  .sort((a, b) => {
                    const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    return bt - at;
                  })
                  .slice(0, 200)
                  .map((deal) => (
                    <div key={deal.id} className="rounded-[16px] border border-[#e6eaf0] bg-white p-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.055)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold tracking-[-0.01em] truncate">{deal.name}</div>
                          <div className="text-[12px] font-normal text-[#667085]">
                            Etapa: <span className="font-medium text-[#344054]">{deal.stage}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setSelectedDeal(deal)}>
                            Ver
                          </Button>
                          <Button className="h-8 px-3 text-xs" onClick={() => { void restoreArchivedDeal(deal.id); }}>
                            Restaurar
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        <Button
                          variant="destructive"
                          className="h-8 px-3 text-xs"
                          onClick={() => {
                            setDeleteDealId(deal.id);
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] p-0">
          <SheetHeader>
            <SheetTitle>Filtros de oportunidades</SheetTitle>
            <SheetDescription>Ajusta la vista del pipeline sin perder tu orden por columna.</SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-5 pt-4 grid gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#344054]">Activos: {activeFilterCount}</div>
              <Button
                variant="outline"
                className="h-9"
                onClick={() =>
                  setFilters({
                    status: "active",
                    selectedStages: [],
                    assigned: "all",
                    valueMin: "",
                    valueMax: "",
                    probMin: "",
                    probMax: "",
                    closePreset: "any",
                    closeFrom: "",
                    closeTo: "",
                    followUpStaleDays: "",
                  })
                }
              >
                Reset
              </Button>
            </div>

            {/* 1) Status */}
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v as DealStatusFilter }))}>
                <SelectTrigger className="h-9 bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="won">Ganados</SelectItem>
                  <SelectItem value="lost">Perdidos / Archivados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2) Stage multi-select */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Etapas</Label>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => {
                    const all = stages.map((s) => s.name);
                    setFilters((p) => ({ ...p, selectedStages: p.selectedStages.length === all.length ? [] : all }));
                  }}
                  type="button"
                >
                  {filters.selectedStages.length === stages.length ? "Limpiar" : "Seleccionar todo"}
                </Button>
              </div>
              <div className="max-h-48 overflow-auto rounded-[16px] border border-[#e6eaf0] bg-white p-3 grid gap-2">
                {stages.map((s) => {
                  const checked = selectedStagesSet.has(s.name);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-sm font-medium text-[#344054]">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          setFilters((p) => {
                            const set = new Set(p.selectedStages);
                            if (next) set.add(s.name);
                            else set.delete(s.name);
                            return { ...p, selectedStages: Array.from(set) };
                          });
                        }}
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3) Assigned */}
            <div className="grid gap-2">
              <Label>Asignado a</Label>
              <Select value={filters.assigned} onValueChange={(v) => setFilters((p) => ({ ...p, assigned: v as AssignedFilter }))}>
                <SelectTrigger className="h-9 bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="me">Solo yo</SelectItem>
                  <SelectItem value="team">Asignados</SelectItem>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4) Value range */}
            <div className="grid gap-2">
              <Label>Rango de valor</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input className="h-9 bg-muted/30 border-border/50" inputMode="numeric" placeholder="Mínimo" value={filters.valueMin} onChange={(e) => setFilters((p) => ({ ...p, valueMin: e.target.value }))} />
                <Input className="h-9 bg-muted/30 border-border/50" inputMode="numeric" placeholder="Máximo" value={filters.valueMax} onChange={(e) => setFilters((p) => ({ ...p, valueMax: e.target.value }))} />
              </div>
            </div>

            {/* 5) Probability */}
            <div className="grid gap-2">
              <Label>Probabilidad (%)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input className="h-9 bg-muted/30 border-border/50" inputMode="numeric" placeholder="0" value={filters.probMin} onChange={(e) => setFilters((p) => ({ ...p, probMin: e.target.value }))} />
                <Input className="h-9 bg-muted/30 border-border/50" inputMode="numeric" placeholder="100" value={filters.probMax} onChange={(e) => setFilters((p) => ({ ...p, probMax: e.target.value }))} />
              </div>
            </div>

            {/* 6) Expected close */}
            <div className="grid gap-2">
              <Label>Cierre estimado</Label>
              <Select value={filters.closePreset} onValueChange={(v) => setFilters((p) => ({ ...p, closePreset: v as CloseDatePreset }))}>
                <SelectTrigger className="h-9 bg-muted/30 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquiera</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="range">Rango</SelectItem>
                  <SelectItem value="none">Sin fecha</SelectItem>
                </SelectContent>
              </Select>
              {filters.closePreset === "range" && (
                <div className="grid grid-cols-2 gap-3">
                  <Input className="h-9 bg-muted/30 border-border/50" type="date" value={filters.closeFrom} onChange={(e) => setFilters((p) => ({ ...p, closeFrom: e.target.value }))} />
                  <Input className="h-9 bg-muted/30 border-border/50" type="date" value={filters.closeTo} onChange={(e) => setFilters((p) => ({ ...p, closeTo: e.target.value }))} />
                </div>
              )}
            </div>

            {/* 7) Follow-up */}
            <div className="grid gap-2">
              <Label>Necesita seguimiento</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  inputMode="numeric"
                  placeholder="Sin update en (días)"
                  value={filters.followUpStaleDays}
                  onChange={(e) => setFilters((p) => ({ ...p, followUpStaleDays: e.target.value }))}
                  className="h-9 bg-muted/30 border-border/50"
                />
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => setFilters((p) => ({ ...p, followUpStaleDays: p.followUpStaleDays ? "" : "7" }))}
                  type="button"
                >
                  {filters.followUpStaleDays ? "Desactivar" : "Activar (7d)"}
                </Button>
              </div>
              <div className="text-[12px] font-semibold text-[#667085]">Tip: usa 3, 7 o 14 días para priorizar.</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFiltersOpen(false)}>Cerrar</Button>
              <Button onClick={() => setFiltersOpen(false)}>Aplicar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
        </div>
      </div>
    </div>
  );
}
