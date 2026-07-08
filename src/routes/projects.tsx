import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ClipboardList,
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
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectActivityPanel } from "@/components/projects/project-activity-panel";
import { ProjectConversationsPanel } from "@/components/projects/project-conversations-panel";
import { ProjectFilesPanel } from "@/components/projects/project-files-panel";
import { ProjectMilestonesPanel } from "@/components/projects/project-milestones-panel";
import { ProjectTicketsPanel } from "@/components/projects/project-tickets-panel";
import { ProjectTimesheetsPanel } from "@/components/projects/project-timesheets-panel";
import { ProjectContractsPanel } from "@/components/projects/project-contracts-panel";
import { ProjectNotesPanel } from "@/components/projects/project-notes-panel";
import { DataCard } from "@/components/crm/data-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { SearchFilters } from "@/components/crm/search-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
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

export const Route = createFileRoute("/projects")({
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
  user_id: string | null;
  is_active: boolean;
};

type ProjectStats = {
  total: number;
  completed: number;
  abiertas: number;
  overdue: number;
  pct: number;
};

type ProjectForm = {
  name: string;
  description: string;
  status: string;
  progress: string;
  priority: string;
  budget: string;
  start_date: string;
  due_date: string;
  client_id: string;
  product_id: string;
  deal_id: string;
  lead_id: string;
  manager: string;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString()}`;
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
    start_date: "",
    due_date: "",
    client_id: NONE,
    product_id: NONE,
    deal_id: NONE,
    lead_id: NONE,
    manager: NONE,
  };
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

function ProjectsPage() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [tasksFilter, setTasksFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(defaultProjectForm);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "Medium",
  });

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
    select: "id,company_id,full_name,email,user_id,is_active",
    orderBy: "full_name",
    ascending: true,
    limit: 2000,
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

  const managerName = (raw: string | null | undefined) => {
    const managerId = resolveManagerProfileId(raw);
    if (!managerId) return "Sin asignar";
    return (
      profileById.get(managerId)?.full_name || profileById.get(managerId)?.email || "Sin asignar"
    );
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
        (managerFilter === "all" || resolveManagerProfileId(project.manager) === managerFilter) &&
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
    if (!dialogOpen || !form.client_id || form.client_id === NONE || form.manager !== NONE) return;
    const client = clientById.get(form.client_id);
    if (client?.account_manager)
      setForm((current) => ({
        ...current,
        manager: resolveManagerProfileId(client.account_manager) || NONE,
      }));
  }, [clientById, dialogOpen, form.client_id, form.manager]);

  function abiertasNewProject() {
    if (!can("projects.create")) return toast.error("No tienes permiso para crear proyectos");
    setEditItem(null);
    setForm(defaultProjectForm());
    setAdvancedOpen(false);
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
      start_date: project.start_date || "",
      due_date: project.due_date || "",
      client_id: project.client_id || NONE,
      product_id: project.product_id || NONE,
      deal_id: project.deal_id || NONE,
      lead_id: project.lead_id || NONE,
      manager: resolveManagerProfileId(project.manager) || NONE,
    });
    setAdvancedOpen(false);
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!can(editItem ? "projects.edit" : "projects.create"))
      return toast.error("No tienes permiso para realizar esta acción");
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    const record = {
      company_id: profile.company_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      progress: Number(form.progress) || 0,
      priority: form.priority,
      budget: form.budget.trim() ? Number(form.budget) || 0 : null,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      client_id: form.client_id !== NONE ? form.client_id : null,
      product_id: form.product_id !== NONE ? form.product_id : null,
      deal_id: form.deal_id !== NONE ? form.deal_id : null,
      lead_id: form.lead_id !== NONE ? form.lead_id : null,
      manager: form.manager !== NONE ? form.manager : null,
    };
    try {
      if (editItem) {
        await update(editItem.id, record);
        setSelected(null);
        void sendProjectNotification(
          "Proyecto actualizado",
          `${record.name || "Proyecto sin nombre"} fue actualizado.`,
        );
        toast.success("Proyecto actualizado");
      } else {
        await create(record);
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
    try {
      const { error } = await supabase.from("tasks").delete().eq("related_project_id", deleteId);
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
    setTaskForm({ title: "", description: "", due_date: isoToday(), priority: "Medium" });
    setTaskDialogOpen(true);
  }

  async function handleCreateTaskForSelectedProject() {
    if (!selected || !profile?.company_id) return;
    if (!taskForm.title.trim()) return toast.error("El título es requerido");
    setTaskSaving(true);
    try {
      const { error } = await (supabase as any).from("tasks").insert({
        company_id: profile.company_id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status: "To Do",
        priority: taskForm.priority || "Medium",
        due_date: taskForm.due_date || null,
        assigned_to: resolveTaskAssigneeUserId(selected.manager),
        related_project_id: selected.id,
        related_client_id: selected.client_id || null,
        related_lead_id: selected.lead_id || null,
        related_deal_id: selected.deal_id || null,
      });
      if (error) throw error;
      await fetchTasks();
      void sendProjectNotification(
        "Tarea de proyecto creada",
        `${taskForm.title.trim()} fue creada desde ${selected.name || "el proyecto"}.`,
      );
      toast.success("Tarea creada");
      setTaskDialogOpen(false);
      void logActivityEvent({
        companyId: profile.company_id,
        userId: profile.id || null,
        action: "task_created",
        entityType: "tasks",
        detail: `Tarea creada desde proyecto: ${taskForm.title.trim()}`,
        metadata: { related_project_id: selected.id },
      }).catch(() => {});
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la tarea.");
    } finally {
      setTaskSaving(false);
    }
  }

  async function completeTask(task: TaskRow) {
    if (!can("tasks.edit")) return toast.error("No tienes permiso para actualizar tareas");
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ status: "Completed" })
      .eq("id", task.id);
    if (error) return toast.error(error.message || "No se pudo completar la tarea");
    await fetchTasks();
    void sendProjectNotification(
      "Tarea de proyecto completada",
      `${task.title || "Tarea"} quedó completada.`,
    );
    toast.success("Tarea completada");
  }

  if (loading) return <LoadingState />;

  return (
    <div data-demo="projects-main" className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Proyectos"
        subtitle="Workspace operativo para clientes, entregas, tareas y futuros módulos."
        actionLabel={can("projects.create") ? "Add Project" : undefined}
        onAction={can("projects.create") ? abiertasNewProject : undefined}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: kpis.total, icon: FolderOpen, tone: "text-slate-600" },
          { label: "Activos", value: kpis.active, icon: Zap, tone: "text-blue-600" },
          { label: "En riesgo", value: kpis.risky, icon: AlertTriangle, tone: "text-rose-600" },
          {
            label: "Completados",
            value: kpis.completed,
            icon: CheckCircle2,
            tone: "text-emerald-600",
          },
          {
            label: "Vencidos",
            value: kpis.overdue,
            icon: CalendarClock,
            tone: "text-orange-600",
          },
          {
            label: "Tareas abiertas",
            value: kpis.abiertasTasks,
            icon: ClipboardList,
            tone: "text-amber-700",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className={`h-4 w-4 shrink-0 ${item.tone}`} />
                  <span className="truncate text-[11px] font-bold leading-4 text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <div className="shrink-0 text-[17px] font-semibold leading-none text-slate-950">
                  {item.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DataCard>
        <div data-demo="projects-list" className="space-y-4">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search projects..."
            mobileCollapsible
            mobileFiltersLabel="Filtros"
            filters={[
              {
                key: "status",
                placeholder: "Estado",
                value: statusFilter,
                onChange: setStatusFilter,
                options: PROJECT_STATUSES.map((s) => ({ label: displayLabel(s), value: s })),
              },
              {
                key: "client",
                placeholder: "Client",
                value: clientFilter,
                onChange: setClientFilter,
                options: clientOptions,
                width: "w-56",
              },
              {
                key: "product",
                placeholder: "Producto",
                value: productFilter,
                onChange: setProductFilter,
                options: productOptions,
                width: "w-56",
              },
              {
                key: "manager",
                placeholder: "Manager",
                value: managerFilter,
                onChange: setManagerFilter,
                options: managerOptions,
                width: "w-56",
              },
              {
                key: "tasks",
                placeholder: "Tareas",
                value: tasksFilter,
                onChange: setTasksFilter,
                options: [
                  { label: "Overdue", value: "overdue" },
                  { label: "In progress", value: "in_progress" },
                  { label: "Completed", value: "completed" },
                  { label: "No tasks", value: "no_tasks" },
                ],
                width: "w-44",
              },
            ]}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="h-6 w-6" />}
              title="No hay proyectos"
              description="Crea tu primer proyecto."
              actionLabel="Add Project"
              onAction={abiertasNewProject}
            />
          ) : (
            <div className="-mx-2 sm:-mx-5">
              <Table className="projects-list-table">
                <TableHeader className="projects-list-table__head">
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-5">Proyecto</TableHead>
                    <TableHead className="hidden lg:table-cell">Cliente / Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Progreso</TableHead>
                    <TableHead className="hidden xl:table-cell">Responsable</TableHead>
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
                    const owner = managerName(project.manager);
                    return (
                      <TableRow
                        key={project.id}
                        data-demo={index === 0 ? "projects-first-row" : undefined}
                        className="cursor-pointer align-top hover:bg-muted/40"
                        onClick={() => setSelected(project)}
                      >
                        <TableCell className="pl-4 sm:pl-5">
                          <div className="flex min-w-0 items-start gap-3 sm:min-w-[320px]">
                            <div
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border font-bold shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl ${meta.hasRisk ? "border-rose-100 bg-rose-50 text-rose-700" : "border-blue-100 bg-blue-50 text-blue-700"}`}
                            >
                              {meta.hasRisk ? (
                                <AlertTriangle className="h-5 w-5" />
                              ) : (
                                <span className="text-xs">{initials(project.name)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-[15px] font-semibold text-slate-950">
                                  {project.name}
                                </div>
                                {meta.hasRisk ? (
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                    Riesgo
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 truncate text-[12.5px] text-muted-foreground">
                                {clientName} · {meta.deal?.name || "Sin oportunidad"}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                                  <Package className="h-3 w-3" />
                                  {productName}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:hidden">
                                  <UserRound className="h-3 w-3" />
                                  {owner}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="max-w-[240px]">
                            <div className="truncate text-sm font-medium">{clientName}</div>
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
                              <span className="font-semibold">{meta.stats.pct}%</span>
                              <span className="text-muted-foreground">
                                {meta.stats.total
                                  ? `${meta.stats.completed}/${meta.stats.total}`
                                  : "Sin tareas"}
                              </span>
                            </div>
                            <Progress value={meta.stats.pct} className="mt-2 h-2" />
                            {meta.stats.overdue ? (
                              <div className="mt-1 text-[11px] font-medium text-rose-700">
                                {meta.stats.overdue} vencidas
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                              {initials(owner)}
                            </div>
                            <div className="max-w-[160px] truncate text-sm">{owner}</div>
                          </div>
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
                          <div className="font-semibold">{formatMoney(project.budget)}</div>
                          <div className="text-[11px] text-muted-foreground">presupuesto</div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DataCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditItem(null);
            setAdvancedOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b bg-white px-6 py-5">
            <DialogTitle className="text-xl font-semibold tracking-[-0.02em]">
              {editItem ? "Editar proyecto" : "Nuevo proyecto"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Crea un trabajo claro para ejecutar con cliente, responsable, entrega y alcance.
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
              <div className="rounded-3xl border bg-gradient-to-br from-blue-50/80 via-white to-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Información principal
                </div>
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nombre del proyecto</Label>
                    <Input
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
                      noneLabel="Sin cliente"
                    />
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
                      label="Responsable"
                      value={form.manager}
                      onChange={(value) => setForm((current) => ({ ...current, manager: value }))}
                      options={managerOptions}
                      noneLabel="Sin asignar"
                    />
                    <div className="space-y-1.5">
                      <Label>Fecha de entrega</Label>
                      <Input
                        type="date"
                        value={form.due_date}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, due_date: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alcance / descripción</Label>
                    <Textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border bg-white">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((value) => !value)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold">Opciones avanzadas</div>
                    <div className="text-xs text-muted-foreground">
                      Oportunidad, lead, estado, progreso, presupuesto y fecha de inicio.
                    </div>
                  </div>
                  <ChevronDown
                    className={
                      "h-4 w-4 text-muted-foreground transition-transform " +
                      (advancedOpen ? "rotate-180" : "")
                    }
                  />
                </button>
                {advancedOpen ? (
                  <div className="space-y-4 border-t px-4 py-4">
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
                        onChange={(value) =>
                          setForm((current) => ({ ...current, priority: value }))
                        }
                        options={PRIORITIES.map((item) => ({
                          label: displayLabel(item),
                          value: item,
                        }))}
                        noneLabel="Media"
                        hideNone
                      />
                      <div className="space-y-1.5">
                        <Label>Presupuesto ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.budget}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, budget: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fecha inicio</Label>
                        <Input
                          type="date"
                          value={form.start_date}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, start_date: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <ProjectSelect
                        label="Estado"
                        value={form.status}
                        onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                        options={PROJECT_STATUSES.map((item) => ({
                          label: displayLabel(item),
                          value: item,
                        }))}
                        noneLabel="No iniciado"
                        hideNone
                      />
                      <div className="space-y-1.5">
                        <Label>Progreso manual (%)</Label>
                        <Input
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
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between border-t bg-white px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Los módulos avanzados quedan preparados como placeholders dentro del workspace.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editItem ? "Guardar cambios" : "Crear proyecto"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selected ? (
        <ProjectWorkspaceDialog
          project={selected}
          meta={projectMeta(selected)}
          tasks={(tasksByProjectId.get(selected.id) || [])
            .slice()
            .sort((a, b) => (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31"))}
          clientName={projectMeta(selected).client?.company_name || "—"}
          productName={projectMeta(selected).product?.name || "—"}
          dealName={projectMeta(selected).deal?.name || "—"}
          leadName={projectMeta(selected).lead ? formatLeadLabel(projectMeta(selected).lead!) : "—"}
          managerName={managerName(selected.manager)}
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

      <Dialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setTaskForm({ title: "", description: "", due_date: "", priority: "Medium" });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreateTaskForSelectedProject();
            }}
          >
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, due_date: event.target.value }))
                  }
                />
              </div>
              <ProjectSelect
                label="Prioridad"
                value={taskForm.priority}
                onChange={(value) => setTaskForm((current) => ({ ...current, priority: value }))}
                options={PRIORITIES.map((item) => ({ label: displayLabel(item), value: item }))}
                noneLabel="Media"
                hideNone
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskDialogOpen(false)}
                disabled={taskSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={taskSaving || !can("tasks.create")}>
                {taskSaving ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
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

function ProjectWorkspaceDialog({
  project,
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
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[92vh] w-[calc(100vw-24px)] max-w-[1100px] gap-0 overflow-hidden rounded-2xl border bg-white p-0 shadow-2xl">
        <DialogTitle className="sr-only">Espacio del proyecto</DialogTitle>
        <DialogDescription className="sr-only">
          Panel de detalles del proyecto con resumen, tareas, notas y modulos relacionados.
        </DialogDescription>
        <header className="shrink-0 border-b bg-white px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-extrabold tracking-[-0.025em] text-slate-900">
                  {project.name}
                </h2>
                <StatusBadge status={project.status} />
                {meta.hasRisk ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                    Riesgo
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                <span>{clientName}</span>
                <span>·</span>
                <span>{productName}</span>
                <span>·</span>
                <span>{managerName}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canCreateTask ? (
                <Button onClick={onCreateTask}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva tarea
                </Button>
              ) : null}
              {canEdit ? (
                <Button variant="outline" onClick={onEdit}>
                  Editar
                </Button>
              ) : null}
              {canDelete ? (
                <Button variant="outline" className="text-red-600" onClick={onDelete}>
                  Eliminar
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(Math.max(meta.stats.pct, 0), 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-700">{meta.stats.pct}%</span>
          </div>
        </header>
        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 overflow-x-auto border-b bg-slate-50 px-4 py-2">
            <TabsList className="inline-flex h-11 w-max justify-start gap-1 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-9 gap-2 rounded-lg px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5">
            <TabsContent value="overview" className="mt-0">
              <ProjectOverviewPanel
                project={project}
                meta={meta}
                clientName={clientName}
                productName={productName}
                dealName={dealName}
                leadName={leadName}
                managerName={managerName}
              />
            </TabsContent>
            <TabsContent value="tasks" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900">Tareas del proyecto</h3>
                  <p className="text-sm font-medium text-slate-500">
                    {meta.stats.completed}/{meta.stats.total} completadas · {meta.stats.abiertas}{" "}
                    abiertas
                  </p>
                </div>
                {canCreateTask ? (
                  <Button onClick={onCreateTask}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear tarea
                  </Button>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-xl border">
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
                            <div className="font-semibold text-slate-900">{task.title}</div>
                            <div className="line-clamp-1 text-xs text-slate-500">
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCompleteTask(task)}
                              >
                                Completar
                              </Button>
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
              <PlaceholderModule
                icon={<GanttChartSquare className="h-5 w-5" />}
                title="Gantt"
                description="Vista futura de calendario y dependencias para visualizar tareas, hitos y fechas de entrega."
              />
            </TabsContent>
            <TabsContent value="tickets" className="mt-0">
              <ProjectTicketsPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="contracts" className="mt-0">
              <ProjectContractsPanel projectId={project.id} />
            </TabsContent>
            <TabsContent value="sales" className="mt-0">
              <PlaceholderModule
                icon={<ReceiptText className="h-5 w-5" />}
                title="Ventas"
                description="Resumen futuro de facturas, propuestas, pagos, gastos, horas billables y rentabilidad del proyecto."
              />
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
      </DialogContent>
    </Dialog>
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

function getDateProgress(startDate: string | null | undefined, dueDate: string | null | undefined) {
  if (!startDate || !dueDate) return 0;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  const today = new Date(`${isoToday()}T00:00:00`).getTime();
  if (due <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((today - start) / (due - start)) * 100)));
}

function ProjectOverviewPanel({
  project,
  meta,
  clientName,
  productName,
  dealName,
  leadName,
  managerName,
}: {
  project: Project;
  meta: { stats: ProjectStats; isOverdue: boolean; hasRisk: boolean };
  clientName: string;
  productName: string;
  dealName: string;
  leadName: string;
  managerName: string;
}) {
  const daysLeft = getDaysLeft(project.due_date);
  const dateProgress = getDateProgress(project.start_date, project.due_date);
  const taskProgress = meta.stats.total
    ? Math.round((meta.stats.completed / meta.stats.total) * 100)
    : 0;
  const dueLabel =
    daysLeft == null
      ? "Sin fecha límite"
      : daysLeft < 0
        ? `${Math.abs(daysLeft)} días vencidos`
        : `${daysLeft} días restantes`;

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border bg-white xl:grid-cols-[minmax(0,0.98fr)_minmax(420px,1.02fr)]">
      <section className="border-b p-5 xl:border-b-0 xl:border-r">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-slate-900">Resumen</h3>
          <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700">
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
          <OverviewField label="Presupuesto" value={formatMoney(project.budget)} strong />
        </div>

        <div className="mt-5 border-t pt-4">
          <h4 className="text-sm font-bold text-slate-900">Description</h4>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {project.description || "No hay descripción registrada para este proyecto."}
          </p>
        </div>
      </section>

      <section className="space-y-5 bg-slate-50/45 p-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{project.name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Progreso del proyecto{" "}
            <span className="font-extrabold text-slate-700">{meta.stats.pct}%</span>
          </p>
          <Progress value={meta.stats.pct} className="mt-2 h-2" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PerformanceCard
            title={`${meta.stats.abiertas} / ${meta.stats.total} tareas abiertas`}
            value={`${taskProgress}%`}
            progress={taskProgress}
          />
          <PerformanceCard
            title={dueLabel}
            value={project.due_date ? formatDate(project.due_date) : "—"}
            progress={dateProgress}
            danger={meta.isOverdue}
          />
        </div>

        <FinanceSection
          icon={<Clock3 className="h-4 w-4" />}
          title="Horas registradas"
          rows={[
            ["Horas registradas", "00:00", "$0.00", "text-slate-700"],
            ["Horas facturables", "00:00", "$0.00", "text-blue-600"],
            ["Horas facturadas", "00:00", "$0.00", "text-emerald-600"],
            ["Horas sin facturar", "00:00", "$0.00", "text-rose-600"],
          ]}
        />

        <FinanceSection
          icon={<ReceiptText className="h-4 w-4" />}
          title="Gastos"
          rows={[
            ["Gastos totales", "", "$0.00", "text-slate-700"],
            ["Gastos facturables", "", "$0.00", "text-blue-600"],
            ["Gastos facturados", "", "$0.00", "text-emerald-600"],
            ["Gastos sin facturar", "", "$0.00", "text-rose-600"],
          ]}
        />

        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-700">Horas registradas esta semana</div>
            <div className="text-xs font-semibold text-slate-500">Esta semana</div>
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
    <div className="min-w-0">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div
        className={
          "mt-1 truncate text-sm " +
          (strong ? "font-extrabold " : "font-semibold ") +
          (danger ? "text-rose-700" : "text-slate-900")
        }
      >
        {value || "—"}
      </div>
    </div>
  );
}

function PerformanceCard({
  title,
  value,
  progress,
  danger = false,
}: {
  title: string;
  value: string;
  progress: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-extrabold text-slate-800">{title}</div>
      <div className={"mt-1 text-xs font-bold " + (danger ? "text-rose-600" : "text-slate-500")}>
        {value}
      </div>
      <Progress value={Math.min(100, Math.max(0, progress))} className="mt-3 h-2" />
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
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
        {icon}
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-white p-3 sm:grid-cols-4">
        {rows.map(([label, time, amount, tone]) => (
          <div key={label} className="min-w-0">
            <div className={`text-xs font-bold ${tone}`}>{label}</div>
            {time ? <div className="mt-1 text-sm font-semibold text-slate-700">{time}</div> : null}
            <div className="text-sm font-extrabold text-slate-950">{amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
