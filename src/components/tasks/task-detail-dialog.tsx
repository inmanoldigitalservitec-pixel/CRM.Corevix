import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type Dispatch,
  type DragEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronDown,
  Check,
  Circle,
  Clock3,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  Flag,
  FolderKanban,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Quote,
  RemoveFormatting,
  Star,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  description_html?: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  related_project_id: string | null;
  related_client_id: string | null;
  related_proposal_id?: string | null;
  created_at: string;
  company_id: string;
};

type TaskEditorDraft = {
  title: string;
  description: string;
  descriptionHtml: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  assigneeIds: string[];
  projectId: string;
  clientId: string;
  leadId: string;
  dealId: string;
};

type QuickProfile = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  is_active?: boolean | null;
};
type TaskAssigneeRow = {
  id: string;
  task_id: string;
  user_id: string;
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
  file_purpose?: "resource" | "deliverable" | null;
  created_at: string;
};

type PendingTaskResource =
  | { id: string; type: "file"; file: File; name: string; size: number }
  | {
      id: string;
      type: "link";
      url: string;
      driveId: string;
      driveType: "file" | "folder" | "unknown";
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
  resourceDriveUrlInput?: string;
  isUploadingFile?: boolean;
  isUploadingResourceFile?: boolean;
  uploadProgress?: number;
  resourceUploadProgress?: number;
  uploadingFileName?: string;
  uploadingResourceFileName?: string;
  canEdit?: boolean;
  fileInputRef?: RefObject<HTMLInputElement | null>;
  resourceFileInputRef?: RefObject<HTMLInputElement | null>;

  onUpdateTask?: (taskId: string, patch: Partial<TaskRow>) => Promise<void>;
  onAssigneesChanged?: () => void | Promise<void>;
  onComplete?: () => void | Promise<void>;
  onSetInProgress?: () => void | Promise<void>;
  onDriveUrlChange?: (value: string) => void;
  onResourceDriveUrlChange?: (value: string) => void;
  onAttachDriveUrl?: () => void | Promise<void>;
  onAttachResourceDriveUrl?: () => void | Promise<void>;
  onUploadClick?: () => void;
  onUploadResourceClick?: () => void;
  onFilePicked?: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onResourceFilePicked?: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onFileDropped?: (file: File) => void | Promise<void>;
  onResourceFileDropped?: (file: File) => void | Promise<void>;
  onCopyFileLink?: (file: DriveFileRow) => void | Promise<void>;
  onDeleteDriveFile?: (file: DriveFileRow) => void | Promise<void>;
};

type TaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string | null;
  currentUserId?: string | null;
  profiles?: QuickProfile[];
  initialValues?: Partial<TaskEditorDraft>;
  relatedProposalId?: string | null;
  onCreated?: (task: TaskRow) => void | Promise<void>;
  canCreate?: boolean;
};

const TASK_STATUSES = ["To Do", "In Progress", "Completed", "Cancelled"];
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const UNASSIGNED_VALUE = "__unassigned__";
const NO_PROJECT_VALUE = "__no_project__";
const NO_CLIENT_VALUE = "__no_client__";
const EMPTY_PROFILES: QuickProfile[] = [];
const RICH_TEXT_COLORS = ["#0f172a", "#475569", "#2563eb", "#059669", "#d97706", "#dc2626"];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextToHtml(value: string) {
  const text = value.trim();
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function richTextToPlainText(html: string) {
  if (!html) return "";
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.replace(/\u00a0/g, " ").trim() || "";
}

function safeHref(value: string | null) {
  const href = String(value || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  return "";
}

function safeRichTextColor(value: string | null) {
  const color = String(value || "")
    .trim()
    .toLowerCase();
  return RICH_TEXT_COLORS.includes(color) ? color : "";
}

function sanitizeRichTextHtml(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (typeof DOMParser === "undefined") return plainTextToHtml(raw);

  const doc = new DOMParser().parseFromString(raw, "text/html");

  const walk = (node: ChildNode): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map(walk).join("");

    if (["script", "style", "iframe", "object", "embed", "svg", "canvas"].includes(tag)) {
      return "";
    }
    if (["b", "strong"].includes(tag)) return `<strong>${children}</strong>`;
    if (["i", "em"].includes(tag)) return `<em>${children}</em>`;
    if (tag === "u") return `<u>${children}</u>`;
    if (["s", "strike"].includes(tag)) return `<s>${children}</s>`;
    if (tag === "br") return "<br>";
    if (["ul", "ol", "li", "blockquote", "code", "pre"].includes(tag)) {
      return `<${tag}>${children}</${tag}>`;
    }
    if (["h1", "h2", "h3", "h4"].includes(tag)) return `<${tag}>${children}</${tag}>`;
    if (tag === "a") {
      const href = safeHref(element.getAttribute("href"));
      return href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${children}</a>`
        : children;
    }
    if (["p", "div", "section", "article"].includes(tag)) return `<p>${children || "<br>"}</p>`;
    if (["span", "font"].includes(tag)) {
      const color =
        safeRichTextColor(element.getAttribute("color")) ||
        safeRichTextColor(element.style?.color || null);
      return color ? `<span style="color:${color}">${children}</span>` : children;
    }
    if (["table", "thead", "tbody", "tr"].includes(tag)) return children;
    if (["td", "th"].includes(tag)) return `<p>${children}</p>`;
    return children;
  };

  return Array.from(doc.body.childNodes).map(walk).join("").trim();
}

function insertHtmlAtCursor(html: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (lastNode) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }
  return true;
}

function parseGoogleDriveUrl(
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

function uploadTaskFileWithProgress(args: {
  taskId: string;
  file: File;
  token: string;
  onProgress: (percent: number) => void;
  filePurpose?: "resource" | "deliverable";
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("task_id", args.taskId);
    body.append("file_purpose", args.filePurpose || "deliverable");
    body.append("file", args.file);

    xhr.open("POST", `${supabaseUrl}/functions/v1/drive-upload-file`);
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
        const detail = payload?.detail ? ` Detalle: ${String(payload.detail)}` : "";
        reject(
          new Error(`${payload?.error || "No se pudo subir el archivo a Google Drive"}${detail}`),
        );
        return;
      }
      resolve(payload);
    };
    xhr.send(body);
  });
}

function createEmptyTaskDraft(initialValues: Partial<TaskEditorDraft> = {}): TaskEditorDraft {
  return {
    title: initialValues.title || "",
    description: initialValues.description || "",
    descriptionHtml:
      initialValues.descriptionHtml || plainTextToHtml(initialValues.description || ""),
    status: initialValues.status || "To Do",
    priority: initialValues.priority || "Medium",
    dueDate: initialValues.dueDate || "",
    assignedTo: initialValues.assignedTo || UNASSIGNED_VALUE,
    assigneeIds: normalizeAssigneeIds(initialValues.assigneeIds || initialValues.assignedTo || []),
    projectId: initialValues.projectId || NO_PROJECT_VALUE,
    clientId: initialValues.clientId || NO_CLIENT_VALUE,
    leadId: initialValues.leadId || "",
    dealId: initialValues.dealId || "",
  };
}

function normalizeAssigneeIds(value: string | string[]) {
  const raw = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      raw
        .map((item) => String(item || "").trim())
        .filter((item) => item && item !== UNASSIGNED_VALUE),
    ),
  );
}

function primaryAssigneeId(assigneeIds: string[]) {
  return assigneeIds[0] || null;
}

function profileUserId(profile: QuickProfile) {
  return String(profile.user_id || profile.id);
}

function profileDisplayName(profile: QuickProfile) {
  return String(profile.full_name || profile.email || "Usuario");
}

function assigneeNamesFromIds(ids: string[], profiles: QuickProfile[]) {
  if (!ids.length) return "Sin asignar";
  return ids
    .map((id) => {
      const profile = profiles.find((item) => item.id === id || item.user_id === id);
      return profile ? profileDisplayName(profile) : "Usuario";
    })
    .join(", ");
}

async function syncTaskAssignees(args: {
  taskId: string;
  companyId: string;
  assigneeIds: string[];
}) {
  const assigneeIds = normalizeAssigneeIds(args.assigneeIds);
  const db = supabase as any;
  const { error: deleteError } = await db
    .from("task_assignees")
    .delete()
    .eq("task_id", args.taskId);
  if (deleteError) throw deleteError;
  if (!assigneeIds.length) return;
  const { data: userData } = await supabase.auth.getUser();
  const rows = assigneeIds.map((userId) => ({
    company_id: args.companyId,
    task_id: args.taskId,
    user_id: userId,
    created_by: userData?.user?.id || null,
  }));
  const { error: insertError } = await db.from("task_assignees").insert(rows);
  if (insertError) throw insertError;
}

async function fetchTaskRelationOptions(companyId: string) {
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

  return {
    projects: !projectResult.error && Array.isArray(projectResult.data) ? projectResult.data : [],
    clients: !clientResult.error && Array.isArray(clientResult.data) ? clientResult.data : [],
    products: !productResult.error && Array.isArray(productResult.data) ? productResult.data : [],
    error: projectResult.error || clientResult.error || productResult.error || null,
  };
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

function readTaskTextSnapshot(root: HTMLDivElement | null) {
  if (!root) return { title: "", description: "", priority: "Medium", dueDate: "" };
  const title = root.querySelector("h2")?.textContent?.trim() || "";
  const description = root.querySelector("h2 + p")?.textContent?.trim() || "";
  const labels = Array.from(
    root.querySelectorAll(".rounded-xl .text-xs.font-semibold.text-slate-500"),
  );
  const readValue = (label: string) => {
    const found = labels.find(
      (node) => node.textContent?.trim().toLowerCase() === label.toLowerCase(),
    );
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

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
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
    if (docsMatch?.[1] && docsMatch?.[2])
      return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
    const queryId = url.searchParams.get("id");
    if (queryId) return `https://drive.google.com/file/d/${queryId}/preview`;
    return null;
  } catch {
    return null;
  }
}

function clientLabel(client: ClientOption | null | undefined) {
  if (!client) return "—";
  return client.contact_person
    ? `${client.company_name} · ${client.contact_person}`
    : client.company_name || "—";
}

function projectBelongsToClient(project: ProjectOption | null | undefined, clientId: string) {
  if (!project) return true;
  if (clientId === NO_CLIENT_VALUE) return !project.client_id;
  return project.client_id === clientId;
}

function filterProjectsForClient(projects: ProjectOption[], clientId: string) {
  return projects.filter((project) => projectBelongsToClient(project, clientId));
}

function resolveProjectClientId(
  project: ProjectOption | null | undefined,
  fallbackClientId: string,
) {
  if (project?.client_id) return project.client_id;
  return fallbackClientId;
}

function eventIcon(type: string) {
  if (type.includes("comment")) return <MessageSquare className="h-4 w-4" />;
  if (type.includes("checklist")) return <Check className="h-4 w-4" />;
  if (type.includes("status")) return <Circle className="h-4 w-4" />;
  return <Flag className="h-4 w-4" />;
}

function priorityTone(priority: string | null | undefined) {
  const value = String(priority || "").toLowerCase();
  if (value === "urgent") return "text-red-600";
  if (value === "high") return "text-orange-600";
  if (value === "medium") return "text-blue-600";
  return "text-slate-700";
}

function renderEditField(label: string, control: ReactNode) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </span>
      {control}
    </label>
  );
}

function TaskFileDropZone({
  fileInputRef,
  linkValue,
  uploadingName,
  uploadProgress,
  disabled = false,
  compact = false,
  dropLabel = "Arrastra archivos aquí",
  uploadLabel = "Subir archivo",
  onLinkChange,
  onAddLink,
  onPickFile,
  onFileDrop,
  onUploadClick,
}: {
  fileInputRef?: RefObject<HTMLInputElement | null>;
  linkValue: string;
  uploadingName: string;
  uploadProgress: number;
  disabled?: boolean;
  compact?: boolean;
  dropLabel?: string;
  uploadLabel?: string;
  onLinkChange: (value: string) => void;
  onAddLink: () => void;
  onPickFile?: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileDrop?: (file: File) => void;
  onUploadClick: () => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFileDrop?.(file);
  };

  if (compact) {
    return (
      <div className="mb-2">
        {fileInputRef ? (
          <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} />
        ) : null}
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onUploadClick}
            disabled={disabled}
            aria-label={uploadLabel}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setLinkOpen((current) => !current)}
            disabled={disabled}
            aria-label="Agregar enlace"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
        {linkOpen ? (
          <div className="mt-2 flex gap-2">
            <Input
              value={linkValue}
              onChange={(event) => onLinkChange(event.target.value)}
              placeholder="Pega URL de Google Drive"
              className="h-9"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onAddLink();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={onAddLink}
              disabled={disabled || !linkValue.trim()}
              aria-label="Adjuntar enlace"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        {uploadingName ? (
          <div className="mt-2 rounded-lg border bg-slate-50 px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-600">
              <span className="truncate">Subiendo {uploadingName}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={
        "mb-3 rounded-2xl border border-dashed px-4 py-6 text-center transition " +
        (dragActive
          ? "border-blue-400 bg-blue-50/70"
          : "border-slate-300 bg-slate-50/60 hover:bg-slate-50")
      }
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {fileInputRef ? (
        <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} />
      ) : null}
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border bg-white text-slate-500 shadow-sm">
        <Upload className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-extrabold text-slate-700">{dropLabel}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onUploadClick}
          disabled={disabled}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setLinkOpen((current) => !current)}
          disabled={disabled}
        >
          <Link2 className="mr-2 h-4 w-4" />
          Agregar enlace
        </Button>
      </div>
      {linkOpen ? (
        <div className="mx-auto mt-4 flex max-w-xl gap-2">
          <Input
            value={linkValue}
            onChange={(event) => onLinkChange(event.target.value)}
            placeholder="Pega URL de Google Drive"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddLink();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddLink}
            disabled={disabled || !linkValue.trim()}
            aria-label="Adjuntar enlace"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      {uploadingName ? (
        <div className="mx-auto mt-4 max-w-xl rounded-xl border bg-white p-3 text-left">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <span className="truncate">Subiendo {uploadingName}</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      ) : null}
    </div>
  );
}

function TaskRichTextEditor({
  html,
  plainText,
  onChange,
  className = "",
}: {
  html: string;
  plainText: string;
  onChange: (next: { html: string; text: string }) => void;
  className?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const focusedRef = useRef(false);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (!editorRef.current || focusedRef.current) return;
    editorRef.current.innerHTML = sanitizeRichTextHtml(html) || plainTextToHtml(plainText);
  }, [html, plainText]);

  const sync = () => {
    const nextHtml = sanitizeRichTextHtml(editorRef.current?.innerHTML || "");
    onChange({ html: nextHtml, text: richTextToPlainText(nextHtml) });
  };

  const rememberSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = selectionRef.current;
    if (!selection || !range) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const applyCommand = (
    command:
      | "bold"
      | "italic"
      | "underline"
      | "strikeThrough"
      | "insertUnorderedList"
      | "insertOrderedList"
      | "removeFormat",
  ) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command);
    rememberSelection();
    sync();
  };

  const applyBlock = (block: "p" | "h2" | "blockquote") => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("formatBlock", false, block);
    rememberSelection();
    sync();
  };

  const applyColor = (color: string) => {
    const nextColor = safeRichTextColor(color);
    if (!nextColor) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("foreColor", false, nextColor);
    rememberSelection();
    sync();
  };

  const insertLink = () => {
    const selectedText = selectionRef.current?.toString().trim();
    const url = window.prompt("Pega el enlace");
    const href = safeHref(url);
    if (!href) return;
    editorRef.current?.focus();
    const restored = restoreSelection();
    if (restored && selectedText) {
      document.execCommand("createLink", false, href);
    } else {
      insertHtmlAtCursor(
        `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(href)}</a>`,
      );
    }
    rememberSelection();
    sync();
  };

  const toolbarButtonClass =
    "h-8 w-8 shrink-0 rounded-lg px-0 text-slate-600 hover:bg-slate-100 hover:text-slate-950";
  const separator = <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rawHtml = event.clipboardData.getData("text/html");
    const rawText = event.clipboardData.getData("text/plain");
    const nextHtml = sanitizeRichTextHtml(rawHtml || plainTextToHtml(rawText));
    if (!nextHtml) return;
    if (!insertHtmlAtCursor(nextHtml)) {
      editorRef.current?.insertAdjacentHTML("beforeend", nextHtml);
    }
    rememberSelection();
    sync();
  };

  return (
    <div
      className={`flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white ${className}`}
    >
      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-2 py-1.5"
        onMouseDown={(event) => event.preventDefault()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyBlock("p")}
          aria-label="Texto normal"
          title="Texto normal"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyBlock("h2")}
          aria-label="Título"
          title="Título"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        {separator}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`${toolbarButtonClass} font-bold`}
          onClick={() => applyCommand("bold")}
          aria-label="Negrita"
          title="Negrita"
        >
          B
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyCommand("italic")}
          aria-label="Cursiva"
          title="Cursiva"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyCommand("underline")}
          aria-label="Subrayado"
          title="Subrayado"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyCommand("strikeThrough")}
          aria-label="Tachado"
          title="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        {separator}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyCommand("insertUnorderedList")}
          aria-label="Lista con puntos"
          title="Lista con puntos"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyCommand("insertOrderedList")}
          aria-label="Lista numerada"
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyBlock("blockquote")}
          aria-label="Cita"
          title="Cita"
        >
          <Quote className="h-4 w-4" />
        </Button>
        {separator}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={insertLink}
          aria-label="Insertar enlace"
          title="Insertar enlace"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        {separator}
        <div className="flex shrink-0 items-center gap-1 px-1">
          {RICH_TEXT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="h-6 w-6 rounded-full border border-slate-200 shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: color }}
              onClick={() => applyColor(color)}
              aria-label={`Color ${color}`}
              title={`Color ${color}`}
            />
          ))}
        </div>
        {separator}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolbarButtonClass}
          onClick={() => applyCommand("removeFormat")}
          aria-label="Quitar formato"
          title="Quitar formato"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onFocus={() => {
          focusedRef.current = true;
          rememberSelection();
        }}
        onBlur={() => {
          focusedRef.current = false;
          sync();
        }}
        onInput={() => {
          rememberSelection();
          sync();
        }}
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onPaste={handlePaste}
        className="task-rich-text min-h-[230px] flex-1 overflow-auto px-4 py-3 text-sm leading-7 text-slate-800 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        data-placeholder="Escribe o pega aquí el brief, instrucciones, listas y detalles de la tarea..."
      />
    </div>
  );
}

function TaskRichTextView({ html, fallback }: { html?: string | null; fallback?: string | null }) {
  const safeHtml = sanitizeRichTextHtml(html || plainTextToHtml(fallback || ""));
  if (!safeHtml) {
    return (
      <div className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[14px] font-medium leading-7 text-slate-800">
        Sin descripción.
      </div>
    );
  }
  return (
    <div
      className="task-rich-text-view rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[14px] font-medium leading-7 text-slate-800"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

function TaskAssigneesPicker({
  value,
  profiles,
  onChange,
}: {
  value: string[];
  profiles: QuickProfile[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = normalizeAssigneeIds(value);
  const selectedNames = selectedIds
    .map((id) => profiles.find((profile) => profile.id === id || profile.user_id === id))
    .filter((profile): profile is QuickProfile => Boolean(profile));
  const triggerLabel =
    selectedNames.length > 0
      ? selectedNames.map((profile) => profileDisplayName(profile)).join(", ")
      : "Seleccionar responsables";

  const toggleAssignee = (id: string) => {
    const checked = selectedIds.includes(id);
    const next = !checked
      ? normalizeAssigneeIds([...selectedIds, id])
      : selectedIds.filter((current) => current !== id);
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm font-medium ring-offset-background transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span
            className={
              selectedNames.length > 0
                ? "min-w-0 flex-1 truncate text-slate-900"
                : "min-w-0 flex-1 truncate text-slate-400"
            }
          >
            {triggerLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar responsable..." />
          <CommandList>
            <CommandEmpty>No hay usuarios disponibles.</CommandEmpty>
            <CommandGroup>
              {profiles.map((profile) => {
                const id = profileUserId(profile);
                const checked = selectedIds.includes(id);
                return (
                  <CommandItem
                    key={profile.id}
                    value={`${profileDisplayName(profile)} ${profile.email || ""}`}
                    onSelect={() => toggleAssignee(id)}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                      {profileDisplayName(profile)
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part.charAt(0).toUpperCase())
                        .join("") || "U"}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
                      {profileDisplayName(profile)}
                    </span>
                    {checked ? <Check className="h-4 w-4 shrink-0 text-slate-700" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TaskEditorInfoFields({
  draft,
  setDraft,
  profiles,
  projects,
  clients,
  draftProductName,
}: {
  draft: TaskEditorDraft;
  setDraft: Dispatch<SetStateAction<TaskEditorDraft>>;
  profiles: QuickProfile[];
  projects: ProjectOption[];
  clients: ClientOption[];
  draftProductName: string;
}) {
  const availableProjects = useMemo(
    () => filterProjectsForClient(projects, draft.clientId),
    [projects, draft.clientId],
  );

  const updateClientId = (clientId: string) => {
    setDraft((current) => {
      const selectedProject =
        current.projectId !== NO_PROJECT_VALUE
          ? projects.find((project) => project.id === current.projectId)
          : null;
      return {
        ...current,
        clientId,
        projectId: projectBelongsToClient(selectedProject, clientId)
          ? current.projectId
          : NO_PROJECT_VALUE,
      };
    });
  };

  const updateProjectId = (projectId: string) => {
    setDraft((current) => {
      const selectedProject =
        projectId !== NO_PROJECT_VALUE
          ? projects.find((project) => project.id === projectId)
          : null;
      return {
        ...current,
        projectId,
        clientId: resolveProjectClientId(selectedProject, current.clientId),
      };
    });
  };

  return (
    <div className="space-y-3">
      {renderEditField(
        "Status",
        <Select
          value={draft.status}
          onValueChange={(value) => setDraft((d) => ({ ...d, status: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}
      {renderEditField(
        "Priority",
        <Select
          value={draft.priority}
          onValueChange={(value) => setDraft((d) => ({ ...d, priority: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            {TASK_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}
      {renderEditField(
        "Due date",
        <Input
          name="due_date"
          type="date"
          value={draft.dueDate}
          onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
        />,
      )}
      {renderEditField(
        "Responsables",
        <TaskAssigneesPicker
          value={draft.assigneeIds}
          profiles={profiles}
          onChange={(assigneeIds) =>
            setDraft((d) => ({
              ...d,
              assigneeIds,
              assignedTo: primaryAssigneeId(assigneeIds) || UNASSIGNED_VALUE,
            }))
          }
        />,
      )}
      {renderEditField(
        "Client",
        <Select value={draft.clientId} onValueChange={updateClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CLIENT_VALUE}>Sin cliente directo</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {clientLabel(client)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}
      {renderEditField(
        "Project",
        <Select value={draft.projectId} onValueChange={updateProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PROJECT_VALUE}>Sin proyecto</SelectItem>
            {availableProjects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}
      <div className="rounded-lg border bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        Producto automático:{" "}
        <span className="font-extrabold text-slate-900">{draftProductName}</span>
      </div>
    </div>
  );
}

function TaskCreateResourcesPanel({
  resources,
  linkValue,
  uploadingName,
  uploadProgress,
  fileInputRef,
  onLinkChange,
  onAddLink,
  onPickFile,
  onFileDrop,
  onUploadClick,
  onRemove,
}: {
  resources: PendingTaskResource[];
  linkValue: string;
  uploadingName: string;
  uploadProgress: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onLinkChange: (value: string) => void;
  onAddLink: () => void;
  onPickFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (file: File) => void;
  onUploadClick: () => void;
  onRemove: (resourceId: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
            <Paperclip className="h-4 w-4 text-slate-400" /> Recursos
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Se adjuntan al crear la tarea.
          </p>
        </div>
      </div>

      <TaskFileDropZone
        fileInputRef={fileInputRef}
        linkValue={linkValue}
        uploadingName={uploadingName}
        uploadProgress={uploadProgress}
        compact={resources.length > 0}
        dropLabel="Arrastra recursos aquí"
        uploadLabel="Subir archivo"
        onLinkChange={onLinkChange}
        onAddLink={onAddLink}
        onPickFile={onPickFile}
        onFileDrop={onFileDrop}
        onUploadClick={onUploadClick}
      />

      {resources.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 py-2.5 last:border-b-0"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-white text-slate-500">
                {resource.type === "file" ? (
                  <Paperclip className="h-4 w-4" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-slate-900">
                  {resource.type === "file" ? resource.name : "Enlace de Google Drive"}
                </div>
                <div className="truncate text-xs font-semibold text-slate-500">
                  {resource.type === "file" ? formatBytes(resource.size) : resource.url}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600"
                onClick={() => onRemove(resource.id)}
                aria-label="Quitar recurso"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  companyId,
  currentUserId,
  profiles: propProfiles = EMPTY_PROFILES,
  initialValues,
  relatedProposalId,
  onCreated,
  canCreate = true,
}: TaskCreateDialogProps) {
  const [draft, setDraft] = useState<TaskEditorDraft>(() =>
    createEmptyTaskDraft({
      assignedTo: currentUserId || UNASSIGNED_VALUE,
      ...initialValues,
    }),
  );
  const [profiles, setProfiles] = useState<QuickProfile[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingResources, setPendingResources] = useState<PendingTaskResource[]>([]);
  const [resourceUrlInput, setResourceUrlInput] = useState("");
  const [resourceUploadingName, setResourceUploadingName] = useState("");
  const [resourceUploadProgress, setResourceUploadProgress] = useState(0);
  const resourceFileInputRef = useRef<HTMLInputElement | null>(null);

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const selectedProject =
    draft.projectId !== NO_PROJECT_VALUE ? projectsById.get(draft.projectId) || null : null;
  const selectedClient =
    draft.clientId !== NO_CLIENT_VALUE
      ? clientsById.get(draft.clientId) || null
      : selectedProject?.client_id
        ? clientsById.get(selectedProject.client_id) || null
        : null;
  const draftProductName = selectedProject?.product_id
    ? productsById.get(selectedProject.product_id)?.name || "—"
    : "—";
  const assigneeLabel = useMemo(() => {
    return assigneeNamesFromIds(draft.assigneeIds, profiles);
  }, [draft.assigneeIds, profiles]);

  useEffect(() => {
    if (!selectedProject?.client_id) return;
    if (draft.clientId === selectedProject.client_id) return;
    setDraft((current) => ({ ...current, clientId: selectedProject.client_id || NO_CLIENT_VALUE }));
  }, [draft.clientId, selectedProject?.client_id]);

  const resetDraft = () => {
    setDraft(
      createEmptyTaskDraft({
        assignedTo: currentUserId || UNASSIGNED_VALUE,
        ...initialValues,
      }),
    );
    setMessage(null);
    setPendingResources([]);
    setResourceUrlInput("");
    setResourceUploadingName("");
    setResourceUploadProgress(0);
  };

  useEffect(() => {
    if (!open) return;
    resetDraft();
  }, [open, currentUserId, initialValues]);

  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    setLoadingOptions(true);
    setMessage(null);
    void Promise.all([
      fetchTaskRelationOptions(companyId),
      propProfiles.length
        ? Promise.resolve(propProfiles)
        : (supabase as any)
            .from("profiles")
            .select("id,user_id,full_name,email,is_active")
            .eq("company_id", companyId)
            .order("full_name", { ascending: true })
            .limit(500)
            .then((result: any) =>
              !result.error && Array.isArray(result.data)
                ? result.data.filter((p: QuickProfile) => p && p.is_active !== false)
                : [],
            ),
    ])
      .then(([options, nextProfiles]) => {
        if (cancelled) return;
        setProfiles(nextProfiles);
        setProjects(options.projects);
        setClients(options.clients);
        setProducts(options.products);
        if (options.error) setMessage(options.error.message || "No se pudieron cargar relaciones.");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, companyId, propProfiles]);

  const renderContextPill = (value: ReactNode, icon: ReactNode) => (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 truncate text-[12px] font-semibold text-slate-900">
        {value || "—"}
      </span>
    </div>
  );

  const addPendingFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    addPendingDroppedFile(file);
  };

  const addPendingDroppedFile = (file: File) => {
    setPendingResources((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() || `${Date.now()}-${file.name}`,
        type: "file",
        file,
        name: file.name,
        size: file.size,
      },
    ]);
  };

  const addPendingDriveLink = () => {
    const url = resourceUrlInput.trim();
    const parsed = parseGoogleDriveUrl(url);
    if (!parsed) {
      toast.error("La URL de Google Drive no es válida.");
      return;
    }
    setPendingResources((current) => [
      ...current,
      {
        id: crypto.randomUUID?.() || `${Date.now()}-${parsed.id}`,
        type: "link",
        url,
        driveId: parsed.id,
        driveType: parsed.type,
      },
    ]);
    setResourceUrlInput("");
  };

  const attachPendingResources = async (createdTask: TaskRow) => {
    if (!pendingResources.length) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const authUserId = sessionData.session?.user?.id || currentUserId || null;
    const failures: string[] = [];

    for (const resource of pendingResources) {
      try {
        if (resource.type === "link") {
          const isFolder = resource.driveType === "folder";
          const { error } = await (supabase as any).from("drive_files").insert({
            company_id: createdTask.company_id,
            drive_file_id: resource.driveId,
            name: isFolder ? "Carpeta de Google Drive" : "Archivo de Google Drive",
            mime_type: isFolder ? "application/vnd.google-apps.folder" : null,
            web_view_link: resource.url,
            web_content_link: null,
            thumbnail_link: null,
            icon_link: null,
            size_bytes: null,
            linked_type: "task",
            linked_id: createdTask.id,
            created_by: authUserId,
            file_purpose: "resource",
          });
          if (error) throw error;
          continue;
        }

        if (!accessToken) throw new Error("No estás autenticado.");
        setResourceUploadingName(resource.name);
        setResourceUploadProgress(0);
        const result = await uploadTaskFileWithProgress({
          taskId: createdTask.id,
          file: resource.file,
          token: accessToken,
          onProgress: setResourceUploadProgress,
          filePurpose: "resource",
        });
        if (result?.error) throw new Error(String(result.error));
        setResourceUploadProgress(100);
      } catch (error: any) {
        failures.push(resource.type === "file" ? resource.name : resource.url);
      }
    }

    setResourceUploadingName("");
    setResourceUploadProgress(0);

    if (failures.length) {
      toast.error(`Tarea creada, pero ${failures.length} recurso(s) no se pudieron adjuntar.`);
    } else {
      toast.success("Recursos adjuntados.");
    }
  };

  const createTask = async () => {
    if (!companyId) {
      toast.error("No se pudo detectar la empresa.");
      return;
    }
    if (!canCreate) {
      toast.error("No tienes permiso para crear tareas.");
      return;
    }
    const title = draft.title.trim();
    if (!title) {
      toast.error("El título de la tarea es requerido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        title,
        description: draft.description.trim() || null,
        description_html: sanitizeRichTextHtml(draft.descriptionHtml) || null,
        status: draft.status || "To Do",
        priority: draft.priority || "Medium",
        due_date: toDateInputValue(draft.dueDate) || null,
        assigned_to: primaryAssigneeId(draft.assigneeIds),
        related_project_id: draft.projectId === NO_PROJECT_VALUE ? null : draft.projectId,
        related_client_id:
          draft.clientId === NO_CLIENT_VALUE ? selectedProject?.client_id || null : draft.clientId,
        related_lead_id: draft.leadId || null,
        related_deal_id: draft.dealId || null,
        related_proposal_id: relatedProposalId || null,
      };

      const { data, error } = await (supabase as any)
        .from("tasks")
        .insert(payload)
        .select(
          "id,title,description,description_html,status,priority,assigned_to,due_date,related_project_id,related_client_id,related_proposal_id,created_at,company_id",
        )
        .single();
      if (error) throw error;

      let createdTask = data as TaskRow;
      if (payload.due_date && createdTask.due_date !== payload.due_date) {
        const { data: scheduledTask, error: scheduleError } = await (supabase as any)
          .from("tasks")
          .update({ due_date: payload.due_date })
          .eq("id", createdTask.id)
          .eq("company_id", createdTask.company_id || companyId)
          .select(
            "id,title,description,description_html,status,priority,assigned_to,due_date,related_project_id,related_client_id,related_proposal_id,created_at,company_id",
          )
          .single();
        if (scheduleError) throw scheduleError;
        createdTask = (scheduledTask as TaskRow) || { ...createdTask, due_date: payload.due_date };
      }
      await syncTaskAssignees({
        taskId: createdTask.id,
        companyId: createdTask.company_id || companyId,
        assigneeIds: draft.assigneeIds,
      });
      void logActivityEvent({
        companyId: createdTask.company_id || companyId,
        userId: currentUserId,
        action: "task_created",
        entityType: "tasks",
        entityId: createdTask.id,
        detail: `Tarea creada: ${createdTask.title}`,
        metadata: {
          related_client_id: createdTask.related_client_id,
          related_project_id: createdTask.related_project_id,
          related_proposal_id: createdTask.related_proposal_id,
          due_date: createdTask.due_date,
          priority: createdTask.priority,
        },
      }).catch(() => {});
      toast.success("Tarea creada.");
      await attachPendingResources(createdTask);
      await onCreated?.(createdTask);
      onOpenChange(false);
      resetDraft();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la tarea.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-2xl [&>button.absolute.right-4.top-4]:hidden sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[980px] sm:rounded-[18px] sm:border">
        <DialogTitle className="sr-only">Crear tarea</DialogTitle>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white sm:max-h-[92vh]">
          <header className="shrink-0 border-b bg-white px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="h-10 border-0 px-0 text-[20px] font-extrabold leading-[1.08] tracking-[-0.025em] shadow-none focus-visible:ring-0 sm:text-[22px]"
                  placeholder="Nueva tarea..."
                  autoFocus
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={draft.status} />
                  <span
                    className={`rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold ${priorityTone(draft.priority)}`}
                  >
                    {draft.priority}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-600">
                    Vence {formatDate(draft.dueDate)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Button
                  className="h-9 px-3 text-sm"
                  onClick={() => void createTask()}
                  disabled={saving || loadingOptions || !canCreate || !draft.title.trim()}
                >
                  {saving ? "Creando..." : "Crear"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  aria-label="Cerrar creador de tarea"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex w-full min-w-0 items-center gap-2 overflow-hidden border-t border-slate-100 pt-2">
              {renderContextPill(
                selectedClient ? clientLabel(selectedClient) : "Sin cliente",
                <Users className="h-3.5 w-3.5" />,
              )}
              {renderContextPill(
                selectedProject?.name || "Sin proyecto",
                <FolderKanban className="h-3.5 w-3.5" />,
              )}
              {renderContextPill(assigneeLabel, <User className="h-3.5 w-3.5" />)}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-white">
            <div className="grid min-h-full gap-5 px-3 py-4 sm:px-5 sm:py-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-stretch">
              <section className="order-1 min-w-0 md:flex md:h-full md:flex-col">
                <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2">
                  <h3 className="text-[15px] font-extrabold text-slate-900">Descripción</h3>
                </div>
                <TaskRichTextEditor
                  html={draft.descriptionHtml}
                  plainText={draft.description}
                  onChange={(next) =>
                    setDraft((d) => ({
                      ...d,
                      description: next.text,
                      descriptionHtml: next.html,
                    }))
                  }
                  className="md:min-h-0 md:flex-1"
                />
                {message ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {message}
                  </div>
                ) : null}
              </section>

              <div className="order-2 flex min-w-0 flex-col gap-4 md:sticky md:top-0 md:h-full">
                <section className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                      <Star className="h-4 w-4 text-slate-400" /> Task Info
                    </h3>
                    <span className="text-slate-400">•••</span>
                  </div>
                  <TaskEditorInfoFields
                    draft={draft}
                    setDraft={setDraft}
                    profiles={profiles}
                    projects={projects}
                    clients={clients}
                    draftProductName={draftProductName}
                  />
                </section>

                <TaskCreateResourcesPanel
                  resources={pendingResources}
                  linkValue={resourceUrlInput}
                  uploadingName={resourceUploadingName}
                  uploadProgress={resourceUploadProgress}
                  fileInputRef={resourceFileInputRef}
                  onLinkChange={setResourceUrlInput}
                  onAddLink={addPendingDriveLink}
                  onPickFile={addPendingFile}
                  onFileDrop={addPendingDroppedFile}
                  onUploadClick={() => resourceFileInputRef.current?.click()}
                  onRemove={(resourceId) =>
                    setPendingResources((current) =>
                      current.filter((resource) => resource.id !== resourceId),
                    )
                  }
                />
              </div>
            </div>
          </main>

          <footer className="shrink-0 border-t bg-white px-3 py-3 sm:px-5">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void createTask()}
                disabled={saving || loadingOptions || !canCreate || !draft.title.trim()}
              >
                {saving ? "Creando..." : "Crear tarea"}
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  children,
  task: propTask,
  profiles: propProfiles = EMPTY_PROFILES,
  projectName = "—",
  clientName = "—",
  productName = "—",
  driveFiles: propDriveFiles,
  driveFilesLoading = false,
  driveUrlInput = "",
  resourceDriveUrlInput = "",
  isUploadingFile = false,
  isUploadingResourceFile = false,
  uploadProgress = 0,
  resourceUploadProgress = 0,
  uploadingFileName = "",
  uploadingResourceFileName = "",
  canEdit = true,
  fileInputRef,
  resourceFileInputRef,
  onUpdateTask,
  onAssigneesChanged,
  onComplete,
  onSetInProgress,
  onDriveUrlChange,
  onResourceDriveUrlChange,
  onAttachDriveUrl,
  onAttachResourceDriveUrl,
  onUploadClick,
  onUploadResourceClick,
  onFilePicked,
  onResourceFilePicked,
  onFileDropped,
  onResourceFileDropped,
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
  const [taskAssignees, setTaskAssignees] = useState<TaskAssigneeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resourceUploaderOpen, setResourceUploaderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);
  const [draft, setDraft] = useState<TaskEditorDraft>(() => createEmptyTaskDraft());

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const selectedProject = task?.related_project_id
    ? projectsById.get(task.related_project_id) || null
    : null;
  const selectedClient = task?.related_client_id
    ? clientsById.get(task.related_client_id) || null
    : selectedProject?.client_id
      ? clientsById.get(selectedProject.client_id) || null
      : null;
  const selectedProduct = selectedProject?.product_id
    ? productsById.get(selectedProject.product_id) || null
    : null;

  const displayProjectName = selectedProject?.name || projectName || "—";
  const displayClientName = selectedClient ? clientLabel(selectedClient) : clientName || "—";
  const displayProductName = selectedProduct?.name || productName || "—";

  const draftProject =
    draft.projectId !== NO_PROJECT_VALUE ? projectsById.get(draft.projectId) || null : null;
  const draftProductName = draftProject?.product_id
    ? productsById.get(draftProject.product_id)?.name || "—"
    : "—";

  useEffect(() => {
    if (!draftProject?.client_id) return;
    if (draft.clientId === draftProject.client_id) return;
    setDraft((current) => ({ ...current, clientId: draftProject.client_id || NO_CLIENT_VALUE }));
  }, [draft.clientId, draftProject?.client_id]);

  const assigneeLabel = useMemo(() => {
    const assigneeIds = normalizeAssigneeIds(
      taskAssignees.length
        ? taskAssignees.map((row) => row.user_id)
        : task?.assigned_to
          ? [task.assigned_to]
          : [],
    );
    return assigneeNamesFromIds(assigneeIds, profiles);
  }, [profiles, task?.assigned_to, taskAssignees]);

  const completedChecklist = checklist.filter((item) => item.is_completed).length;
  const checklistProgress = checklist.length
    ? Math.round((completedChecklist / checklist.length) * 100)
    : 0;

  const resetState = () => {
    setTask(null);
    setChecklist([]);
    setComments([]);
    setActivity([]);
    setDriveFiles([]);
    setTaskAssignees([]);
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
    const options = await fetchTaskRelationOptions(companyId);
    setProjects(options.projects);
    setClients(options.clients);
    setProducts(options.products);
  };

  const loadTaskDetails = async (taskId: string) => {
    const [checklistResult, commentsResult, activityResult, driveResult, assigneesResult] =
      await Promise.all([
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
          .select(
            "id,drive_file_id,name,mime_type,web_view_link,web_content_link,thumbnail_link,icon_link,size_bytes,file_purpose,created_at",
          )
          .eq("linked_type", "task")
          .eq("linked_id", taskId)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("task_assignees")
          .select("id,task_id,user_id")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true }),
      ]);

    if (!checklistResult.error)
      setChecklist(Array.isArray(checklistResult.data) ? checklistResult.data : []);
    if (!commentsResult.error)
      setComments(Array.isArray(commentsResult.data) ? commentsResult.data : []);
    if (!activityResult.error)
      setActivity(Array.isArray(activityResult.data) ? activityResult.data : []);
    if (!driveResult.error && !propDriveFiles)
      setDriveFiles(Array.isArray(driveResult.data) ? driveResult.data : []);
    if (!assigneesResult.error) {
      const rows = Array.isArray(assigneesResult.data) ? assigneesResult.data : [];
      setTaskAssignees(rows as TaskAssigneeRow[]);
      setDraft((current) => {
        const assigneeIds = normalizeAssigneeIds(
          rows.length ? rows.map((row: TaskAssigneeRow) => row.user_id) : current.assigneeIds,
        );
        return {
          ...current,
          assigneeIds,
          assignedTo: primaryAssigneeId(assigneeIds) || UNASSIGNED_VALUE,
        };
      });
    }

    const errors = [
      checklistResult.error,
      commentsResult.error,
      activityResult.error,
      driveResult.error,
      assigneesResult.error,
    ].filter(Boolean);
    setMessage(errors[0]?.message || null);
  };

  const applyLoadedTask = async (
    loadedTask: TaskRow,
    loadedProfiles: QuickProfile[] = propProfiles,
  ) => {
    setTask(loadedTask);
    setProfiles(loadedProfiles);
    setDraft({
      title: loadedTask.title || "",
      description: loadedTask.description || "",
      descriptionHtml:
        sanitizeRichTextHtml(loadedTask.description_html || "") ||
        plainTextToHtml(loadedTask.description || ""),
      status: loadedTask.status || "To Do",
      priority: loadedTask.priority || "Medium",
      dueDate: toDateInputValue(loadedTask.due_date),
      assignedTo: loadedTask.assigned_to || UNASSIGNED_VALUE,
      assigneeIds: normalizeAssigneeIds(loadedTask.assigned_to || []),
      projectId: loadedTask.related_project_id || NO_PROJECT_VALUE,
      clientId: loadedTask.related_client_id || NO_CLIENT_VALUE,
      leadId: "",
      dealId: "",
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
      const loadedProfiles = Array.isArray(profileRows)
        ? profileRows.filter((p) => p && p.is_active !== false)
        : [];

      let query = (supabase as any)
        .from("tasks")
        .select(
          "id,title,description,description_html,status,priority,assigned_to,due_date,related_project_id,related_client_id,created_at,company_id",
        )
        .limit(2);

      if (taskIdFromUrl) {
        query = query.eq("id", taskIdFromUrl);
      } else if (snapshot.title) {
        query = query.eq("title", snapshot.title);
        if (snapshot.description) query = query.eq("description", snapshot.description);
        if (snapshot.priority) query = query.eq("priority", snapshot.priority);
        const snapshotDueDate = toDateInputValue(snapshot.dueDate);
        if (snapshotDueDate) query = query.eq("due_date", snapshotDueDate);
      } else {
        setMessage("No pude identificar esta tarea.");
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      if (rows.length !== 1) {
        setMessage(
          taskIdFromUrl
            ? "No encontré esta tarea."
            : "Abre la tarea desde /tasks?taskId=... para cargar el detalle completo.",
        );
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
    const primaryAssignee = primaryAssigneeId(draft.assigneeIds);
    const draftProjectForSave =
      draft.projectId !== NO_PROJECT_VALUE ? projectsById.get(draft.projectId) || null : null;
    await updateTask({
      title: draft.title.trim() || "Sin título",
      description: draft.description.trim() || null,
      description_html: sanitizeRichTextHtml(draft.descriptionHtml) || null,
      status: draft.status,
      priority: draft.priority,
      due_date: toDateInputValue(draft.dueDate) || null,
      assigned_to: primaryAssignee,
      related_project_id: draft.projectId === NO_PROJECT_VALUE ? null : draft.projectId,
      related_client_id:
        draft.clientId === NO_CLIENT_VALUE
          ? draftProjectForSave?.client_id || null
          : draft.clientId,
    });
    await syncTaskAssignees({
      taskId: task.id,
      companyId: task.company_id,
      assigneeIds: draft.assigneeIds,
    });
    await onAssigneesChanged?.();
    await loadTaskDetails(task.id);
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
    const { error } = await (supabase as any)
      .from("task_checklist_items")
      .delete()
      .eq("id", item.id);
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

  const resourceFiles = driveFiles.filter((file) => file.file_purpose === "resource");
  const deliverableFiles = driveFiles.filter((file) => file.file_purpose !== "resource");
  const showResourceUploader =
    resourceFiles.length > 0 || resourceUploaderOpen || isUploadingResourceFile;

  useEffect(() => {
    setResourceUploaderOpen(false);
  }, [propTask?.id]);

  const renderFileCard = (file: DriveFileRow) => {
    const url = file.web_view_link || file.web_content_link;
    const previewUrl = getGoogleDrivePreviewUrl(url, file.drive_file_id);
    return (
      <div
        key={file.id}
        className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-100 py-2.5 last:border-b-0"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg border bg-white text-slate-500">
          {file.icon_link ? (
            <img src={file.icon_link} alt="" className="h-5 w-5" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">{file.name}</div>
          <div className="text-xs font-semibold text-slate-500">
            {formatBytes(file.size_bytes)} · {formatDate(file.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {previewUrl ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-slate-500"
              onClick={() => setPreviewFile({ url: previewUrl, title: file.name })}
              aria-label="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
          ) : null}
          {url ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-slate-500"
              asChild
            >
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open</span>
              </a>
            </Button>
          ) : null}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-slate-500"
            onClick={() => void copyFileLink(file)}
            aria-label="Copiar enlace"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {onDeleteDriveFile ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-red-600"
              onClick={() => void onDeleteDriveFile(file)}
              aria-label="Eliminar archivo"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderInfoRow = (label: string, value: ReactNode, icon: ReactNode) => (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2 gap-y-1 border-b border-slate-200/70 py-2.5 last:border-b-0 sm:grid-cols-[22px_108px_minmax(0,1fr)]">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 sm:text-[13px] sm:normal-case sm:tracking-normal">
        {label}
      </span>
      <span className="col-start-2 min-w-0 text-[13px] font-semibold text-slate-900 sm:col-start-auto">
        {value || "—"}
      </span>
    </div>
  );

  const renderContextPill = (value: ReactNode, icon: ReactNode) => (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 truncate text-[12px] font-semibold text-slate-900">
        {value || "—"}
      </span>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-2xl [&>button.absolute.right-4.top-4]:hidden sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[980px] sm:rounded-[18px] sm:border">
          <DialogTitle className="sr-only">Detalle de tarea</DialogTitle>
          <div
            ref={legacyContentRef}
            className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0"
          >
            {children}
          </div>

          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white sm:max-h-[92vh]">
            <header className="shrink-0 border-b bg-white px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start gap-3">
                    {editing ? (
                      <Input
                        value={draft.title}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        className="h-10 max-w-2xl text-lg font-extrabold"
                      />
                    ) : (
                      <h2 className="min-w-0 flex-1 text-[20px] font-extrabold leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-[22px]">
                        {task?.title || "Cargando tarea..."}
                      </h2>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {task ? <StatusBadge status={task.status} /> : null}
                    {task?.priority ? (
                      <span
                        className={`rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold ${priorityTone(task.priority)}`}
                      >
                        {task.priority}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-600">
                      Vence {formatDate(task?.due_date)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  {editing ? (
                    <>
                      <Button variant="outline" onClick={() => setEditing(false)} className="h-9">
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => void saveInlineEdit()}
                        disabled={saving || !canEdit}
                        className="h-9"
                      >
                        Guardar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="hidden h-9 px-3 text-sm md:inline-flex"
                        onClick={() =>
                          void (onComplete ? onComplete() : updateTask({ status: "Completed" }))
                        }
                        disabled={!task?.id || task.status === "Completed" || !canEdit}
                      >
                        <Check className="mr-2 h-4 w-4" /> Completar
                      </Button>
                      <Button
                        className="hidden h-9 px-3 text-sm sm:inline-flex"
                        variant="outline"
                        onClick={() =>
                          void (onSetInProgress
                            ? onSetInProgress()
                            : updateTask({ status: "In Progress" }))
                        }
                        disabled={!task?.id || task.status === "In Progress" || !canEdit}
                      >
                        <Circle className="mr-2 h-4 w-4" /> En progreso
                      </Button>
                      <Button
                        className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:w-auto sm:px-3 sm:text-sm"
                        variant="ghost"
                        onClick={() => setEditing(true)}
                        disabled={!task?.id || !canEdit}
                        aria-label="Editar tarea"
                      >
                        <Pencil className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    aria-label="Cerrar detalle de tarea"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex w-full min-w-0 items-center gap-2 overflow-hidden border-t border-slate-100 pt-2">
                {renderContextPill(displayClientName, <Users className="h-3.5 w-3.5" />)}
                {renderContextPill(displayProjectName, <FolderKanban className="h-3.5 w-3.5" />)}
                {renderContextPill(assigneeLabel, <User className="h-3.5 w-3.5" />)}
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto bg-white">
              {loading && !task ? (
                <div className="m-5 rounded-xl border bg-white p-6 text-sm font-semibold text-slate-500">
                  Cargando detalle de tarea...
                </div>
              ) : (
                <div className="grid min-h-full gap-5 px-3 py-4 sm:px-5 sm:py-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
                  <section className="contents md:flex md:min-w-0 md:flex-col md:gap-5">
                    <section className="order-1">
                      <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2">
                        <h3 className="text-[15px] font-extrabold text-slate-900">Descripción</h3>
                        {!editing ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-slate-500"
                            onClick={() => setEditing(true)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        ) : null}
                      </div>
                      {editing ? (
                        <TaskRichTextEditor
                          html={draft.descriptionHtml}
                          plainText={draft.description}
                          onChange={(next) =>
                            setDraft((d) => ({
                              ...d,
                              description: next.text,
                              descriptionHtml: next.html,
                            }))
                          }
                        />
                      ) : (
                        <TaskRichTextView
                          html={task?.description_html}
                          fallback={task?.description}
                        />
                      )}
                      {message ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          {message}
                        </div>
                      ) : null}
                    </section>

                    <section
                      className={
                        resourceFiles.length > 0
                          ? "order-3 rounded-xl border bg-white p-4 shadow-sm"
                          : "order-3"
                      }
                    >
                      {showResourceUploader ? (
                        <TaskFileDropZone
                          fileInputRef={resourceFileInputRef}
                          linkValue={resourceDriveUrlInput}
                          uploadingName={uploadingResourceFileName}
                          uploadProgress={resourceUploadProgress}
                          disabled={!canEdit || isUploadingResourceFile}
                          compact={resourceFiles.length > 0}
                          dropLabel="Arrastra recursos aquí"
                          uploadLabel="Subir archivo"
                          onLinkChange={(value) => onResourceDriveUrlChange?.(value)}
                          onAddLink={() => void onAttachResourceDriveUrl?.()}
                          onPickFile={(event) => void onResourceFilePicked?.(event)}
                          onFileDrop={(file) => void onResourceFileDropped?.(file)}
                          onUploadClick={() => onUploadResourceClick?.()}
                        />
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setResourceUploaderOpen(true)}
                          disabled={!canEdit}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar recurso
                        </Button>
                      )}
                      {driveFilesLoading ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">
                          Cargando recursos...
                        </div>
                      ) : resourceFiles.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {resourceFiles.map(renderFileCard)}
                        </div>
                      ) : null}
                    </section>

                    <section className="order-4">
                      <div className="mb-3 flex items-end justify-between gap-3 border-b pb-2">
                        <div>
                          <h3 className="text-[15px] font-extrabold text-slate-900">Checklist</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {completedChecklist} de {checklist.length} completadas
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            document.getElementById("task-new-checklist-item")?.focus()
                          }
                          aria-label="Agregar subtarea"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Progress value={checklistProgress} className="mb-4 h-2" />
                      <div className="mb-3 flex gap-2">
                        <Input
                          id="task-new-checklist-item"
                          value={newChecklistTitle}
                          onChange={(e) => setNewChecklistTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void addChecklistItem();
                          }}
                          placeholder="Agregar subtarea..."
                        />
                        <Button
                          variant="outline"
                          onClick={() => void addChecklistItem()}
                          disabled={!task?.id || saving || !newChecklistTitle.trim()}
                        >
                          Agregar
                        </Button>
                      </div>
                      {checklist.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">
                          No hay subtareas todavía.
                        </div>
                      ) : (
                        <div className="divide-y rounded-xl border bg-white">
                          {checklist.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 hover:bg-slate-50"
                            >
                              <button
                                type="button"
                                onClick={() => void toggleChecklistItem(item)}
                                className={
                                  "mt-0.5 grid h-5 w-5 place-items-center rounded-full border text-[10px] " +
                                  (item.is_completed
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-300 text-transparent")
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <div>
                                <div
                                  className={
                                    "text-sm font-medium " +
                                    (item.is_completed
                                      ? "text-slate-400 line-through"
                                      : "text-slate-800")
                                  }
                                >
                                  {item.title}
                                </div>
                                <div className="mt-1 text-xs font-medium text-slate-500">
                                  Creada {formatDate(item.created_at)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-600"
                                onClick={() => void deleteChecklistItem(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="order-6">
                      <div className="mb-3 border-b pb-2">
                        <h3 className="text-[15px] font-extrabold text-slate-900">Comentarios</h3>
                      </div>
                      <div className="space-y-3">
                        <Textarea
                          value={newCommentBody}
                          onChange={(e) => setNewCommentBody(e.target.value)}
                          placeholder="Escribe un comentario interno..."
                          className="min-h-[96px]"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => void addComment()}
                            disabled={!task?.id || saving || !newCommentBody.trim()}
                          >
                            Agregar comentario
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {comments.length === 0 ? (
                          <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">
                            No hay comentarios todavía.
                          </div>
                        ) : (
                          comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 border-b pb-3 last:border-b-0"
                            >
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                IC
                              </div>
                              <div className="min-w-0">
                                <div className="mb-1 text-xs font-bold text-slate-500">
                                  {formatDateTime(comment.created_at)}
                                </div>
                                <div className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                                  {comment.body}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </section>

                  <aside className="contents md:sticky md:top-0 md:flex md:min-w-0 md:flex-col md:gap-4">
                    <section className="order-2 rounded-xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                          <Star className="h-4 w-4 text-slate-400" /> Task Info
                        </h3>
                        <span className="text-slate-400">•••</span>
                      </div>

                      {editing ? (
                        <TaskEditorInfoFields
                          draft={draft}
                          setDraft={setDraft}
                          profiles={profiles}
                          projects={projects}
                          clients={clients}
                          draftProductName={draftProductName}
                        />
                      ) : (
                        <div>
                          {renderInfoRow(
                            "Estado",
                            <StatusBadge status={task?.status || "—"} />,
                            <Star className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Task ID",
                            <span className="font-mono text-[12px]">{task?.id || "—"}</span>,
                            <Copy className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Creada",
                            formatDate(task?.created_at),
                            <CalendarDays className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Vence",
                            formatDate(task?.due_date),
                            <CalendarDays className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Prioridad",
                            <span className={priorityTone(task?.priority)}>
                              {task?.priority || "—"}
                            </span>,
                            <Flag className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Responsables",
                            assigneeLabel,
                            <Users className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Proyecto",
                            <span className="break-words">{displayProjectName}</span>,
                            <FolderKanban className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Cliente",
                            <span className="break-words">{displayClientName}</span>,
                            <Users className="h-4 w-4" />,
                          )}
                          {renderInfoRow(
                            "Producto",
                            <span className="break-words">{displayProductName}</span>,
                            <FileText className="h-4 w-4" />,
                          )}
                        </div>
                      )}
                    </section>

                    <section className="order-5 rounded-xl border bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                            <Clock3 className="h-4 w-4 text-slate-400" /> Actividad
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Cambios recientes de la tarea.
                          </p>
                        </div>
                      </div>
                      {activity.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">
                          Sin actividad registrada.
                        </div>
                      ) : (
                        <div className="relative max-h-[260px] space-y-4 overflow-auto pr-2 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-slate-200">
                          {activity.map((event, index) => (
                            <div
                              key={event.id}
                              className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3"
                            >
                              <div
                                className={
                                  "relative z-10 grid h-8 w-8 place-items-center rounded-full border " +
                                  (index === 0
                                    ? "border-blue-200 bg-blue-50 text-blue-600"
                                    : "border-slate-200 bg-white text-slate-500")
                                }
                              >
                                {eventIcon(event.event_type)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-slate-900">
                                  {event.title}
                                </div>
                                {event.description ? (
                                  <div className="mt-1 text-xs font-semibold text-slate-500">
                                    {event.description}
                                  </div>
                                ) : null}
                                <div className="mt-1 text-[11px] font-semibold text-slate-400">
                                  {formatDateTime(event.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section
                      className={
                        deliverableFiles.length > 0
                          ? "order-7 rounded-xl border bg-white p-4 shadow-sm md:order-4"
                          : "order-7 md:order-4"
                      }
                    >
                      <TaskFileDropZone
                        fileInputRef={fileInputRef}
                        linkValue={driveUrlInput}
                        uploadingName={uploadingFileName}
                        uploadProgress={uploadProgress}
                        disabled={!canEdit || isUploadingFile}
                        compact={deliverableFiles.length > 0}
                        dropLabel="Arrastra entregables aquí"
                        uploadLabel="Subir archivo"
                        onLinkChange={(value) => onDriveUrlChange?.(value)}
                        onAddLink={() => void onAttachDriveUrl?.()}
                        onPickFile={(event) => void onFilePicked?.(event)}
                        onFileDrop={(file) => void onFileDropped?.(file)}
                        onUploadClick={() => onUploadClick?.()}
                      />
                      {driveFilesLoading ? (
                        <div className="rounded-xl border border-dashed px-4 py-3 text-sm font-medium text-slate-500">
                          Cargando archivos...
                        </div>
                      ) : deliverableFiles.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {deliverableFiles.map(renderFileCard)}
                        </div>
                      ) : null}
                    </section>
                  </aside>
                </div>
              )}
            </main>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewFile} onOpenChange={(nextOpen) => !nextOpen && setPreviewFile(null)}>
        <DialogContent className="h-[92dvh] w-[calc(100vw-20px)] max-w-[1040px] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
          <DialogTitle className="sr-only">Preview de archivo</DialogTitle>
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Preview de Drive
              </div>
              <div className="truncate text-sm font-semibold text-slate-900">
                {previewFile?.title || "Archivo"}
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setPreviewFile(null)}>
              Cerrar
            </Button>
          </div>
          {previewFile?.url ? (
            <iframe
              src={previewFile.url}
              title={previewFile.title || "Preview de Drive"}
              className="h-[calc(92dvh-57px)] w-full border-0 bg-slate-100"
              allow="autoplay"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
