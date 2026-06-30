import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Circle,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  FolderKanban,
  Link2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  related_project_id: string | null;
  related_client_id: string | null;
  created_at: string;
  company_id: string;
};

type QuickProfile = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  is_active?: boolean | null;
};

type TaskChecklistItem = {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order_index: number | null;
  created_at: string;
};

type TaskComment = {
  id: string;
  task_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};

type TaskActivityEvent = {
  id: string;
  task_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
};

type DriveFileRow = {
  id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  web_view_link: string | null;
  web_content_link: string | null;
  thumbnail_link: string | null;
  icon_link: string | null;
  size_bytes: number | null;
  created_at: string;
};

type ProjectOption = {
  id: string;
  name: string;
  client_id: string | null;
  product_id: string | null;
};

type ClientOption = { id: string; company_name: string; contact_person: string | null };
type ProductOption = { id: string; name: string };

type TaskDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;

  task?: TaskRow | null;
  profiles?: QuickProfile[];
  projectName?: string;
  clientName?: string;
  productName?: string;

  driveFiles?: DriveFileRow[];
  driveFilesLoading?: boolean;
  driveUrlInput?: string;
  isUploadingFile?: boolean;
  uploadProgress?: number;
  uploadingFileName?: string;
  canEdit?: boolean;
  fileInputRef?: RefObject<HTMLInputElement | null>;

  onUpdateTask?: (taskId: string, patch: Partial<TaskRow>) => Promise<void>;
  onComplete?: () => void | Promise<void>;
  onSetInProgress?: () => void | Promise<void>;
  onDriveUrlChange?: (value: string) => void;
  onAttachDriveUrl?: () => void | Promise<void>;
  onUploadClick?: () => void;
  onFilePicked?: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onCopyFileLink?: (file: DriveFileRow) => void | Promise<void>;
  onDeleteDriveFile?: (file: DriveFileRow) => void | Promise<void>;
};

const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const UNASSIGNED_VALUE = "__unassigned__";
const NO_PROJECT_VALUE = "__no_project__";
const NO_CLIENT_VALUE = "__no_client__";

function readTaskIdFromUrl() {
  if (typeof window === "undefined") return null;
  try {
    const value = new URLSearchParams(window.location.search).get("taskId");
    return value && value.trim().length ? value.trim() : null;
  } catch {
    return null;
  }
}

function readTaskTextSnapshot(root: HTMLDivElement | null) {
  if (!root) return { title: "", description: "", priority: "Medium", dueDate: "" };
  const title = root.querySelector("h2")?.textContent?.trim() || "";
  const description = root.querySelector("h2 + p")?.textContent?.trim() || "";
  const labels = Array.from(root.querySelectorAll(".rounded-xl .text-xs.font-semibold.text-slate-500"));
  const readValue = (label: string) => {
    const found = labels.find((node) => node.textContent?.trim().toLowerCase() === label.toLowerCase());
    return found?.parentElement?.querySelector(".mt-1")?.textContent?.trim() || "";
  };
  const due = readValue("Vence");
  return {
    title,
    description: description === "Sin descripción." ? "" : description,
    priority: readValue("Prioridad") || "Medium",
    dueDate: due === "—" ? "" : due,
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
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

function getGoogleDrivePreviewUrl(rawHref: string | null | undefined, driveFileId?: string | null) {
  if (driveFileId) return `https://drive.google.com/file/d/${driveFileId}/preview`;
  if (!rawHref) return null;
  try {
    const url = new URL(rawHref);
    const pathname = url.pathname || "";
    const fileMatch = pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    const docsMatch = pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
    if (docsMatch?.[1] && docsMatch?.[2]) return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
    const queryId = url.searchParams.get("id");
    if (queryId) return `https://drive.google.com/file/d/${queryId}/preview`;
    return null;
  } catch {
    return null;
  }
}

function clientLabel(client: ClientOption | null | undefined) {
  if (!client) return "—";
  return client.contact_person ? `${client.company_name} · ${client.contact_person}` : client.company_name || "—";
}

function eventIcon(type: string) {
  if (type.includes("comment")) return <MessageSquare className="h-4 w-4" />;
  if (type.includes("checklist")) return <Check className="h-4 w-4" />;
  if (type.includes("status")) return <Circle className="h-4 w-4" />;
  return <Flag className="h-4 w-4" />;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  children,
  task: propTask,
  profiles: propProfiles = [],
  projectName = "—",
  clientName = "—",
  productName = "—",
  driveFiles: propDriveFiles,
  driveFilesLoading = false,
  driveUrlInput = "",
  isUploadingFile = false,
  uploadProgress = 0,
  uploadingFileName = "",
  canEdit = true,
  fileInputRef,
  onUpdateTask,
  onComplete,
  onSetInProgress,
  onDriveUrlChange,
  onAttachDriveUrl,
  onUploadClick,
  onFilePicked,
  onCopyFileLink,
  onDeleteDriveFile,
}: TaskDetailDialogProps) {
  const legacyContentRef = useRef<HTMLDivElement | null>(null);
  const [task, setTask] = useState<TaskRow | null>(null);
  const [profiles, setProfiles] = useState<QuickProfile[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivityEvent[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    status: "To Do",
    priority: "Medium",
    dueDate: "",
    assignedTo: UNASSIGNED_VALUE,
    projectId: NO_PROJECT_VALUE,
    clientId: NO_CLIENT_VALUE,
  });

  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const selectedProject = task?.related_project_id ? projectsById.get(task.related_project_id) || null : null;
  const selectedClient = task?.related_client_id
    ? clientsById.get(task.related_client_id) || null
    : selectedProject?.client_id
      ? clientsById.get(selectedProject.client_id) || null
      : null;
  const selectedProduct = selectedProject?.product_id ? productsById.get(selectedProject.product_id) || null : null;

  const displayProjectName = selectedProject?.name || projectName || "—";
  const displayClientName = selectedClient ? clientLabel(selectedClient) : clientName || "—";
  const displayProductName = selectedProduct?.name || productName || "—";

  const draftProject = draft.projectId !== NO_PROJECT_VALUE ? projectsById.get(draft.projectId) || null : null;
  const draftProductName = draftProject?.product_id ? productsById.get(draftProject.product_id)?.name || "—" : "—";

  const assigneeLabel = useMemo(() => {
    if (!task?.assigned_to) return "Sin asignar";
    const profile = profiles.find((p) => p.id === task.assigned_to || p.user_id === task.assigned_to);
    return String(profile?.full_name || profile?.email || "Sin asignar");
  }, [profiles, task?.assigned_to]);

  const completedChecklist = checklist.filter((item) => item.is_completed).length;
  const checklistProgress = checklist.length ? Math.round((completedChecklist / checklist.length) * 100) : 0;

  const resetState = () => {
    setTask(null);
    setChecklist([]);
    setComments([]);
    setActivity([]);
    setDriveFiles([]);
    setMessage(null);
    setEditing(false);
    setPreviewFile(null);
    setNewChecklistTitle("");
    setNewCommentBody("");
  };

  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  const loadRelationOptions = async (companyId: string) => {
    const [projectResult, clientResult, productResult] = await Promise.all([
      (supabase as any)
        .from("projects")
        .select("id,name,client_id,product_id")
        .eq("company_id", companyId)
        .order("name", { ascending: true })
        .limit(500),
      (supabase as any)
        .from("clients")
        .select("id,company_name,contact_person")
        .eq("company_id", companyId)
        .order("company_name", { ascending: true })
        .limit(500),
      (supabase as any)
        .from("products")
        .select("id,name")
        .eq("company_id", companyId)
        .order("name", { ascending: true })
        .limit(500),
    ]);

    if (!projectResult.error) setProjects(Array.isArray(projectResult.data) ? projectResult.data : []);
    if (!clientResult.error) setClients(Array.isArray(clientResult.data) ? clientResult.data : []);
    if (!productResult.error) setProducts(Array.isArray(productResult.data) ? productResult.data : []);
  };

  const loadTaskDetails = async (taskId: string) => {
    const [checklistResult, commentsResult, activityResult, driveResult] = await Promise.all([
      (supabase as any)
        .from("task_checklist_items")
        .select("id,task_id,title,is_completed,order_index,created_at")
        .eq("task_id", taskId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),
      (supabase as any)
        .from("task_comments")
        .select("id,task_id,body,created_by,created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(8),
      (supabase as any)
        .from("task_activity_events")
        .select("id,task_id,event_type,title,description,metadata,created_by,created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(12),
      (supabase as any)
        .from("drive_files")
        .select("id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,created_at")
        .eq("linked_type", "task")
        .eq("linked_id", taskId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (!checklistResult.error) setChecklist(Array.isArray(checklistResult.data) ? checklistResult.data : []);
    if (!commentsResult.error) setComments(Array.isArray(commentsResult.data) ? commentsResult.data : []);
    if (!activityResult.error) setActivity(Array.isArray(activityResult.data) ? activityResult.data : []);
    if (!driveResult.error && !propDriveFiles) setDriveFiles(Array.isArray(driveResult.data) ? driveResult.data : []);

    const errors = [checklistResult.error, commentsResult.error, activityResult.error, driveResult.error].filter(Boolean);
    setMessage(errors[0]?.message || null);
  };

  const applyLoadedTask = async (loadedTask: TaskRow, loadedProfiles: QuickProfile[] = propProfiles) => {
    setTask(loadedTask);
    setProfiles(loadedProfiles);
    setDraft({
      title: loadedTask.title || "",
      description: loadedTask.description || "",
      status: loadedTask.status || "To Do",
      priority: loadedTask.priority || "Medium",
      dueDate: loadedTask.due_date || "",
      assignedTo: loadedTask.assigned_to || UNASSIGNED_VALUE,
      projectId: loadedTask.related_project_id || NO_PROJECT_VALUE,
      clientId: loadedTask.related_client_id || NO_CLIENT_VALUE,
    });
    await Promise.all([loadRelationOptions(loadedTask.company_id), loadTaskDetails(loadedTask.id)]);
    if (propDriveFiles) setDriveFiles(propDriveFiles);
  };

  const resolveTask = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (propTask) {
        await applyLoadedTask(propTask as TaskRow, propProfiles);
        return;
      }

      const snapshot = readTaskTextSnapshot(legacyContentRef.current);
      const taskIdFromUrl = readTaskIdFromUrl();

      const { data: profileRows } = await (supabase as any)
        .from("profiles")
        .select("id,user_id,full_name,email,is_active")
        .order("full_name", { ascending: true })
        .limit(500);
      const loadedProfiles = Array.isArray(profileRows) ? profileRows.filter((p) => p && p.is_active !== false) : [];

      let query = (supabase as any)
        .from("tasks")
        .select("id,title,description,status,priority,assigned_to,due_date,related_project_id,related_client_id,created_at,company_id")
        .limit(2);

      if (taskIdFromUrl) {
        query = query.eq("id", taskIdFromUrl);
      } else if (snapshot.title) {
        query = query.eq("title", snapshot.title);
        if (snapshot.description) query = query.eq("description", snapshot.description);
        if (snapshot.priority) query = query.eq("priority", snapshot.priority);
        if (snapshot.dueDate) query = query.eq("due_date", snapshot.dueDate);
      } else {
        setMessage("No pude identificar esta tarea.");
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      if (rows.length !== 1) {
        setMessage(taskIdFromUrl ? "No encontré esta tarea." : "Abre la tarea desde /tasks?taskId=... para cargar el detalle completo.");
        return;
      }

      await applyLoadedTask(rows[0] as TaskRow, loadedProfiles);
    } catch (error: any) {
      setMessage(error?.message || "No se pudo cargar el detalle de la tarea.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void resolveTask(), 50);
    return () => window.clearTimeout(timer);
  }, [
    open,
    children,
    propTask?.id,
    propTask?.title,
    propTask?.description,
    propTask?.status,
    propTask?.priority,
    propTask?.due_date,
    propTask?.assigned_to,
    propTask?.related_project_id,
    propTask?.related_client_id,
    propDriveFiles?.length,
    projectName,
    clientName,
    productName,
  ]);

  useEffect(() => {
    if (propDriveFiles) setDriveFiles(propDriveFiles);
  }, [propDriveFiles]);

  const updateTask = async (patch: Partial<TaskRow>) => {
    if (!task?.id) return;
    setSaving(true);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, patch);
      } else {
        const { error } = await (supabase as any).from("tasks").update(patch).eq("id", task.id);
        if (error) throw error;
      }
    } catch (error: any) {
      setSaving(false);
      toast.error(error?.message || "No se pudo actualizar la tarea.");
      return;
    }
    setSaving(false);
    const next = { ...task, ...patch } as TaskRow;
    setTask(next);
    await Promise.all([loadRelationOptions(next.company_id), loadTaskDetails(next.id)]);
    toast.success("Tarea actualizada.");
  };

  const saveInlineEdit = async () => {
    if (!task?.id) return;
    await updateTask({
      title: draft.title.trim() || "Sin título",
      description: draft.description.trim() || null,
      status: draft.status,
      priority: draft.priority,
      due_date: draft.dueDate || null,
      assigned_to: draft.assignedTo === UNASSIGNED_VALUE ? null : draft.assignedTo,
      related_project_id: draft.projectId === NO_PROJECT_VALUE ? null : draft.projectId,
      related_client_id: draft.clientId === NO_CLIENT_VALUE ? null : draft.clientId,
    });
    setEditing(false);
  };

  const addChecklistItem = async () => {
    const title = newChecklistTitle.trim();
    if (!task?.id || !title) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("task_checklist_items").insert({
      task_id: task.id,
      title,
      order_index: checklist.length + 1,
      created_by: userData?.user?.id || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo agregar la subtarea.");
      return;
    }
    setNewChecklistTitle("");
    await loadTaskDetails(task.id);
  };

  const toggleChecklistItem = async (item: TaskChecklistItem) => {
    const { error } = await (supabase as any)
      .from("task_checklist_items")
      .update({ is_completed: !item.is_completed, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message || "No se pudo actualizar la subtarea.");
      return;
    }
    if (task?.id) await loadTaskDetails(task.id);
  };

  const deleteChecklistItem = async (item: TaskChecklistItem) => {
    const { error } = await (supabase as any).from("task_checklist_items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message || "No se pudo borrar la subtarea.");
      return;
    }
    if (task?.id) await loadTaskDetails(task.id);
  };

  const addComment = async () => {
    const body = newCommentBody.trim();
    if (!task?.id || !body) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("task_comments").insert({
      task_id: task.id,
      body,
      created_by: userData?.user?.id || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo agregar la nota.");
      return;
    }
    setNewCommentBody("");
    await loadTaskDetails(task.id);
  };

  const copyFileLink = async (file: DriveFileRow) => {
    if (onCopyFileLink) {
      await onCopyFileLink(file);
      return;
    }
    const url = file.web_view_link || file.web_content_link;
    if (!url) return toast.info("Este archivo no tiene enlace disponible.");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  const renderMetaChip = (label: string, value: string, icon: ReactNode) => (
    <div className="flex min-w-[210px] items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-700">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-nowrap text-[11px] font-bold text-slate-500">{label}</div>
        <div className="truncate text-sm font-extrabold text-slate-900" title={value || "—"}>{value || "—"}</div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[1240px] sm:rounded-[24px] sm:border">
          <div ref={legacyContentRef} className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0">
            {children}
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white sm:max-h-[92vh]">
            <div className="shrink-0 border-b bg-white px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {editing ? (
                      <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="h-10 max-w-2xl text-lg font-extrabold" />
                    ) : (
                      <h2 className="truncate text-[22px] font-extrabold tracking-[-0.035em] text-slate-950">
                        {task?.title || "Cargando tarea..."}
                      </h2>
                    )}
                    {task ? <StatusBadge status={task.status} /> : null}
                  </div>

                  {editing ? (
                    <div className="mt-3 grid max-w-5xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                      <Select value={draft.status} onValueChange={(value) => setDraft((d) => ({ ...d, status: value }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>{TASK_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={draft.priority} onValueChange={(value) => setDraft((d) => ({ ...d, priority: value }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                        <SelectContent>{TASK_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} className="h-10" />
                      <Select value={draft.assignedTo} onValueChange={(value) => setDraft((d) => ({ ...d, assignedTo: value }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Responsable" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>Sin asignar</SelectItem>
                          {profiles.map((p) => <SelectItem key={p.id} value={String(p.user_id || p.id)}>{String(p.full_name || p.email || "Usuario")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={draft.projectId} onValueChange={(value) => setDraft((d) => ({ ...d, projectId: value }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Proyecto" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_PROJECT_VALUE}>Sin proyecto</SelectItem>
                          {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={draft.clientId} onValueChange={(value) => setDraft((d) => ({ ...d, clientId: value }))}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Cliente" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CLIENT_VALUE}>Sin cliente directo</SelectItem>
                          {clients.map((client) => <SelectItem key={client.id} value={client.id}>{clientLabel(client)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="rounded-xl border bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-4 xl:col-span-6">
                        Producto automático desde proyecto: <span className="font-extrabold text-slate-900">{draftProductName}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid max-w-none grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2 xl:max-w-6xl">
                      {renderMetaChip("Priority", task?.priority || "—", <Flag className="h-4 w-4" />)}
                      {renderMetaChip("Due date", formatDate(task?.due_date), <CalendarDays className="h-4 w-4" />)}
                      {renderMetaChip("Assignee", assigneeLabel, <User className="h-4 w-4" />)}
                      {renderMetaChip("Project", displayProjectName, <FolderKanban className="h-4 w-4" />)}
                      {renderMetaChip("Client", displayClientName, <User className="h-4 w-4" />)}
                      {renderMetaChip("Product", displayProductName, <FileText className="h-4 w-4" />)}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {editing ? (
                    <>
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                      <Button onClick={() => void saveInlineEdit()} disabled={saving || !canEdit}>Guardar cambios</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => void (onComplete ? onComplete() : updateTask({ status: "Completed" }))} disabled={!task?.id || task.status === "Completed" || !canEdit}>
                        <Check className="mr-2 h-4 w-4" /> Marcar completada
                      </Button>
                      <Button variant="outline" onClick={() => void (onSetInProgress ? onSetInProgress() : updateTask({ status: "In Progress" }))} disabled={!task?.id || task.status === "In Progress" || !canEdit}>
                        <Circle className="mr-2 h-4 w-4" /> En progreso
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(true)} disabled={!task?.id || !canEdit}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4">
              {loading && !task ? (
                <div className="rounded-2xl border bg-white p-6 text-sm font-semibold text-slate-500">Cargando detalle de tarea...</div>
              ) : (
                <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.85fr)] lg:items-start">
                  <section className="rounded-2xl border bg-white p-4 shadow-sm lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-950">Task Brief / Instrucciones</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Script, indicaciones, copy y detalles completos de la tarea.</p>
                      </div>
                    </div>
                    {editing ? (
                      <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className="min-h-[220px] text-sm leading-6" placeholder="Escribe aquí el script completo, instrucciones, copy, detalles del video, notas del cliente..." />
                    ) : (
                      <div className="max-h-[240px] overflow-auto whitespace-pre-wrap rounded-xl border bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800">
                        {task?.description || "Sin descripción."}
                      </div>
                    )}
                    <p className="mt-3 text-xs font-semibold text-slate-500">Task ID: {task?.id ? task.id.slice(0, 8) : "—"} · Creada {formatDate(task?.created_at)}</p>
                    {message ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{message}</div> : null}
                  </section>

                  <div className="grid content-start gap-3">
                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-950">Checklist / Subtasks</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Divide la tarea en pasos accionables.</p>
                        </div>
                        <div className="min-w-[130px] text-right">
                          <div className="text-xs font-extrabold text-slate-900">{completedChecklist} / {checklist.length} complete</div>
                          <Progress value={checklistProgress} className="mt-2 h-1.5" />
                        </div>
                      </div>
                      <div className="mb-2 flex gap-2">
                        <Input value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addChecklistItem(); }} placeholder="Add a subtask..." />
                        <Button variant="outline" onClick={() => void addChecklistItem()} disabled={!task?.id || saving || !newChecklistTitle.trim()}><Plus className="mr-2 h-4 w-4" /> Add</Button>
                      </div>
                      {checklist.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">No hay subtareas todavía.</div>
                      ) : (
                        <div className="space-y-1">
                          {checklist.map((item) => (
                            <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl px-1 py-2 hover:bg-slate-50">
                              <button type="button" onClick={() => void toggleChecklistItem(item)} className={"grid h-4 w-4 place-items-center rounded border text-[10px] " + (item.is_completed ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 text-transparent")}><Check className="h-3 w-3" /></button>
                              <div className={"truncate text-sm font-semibold " + (item.is_completed ? "text-slate-400 line-through" : "text-slate-800")}>{item.title}</div>
                              <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">IC</div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => void deleteChecklistItem(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="mb-3">
                        <h3 className="text-sm font-extrabold text-slate-950">Activity Timeline</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Historial de cambios, checklist y notas de esta tarea.</p>
                      </div>
                      {activity.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">Todavía no hay actividad registrada.</div>
                      ) : (
                        <div className="relative max-h-[360px] space-y-4 overflow-auto pr-2 before:absolute before:bottom-4 before:left-[17px] before:top-4 before:w-px before:bg-slate-200">
                          {activity.map((event, index) => (
                            <div key={event.id} className="relative grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3">
                              <div className={"relative z-10 grid h-9 w-9 place-items-center rounded-full border " + (index === 0 ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-500")}>{eventIcon(event.event_type)}</div>
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-slate-900">{event.title}</div>
                                {event.description ? <div className="mt-1 text-xs font-semibold text-slate-500">{event.description}</div> : null}
                              </div>
                              <div className="text-right text-xs font-semibold text-slate-500">{formatDateTime(event.created_at)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="grid content-start gap-3">
                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><FileText className="h-4 w-4" /> Drive Files</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Archivos adjuntos de trabajo.</p>
                        </div>
                        <div className="flex gap-2">
                          {fileInputRef ? <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void onFilePicked?.(event)} /> : null}
                          <Button size="sm" variant="outline" onClick={onUploadClick} disabled={!canEdit || isUploadingFile}>
                            <Upload className="mr-2 h-4 w-4" />{isUploadingFile ? `${uploadProgress}%` : "Upload"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onDriveUrlChange?.(driveUrlInput)}>
                            <Link2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {uploadingFileName ? (
                        <div className="mb-3 rounded-xl border bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                            <span className="truncate">Subiendo {uploadingFileName}</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      ) : null}
                      {onAttachDriveUrl ? (
                        <div className="mb-3 flex gap-2">
                          <Input value={driveUrlInput} onChange={(event) => onDriveUrlChange?.(event.target.value)} placeholder="Pega URL de Google Drive" />
                          <Button type="button" variant="outline" onClick={() => void onAttachDriveUrl()} disabled={!canEdit || !driveUrlInput.trim()}>
                            Adjuntar
                          </Button>
                        </div>
                      ) : null}
                      {driveFilesLoading ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">Cargando archivos...</div>
                      ) : driveFiles.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">No hay archivos adjuntos todavía.</div>
                      ) : (
                        <div className="space-y-2">
                          {driveFiles.map((file) => {
                            const url = file.web_view_link || file.web_content_link;
                            const previewUrl = getGoogleDrivePreviewUrl(url, file.drive_file_id);
                            return (
                              <div key={file.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border bg-slate-50 p-2.5">
                                <div className="grid h-9 w-9 place-items-center rounded-xl border bg-white text-slate-500">{file.icon_link ? <img src={file.icon_link} alt="" className="h-5 w-5" /> : <Paperclip className="h-4 w-4" />}</div>
                                <div className="min-w-0"><div className="truncate text-sm font-extrabold text-slate-900">{file.name}</div><div className="text-xs font-semibold text-slate-500">{formatBytes(file.size_bytes)} · {formatDate(file.created_at)}</div></div>
                                <div className="flex items-center gap-1">
                                  {previewUrl ? <Button size="sm" variant="outline" onClick={() => setPreviewFile({ url: previewUrl, title: file.name })}>Preview</Button> : null}
                                  {url ? <Button size="icon" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : null}
                                  <Button size="icon" variant="outline" onClick={() => void copyFileLink(file)}><Copy className="h-4 w-4" /></Button>
                                  {onDeleteDriveFile ? <Button size="icon" variant="ghost" className="text-red-600" onClick={() => void onDeleteDriveFile(file)}><Trash2 className="h-4 w-4" /></Button> : <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><MessageSquare className="h-4 w-4" /> Internal Comments</h3>
                      <div className="mt-2 space-y-2">
                        <Textarea value={newCommentBody} onChange={(e) => setNewCommentBody(e.target.value)} placeholder="Write an internal comment..." className="min-h-[100px]" />
                        <div className="flex justify-end"><Button onClick={() => void addComment()} disabled={!task?.id || saving || !newCommentBody.trim()}>Add comment</Button></div>
                      </div>
                      <div className="mt-2 space-y-2">
                        {comments.length === 0 ? <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">No hay comentarios todavía.</div> : comments.map((comment) => (
                          <div key={comment.id} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl border bg-slate-50 p-3">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">IC</div>
                            <div className="min-w-0"><div className="mb-1 text-xs font-bold text-slate-500">{formatDateTime(comment.created_at)}</div><div className="whitespace-pre-wrap text-sm font-medium text-slate-700">{comment.body}</div></div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </aside>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(nextOpen) => !nextOpen && setPreviewFile(null)}>
        <DialogContent className="h-[92dvh] w-[calc(100vw-20px)] max-w-[1040px] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Preview de Drive</div><div className="truncate text-sm font-semibold text-slate-900">{previewFile?.title || "Archivo"}</div></div>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewFile(null)}>Cerrar</Button>
          </div>
          {previewFile?.url ? <iframe src={previewFile.url} title={previewFile.title || "Preview de Drive"} className="h-[calc(92dvh-57px)] w-full border-0 bg-slate-100" allow="autoplay" /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
