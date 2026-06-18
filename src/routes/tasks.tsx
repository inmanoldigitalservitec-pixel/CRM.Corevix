import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  ListFilter,
  Minus,
  MoreHorizontal,
  MessageCirclePlus,
  Plus,
  User,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { DetailSheet } from "@/components/crm/detail-sheet";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
  head: () => ({ meta: [{ title: "Tasks — Corevix CRM" }] }),
});

const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const NO_PROJECT = "__no_project__";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  related_project_id: string | null;
  related_lead_id: string | null;
  related_client_id: string | null;
  order_index?: number | null;
  created_at: string;
  company_id: string;
}

type ProjectRow = {
  id: string;
  name: string;
  status?: string | null;
  due_date?: string | null;
  progress?: number | null;
  client_id: string | null;
  product_id: string | null;
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type ProductRow = { id: string; name: string };
type ProfileRow = { id: string; user_id: string | null; full_name: string | null; email: string | null; is_active?: boolean | null };
type DriveFileRow = {
  id: string;
  company_id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  web_view_link: string | null;
  web_content_link: string | null;
  thumbnail_link: string | null;
  icon_link: string | null;
  size_bytes: number | null;
  linked_type: "project" | "task" | "client" | "proposal" | "invoice";
  linked_id: string;
  created_by: string | null;
  created_at: string;
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  // `YYYY-MM-DD` should be treated as a local date (not UTC) to avoid off-by-one
  // in timezones with negative offsets.
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortDate(value: string | null | undefined) {
  return value ? value : "—";
}

function isoTodayLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateKeyLocal(value: string | null | undefined) {
  const d = parseDate(value);
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysKeyLocal(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatBytes(size: number | null | undefined) {
  if (!size || size <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function extractGoogleDriveId(rawUrl: string): { id: string; type: "file" | "folder" | "unknown" } | null {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const pathname = url.pathname || "";
  const fileMatch = pathname.match(/\/file\/d\/([^/]+)/);
  if (fileMatch?.[1]) return { id: fileMatch[1], type: "file" };

  const folderMatch = pathname.match(/\/folders\/([^/]+)/);
  if (folderMatch?.[1]) return { id: folderMatch[1], type: "folder" };

  const docsMatch = pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
  if (docsMatch?.[2]) return { id: docsMatch[2], type: "file" };

  const queryId = url.searchParams.get("id");
  if (queryId) return { id: queryId, type: "unknown" };

  return null;
}

function uploadFileWithProgress(args: {
  url: string;
  token: string;
  formData: FormData;
  onProgress: (percent: number) => void;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", args.url);
    xhr.setRequestHeader("Authorization", `Bearer ${args.token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      args.onProgress(percent);
    };

    xhr.onerror = () => reject(new Error("No se pudo subir el archivo a Google Drive"));
    xhr.onload = () => {
      let payload: any = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(payload?.error || "No se pudo subir el archivo a Google Drive"));
        return;
      }
      resolve(payload);
    };

    xhr.send(args.formData);
  });
}

function sortTaskRows(a: Task, b: Task) {
  const rank = (status: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "to do" || s === "todo") return 1;
    if (s === "in progress" || s === "in_progress") return 2;
    if (s === "waiting") return 3;
    if (s === "completed") return 8;
    if (s === "cancelled" || s === "canceled") return 9;
    return 5;
  };

  const sA = rank(a.status);
  const sB = rank(b.status);
  if (sA !== sB) return sA - sB;
  const oA = typeof a.order_index === "number" ? a.order_index : null;
  const oB = typeof b.order_index === "number" ? b.order_index : null;
  if (oA != null && oB != null && oA !== oB) return oA - oB;
  if (oA != null && oB == null) return -1;
  if (oA == null && oB != null) return 1;
  const dA = parseDate(a.due_date);
  const dB = parseDate(b.due_date);
  if (dA && dB) return dA.getTime() - dB.getTime();
  if (dA && !dB) return -1;
  if (!dA && dB) return 1;
  return a.title.localeCompare(b.title);
}

function TasksPage() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "overdue" | "week" | "unassigned" | "mine">("all");
  const [expandedProjectId, setExpandedProjectId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [presetProjectId, setPresetProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: tasks, loading, create, update, remove } = useCrud<Task>({ table: "tasks" });
  const { data: projects } = useCrud<ProjectRow>({
    table: "projects",
    select: "id, name, status, due_date, progress, client_id, product_id",
    orderBy: "updated_at",
    ascending: false,
    limit: 500,
  });
  const { data: clients } = useCrud<ClientRow>({ table: "clients", select: "id, company_name, contact_person", orderBy: "company_name", ascending: true, limit: 500 });
  const { data: products } = useCrud<ProductRow>({ table: "products", select: "id, name", orderBy: "name", ascending: true, limit: 500 });
  const { data: profiles } = useCrud<ProfileRow>({ table: "profiles", select: "id, user_id, full_name, email, is_active", orderBy: "full_name", ascending: true, limit: 500 });
  const { data: taskDriveFilesIndex } = useCrud<Pick<DriveFileRow, "id" | "linked_id" | "linked_type"> & { linked_type: "task"; linked_id: string }>({
    table: "drive_files",
    select: "id,linked_id,linked_type",
    orderBy: "created_at",
    ascending: false,
    limit: 400,
    enabled: tasks.length > 0,
    filters: [{ column: "linked_type", op: "eq", value: "task" }],
  });
  const {
    data: driveFiles,
    loading: driveFilesLoading,
    fetch: fetchDriveFiles,
  } = useCrud<DriveFileRow>({
    table: "drive_files",
    select: "id,company_id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,linked_type,linked_id,created_by,created_at",
    orderBy: "created_at",
    ascending: false,
    limit: 200,
    enabled: !!selectedTask?.id,
    filters: [
      { column: "linked_type", op: "eq", value: "task" },
      { column: "linked_id", op: "eq", value: selectedTask?.id || null },
    ],
  });

  const projectsById = useMemo(() => {
    const m = new Map<string, ProjectRow>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const clientsById = useMemo(() => {
    const m = new Map<string, ClientRow>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const productsById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const assigneesByAnyId = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    for (const pr of profiles) {
      if (pr.id) m.set(pr.id, pr);
      if (pr.user_id) m.set(pr.user_id, pr);
    }
    return m;
  }, [profiles]);

  const projectOptions = useMemo(() => {
    const opts = projects
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ label: p.name, value: p.id }));
    return [{ label: "Todos", value: "all" }, ...opts, { label: "Sin proyecto", value: NO_PROJECT }];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayKey = isoTodayLocal();
    const weekKey = addDaysKeyLocal(7);
    const myAnyId = new Set<string>([String(user?.id || ""), String(profile?.user_id || ""), String(profile?.id || "")].filter(Boolean));

    return tasks.filter((t) => {
      const projectId = t.related_project_id || NO_PROJECT;
      const p = t.related_project_id ? projectsById.get(t.related_project_id) : null;
      const projectName = p?.name || "";
      const matchSearch = !q || `${t.title} ${t.description || ""} ${projectName}`.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchProject =
        projectFilter === "all" ||
        (projectFilter === NO_PROJECT ? projectId === NO_PROJECT : t.related_project_id === projectFilter);

      const dueKey = toDateKeyLocal(t.due_date);
      const isActive = !["Completed", "Cancelled"].includes(String(t.status || ""));
      const matchQuick =
        quickFilter === "all" ||
        (quickFilter === "today" && isActive && !!dueKey && dueKey === todayKey) ||
        (quickFilter === "overdue" && isActive && !!dueKey && dueKey < todayKey) ||
        (quickFilter === "week" && isActive && !!dueKey && dueKey >= todayKey && dueKey <= weekKey) ||
        (quickFilter === "unassigned" && isActive && !t.assigned_to) ||
        (quickFilter === "mine" && isActive && !!t.assigned_to && myAnyId.has(String(t.assigned_to)));

      return matchSearch && matchStatus && matchPriority && matchProject && matchQuick;
    });
  }, [tasks, search, statusFilter, priorityFilter, projectFilter, projectsById, profile?.id, profile?.user_id, quickFilter, user?.id]);

  const filteredTaskIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const filteredTaskIdSet = useMemo(() => new Set(filteredTaskIds), [filteredTaskIds]);
  const selectedTaskIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected = filteredTaskIds.length > 0 && filteredTaskIds.every((id) => selectedTaskIdSet.has(id));
  const someVisibleSelected = filteredTaskIds.some((id) => selectedTaskIdSet.has(id));
  const selectedVisibleCount = filteredTaskIds.filter((id) => selectedTaskIdSet.has(id)).length;
  const canDeleteTasks = can("tasks.delete");

  const kpis = useMemo(() => {
    const todayKey = isoTodayLocal();
    const activeProjects = projects.filter((p) => !["Completed", "Cancelled"].includes(String(p.status || ""))).length;

    const completed = tasks.filter((t) => String(t.status || "") === "Completed").length;
    const inProgress = tasks.filter((t) => String(t.status || "") === "In Progress").length;
    const active = tasks.filter((t) => !["Completed", "Cancelled"].includes(String(t.status || "")));
    const unassigned = active.filter((t) => !t.assigned_to).length;
    const dueToday = active.filter((t) => {
      const key = toDateKeyLocal(t.due_date);
      return !!key && key === todayKey;
    }).length;
    const overdue = active.filter((t) => {
      const key = toDateKeyLocal(t.due_date);
      return !!key && key < todayKey;
    }).length;

    return { total: tasks.length, overdue, dueToday, inProgress, unassigned, completed, activeProjects };
  }, [profile?.id, profile?.user_id, projects, tasks, user?.id]);

  const driveFileCountByTaskId = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of taskDriveFilesIndex) {
      if (!f?.linked_id) continue;
      const id = String(f.linked_id);
      m.set(id, (m.get(id) || 0) + 1);
    }
    return m;
  }, [taskDriveFilesIndex]);

  const statusOrder = (status: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "to do" || s === "todo") return 1;
    if (s === "in progress" || s === "in_progress") return 2;
    if (s === "waiting") return 3;
    if (s === "completed") return 8;
    if (s === "cancelled" || s === "canceled") return 9;
    return 5;
  };

  const setQuick = (next: typeof quickFilter) => {
    setQuickFilter(next);
  };

  const updateTaskStatusInline = async (task: Task, nextStatus: string) => {
    if (!can("tasks.edit")) {
      toast.error("No tienes permiso para editar tareas.");
      return;
    }
    try {
      await update(task.id, { status: nextStatus } as Partial<Task>);
      if (selectedTask?.id === task.id) setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      toast.success("Estado actualizado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar la tarea.");
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedIds((current) => (current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]));
  };

  const toggleSelectVisibleTasks = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !filteredTaskIdSet.has(id));
      }
      return Array.from(new Set([...current, ...filteredTaskIds]));
    });
  };

  const clearTaskSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!canDeleteTasks) {
      toast.error("No tienes permiso para eliminar tareas.");
      return;
    }
    const idsToDelete = tasks.filter((task) => selectedTaskIdSet.has(task.id)).map((task) => task.id);
    if (!idsToDelete.length) {
      toast.info("No hay tareas seleccionadas.");
      return;
    }

    setBulkDeleteSaving(true);
    try {
      const results = await Promise.allSettled(idsToDelete.map(async (id) => {
        await remove(id);
        return id;
      }));
      const deletedIds = results.flatMap((result, index) => (result.status === "fulfilled" ? [idsToDelete[index]] : []));
      const failedCount = results.length - deletedIds.length;

      if (deletedIds.length) {
        setSelectedIds((current) => current.filter((id) => !deletedIds.includes(id)));
        if (selectedTask && deletedIds.includes(selectedTask.id)) {
          setSelectedTask(null);
        }
      }

      setBulkDeleteOpen(false);
      if (failedCount > 0) {
        toast.error(`Se eliminaron ${deletedIds.length} tareas, pero ${failedCount} no se pudieron borrar.`);
      } else {
        toast.success(`Se eliminaron ${deletedIds.length} tareas.`);
      }
    } catch (error: any) {
      toast.error(error?.message || "No se pudieron eliminar las tareas seleccionadas.");
    } finally {
      setBulkDeleteSaving(false);
    }
  };

  const standaloneTasks = useMemo(() => {
    return filtered.filter((t) => !t.related_project_id).slice().sort(sortTaskRows);
  }, [filtered]);

  const projectGroups = useMemo(() => {
    const todayKey = isoTodayLocal();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const groups = new Map<string, Task[]>();
    for (const t of filtered) {
      if (!t.related_project_id) continue;
      const key = t.related_project_id;
      const list = groups.get(key) || [];
      list.push(t);
      groups.set(key, list);
    }

    const result = Array.from(groups.entries()).map(([projectId, groupTasks]) => {
      const project = projectsById.get(projectId) || null;
      const client = project?.client_id ? clientsById.get(project.client_id) : null;
      const product = project?.product_id ? productsById.get(project.product_id) : null;

      const total = groupTasks.length;
      const todo = groupTasks.filter((t) => statusOrder(t.status) === 1).length;
      const inProgress = groupTasks.filter((t) => statusOrder(t.status) === 2).length;
      const completed = groupTasks.filter((t) => String(t.status || "").toLowerCase() === "completed").length;
      const active = groupTasks.filter((t) => statusOrder(t.status) < 8).length;

      const overdue = groupTasks.filter((t) => {
        if (statusOrder(t.status) >= 8) return false;
        const key = toDateKeyLocal(t.due_date);
        return !!key && key < todayKey;
      }).length;
      const dueToday = groupTasks.filter((t) => {
        if (statusOrder(t.status) >= 8) return false;
        const key = toDateKeyLocal(t.due_date);
        return !!key && key === todayKey;
      }).length;

      const nextDue = groupTasks
        .filter((t) => statusOrder(t.status) < 8)
        .map((t) => parseDate(t.due_date))
        .filter(Boolean)
        .sort((a, b) => (a!.getTime() - b!.getTime()))[0] as Date | undefined;

      const progress = total ? Math.round((completed / total) * 100) : 0;

      const nextDueKey = nextDue ? `${nextDue.getFullYear()}-${String(nextDue.getMonth() + 1).padStart(2, "0")}-${String(nextDue.getDate()).padStart(2, "0")}` : "";
      const dueBucket = (() => {
        if (!active) return 9; // completed/cancelled only
        if (!nextDueKey) return 8; // active but no due date
        if (nextDueKey < todayKey) return 0; // overdue
        if (nextDueKey === todayKey) return 1; // due today
        if (nextDueKey === tomorrowKey) return 2; // due tomorrow
        return 3; // future
      })();

      const sortedTasks = groupTasks.slice().sort(sortTaskRows);

      return {
        projectId,
        projectName: project ? project.name : "",
        projectStatus: project?.status || "",
        projectProgress: typeof project?.progress === "number" ? project.progress : null,
        projectDueDate: project?.due_date || "",
        clientLabel: client ? (client.contact_person ? `${client.company_name} · ${client.contact_person}` : client.company_name) : "",
        productLabel: product?.name || "",
        total,
        todo,
        inProgress,
        completed,
        active,
        overdue,
        dueToday,
        nextDue: nextDueKey,
        dueBucket,
        isDueToday: !!nextDueKey && nextDueKey === todayKey,
        isOverdue: !!nextDueKey && nextDueKey < todayKey,
        progress,
        tasks: sortedTasks,
      };
    });

    result.sort((a, b) => {
      const aActive = a.active > 0 ? 0 : 1;
      const bActive = b.active > 0 ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      if (a.dueBucket !== b.dueBucket) return a.dueBucket - b.dueBucket;
      const aDue = a.nextDue ? a.nextDue : "9999-12-31";
      const bDue = b.nextDue ? b.nextDue : "9999-12-31";
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.projectName.localeCompare(b.projectName);
    });

    return result;
  }, [filtered, projectsById, clientsById, productsById]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can(editTask ? "tasks.edit" : "tasks.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || null,
      status: (fd.get("status") as string) || "To Do",
      priority: (fd.get("priority") as string) || "Medium",
      due_date: (fd.get("due_date") as string) || null,
      related_project_id: (fd.get("related_project_id") as string) === "no-project" ? null : ((fd.get("related_project_id") as string) || null),
    };
    try {
      if (editTask) { await update(editTask.id, data); toast.success("Task updated"); setSelectedTask(null); }
      else { await create(data); toast.success("Task created"); }
      setDialogOpen(false); setEditTask(null);
      setPresetProjectId(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!can("tasks.delete")) {
      toast.error("No tienes permiso para eliminar");
      return;
    }
    try {
      await remove(deleteId);
      toast.success("Task deleted");
      setDeleteId(null);
      setSelectedTask(null);
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateSelectedTaskStatus = async (nextStatus: string) => {
    if (!selectedTask) return;
    if (!can("tasks.edit")) {
      toast.error("No tienes permiso para editar tareas.");
      return;
    }
    try {
      await update(selectedTask.id, { status: nextStatus } as Partial<Task>);
      setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      toast.success("Estado actualizado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar el estado.");
    }
  };

  const openDriveAttachmentPicker = () => {
    if (!selectedTask?.id || !selectedTask.company_id) {
      toast.error("Selecciona una tarea primero.");
      return;
    }

    const tryAttach = async (rawUrl: string) => {
      const parsed = extractGoogleDriveId(rawUrl);
      if (!parsed) {
        toast.error("URL de Google Drive no valida.");
        return;
      }
      const isFolder = parsed.type === "folder";
      const name = isFolder ? "Carpeta de Google Drive" : "Archivo de Google Drive";
      const mimeType = isFolder ? "application/vnd.google-apps.folder" : null;
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData.session?.user?.id || profile?.user_id || null;

      const { error } = await (supabase as any).from("drive_files").insert({
        company_id: selectedTask.company_id,
        drive_file_id: parsed.id,
        name,
        mime_type: mimeType,
        web_view_link: rawUrl,
        web_content_link: null,
        thumbnail_link: null,
        icon_link: null,
        size_bytes: null,
        linked_type: "task",
        linked_id: selectedTask.id,
        created_by: authUserId,
      });

      if (error) {
        toast.error(error.message || "No se pudo adjuntar el enlace de Drive.");
        return;
      }
      await fetchDriveFiles();
      toast.success("Archivo de Drive adjuntado.");
    };

    const run = async () => {
      try {
        const clip = await navigator.clipboard.readText();
        const maybe = extractGoogleDriveId(clip);
        if (maybe) {
          await tryAttach(clip);
          return;
        }
      } catch {
        // Clipboard can fail due to browser permissions; fallback to manual input.
      }
      const manual = window.prompt("Pega aqui la URL de Google Drive:");
      if (!manual) return;
      await tryAttach(manual);
    };

    void run();
  };

  const handleUploadClick = () => {
    if (!selectedTask?.id) {
      toast.error("Selecciona una tarea primero.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!selectedTask?.id || !profile?.company_id) {
      toast.error("No se pudo identificar la tarea o compañía.");
      return;
    }

    try {
      setIsUploadingFile(true);
      setUploadProgress(0);
      setUploadingFileName(file.name);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("No estás autenticado.");
        return;
      }

      const body = new FormData();
      body.append("task_id", selectedTask.id);
      body.append("file", file);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const result = await uploadFileWithProgress({
        url: `${supabaseUrl}/functions/v1/drive-upload-file`,
        token: accessToken,
        formData: body,
        onProgress: (percent) => setUploadProgress(percent),
      });
      if (result?.error) throw new Error(String(result.error));

      setUploadProgress(100);
      await fetchDriveFiles();
      toast.success("Archivo subido a Google Drive.");
    } catch (error: any) {
      console.error("drive-upload-file error:", error);
      toast.error(error?.message || "No se pudo subir el archivo a Google Drive");
    } finally {
      setTimeout(() => {
        setIsUploadingFile(false);
        setUploadProgress(0);
        setUploadingFileName("");
      }, 350);
    }
  };

  const copyFileLink = async (file: DriveFileRow) => {
    const url = file.web_view_link || file.web_content_link;
    if (!url) {
      toast.info("Este archivo aún no tiene enlace de Google Drive.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  if (loading) return <LoadingState />;

  const selectedProject = selectedTask?.related_project_id ? projectsById.get(selectedTask.related_project_id) || null : null;
  const selectedClientId = selectedTask?.related_client_id || selectedProject?.client_id || null;
  const selectedClient = selectedClientId ? clientsById.get(selectedClientId) || null : null;
  const selectedProduct = selectedProject?.product_id ? productsById.get(selectedProject.product_id) || null : null;
  const selectedAssignee = selectedTask?.assigned_to ? assigneesByAnyId.get(selectedTask.assigned_to) || null : null;
  const selectedAssigneeLabel = selectedAssignee
    ? String(selectedAssignee.full_name || selectedAssignee.email || "").trim() || "Sin asignar"
    : "Sin asignar";
  const selectedCreated = selectedTask?.created_at ? new Date(selectedTask.created_at).toLocaleDateString() : "—";

  const renderTaskActions = (t: Task) => (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 px-2"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedTask(t);
        }}
      >
        Abrir
      </Button>
      {String(t.status || "") !== "Completed" ? (
        <Button
          type="button"
          size="sm"
          className="h-8 px-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void updateTaskStatusInline(t, "Completed");
          }}
        >
          Completar
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label="Más acciones"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void updateTaskStatusInline(t, "In Progress")} disabled={String(t.status || "") === "In Progress"}>
            Marcar en progreso
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {can("tasks.edit") ? (
            <DropdownMenuItem
              onSelect={() => {
                setEditTask(t);
                setPresetProjectId(null);
                setDialogOpen(true);
              }}
            >
              Editar
            </DropdownMenuItem>
          ) : null}
          {can("tasks.delete") ? (
            <DropdownMenuItem className="text-destructive" onSelect={() => setDeleteId(t.id)}>
              Eliminar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderStandaloneTaskCard = (t: Task) => {
    const assignee = t.assigned_to ? assigneesByAnyId.get(t.assigned_to) : null;
    const assigneeLabel = assignee ? String(assignee.full_name || assignee.email || "").trim() || "—" : "—";
    const dueKey = toDateKeyLocal(t.due_date);
    const todayKey = isoTodayLocal();
    const isActive = !["Completed", "Cancelled"].includes(String(t.status || ""));
    const isOverdue = isActive && !!dueKey && dueKey < todayKey;
    const isDueToday = isActive && !!dueKey && dueKey === todayKey;
    const filesCount = driveFileCountByTaskId.get(String(t.id)) || 0;

    return (
      <div
        key={t.id}
        className={
          "group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)] cursor-pointer " +
          (isOverdue ? "ring-1 ring-[#fecaca] bg-[#fffafa]" : isDueToday ? "ring-1 ring-amber-200 bg-amber-50/30" : "") +
          (selectedTaskIdSet.has(t.id) ? " ring-1 ring-[#1d62f9] bg-[#f4f8ff]" : "")
        }
        onClick={() => setSelectedTask(t)}
      >
        <div className="flex items-start gap-3 lg:gap-4">
          {canDeleteTasks ? (
            <div className="mt-1 shrink-0" onClick={(event) => event.stopPropagation()}>
              <Checkbox
                type="button"
                checked={selectedTaskIdSet.has(t.id)}
                onCheckedChange={() => toggleTaskSelection(t.id)}
                aria-label={selectedTaskIdSet.has(t.id) ? "Deseleccionar tarea" : "Seleccionar tarea"}
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 text-base font-semibold tracking-[-0.01em] text-slate-900">{t.title}</div>
              {isOverdue ? (
                <span className="inline-flex rounded-full border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-[#b91c1c]">
                  Atrasada
                </span>
              ) : isDueToday ? (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Hoy
                </span>
              ) : null}
              <StatusBadge status={t.priority} />
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {t.description || "Sin descripción."}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium">
                {t.assigned_to ? assigneeLabel : "Sin asignar"}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium">
                Vence: {formatShortDate(t.due_date)}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium">
                Archivos: {filesCount || "—"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">{renderTaskActions(t)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Tasks"
        subtitle="Organiza la producción por proyecto y prioridad."
        actionLabel={can("tasks.create") ? "Add Task" : undefined}
        onAction={() => {
          setEditTask(null);
          setPresetProjectId(null);
          setDialogOpen(true);
        }}
      >
        <span className="inline-flex h-9 items-center rounded-full border bg-background px-3 text-[12px] font-semibold text-foreground">
          {kpis.total} tareas
        </span>
      </PageHeader>
      <DataCard>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <div className={"rounded-xl border p-3 text-left transition-colors cursor-default " + (quickFilter === "overdue" ? "border-[#fecaca] bg-[#fef2f2]" : "bg-background")}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={"h-4 w-4 " + (kpis.overdue ? "text-[#e11d48]" : "text-muted-foreground")} />
                <span className="text-[12px] font-bold text-muted-foreground">Atrasadas</span>
              </div>
              <div className="mt-1 text-[18px] font-semibold">{kpis.overdue}</div>
            </div>
            <div className={"rounded-xl border p-3 text-left transition-colors cursor-default " + (quickFilter === "today" ? "border-amber-200 bg-amber-50" : "bg-background")}>
              <div className="flex items-center gap-2">
                <CalendarClock className={"h-4 w-4 " + (kpis.dueToday ? "text-amber-700" : "text-muted-foreground")} />
                <span className="text-[12px] font-bold text-muted-foreground">Para hoy</span>
              </div>
              <div className="mt-1 text-[18px] font-semibold">{kpis.dueToday}</div>
            </div>
            <div className={"rounded-xl border p-3 text-left transition-colors cursor-default " + (statusFilter === "In Progress" ? "border-blue-200 bg-blue-50" : "bg-background")}>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-bold text-muted-foreground">En progreso</span>
              </div>
              <div className="mt-1 text-[18px] font-semibold">{kpis.inProgress}</div>
            </div>
            <div className={"rounded-xl border p-3 text-left transition-colors cursor-default " + (statusFilter === "Completed" ? "border-emerald-200 bg-emerald-50" : "bg-background")}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-bold text-muted-foreground">Completadas</span>
              </div>
              <div className="mt-1 text-[18px] font-semibold">{kpis.completed}</div>
            </div>
            <div className={"rounded-xl border p-3 text-left transition-colors cursor-default " + (quickFilter === "unassigned" ? "border-slate-200 bg-slate-50" : "bg-background")}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-bold text-muted-foreground">Sin asignar</span>
              </div>
              <div className="mt-1 text-[18px] font-semibold">{kpis.unassigned}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-bold text-muted-foreground">Proyectos activos</span>
              </div>
              <div className="mt-1 text-[18px] font-semibold">{kpis.activeProjects}</div>
            </div>
          </div>

          <SearchFilters searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search tasks..."
            filters={[
              { key: "status", placeholder: "Status", value: statusFilter, onChange: setStatusFilter, options: TASK_STATUSES.map(s => ({ label: s, value: s })) },
              { key: "priority", placeholder: "Priority", value: priorityFilter, onChange: setPriorityFilter, options: PRIORITIES.map(s => ({ label: s, value: s })) },
              { key: "project", placeholder: "Project", value: projectFilter, onChange: setProjectFilter, options: projectOptions.filter((o) => o.value !== "all") },
            ]} />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-muted-foreground">Vista rápida:</span>
            <Button type="button" variant={quickFilter === "all" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setQuick("all")}>
              Todas
            </Button>
            <Button type="button" variant={quickFilter === "today" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setQuick("today")}>
              Hoy
            </Button>
            <Button type="button" variant={quickFilter === "overdue" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setQuick("overdue")}>
              Atrasadas
            </Button>
            <Button type="button" variant={quickFilter === "week" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setQuick("week")}>
              Esta semana
            </Button>
            <Button type="button" variant={quickFilter === "unassigned" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setQuick("unassigned")}>
              Sin asignar
            </Button>
            <Button type="button" variant={quickFilter === "mine" ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setQuick("mine")}>
              Mis tareas
            </Button>
          </div>

          {canDeleteTasks ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                onClick={toggleSelectVisibleTasks}
              >
                <span className="grid h-5 w-5 place-items-center rounded-[6px] border border-slate-300 bg-white text-slate-600">
                  {allVisibleSelected ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : someVisibleSelected ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <CheckSquare className="h-4 w-4 opacity-40" />
                  )}
                </span>
                {allVisibleSelected ? "Limpiar visibles" : "Seleccionar visibles"}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {selectedVisibleCount}/{filteredTaskIds.length} visibles · {selectedIds.length} seleccionadas
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-slate-200"
                  onClick={clearTaskSelection}
                  disabled={!selectedIds.length}
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={!selectedIds.length}
                >
                  Eliminar seleccionadas
                </Button>
              </div>
            </div>
          ) : null}

          {tasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-6 w-6" />}
              title="No hay tareas todavía."
              description="Cuando una factura se marque como pagada, el workflow del producto creará tareas automáticamente."
              actionLabel={can("tasks.create") ? "Add Task" : undefined}
              onAction={() => setDialogOpen(true)}
            />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No hay tareas con este filtro.
            </div>
          ) : (
            <div className="space-y-5">
              {standaloneTasks.length > 0 ? (
                <div className="space-y-3">
                  {standaloneTasks.map((t) => renderStandaloneTaskCard(t))}
                </div>
              ) : null}

              {projectGroups.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <Accordion
                    type="single"
                    collapsible
                    value={expandedProjectId}
                    onValueChange={(v) => setExpandedProjectId(v)}
                  >
                    {projectGroups.map((g) => (
                      <AccordionItem key={g.projectId} value={g.projectId} className="border-b border-slate-100 last:border-b-0">
                        <AccordionTrigger className="group w-full items-start gap-3 rounded-none border-0 bg-white px-4 py-4 text-left no-underline hover:bg-slate-50 hover:no-underline data-[state=open]:bg-slate-50">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="font-semibold text-[14px] truncate text-slate-900">{g.projectName}</div>
                                  {g.isOverdue ? (
                                    <span className="shrink-0 inline-flex items-center rounded-full border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[10px] font-extrabold text-[#b91c1c]">
                                      Vencido
                                    </span>
                                  ) : g.isDueToday ? (
                                    <span className="shrink-0 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                      Vence hoy
                                    </span>
                                  ) : null}
                                  {g.projectStatus ? (
                                    <span className="shrink-0 hidden sm:inline-flex">
                                      <StatusBadge status={g.projectStatus} />
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-[12px] text-slate-500 truncate">
                                  {g.clientLabel ? <span>{g.clientLabel}</span> : <span>Sin cliente</span>}
                                  {g.productLabel ? <span className="text-slate-400"> · {g.productLabel}</span> : null}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <Link
                                  to={"/projects" as any}
                                  className="hidden sm:inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Ver proyecto
                                </Link>
                                {can("tasks.create") ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 border-slate-200 bg-white"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPresetProjectId(g.projectId);
                                      setEditTask(null);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                                {g.total} tareas
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                                {g.inProgress} en progreso
                              </span>
                              <span className={"inline-flex items-center rounded-full border px-2 py-0.5 font-semibold " + (g.overdue ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]" : "border-slate-200 bg-slate-50")}>
                                {g.overdue} atrasadas
                              </span>
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                                {g.progress}% completado
                              </span>
                              {g.nextDue ? (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                                  próxima: {g.nextDue}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                              <Progress value={g.progress || 0} className="h-2 w-full" />
                              <span className="shrink-0 text-[12px] font-semibold text-slate-500">
                                {g.progress || 0}%
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-0">
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {canDeleteTasks ? <TableHead className="w-[42px] pl-4 pr-0" /> : null}
                                  <TableHead className="pl-4">Tarea</TableHead>
                                  <TableHead className="hidden md:table-cell">Responsable</TableHead>
                                  <TableHead>Priority</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Vence</TableHead>
                                  <TableHead className="hidden lg:table-cell">Archivos</TableHead>
                                  <TableHead className="pr-4 text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {g.tasks.map((t) => {
                                  const assignee = t.assigned_to ? assigneesByAnyId.get(t.assigned_to) : null;
                                  const assigneeLabel = assignee ? String(assignee.full_name || assignee.email || "").trim() || "—" : "—";
                                  const dueKey = toDateKeyLocal(t.due_date);
                                  const todayKey = isoTodayLocal();
                                  const isActive = !["Completed", "Cancelled"].includes(String(t.status || ""));
                                  const isOverdue = isActive && !!dueKey && dueKey < todayKey;
                                  const isDueToday = isActive && !!dueKey && dueKey === todayKey;
                                  const filesCount = driveFileCountByTaskId.get(String(t.id)) || 0;
                                  return (
                                    <TableRow
                                      key={t.id}
                                      className={
                                        "cursor-pointer hover:bg-slate-50 transition-colors " +
                                        (selectedTaskIdSet.has(t.id) ? "bg-[#f4f8ff]" : "") +
                                        (isOverdue ? "border-l-2 border-l-[#e11d48] bg-[#fff1f3]/40" : isDueToday ? "border-l-2 border-l-amber-400 bg-amber-50/30" : "")
                                      }
                                      onClick={() => setSelectedTask(t)}
                                    >
                                      {canDeleteTasks ? (
                                        <TableCell className="pl-4 pr-0" onClick={(event) => event.stopPropagation()}>
                                          <Checkbox
                                            type="button"
                                            checked={selectedTaskIdSet.has(t.id)}
                                            onCheckedChange={() => toggleTaskSelection(t.id)}
                                            aria-label={selectedTaskIdSet.has(t.id) ? "Deseleccionar tarea" : "Seleccionar tarea"}
                                          />
                                        </TableCell>
                                      ) : null}
                                      <TableCell className="pl-4">
                                        <div className="min-w-0">
                                          <div className="font-semibold truncate text-slate-900">{t.title}</div>
                                          {t.description ? <div className="mt-0.5 text-[12px] text-slate-500 truncate">{t.description}</div> : null}
                                        </div>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell text-slate-500 truncate max-w-[220px]">
                                        {t.assigned_to ? assigneeLabel : <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Sin asignar</span>}
                                      </TableCell>
                                      <TableCell><StatusBadge status={t.priority} /></TableCell>
                                      <TableCell><StatusBadge status={t.status} /></TableCell>
                                      <TableCell className="text-slate-500 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span>{formatShortDate(t.due_date)}</span>
                                          {isOverdue ? (
                                            <span className="inline-flex rounded-full border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-[#b91c1c]">
                                              Atrasada
                                            </span>
                                          ) : isDueToday ? (
                                            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                              Hoy
                                            </span>
                                          ) : null}
                                        </div>
                                      </TableCell>
                                      <TableCell className="hidden lg:table-cell text-slate-500 text-sm">
                                        {filesCount ? (
                                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold">
                                            {filesCount}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="pr-4 text-right">{renderTaskActions(t)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DataCard>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tareas seleccionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar {selectedIds.length} tarea{selectedIds.length === 1 ? "" : "s"}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleBulkDelete();
              }}
              disabled={bulkDeleteSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteSaving ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTask(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input name="title" defaultValue={editTask?.title} required />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea name="description" defaultValue={editTask?.description || ""} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select name="related_project_id" defaultValue={editTask?.related_project_id || presetProjectId || "no-project"}>
                <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-project">Sin proyecto</SelectItem>
                  {projects
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Status</Label>
                <Select name="status" defaultValue={editTask?.status || "To Do"}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Priority</Label>
                <Select name="priority" defaultValue={editTask?.priority || "Medium"}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input name="due_date" type="date" defaultValue={editTask?.due_date || ""} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditTask(null); }}>Cancel</Button>
              <Button type="submit">{editTask ? "Save" : "Create Task"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Task</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedTask && (
        <DetailSheet open={!!selectedTask} onClose={() => setSelectedTask(null)}
          title={selectedTask.title} status={selectedTask.status}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {can("tasks.edit") ? (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setEditTask(selectedTask); setDialogOpen(true); }}>
                  Edit
                </Button>
              ) : null}
              {can("tasks.delete") ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(selectedTask.id)}
                >
                  Delete
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => void updateSelectedTaskStatus("In Progress")}
                disabled={selectedTask.status === "In Progress"}
              >
                Marcar en progreso
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={() => void updateSelectedTaskStatus("Completed")}
                disabled={selectedTask.status === "Completed"}
              >
                Marcar completada
              </Button>
            </div>
          }
          fields={[
            { label: "Priority", value: selectedTask.priority, type: "badge" },
            { label: "Status", value: selectedTask.status, type: "badge" },
            { label: "Due Date", value: selectedTask.due_date },
            { label: "Assigned to", value: selectedAssigneeLabel },
            { label: "Project", value: selectedProject?.name || "Sin proyecto" },
            { label: "Client", value: selectedClient?.company_name || "Sin cliente" },
            { label: "Created", value: selectedCreated },
          ]}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Contexto</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proyecto</p>
                  <p className="mt-1 text-sm font-medium">{selectedProject?.name || "Sin proyecto"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="mt-1 text-sm font-medium">{selectedClient?.company_name || "Sin cliente"}</p>
                </div>
                <div className="rounded-lg border p-3 sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servicio / Producto</p>
                  <p className="mt-1 text-sm font-medium">{selectedProduct?.name || "Sin servicio relacionado"}</p>
                </div>
              </div>
              {selectedTask.related_project_id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => window.open("/projects", "_blank", "noopener,noreferrer")}
                >
                  Ver proyecto
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Descripcion</h3>
              <div className="rounded-lg border p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedTask.description || "Sin descripcion."}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Archivos de la tarea</h3>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFilePicked}
                />
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleUploadClick}>
                  <FileUp className="h-3.5 w-3.5 mr-1" />
                  {isUploadingFile ? "Subiendo..." : "Subir archivo"}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={openDriveAttachmentPicker}>
                  Adjuntar desde Drive
                </Button>
              </div>
            </div>
            {isUploadingFile ? (
              <div className="rounded-lg border p-3">
                <div className="text-xs font-medium truncate">Archivo: {uploadingFileName || "Archivo"}</div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Subiendo archivo... {uploadProgress}%
                </div>
              </div>
            ) : null}

            {driveFilesLoading ? (
              <p className="text-xs text-muted-foreground">Cargando archivos...</p>
            ) : driveFiles.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Esta tarea todavia no tiene archivos.
              </div>
            ) : (
              <div className="space-y-2">
                {driveFiles.map((file) => {
                  const hasView = !!file.web_view_link;
                  const hasDownload = !!file.web_content_link;
                  const isPendingDrive = file.drive_file_id.startsWith("pending_");
                  return (
                    <div key={file.id} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        {isPendingDrive ? (
                          <span className="inline-flex h-6 items-center rounded-full border border-amber-200 bg-amber-50 px-2 text-[10px] font-medium text-amber-700">
                            Pendiente de Drive
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {(file.mime_type || "Tipo desconocido")} · {formatBytes(file.size_bytes)}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={!hasView}
                          onClick={() => hasView && window.open(file.web_view_link!, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Abrir
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={!hasDownload}
                          onClick={() => hasDownload && window.open(file.web_content_link!, "_blank", "noopener,noreferrer")}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Descargar
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => copyFileLink(file)}>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copiar enlace
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled>
                          <MessageCirclePlus className="h-3.5 w-3.5 mr-1" />
                          Enviar por WhatsApp
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Actividad</h3>
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sin actividad reciente.
              </div>
            </div>
          </div>
        </DetailSheet>
      )}
    </div>
  );
}
