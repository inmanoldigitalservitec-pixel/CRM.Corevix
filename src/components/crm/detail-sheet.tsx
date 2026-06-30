import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

interface DetailField {
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "badge" | "tags" | "currency";
}

type DetailSheetSize = "md" | "lg";

type TaskQuickEditState = {
  enabled: boolean;
  id: string | null;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  resolving: boolean;
  saving: boolean;
  message: string | null;
};

type QuickProfile = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
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

interface DetailSheetProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  status?: string;
  badges?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "blue" | "green" | "violet" | "orange" | "amber" | "slate";
  size?: DetailSheetSize;
  fields?: DetailField[];
  fieldGroupDataDemo?: string;
  notes?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const ACCENT_CLASS: Record<NonNullable<DetailSheetProps["accent"]>, string> = {
  blue: "from-blue-600/30 via-blue-500/10 to-transparent",
  green: "from-emerald-600/30 via-emerald-500/10 to-transparent",
  violet: "from-violet-600/30 via-violet-500/10 to-transparent",
  orange: "from-orange-600/30 via-orange-500/10 to-transparent",
  amber: "from-amber-600/30 via-amber-500/10 to-transparent",
  slate: "from-slate-600/30 via-slate-500/10 to-transparent",
};

const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const UNASSIGNED_VALUE = "__unassigned__";

function getSheetWidth(size: DetailSheetSize | undefined) {
  if (size === "lg") return "w-full sm:max-w-[640px]";
  return "w-full sm:max-w-[520px]";
}

function getGoogleDrivePreviewUrl(rawHref: string | null | undefined) {
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

function readTaskIdFromUrl() {
  if (typeof window === "undefined") return null;
  try {
    const value = new URLSearchParams(window.location.search).get("taskId");
    return value && value.trim().length ? value.trim() : null;
  } catch {
    return null;
  }
}

function readTaskTextSnapshot(root: HTMLDivElement) {
  const title = root.querySelector("h2")?.textContent?.trim() || "";
  const description = root.querySelector("h2 + p")?.textContent?.trim() || "";
  const labels = Array.from(root.querySelectorAll(".rounded-xl .text-xs.font-semibold.text-slate-500"));
  const readValue = (label: string) => {
    const found = labels.find((node) => node.textContent?.trim().toLowerCase() === label.toLowerCase());
    return found?.parentElement?.querySelector(".mt-1")?.textContent?.trim() || "";
  };

  return {
    title,
    description: description === "Sin descripción." ? "" : description,
    priority: readValue("Prioridad") || "Medium",
    dueDate: readValue("Vence") === "—" ? "" : readValue("Vence"),
  };
}

export function DetailSheet({
  open,
  onClose,
  onOpenChange,
  title,
  subtitle,
  status,
  badges,
  icon,
  accent = "slate",
  size = "md",
  fields = [],
  fieldGroupDataDemo,
  notes,
  onEdit,
  onDelete,
  actions,
  children,
}: DetailSheetProps) {
  const { t } = useT();
  const customDialogContentRef = useRef<HTMLDivElement | null>(null);
  const [drivePreview, setDrivePreview] = useState<{ url: string; title: string } | null>(null);
  const [profiles, setProfiles] = useState<QuickProfile[]>([]);
  const [taskQuickEdit, setTaskQuickEdit] = useState<TaskQuickEditState>({
    enabled: false,
    id: null,
    title: "",
    status: "To Do",
    priority: "Medium",
    dueDate: "",
    assignedTo: UNASSIGNED_VALUE,
    resolving: false,
    saving: false,
    message: null,
  });
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabSaving, setCollabSaving] = useState(false);
  const [collabMessage, setCollabMessage] = useState<string | null>(null);

  const hasHeaderContent = Boolean(title || subtitle || status || badges || icon || actions || onEdit || onDelete);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen) onClose?.();
  };

  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  useEffect(() => {
    if (!open) {
      setDrivePreview(null);
      setTaskQuickEdit((current) => ({ ...current, enabled: false, id: null, message: null }));
      setChecklist([]);
      setComments([]);
      setNewChecklistTitle("");
      setNewCommentBody("");
      setCollabMessage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasHeaderContent || fields.length > 0) return;
    const timer = window.setTimeout(() => {
      const root = customDialogContentRef.current;
      if (!root) return;
      const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href*="drive.google.com"], a[href*="docs.google.com"]'));
      for (const anchor of anchors) {
        const previewUrl = getGoogleDrivePreviewUrl(anchor.href);
        if (!previewUrl) continue;
        const actionsContainer = anchor.parentElement;
        if (!actionsContainer || actionsContainer.querySelector("[data-corevix-drive-preview-button]")) continue;
        const fileCard = anchor.closest(".rounded-xl");
        const fileTitle = fileCard?.querySelector(".truncate")?.textContent?.trim() || anchor.getAttribute("aria-label") || "Vista previa de Drive";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Preview";
        button.setAttribute("data-corevix-drive-preview-button", "true");
        button.className = "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-950";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setDrivePreview({ url: previewUrl, title: fileTitle });
        });
        actionsContainer.insertBefore(button, anchor);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, hasHeaderContent, fields.length, children]);

  useEffect(() => {
    if (!open || hasHeaderContent || fields.length > 0) return;
    const timer = window.setTimeout(() => {
      const root = customDialogContentRef.current;
      if (!root) return;
      const text = root.textContent || "";
      const isTaskDetail = text.includes("Archivos de Drive") && text.includes("Tarea");
      if (!isTaskDetail) return;
      const snapshot = readTaskTextSnapshot(root);
      if (!snapshot.title) return;
      setTaskQuickEdit((current) => ({ ...current, enabled: true, title: snapshot.title, priority: snapshot.priority, dueDate: snapshot.dueDate, resolving: true, message: "Preparando edición rápida..." }));
      void (async () => {
        try {
          const { data: profileRows } = await (supabase as any).from("profiles").select("id,user_id,full_name,email,is_active").order("full_name", { ascending: true }).limit(500);
          setProfiles(Array.isArray(profileRows) ? profileRows.filter((p) => p && p.is_active !== false) : []);
          const taskIdFromUrl = readTaskIdFromUrl();
          let taskQuery = (supabase as any).from("tasks").select("id,title,status,priority,due_date,assigned_to,description").limit(2);
          if (taskIdFromUrl) {
            taskQuery = taskQuery.eq("id", taskIdFromUrl);
          } else {
            taskQuery = taskQuery.eq("title", snapshot.title);
            if (snapshot.description) taskQuery = taskQuery.eq("description", snapshot.description);
            if (snapshot.priority) taskQuery = taskQuery.eq("priority", snapshot.priority);
            if (snapshot.dueDate) taskQuery = taskQuery.eq("due_date", snapshot.dueDate);
          }
          const { data, error } = await taskQuery;
          if (error) throw error;
          const rows = Array.isArray(data) ? data : [];
          if (rows.length !== 1) {
            setTaskQuickEdit((current) => ({ ...current, resolving: false, id: null, message: taskIdFromUrl ? "No pude cargar esta tarea para edición rápida." : "Edición rápida disponible mejor desde /tasks?taskId=..." }));
            return;
          }
          const task = rows[0];
          setTaskQuickEdit({ enabled: true, id: String(task.id), title: String(task.title || snapshot.title), status: String(task.status || "To Do"), priority: String(task.priority || "Medium"), dueDate: String(task.due_date || ""), assignedTo: task.assigned_to ? String(task.assigned_to) : UNASSIGNED_VALUE, resolving: false, saving: false, message: null });
        } catch (error: any) {
          setTaskQuickEdit((current) => ({ ...current, resolving: false, id: null, message: error?.message || "No se pudo preparar la edición rápida." }));
        }
      })();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open, hasHeaderContent, fields.length, children]);

  const loadTaskCollaboration = async (taskId: string) => {
    setCollabLoading(true);
    setCollabMessage(null);
    try {
      const [checklistResult, commentsResult] = await Promise.all([
        (supabase as any).from("task_checklist_items").select("id,task_id,title,is_completed,order_index,created_at").eq("task_id", taskId).order("order_index", { ascending: true }).order("created_at", { ascending: true }),
        (supabase as any).from("task_comments").select("id,task_id,body,created_by,created_at").eq("task_id", taskId).order("created_at", { ascending: false }).limit(50),
      ]);
      if (checklistResult.error) throw checklistResult.error;
      if (commentsResult.error) throw commentsResult.error;
      setChecklist(Array.isArray(checklistResult.data) ? checklistResult.data : []);
      setComments(Array.isArray(commentsResult.data) ? commentsResult.data : []);
    } catch (error: any) {
      setCollabMessage(error?.message || "No se pudieron cargar checklist y comentarios.");
    } finally {
      setCollabLoading(false);
    }
  };

  useEffect(() => {
    if (!taskQuickEdit.id) return;
    void loadTaskCollaboration(taskQuickEdit.id);
  }, [taskQuickEdit.id]);

  const updateTaskQuickField = async (patch: Record<string, string | null>) => {
    if (!taskQuickEdit.id) {
      toast.error("No pude identificar esta tarea para editarla rápido.");
      return;
    }
    setTaskQuickEdit((current) => ({ ...current, saving: true, message: "Guardando..." }));
    const { error } = await (supabase as any).from("tasks").update(patch).eq("id", taskQuickEdit.id);
    if (error) {
      setTaskQuickEdit((current) => ({ ...current, saving: false, message: error.message }));
      toast.error(error.message || "No se pudo actualizar la tarea.");
      return;
    }
    setTaskQuickEdit((current) => ({
      ...current,
      status: patch.status !== undefined ? String(patch.status || "To Do") : current.status,
      priority: patch.priority !== undefined ? String(patch.priority || "Medium") : current.priority,
      dueDate: patch.due_date !== undefined ? String(patch.due_date || "") : current.dueDate,
      assignedTo: patch.assigned_to !== undefined ? String(patch.assigned_to || UNASSIGNED_VALUE) : current.assignedTo,
      saving: false,
      message: "Guardado. Los datos se reflejarán al refrescar o reabrir la tarea.",
    }));
    toast.success("Tarea actualizada.");
  };

  const addChecklistItem = async () => {
    const title = newChecklistTitle.trim();
    if (!taskQuickEdit.id || !title) return;
    setCollabSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("task_checklist_items").insert({ task_id: taskQuickEdit.id, title, order_index: checklist.length + 1, created_by: userData?.user?.id || null });
    setCollabSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo agregar el item.");
      return;
    }
    setNewChecklistTitle("");
    await loadTaskCollaboration(taskQuickEdit.id);
  };

  const toggleChecklistItem = async (item: TaskChecklistItem) => {
    const { error } = await (supabase as any).from("task_checklist_items").update({ is_completed: !item.is_completed, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) {
      toast.error(error.message || "No se pudo actualizar el checklist.");
      return;
    }
    setChecklist((current) => current.map((row) => (row.id === item.id ? { ...row, is_completed: !item.is_completed } : row)));
  };

  const deleteChecklistItem = async (item: TaskChecklistItem) => {
    const { error } = await (supabase as any).from("task_checklist_items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message || "No se pudo borrar el item.");
      return;
    }
    setChecklist((current) => current.filter((row) => row.id !== item.id));
  };

  const addComment = async () => {
    const body = newCommentBody.trim();
    if (!taskQuickEdit.id || !body) return;
    setCollabSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("task_comments").insert({ task_id: taskQuickEdit.id, body, created_by: userData?.user?.id || null });
    setCollabSaving(false);
    if (error) {
      toast.error(error.message || "No se pudo agregar el comentario.");
      return;
    }
    setNewCommentBody("");
    await loadTaskCollaboration(taskQuickEdit.id);
  };

  const renderTaskQuickActions = () => {
    if (!taskQuickEdit.enabled) return null;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Acciones rápidas</div>
            <div className="text-xs text-slate-500">Cambia estado, prioridad, vencimiento y responsable sin abrir el editor completo.</div>
          </div>
          {taskQuickEdit.saving || taskQuickEdit.resolving ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">{taskQuickEdit.saving ? "Guardando..." : "Cargando..."}</span> : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs font-semibold text-slate-500">Estado<select value={taskQuickEdit.status} disabled={!taskQuickEdit.id || taskQuickEdit.saving || taskQuickEdit.resolving} onChange={(event) => void updateTaskQuickField({ status: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 disabled:opacity-60">{TASK_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500">Prioridad<select value={taskQuickEdit.priority} disabled={!taskQuickEdit.id || taskQuickEdit.saving || taskQuickEdit.resolving} onChange={(event) => void updateTaskQuickField({ priority: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 disabled:opacity-60">{TASK_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500">Vencimiento<input type="date" value={taskQuickEdit.dueDate} disabled={!taskQuickEdit.id || taskQuickEdit.saving || taskQuickEdit.resolving} onChange={(event) => void updateTaskQuickField({ due_date: event.target.value || null })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 disabled:opacity-60" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500">Responsable<select value={taskQuickEdit.assignedTo} disabled={!taskQuickEdit.id || taskQuickEdit.saving || taskQuickEdit.resolving} onChange={(event) => void updateTaskQuickField({ assigned_to: event.target.value === UNASSIGNED_VALUE ? null : event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 disabled:opacity-60"><option value={UNASSIGNED_VALUE}>Sin asignar</option>{profiles.map((profile) => <option key={profile.id} value={String(profile.user_id || profile.id)}>{String(profile.full_name || profile.email || "Usuario")}</option>)}</select></label>
        </div>
        {taskQuickEdit.message ? <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{taskQuickEdit.message}</div> : null}
      </div>
    );
  };

  const renderTaskCollaboration = () => {
    if (!taskQuickEdit.enabled) return null;
    const completed = checklist.filter((item) => item.is_completed).length;
    return (
      <div className="grid grid-cols-1 gap-5 lg:col-span-2 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Checklist / subtareas</div>
              <div className="text-xs text-slate-500">{checklist.length ? `${completed}/${checklist.length} completadas` : "Divide la tarea en pasos accionables."}</div>
            </div>
            {collabLoading ? <span className="text-xs font-semibold text-slate-400">Cargando...</span> : null}
          </div>
          <div className="mb-3 flex gap-2">
            <input value={newChecklistTitle} onChange={(event) => setNewChecklistTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addChecklistItem(); }} placeholder="Nueva subtarea" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" />
            <Button type="button" size="sm" variant="outline" disabled={!taskQuickEdit.id || collabSaving || !newChecklistTitle.trim()} onClick={() => void addChecklistItem()}>Agregar</Button>
          </div>
          {checklist.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No hay subtareas todavía.</div> : <div className="space-y-2">{checklist.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl border bg-slate-50 p-2.5"><input type="checkbox" checked={item.is_completed} onChange={() => void toggleChecklistItem(item)} className="h-4 w-4 shrink-0" /><span className={"min-w-0 flex-1 text-sm font-medium " + (item.is_completed ? "text-slate-400 line-through" : "text-slate-800")}>{item.title}</span><button type="button" onClick={() => void deleteChecklistItem(item)} className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Borrar</button></div>)}</div>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-900">Comentarios / notas internas</div>
            <div className="text-xs text-slate-500">Registra avances, decisiones o instrucciones de trabajo.</div>
          </div>
          <textarea value={newCommentBody} onChange={(event) => setNewCommentBody(event.target.value)} placeholder="Escribe una nota interna..." className="mb-2 min-h-[86px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <div className="mb-3 flex justify-end"><Button type="button" size="sm" disabled={!taskQuickEdit.id || collabSaving || !newCommentBody.trim()} onClick={() => void addComment()}>Agregar nota</Button></div>
          {comments.length === 0 ? <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No hay comentarios todavía.</div> : <div className="max-h-[320px] space-y-2 overflow-auto pr-1">{comments.map((comment) => <div key={comment.id} className="rounded-xl border bg-slate-50 p-3"><div className="mb-1 text-[11px] font-semibold text-slate-400">{new Date(comment.created_at).toLocaleString()}</div><div className="whitespace-pre-wrap text-sm text-slate-700">{comment.body}</div></div>)}</div>}
        </div>
        {collabMessage ? <div className="lg:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{collabMessage}</div> : null}
      </div>
    );
  };

  if (!hasHeaderContent && fields.length === 0 && children) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[1180px] sm:rounded-3xl sm:border">
            <ScrollArea className="h-full max-h-[100dvh] sm:max-h-[92vh]">
              <div ref={customDialogContentRef} className="p-3 sm:p-5 [&>div]:grid [&>div]:grid-cols-1 [&>div]:gap-5 [&>div]:space-y-0 lg:[&>div]:grid-cols-[minmax(0,1fr)_390px] lg:[&>div>*:first-child]:col-span-2 [&>div>*:first-child]:sticky [&>div>*:first-child]:top-0 [&>div>*:first-child]:z-20 [&>div>*:first-child]:shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                {renderTaskQuickActions()}
                {renderTaskCollaboration()}
                {children}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={!!drivePreview} onOpenChange={(nextOpen) => !nextOpen && setDrivePreview(null)}>
          <DialogContent className="h-[92dvh] w-[calc(100vw-20px)] max-w-[1040px] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Preview de Drive</div><div className="truncate text-sm font-semibold text-slate-900">{drivePreview?.title || "Archivo"}</div></div><Button type="button" variant="outline" size="sm" onClick={() => setDrivePreview(null)}>Cerrar</Button></div>
            {drivePreview?.url ? <iframe src={drivePreview.url} title={drivePreview.title || "Preview de Drive"} className="h-[calc(92dvh-57px)] w-full border-0 bg-slate-100" allow="autoplay" /> : null}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className={getSheetWidth(size) + " p-0"}>
        {hasHeaderContent ? (
          <SheetHeader className="relative border-b px-5 py-4 text-left">
            <div className={"pointer-events-none absolute inset-x-0 top-0 h-[84px] bg-gradient-to-b " + ACCENT_CLASS[accent]} />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {icon ? <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-background/85 shadow-[0_12px_24px_rgba(15,23,42,.06)]">{icon}</div> : null}
                <div className="min-w-0">
                  {title ? <SheetTitle className="text-[18px] font-semibold tracking-[-0.02em] truncate">{title}</SheetTitle> : null}
                  {subtitle ? <p className="mt-0.5 text-[13px] text-muted-foreground truncate">{subtitle}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">{status ? <StatusBadge status={status} /> : null}{badges ? badges : null}</div>
                </div>
              </div>
              <button type="button" onClick={handleClose} className="grid h-9 w-9 place-items-center rounded-[12px] border bg-background/90 text-muted-foreground shadow-[0_10px_22px_rgba(15,23,42,.06)] transition hover:-translate-y-[1px] hover:bg-background" aria-label={t("common.close")} title={t("common.close")}><X className="h-4 w-4" /></button>
            </div>
            <div className="relative mt-3 flex flex-wrap items-center gap-2">
              {actions ? actions : <>{onEdit ? <Button variant="outline" size="sm" onClick={onEdit} className="h-8 gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> {t("common.edit")}</Button> : null}{onDelete ? <Button variant="outline" size="sm" onClick={onDelete} className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}</Button> : null}</>}
            </div>
          </SheetHeader>
        ) : null}

        <ScrollArea className={hasHeaderContent ? "h-[calc(100vh-118px)]" : "h-screen"}>
          <div className="p-4 space-y-3">
            {fields.length > 0 ? (
              <div data-demo={fieldGroupDataDemo} className="grid grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.label} className={f.type === "tags" ? "col-span-2" : ""}>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{f.label}</span>
                    {f.type === "badge" && f.value ? <div className="mt-1"><StatusBadge status={String(f.value)} /></div> : f.type === "currency" ? <p className="text-sm font-semibold mt-0.5">${Number(f.value || 0).toLocaleString()}</p> : f.type === "tags" && f.value ? <div className="flex flex-wrap gap-1 mt-1">{String(f.value).split(",").map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.trim()}</span>)}</div> : <p className="text-sm font-medium mt-0.5">{f.value || t("common.none")}</p>}
                  </div>
                ))}
              </div>
            ) : null}
            {notes && <><Separator /><div><span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{t("common.notes")}</span><p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">{notes}</p></div></>}
            {children && <>{children}</>}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
