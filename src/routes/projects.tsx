import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ExternalLink,
  FolderOpen,
  Package,
  Plus,
  UserRound,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { DetailSheet } from "@/components/crm/detail-sheet";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { useCrud } from "@/hooks/use-crud";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import {
  isActiveProjectStatus,
  isClosedTaskStatusValue,
  isCompletedTaskStatusValue,
  isDoneTaskStatusValue,
  normalizeStatus,
} from "@/lib/crm/status";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects — Corevix CRM" }] }),
});

const PROJECT_STATUSES = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

interface Project {
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
  manager: string | null; // profiles.id
  created_by: string | null; // profiles.id
  created_at: string;
  updated_at?: string;
}

interface TaskRow {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null; // auth user id
  related_project_id: string | null;
  related_client_id: string | null;
  related_lead_id: string | null;
  related_deal_id: string | null;
  updated_at: string;
}

interface ClientRow {
  id: string;
  company_id: string;
  company_name: string;
  account_manager: string | null; // profiles.id
}

interface ProductRow {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  base_price: number | null;
  is_active: boolean | null;
}

interface DealRow {
  id: string;
  company_id: string;
  name: string;
  stage: string;
  value: number | null;
  lead_id: string | null;
  assigned_to: string | null; // auth user id
  probability: number | null;
  expected_close: string | null;
  updated_at: string;
}

interface LeadRow {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
}

interface ClientProductRow {
  id: string;
  company_id: string;
  client_id: string;
  product_id: string;
}

interface DealProductRow {
  id: string;
  company_id: string;
  deal_id: string;
  product_id: string;
  created_at: string;
}

interface ProductWorkflowRow {
  id: string;
  company_id: string;
  product_id: string;
  is_active: boolean;
  name: string;
}

interface ProfileRow {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
  user_id: string | null;
  is_active: boolean;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatLeadLabel(lead: LeadRow) {
  const company = (lead.company_name || "").trim();
  if (company) return company;
  const person = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
  if (person) return person;
  return (lead.email || "").trim() || lead.id;
}

function formatMoneyCompact(value: number | null | undefined) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString()}`;
}

function formatProjectDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function projectInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "P"
  );
}

function statusTone(status: string | null | undefined) {
  const normalized = normalizeStatus(status || "");
  if (normalized === normalizeStatus("Completed"))
    return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (normalized === normalizeStatus("In Progress"))
    return "text-blue-700 bg-blue-50 border-blue-100";
  if (normalized === normalizeStatus("On Hold"))
    return "text-amber-700 bg-amber-50 border-amber-100";
  if (normalized === normalizeStatus("Cancelled"))
    return "text-slate-500 bg-slate-100 border-slate-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function ProjectsPage() {
  const { profile, user, roles } = useAuth();
  const { can } = usePermissions();
  const isAdminLike = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const isSalesAgent = roles?.includes("sales_agent") ?? false;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [tasksFilter, setTasksFilter] = useState<
    "all" | "overdue" | "in_progress" | "completed" | "no_tasks"
  >("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectFormAdvancedOpen, setProjectFormAdvancedOpen] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<{
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
  }>({
    name: "",
    description: "",
    status: "Not Started",
    progress: "0",
    priority: "Medium",
    budget: "",
    start_date: "",
    due_date: "",
    client_id: "none",
    product_id: "none",
    deal_id: "none",
    lead_id: "none",
    manager: "none",
  });

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
  } = useCrud<Project>({
    table: "projects",
    orderBy: "updated_at",
    ascending: false,
    limit: 500,
  });

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

  const { data: clientProducts } = useCrud<ClientProductRow>({
    table: "client_products",
    select: "id,company_id,client_id,product_id",
    orderBy: "updated_at",
    ascending: false,
    limit: 5000,
  });

  const { data: dealProducts } = useCrud<DealProductRow>({
    table: "deal_products",
    select: "id,company_id,deal_id,product_id,created_at",
    orderBy: "created_at",
    ascending: false,
    limit: 5000,
  });

  const { data: productWorkflows } = useCrud<ProductWorkflowRow>({
    table: "product_workflows",
    select: "id,company_id,product_id,is_active,name",
    orderBy: "created_at",
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

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const dealById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const profileByUserId = useMemo(
    () => new Map(profiles.filter((p) => p.user_id).map((p) => [String(p.user_id), p])),
    [profiles],
  );
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const resolveManagerProfileId = (raw: string | null | undefined) => {
    const value = String(raw || "").trim();
    if (!value || value === "none") return null;
    if (profileById.has(value)) return value;
    return profileByUserId.get(value)?.id || null;
  };

  const resolveTaskAssigneeUserId = (raw: string | null | undefined) => {
    const value = String(raw || "").trim();
    if (!value || value === "none") return profile?.user_id || user?.id || null;

    const byUser = profileByUserId.get(value);
    if (byUser?.user_id) return byUser.user_id;

    const byProfile = profileById.get(value);
    if (byProfile?.user_id) return byProfile.user_id;

    if (value === String(profile?.user_id || "") || value === String(user?.id || "")) return value;
    if (value === String(profile?.id || "")) return profile?.user_id || user?.id || null;

    return profile?.user_id || user?.id || null;
  };

  const activeWorkflowByProductId = useMemo(() => {
    const map = new Map<string, ProductWorkflowRow>();
    for (const wf of productWorkflows) {
      if (!wf.is_active) continue;
      if (!map.has(String(wf.product_id))) map.set(String(wf.product_id), wf);
    }
    return map;
  }, [productWorkflows]);

  const purchasedProductIdsByClientId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const cp of clientProducts) {
      const cid = String(cp.client_id);
      const set = map.get(cid) || new Set<string>();
      set.add(String(cp.product_id));
      map.set(cid, set);
    }
    return map;
  }, [clientProducts]);

  const dealProductIdsByDealId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const dp of dealProducts) {
      const did = String(dp.deal_id);
      const list = map.get(did) || [];
      list.push(String(dp.product_id));
      map.set(did, list);
    }
    return map;
  }, [dealProducts]);

  const tasksByProjectId = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!t.related_project_id) continue;
      const pid = String(t.related_project_id);
      const bucket = map.get(pid) || [];
      bucket.push(t);
      map.set(pid, bucket);
    }
    return map;
  }, [tasks]);

  const statsByProjectId = useMemo(() => {
    const today = isoToday();
    const map = new Map<
      string,
      { total: number; completed: number; open: number; overdue: number; computedPct: number }
    >();
    for (const p of projects) {
      const list = tasksByProjectId.get(String(p.id)) || [];
      const total = list.length;
      const completed = list.filter((t) => isDoneTaskStatusValue(t.status)).length;
      const open = list.filter((t) => !isClosedTaskStatusValue(t.status)).length;
      const overdue = list.filter((t) => {
        if (!t.due_date) return false;
        if (isClosedTaskStatusValue(t.status)) return false;
        return String(t.due_date) < today;
      }).length;
      const computedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
      map.set(String(p.id), { total, completed, open, overdue, computedPct });
    }
    return map;
  }, [projects, tasksByProjectId]);

  const filtered = projects.filter((p) => {
    const matchSearch = `${p.name} ${p.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" || normalizeStatus(p.status) === normalizeStatus(statusFilter);
    const matchClient = clientFilter === "all" || String(p.client_id || "") === clientFilter;
    const matchProduct = productFilter === "all" || String(p.product_id || "") === productFilter;
    const matchManager =
      managerFilter === "all" || resolveManagerProfileId(p.manager) === managerFilter;

    const stats = statsByProjectId.get(String(p.id)) || {
      total: 0,
      completed: 0,
      open: 0,
      overdue: 0,
      computedPct: 0,
    };
    const matchTasks =
      tasksFilter === "all" ||
      (tasksFilter === "no_tasks" && stats.total === 0) ||
      (tasksFilter === "overdue" && stats.overdue > 0) ||
      (tasksFilter === "in_progress" && stats.total > 0 && stats.open > 0) ||
      (tasksFilter === "completed" && stats.total > 0 && stats.open === 0);

    return matchSearch && matchStatus && matchClient && matchProduct && matchManager && matchTasks;
  });

  const clientOptions = useMemo(
    () => clients.map((c) => ({ label: c.company_name, value: c.id })),
    [clients],
  );
  const selectedClientPurchasedProductIds = useMemo(() => {
    if (!form.client_id || form.client_id === "none") return new Set<string>();
    return purchasedProductIdsByClientId.get(String(form.client_id)) || new Set<string>();
  }, [form.client_id, purchasedProductIdsByClientId]);

  const productOptions = useMemo(() => {
    const base = products.filter((p) => p.is_active !== false);
    return base.map((p) => {
      const purchased = selectedClientPurchasedProductIds.has(String(p.id));
      const labelBase = p.category ? `${p.name} · ${p.category}` : p.name;
      return { label: purchased ? `✓ ${labelBase}` : labelBase, value: p.id };
    });
  }, [products, selectedClientPurchasedProductIds]);

  const activeCompanyProfiles = useMemo(() => {
    const cid = profile?.company_id ? String(profile.company_id) : null;
    return profiles.filter((p) => {
      if (!p?.is_active) return false;
      if (!p.user_id) return false;
      if (!cid) return true;
      return String(p.company_id || "") === cid;
    });
  }, [profile?.company_id, profiles]);

  const managerOptions = useMemo(() => {
    return activeCompanyProfiles.map((p) => ({
      label: (p.full_name || p.email || p.user_id || "").toString(),
      value: String(p.id),
    }));
  }, [activeCompanyProfiles]);

  const allowedManagerProfileIds = useMemo(
    () => new Set(managerOptions.map((o) => o.value)),
    [managerOptions],
  );

  const leadOptions = useMemo(
    () => leads.map((l) => ({ label: formatLeadLabel(l), value: l.id })),
    [leads],
  );

  const dealOptions = useMemo(() => {
    const base = deals.slice();
    return base.map((d) => ({ label: `${d.name} · ${d.stage}`, value: d.id }));
  }, [deals]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!form.client_id || form.client_id === "none") return;
    if (form.manager && form.manager !== "none") return;
    const c = clientById.get(String(form.client_id));
    if (c?.account_manager) {
      setForm((p) => ({
        ...p,
        manager: resolveManagerProfileId(c.account_manager) || String(c.account_manager),
      }));
    }
  }, [clientById, dialogOpen, form.client_id, form.manager]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!form.deal_id || form.deal_id === "none") return;
    const d = dealById.get(String(form.deal_id));
    if (!d) return;
    setForm((prev) => {
      const next = { ...prev };
      if ((!next.lead_id || next.lead_id === "none") && d.lead_id) next.lead_id = String(d.lead_id);
      if ((!next.budget || Number(next.budget) === 0) && d.value != null && Number(d.value) > 0)
        next.budget = String(d.value);

      const dp = dealProductIdsByDealId.get(String(d.id)) || [];
      if ((!next.product_id || next.product_id === "none") && dp.length)
        next.product_id = String(dp[0]);
      return next;
    });
  }, [dealById, dealProductIdsByDealId, dialogOpen, form.deal_id]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!form.product_id || form.product_id === "none") return;
    setForm((prev) => {
      const next = { ...prev };
      if (next.budget && Number(next.budget) > 0) return next;
      const p = productById.get(String(prev.product_id));
      if (p?.base_price != null && Number(p.base_price) > 0) next.budget = String(p.base_price);
      return next;
    });
  }, [dialogOpen, form.product_id, productById]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can(editItem ? "projects.edit" : "projects.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    if (!profile?.company_id || !profile?.id) return;
    if (!profile?.id) {
      toast.error("No se pudo identificar tu perfil de CRM. Inicia sesión nuevamente.");
      return;
    }

    const managerProfileId = resolveManagerProfileId(form.manager);
    if (managerProfileId && !allowedManagerProfileIds.has(managerProfileId)) {
      toast.error("Selecciona un manager activo de tu compañía.");
      return;
    }
    const record: Record<string, any> = {
      company_id: profile.company_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status || "Not Started",
      priority: form.priority || "Medium",
      budget: form.budget.trim() ? Number(form.budget) || 0 : null,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      progress: Number(form.progress) || 0,
      client_id: form.client_id !== "none" ? String(form.client_id) : null,
      product_id: form.product_id !== "none" ? String(form.product_id) : null,
      deal_id: form.deal_id !== "none" ? String(form.deal_id) : null,
      lead_id: form.lead_id !== "none" ? String(form.lead_id) : null,
      manager: managerProfileId,
    };
    try {
      if (editItem) {
        await update(editItem.id, record);
        toast.success("Project updated");
        setSelected(null);
      } else {
        await create(record);
        toast.success("Project created");
      }
      setDialogOpen(false);
      setEditItem(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  async function handleMarkTaskCompleted(task: TaskRow) {
    if (!can("tasks.edit")) {
      toast.error("No tienes permiso para actualizar tareas");
      return;
    }
    if (
      isSalesAgent &&
      (profile?.user_id || user?.id) &&
      task.assigned_to &&
      String(task.assigned_to) !== String(profile?.user_id || user?.id)
    ) {
      toast.error("Solo puedes completar tareas asignadas a ti.");
      return;
    }
    const db = supabase as any;
    const { error } = await db.from("tasks").update({ status: "Completed" }).eq("id", task.id);
    if (error) {
      toast.error(error.message || "No se pudo completar la tarea");
      return;
    }
    void logActivityEvent({
      companyId: profile?.company_id ?? "",
      userId: profile?.id || null,
      action: "task_completed",
      entityType: "tasks",
      entityId: task.id,
      detail: `Tarea completada: ${task.title}`,
      metadata: { related_project_id: task.related_project_id || null },
    }).catch(() => {});
    toast.success("Tarea marcada como completada");
  }

  function openNewProject() {
    if (!can("projects.create")) {
      toast.error("No tienes permiso para crear proyectos");
      return;
    }
    setEditItem(null);
    setForm({
      name: "",
      description: "",
      status: "Not Started",
      progress: "0",
      priority: "Medium",
      budget: "",
      start_date: "",
      due_date: "",
      client_id: "none",
      product_id: "none",
      deal_id: "none",
      lead_id: "none",
      manager: "none",
    });
    setDialogOpen(true);
  }

  function openEditProject(item: Project) {
    if (!can("projects.edit")) {
      toast.error("No tienes permiso para editar proyectos");
      return;
    }
    setEditItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      status: item.status || "Not Started",
      progress: String(item.progress ?? 0),
      priority: String((item as any).priority || "Medium"),
      budget: item.budget == null ? "" : String(item.budget),
      start_date: item.start_date || "",
      due_date: item.due_date || "",
      client_id: item.client_id ? String(item.client_id) : "none",
      product_id: item.product_id ? String(item.product_id) : "none",
      deal_id: item.deal_id ? String(item.deal_id) : "none",
      lead_id: item.lead_id ? String(item.lead_id) : "none",
      manager: resolveManagerProfileId(item.manager) || "none",
    });
    setDialogOpen(true);
  }

  function openCreateTaskForProject(project: Project) {
    if (!can("tasks.create")) {
      toast.error("No tienes permiso para crear tareas");
      return;
    }
    if (
      isSalesAgent &&
      profile?.id &&
      project.manager &&
      String(project.manager) !== String(profile.id)
    ) {
      toast.error("Solo puedes crear tareas en proyectos donde eres el manager.");
      return;
    }
    const today = isoToday();
    setTaskForm({ title: "", description: "", due_date: today, priority: "Medium" });
    setTaskDialogOpen(true);
  }

  async function handleCreateTaskForSelectedProject() {
    if (!selected || !profile?.company_id || !profile?.id) return;
    if (!can("tasks.create")) {
      toast.error("No tienes permiso para crear tareas");
      return;
    }
    if (!taskForm.title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    setTaskSaving(true);
    try {
      const db = supabase as any;
      const selectedManagerProfileId = resolveManagerProfileId(selected.manager);
      const selectedManagerUserId = resolveTaskAssigneeUserId(selectedManagerProfileId);
      const payload = {
        company_id: profile.company_id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status: "To Do",
        priority: (taskForm.priority as any) || "Medium",
        assigned_to: selectedManagerUserId,
        due_date: taskForm.due_date || null,
        related_project_id: selected.id,
        related_client_id: selected.client_id || null,
        related_lead_id: selected.lead_id || null,
        related_deal_id: selected.deal_id || null,
      };
      const { error } = await db.from("tasks").insert(payload);
      if (error) {
        toast.error(error.message || "No se pudo crear la tarea");
        return;
      }
      void logActivityEvent({
        companyId: profile?.company_id ?? "",
        userId: profile.id,
        action: "task_created",
        entityType: "tasks",
        detail: `Tarea creada desde proyecto: ${taskForm.title.trim()}`,
        metadata: {
          related_project_id: selected.id,
          related_client_id: selected.client_id || null,
          related_deal_id: selected.deal_id || null,
        },
      }).catch(() => {});
      toast.success("Tarea creada");
      setTaskDialogOpen(false);
    } finally {
      setTaskSaving(false);
    }
  }

  useEffect(() => {
    const onDemoOpenProjectDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;

      if (detail?.open === false) {
        setSelected(null);
        return;
      }

      const firstProject = filtered[0] || projects[0];
      if (firstProject) {
        setSelected(firstProject);
      }
    };

    window.addEventListener("crm-demo-open-project-detail", onDemoOpenProjectDetail);
    return () =>
      window.removeEventListener("crm-demo-open-project-detail", onDemoOpenProjectDetail);
  }, [filtered, projects]);

  if (loading) return <LoadingState />;

  const selectedProductWorkflow =
    form.product_id !== "none"
      ? activeWorkflowByProductId.get(String(form.product_id)) || null
      : null;

  return (
    <div data-demo="projects-main" className="p-4 sm:p-5 space-y-4">
      <PageHeader
        title="Projects"
        subtitle={`${filtered.length} projects`}
        actionLabel={can("projects.create") ? "Add Project" : undefined}
        onAction={can("projects.create") ? openNewProject : undefined}
      />
      <DataCard>
        <div data-demo="projects-list" className="space-y-4">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search projects..."
            filters={[
              {
                key: "status",
                placeholder: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: PROJECT_STATUSES.map((s) => ({ label: s, value: s })),
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
                placeholder: "Product",
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
                placeholder: "Tasks",
                value: tasksFilter,
                onChange: (v) => setTasksFilter((v as any) || "all"),
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
              title="No projects"
              description="Create your first project."
              actionLabel="Add Project"
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-5">Project</TableHead>
                    <TableHead className="hidden lg:table-cell">Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Progress</TableHead>
                    <TableHead className="hidden xl:table-cell">Owner</TableHead>
                    <TableHead className="hidden lg:table-cell">Timeline</TableHead>
                    <TableHead className="hidden sm:table-cell text-right pr-4 sm:pr-5">
                      Budget
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, index) => (
                    <TableRow
                      data-demo={index === 0 ? "projects-first-row" : undefined}
                      key={p.id}
                      className="cursor-pointer align-top hover:bg-muted/40 transition-colors"
                      onClick={() => setSelected(p)}
                    >
                      {(() => {
                        const s = statsByProjectId.get(String(p.id)) || {
                          total: 0,
                          completed: 0,
                          open: 0,
                          overdue: 0,
                          computedPct: 0,
                        };
                        const pct = s.total > 0 ? s.computedPct : p.progress || 0;
                        const clientName = p.client_id
                          ? clientById.get(String(p.client_id))?.company_name || "Sin cliente"
                          : "Sin cliente";
                        const productName = p.product_id
                          ? productById.get(String(p.product_id))?.name || "Sin producto"
                          : "Sin producto";
                        const dealName = p.deal_id
                          ? dealById.get(String(p.deal_id))?.name || "Sin oportunidad"
                          : "Sin oportunidad";
                        const managerName = p.manager
                          ? profileById.get(String(p.manager))?.full_name ||
                            profileById.get(String(p.manager))?.email ||
                            "Sin asignar"
                          : "Sin asignar";
                        const isOverdue =
                          Boolean(p.due_date) &&
                          String(p.due_date) < isoToday() &&
                          !normalizeStatus(p.status).includes("completed") &&
                          !normalizeStatus(p.status).includes("cancelled");
                        const hasRisk = isOverdue || s.overdue > 0;

                        return (
                          <>
                            <TableCell className="pl-4 sm:pl-5">
                              <div className="flex min-w-[320px] items-start gap-3">
                                <div
                                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border font-bold shadow-[0_8px_18px_rgba(15,23,42,.06)] ${
                                    hasRisk
                                      ? "border-rose-100 bg-rose-50 text-rose-700"
                                      : "border-blue-100 bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {hasRisk ? (
                                    <AlertTriangle className="h-5 w-5" />
                                  ) : (
                                    <span className="text-xs">{projectInitials(p.name)}</span>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="truncate font-semibold">{p.name}</div>
                                    {hasRisk ? (
                                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                        Riesgo
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {clientName} · {dealName}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                    <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-slate-600">
                                      <Package className="h-3 w-3" />
                                      {productName}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-slate-600 md:hidden">
                                      <UserRound className="h-3 w-3" />
                                      {managerName}
                                    </span>
                                    {s.total ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-slate-600 xl:hidden">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {s.completed}/{s.total} tareas
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden lg:table-cell">
                              <div className="max-w-[240px]">
                                <div className="truncate text-sm font-medium">{productName}</div>
                                <div className="mt-1 truncate text-xs text-muted-foreground">
                                  Cliente: {clientName}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell data-demo={index === 0 ? "projects-status" : undefined}>
                              <div className="space-y-1.5">
                                <StatusBadge status={p.status} />
                                {(p as any).priority ? (
                                  <div
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone(
                                      String((p as any).priority),
                                    )}`}
                                  >
                                    {(p as any).priority}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell
                              data-demo={index === 0 ? "projects-progress" : undefined}
                              className="hidden md:table-cell"
                            >
                              <div className="min-w-[150px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold">{pct || 0}%</span>
                                  <span className="text-muted-foreground">
                                    {s.total ? `${s.completed}/${s.total}` : "Sin tareas"}
                                  </span>
                                </div>
                                <Progress value={pct || 0} className="mt-2 h-2" />
                                {s.overdue ? (
                                  <div className="mt-1 text-[11px] font-medium text-rose-700">
                                    {s.overdue} vencidas
                                  </div>
                                ) : s.open ? (
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    {s.open} pendientes
                                  </div>
                                ) : s.total ? (
                                  <div className="mt-1 text-[11px] font-medium text-emerald-700">
                                    Completado
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell
                              data-demo={index === 0 ? "projects-manager" : undefined}
                              className="hidden xl:table-cell"
                            >
                              <div className="flex items-center gap-2">
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                  {projectInitials(managerName)}
                                </div>
                                <div className="max-w-[160px] truncate text-sm">{managerName}</div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden lg:table-cell">
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  <span>Inicio: {formatProjectDate(p.start_date)}</span>
                                </div>
                                <div
                                  className={
                                    isOverdue
                                      ? "flex items-center gap-1.5 font-medium text-rose-700"
                                      : "flex items-center gap-1.5 text-muted-foreground"
                                  }
                                >
                                  <CircleDot className="h-3.5 w-3.5" />
                                  <span>Entrega: {formatProjectDate(p.due_date)}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden sm:table-cell pr-4 text-right sm:pr-5">
                              <div className="font-semibold">{formatMoneyCompact(p.budget)}</div>
                              <div className="text-[11px] text-muted-foreground">presupuesto</div>
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DataCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setEditItem(null);
            setProjectFormAdvancedOpen(false);
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
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Manejo de redes para Empanadas Ramon"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Usa un nombre fácil de reconocer en la lista y en las tareas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Cliente</Label>
                      <Select
                        value={form.client_id}
                        onValueChange={(v) => setForm((p) => ({ ...p, client_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin cliente</SelectItem>
                          {clientOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Producto o servicio</Label>
                      <Select
                        value={form.product_id}
                        onValueChange={(v) => setForm((p) => ({ ...p, product_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona producto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin producto</SelectItem>
                          {productOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedProductWorkflow ? (
                        <p className="text-xs text-muted-foreground">
                          Workflow disponible:{" "}
                          <span className="font-medium">{selectedProductWorkflow.name}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Responsable</Label>
                      <Select
                        value={form.manager}
                        onValueChange={(v) => setForm((p) => ({ ...p, manager: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {managerOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.client_id !== "none" &&
                      clientById.get(String(form.client_id))?.account_manager ? (
                        <p className="text-xs text-muted-foreground">
                          Sugerencia: este cliente tiene account manager.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Fecha de entrega</Label>
                      <Input
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Alcance / descripción</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      placeholder="Describe brevemente qué se va a entregar, notas importantes o acuerdos del proyecto."
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border bg-white">
                <button
                  type="button"
                  onClick={() => setProjectFormAdvancedOpen((v) => !v)}
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
                      (projectFormAdvancedOpen ? "rotate-180" : "")
                    }
                  />
                </button>

                {projectFormAdvancedOpen ? (
                  <div className="space-y-4 border-t px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Oportunidad relacionada</Label>
                        <Select
                          value={form.deal_id}
                          onValueChange={(v) => setForm((p) => ({ ...p, deal_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona oportunidad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin oportunidad</SelectItem>
                            {dealOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.client_id !== "none" ? (
                          <p className="text-xs text-muted-foreground">
                            Las oportunidades del cliente aparecen primero.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        <Label>Lead relacionado</Label>
                        <Select
                          value={form.lead_id}
                          onValueChange={(v) => setForm((p) => ({ ...p, lead_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona lead" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin lead</SelectItem>
                            {leadOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Prioridad</Label>
                        <Select
                          value={form.priority}
                          onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Presupuesto ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={form.budget}
                          onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Fecha inicio</Label>
                        <Input
                          type="date"
                          value={form.start_date}
                          onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Estado</Label>
                        <Select
                          value={form.status}
                          onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Progreso manual (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={form.progress}
                          onChange={(e) => setForm((p) => ({ ...p, progress: e.target.value }))}
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">
                          Si hay tareas, el sistema calculará el progreso real automáticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between border-t bg-white px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Estado inicial: Not Started · Progreso inicial: 0%
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setProjectFormAdvancedOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{editItem ? "Guardar cambios" : "Crear proyecto"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const projectId = deleteId;
                if (!projectId) return;
                try {
                  const { error: tasksDeleteError } = await supabase
                    .from("tasks")
                    .delete()
                    .eq("related_project_id", projectId);
                  if (tasksDeleteError) throw tasksDeleteError;
                  await remove(projectId);
                  await fetchTasks();
                  toast.success("Deleted");
                  setDeleteId(null);
                  setSelected(null);
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selected && (
        <DetailSheet
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.name}
          icon={<FolderOpen className="h-5 w-5 text-orange-600" />}
          status={selected.status}
          onEdit={can("projects.edit") ? () => openEditProject(selected) : undefined}
          onDelete={can("projects.delete") ? () => setDeleteId(selected.id) : undefined}
          fields={[
            { label: "Status", value: selected.status, type: "badge" },
            { label: "Priority", value: (selected as any).priority || "—", type: "badge" },
            { label: "Budget", value: selected.budget, type: "currency" },
            { label: "Due Date", value: selected.due_date },
            {
              label: "Manager",
              value: (() => {
                const managerId = resolveManagerProfileId(selected.manager);
                if (!managerId) return "—";
                return (
                  profileById.get(managerId)?.full_name ||
                  profileById.get(managerId)?.email ||
                  managerId
                );
              })(),
            },
            { label: "Progress", value: `${selected.progress || 0}%` },
          ]}
        >
          {(() => {
            const projectTasks = tasksByProjectId.get(String(selected.id)) || [];
            const sortedTasks = [...projectTasks].sort((a, b) => {
              const ad = a.due_date || "9999-12-31";
              const bd = b.due_date || "9999-12-31";
              return ad.localeCompare(bd);
            });
            const s = statsByProjectId.get(String(selected.id)) || {
              total: 0,
              completed: 0,
              open: 0,
              overdue: 0,
              computedPct: 0,
            };
            const pct = s.total > 0 ? s.computedPct : selected.progress || 0;
            const clientName = selected.client_id
              ? clientById.get(String(selected.client_id))?.company_name || "—"
              : "—";
            const productName = selected.product_id
              ? productById.get(String(selected.product_id))?.name || "—"
              : "—";
            const deal = selected.deal_id ? dealById.get(String(selected.deal_id)) : null;
            const dealName = deal?.name || "—";
            const lead = selected.lead_id ? leadById.get(String(selected.lead_id)) : null;
            const leadName = lead ? formatLeadLabel(lead) : "—";
            const managerId = resolveManagerProfileId(selected.manager);
            const managerName = managerId
              ? profileById.get(managerId)?.full_name ||
                profileById.get(managerId)?.email ||
                managerId
              : "—";
            const isOverdue =
              Boolean(selected.due_date) &&
              String(selected.due_date) < isoToday() &&
              isActiveProjectStatus(selected.status);

            return (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="tasks">Tareas</TabsTrigger>
                  <TabsTrigger value="delivery">Entrega</TabsTrigger>
                  <TabsTrigger value="finance">Finanzas</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Progreso real</div>
                      <div className="mt-1 text-2xl font-bold">{pct || 0}%</div>
                      <Progress value={pct || 0} className="mt-2 h-2" />
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Tareas</div>
                      <div className="mt-1 text-2xl font-bold">
                        {s.completed}/{s.total}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s.open} pendientes
                        {s.overdue ? ` · ${s.overdue} vencidas` : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Manager</div>
                      <div className="mt-1 truncate text-sm font-semibold">{managerName}</div>
                    </div>

                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Riesgo</div>
                      <div
                        className={
                          isOverdue || s.overdue
                            ? "mt-1 text-sm font-semibold text-rose-700"
                            : "mt-1 text-sm font-semibold text-emerald-700"
                        }
                      >
                        {isOverdue || s.overdue ? "Requiere atención" : "Normal"}
                      </div>
                    </div>
                  </div>

                  <div data-demo="projects-relations" className="rounded-2xl border p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Relaciones del proyecto
                    </div>

                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Cliente</div>
                          <div className="font-medium">{clientName}</div>
                        </div>
                        {selected.client_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => (window.location.href = "/clients")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Ver cliente
                          </Button>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Producto</div>
                          <div className="font-medium">{productName}</div>
                        </div>
                        {selected.product_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => (window.location.href = "/products")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Ver producto
                          </Button>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Oportunidad</div>
                          <div className="font-medium">{dealName}</div>
                          {deal ? (
                            <div className="text-xs text-muted-foreground">
                              Etapa: {deal.stage || "—"} · Valor: {formatMoneyCompact(deal.value)}
                            </div>
                          ) : null}
                        </div>
                        {selected.deal_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => (window.location.href = "/pipeline")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Ver pipeline
                          </Button>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">Lead</div>
                          <div className="font-medium">{leadName}</div>
                        </div>
                        {selected.lead_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => (window.location.href = "/leads")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Ver leads
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <div data-demo="projects-progress-detail" className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Ejecución
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {s.completed}/{s.total} completadas · {s.open} pendientes
                          {s.overdue ? (
                            <span className="ml-2 font-medium text-rose-700">
                              {s.overdue} vencidas
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-2xl font-bold">{pct || 0}%</div>
                    </div>
                    <Progress value={pct || 0} className="mt-3 h-2" />
                  </div>

                  <div data-demo="projects-tasks" className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Tareas del proyecto
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={!selected || !can("tasks.create")}
                        onClick={() => openCreateTaskForProject(selected)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Crear tarea
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {sortedTasks.length ? (
                        sortedTasks.map((t) => {
                          const taskOverdue =
                            Boolean(t.due_date) &&
                            String(t.due_date) < isoToday() &&
                            !isClosedTaskStatusValue(t.status);

                          return (
                            <div key={t.id} className="rounded-xl border bg-background/40 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{t.title}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {t.status} · {t.priority} · {t.due_date || "Sin fecha"}
                                  </div>
                                  {t.description ? (
                                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                      {t.description}
                                    </div>
                                  ) : null}
                                  {taskOverdue ? (
                                    <div className="mt-1 text-xs font-medium text-rose-700">
                                      Tarea vencida
                                    </div>
                                  ) : null}
                                </div>

                                {!isClosedTaskStatusValue(t.status) && can("tasks.edit") ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 gap-1.5 text-xs"
                                    onClick={async () => {
                                      const db = supabase as any;
                                      const { error } = await db
                                        .from("tasks")
                                        .update({ status: "Completed" })
                                        .eq("id", t.id);
                                      if (error) {
                                        toast.error(
                                          error.message || "No se pudo completar la tarea",
                                        );
                                        return;
                                      }
                                      await fetchTasks();
                                      toast.success("Tarea completada");
                                      if (profile?.company_id) {
                                        void logActivityEvent({
                                          companyId: profile.company_id,
                                          entityType: "tasks",
                                          entityId: t.id,
                                          action: "task_completed",
                                          detail: `Tarea completada: ${t.title}`,
                                        });
                                      }
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Completar
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          Este proyecto todavía no tiene tareas.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Inicio</div>
                      <div className="mt-1 font-semibold">
                        {formatProjectDate(selected.start_date)}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Entrega</div>
                      <div
                        className={
                          isOverdue ? "mt-1 font-semibold text-rose-700" : "mt-1 font-semibold"
                        }
                      >
                        {formatProjectDate(selected.due_date)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Descripción / alcance
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {selected.description || "No hay descripción registrada para este proyecto."}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Producto / servicio base
                    </div>
                    <div className="mt-2 text-sm font-medium">{productName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Cliente: {clientName}</div>
                  </div>
                </TabsContent>

                <TabsContent value="finance" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Presupuesto proyecto</div>
                      <div className="mt-1 text-2xl font-bold">
                        {formatMoneyCompact(selected.budget)}
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">Valor oportunidad</div>
                      <div className="mt-1 text-2xl font-bold">
                        {formatMoneyCompact(deal?.value)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4 text-sm">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Resumen financiero
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Proyecto</span>
                        <span className="font-medium">{formatMoneyCompact(selected.budget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Producto</span>
                        <span className="font-medium">{productName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Oportunidad</span>
                        <span className="font-medium">{dealName}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            );
          })()}
        </DetailSheet>
      )}

      <Dialog
        open={taskDialogOpen}
        onOpenChange={(o) => {
          setTaskDialogOpen(o);
          if (!o) setTaskForm({ title: "", description: "", due_date: "", priority: "Medium" });
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateTaskForSelectedProject();
            }}
          >
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
