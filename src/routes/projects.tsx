import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  FolderOpen,
  GanttChartSquare,
  Landmark,
  MessageSquare,
  MoreHorizontal,
  Package,
  Paperclip,
  Plus,
  ReceiptText,
  ShieldCheck,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import {
  CURRENCY_OPTIONS,
  convertCurrencyAmount,
  convertToBaseCurrency,
  formatCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyAmount,
  normalizeCurrencyInput,
  type CompanyCurrencySettings,
} from "@/lib/currency";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProjectActivityPanel } from "@/components/projects/project-activity-panel";
import { ProjectConversationsPanel } from "@/components/projects/project-conversations-panel";
import { ProjectFilesPanel } from "@/components/projects/project-files-panel";
import { openGlobalTaskCreate } from "@/components/tasks/global-task-create-host";
import { ProjectGanttPanel } from "@/components/projects/project-gantt-panel";
import { ProjectMilestonesPanel } from "@/components/projects/project-milestones-panel";
import { ProjectSalesPanel } from "@/components/projects/project-sales-panel";
import { ProjectTicketsPanel } from "@/components/projects/project-tickets-panel";
import { ProjectTimesheetsPanel } from "@/components/projects/project-timesheets-panel";
import { ProjectContractsPanel } from "@/components/projects/project-contracts-panel";
import { ProjectNotesPanel } from "@/components/projects/project-notes-panel";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import {
  normalizeProfilePickerIds,
  ProfileAvatarStack,
  ProfileMultiPicker,
} from "@/components/crm/profile-multi-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EmptyState } from "@/components/crm/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { PageHeader } from "@/components/crm/page-header";
import { Progress } from "@/components/ui/progress";
import { CrmDetailSelectTrigger, CrmDetailLineButton } from "@/components/crm/crm-detail-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";
import {
  isActiveProjectStatus,
  isClosedTaskStatusValue,
  isDoneTaskStatusValue,
  isInProgressTaskStatusValue,
  normalizeStatus,
} from "@/lib/crm/status";
import { cn } from "@/lib/utils";
import { crmFormStyles } from "@/components/crm/crm-form-shell";

export const Route = createFileRoute("/projects")({
  validateSearch: (search: Record<string, unknown>): { projectId?: string } => ({
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
  }),
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Proyectos — Corevix CRM" }] }),
});

const PROJECT_STATUSES = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const DISPLAY_LABELS: Record<string, string> = {
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  Completed: "Completado",
  Cancelled: "Cancelado",
  "To Do": "Por hacer",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  Draft: "Borrador",
  Sent: "Enviado",
  Accepted: "Aceptado",
  Declined: "Rechazado",
  Expired: "Expirado",
  Converted: "Convertido",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Issued: "Emitida",
  Applied: "Aplicada",
  Active: "Activo",
  Signed: "Firmado",
  "Not Signed": "Sin firmar",
  "Pending Signature": "Pendiente de firma",
  Linked: "Vinculada",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

const NONE = "none";

type Project = {
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
  budget_currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | string | null;
  budget_base?: number | string | null;
  client_id: string | null;
  product_id: string | null;
  deal_id: string | null;
  lead_id: string | null;
  manager: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
};

type TaskRow = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  related_project_id: string | null;
  related_client_id: string | null;
  related_lead_id: string | null;
  related_deal_id: string | null;
  updated_at: string;
};

type ClientRow = {
  id: string;
  company_id: string;
  company_name: string;
  account_manager: string | null;
};
type ProductRow = {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  base_price: number | null;
  is_active: boolean | null;
};
type DealRow = {
  id: string;
  company_id: string;
  name: string;
  stage: string;
  value: number | null;
  lead_id: string | null;
  assigned_to: string | null;
  probability: number | null;
  expected_close: string | null;
  updated_at: string;
};
type LeadRow = {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
};
type ProfileRow = {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_id: string | null;
  is_active: boolean;
};

type ProjectAssigneeRow = {
  id: string;
  company_id: string;
  project_id: string;
  user_id: string;
  created_at: string;
};

type ProjectStats = {
  total: number;
  completed: number;
  abiertas: number;
  overdue: number;
  pct: number;
};

type ProjectMeta = {
  client: ClientRow | null;
  product: ProductRow | null;
  deal: DealRow | null;
  lead: LeadRow | null;
  stats: ProjectStats;
  isOverdue: boolean;
  hasRisk: boolean;
  assigneeProfiles: ProfileRow[];
  assigneeLabel: string;
};

type ProjectForm = {
  name: string;
  description: string;
  status: string;
  progress: string;
  priority: string;
  budget: string;
  budget_currency: string;
  start_date: string;
  due_date: string;
  client_id: string;
  product_id: string;
  deal_id: string;
  lead_id: string;
  manager: string;
  manager_ids: string[];
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function projectBudgetBaseAmount(project: Project, settings: CompanyCurrencySettings) {
  if (project.budget_base != null) {
    return convertCurrencyAmount(
      project.budget_base,
      project.base_currency || settings.baseCurrency,
      settings.baseCurrency,
      settings.usdToDopRate,
    );
  }
  return convertToBaseCurrency(project.budget, project.budget_currency || settings.baseCurrency, {
    baseCurrency: settings.baseCurrency,
    usdToDopRate: Number(project.exchange_rate || settings.usdToDopRate),
    rateSource: settings.rateSource,
    rateUpdatedAt: settings.rateUpdatedAt,
  });
}

function projectBudgetOriginalLabel(project: Project) {
  return formatCurrencyAmount(
    project.budget,
    project.budget_currency || project.base_currency || "USD",
  );
}

function projectBudgetBaseLabel(project: Project, settings: CompanyCurrencySettings) {
  return formatCurrencyAmount(projectBudgetBaseAmount(project, settings), settings.baseCurrency);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatLeadLabel(lead: LeadRow) {
  const company = (lead.company_name || "").trim();
  if (company) return company;
  const person = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
  return person || lead.email || lead.id;
}

function initials(value: string | null | undefined) {
  const text = String(value || "Project").trim();
  const parts = text.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "P";
}

function defaultProjectForm(): ProjectForm {
  return {
    name: "",
    description: "",
    status: "Not Started",
    progress: "0",
    priority: "Medium",
    budget: "",
    budget_currency: "USD",
    start_date: isoToday(),
    due_date: "",
    client_id: NONE,
    product_id: NONE,
    deal_id: NONE,
    lead_id: NONE,
    manager: NONE,
    manager_ids: [],
  };
}

type ProjectKpiTone = "neutral" | "success" | "warning" | "danger" | "info";

function projectRiskTone(value: number, warningAt: number, dangerAt: number): ProjectKpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function ProjectKpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: ProjectKpiTone;
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-500"
        : tone === "danger"
          ? "text-rose-600"
          : tone === "info"
            ? "text-blue-600"
            : "text-slate-950";

  return (
    <div className="min-w-0 border-b border-slate-100 pb-3">
      <div className="truncate text-[11px] font-medium uppercase tracking-normal text-slate-500">
        {label}
      </div>
      <div className={cn("mt-1 truncate text-2xl font-normal leading-none", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function PlaceholderModule({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-slate-500">
          {icon}
        </div>
        <div>
          <div className="font-extrabold text-slate-900">{title}</div>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>
          <span className="mt-3 inline-flex rounded-full border bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
            Placeholder preparado
          </span>
        </div>
      </div>
    </div>
  );
}

function ProjectMobileCard({
  project,
  meta,
  owner,
  onOpen,
  demo,
}: {
  project: Project;
  meta: ProjectMeta;
  owner: string;
  onOpen: () => void;
  demo?: string;
}) {
  const clientName = meta.client?.company_name || "Sin cliente";
  const opportunityName = meta.deal?.name || "Sin oportunidad";
  const productName = meta.product?.name || "Sin producto";
  const progress = Math.min(100, Math.max(0, Number(meta.stats.pct || 0)));
  const statusLabel = displayLabel(project.status);
  const taskLabel = meta.stats.total
    ? `${meta.stats.completed}/${meta.stats.total} tareas`
    : "Sin tareas";
  const overdueLabel =
    meta.stats.overdue > 0
      ? `${meta.stats.overdue} ${meta.stats.overdue === 1 ? "tarea vencida" : "tareas vencidas"}`
      : meta.isOverdue
        ? "Entrega vencida"
        : null;

  return (
    <button
      type="button"
      data-demo={demo}
      onClick={onOpen}
      className="w-full border-b border-slate-100 bg-white px-4 py-3 text-left transition-colors active:scale-[0.992] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 hover:bg-slate-50/40"
      aria-label={`Abrir proyecto ${project.name}`}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border text-xs font-extrabold tracking-[-0.02em]",
            meta.hasRisk
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-blue-100 bg-blue-50 text-blue-700",
          )}
        >
          {meta.hasRisk ? <AlertTriangle className="h-5 w-5" /> : initials(project.name)}
        </div>

        <div className="min-w-0 pt-0.5">
          <div className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-slate-950">
            {project.name}
          </div>
          <div className="mt-0.5 truncate text-[12.5px] font-medium leading-4 text-slate-500">
            {clientName} · {opportunityName}
          </div>
        </div>

        {meta.hasRisk ? (
          <span className="inline-flex min-h-6 max-w-[90px] shrink-0 items-center rounded-full bg-rose-50 px-2.5 text-[11px] font-bold text-rose-700">
            Riesgo
          </span>
        ) : (
          <StatusBadge
            status={project.status}
            className="min-h-6 max-w-[96px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
          />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 pl-[50px] max-[360px]:grid-cols-1 max-[360px]:pl-0">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
            Producto
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
            <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{productName}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
            Responsable
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{owner}</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-xs font-bold text-slate-600">{statusLabel}</span>
          <span className="shrink-0 text-[11.5px] font-semibold text-slate-500">{taskLabel}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full",
              normalizeStatus(project.status) === normalizeStatus("Completed")
                ? "bg-emerald-600"
                : "bg-blue-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {overdueLabel ? (
          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{overdueLabel}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ProjectsPage() {
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const routeSearch = Route.useSearch();
  const openedProjectSearchRef = useRef<string | null>(null);
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [tasksFilter, setTasksFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(defaultProjectForm);
  const {
    data: projects,
    loading: projectsLoading,
    create,
    update,
    remove,
  } = useCrud<Project>({ table: "projects", orderBy: "updated_at", ascending: false, limit: 500 });
  const {
    data: tasks,
    loading: tasksLoading,
    fetch: fetchTasks,
  } = useCrud<TaskRow>({
    table: "tasks",
    select:
      "id,company_id,title,description,status,priority,due_date,assigned_to,related_project_id,related_client_id,related_lead_id,related_deal_id,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });
  const { data: clients } = useCrud<ClientRow>({
    table: "clients",
    select: "id,company_id,company_name,account_manager",
    orderBy: "company_name",
    ascending: true,
    limit: 2000,
  });
  const { data: products } = useCrud<ProductRow>({
    table: "products",
    select: "id,company_id,name,category,base_price,is_active",
    orderBy: "name",
    ascending: true,
    limit: 2000,
  });
  const { data: deals } = useCrud<DealRow>({
    table: "deals",
    select:
      "id,company_id,name,stage,value,lead_id,assigned_to,probability,expected_close,updated_at",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });
  const { data: leads } = useCrud<LeadRow>({
    table: "leads",
    select: "id,company_id,first_name,last_name,company_name,email",
    orderBy: "updated_at",
    ascending: false,
    limit: 2000,
  });
  const { data: profiles } = useCrud<ProfileRow>({
    table: "profiles",
    select: "id,company_id,full_name,email,avatar_url,user_id,is_active",
    orderBy: "full_name",
    ascending: true,
    limit: 2000,
  });
  const { data: projectAssignees, fetch: fetchProjectAssignees } = useCrud<ProjectAssigneeRow>({
    table: "project_assignees",
    select: "id,company_id,project_id,user_id,created_at",
    orderBy: "created_at",
    ascending: true,
    limit: 4000,
    enabled: projects.length > 0,
  });

  const loading = projectsLoading || tasksLoading;
  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);
  const dealById = useMemo(() => new Map(deals.map((item) => [item.id, item])), [deals]);
  const leadById = useMemo(() => new Map(leads.map((item) => [item.id, item])), [leads]);
  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);
  const profileByUserId = useMemo(
    () =>
      new Map(profiles.filter((item) => item.user_id).map((item) => [String(item.user_id), item])),
    [profiles],
  );
  const projectAssigneesByProjectId = useMemo(() => {
    const map = new Map<string, ProjectAssigneeRow[]>();
    for (const row of projectAssignees) {
      const list = map.get(row.project_id) || [];
      list.push(row);
      map.set(row.project_id, list);
    }
    return map;
  }, [projectAssignees]);
  const sendProjectNotification = async (title: string, message: string) => {
    if (!profile?.company_id || !user?.id) return;
    await createAttentionNotification(
      supabase,
      { companyId: profile.company_id, userId: user.id },
      { title, message, type: "attention:projects", link: "/projects" },
    ).catch(() => {});
  };

  const managerOptions = useMemo(() => {
    const companyId = profile?.company_id ? String(profile.company_id) : null;
    return profiles
      .filter(
        (item) =>
          item.is_active &&
          item.user_id &&
          (!companyId || String(item.company_id || "") === companyId),
      )
      .map((item) => ({
        label: String(item.full_name || item.email || item.user_id),
        value: String(item.id),
      }));
  }, [profile?.company_id, profiles]);
  const availableProjectProfiles = useMemo(() => {
    const companyId = profile?.company_id ? String(profile.company_id) : null;
    return profiles.filter(
      (item) =>
        item.is_active &&
        item.user_id &&
        (!companyId || String(item.company_id || "") === companyId),
    );
  }, [profile?.company_id, profiles]);

  const clientOptions = useMemo(
    () => clients.map((item) => ({ label: item.company_name, value: item.id })),
    [clients],
  );
  const productOptions = useMemo(
    () =>
      products
        .filter((item) => item.is_active !== false)
        .map((item) => ({
          label: item.category ? `${item.name} · ${item.category}` : item.name,
          value: item.id,
        })),
    [products],
  );
  const dealOptions = useMemo(
    () => deals.map((item) => ({ label: `${item.name} · ${item.stage}`, value: item.id })),
    [deals],
  );
  const leadOptions = useMemo(
    () => leads.map((item) => ({ label: formatLeadLabel(item), value: item.id })),
    [leads],
  );

  const tasksByProjectId = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const task of tasks) {
      if (!task.related_project_id) continue;
      const list = map.get(task.related_project_id) || [];
      list.push(task);
      map.set(task.related_project_id, list);
    }
    return map;
  }, [tasks]);

  const statsByProjectId = useMemo(() => {
    const today = isoToday();
    const map = new Map<string, ProjectStats>();
    for (const project of projects) {
      const list = tasksByProjectId.get(project.id) || [];
      const total = list.length;
      const completed = list.filter((task) => isDoneTaskStatusValue(task.status)).length;
      const abiertas = list.filter((task) => !isClosedTaskStatusValue(task.status)).length;
      const overdue = list.filter(
        (task) =>
          !!task.due_date && String(task.due_date) < today && !isClosedTaskStatusValue(task.status),
      ).length;
      map.set(project.id, {
        total,
        completed,
        abiertas,
        overdue,
        pct: total ? Math.round((completed / total) * 100) : Number(project.progress || 0),
      });
    }
    return map;
  }, [projects, tasksByProjectId]);

  const resolveManagerProfileId = (raw: string | null | undefined) => {
    const value = String(raw || "").trim();
    if (!value || value === NONE) return null;
    if (profileById.has(value)) return value;
    return profileByUserId.get(value)?.id || null;
  };

  const resolveTaskAssigneeUserId = (raw: string | null | undefined) => {
    const profileId = resolveManagerProfileId(raw);
    if (profileId)
      return profileById.get(profileId)?.user_id || user?.id || profile?.user_id || null;
    return user?.id || profile?.user_id || null;
  };

  const resolveProfileUserId = (raw: string | null | undefined) => {
    const profileId = resolveManagerProfileId(raw);
    return profileId ? profileById.get(profileId)?.user_id || null : null;
  };

  const primaryManagerProfileId = (managerIds: string[]) => {
    const firstUserId = normalizeProfilePickerIds(managerIds)[0];
    if (!firstUserId) return null;
    return profileByUserId.get(firstUserId)?.id || profileById.get(firstUserId)?.id || null;
  };

  const projectAssignedUserIds = (project: Project) => {
    const ids = new Set<string>();
    const primaryUserId = resolveProfileUserId(project.manager);
    if (primaryUserId) ids.add(primaryUserId);
    for (const row of projectAssigneesByProjectId.get(project.id) || []) {
      if (row.user_id) ids.add(String(row.user_id));
    }
    return ids;
  };

  const projectAssigneeProfiles = (project: Project) =>
    Array.from(projectAssignedUserIds(project))
      .map((id) => profileByUserId.get(id) || profileById.get(id) || null)
      .filter((item): item is ProfileRow => Boolean(item));

  const projectAssigneeLabel = (project: Project) => {
    const names = projectAssigneeProfiles(project)
      .map((item) => String(item.full_name || item.email || "").trim())
      .filter(Boolean);
    return names.length ? names.join(", ") : "Sin asignar";
  };

  const projectMeta = (project: Project) => {
    const client = project.client_id ? clientById.get(project.client_id) || null : null;
    const product = project.product_id ? productById.get(project.product_id) || null : null;
    const deal = project.deal_id ? dealById.get(project.deal_id) || null : null;
    const lead = project.lead_id ? leadById.get(project.lead_id) || null : null;
    const stats = statsByProjectId.get(project.id) || {
      total: 0,
      completed: 0,
      abiertas: 0,
      overdue: 0,
      pct: Number(project.progress || 0),
    };
    const isOverdue =
      !!project.due_date &&
      String(project.due_date) < isoToday() &&
      isActiveProjectStatus(project.status);
    return {
      client,
      product,
      deal,
      lead,
      stats,
      isOverdue,
      hasRisk: isOverdue || stats.overdue > 0,
      assigneeProfiles: projectAssigneeProfiles(project),
      assigneeLabel: projectAssigneeLabel(project),
    };
  };

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const meta = projectMeta(project);
      const haystack =
        `${project.name} ${project.description || ""} ${meta.client?.company_name || ""} ${meta.product?.name || ""}`.toLowerCase();
      const matchTasks =
        tasksFilter === "all" ||
        (tasksFilter === "overdue" && meta.stats.overdue > 0) ||
        (tasksFilter === "in_progress" && meta.stats.total > 0 && meta.stats.abiertas > 0) ||
        (tasksFilter === "completed" && meta.stats.total > 0 && meta.stats.abiertas === 0) ||
        (tasksFilter === "no_tasks" && meta.stats.total === 0);
      return (
        (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
        (statusFilter === "all" ||
          normalizeStatus(project.status) === normalizeStatus(statusFilter)) &&
        (clientFilter === "all" || String(project.client_id || "") === clientFilter) &&
        (productFilter === "all" || String(project.product_id || "") === productFilter) &&
        (managerFilter === "all" ||
          projectAssigneeProfiles(project).some((item) => item.id === managerFilter)) &&
        matchTasks
      );
    });
  }, [
    clientFilter,
    managerFilter,
    productFilter,
    projects,
    search,
    statusFilter,
    statsByProjectId,
    tasksFilter,
    projectAssigneesByProjectId,
    profiles,
  ]);

  const kpis = useMemo(() => {
    const active = projects.filter((project) => isActiveProjectStatus(project.status)).length;
    const completed = projects.filter(
      (project) => normalizeStatus(project.status) === normalizeStatus("Completed"),
    ).length;
    const risky = projects.filter((project) => projectMeta(project).hasRisk).length;
    const overdue = projects.filter((project) => projectMeta(project).isOverdue).length;
    const abiertasTasks = tasks.filter((task) => !isClosedTaskStatusValue(task.status)).length;
    return { total: projects.length, active, completed, risky, overdue, abiertasTasks };
  }, [projects, statsByProjectId, tasks]);

  useEffect(() => {
    const projectId = routeSearch.projectId;
    if (!projectId) {
      openedProjectSearchRef.current = null;
      return;
    }
    if (openedProjectSearchRef.current === projectId) return;
    if (!projects.length) return;
    const project = projects.find((item) => item.id === projectId);
    openedProjectSearchRef.current = projectId;
    if (project) setSelected(project);
  }, [projects, routeSearch.projectId]);

  useEffect(() => {
    if (!dialogOpen || !form.client_id || form.client_id === NONE || form.manager_ids.length > 0)
      return;
    const client = clientById.get(form.client_id);
    const userId = resolveProfileUserId(client?.account_manager);
    if (userId)
      setForm((current) => ({
        ...current,
        manager: resolveManagerProfileId(client?.account_manager) || NONE,
        manager_ids: [userId],
      }));
  }, [clientById, dialogOpen, form.client_id, form.manager_ids.length]);

  function abiertasNewProject() {
    if (!can("projects.create")) return toast.error("No tienes permiso para crear proyectos");
    setEditItem(null);
    setForm({ ...defaultProjectForm(), budget_currency: currencySettings.baseCurrency });
    setDialogOpen(true);
  }

  function abiertasEditProject(project: Project) {
    if (!can("projects.edit")) return toast.error("No tienes permiso para editar proyectos");
    setEditItem(project);
    setForm({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "Not Started",
      progress: String(project.progress ?? 0),
      priority: String(project.priority || "Medium"),
      budget: project.budget == null ? "" : String(project.budget),
      budget_currency: normalizeCurrency(
        project.budget_currency || project.base_currency || currencySettings.baseCurrency,
      ),
      start_date: project.start_date || "",
      due_date: project.due_date || "",
      client_id: project.client_id || NONE,
      product_id: project.product_id || NONE,
      deal_id: project.deal_id || NONE,
      lead_id: project.lead_id || NONE,
      manager: resolveManagerProfileId(project.manager) || NONE,
      manager_ids: Array.from(projectAssignedUserIds(project)),
    });
    setDialogOpen(true);
  }

  async function syncProjectAssignees(projectId: string, managerIds: string[]) {
    if (!profile?.company_id) throw new Error("No se pudo identificar tu compañía.");
    const assigneeIds = normalizeProfilePickerIds(managerIds);
    const db = supabase as any;
    const { error: deleteError } = await db
      .from("project_assignees")
      .delete()
      .eq("project_id", projectId);
    if (deleteError) throw deleteError;
    if (!assigneeIds.length) return;
    const rows = assigneeIds.map((userId) => ({
      company_id: profile.company_id,
      project_id: projectId,
      user_id: userId,
      created_by: user?.id || profile?.user_id || null,
    }));
    const { error: insertError } = await db.from("project_assignees").insert(rows);
    if (insertError) throw insertError;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!can(editItem ? "projects.edit" : "projects.create"))
      return toast.error("No tienes permiso para realizar esta acción");
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    const budgetCurrency = normalizeCurrency(form.budget_currency || currencySettings.baseCurrency);
    const budgetValue = form.budget.trim()
      ? normalizeCurrencyAmount(form.budget, budgetCurrency)
      : null;
    const budgetBase =
      budgetValue == null
        ? null
        : convertToBaseCurrency(budgetValue, budgetCurrency, currencySettings);
    const record = {
      company_id: profile.company_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      progress: Number(form.progress) || 0,
      priority: form.priority,
      budget: budgetValue,
      budget_currency: budgetCurrency,
      base_currency: currencySettings.baseCurrency,
      exchange_rate: currencySettings.usdToDopRate,
      budget_base: budgetBase,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      client_id: form.client_id !== NONE ? form.client_id : null,
      product_id: form.product_id !== NONE ? form.product_id : null,
      deal_id: form.deal_id !== NONE ? form.deal_id : null,
      lead_id: form.lead_id !== NONE ? form.lead_id : null,
      manager:
        primaryManagerProfileId(form.manager_ids) || (form.manager !== NONE ? form.manager : null),
    };
    try {
      if (editItem) {
        const saved = await update(editItem.id, record);
        await syncProjectAssignees(editItem.id, form.manager_ids);
        await fetchProjectAssignees();
        setSelected(null);
        void sendProjectNotification(
          "Proyecto actualizado",
          `${saved?.name || record.name || "Proyecto sin nombre"} fue actualizado.`,
        );
        toast.success("Proyecto actualizado");
      } else {
        const saved = await create(record);
        if (saved?.id) {
          await syncProjectAssignees(saved.id, form.manager_ids);
          await fetchProjectAssignees();
        }
        void sendProjectNotification(
          "Proyecto creado",
          `${record.name || "Proyecto sin nombre"} fue creado.`,
        );
        toast.success("Proyecto creado");
      }
      setDialogOpen(false);
      setEditItem(null);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el proyecto.");
    }
  }

  async function handleDeleteProject() {
    if (!deleteId) return;
    if (!can("projects.delete")) return toast.error("No tienes permiso para eliminar proyectos");
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("company_id", profile.company_id)
        .eq("related_project_id", deleteId);
      if (error) throw error;
      await remove(deleteId);
      await fetchTasks();
      setDeleteId(null);
      setSelected(null);
      toast.success("Proyecto eliminado");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar el proyecto.");
    }
  }

  function abiertasCreateTaskForProject(project: Project) {
    if (!can("tasks.create")) return toast.error("No tienes permiso para crear tareas");
    setSelected(project);
    openGlobalTaskCreate({
      initialValues: {
        dueDate: isoToday(),
        assignedTo: resolveTaskAssigneeUserId(project.manager) || undefined,
        assigneeIds: Array.from(projectAssignedUserIds(project)),
        projectId: project.id,
        clientId: project.client_id || undefined,
        leadId: project.lead_id || undefined,
        dealId: project.deal_id || undefined,
      },
    });
  }

  async function completeTask(task: TaskRow) {
    if (!can("tasks.edit")) return toast.error("No tienes permiso para actualizar tareas");
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ status: "Completed" })
      .eq("id", task.id)
      .eq("company_id", profile.company_id)
      .eq("related_project_id", task.related_project_id);
    if (error) return toast.error(error.message || "No se pudo completar la tarea");
    await fetchTasks();
    void sendProjectNotification(
      "Tarea de proyecto completada",
      `${task.title || "Tarea"} quedó completada.`,
    );
    toast.success("Tarea completada");
  }

  if (loading) return <LoadingState />;

  const mobileStatusFilters = [
    { value: "all", label: "Todos los estados" },
    ...PROJECT_STATUSES.map((status) => ({ value: status, label: displayLabel(status) })),
  ];
  const mobileTaskFilters = [
    { value: "all", label: "Todas las tareas" },
    { value: "overdue", label: "Tareas vencidas" },
    { value: "in_progress", label: "Con tareas abiertas" },
    { value: "completed", label: "Tareas completas" },
    { value: "no_tasks", label: "Sin tareas" },
  ];

  return (
    <div data-demo="projects-main" className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <div className="hidden md:block">
        <PageHeader
          title="Proyectos"
          subtitle="Workspace operativo para clientes, entregas, tareas y futuros módulos."
        />
      </div>

      <GlobalKpiStrip
        title="Proyectos"
        subtitle="Entregas, tareas y progreso operativo"
        actionLabel={can("projects.create") ? "Nuevo proyecto" : undefined}
        onAction={can("projects.create") ? abiertasNewProject : undefined}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
        items={[
          {
            key: "projects-summary",
            label: "Activos",
            value: kpis.active,
            helper: `${filtered.length} visibles de ${kpis.total} proyectos`,
            icon: FolderOpen,
            tone: "blue",
            meta: [
              { label: "Riesgo", value: kpis.risky, tone: "red" },
              { label: "Vencidos", value: kpis.overdue, tone: "orange" },
              { label: "Abiertas", value: kpis.abiertasTasks, tone: "teal" },
            ],
          },
        ]}
      >
        <div className="mt-2 grid w-full grid-cols-2 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mobileStatusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tasksFilter} onValueChange={setTasksFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mobileTaskFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div className="hidden grid-cols-2 gap-x-8 gap-y-4 md:grid lg:grid-cols-6">
        <ProjectKpi label="Total" value={kpis.total} />
        <ProjectKpi label="Activos" value={kpis.active} tone="info" />
        <ProjectKpi label="En riesgo" value={kpis.risky} tone={projectRiskTone(kpis.risky, 1, 3)} />
        <ProjectKpi label="Completados" value={kpis.completed} tone="success" />
        <ProjectKpi
          label="Vencidos"
          value={kpis.overdue}
          tone={projectRiskTone(kpis.overdue, 1, 3)}
        />
        <ProjectKpi
          label="Tareas abiertas"
          value={kpis.abiertasTasks}
          tone={projectRiskTone(kpis.abiertasTasks, 5, 12)}
        />
      </div>

      <section
        data-demo="projects-list"
        className="overflow-hidden border-y border-slate-100 bg-white max-md:border-0"
      >
        <div className="hidden flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {can("projects.create") ? (
              <CrmDetailLineButton
                icon={<Plus className="h-4 w-4" />}
                onClick={abiertasNewProject}
                className="h-9 rounded-full border-blue-600 bg-blue-600 px-3 text-white hover:border-blue-700 hover:bg-blue-700 hover:text-white"
              >
                Nuevo proyecto
              </CrmDetailLineButton>
            ) : null}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar proyectos..."
              className="h-9 w-72 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Estado" />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {displayLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Cliente" />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Producto" />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {productOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Responsable" />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los responsables</SelectItem>
                {managerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tasksFilter} onValueChange={setTasksFilter}>
              <CrmDetailSelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tareas" />
              </CrmDetailSelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tareas</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
                <SelectItem value="in_progress">Abiertas</SelectItem>
                <SelectItem value="completed">Completas</SelectItem>
                <SelectItem value="no_tasks">Sin tareas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="No hay proyectos"
            description="Crea tu primer proyecto."
            actionLabel={can("projects.create") ? "Nuevo proyecto" : undefined}
            onAction={can("projects.create") ? abiertasNewProject : undefined}
          />
        ) : (
          <>
            <div className="grid gap-2.5 md:hidden">
              {filtered.map((project, index) => {
                const meta = projectMeta(project);
                return (
                  <ProjectMobileCard
                    key={project.id}
                    project={project}
                    meta={meta}
                    owner={meta.assigneeLabel}
                    demo={index === 0 ? "projects-first-row" : undefined}
                    onOpen={() => setSelected(project)}
                  />
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table className="projects-list-table">
                <TableHeader className="bg-white">
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-5">Proyecto</TableHead>
                    <TableHead className="hidden lg:table-cell">Cliente / Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Progreso</TableHead>
                    <TableHead className="hidden xl:table-cell">Responsables</TableHead>
                    <TableHead className="hidden lg:table-cell">Cronograma</TableHead>
                    <TableHead className="hidden sm:table-cell pr-4 text-right sm:pr-5">
                      Budget
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((project, index) => {
                    const meta = projectMeta(project);
                    const clientName = meta.client?.company_name || "Sin cliente";
                    const productName = meta.product?.name || "Sin producto";
                    const owner = meta.assigneeLabel;
                    return (
                      <TableRow
                        key={project.id}
                        data-demo={index === 0 ? "projects-first-row" : undefined}
                        className="cursor-pointer align-top hover:bg-slate-50/40"
                        onClick={() => setSelected(project)}
                      >
                        <TableCell className="pl-4 sm:pl-5">
                          <div className="flex min-w-0 items-start gap-3 sm:min-w-[320px]">
                            <div
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border font-medium shadow-none sm:h-11 sm:w-11 ${meta.hasRisk ? "border-rose-100 bg-rose-50 text-rose-700" : "border-blue-100 bg-blue-50 text-blue-700"}`}
                            >
                              {meta.hasRisk ? (
                                <AlertTriangle className="h-5 w-5" />
                              ) : (
                                <span className="text-xs">{initials(project.name)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-[15px] font-normal text-slate-950">
                                  {project.name}
                                </div>
                                {meta.hasRisk ? (
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                                    Riesgo
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 truncate text-[12.5px] text-muted-foreground">
                                {clientName} · {meta.deal?.name || "Sin oportunidad"}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 shadow-none">
                                  <Package className="h-3 w-3" />
                                  {productName}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 shadow-none md:hidden">
                                  <UserRound className="h-3 w-3" />
                                  {owner}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="max-w-[240px]">
                            <div className="truncate text-sm font-normal">{clientName}</div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {productName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-demo={index === 0 ? "projects-status" : undefined}>
                          <StatusBadge status={project.status} />
                        </TableCell>
                        <TableCell
                          data-demo={index === 0 ? "projects-progress" : undefined}
                          className="hidden md:table-cell"
                        >
                          <div className="min-w-[150px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-normal">{meta.stats.pct}%</span>
                              <span className="text-muted-foreground">
                                {meta.stats.total
                                  ? `${meta.stats.completed}/${meta.stats.total}`
                                  : "Sin tareas"}
                              </span>
                            </div>
                            <Progress value={meta.stats.pct} className="mt-2 h-2" />
                            {meta.stats.overdue ? (
                              <div className="mt-1 text-[11px] font-normal text-rose-700">
                                {meta.stats.overdue} vencidas
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <ProfileAvatarStack
                            profiles={meta.assigneeProfiles}
                            label={meta.assigneeLabel}
                          />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Inicio: {formatDate(project.start_date)}
                            </div>
                            <div
                              className={
                                meta.isOverdue
                                  ? "flex items-center gap-1.5 font-medium text-rose-700"
                                  : "flex items-center gap-1.5 text-muted-foreground"
                              }
                            >
                              <CircleDot className="h-3.5 w-3.5" />
                              Entrega: {formatDate(project.due_date)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell pr-4 text-right sm:pr-5">
                          <div className="font-normal">
                            {projectBudgetBaseLabel(project, currencySettings)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {normalizeCurrency(project.budget_currency) ===
                            currencySettings.baseCurrency
                              ? "presupuesto"
                              : projectBudgetOriginalLabel(project)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditItem(null);
          }
        }}
      >
        <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-none max-sm:!left-0 max-sm:!top-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:rounded-none sm:h-[min(760px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-slate-200">
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 pr-14 text-left sm:px-6">
            <DialogTitle className="text-xl font-normal tracking-normal text-slate-950">
              {editItem ? "Editar proyecto" : "Añadir nuevo proyecto"}
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-slate-500">
              Completa lo esencial primero. La configuración puede quedar para después.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col bg-white">
            <Tabs defaultValue="project" className="flex h-full min-h-0 flex-col">
              <TabsList className="h-auto justify-start rounded-none border-b border-slate-100 bg-transparent px-4 py-0 sm:px-6">
                <TabsTrigger
                  value="project"
                  className="rounded-none border-b-2 border-transparent px-3 py-3 text-sm font-normal data-[state=active]:border-slate-950 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Proyecto
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none border-b-2 border-transparent px-3 py-3 text-sm font-normal data-[state=active]:border-slate-950 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Configuración
                </TabsTrigger>
              </TabsList>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <TabsContent value="project" className="m-0 space-y-4">
                  <div className="space-y-1.5">
                    <Label className={crmFormStyles.label}>
                      <span className="text-rose-600">*</span> Nombre del proyecto
                    </Label>
                    <Input
                      className={crmFormStyles.input}
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ProjectSelect
                      label="Cliente"
                      value={form.client_id}
                      onChange={(value) => setForm((current) => ({ ...current, client_id: value }))}
                      options={clientOptions}
                      noneLabel="Selecciona o deja sin cliente"
                    />
                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Responsables</Label>
                      <ProfileMultiPicker
                        value={form.manager_ids}
                        profiles={availableProjectProfiles}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            manager_ids: value,
                            manager: primaryManagerProfileId(value) || NONE,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Fecha de inicio</Label>
                      <Input
                        className={crmFormStyles.input}
                        type="date"
                        value={form.start_date}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, start_date: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Fecha de entrega</Label>
                      <Input
                        className={crmFormStyles.input}
                        type="date"
                        value={form.due_date}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, due_date: event.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ProjectSelect
                      label="Producto o servicio"
                      value={form.product_id}
                      onChange={(value) =>
                        setForm((current) => ({ ...current, product_id: value }))
                      }
                      options={productOptions}
                      noneLabel="Sin producto"
                    />
                    <ProjectSelect
                      label="Estado inicial"
                      value={form.status}
                      onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                      options={PROJECT_STATUSES.map((item) => ({
                        label: displayLabel(item),
                        value: item,
                      }))}
                      noneLabel="No iniciado"
                      hideNone
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={crmFormStyles.label}>Descripción</Label>
                    <Textarea
                      className={crmFormStyles.textarea}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={6}
                      placeholder="Alcance, entregables, notas del cliente o cualquier detalle importante."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ProjectSelect
                      label="Oportunidad relacionada"
                      value={form.deal_id}
                      onChange={(value) => setForm((current) => ({ ...current, deal_id: value }))}
                      options={dealOptions}
                      noneLabel="Sin oportunidad"
                    />
                    <ProjectSelect
                      label="Lead relacionado"
                      value={form.lead_id}
                      onChange={(value) => setForm((current) => ({ ...current, lead_id: value }))}
                      options={leadOptions}
                      noneLabel="Sin lead"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <ProjectSelect
                      label="Prioridad"
                      value={form.priority}
                      onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
                      options={PRIORITIES.map((item) => ({
                        label: displayLabel(item),
                        value: item,
                      }))}
                      noneLabel="Media"
                      hideNone
                    />
                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Presupuesto</Label>
                      <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2">
                        <Input
                          className={crmFormStyles.input}
                          type="number"
                          min="0"
                          step={getCurrencyStep(form.budget_currency)}
                          inputMode={getCurrencyInputMode(form.budget_currency)}
                          value={form.budget}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, budget: event.target.value }))
                          }
                          onBlur={(event) =>
                            setForm((current) => ({
                              ...current,
                              budget: normalizeCurrencyInput(
                                event.target.value,
                                current.budget_currency,
                              ),
                            }))
                          }
                        />
                        <Select
                          value={normalizeCurrency(form.budget_currency)}
                          onValueChange={(value) => {
                            const nextCurrency = normalizeCurrency(value);
                            setForm((current) => ({
                              ...current,
                              budget_currency: nextCurrency,
                              budget: current.budget.trim()
                                ? String(
                                    convertCurrencyAmount(
                                      current.budget,
                                      current.budget_currency,
                                      nextCurrency,
                                      currencySettings.usdToDopRate,
                                    ),
                                  )
                                : current.budget,
                            }));
                          }}
                        >
                          <SelectTrigger className={crmFormStyles.select}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Progreso manual (%)</Label>
                      <Input
                        className={crmFormStyles.input}
                        type="number"
                        min="0"
                        max="100"
                        value={form.progress}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, progress: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs font-medium text-slate-500">
                  Solo el nombre es obligatorio. Puedes completar los demás datos cuando avance el
                  proyecto.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={crmFormStyles.cancelButton}
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className={crmFormStyles.primaryButton}>
                    {editItem ? "Guardar cambios" : "Guardar"}
                  </Button>
                </div>
              </div>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>

      {selected ? (
        <ProjectWorkspaceDialog
          project={selected}
          currencySettings={currencySettings}
          meta={projectMeta(selected)}
          tasks={(tasksByProjectId.get(selected.id) || [])
            .slice()
            .sort((a, b) => (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31"))}
          clientName={projectMeta(selected).client?.company_name || "—"}
          productName={projectMeta(selected).product?.name || "—"}
          dealName={projectMeta(selected).deal?.name || "—"}
          leadName={projectMeta(selected).lead ? formatLeadLabel(projectMeta(selected).lead!) : "—"}
          managerName={projectMeta(selected).assigneeLabel}
          canEdit={can("projects.edit")}
          canDelete={can("projects.delete")}
          canCreateTask={can("tasks.create")}
          canEditTasks={can("tasks.edit")}
          onClose={() => setSelected(null)}
          onEdit={() => abiertasEditProject(selected)}
          onDelete={() => setDeleteId(selected.id)}
          onCreateTask={() => abiertasCreateTaskForProject(selected)}
          onCompleteTask={completeTask}
        />
      ) : null}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proyecto</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminará el proyecto y sus tareas relacionadas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteProject()}
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

function ProjectSelect({
  label,
  value,
  onChange,
  options,
  noneLabel,
  hideNone = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  noneLabel: string;
  hideNone?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={crmFormStyles.label}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={crmFormStyles.select}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hideNone ? null : <SelectItem value={NONE}>{noneLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectWorkspaceDialog({
  project,
  currencySettings,
  meta,
  tasks,
  clientName,
  productName,
  dealName,
  leadName,
  managerName,
  canEdit,
  canDelete,
  canCreateTask,
  canEditTasks,
  onClose,
  onEdit,
  onDelete,
  onCreateTask,
  onCompleteTask,
}: {
  project: Project;
  currencySettings: CompanyCurrencySettings;
  meta: { stats: ProjectStats; isOverdue: boolean; hasRisk: boolean };
  tasks: TaskRow[];
  clientName: string;
  productName: string;
  dealName: string;
  leadName: string;
  managerName: string;
  canEdit: boolean;
  canDelete: boolean;
  canCreateTask: boolean;
  canEditTasks: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateTask: () => void;
  onCompleteTask: (task: TaskRow) => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const tabs = [
    { value: "overview", label: "Resumen", icon: BarChart3 },
    { value: "tasks", label: "Tareas", icon: CheckCircle2 },
    { value: "timesheets", label: "Horas", icon: Clock3 },
    { value: "milestones", label: "Hitos", icon: ShieldCheck },
    { value: "files", label: "Archivos", icon: Paperclip },
    { value: "discussions", label: "Conversaciones", icon: MessageSquare },
    { value: "gantt", label: "Gantt", icon: GanttChartSquare },
    { value: "tickets", label: "Tickets", icon: Ticket },
    { value: "contracts", label: "Contratos", icon: Landmark },
    { value: "sales", label: "Ventas", icon: ReceiptText },
    { value: "notes", label: "Notas", icon: FileText },
    { value: "activity", label: "Actividad", icon: Activity },
  ];
  const secondaryGroups = [
    {
      title: "Operación",
      items: [
        { value: "timesheets", label: "Horas", description: "Tiempo registrado", icon: Clock3 },
        {
          value: "milestones",
          label: "Hitos",
          description: "Entregables y fechas",
          icon: ShieldCheck,
        },
        { value: "tickets", label: "Tickets", description: "Soporte relacionado", icon: Ticket },
      ],
    },
    {
      title: "Comunicación",
      items: [
        {
          value: "discussions",
          label: "Conversaciones",
          description: "Hilos del cliente",
          icon: MessageSquare,
        },
        { value: "notes", label: "Notas", description: "Notas internas", icon: FileText },
        {
          value: "activity",
          label: "Actividad",
          description: "Historial del proyecto",
          icon: Activity,
        },
      ],
    },
    {
      title: "Comercial y planificación",
      items: [
        {
          value: "contracts",
          label: "Contratos",
          description: "Documentos comerciales",
          icon: Landmark,
        },
        {
          value: "sales",
          label: "Ventas",
          description: "Facturas y rentabilidad",
          icon: ReceiptText,
        },
        {
          value: "gantt",
          label: "Gantt",
          description: "Planificación futura",
          icon: GanttChartSquare,
        },
      ],
    },
  ];
  const progress = Math.min(Math.max(meta.stats.pct, 0), 100);
  const mobileSubtitle = [displayLabel(project.status), meta.hasRisk ? "Riesgo" : null, managerName]
    .filter(Boolean)
    .join(" · ");
  const selectTab = (value: string) => {
    setActiveTab(value);
    setMoreOpen(false);
    requestAnimationFrame(() => contentRef.current?.scrollTo({ top: 0 }));
  };

  useEffect(() => {
    setActiveTab("overview");
    setMoreOpen(false);
  }, [project.id]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none md:h-[92vh] md:w-[calc(100vw-24px)] md:max-w-[1100px] md:rounded-none md:border md:border-slate-200 md:shadow-none [&>button.absolute.right-4.top-4]:hidden">
        <DialogTitle className="sr-only">Espacio del proyecto</DialogTitle>
        <DialogDescription className="sr-only">
          Panel de detalles del proyecto con resumen, tareas, notas y modulos relacionados.
        </DialogDescription>
        <header className="shrink-0 border-b border-slate-100 bg-white md:hidden">
          <div className="grid min-h-[58px] grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 px-2.5 py-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Cerrar proyecto"
              className="h-11 w-11 rounded-none border-b border-slate-200 shadow-none"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0" title={project.name}>
              <h2 className="truncate text-[16px] font-normal leading-5 tracking-normal text-slate-950">
                {project.name}
              </h2>
              <p
                className={cn(
                  "mt-0.5 truncate text-[11.5px] font-normal text-slate-500",
                  meta.hasRisk && "text-rose-700",
                )}
              >
                {mobileSubtitle}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Acciones del proyecto"
                  className="h-11 w-11 rounded-none border-b border-slate-200 shadow-none"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {canEdit ? (
                  <DropdownMenuItem onSelect={onEdit}>Editar proyecto</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem disabled>Exportar datos</DropdownMenuItem>
                {canDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={onDelete}
                    >
                      Eliminar proyecto
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="px-4 pb-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate text-[11.5px] font-normal text-slate-500">
                {meta.hasRisk ? (
                  <span className="text-rose-700">Riesgo activo</span>
                ) : (
                  <span>{displayLabel(project.status)}</span>
                )}
              </div>
              <span className="shrink-0 text-[11.5px] font-normal text-slate-700">{progress}%</span>
            </div>
            <div className="mt-1.5 h-px bg-slate-100">
              <div className="h-px bg-slate-950" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <header className="hidden shrink-0 border-b border-slate-100 bg-white px-5 py-4 md:block">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-normal tracking-normal text-slate-950">
                  {project.name}
                </h2>
                <StatusBadge status={project.status} />
                {meta.hasRisk ? (
                  <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-xs font-normal text-rose-700">
                    Riesgo
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-normal text-slate-500">
                <span>{clientName}</span>
                <span>·</span>
                <span>{productName}</span>
                <span>·</span>
                <span>{managerName}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canCreateTask ? (
                <CrmDetailLineButton
                  className="h-8"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={onCreateTask}
                >
                  Nueva tarea
                </CrmDetailLineButton>
              ) : null}
              {canEdit ? (
                <CrmDetailLineButton className="h-8" onClick={onEdit}>
                  Editar
                </CrmDetailLineButton>
              ) : null}
              {canDelete ? (
                <CrmDetailLineButton className="h-8" tone="danger" onClick={onDelete}>
                  Eliminar
                </CrmDetailLineButton>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Cerrar"
                className="h-8 w-8 rounded-none border-b border-slate-200 shadow-none"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100">
              <div className="h-px bg-slate-950" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-normal text-slate-700">{meta.stats.pct}%</span>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={selectTab} className="flex min-h-0 flex-1 flex-col">
          <div className="grid h-[52px] shrink-0 grid-cols-4 border-b border-slate-100 bg-white md:hidden">
            {[
              { value: "overview", label: "Resumen", icon: BarChart3 },
              { value: "tasks", label: "Tareas", icon: CheckCircle2 },
              { value: "files", label: "Archivos", icon: Paperclip },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => selectTab(tab.value)}
                  className={cn(
                    "relative flex min-w-0 items-center justify-center gap-1.5 px-1 text-[11px] font-normal text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200",
                    active &&
                      "text-slate-950 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-slate-950",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "relative flex min-w-0 items-center justify-center gap-1.5 px-1 text-[11px] font-normal text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200",
                !["overview", "tasks", "files"].includes(activeTab) &&
                  "text-slate-950 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-slate-950",
              )}
              aria-label="Ver más módulos"
            >
              <MoreHorizontal className="h-4 w-4 shrink-0" />
              <span>Más</span>
            </button>
          </div>

          <div className="hidden shrink-0 overflow-x-auto border-b border-slate-100 bg-white px-4 py-0 md:block">
            <TabsList className="inline-flex h-11 w-max justify-start gap-1 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-11 gap-2 rounded-none border-b-2 border-transparent bg-white px-3 text-xs font-normal text-slate-500 shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <div
            ref={contentRef}
            className="min-h-0 flex-1 overflow-y-auto bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-5"
          >
            <TabsContent value="overview" className="mt-0">
              <div className="md:hidden">
                <ProjectMobileOverview
                  project={project}
                  currencySettings={currencySettings}
                  meta={meta}
                  clientName={clientName}
                  productName={productName}
                  dealName={dealName}
                  leadName={leadName}
                  managerName={managerName}
                />
              </div>
              <div className="hidden md:block">
                <ProjectOverviewPanel
                  project={project}
                  currencySettings={currencySettings}
                  meta={meta}
                  clientName={clientName}
                  productName={productName}
                  dealName={dealName}
                  leadName={leadName}
                  managerName={managerName}
                />
              </div>
            </TabsContent>
            <TabsContent value="tasks" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    Tareas del proyecto
                  </h3>
                  <p className="mt-1 text-sm font-normal text-slate-500">
                    {meta.stats.completed}/{meta.stats.total} completadas · {meta.stats.abiertas}{" "}
                    abiertas
                  </p>
                </div>
                {canCreateTask ? (
                  <CrmDetailLineButton
                    className="h-8"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={onCreateTask}
                  >
                    Crear tarea
                  </CrmDetailLineButton>
                ) : null}
              </div>
              <div className="grid gap-2.5 md:hidden">
                {tasks.length ? (
                  tasks.map((task) => (
                    <ProjectTaskMobileCard
                      key={task.id}
                      task={task}
                      canEditTasks={canEditTasks}
                      onCompleteTask={onCompleteTask}
                    />
                  ))
                ) : (
                  <div className="border-y border-dashed border-slate-200 py-5 text-center text-sm font-normal text-slate-500">
                    Este proyecto todavía no tiene tareas.
                  </div>
                )}
              </div>
              <div className="hidden border-y border-slate-100 md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha límite</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length ? (
                      tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="font-normal text-slate-950">{task.title}</div>
                            <div className="line-clamp-1 text-xs font-normal text-slate-500">
                              {task.description || "Sin descripción"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={task.status} />
                          </TableCell>
                          <TableCell>{formatDate(task.due_date)}</TableCell>
                          <TableCell>{displayLabel(task.priority)}</TableCell>
                          <TableCell className="text-right">
                            {!isClosedTaskStatusValue(task.status) && canEditTasks ? (
                              <CrmDetailLineButton
                                className="h-8"
                                onClick={() => onCompleteTask(task)}
                              >
                                Completar
                              </CrmDetailLineButton>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                          Este proyecto todavía no tiene tareas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="timesheets" className="mt-0">
              <ProjectTimesheetsPanel
                projectId={project.id}
                canEdit={canEdit}
                tasks={tasks.map((task) => ({ id: task.id, title: task.title }))}
              />
            </TabsContent>
            <TabsContent value="milestones" className="mt-0">
              <ProjectMilestonesPanel
                projectId={project.id}
                canEdit={canEdit}
                projectStartDate={project.start_date}
                projectDueDate={project.due_date}
              />
            </TabsContent>
            <TabsContent value="files" className="mt-0">
              <ProjectFilesPanel
                projectId={project.id}
                canEdit={canEdit}
                tasks={tasks.map((task) => ({ id: task.id, title: task.title }))}
              />
            </TabsContent>
            <TabsContent value="discussions" className="mt-0">
              <ProjectConversationsPanel
                clientId={project.client_id}
                leadId={project.lead_id}
                dealId={project.deal_id}
              />
            </TabsContent>
            <TabsContent value="gantt" className="mt-0">
              <ProjectGanttPanel project={project} tasks={tasks} />
            </TabsContent>
            <TabsContent value="tickets" className="mt-0">
              <ProjectTicketsPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="contracts" className="mt-0">
              <ProjectContractsPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="sales" className="mt-0">
              <ProjectSalesPanel project={project} />
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <ProjectNotesPanel projectId={project.id} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <ProjectActivityPanel
                projectId={project.id}
                tasks={tasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  updated_at: task.updated_at,
                }))}
              />
            </TabsContent>
          </div>
        </Tabs>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[78dvh] rounded-none border-t border-slate-200 bg-white p-0 shadow-none md:hidden [&>button.absolute.right-4.top-4]:hidden"
          >
            <div className="mx-auto mt-2 h-px w-10 bg-slate-300" />
            <SheetHeader className="border-b border-slate-100 px-4 py-3 text-left">
              <SheetTitle className="text-[17px] font-normal tracking-normal">
                Más módulos
              </SheetTitle>
              <SheetDescription className="font-normal text-slate-500">
                Accede a las áreas secundarias del proyecto.
              </SheetDescription>
            </SheetHeader>
            <div className="max-h-[calc(78dvh-88px)] overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {secondaryGroups.map((group) => (
                <section key={group.title} className="mb-5 last:mb-0">
                  <h3 className="mb-2 px-1 text-[10px] font-normal uppercase tracking-wide text-slate-500">
                    {group.title}
                  </h3>
                  <div className="border-y border-slate-100">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => selectTab(item.value)}
                          className="grid min-h-[54px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 bg-white px-3 py-2 text-left last:border-b-0 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200"
                        >
                          <span className="grid h-[34px] w-[34px] place-items-center rounded-full border border-slate-100 bg-white text-slate-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-normal text-slate-950">
                              {item.label}
                            </span>
                            <span className="block truncate text-[11px] font-normal text-slate-500">
                              {item.description}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </DialogContent>
    </Dialog>
  );
}

function ProjectMobileOverview({
  project,
  currencySettings,
  meta,
  clientName,
  productName,
  dealName,
  leadName,
  managerName,
}: {
  project: Project;
  currencySettings: CompanyCurrencySettings;
  meta: { stats: ProjectStats; isOverdue: boolean; hasRisk: boolean };
  clientName: string;
  productName: string;
  dealName: string;
  leadName: string;
  managerName: string;
}) {
  const safeClient = clientName === "—" ? "Sin cliente" : clientName;
  const safeProduct = productName === "—" ? "Sin producto" : productName;
  const safeDeal = dealName === "—" ? "Sin oportunidad" : dealName;
  const safeLead = leadName === "—" ? "Sin prospecto" : leadName;
  const safeManager = managerName === "—" ? "Sin asignar" : managerName;
  const taskLabel = meta.stats.total
    ? `${meta.stats.completed}/${meta.stats.total} tareas`
    : "Sin tareas";
  const primaryDetails = [
    ["Cliente", safeClient],
    ["Responsable", safeManager],
    ["Fecha límite", project.due_date ? formatDate(project.due_date) : "Sin fecha límite"],
    ["Producto", safeProduct],
    ["Progreso", `${meta.stats.pct}%`],
    ["Tareas", taskLabel],
  ];
  const secondaryDetails = [
    ["Proyecto #", getProjectNumber(project)],
    ["Estado", displayLabel(project.status)],
    ["Tipo de facturación", "Horas por tarea"],
    ["Fecha de creación", formatDate(project.created_at?.slice(0, 10))],
    [
      "Fecha de inicio",
      project.start_date ? formatDate(project.start_date) : "Sin fecha de inicio",
    ],
    ["Oportunidad", safeDeal],
    ["Prospecto", safeLead],
    [
      "Presupuesto",
      normalizeCurrency(project.budget_currency) === currencySettings.baseCurrency
        ? projectBudgetBaseLabel(project, currencySettings)
        : `${projectBudgetBaseLabel(project, currencySettings)} · ${projectBudgetOriginalLabel(project)}`,
    ],
  ];

  return (
    <div className="space-y-3">
      <div className="border-y border-slate-100">
        {primaryDetails.map(([label, value]) => (
          <div
            key={label}
            className="grid min-h-[54px] grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-3 border-b border-slate-100 px-3.5 py-2.5 last:border-b-0"
          >
            <div className="text-xs font-normal text-slate-500">{label}</div>
            <div
              className={cn(
                "truncate text-right text-[13px] font-normal text-slate-950",
                label === "Fecha límite" && meta.isOverdue && "text-rose-700",
              )}
              title={value}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {meta.hasRisk ? (
        <div className="flex items-start gap-2.5 border-b border-rose-100 pb-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rose-100 bg-white text-rose-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-normal text-rose-700">Requiere atención</div>
            <p className="mt-0.5 text-[11.5px] font-normal leading-5 text-rose-700">
              Revisa fechas y tareas vencidas para mantener el proyecto en curso.
            </p>
          </div>
        </div>
      ) : null}

      <div className="border-b border-slate-100 pb-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px] font-normal text-slate-950">Progreso del proyecto</div>
          <div className="text-[15px] font-normal text-slate-950">{meta.stats.pct}%</div>
        </div>
        <Progress value={Math.min(100, Math.max(0, meta.stats.pct))} className="mt-2 h-1.5" />
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-normal text-slate-500">
          <span>{taskLabel}</span>
          <span>{meta.stats.abiertas} abiertas</span>
        </div>
      </div>

      <Accordion type="single" collapsible>
        <AccordionItem value="details" className="border-b border-slate-100 bg-white">
          <AccordionTrigger className="min-h-12 px-0 py-0 text-[12.5px] font-normal hover:no-underline">
            Ver todos los detalles
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <div className="border-y border-slate-100">
              {secondaryDetails.map(([label, value]) => (
                <div
                  key={label}
                  className="grid min-h-[46px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0"
                >
                  <div className="text-[11.5px] font-normal text-slate-500">{label}</div>
                  <div
                    className="truncate text-right text-[12.5px] font-normal text-slate-950"
                    title={value}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h3 className="mb-2 text-[11px] font-normal uppercase tracking-wide text-slate-500">
          Descripción
        </h3>
        <div className="border-y border-slate-100 py-3.5 text-[12.5px] font-normal leading-6 text-slate-500">
          {project.description || "No hay descripción registrada para este proyecto."}
        </div>
      </div>
    </div>
  );
}

function ProjectTaskMobileCard({
  task,
  canEditTasks,
  onCompleteTask,
}: {
  task: TaskRow;
  canEditTasks: boolean;
  onCompleteTask: (task: TaskRow) => void;
}) {
  const canComplete = !isClosedTaskStatusValue(task.status) && canEditTasks;
  return (
    <div className="border-b border-slate-100 pb-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[13.5px] font-normal leading-5 text-slate-950">
            {task.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11.5px] font-normal leading-5 text-slate-500">
            {task.description || "Sin descripción"}
          </p>
        </div>
        <StatusBadge
          status={task.status}
          className="min-h-6 max-w-[96px] shrink-0 truncate rounded-full px-2.5 text-[10.5px] font-bold"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-normal text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDate(task.due_date)}
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {displayLabel(task.priority)}
        </span>
      </div>
      {canComplete ? (
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
          <Button size="sm" variant="outline" onClick={() => onCompleteTask(task)}>
            Completar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function getProjectNumber(project: Project) {
  const match = project.name.match(/INV-\d+/i);
  if (match) return match[0].toUpperCase();
  return project.id.slice(0, 8);
}

function getDaysLeft(dueDate: string | null | undefined) {
  if (!dueDate) return null;
  const today = new Date(`${isoToday()}T00:00:00`);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function ProjectOverviewPanel({
  project,
  currencySettings,
  meta,
  clientName,
  productName,
  dealName,
  leadName,
  managerName,
}: {
  project: Project;
  currencySettings: CompanyCurrencySettings;
  meta: { stats: ProjectStats; isOverdue: boolean; hasRisk: boolean };
  clientName: string;
  productName: string;
  dealName: string;
  leadName: string;
  managerName: string;
}) {
  return (
    <div className="grid grid-cols-1 bg-white xl:grid-cols-[minmax(0,0.98fr)_minmax(420px,1.02fr)]">
      <section className="border-b border-slate-100 pb-5 xl:border-b-0 xl:border-r xl:pr-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
            Resumen
          </h3>
          <button type="button" className="text-xs font-normal text-slate-500 hover:text-slate-950">
            Exportar datos del proyecto
          </button>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <OverviewField label="Proyecto #" value={getProjectNumber(project)} />
          <OverviewField label="Cliente" value={clientName} strong />
          <OverviewField label="Tipo de facturación" value="Horas por tarea" />
          <OverviewField label="Estado" value={displayLabel(project.status)} />
          <OverviewField
            label="Fecha de creación"
            value={formatDate(project.created_at?.slice(0, 10))}
          />
          <OverviewField label="Fecha de inicio" value={formatDate(project.start_date)} />
          <OverviewField
            label="Fecha límite"
            value={formatDate(project.due_date)}
            danger={meta.isOverdue}
          />
          <OverviewField label="Responsable del proyecto" value={managerName} />
          <OverviewField label="Producto" value={productName} />
          <OverviewField label="Oportunidad" value={dealName} />
          <OverviewField label="Prospecto" value={leadName} />
          <OverviewField
            label="Presupuesto"
            value={
              normalizeCurrency(project.budget_currency) === currencySettings.baseCurrency
                ? projectBudgetBaseLabel(project, currencySettings)
                : `${projectBudgetBaseLabel(project, currencySettings)} · original ${projectBudgetOriginalLabel(project)}`
            }
            strong
          />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
            Descripción
          </h4>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm font-normal leading-6 text-slate-500">
            {project.description || "No hay descripción registrada para este proyecto."}
          </p>
        </div>
      </section>

      <section className="space-y-5 bg-white pt-5 xl:pl-5 xl:pt-0">
        <div>
          <h3 className="text-base font-normal text-slate-950">{project.name}</h3>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Progreso del proyecto{" "}
            <span className="font-normal text-slate-700">{meta.stats.pct}%</span>
          </p>
          <Progress value={meta.stats.pct} className="mt-2 h-2" />
        </div>

        <FinanceSection
          icon={<Clock3 className="h-4 w-4" />}
          title="Horas registradas"
          rows={[
            ["Horas registradas", "00:00", "US$ 0.00", "text-slate-700"],
            ["Horas facturables", "00:00", "US$ 0.00", "text-blue-600"],
            ["Horas facturadas", "00:00", "US$ 0.00", "text-emerald-600"],
            ["Horas sin facturar", "00:00", "US$ 0.00", "text-rose-600"],
          ]}
        />

        <FinanceSection
          icon={<ReceiptText className="h-4 w-4" />}
          title="Gastos"
          rows={[
            ["Gastos totales", "", "US$ 0.00", "text-slate-700"],
            ["Gastos facturables", "", "US$ 0.00", "text-blue-600"],
            ["Gastos facturados", "", "US$ 0.00", "text-emerald-600"],
            ["Gastos sin facturar", "", "US$ 0.00", "text-rose-600"],
          ]}
        />

        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-normal text-slate-700">Horas registradas esta semana</div>
            <div className="text-xs font-normal text-slate-500">Esta semana</div>
          </div>
          <div className="mt-4 grid h-24 grid-cols-7 items-end gap-2 border-b border-l px-2 pb-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
              <div key={day} className="flex h-full flex-col justify-end gap-1">
                <div className="h-1 rounded-sm bg-blue-400" />
                <div className="h-1 rounded-sm bg-rose-400" />
                <span className="mt-1 rotate-[-35deg] text-[10px] font-semibold text-slate-400">
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OverviewField({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 border-b border-slate-100 pb-2">
      <div className="text-xs font-normal text-slate-500">{label}</div>
      <div
        className={
          "mt-1 truncate text-sm " +
          (strong ? "font-normal " : "font-normal ") +
          (danger ? "text-rose-700" : "text-slate-950")
        }
      >
        {value || "—"}
      </div>
    </div>
  );
}

function FinanceSection({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: Array<[string, string, string, string]>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-normal text-slate-700">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-slate-100 py-3 sm:grid-cols-4">
        {rows.map(([label, time, amount, tone]) => (
          <div key={label} className="min-w-0">
            <div className={`text-xs font-normal ${tone}`}>{label}</div>
            {time ? <div className="mt-1 text-sm font-normal text-slate-700">{time}</div> : null}
            <div className="text-sm font-normal text-slate-950">{amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
