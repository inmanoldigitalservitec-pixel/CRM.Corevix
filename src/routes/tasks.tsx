import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CheckSquare, Download, Minus, Paperclip, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { GlobalKpiStrip, type GlobalKpiItem } from "@/components/crm/global-kpi-strip";
import { EmptyState } from "@/components/crm/empty-state";
import { TaskCreateDialog, TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";
import {
  isActiveProjectStatus,
  isClosedTaskStatusValue,
  isDoneTaskStatusValue,
  isInProgressTaskStatusValue,
} from "@/lib/crm/status";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
  head: () => ({ meta: [{ title: "Tareas — Corevix CRM" }] }),
});

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

const NO_PROJECT = "__no_project__";

interface Task {
  id: string;
  title: string;
  description: string | null;
  description_html?: string | null;
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
type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active?: boolean | null;
};
type TaskAssigneeRow = {
  id: string;
  company_id: string;
  task_id: string;
  user_id: string;
  created_at: string;
};
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
  file_purpose?: "resource" | "deliverable" | null;
  created_at: string;
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortDate(value: string | null | undefined) {
  return toDateKeyLocal(value) || "—";
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

function extractGoogleDriveId(
  rawUrl: string,
): { id: string; type: "file" | "folder" | "unknown" } | null {
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
      args.onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
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
  const dA = parseDate(a.due_date);
  const dB = parseDate(b.due_date);
  if (dA && dB) return dA.getTime() - dB.getTime();
  if (dA && !dB) return -1;
  if (!dA && dB) return 1;
  return a.title.localeCompare(b.title);
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function AssigneeAvatarStack({
  assignees,
  label,
  maxVisible = 5,
}: {
  assignees: ProfileRow[];
  label: string;
  maxVisible?: number;
}) {
  if (!assignees.length) {
    return (
      <div className="flex items-center" title="Sin asignar" aria-label="Sin asignar">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-slate-200 bg-slate-50 text-[11px] font-normal text-slate-400">
          —
        </span>
      </div>
    );
  }

  const visible = assignees.slice(0, maxVisible);
  const hiddenCount = Math.max(0, assignees.length - visible.length);

  return (
    <div className="flex min-w-[96px] items-center pl-2" title={label} aria-label={label}>
      {visible.map((assignee, index) => {
        const name = String(assignee.full_name || assignee.email || "Usuario").trim();
        return (
          <Avatar
            key={`${assignee.id}-${assignee.user_id || index}`}
            className="-ml-2 h-8 w-8 border-2 border-white bg-white shadow-sm ring-1 ring-slate-100"
            title={name}
          >
            {assignee.avatar_url ? (
              <AvatarImage src={assignee.avatar_url} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-slate-50 text-[11px] font-normal text-slate-600">
              {getInitials(name).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {hiddenCount > 0 ? (
        <span
          className="-ml-2 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-normal text-slate-600 shadow-sm ring-1 ring-slate-100"
          title={label}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function statusSelectClass(status: string | null | undefined) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "in progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (s === "cancelled" || s === "canceled") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-white text-slate-700";
}

function prioritySelectClass(priority: string | null | undefined) {
  const p = String(priority || "").toLowerCase();
  if (p === "urgent") return "border-rose-200 bg-rose-50 text-rose-600";
  if (p === "high") return "border-orange-200 bg-orange-50 text-orange-600";
  if (p === "medium") return "border-blue-200 bg-blue-50 text-blue-600";
  if (p === "low") return "border-slate-200 bg-white text-slate-600";
  return "border-slate-200 bg-white text-slate-600";
}

function taskRiskTone(value: number, warningAt: number, dangerAt: number) {
  if (value >= dangerAt) return "text-rose-600";
  if (value >= warningAt) return "text-orange-500";
  return "text-emerald-600";
}

function TaskKpi({
  label,
  value,
  tone = "text-slate-950",
  onClick,
  active = false,
}: {
  label: string;
  value: number;
  tone?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <p className="truncate text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-normal leading-none ${tone}`}>{value}</p>
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

function TasksPage() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const deepLinkTaskId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const value = new URLSearchParams(window.location.search).get("taskId");
      return value && value.trim().length ? value.trim() : null;
    } catch {
      return null;
    }
  }, []);
  const handledDeepLinkTaskRef = useRef(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<
    "all" | "today" | "overdue" | "week" | "unassigned" | "mine"
  >("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [presetProjectId, setPresetProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingResourceFile, setIsUploadingResourceFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resourceUploadProgress, setResourceUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [uploadingResourceFileName, setUploadingResourceFileName] = useState("");
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [resourceDriveUrlInput, setResourceDriveUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resourceFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: tasks,
    loading,
    create,
    update,
    remove,
    fetch: fetchTasks,
  } = useCrud<Task>({ table: "tasks" });
  const { data: projects } = useCrud<ProjectRow>({
    table: "projects",
    select: "id, name, status, due_date, progress, client_id, product_id",
    orderBy: "updated_at",
    ascending: false,
    limit: 500,
  });
  const { data: clients } = useCrud<ClientRow>({
    table: "clients",
    select: "id, company_name, contact_person",
    orderBy: "company_name",
    ascending: true,
    limit: 500,
  });
  const { data: products } = useCrud<ProductRow>({
    table: "products",
    select: "id, name",
    orderBy: "name",
    ascending: true,
    limit: 500,
  });
  const { data: profiles } = useCrud<ProfileRow>({
    table: "profiles",
    select: "id, user_id, full_name, email, avatar_url, is_active",
    orderBy: "full_name",
    ascending: true,
    limit: 500,
  });
  const { data: taskAssignees, fetch: fetchTaskAssignees } = useCrud<TaskAssigneeRow>({
    table: "task_assignees",
    select: "id,company_id,task_id,user_id,created_at",
    orderBy: "created_at",
    ascending: true,
    limit: 2000,
    enabled: tasks.length > 0,
  });
  const { data: taskDriveFilesIndex } = useCrud<
    Pick<DriveFileRow, "id" | "linked_id" | "linked_type"> & {
      linked_type: "task";
      linked_id: string;
    }
  >({
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
    select:
      "id,company_id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,linked_type,linked_id,created_by,file_purpose,created_at",
    orderBy: "created_at",
    ascending: false,
    limit: 200,
    enabled: !!selectedTask?.id,
    filters: [
      { column: "linked_type", op: "eq", value: "task" },
      { column: "linked_id", op: "eq", value: selectedTask?.id || null },
    ],
  });

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const assigneesByAnyId = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    for (const pr of profiles) {
      if (pr.id) map.set(pr.id, pr);
      if (pr.user_id) map.set(pr.user_id, pr);
    }
    return map;
  }, [profiles]);
  const taskAssigneesByTaskId = useMemo(() => {
    const map = new Map<string, TaskAssigneeRow[]>();
    for (const row of taskAssignees) {
      const current = map.get(row.task_id) || [];
      current.push(row);
      map.set(row.task_id, current);
    }
    return map;
  }, [taskAssignees]);
  const taskAssignedUserIds = (task: Task) => {
    const ids = new Set<string>();
    if (task.assigned_to) ids.add(String(task.assigned_to));
    for (const row of taskAssigneesByTaskId.get(task.id) || []) {
      if (row.user_id) ids.add(String(row.user_id));
    }
    return ids;
  };

  const projectOptions = useMemo(() => {
    const opts = projects
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ label: p.name, value: p.id }));
    return [
      { label: "Todos", value: "all" },
      ...opts,
      { label: "Sin proyecto", value: NO_PROJECT },
    ];
  }, [projects]);

  const filtered = useMemo(() => {
    const todayKey = isoTodayLocal();
    const weekKey = addDaysKeyLocal(7);
    const myAnyId = new Set<string>(
      [String(user?.id || ""), String(profile?.user_id || ""), String(profile?.id || "")].filter(
        Boolean,
      ),
    );

    return tasks.filter((task) => {
      const project = task.related_project_id ? projectsById.get(task.related_project_id) : null;
      const projectId = task.related_project_id || NO_PROJECT;
      const dueKey = toDateKeyLocal(task.due_date);
      const isActive = !isClosedTaskStatusValue(task.status);

      const matchQuick =
        quickFilter === "all" ||
        (quickFilter === "today" && isActive && !!dueKey && dueKey === todayKey) ||
        (quickFilter === "overdue" && isActive && !!dueKey && dueKey < todayKey) ||
        (quickFilter === "week" &&
          isActive &&
          !!dueKey &&
          dueKey >= todayKey &&
          dueKey <= weekKey) ||
        (quickFilter === "unassigned" && isActive && taskAssignedUserIds(task).size === 0) ||
        (quickFilter === "mine" &&
          isActive &&
          Array.from(taskAssignedUserIds(task)).some((id) => myAnyId.has(id)));

      return (
        (statusFilter === "all" ||
          String(task.status || "")
            .trim()
            .toLowerCase() === String(statusFilter).trim().toLowerCase()) &&
        (priorityFilter === "all" || task.priority === priorityFilter) &&
        (projectFilter === "all" ||
          (projectFilter === NO_PROJECT
            ? projectId === NO_PROJECT
            : task.related_project_id === projectFilter)) &&
        matchQuick
      );
    });
  }, [
    priorityFilter,
    profile?.id,
    profile?.user_id,
    projectFilter,
    projectsById,
    quickFilter,
    statusFilter,
    tasks,
    taskAssigneesByTaskId,
    user?.id,
  ]);

  const sortedTasks = useMemo(() => filtered.slice().sort(sortTaskRows), [filtered]);
  const filteredTaskIds = useMemo(() => filtered.map((t) => t.id), [filtered]);
  const filteredTaskIdSet = useMemo(() => new Set(filteredTaskIds), [filteredTaskIds]);
  const selectedTaskIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    filteredTaskIds.length > 0 && filteredTaskIds.every((id) => selectedTaskIdSet.has(id));
  const someVisibleSelected = filteredTaskIds.some((id) => selectedTaskIdSet.has(id));
  const selectedVisibleCount = filteredTaskIds.filter((id) => selectedTaskIdSet.has(id)).length;
  const canDeleteTasks = can("tasks.delete");

  const kpis = useMemo(() => {
    const todayKey = isoTodayLocal();
    const activeProjects = projects.filter((p) => isActiveProjectStatus(p.status)).length;
    const completed = tasks.filter((t) => isDoneTaskStatusValue(t.status)).length;
    const inProgress = tasks.filter((t) => isInProgressTaskStatusValue(t.status)).length;
    const active = tasks.filter((t) => !isClosedTaskStatusValue(t.status));
    return {
      total: tasks.length,
      overdue: active.filter((t) => {
        const key = toDateKeyLocal(t.due_date);
        return !!key && key < todayKey;
      }).length,
      dueToday: active.filter((t) => {
        const key = toDateKeyLocal(t.due_date);
        return !!key && key === todayKey;
      }).length,
      inProgress,
      unassigned: active.filter((t) => taskAssignedUserIds(t).size === 0).length,
      completed,
      activeProjects,
    };
  }, [projects, tasks, taskAssigneesByTaskId]);

  const mobileKpiItems = useMemo<GlobalKpiItem[]>(
    () => [
      {
        key: "tasks-overview",
        label: "Tareas",
        value: kpis.total,
        helper: `${sortedTasks.length} visibles de ${tasks.length} tareas`,
        icon: CheckSquare,
        tone: kpis.overdue ? "red" : "blue",
        meta: [
          { label: "Atrasadas", value: kpis.overdue, tone: "red" },
          { label: "Hoy", value: kpis.dueToday, tone: "orange" },
          { label: "Progreso", value: kpis.inProgress, tone: "blue" },
          { label: "Sin asignar", value: kpis.unassigned, tone: "neutral" },
        ],
      },
    ],
    [
      kpis.dueToday,
      kpis.inProgress,
      kpis.overdue,
      kpis.total,
      kpis.unassigned,
      sortedTasks.length,
      tasks.length,
    ],
  );

  const driveFileCountByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    for (const file of taskDriveFilesIndex) {
      if (!file.linked_id) continue;
      map.set(file.linked_id, (map.get(file.linked_id) || 0) + 1);
    }
    return map;
  }, [taskDriveFilesIndex]);

  useEffect(() => {
    if (handledDeepLinkTaskRef.current || !deepLinkTaskId || loading) return;
    handledDeepLinkTaskRef.current = true;
    const found = tasks.find((task) => String(task.id) === String(deepLinkTaskId));
    if (!found) {
      toast.error("No encontré esa tarea.");
      return;
    }
    setSelectedTask(found);
  }, [deepLinkTaskId, loading, tasks]);

  useEffect(() => {
    setDriveUrlInput("");
  }, [selectedTask?.id]);

  const taskMeta = (task: Task) => {
    const project = task.related_project_id
      ? projectsById.get(task.related_project_id) || null
      : null;
    const clientId = task.related_client_id || project?.client_id || null;
    const client = clientId ? clientsById.get(clientId) || null : null;
    const product = project?.product_id ? productsById.get(project.product_id) || null : null;
    const assigneeProfiles = Array.from(taskAssignedUserIds(task))
      .map((id) => assigneesByAnyId.get(id) || null)
      .filter((item): item is ProfileRow => Boolean(item));
    const assigneeLabel =
      assigneeProfiles.length > 0
        ? assigneeProfiles
            .map((assignee) => String(assignee.full_name || assignee.email || "").trim())
            .filter(Boolean)
            .join(", ")
        : "Sin asignar";
    const dueKey = toDateKeyLocal(task.due_date);
    const todayKey = isoTodayLocal();
    const isActive = !isClosedTaskStatusValue(task.status);
    return {
      project,
      client,
      product,
      assigneeProfiles,
      assigneeLabel,
      assigneeCount: assigneeProfiles.length,
      filesCount: driveFileCountByTaskId.get(task.id) || 0,
      isOverdue: isActive && !!dueKey && dueKey < todayKey,
      isDueToday: isActive && !!dueKey && dueKey === todayKey,
    };
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedIds((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  };

  const toggleSelectVisibleTasks = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !filteredTaskIdSet.has(id));
      return Array.from(new Set([...current, ...filteredTaskIds]));
    });
  };

  const clearTaskSelection = () => setSelectedIds([]);

  const sendTaskNotification = async (title: string, message: string) => {
    if (!profile?.company_id || !user?.id) return;
    await createAttentionNotification(
      supabase,
      { companyId: profile.company_id, userId: user.id },
      { title, message, type: "attention:tasks", link: "/tasks" },
    ).catch(() => {});
  };

  const updateTaskStatusInline = async (task: Task, nextStatus: string) => {
    if (!can("tasks.edit")) {
      toast.error("No tienes permiso para editar tareas.");
      return;
    }
    try {
      const updatedTask = await update(task.id, { status: nextStatus } as Partial<Task>);
      if (selectedTask?.id === task.id)
        setSelectedTask((prev) =>
          prev
            ? {
                ...prev,
                ...(updatedTask || {}),
                status: updatedTask?.status || nextStatus,
                due_date: updatedTask?.due_date ?? prev.due_date,
              }
            : prev,
        );
      await fetchTasks();
      void sendTaskNotification(
        `Tarea ${nextStatus === "Completed" ? "completada" : "actualizada"}`,
        `${task.title || "Tarea sin título"} pasó a ${nextStatus}.`,
      );
      toast.success("Estado actualizado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar la tarea.");
    }
  };

  const updateTaskPriorityInline = async (task: Task, nextPriority: string) => {
    if (!can("tasks.edit")) {
      toast.error("No tienes permiso para editar tareas.");
      return;
    }
    try {
      await update(task.id, { priority: nextPriority } as Partial<Task>);
      if (selectedTask?.id === task.id)
        setSelectedTask((prev) => (prev ? { ...prev, priority: nextPriority } : prev));
      toast.success("Prioridad actualizada.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar la prioridad.");
    }
  };

  const handleBulkDelete = async () => {
    if (!canDeleteTasks) {
      toast.error("No tienes permiso para eliminar tareas.");
      return;
    }
    const idsToDelete = tasks
      .filter((task) => selectedTaskIdSet.has(task.id))
      .map((task) => task.id);
    if (!idsToDelete.length) return toast.info("No hay tareas seleccionadas.");

    setBulkDeleteSaving(true);
    try {
      const results = await Promise.allSettled(idsToDelete.map((id) => remove(id)));
      const deletedIds = idsToDelete.filter((_, index) => results[index].status === "fulfilled");
      setSelectedIds((current) => current.filter((id) => !deletedIds.includes(id)));
      if (selectedTask && deletedIds.includes(selectedTask.id)) setSelectedTask(null);
      setBulkDeleteOpen(false);
      const failed = idsToDelete.length - deletedIds.length;
      if (failed)
        toast.error(
          `Se eliminaron ${deletedIds.length} tareas, pero ${failed} no se pudieron borrar.`,
        );
      else toast.success(`Se eliminaron ${deletedIds.length} tareas.`);
    } catch (error: any) {
      toast.error(error?.message || "No se pudieron eliminar las tareas seleccionadas.");
    } finally {
      setBulkDeleteSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can(editTask ? "tasks.edit" : "tasks.create")) {
      toast.error("No tienes permiso para realizar esta acción");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const description = (fd.get("description") as string) || "";
    const relatedProjectId =
      (fd.get("related_project_id") as string) === "no-project"
        ? null
        : (fd.get("related_project_id") as string) || null;
    const relatedProject = relatedProjectId
      ? projects.find((project) => project.id === relatedProjectId) || null
      : null;
    const data = {
      title: fd.get("title") as string,
      description: description || null,
      description_html: description
        ? description.replace(/&/g, "&amp;").replace(/</g, "&lt;")
        : null,
      status: (fd.get("status") as string) || "To Do",
      priority: (fd.get("priority") as string) || "Medium",
      due_date: toDateKeyLocal((fd.get("due_date") as string) || null),
      related_project_id: relatedProjectId,
      related_client_id: relatedProject?.client_id || editTask?.related_client_id || null,
    };
    try {
      if (editTask) {
        await update(editTask.id, data);
        void sendTaskNotification(
          "Tarea actualizada",
          `${data.title || "Tarea sin título"} fue actualizada.`,
        );
        toast.success("Tarea actualizada.");
        setSelectedTask(null);
      } else {
        await create(data);
        void sendTaskNotification(
          "Tarea creada",
          `${data.title || "Tarea sin título"} fue creada.`,
        );
        toast.success("Tarea creada.");
      }
      setDialogOpen(false);
      setEditTask(null);
      setPresetProjectId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateSelectedTaskStatus = async (nextStatus: string) => {
    if (!selectedTask) return;
    await updateTaskStatusInline(selectedTask, nextStatus);
  };

  const handleUploadClick = () => {
    if (!selectedTask?.id) {
      toast.error("Selecciona una tarea primero.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUploadResourceClick = () => {
    if (!selectedTask?.id || !profile?.company_id) {
      toast.error("No se pudo identificar la tarea o compañía.");
      return;
    }
    resourceFileInputRef.current?.click();
  };

  const uploadSelectedTaskFile = async (file: File, filePurpose: "resource" | "deliverable") => {
    if (!selectedTask?.id) {
      toast.error("Selecciona una tarea primero.");
      return;
    }
    try {
      const isResource = filePurpose === "resource";
      if (isResource) {
        setIsUploadingResourceFile(true);
        setResourceUploadProgress(0);
        setUploadingResourceFileName(file.name);
      } else {
        setIsUploadingFile(true);
        setUploadProgress(0);
        setUploadingFileName(file.name);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("No estás autenticado.");
        return;
      }
      const body = new FormData();
      body.append("task_id", selectedTask.id);
      body.append("file_purpose", filePurpose);
      body.append("file", file);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const result = await uploadFileWithProgress({
        url: `${supabaseUrl}/functions/v1/drive-upload-file`,
        token: accessToken,
        formData: body,
        onProgress: isResource ? setResourceUploadProgress : setUploadProgress,
      });
      if (result?.error) {
        const detail = result?.detail ? ` Detalle: ${String(result.detail)}` : "";
        throw new Error(`${String(result.error)}${detail}`);
      }
      if (isResource) setResourceUploadProgress(100);
      else setUploadProgress(100);
      await fetchDriveFiles();
      toast.success(isResource ? "Recurso subido." : "Entregable subido.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo subir el archivo a Google Drive");
    } finally {
      setTimeout(() => {
        if (filePurpose === "resource") {
          setIsUploadingResourceFile(false);
          setResourceUploadProgress(0);
          setUploadingResourceFileName("");
        } else {
          setIsUploadingFile(false);
          setUploadProgress(0);
          setUploadingFileName("");
        }
      }, 350);
    }
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!selectedTask?.id || !profile?.company_id) {
      toast.error("No se pudo identificar la tarea o compañía.");
      return;
    }
    await uploadSelectedTaskFile(file, "deliverable");
  };

  const handleResourceFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!selectedTask?.id || !profile?.company_id) {
      toast.error("No se pudo identificar la tarea o compañía.");
      return;
    }
    await uploadSelectedTaskFile(file, "resource");
  };

  const copyFileLink = async (file: DriveFileRow) => {
    const url = file.web_view_link || file.web_content_link;
    if (!url) return toast.info("Este archivo aún no tiene enlace de Google Drive.");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const attachDriveUrl = async (filePurpose: "resource" | "deliverable" = "deliverable") => {
    if (!selectedTask?.id || !selectedTask.company_id)
      return toast.error("Selecciona una tarea primero.");
    const rawUrl = filePurpose === "resource" ? resourceDriveUrlInput.trim() : driveUrlInput.trim();
    if (!rawUrl) return toast.error("Pega una URL de Google Drive.");
    const parsed = extractGoogleDriveId(rawUrl);
    if (!parsed) return toast.error("La URL de Google Drive no es válida.");
    const isFolder = parsed.type === "folder";
    const { data: sessionData } = await supabase.auth.getSession();
    const authUserId = sessionData.session?.user?.id || profile?.user_id || null;
    const { error } = await (supabase as any).from("drive_files").insert({
      company_id: selectedTask.company_id,
      drive_file_id: parsed.id,
      name: isFolder ? "Carpeta de Google Drive" : "Archivo de Google Drive",
      mime_type: isFolder ? "application/vnd.google-apps.folder" : null,
      web_view_link: rawUrl,
      web_content_link: null,
      thumbnail_link: null,
      icon_link: null,
      size_bytes: null,
      linked_type: "task",
      linked_id: selectedTask.id,
      created_by: authUserId,
      file_purpose: filePurpose,
    });
    if (error) return toast.error(error.message || "No se pudo adjuntar el enlace de Drive.");
    if (filePurpose === "resource") setResourceDriveUrlInput("");
    else setDriveUrlInput("");
    await fetchDriveFiles();
    toast.success(filePurpose === "resource" ? "Recurso adjuntado." : "Entregable adjuntado.");
  };

  const deleteDriveFile = async (file: DriveFileRow) => {
    if (!can("tasks.edit")) return toast.error("No tienes permiso para borrar adjuntos.");
    if (!window.confirm(`¿Eliminar el adjunto "${file.name}" de esta tarea?`)) return;
    const { error } = await (supabase as any).from("drive_files").delete().eq("id", file.id);
    if (error) return toast.error(error.message || "No se pudo borrar el adjunto.");
    await fetchDriveFiles();
    toast.success("Adjunto eliminado.");
  };

  const exportTasksCsv = () => {
    const rows = sortedTasks.map((task) => {
      const meta = taskMeta(task);
      return [
        task.id,
        task.title,
        task.status,
        task.priority,
        task.created_at,
        task.due_date || "",
        meta.assigneeLabel,
        meta.project?.name || "",
        meta.client?.company_name || "",
      ];
    });
    const csv = [
      [
        "ID",
        "Nombre",
        "Estado",
        "Prioridad",
        "Creada",
        "Vencimiento",
        "Asignada a",
        "Proyecto",
        "Cliente",
      ],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "corevix-tasks.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState />;

  const selectedProject = selectedTask?.related_project_id
    ? projectsById.get(selectedTask.related_project_id) || null
    : null;
  const selectedClientId = selectedTask?.related_client_id || selectedProject?.client_id || null;
  const selectedClient = selectedClientId ? clientsById.get(selectedClientId) || null : null;
  const selectedProduct = selectedProject?.product_id
    ? productsById.get(selectedProject.product_id) || null
    : null;

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <GlobalKpiStrip
        items={mobileKpiItems}
        title="Tareas"
        subtitle="Seguimientos, pendientes y trabajo operativo"
        actionLabel={can("tasks.create") ? "Nueva tarea" : undefined}
        onAction={() => {
          setEditTask(null);
          setPresetProjectId(null);
          setDialogOpen(true);
        }}
      >
        <div className="grid w-full grid-cols-2 gap-2 pt-1">
          <Select
            value={quickFilter}
            onValueChange={(value) => {
              setQuickFilter(value as typeof quickFilter);
              if (value !== "all") setStatusFilter("all");
            }}
          >
            <SelectTrigger className="h-9 rounded-full border-slate-200 bg-white px-3 text-[12px] font-bold shadow-none">
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="today">Para hoy</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="unassigned">Sin asignar</SelectItem>
              <SelectItem value="mine">Mis tareas</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              if (value !== "all") setQuickFilter("all");
            }}
          >
            <SelectTrigger className="h-9 rounded-full border-slate-200 bg-white px-3 text-[12px] font-bold shadow-none">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div className="max-md:hidden">
        <PageHeader
          title="Tareas"
          subtitle="Vista operativa compacta para revisar, filtrar y abrir tareas rápido."
        />
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-md:hidden sm:grid-cols-3 lg:grid-cols-6">
        <TaskKpi
          label="Atrasadas"
          value={kpis.overdue}
          tone={taskRiskTone(kpis.overdue, 1, 3)}
          active={quickFilter === "overdue"}
          onClick={() => {
            setQuickFilter("overdue");
            setStatusFilter("all");
          }}
        />
        <TaskKpi
          label="Para hoy"
          value={kpis.dueToday}
          tone={taskRiskTone(kpis.dueToday, 1, 6)}
          active={quickFilter === "today"}
          onClick={() => {
            setQuickFilter("today");
            setStatusFilter("all");
          }}
        />
        <TaskKpi
          label="En progreso"
          value={kpis.inProgress}
          tone="text-blue-600"
          active={statusFilter === "In Progress"}
          onClick={() => {
            setStatusFilter("In Progress");
            setQuickFilter("all");
          }}
        />
        <TaskKpi
          label="Completadas"
          value={kpis.completed}
          tone="text-emerald-600"
          active={statusFilter === "Completed"}
          onClick={() => {
            setStatusFilter("Completed");
            setQuickFilter("all");
          }}
        />
        <TaskKpi
          label="Sin asignar"
          value={kpis.unassigned}
          tone={taskRiskTone(kpis.unassigned, 1, 5)}
          active={quickFilter === "unassigned"}
          onClick={() => {
            setQuickFilter("unassigned");
            setStatusFilter("all");
          }}
        />
        <TaskKpi label="Proyectos activos" value={kpis.activeProjects} />
      </div>

      <section className="overflow-hidden border-y border-slate-100 bg-white max-md:border-0">
        <div className="space-y-4">
          <div className="max-md:hidden">
            <div className="flex min-w-0 items-center gap-3 border-b border-slate-100 px-4 py-3">
              {can("tasks.create") ? (
                <Button
                  type="button"
                  className="h-9 shrink-0 rounded-full bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700"
                  onClick={() => {
                    setEditTask(null);
                    setPresetProjectId(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nueva tarea
                </Button>
              ) : null}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[170px] shrink-0 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 w-[180px] shrink-0 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-9 w-[210px] shrink-0 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projectOptions
                    .filter((option) => option.value !== "all")
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <span className="ml-auto shrink-0 text-sm font-normal text-slate-500">
                {sortedTasks.length} visibles · {selectedIds.length} seleccionadas
              </span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full border-slate-200 bg-white shadow-none"
                onClick={exportTasksCsv}
                disabled={!sortedTasks.length}
                aria-label="Exportar tareas"
                title="Exportar"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {canDeleteTasks && (someVisibleSelected || selectedIds.length > 0) ? (
            <div className="mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-2.5">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-normal text-slate-700"
                onClick={toggleSelectVisibleTasks}
              >
                <span className="grid h-5 w-5 place-items-center rounded border border-slate-200 bg-white">
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
                <span className="text-xs font-normal text-slate-500">
                  {selectedVisibleCount}/{filteredTaskIds.length} visibles · {selectedIds.length}{" "}
                  seleccionadas
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border-slate-200 bg-white font-normal shadow-none"
                  onClick={clearTaskSelection}
                  disabled={!selectedIds.length}
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full bg-red-600 px-3 font-normal text-white shadow-none hover:bg-red-700"
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
              description="Cuando una factura se marque como pagada, el flujo de trabajo del producto creará tareas automáticamente."
              actionLabel={can("tasks.create") ? "Nueva tarea" : undefined}
              onAction={() => setDialogOpen(true)}
            />
          ) : sortedTasks.length === 0 ? (
            <div className="mx-4 border-b border-dashed border-slate-200 py-6 text-sm text-slate-500">
              No hay tareas con este filtro.
            </div>
          ) : (
            <div className="overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white">
                    <TableRow className="hover:bg-white">
                      {canDeleteTasks ? (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={
                              allVisibleSelected
                                ? true
                                : someVisibleSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={toggleSelectVisibleTasks}
                            aria-label="Seleccionar tareas visibles"
                          />
                        </TableHead>
                      ) : null}
                      <TableHead className="w-14">#</TableHead>
                      <TableHead className="min-w-[320px]">Nombre</TableHead>
                      <TableHead className="min-w-[140px]">Estado</TableHead>
                      <TableHead className="min-w-[115px]">Inicio</TableHead>
                      <TableHead className="min-w-[115px]">Vencimiento</TableHead>
                      <TableHead className="min-w-[115px]">Asignada a</TableHead>
                      <TableHead className="min-w-[170px]">Proyecto / Cliente</TableHead>
                      <TableHead className="min-w-[90px]">Archivos</TableHead>
                      <TableHead className="min-w-[100px]">Prioridad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTasks.map((task, index) => {
                      const meta = taskMeta(task);
                      return (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer align-top hover:bg-slate-50/40"
                          onClick={() => setSelectedTask(task)}
                        >
                          {canDeleteTasks ? (
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <Checkbox
                                checked={selectedTaskIdSet.has(task.id)}
                                onCheckedChange={() => toggleTaskSelection(task.id)}
                                aria-label="Seleccionar tarea"
                              />
                            </TableCell>
                          ) : null}
                          <TableCell className="font-normal text-slate-500">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-normal text-slate-950">{task.title}</span>
                              {meta.isOverdue ? (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-normal text-rose-700">
                                  Atrasada
                                </span>
                              ) : null}
                              {meta.isDueToday ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-normal text-amber-800">
                                  Hoy
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 line-clamp-2 max-w-[520px] text-sm font-normal text-slate-500">
                              {task.description || "Sin descripción."}
                            </div>
                          </TableCell>
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Select
                              value={task.status || "To Do"}
                              onValueChange={(value) => void updateTaskStatusInline(task, value)}
                              disabled={!can("tasks.edit")}
                            >
                              <SelectTrigger
                                className={`h-8 w-[132px] rounded-lg px-3 text-xs font-normal shadow-none ${statusSelectClass(task.status)}`}
                                aria-label="Cambiar estado"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TASK_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {displayLabel(status)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm font-normal text-slate-600">
                            {formatShortDate(task.created_at?.slice(0, 10))}
                          </TableCell>
                          <TableCell className="text-sm font-normal text-slate-700">
                            {formatShortDate(task.due_date)}
                          </TableCell>
                          <TableCell>
                            <AssigneeAvatarStack
                              assignees={meta.assigneeProfiles}
                              label={meta.assigneeLabel}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px] truncate text-sm font-normal text-slate-800">
                              {meta.project?.name || "—"}
                            </div>
                            <div className="max-w-[180px] truncate text-xs font-normal text-slate-500">
                              {meta.client?.company_name || "Sin cliente"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-normal text-slate-600">
                              <Paperclip className="h-3.5 w-3.5" />
                              {meta.filesCount || "—"}
                            </span>
                          </TableCell>
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Select
                              value={task.priority || "Medium"}
                              onValueChange={(value) => void updateTaskPriorityInline(task, value)}
                              disabled={!can("tasks.edit")}
                            >
                              <SelectTrigger
                                className={`h-8 w-[112px] rounded-lg px-3 text-xs font-normal shadow-none ${prioritySelectClass(task.priority)}`}
                                aria-label="Cambiar prioridad"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map((priority) => (
                                  <SelectItem key={priority} value={priority}>
                                    {displayLabel(priority)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </section>

      <TaskCreateDialog
        open={dialogOpen && !editTask}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setPresetProjectId(null);
        }}
        companyId={profile?.company_id}
        currentUserId={profile?.user_id || user?.id || null}
        profiles={profiles}
        initialValues={{
          projectId: presetProjectId || undefined,
          assignedTo: profile?.user_id || user?.id || undefined,
        }}
        canCreate={can("tasks.create")}
        onCreated={async (task) => {
          await fetchTasks();
          await fetchTaskAssignees();
          void sendTaskNotification(
            "Tarea creada",
            `${task.title || "Tarea sin título"} fue creada.`,
          );
          setSelectedTask(task as Task);
          setPresetProjectId(null);
        }}
      />

      <Dialog
        open={dialogOpen && !!editTask}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditTask(null);
            setPresetProjectId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTask ? "Editar tarea" : "Agregar tarea"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" defaultValue={editTask?.title || ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editTask?.description || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select name="status" defaultValue={editTask?.status || "To Do"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select name="priority" defaultValue={editTask?.priority || "Medium"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {displayLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Fecha de vencimiento</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  defaultValue={editTask?.due_date || ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Proyecto</Label>
                <Select
                  name="related_project_id"
                  defaultValue={editTask?.related_project_id || presetProjectId || "no-project"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">Sin proyecto</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editTask ? "Actualizar" : "Crear"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        profiles={profiles}
        projectName={selectedProject?.name || "—"}
        clientName={
          selectedClient
            ? selectedClient.contact_person
              ? `${selectedClient.company_name} · ${selectedClient.contact_person}`
              : selectedClient.company_name
            : "—"
        }
        productName={selectedProduct?.name || "—"}
        driveFiles={driveFiles}
        driveFilesLoading={driveFilesLoading}
        driveUrlInput={driveUrlInput}
        resourceDriveUrlInput={resourceDriveUrlInput}
        isUploadingFile={isUploadingFile}
        isUploadingResourceFile={isUploadingResourceFile}
        uploadProgress={uploadProgress}
        resourceUploadProgress={resourceUploadProgress}
        uploadingFileName={uploadingFileName}
        uploadingResourceFileName={uploadingResourceFileName}
        canEdit={can("tasks.edit")}
        fileInputRef={fileInputRef}
        resourceFileInputRef={resourceFileInputRef}
        onUpdateTask={async (taskId, patch) => {
          await update(taskId, patch as Partial<Task>);
          await fetchTaskAssignees();
          setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, ...patch } : prev));
        }}
        onAssigneesChanged={fetchTaskAssignees}
        onComplete={() => updateSelectedTaskStatus("Completed")}
        onSetInProgress={() => updateSelectedTaskStatus("In Progress")}
        onDriveUrlChange={setDriveUrlInput}
        onResourceDriveUrlChange={setResourceDriveUrlInput}
        onAttachDriveUrl={async () => {
          await attachDriveUrl("deliverable");
        }}
        onAttachResourceDriveUrl={async () => {
          await attachDriveUrl("resource");
        }}
        onUploadClick={handleUploadClick}
        onUploadResourceClick={handleUploadResourceClick}
        onFilePicked={handleFilePicked}
        onResourceFilePicked={handleResourceFilePicked}
        onFileDropped={async (file) => {
          await uploadSelectedTaskFile(file, "deliverable");
        }}
        onResourceFileDropped={async (file) => {
          await uploadSelectedTaskFile(file, "resource");
        }}
        onCopyFileLink={async (file) => {
          await copyFileLink(file as DriveFileRow);
        }}
        onDeleteDriveFile={async (file) => {
          await deleteDriveFile(file as DriveFileRow);
        }}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tareas seleccionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará {selectedIds.length} tarea{selectedIds.length === 1 ? "" : "s"}.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteSaving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleBulkDelete()}
              disabled={bulkDeleteSaving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {bulkDeleteSaving ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
