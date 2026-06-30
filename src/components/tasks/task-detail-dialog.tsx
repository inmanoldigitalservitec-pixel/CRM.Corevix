import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

type RelationRows = {
  projectName: string;
  clientName: string;
  productName: string;
};

type TaskDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
};

const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const UNASSIGNED_VALUE = "__unassigned__";

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

function eventIcon(type: string) {
  if (type.includes("comment")) return <MessageSquare className="h-4 w-4" />;
  if (type.includes("checklist")) return <Check className="h-4 w-4" />;
  if (type.includes("status")) return <Circle className="h-4 w-4" />;
  return <Flag className="h-4 w-4" />;
}

export function TaskDetailDialog({ open, onOpenChange, children }: TaskDetailDialogProps) {
  const legacyContentRef = useRef<HTMLDivElement | null>(null);
  const [task, setTask] = useState<TaskRow | null>(null);
  const [profiles, setProfiles] = useState<QuickProfile[]>([]);
  const [relations, setRelations] = useState<RelationRows>({ projectName: "—", clientName: "—", productName: "—" });
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
  });

  const assigneeLabel = useMemo(() => {
    if (!task?.assigned_to) return "Sin asignar";
    const profile = profiles.find((p) => p.id === task.assigned_to || p.user_id === task.assigned_to);
    return String(profile?.full_name || profile?.email || "Sin asignar");
  }, [profiles, task?.assigned_to]);

  const completedChecklist = checklist.filter((item) => item.is_completed).length;
  const checklistProgress = checklist.length ? Math.round((completedChecklist / checklist.length) * 100) : 0;

  const resetState = () => {
    setTask(null);
    setRelations({ projectName: "—", clientName: "—", productName: "—" });
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

  const loadRelations = async (loadedTask: TaskRow) => {
    const next: RelationRows = { projectName: "—", clientName: "—", productName: "—" };

    if (loadedTask.related_project_id) {
      const { data: project } = await (supabase as any)
        .from("projects")
        .select("id,name,client_id,product_id")
        .eq("id", loadedTask.related_project_id)
        .maybeSingle();
      if (project) {
        next.projectName = project.name || "—";
        if (project.client_id) {
          const { data: client } = await (supabase as any)
            .from("clients")
            .select("company_name,contact_person")
            .eq("id", project.client_id)
            .maybeSingle();
          if (client) {
            next.clientName = client.contact_person
              ? `${client.company_name} · ${client.contact_person}`
              : client.company_name || "—";
          }
        }
        if (project.product_id) {
          const { data: product } = await (supabase as any)
            .from("products")
            .select("name")
            .eq("id", project.product_id)
            .maybeSingle();
          if (product) next.productName = product.name || "—";
        }
      }
    }

    if (loadedTask.related_client_id && next.clientName === "—") {
      const { data: client } = await (supabase as any)
        .from("clients")
        .select("company_name,contact_person")
        .eq("id", loadedTask.related_client_id)
        .maybeSingle();
      if (client) {
        next.clientName = client.contact_person
          ? `${client.company_name} · ${client.contact_person}`
          : client.company_name || "—";
      }
    }

    setRelations(next);
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
    if (!driveResult.error) setDriveFiles(Array.isArray(driveResult.data) ? driveResult.data : []);

    const errors = [checklistResult.error, commentsResult.error, activityResult.error, driveResult.error].filter(Boolean);
    setMessage(errors[0]?.message || null);
  };

  const resolveTask = async () => {
    const snapshot = readTaskTextSnapshot(legacyContentRef.current);
    const taskIdFromUrl = readTaskIdFromUrl();

    setLoading(true);
    setMessage(null);
    try {
      const { data: profileRows } = await (supabase as any)
        .from("profiles")
        .select("id,user_id,full_name,email,is_active")
        .order("full_name", { ascending: true })
        .limit(500);
      setProfiles(Array.isArray(profileRows) ? profileRows.filter((p) => p && p.is_active !== false) : []);

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

      const loadedTask = rows[0] as TaskRow;
      setTask(loadedTask);
      setDraft({
        title: loadedTask.title || "",
        description: loadedTask.description || "",
        status: loadedTask.status || "To Do",
        priority: loadedTask.priority || "Medium",
        dueDate: loadedTask.due_date || "",
        assignedTo: loadedTask.assigned_to || UNASSIGNED_VALUE,
      });

      await Promise.all([loadRelations(loadedTask), loadTaskDetails(loadedTask.id)]);
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
  }, [open, children]);

  const updateTask = async (patch: Record<string, string | null>) => {
    if (!task?.id) return;
    setSaving(true);
    const { error } = await (supabase as any).from("tasks").update(patch).eq("id", task.id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo actualizar la tarea.");
      return;
    }
    const next = { ...task, ...patch } as TaskRow;
    setTask(next);
    await loadTaskDetails(task.id);
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
    const url = file.web_view_link || file.web_content_link;
    if (!url) return toast.info("Este archivo no tiene enlace disponible.");
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[1180px] sm:rounded-[24px] sm:border">
          <div ref={legacyContentRef} className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0">
            {children}
          </div>

          <div className="flex h-full min-h-0 flex-col bg-white sm:max-h-[92vh]">
            <div className="sticky top-0 z-20 border-b bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {editing ? (
                      <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="h-10 max-w-xl text-lg font800" />
                    ) : (
                      <h2 className="truncate text-[22px] font-extrabold tracking-[-0.035em] text-slate-950">
                        {task?.title || "Cargando tarea..."}
                      </h2>
                    )}
                    {task ? <StatusBadge status={task.status} /> : null}
                  </div>

                  <div className="mt-3 grid max-w-2xl grid-cols-1 overflow-hidden rounded-xl border bg-white shadow-sm sm:grid-cols-3">
                    <div className="flex items-center gap-3 border-b p-3 sm:border-b-0 sm:border-r">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50"><Flag className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-500">Priority</div>
                        {editing ? (
                          <Select value={draft.priority} onValueChange={(value) => setDraft((d) => ({ ...d, priority: value }))}>
                            <SelectTrigger className="mt-1 h-8 border-0 p-0 font-bold shadow-none"><SelectValue /></SelectTrigger>
                            <SelectContent>{TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : <div className="text-sm font-extrabold text-slate-900">{task?.priority || "—"}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 border-b p-3 sm:border-b-0 sm:border-r">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50"><CalendarDays className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-500">Due date</div>
                        {editing ? <Input type="date" value={draft.dueDate} onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))} className="mt-1 h-8 border-0 p-0 font-bold shadow-none" /> : <div className="text-sm font-extrabold text-slate-900">{formatDate(task?.due_date)}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50"><User className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-500">Assignee</div>
                        {editing ? (
                          <Select value={draft.assignedTo} onValueChange={(value) => setDraft((d) => ({ ...d, assignedTo: value }))}>
                            <SelectTrigger className="mt-1 h-8 border-0 p-0 font-bold shadow-none"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED_VALUE}>Sin asignar</SelectItem>
                              {profiles.map((p) => <SelectItem key={p.id} value={String(p.user_id || p.id)}>{String(p.full_name || p.email || "Usuario")}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : <div className="truncate text-sm font-extrabold text-slate-900">{assigneeLabel}</div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {editing ? (
                    <>
                      <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                      <Button onClick={() => void saveInlineEdit()} disabled={saving}>Guardar</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => void updateTask({ status: "Completed" })} disabled={!task?.id || task.status === "Completed"}>
                        <Check className="mr-2 h-4 w-4" /> Marcar completada
                      </Button>
                      <Button variant="outline" onClick={() => void updateTask({ status: "In Progress" })} disabled={!task?.id || task.status === "In Progress"}>
                        <Circle className="mr-2 h-4 w-4" /> En progreso
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(true)} disabled={!task?.id}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X className="h-5 w-5" /></Button>
                </div>
              </div>
            </div>

            <div className="border-b bg-white px-5 py-4 sm:px-6">
              {editing ? (
                <Textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className="min-h-[78px]" placeholder="Descripción de la tarea..." />
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-900">{task?.description || "Sin descripción."}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Task ID: {task?.id ? task.id.slice(0, 8) : "—"} · Creada {formatDate(task?.created_at)}</p>
                </>
              )}
              {message ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{message}</div> : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
              {loading && !task ? (
                <div className="rounded-2xl border bg-white p-6 text-sm font-semibold text-slate-500">Cargando detalle de tarea...</div>
              ) : (
                <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
                  <div className="grid content-start gap-4">
                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-950">Checklist / Subtasks</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Divide la tarea en pasos accionables.</p>
                        </div>
                        <div className="min-w-[130px] text-right">
                          <div className="text-xs font-extrabold text-slate-900">{completedChecklist} / {checklist.length} complete</div>
                          <Progress value={checklistProgress} className="mt-2 h-1.5" />
                        </div>
                      </div>
                      <div className="mb-3 flex gap-2">
                        <Input value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addChecklistItem(); }} placeholder="Add a subtask..." />
                        <Button variant="outline" onClick={() => void addChecklistItem()} disabled={!task?.id || saving || !newChecklistTitle.trim()}><Plus className="mr-2 h-4 w-4" /> Add</Button>
                      </div>
                      {checklist.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm font-medium text-slate-500">No hay subtareas todavía.</div>
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
                      <div className="mb-4">
                        <h3 className="text-sm font-extrabold text-slate-950">Activity Timeline</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Historial de cambios, checklist y notas de esta tarea.</p>
                      </div>
                      {activity.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm font-medium text-slate-500">Todavía no hay actividad registrada.</div>
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

                  <aside className="grid content-start gap-4">
                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><FolderKanban className="h-4 w-4" /> Context / Relations</h3>
                      <div className="mt-4 divide-y border-t">
                        {[['Project', relations.projectName], ['Client', relations.clientName], ['Product', relations.productName]].map(([label, value]) => (
                          <div key={label} className="grid min-h-[44px] grid-cols-[80px_minmax(0,1fr)_24px] items-center gap-2 text-sm">
                            <div className="font-semibold text-slate-500">{label}</div>
                            <div className="truncate font-bold text-slate-900">{value}</div>
                            <ExternalLink className="h-4 w-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><FileText className="h-4 w-4" /> Drive Files</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Archivos adjuntos de trabajo.</p>
                        </div>
                        <div className="flex gap-2"><Button size="sm" variant="outline"><Upload className="mr-2 h-4 w-4" />Upload</Button><Button size="sm" variant="outline"><Link2 className="h-4 w-4" /></Button></div>
                      </div>
                      {driveFiles.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm font-medium text-slate-500">No hay archivos adjuntos todavía.</div>
                      ) : (
                        <div className="space-y-2">
                          {driveFiles.map((file) => {
                            const url = file.web_view_link || file.web_content_link;
                            const previewUrl = getGoogleDrivePreviewUrl(url, file.drive_file_id);
                            return (
                              <div key={file.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-slate-50 p-2.5">
                                <div className="grid h-9 w-9 place-items-center rounded-xl border bg-white text-slate-500">{file.icon_link ? <img src={file.icon_link} alt="" className="h-5 w-5" /> : <Paperclip className="h-4 w-4" />}</div>
                                <div className="min-w-0"><div className="truncate text-sm font-extrabold text-slate-900">{file.name}</div><div className="text-xs font-semibold text-slate-500">{formatBytes(file.size_bytes)} · {formatDate(file.created_at)}</div></div>
                                <div className="flex items-center gap-1">
                                  {previewUrl ? <Button size="sm" variant="outline" onClick={() => setPreviewFile({ url: previewUrl, title: file.name })}>Preview</Button> : null}
                                  {url ? <Button size="icon" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : null}
                                  <Button size="icon" variant="outline" onClick={() => void copyFileLink(file)}><Copy className="h-4 w-4" /></Button>
                                  <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border bg-white p-4 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950"><MessageSquare className="h-4 w-4" /> Internal Comments</h3>
                      <div className="mt-3 space-y-2">
                        <Textarea value={newCommentBody} onChange={(e) => setNewCommentBody(e.target.value)} placeholder="Write an internal comment..." className="min-h-[86px]" />
                        <div className="flex justify-end"><Button onClick={() => void addComment()} disabled={!task?.id || saving || !newCommentBody.trim()}>Add comment</Button></div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {comments.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm font-medium text-slate-500">No hay comentarios todavía.</div> : comments.map((comment) => (
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
