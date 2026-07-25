import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clipboard,
  Edit3,
  ExternalLink,
  FileText,
  LayoutTemplate,
  Link as LinkIcon,
  MessageSquare,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CrmDetailLineButton, CrmDetailSummaryGrid } from "@/components/crm/crm-detail-layout";
import { EmptyState } from "@/components/crm/empty-state";
import { renderProposalTemplateHtml } from "@/components/proposals/proposal-template-rendering";
import { SalesDocumentWorkspaceDialog } from "@/components/sales/sales-document-workspace-dialog";
import { ProjectWorkspaceFormDialog } from "@/components/projects/project-workspace-form-dialog";
import { TaskCreateDialog } from "@/components/tasks/task-detail-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { logActivityEvent } from "@/lib/activity-log";
import { cn } from "@/lib/utils";

type ProposalWorkspaceProposal = {
  id: string;
  number: string;
  title: string;
  status: string;
  product_id: string | null;
  client_id: string | null;
  amount: number;
  currency: string | null;
  base_currency?: string | null;
  amount_base?: number | null;
  subtotal?: number | null;
  tax_total?: number | null;
  total?: number | null;
  valid_until: string | null;
  description: string | null;
  content: string | null;
  notes: string | null;
  public_token?: string | null;
  template_id?: string | null;
  template_key?: string | null;
  allow_comments?: boolean | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  recipient_city?: string | null;
  recipient_state?: string | null;
  recipient_country?: string | null;
  recipient_zip_code?: string | null;
  proposal_date?: string | null;
  sent_at: string | null;
  viewed_at?: string | null;
  approved_at?: string | null;
  updated_at: string;
};

type ProposalWorkspaceClient = {
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
};

type ProposalWorkspaceProduct = {
  name: string;
  category: string | null;
};

type ProposalWorkspaceItem = {
  id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_type: string;
  rate: number;
  tax_rate: number;
  tax_name?: string | null;
  tax_amount?: number | null;
  amount: number;
};

type WorkspaceAuthor = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ProposalNoteRow = {
  id: string;
  company_id: string;
  proposal_id: string;
  author_profile_id: string | null;
  kind: string;
  content: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  author?: WorkspaceAuthor | null;
};

type ProposalCommentRow = {
  id: string;
  company_id: string;
  proposal_id: string;
  author_profile_id: string | null;
  author_name: string | null;
  author_email: string | null;
  visibility: "internal" | "client";
  content: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  author?: WorkspaceAuthor | null;
};

type ProposalTaskRow = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  related_client_id: string | null;
  related_proposal_id?: string | null;
  updated_at: string;
};

type ProposalReminderRow = {
  id: string;
  company_id: string;
  proposal_id: string;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  notes: string | null;
  remind_at: string;
  status: "Pending" | "Completed" | "Cancelled";
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProposalProfileRow = WorkspaceAuthor & {
  user_id?: string | null;
  is_active?: boolean | null;
};

type ProposalTemplateRow = {
  id: string;
  company_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  content_html: string;
  content_json: Record<string, unknown> | null;
  is_default: boolean;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProposalTemplateDraft = {
  title: string;
  description: string;
  contentHtml: string;
  isDefault: boolean;
};

type ProposalWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: ProposalWorkspaceProposal | null;
  client?: ProposalWorkspaceClient | null;
  product?: ProposalWorkspaceProduct | null;
  items?: ProposalWorkspaceItem[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void> | void;
  onCopyPublicLink: () => void;
  onOpenPublicLink: () => void;
  onProposalPatch?: (patch: Partial<ProposalWorkspaceProposal>) => void;
  formatMoney: (amount: number, currency: string | null | undefined) => string;
};

const tabs = [
  { value: "proposal", label: "Propuesta", icon: FileText },
  { value: "comments", label: "Comentarios", icon: MessageSquare },
  { value: "reminders", label: "Recordatorios", icon: Bell },
  { value: "tasks", label: "Tareas", icon: CheckCircle2 },
  { value: "notes", label: "Notas", icon: StickyNote },
  { value: "templates", label: "Templates", icon: LayoutTemplate },
] as const;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function buildRecipientAddress(proposal: ProposalWorkspaceProposal) {
  return [
    proposal.recipient_address,
    proposal.recipient_city,
    proposal.recipient_state,
    proposal.recipient_country,
    proposal.recipient_zip_code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function relativeTimeLabel(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(days, "day");
}

function defaultReminderDateTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function authorLabel(
  author: WorkspaceAuthor | null | undefined,
  fallbackName?: string | null,
  fallbackEmail?: string | null,
) {
  return author?.full_name || author?.email || fallbackName || fallbackEmail || "Equipo Corevix";
}

function profileLabel(
  profilesById: Map<string, ProposalProfileRow>,
  profileId: string | null | undefined,
) {
  if (!profileId) return "Sin responsable";
  return authorLabel(profilesById.get(profileId));
}

const emptyTemplateDraft: ProposalTemplateDraft = {
  title: "",
  description: "",
  contentHtml: "",
  isDefault: false,
};

const tinyMceCdnUrl = "https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js";
let tinyMceScriptPromise: Promise<void> | null = null;
const proposalTemplateGoogleFonts = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans 3",
  "Raleway",
  "Nunito Sans",
  "Merriweather",
  "Playfair Display",
  "Oswald",
  "Ubuntu",
  "Work Sans",
  "DM Sans",
  "Rubik",
  "Manrope",
  "Noto Sans",
  "Noto Serif",
  "PT Sans",
  "PT Serif",
  "Libre Baskerville",
  "Roboto Slab",
  "Fira Sans",
  "Mulish",
  "Quicksand",
  "Karla",
  "Josefin Sans",
  "Archivo",
  "Space Grotesk",
];
const proposalTemplateGoogleFontsCssUrl = `https://fonts.googleapis.com/css2?${proposalTemplateGoogleFonts
  .map((font) => `family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@400;500;600;700;800`)
  .join("&")}&display=swap`;
const proposalTemplateFontFamilyFormats = [
  "Sistema=system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  ...proposalTemplateGoogleFonts.map((font) => `${font}='${font}',Arial,sans-serif`),
].join("; ");
const proposalTemplateDocumentContentStyle = `
  html {
    background: #eef2f7;
  }
  body {
    width: min(8.5in, 100%);
    min-height: 11in;
    margin: 0 auto;
    padding: 0.65in;
    box-sizing: border-box;
    background: #ffffff;
    color: #0f172a;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
  }
  h1, h2, h3 {
    line-height: 1.2;
    margin: 0 0 12px;
  }
  p {
    margin: 0 0 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  td, th {
    border: 1px solid #dbe3ef;
    padding: 8px;
    vertical-align: top;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  .mce-pagebreak,
  hr[data-mce-pagebreak] {
    display: block;
    height: 0;
    margin: 28px 0;
    border: 0;
    border-top: 2px dashed #94a3b8;
    break-after: page;
    page-break-after: always;
  }
  @page {
    size: Letter;
    margin: 0;
  }
  @media print {
    html {
      background: #ffffff;
    }
    body {
      width: auto;
      min-height: auto;
      margin: 0;
      padding: 0.65in;
      box-shadow: none;
    }
  }
`;

function loadTinyMceFromCdn() {
  if (typeof window === "undefined")
    return Promise.reject(new Error("TinyMCE solo carga en el navegador."));
  if ((window as any).tinymce) return Promise.resolve();
  if (tinyMceScriptPromise) return tinyMceScriptPromise;

  tinyMceScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${tinyMceCdnUrl}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar TinyMCE.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = tinyMceCdnUrl;
    script.async = true;
    script.referrerPolicy = "origin";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar TinyMCE."));
    document.head.appendChild(script);
  });

  return tinyMceScriptPromise;
}

export function ProposalWorkspaceDialog({
  open,
  onOpenChange,
  proposal,
  client,
  product,
  items = [],
  canEdit,
  onEdit,
  onDelete,
  onCopyPublicLink,
  onOpenPublicLink,
  onProposalPatch,
  formatMoney,
}: ProposalWorkspaceDialogProps) {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["value"]>("proposal");
  const [notes, setNotes] = useState<ProposalNoteRow[]>([]);
  const [comments, setComments] = useState<ProposalCommentRow[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<"internal" | "client">("internal");
  const [editingNote, setEditingNote] = useState<ProposalNoteRow | null>(null);
  const [editingComment, setEditingComment] = useState<ProposalCommentRow | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<ProposalTaskRow[]>([]);
  const [reminders, setReminders] = useState<ProposalReminderRow[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplateRow[]>([]);
  const [profiles, setProfiles] = useState<ProposalProfileRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplateRow | null>(null);
  const [templateDraft, setTemplateDraft] = useState<ProposalTemplateDraft>(emptyTemplateDraft);
  const [reminderDraft, setReminderDraft] = useState({
    title: "",
    notes: "",
    remindAt: "",
    assignedTo: "unassigned",
  });

  const recipientName =
    proposal?.recipient_name ||
    client?.contact_person ||
    client?.company_name ||
    "Sin destinatario";
  const recipientEmail = proposal?.recipient_email || client?.email || "";
  const recipientPhone = proposal?.recipient_phone || client?.phone || "";
  const recipientAddress = proposal ? buildRecipientAddress(proposal) : "";
  const totalAmount = Number(proposal?.total ?? proposal?.amount ?? 0);
  const subtotalAmount = Number(proposal?.subtotal ?? proposal?.amount ?? 0);
  const taxAmount = Number(proposal?.tax_total ?? 0);

  const copiedContent = useMemo(() => {
    if (!proposal) return "";
    return (
      proposal.content ||
      `Propuesta: ${proposal.title}\n\n${proposal.description || ""}\n\nInversión: ${formatMoney(
        totalAmount,
        proposal.currency,
      )}`.trim()
    );
  }, [formatMoney, proposal, totalAmount]);

  const renderedProposalContent = useMemo(() => {
    if (!proposal?.content) return "";
    return renderProposalTemplateHtml(proposal, items);
  }, [items, proposal]);

  const profilesById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);

  const taskCountLabel = useMemo(() => {
    if (!tasks.length) return "Sin tareas todavía";
    const openCount = tasks.filter(
      (task) => !["completed", "cancelled"].includes(task.status.toLowerCase()),
    ).length;
    return `${openCount} abiertas · ${tasks.length} total`;
  }, [tasks]);

  const reminderCountLabel = useMemo(() => {
    if (!reminders.length) return "Sin recordatorios todavía";
    const openCount = reminders.filter((reminder) => reminder.status === "Pending").length;
    return `${openCount} pendientes · ${reminders.length} total`;
  }, [reminders]);

  const templateCountLabel = useMemo(() => {
    if (!templates.length) return "Sin templates todavía";
    const defaultCount = templates.filter((template) => template.is_default).length;
    return defaultCount
      ? `${templates.length} guardados · ${defaultCount} predeterminado`
      : `${templates.length} guardados`;
  }, [templates]);

  const loadProfiles = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id,full_name,email,user_id,is_active")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) return;
    setProfiles((data || []) as ProposalProfileRow[]);
  }, [profile?.company_id]);

  const loadNotes = useCallback(async () => {
    if (!proposal?.id || !profile?.company_id) return;

    setLoadingNotes(true);
    const { data, error } = await (supabase as any)
      .from("proposal_notes")
      .select(
        "id,company_id,proposal_id,author_profile_id,kind,content,archived_at,created_at,updated_at,author:profiles!proposal_notes_author_profile_id_fkey(id,full_name,email)",
      )
      .eq("company_id", profile.company_id)
      .eq("proposal_id", proposal.id)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);
    setLoadingNotes(false);

    if (error) {
      toast.error(error.message || "No se pudieron cargar las notas de la propuesta.");
      return;
    }

    setNotes((data || []) as ProposalNoteRow[]);
  }, [profile?.company_id, proposal?.id]);

  const loadComments = useCallback(async () => {
    if (!proposal?.id || !profile?.company_id) return;

    setLoadingComments(true);
    const { data, error } = await (supabase as any)
      .from("proposal_comments")
      .select(
        "id,company_id,proposal_id,author_profile_id,author_name,author_email,visibility,content,archived_at,created_at,updated_at,author:profiles!proposal_comments_author_profile_id_fkey(id,full_name,email)",
      )
      .eq("company_id", profile.company_id)
      .eq("proposal_id", proposal.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    setLoadingComments(false);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los comentarios de la propuesta.");
      return;
    }

    setComments((data || []) as ProposalCommentRow[]);
  }, [profile?.company_id, proposal?.id]);

  const loadTasks = useCallback(async () => {
    if (!proposal?.id || !profile?.company_id) return;

    setLoadingTasks(true);
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select(
        "id,company_id,title,description,status,priority,assigned_to,due_date,related_client_id,related_proposal_id,updated_at",
      )
      .eq("company_id", profile.company_id)
      .eq("related_proposal_id", proposal.id)
      .order("updated_at", { ascending: false })
      .limit(200);
    setLoadingTasks(false);

    if (error) {
      toast.error(error.message || "No se pudieron cargar las tareas de la propuesta.");
      return;
    }

    setTasks((data || []) as ProposalTaskRow[]);
  }, [profile?.company_id, proposal?.id]);

  const loadReminders = useCallback(async () => {
    if (!proposal?.id || !profile?.company_id) return;

    setLoadingReminders(true);
    const { data, error } = await (supabase as any)
      .from("proposal_reminders")
      .select(
        "id,company_id,proposal_id,assigned_to,created_by,title,notes,remind_at,status,completed_at,archived_at,created_at,updated_at",
      )
      .eq("company_id", profile.company_id)
      .eq("proposal_id", proposal.id)
      .is("archived_at", null)
      .order("remind_at", { ascending: true })
      .limit(200);
    setLoadingReminders(false);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los recordatorios de la propuesta.");
      return;
    }

    setReminders((data || []) as ProposalReminderRow[]);
  }, [profile?.company_id, proposal?.id]);

  const loadTemplates = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoadingTemplates(true);
    const { data, error } = await (supabase as any)
      .from("proposal_templates")
      .select(
        "id,company_id,created_by,title,description,content_html,content_json,is_default,is_active,archived_at,created_at,updated_at",
      )
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(100);
    setLoadingTemplates(false);

    if (error) {
      toast.error(error.message || "No se pudieron cargar los templates.");
      return;
    }

    setTemplates((data || []) as ProposalTemplateRow[]);
  }, [profile?.company_id]);

  useEffect(() => {
    if (!open || !proposal?.id) return;
    void loadProfiles();
    void loadNotes();
    void loadComments();
    void loadTasks();
    void loadReminders();
    void loadTemplates();
  }, [
    loadComments,
    loadNotes,
    loadProfiles,
    loadReminders,
    loadTasks,
    loadTemplates,
    open,
    proposal?.id,
  ]);

  useEffect(() => {
    if (!open) {
      setNoteDraft("");
      setCommentDraft("");
      setEditingNote(null);
      setEditingComment(null);
      setCommentVisibility("internal");
      setNoteDialogOpen(false);
      setCommentDialogOpen(false);
      setTaskDialogOpen(false);
      setReminderDialogOpen(false);
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateDraft(emptyTemplateDraft);
      setReminderDraft({
        title: "",
        notes: "",
        remindAt: "",
        assignedTo: "unassigned",
      });
    }
  }, [open]);

  async function handleDelete() {
    const ok = window.confirm("¿Seguro que deseas eliminar esta propuesta?");
    if (!ok) return;
    await onDelete();
  }

  async function saveNote() {
    if (!proposal?.id || !profile?.company_id)
      return toast.error("No se pudo identificar tu compañía.");
    const content = noteDraft.trim();
    if (!content) return toast.error("Escribe una nota antes de guardar.");

    setSavingNote(true);
    const request = editingNote
      ? (supabase as any)
          .from("proposal_notes")
          .update({ content })
          .eq("id", editingNote.id)
          .eq("company_id", profile.company_id)
      : (supabase as any).from("proposal_notes").insert({
          company_id: profile.company_id,
          proposal_id: proposal.id,
          author_profile_id: profile.id || null,
          kind: "internal",
          content,
        });
    const { error } = await request;
    setSavingNote(false);

    if (error) return toast.error(error.message || "No se pudo guardar la nota.");

    const action = editingNote ? "proposal_note_updated" : "proposal_note_created";
    const entityId = editingNote?.id || proposal.id;
    setNoteDraft("");
    setEditingNote(null);
    setNoteDialogOpen(false);
    await loadNotes();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action,
      entityType: "proposal_notes",
      entityId,
      detail: `Nota interna ${editingNote ? "actualizada" : "creada"} en propuesta ${proposal.number}`,
      metadata: { proposal_id: proposal.id },
    }).catch(() => {});
    toast.success(editingNote ? "Nota actualizada." : "Nota guardada.");
  }

  async function archiveNote(note: ProposalNoteRow) {
    if (!profile?.company_id) return;

    setSavingNote(true);
    const { error } = await (supabase as any)
      .from("proposal_notes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", note.id)
      .eq("company_id", profile.company_id);
    setSavingNote(false);

    if (error) return toast.error(error.message || "No se pudo eliminar la nota.");

    if (editingNote?.id === note.id) {
      setEditingNote(null);
      setNoteDraft("");
      setNoteDialogOpen(false);
    }
    await loadNotes();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "proposal_note_deleted",
      entityType: "proposal_notes",
      entityId: note.id,
      detail: `Nota interna archivada en propuesta ${proposal?.number || ""}`,
      metadata: { proposal_id: proposal?.id },
    }).catch(() => {});
    toast.success("Nota eliminada.");
  }

  async function saveComment() {
    if (!proposal?.id || !profile?.company_id)
      return toast.error("No se pudo identificar tu compañía.");
    const content = commentDraft.trim();
    if (!content) return toast.error("Escribe un comentario antes de guardar.");

    const authorName = String((profile as any)?.full_name || "").trim() || user?.email || null;
    const authorEmail = user?.email || (profile as any)?.email || null;

    setSavingComment(true);
    const request = editingComment
      ? (supabase as any)
          .from("proposal_comments")
          .update({ content, visibility: commentVisibility })
          .eq("id", editingComment.id)
          .eq("company_id", profile.company_id)
      : (supabase as any).from("proposal_comments").insert({
          company_id: profile.company_id,
          proposal_id: proposal.id,
          author_profile_id: profile.id || null,
          author_name: authorName,
          author_email: authorEmail,
          visibility: commentVisibility,
          content,
        });
    const { error } = await request;
    setSavingComment(false);

    if (error) return toast.error(error.message || "No se pudo guardar el comentario.");

    const action = editingComment ? "proposal_comment_updated" : "proposal_comment_created";
    const entityId = editingComment?.id || proposal.id;
    setCommentDraft("");
    setEditingComment(null);
    setCommentVisibility("internal");
    setCommentDialogOpen(false);
    await loadComments();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action,
      entityType: "proposal_comments",
      entityId,
      detail: `Comentario ${editingComment ? "actualizado" : "creado"} en propuesta ${proposal.number}`,
      metadata: { proposal_id: proposal.id, visibility: commentVisibility },
    }).catch(() => {});
    toast.success(editingComment ? "Comentario actualizado." : "Comentario guardado.");
  }

  async function archiveComment(comment: ProposalCommentRow) {
    if (!profile?.company_id) return;

    setSavingComment(true);
    const { error } = await (supabase as any)
      .from("proposal_comments")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", comment.id)
      .eq("company_id", profile.company_id);
    setSavingComment(false);

    if (error) return toast.error(error.message || "No se pudo eliminar el comentario.");

    if (editingComment?.id === comment.id) {
      setEditingComment(null);
      setCommentDraft("");
      setCommentVisibility("internal");
      setCommentDialogOpen(false);
    }
    await loadComments();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "proposal_comment_deleted",
      entityType: "proposal_comments",
      entityId: comment.id,
      detail: `Comentario archivado en propuesta ${proposal?.number || ""}`,
      metadata: { proposal_id: proposal?.id, visibility: comment.visibility },
    }).catch(() => {});
    toast.success("Comentario eliminado.");
  }

  async function updateTaskStatus(task: ProposalTaskRow, status: string) {
    if (!profile?.company_id) return;

    setSavingTask(true);
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ status })
      .eq("id", task.id)
      .eq("company_id", profile.company_id);
    setSavingTask(false);

    if (error) return toast.error(error.message || "No se pudo actualizar la tarea.");
    await loadTasks();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: status === "Completed" ? "proposal_task_completed" : "proposal_task_updated",
      entityType: "tasks",
      entityId: task.id,
      detail: `Tarea ${status === "Completed" ? "completada" : "actualizada"} desde propuesta ${proposal?.number || ""}`,
      metadata: { proposal_id: proposal?.id, status },
    }).catch(() => {});
    toast.success(status === "Completed" ? "Tarea completada." : "Tarea actualizada.");
  }

  async function saveReminder() {
    if (!proposal?.id || !profile?.company_id)
      return toast.error("No se pudo identificar tu compañía.");
    const title = reminderDraft.title.trim();
    if (!title) return toast.error("El título del recordatorio es obligatorio.");
    if (!reminderDraft.remindAt)
      return toast.error("Selecciona fecha y hora para el recordatorio.");

    setSavingReminder(true);
    const { data, error } = await (supabase as any)
      .from("proposal_reminders")
      .insert({
        company_id: profile.company_id,
        proposal_id: proposal.id,
        assigned_to: reminderDraft.assignedTo === "unassigned" ? null : reminderDraft.assignedTo,
        created_by: profile.id || null,
        title,
        notes: reminderDraft.notes.trim() || null,
        remind_at: new Date(reminderDraft.remindAt).toISOString(),
        status: "Pending",
      })
      .select("id")
      .single();
    setSavingReminder(false);

    if (error) return toast.error(error.message || "No se pudo crear el recordatorio.");

    setReminderDialogOpen(false);
    setReminderDraft({
      title: "",
      notes: "",
      remindAt: "",
      assignedTo: "unassigned",
    });
    await loadReminders();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "proposal_reminder_created",
      entityType: "proposal_reminders",
      entityId: data?.id || null,
      detail: `Recordatorio creado para propuesta ${proposal.number}: ${title}`,
      metadata: { proposal_id: proposal.id, remind_at: reminderDraft.remindAt },
    }).catch(() => {});
    toast.success("Recordatorio creado.");
  }

  async function updateReminderStatus(
    reminder: ProposalReminderRow,
    status: "Completed" | "Cancelled",
  ) {
    if (!profile?.company_id) return;

    setSavingReminder(true);
    const { error } = await (supabase as any)
      .from("proposal_reminders")
      .update({
        status,
        completed_at: status === "Completed" ? new Date().toISOString() : null,
      })
      .eq("id", reminder.id)
      .eq("company_id", profile.company_id);
    setSavingReminder(false);

    if (error) return toast.error(error.message || "No se pudo actualizar el recordatorio.");
    await loadReminders();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action:
        status === "Completed" ? "proposal_reminder_completed" : "proposal_reminder_cancelled",
      entityType: "proposal_reminders",
      entityId: reminder.id,
      detail: `Recordatorio ${status === "Completed" ? "completado" : "cancelado"} en propuesta ${proposal?.number || ""}`,
      metadata: { proposal_id: proposal?.id, status },
    }).catch(() => {});
    toast.success(status === "Completed" ? "Recordatorio completado." : "Recordatorio cancelado.");
  }

  function openCreateTemplateDialog() {
    setEditingTemplate(null);
    setTemplateDraft({
      title: "",
      description: "",
      contentHtml: "",
      isDefault: templates.length === 0,
    });
    setTemplateDialogOpen(true);
  }

  function openEditTemplateDialog(template: ProposalTemplateRow) {
    setEditingTemplate(template);
    setTemplateDraft({
      title: template.title,
      description: template.description || "",
      contentHtml: template.content_html || "",
      isDefault: template.is_default,
    });
    setTemplateDialogOpen(true);
  }

  async function saveTemplate() {
    if (!profile?.company_id) return toast.error("No se pudo identificar tu compañía.");
    const title = templateDraft.title.trim();
    const contentHtml = templateDraft.contentHtml.trim();
    if (!title) return toast.error("El título del template es obligatorio.");
    if (!contentHtml) return toast.error("Escribe el contenido del template antes de guardar.");

    setSavingTemplate(true);

    if (templateDraft.isDefault) {
      const { error: defaultError } = await (supabase as any)
        .from("proposal_templates")
        .update({ is_default: false })
        .eq("company_id", profile.company_id);
      if (defaultError) {
        setSavingTemplate(false);
        return toast.error(
          defaultError.message || "No se pudo actualizar el template predeterminado.",
        );
      }
    }

    const payload = {
      company_id: profile.company_id,
      created_by: profile.id || null,
      title,
      description: templateDraft.description.trim() || null,
      content_html: contentHtml,
      content_json: {
        editor: "tinymce",
        version: 1,
      },
      is_default: templateDraft.isDefault,
      is_active: true,
    };

    const request = editingTemplate
      ? (supabase as any)
          .from("proposal_templates")
          .update({
            title: payload.title,
            description: payload.description,
            content_html: payload.content_html,
            content_json: payload.content_json,
            is_default: payload.is_default,
            is_active: payload.is_active,
          })
          .eq("id", editingTemplate.id)
          .eq("company_id", profile.company_id)
          .select("id")
          .single()
      : (supabase as any).from("proposal_templates").insert(payload).select("id").single();

    const { data, error } = await request;
    setSavingTemplate(false);

    if (error) return toast.error(error.message || "No se pudo guardar el template.");

    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateDraft(emptyTemplateDraft);
    await loadTemplates();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: editingTemplate ? "proposal_template_updated" : "proposal_template_created",
      entityType: "proposal_templates",
      entityId: data?.id || editingTemplate?.id || null,
      detail: `Template de propuesta ${editingTemplate ? "actualizado" : "creado"}: ${title}`,
      metadata: { proposal_id: proposal?.id, is_default: templateDraft.isDefault },
    }).catch(() => {});
    toast.success(editingTemplate ? "Template actualizado." : "Template creado.");
  }

  async function archiveTemplate(template: ProposalTemplateRow) {
    if (!profile?.company_id) return;
    const ok = window.confirm(`¿Archivar el template "${template.title}"?`);
    if (!ok) return;

    setSavingTemplate(true);
    const { error } = await (supabase as any)
      .from("proposal_templates")
      .update({
        archived_at: new Date().toISOString(),
        is_active: false,
        is_default: false,
      })
      .eq("id", template.id)
      .eq("company_id", profile.company_id);
    setSavingTemplate(false);

    if (error) return toast.error(error.message || "No se pudo archivar el template.");

    await loadTemplates();
    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "proposal_template_archived",
      entityType: "proposal_templates",
      entityId: template.id,
      detail: `Template de propuesta archivado: ${template.title}`,
      metadata: { proposal_id: proposal?.id },
    }).catch(() => {});
    toast.success("Template archivado.");
  }

  async function applyTemplate(template: ProposalTemplateRow) {
    if (!proposal?.id || !profile?.company_id) return;

    setSavingTemplate(true);
    const { error } = await (supabase as any)
      .from("proposals")
      .update({
        template_id: template.id,
        template_key: "custom_html",
        content: template.content_html,
      })
      .eq("id", proposal.id)
      .eq("company_id", profile.company_id);
    setSavingTemplate(false);

    if (error) return toast.error(error.message || "No se pudo aplicar el template.");

    onProposalPatch?.({
      template_id: template.id,
      template_key: "custom_html",
      content: template.content_html,
      updated_at: new Date().toISOString(),
    });

    void logActivityEvent({
      companyId: profile.company_id,
      userId: profile.id || null,
      action: "proposal_template_applied",
      entityType: "proposals",
      entityId: proposal.id,
      detail: `Template aplicado a propuesta ${proposal.number}: ${template.title}`,
      metadata: { proposal_id: proposal.id, template_id: template.id },
    }).catch(() => {});
    toast.success("Template aplicado a esta propuesta.");
  }

  if (!proposal) return null;

  return (
    <SalesDocumentWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${proposal.number} · ${proposal.title}`}
      srTitle={proposal.title}
      status={<StatusBadge status={proposal.status} />}
      meta={
        <>
          <span>{client?.company_name || "Sin cliente vinculado"}</span>
          <span>·</span>
          <span>{product?.name || "Sin producto"}</span>
          <span>·</span>
          <span>{formatMoney(totalAmount, proposal.currency)}</span>
        </>
      }
      actions={
        <>
          <CrmDetailLineButton
            className="h-8"
            icon={<LinkIcon className="h-4 w-4" />}
            onClick={onCopyPublicLink}
          >
            Copiar enlace
          </CrmDetailLineButton>
          <CrmDetailLineButton
            className="h-8"
            icon={<ExternalLink className="h-4 w-4" />}
            onClick={onOpenPublicLink}
          >
            Ver pública
          </CrmDetailLineButton>
          {canEdit ? (
            <CrmDetailLineButton
              className="h-8"
              icon={<Pencil className="h-4 w-4" />}
              onClick={onEdit}
            >
              Editar
            </CrmDetailLineButton>
          ) : null}
          {canEdit ? (
            <CrmDetailLineButton
              className="h-8"
              tone="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={handleDelete}
            >
              Eliminar
            </CrmDetailLineButton>
          ) : null}
        </>
      }
      tabs={tabs}
      activeTab={activeTab}
      onActiveTabChange={(value) => setActiveTab(value as typeof activeTab)}
    >
            <TabsContent value="proposal" className="mt-0 space-y-5">
              <CrmDetailSummaryGrid
                columns={4}
                className="border-b border-slate-100 pb-4"
                items={[
                  {
                    key: "status",
                    label: "Estado",
                    value: <StatusBadge status={proposal.status} />,
                  },
                  { key: "date", label: "Fecha", value: formatDate(proposal.proposal_date) },
                  { key: "valid", label: "Válida hasta", value: formatDate(proposal.valid_until) },
                  {
                    key: "comments",
                    label: "Comentarios",
                    value: proposal.allow_comments === false ? "Desactivados" : "Permitidos",
                  },
                ]}
              />

              <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <div className="grid gap-4 border-b border-slate-100 pb-5 md:grid-cols-2">
                    <div>
                      <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                        Propuesta
                      </h3>
                      <p className="mt-2 text-lg font-normal text-slate-950">{proposal.number}</p>
                      <p className="mt-1 text-sm font-normal text-slate-500">{proposal.title}</p>
                      {proposal.description ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm font-normal leading-6 text-slate-600">
                          {proposal.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="md:text-right">
                      <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                        Para
                      </h3>
                      <p className="mt-2 text-lg font-normal text-slate-950">{recipientName}</p>
                      {recipientAddress ? (
                        <p className="mt-1 text-sm font-normal leading-5 text-slate-500">
                          {recipientAddress}
                        </p>
                      ) : null}
                      {recipientEmail ? (
                        <p className="mt-2 text-sm font-normal text-blue-600">{recipientEmail}</p>
                      ) : null}
                      {recipientPhone ? (
                        <p className="mt-1 text-sm font-normal text-blue-600">{recipientPhone}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="overflow-hidden border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Ítem</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Tarifa</TableHead>
                          <TableHead>Impuesto</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.length ? (
                          items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-normal text-slate-950">
                                {item.item_name || "Ítem"}
                              </TableCell>
                              <TableCell className="max-w-[320px] text-sm font-normal text-slate-500">
                                <span className="line-clamp-2">{item.description || "—"}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(item.quantity || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatMoney(Number(item.rate || 0), proposal.currency)}
                              </TableCell>
                              <TableCell>
                                {item.tax_name ||
                                  (Number(item.tax_rate || 0) ? `${item.tax_rate}%` : "—")}
                              </TableCell>
                              <TableCell className="text-right font-normal text-slate-950">
                                {formatMoney(Number(item.amount || 0), proposal.currency)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-8 text-center text-sm text-slate-500"
                            >
                              Esta propuesta todavía no tiene líneas detalladas.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <section className="border-y border-slate-100 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                        Contenido
                      </h3>
                      <CrmDetailLineButton
                        className="h-8"
                        icon={<Clipboard className="h-4 w-4" />}
                        onClick={() => {
                          void navigator.clipboard.writeText(copiedContent);
                          toast.success("Contenido copiado.");
                        }}
                      >
                        Copiar
                      </CrmDetailLineButton>
                    </div>
                    {renderedProposalContent ? (
                      <div className="mt-3 max-h-[460px] overflow-y-auto border border-slate-100 bg-white p-4">
                        <div
                          className="proposal-content-preview text-sm leading-6 text-slate-700 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_ul]:ml-5 [&_ul]:list-disc"
                          dangerouslySetInnerHTML={{ __html: renderedProposalContent }}
                        />
                      </div>
                    ) : (
                      <div className="mt-3 border border-slate-100 bg-slate-50/60 p-4 text-sm leading-6 text-slate-500">
                        Esta propuesta no tiene contenido escrito todavía.
                      </div>
                    )}
                  </section>
                </div>

                <aside className="space-y-4">
                  <div className="border border-slate-200 p-4">
                    <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                      Totales
                    </h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <SummaryLine
                        label="Subtotal"
                        value={formatMoney(subtotalAmount, proposal.currency)}
                      />
                      <SummaryLine
                        label="Impuestos"
                        value={formatMoney(taxAmount, proposal.currency)}
                      />
                      <div className="border-t border-slate-100 pt-3">
                        <SummaryLine
                          label="Total"
                          value={formatMoney(totalAmount, proposal.currency)}
                          strong
                        />
                      </div>
                      {proposal.amount_base != null && proposal.base_currency ? (
                        <p className="pt-1 text-xs font-normal text-slate-500">
                          Base interna:{" "}
                          {formatMoney(Number(proposal.amount_base), proposal.base_currency)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4">
                    <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                      Seguimiento
                    </h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <SummaryLine label="Enviada" value={formatDate(proposal.sent_at)} />
                      <SummaryLine label="Vista" value={formatDate(proposal.viewed_at)} />
                      <SummaryLine label="Aprobada" value={formatDate(proposal.approved_at)} />
                      <SummaryLine label="Actualizada" value={formatDate(proposal.updated_at)} />
                    </div>
                  </div>
                </aside>
              </section>
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <ProposalWorkspaceTextPanel
                title="Comentarios"
                description="Conversaciones internas o comentarios visibles para el cliente cuando habilitemos el portal público."
                countLabel={
                  comments.length === 0
                    ? "Sin comentarios todavía"
                    : comments.length === 1
                      ? "1 comentario"
                      : `${comments.length} comentarios`
                }
                canEdit={canEdit}
                loading={loadingComments}
                saving={savingComment}
                draft={commentDraft}
                onDraftChange={setCommentDraft}
                placeholder="Escribe un comentario sobre esta propuesta..."
                submitLabel={editingComment ? "Guardar comentario" : "Crear comentario"}
                onSubmit={() => void saveComment()}
                onCancelEdit={() => {
                  setEditingComment(null);
                  setCommentDraft("");
                  setCommentVisibility("internal");
                  setCommentDialogOpen(false);
                }}
                editing={Boolean(editingComment)}
                dialogOpen={commentDialogOpen}
                onDialogOpenChange={(nextOpen) => {
                  if (savingComment) return;
                  setCommentDialogOpen(nextOpen);
                  if (!nextOpen) {
                    setEditingComment(null);
                    setCommentDraft("");
                    setCommentVisibility("internal");
                  }
                }}
                onCreate={() => {
                  setEditingComment(null);
                  setCommentDraft("");
                  setCommentVisibility("internal");
                  setCommentDialogOpen(true);
                }}
                emptyIcon={<MessageSquare className="h-6 w-6" />}
                emptyTitle="No hay comentarios todavía"
                emptyDescription="Agrega comentarios internos para mantener el contexto de esta propuesta."
                onRefresh={() => void loadComments()}
                toolbar={
                  <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5">
                    {(["internal", "client"] as const).map((visibility) => (
                      <button
                        key={visibility}
                        type="button"
                        onClick={() => setCommentVisibility(visibility)}
                        disabled={!canEdit || savingComment}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition",
                          commentVisibility === visibility
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-500 hover:text-slate-800",
                        )}
                      >
                        {visibility === "internal" ? "Interno" : "Cliente"}
                      </button>
                    ))}
                  </div>
                }
              >
                {comments.map((comment) => (
                  <ProposalWorkspaceTextItem
                    key={comment.id}
                    author={authorLabel(comment.author, comment.author_name, comment.author_email)}
                    meta={`${comment.visibility === "client" ? "Cliente" : "Interno"} · ${relativeTimeLabel(
                      comment.updated_at,
                    )} · ${formatDateTime(comment.updated_at)}`}
                    content={comment.content}
                    canEdit={canEdit}
                    saving={savingComment}
                    onEdit={() => {
                      setEditingComment(comment);
                      setCommentDraft(comment.content);
                      setCommentVisibility(comment.visibility);
                      setCommentDialogOpen(true);
                    }}
                    onArchive={() => void archiveComment(comment)}
                  />
                ))}
              </ProposalWorkspaceTextPanel>
            </TabsContent>
            <TabsContent value="reminders" className="mt-0">
              <ProposalRemindersPanel
                reminders={reminders}
                profilesById={profilesById}
                canEdit={canEdit}
                loading={loadingReminders}
                saving={savingReminder}
                countLabel={reminderCountLabel}
                onRefresh={() => void loadReminders()}
                onCreate={() => {
                  setReminderDraft({
                    title: `Dar seguimiento a ${proposal.title}`,
                    notes: "",
                    remindAt: defaultReminderDateTime(),
                    assignedTo: profile?.id || "unassigned",
                  });
                  setReminderDialogOpen(true);
                }}
                onComplete={(reminder) => void updateReminderStatus(reminder, "Completed")}
                onCancel={(reminder) => void updateReminderStatus(reminder, "Cancelled")}
              />
            </TabsContent>
            <TabsContent value="tasks" className="mt-0">
              <ProposalTasksPanel
                tasks={tasks}
                profilesById={profilesById}
                canEdit={canEdit}
                loading={loadingTasks}
                saving={savingTask}
                countLabel={taskCountLabel}
                onRefresh={() => void loadTasks()}
                onCreate={() => setTaskDialogOpen(true)}
                onComplete={(task) => void updateTaskStatus(task, "Completed")}
              />
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <ProposalWorkspaceTextPanel
                title="Notas internas"
                description="Contexto privado del equipo: decisiones, acuerdos, cambios y próximos pasos."
                countLabel={
                  notes.length === 0
                    ? "Sin notas todavía"
                    : notes.length === 1
                      ? "1 nota interna"
                      : `${notes.length} notas internas`
                }
                canEdit={canEdit}
                loading={loadingNotes}
                saving={savingNote}
                draft={noteDraft}
                onDraftChange={setNoteDraft}
                placeholder="Escribe una nota interna sobre esta propuesta..."
                submitLabel={editingNote ? "Guardar nota" : "Crear nota"}
                onSubmit={() => void saveNote()}
                onCancelEdit={() => {
                  setEditingNote(null);
                  setNoteDraft("");
                  setNoteDialogOpen(false);
                }}
                editing={Boolean(editingNote)}
                dialogOpen={noteDialogOpen}
                onDialogOpenChange={(nextOpen) => {
                  if (savingNote) return;
                  setNoteDialogOpen(nextOpen);
                  if (!nextOpen) {
                    setEditingNote(null);
                    setNoteDraft("");
                  }
                }}
                onCreate={() => {
                  setEditingNote(null);
                  setNoteDraft("");
                  setNoteDialogOpen(true);
                }}
                emptyIcon={<StickyNote className="h-6 w-6" />}
                emptyTitle="Sin notas todavía"
                emptyDescription="Agrega la primera nota interna para mantener claro el seguimiento."
                onRefresh={() => void loadNotes()}
              >
                {notes.map((note) => (
                  <ProposalWorkspaceTextItem
                    key={note.id}
                    author={authorLabel(note.author)}
                    meta={`${relativeTimeLabel(note.updated_at)} · ${formatDateTime(note.updated_at)}`}
                    content={note.content}
                    canEdit={canEdit}
                    saving={savingNote}
                    onEdit={() => {
                      setEditingNote(note);
                      setNoteDraft(note.content);
                      setNoteDialogOpen(true);
                    }}
                    onArchive={() => void archiveNote(note)}
                  />
                ))}
              </ProposalWorkspaceTextPanel>
            </TabsContent>
            <TabsContent value="templates" className="mt-0">
              <ProposalTemplatesPanel
                templates={templates}
                loading={loadingTemplates}
                saving={savingTemplate}
                canEdit={canEdit}
                countLabel={templateCountLabel}
                activeTemplateId={proposal.template_id}
                onCreate={openCreateTemplateDialog}
                onRefresh={() => void loadTemplates()}
                onEdit={openEditTemplateDialog}
                onArchive={(template) => void archiveTemplate(template)}
                onApply={(template) => void applyTemplate(template)}
              />
            </TabsContent>

        <Dialog
          open={templateDialogOpen}
          onOpenChange={(nextOpen) => {
            if (savingTemplate) return;
            setTemplateDialogOpen(nextOpen);
            if (!nextOpen) {
              setEditingTemplate(null);
              setTemplateDraft(emptyTemplateDraft);
            }
          }}
        >
          <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none [&>button:last-child]:hidden">
            <DialogTitle className="sr-only">
              {editingTemplate ? "Editar template" : "Crear template"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Crea o edita una plantilla reutilizable para propuestas comerciales.
            </DialogDescription>
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) => {
                event.preventDefault();
                void saveTemplate();
              }}
            >
              <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTemplateDialogOpen(false);
                      setEditingTemplate(null);
                      setTemplateDraft(emptyTemplateDraft);
                    }}
                    disabled={savingTemplate}
                    className="h-10 w-10 shrink-0 rounded-full text-slate-700 hover:bg-slate-100"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Input
                    aria-label="Título del template"
                    value={templateDraft.title}
                    onChange={(event) =>
                      setTemplateDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Ej: Propuesta web corporativa"
                    disabled={savingTemplate}
                    className="h-11 min-w-0 flex-1 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 text-xl font-normal tracking-normal text-slate-950 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => printProposalTemplateHtml(templateDraft.contentHtml)}
                    className="h-10 shrink-0 rounded-full px-4 text-sm"
                  >
                    <Printer className="mr-1.5 h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 bg-white">
                <ProposalTemplateEditor
                  value={templateDraft.contentHtml}
                  onChange={(contentHtml) =>
                    setTemplateDraft((current) => ({ ...current, contentHtml }))
                  }
                  disabled={savingTemplate}
                  className="h-full"
                />
              </div>
              <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setTemplateDialogOpen(false);
                    setEditingTemplate(null);
                    setTemplateDraft(emptyTemplateDraft);
                  }}
                  disabled={savingTemplate}
                  className="rounded-full px-4"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    savingTemplate ||
                    !templateDraft.title.trim() ||
                    !templateDraft.contentHtml.trim()
                  }
                  className="rounded-full px-4"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {editingTemplate ? "Guardar template" : "Crear template"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <TaskCreateDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          companyId={profile?.company_id}
          currentUserId={(profile as any)?.user_id || user?.id || null}
          profiles={profiles}
          relatedProposalId={proposal.id}
          canCreate={canEdit}
          initialValues={{
            title: `Seguimiento de propuesta ${proposal.number}`,
            clientId: proposal.client_id || undefined,
            assignedTo: (profile as any)?.user_id || user?.id || undefined,
          }}
          onCreated={async (task) => {
            await loadTasks();
            void logActivityEvent({
              companyId: profile?.company_id || task.company_id,
              userId: profile?.id || null,
              action: "proposal_task_created",
              entityType: "tasks",
              entityId: task.id,
              detail: `Tarea creada desde propuesta ${proposal.number}: ${task.title}`,
              metadata: { proposal_id: proposal.id, related_client_id: proposal.client_id },
            }).catch(() => {});
          }}
        />

        <ProjectWorkspaceFormDialog
          open={reminderDialogOpen}
          onOpenChange={(nextOpen) => {
            if (savingReminder) return;
            setReminderDialogOpen(nextOpen);
          }}
          title="Crear recordatorio"
          description="Seguimiento vinculado a esta propuesta."
          size="md"
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void saveReminder();
            }}
          >
            <div className="space-y-2">
              <Label className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Título
              </Label>
              <Input
                value={reminderDraft.title}
                onChange={(event) =>
                  setReminderDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ej: Llamar para dar seguimiento"
                disabled={savingReminder}
                className="h-11 rounded-2xl border-slate-200 shadow-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                  Fecha y hora
                </Label>
                <Input
                  type="datetime-local"
                  value={reminderDraft.remindAt}
                  onChange={(event) =>
                    setReminderDraft((current) => ({ ...current, remindAt: event.target.value }))
                  }
                  disabled={savingReminder}
                  className="h-11 rounded-2xl border-slate-200 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                  Responsable
                </Label>
                <Select
                  value={reminderDraft.assignedTo}
                  onValueChange={(value) =>
                    setReminderDraft((current) => ({ ...current, assignedTo: value }))
                  }
                  disabled={savingReminder}
                >
                  <SelectTrigger className="h-11 rounded-2xl border-slate-200 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin responsable</SelectItem>
                    {profiles.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {authorLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Notas
              </Label>
              <Textarea
                value={reminderDraft.notes}
                onChange={(event) =>
                  setReminderDraft((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Contexto del seguimiento."
                disabled={savingReminder}
                className="min-h-[130px] rounded-2xl border-slate-200 shadow-none"
              />
            </div>

            <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReminderDialogOpen(false)}
                disabled={savingReminder}
                className="rounded-full px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingReminder || !reminderDraft.title.trim() || !reminderDraft.remindAt}
                className="rounded-full px-4"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Crear recordatorio
              </Button>
            </div>
          </form>
        </ProjectWorkspaceFormDialog>
    </SalesDocumentWorkspaceDialog>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={cn("text-right text-slate-950", strong && "text-base font-semibold")}>
        {value}
      </span>
    </div>
  );
}

function ProposalTasksPanel({
  tasks,
  profilesById,
  canEdit,
  loading,
  saving,
  countLabel,
  onRefresh,
  onCreate,
  onComplete,
}: {
  tasks: ProposalTaskRow[];
  profilesById: Map<string, ProposalProfileRow>;
  canEdit: boolean;
  loading: boolean;
  saving: boolean;
  countLabel: string;
  onRefresh: () => void;
  onCreate: () => void;
  onComplete: (task: ProposalTaskRow) => void;
}) {
  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Tareas de la propuesta
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Trabajo interno vinculado a esta propuesta.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {countLabel}
            </span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreate}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Crear tarea
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="p-6 text-sm font-medium text-slate-500">Cargando tareas...</div>
        ) : tasks.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Tarea</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha límite</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const isClosed = ["completed", "cancelled"].includes(task.status.toLowerCase());
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div className="max-w-[320px]">
                        <div className="truncate font-semibold text-slate-950">{task.title}</div>
                        {task.description ? (
                          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {task.description}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>{formatDate(task.due_date)}</TableCell>
                    <TableCell>{task.priority || "Medium"}</TableCell>
                    <TableCell>{profileLabel(profilesById, task.assigned_to)}</TableCell>
                    <TableCell className="text-right">
                      {canEdit && !isClosed ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onComplete(task)}
                          disabled={saving}
                          className="h-8 rounded-full px-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Completar
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="No hay tareas todavía"
              description="Crea tareas para dar seguimiento interno a esta propuesta."
              actionLabel={canEdit ? "Crear tarea" : undefined}
              onAction={canEdit ? onCreate : undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ProposalRemindersPanel({
  reminders,
  profilesById,
  canEdit,
  loading,
  saving,
  countLabel,
  onRefresh,
  onCreate,
  onComplete,
  onCancel,
}: {
  reminders: ProposalReminderRow[];
  profilesById: Map<string, ProposalProfileRow>;
  canEdit: boolean;
  loading: boolean;
  saving: boolean;
  countLabel: string;
  onRefresh: () => void;
  onCreate: () => void;
  onComplete: (reminder: ProposalReminderRow) => void;
  onCancel: (reminder: ProposalReminderRow) => void;
}) {
  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Recordatorios de la propuesta
            </h3>
            <p className="mt-1 text-sm text-slate-500">Próximos seguimientos internos.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {countLabel}
            </span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreate}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Crear recordatorio
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="p-6 text-sm font-medium text-slate-500">Cargando recordatorios...</div>
        ) : reminders.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Recordatorio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminders.map((reminder) => (
                <TableRow key={reminder.id}>
                  <TableCell>
                    <div className="max-w-[360px]">
                      <div className="truncate font-semibold text-slate-950">{reminder.title}</div>
                      {reminder.notes ? (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {reminder.notes}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={reminder.status} />
                  </TableCell>
                  <TableCell>{formatDateTime(reminder.remind_at)}</TableCell>
                  <TableCell>{profileLabel(profilesById, reminder.assigned_to)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && reminder.status === "Pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onComplete(reminder)}
                          disabled={saving}
                          className="h-8 rounded-full px-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Completar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(reminder)}
                          disabled={saving}
                          className="h-8 rounded-full px-3 text-xs font-semibold text-slate-400 hover:text-rose-600"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="No hay recordatorios todavía"
              description="Programa el próximo seguimiento de esta propuesta."
              actionLabel={canEdit ? "Crear recordatorio" : undefined}
              onAction={canEdit ? onCreate : undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ProposalTemplatesPanel({
  templates,
  loading,
  saving,
  canEdit,
  countLabel,
  activeTemplateId,
  onCreate,
  onRefresh,
  onEdit,
  onArchive,
  onApply,
}: {
  templates: ProposalTemplateRow[];
  loading: boolean;
  saving: boolean;
  canEdit: boolean;
  countLabel: string;
  activeTemplateId?: string | null;
  onCreate: () => void;
  onRefresh: () => void;
  onEdit: (template: ProposalTemplateRow) => void;
  onArchive: (template: ProposalTemplateRow) => void;
  onApply: (template: ProposalTemplateRow) => void;
}) {
  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">Templates</h3>
            <p className="mt-1 text-sm text-slate-500">
              Plantillas reutilizables para armar propuestas con estructura profesional.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {countLabel}
            </span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreate}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Crear template
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="p-6 text-sm font-medium text-slate-500">Cargando templates...</div>
        ) : templates.length ? (
          <div className="divide-y divide-slate-100">
            {templates.map((template) => {
              const isApplied = Boolean(activeTemplateId && activeTemplateId === template.id);
              return (
                <article key={template.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold tracking-[-0.01em] text-slate-950">
                          {template.title}
                        </h4>
                        {template.is_default ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            Predeterminado
                          </span>
                        ) : null}
                        {isApplied ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                            En uso
                          </span>
                        ) : null}
                      </div>
                      {template.description ? (
                        <p className="text-sm leading-6 text-slate-500">{template.description}</p>
                      ) : null}
                      <div className="text-xs font-medium text-slate-400">
                        Actualizado {relativeTimeLabel(template.updated_at)}
                      </div>
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onApply(template)}
                          disabled={saving}
                          className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          {isApplied ? "Actualizar propuesta" : "Aplicar"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(template)}
                          disabled={saving}
                          className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500 hover:text-slate-900"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onArchive(template)}
                          disabled={saving}
                          className="h-8 rounded-full px-3 text-xs font-semibold text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Archivar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={<LayoutTemplate className="h-6 w-6" />}
              title="Sin templates todavía"
              description="Crea una plantilla base para reutilizarla en nuevas propuestas."
              actionLabel={canEdit ? "Crear template" : undefined}
              onAction={canEdit ? onCreate : undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ProposalTemplateEditor({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const uiContainerId = useId().replace(/:/g, "");
  const editorRef = useRef<any>(null);
  const latestValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [isReady, setIsReady] = useState(false);
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    latestValueRef.current = value;
    const editor = editorRef.current;
    if (!editor) return;
    const currentContent = editor.getContent();
    if (currentContent !== value) editor.setContent(value || "");
  }, [value]);

  useEffect(() => {
    let cancelled = false;

    loadTinyMceFromCdn()
      .then(() => {
        if (cancelled || !textareaRef.current || !(window as any).tinymce) return;
        return (window as any).tinymce.init({
          target: textareaRef.current,
          base_url: "https://cdn.jsdelivr.net/npm/tinymce@6",
          suffix: ".min",
          height: "100%",
          min_height: 520,
          menubar: "file edit view insert format table tools",
          branding: false,
          promotion: false,
          resize: false,
          ui_container: `#${uiContainerId}`,
          plugins:
            "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table pagebreak wordcount help",
          toolbar:
            "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table pagebreak | removeformat | preview fullscreen code",
          toolbar_mode: "sliding",
          block_formats:
            "Párrafo=p; Título 1=h1; Título 2=h2; Título 3=h3; Cita=blockquote; Código=pre",
          font_family_formats: proposalTemplateFontFamilyFormats,
          font_size_formats: "10pt 11pt 12pt 14pt 16pt 18pt 24pt 30pt 36pt",
          pagebreak_separator: '<hr data-mce-pagebreak="true" class="mce-pagebreak" />',
          content_css: [proposalTemplateGoogleFontsCssUrl],
          content_style: proposalTemplateDocumentContentStyle,
          setup: (editor: any) => {
            editor.on("init", () => {
              editor.setContent(latestValueRef.current || "");
              if (disabledRef.current) editor.mode.set("readonly");
              setIsReady(true);
            });
            editor.on("Change KeyUp SetContent Undo Redo", () => {
              onChangeRef.current(editor.getContent());
            });
          },
        });
      })
      .then((editors: any[] | undefined) => {
        if (cancelled || !editors?.[0]) return;
        editorRef.current = editors[0];
      })
      .catch(() => {
        if (!cancelled) setDidFail(true);
      });

    return () => {
      cancelled = true;
      if (editorRef.current) {
        editorRef.current.remove();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.mode.set(disabled ? "readonly" : "design");
  }, [disabled]);

  if (didFail) {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="<h2>Resumen ejecutivo</h2><p>Describe la propuesta...</p>"
        className="min-h-[340px] resize-y rounded-2xl border-slate-200 bg-white text-sm leading-6 shadow-none"
      />
    );
  }

  return (
    <div
      id={uiContainerId}
      className={cn(
        "relative flex min-h-[560px] flex-col overflow-hidden bg-slate-100 [&_.tox-menu]:!z-[70] [&_.tox-pop]:!z-[70] [&_.tox-tinymce-aux]:!z-[70]",
        className,
      )}
    >
      <div className="relative min-h-0 flex-1 [&_.tox-editor-container]:!min-h-0 [&_.tox-sidebar-wrap]:!min-h-0 [&_.tox-tinymce]:!h-full [&_.tox-tinymce]:!border-0">
        {!isReady ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm font-semibold text-slate-500">
            Cargando editor...
          </div>
        ) : null}
        <textarea ref={textareaRef} defaultValue={value} />
      </div>
    </div>
  );
}

function printProposalTemplateHtml(html: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";

  const removePrintFrame = () => {
    window.setTimeout(() => printFrame.remove(), 250);
  };

  document.body.appendChild(printFrame);
  const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!printDocument || !printFrame.contentWindow) {
    printFrame.remove();
    toast.error("No se pudo preparar la impresión.");
    return;
  }

  printDocument.open();
  printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <title>Imprimir propuesta</title>
          <style>
            @page { size: Letter; margin: 0; }
            html { background: #ffffff; }
            body {
              width: 8.5in;
              min-height: 11in;
              margin: 0 auto;
              padding: 0.65in;
              box-sizing: border-box;
              background: white;
              color: #0f172a;
              font-family: Inter, Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.55;
            }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 1px solid #dbe3ef; padding: 8px; vertical-align: top; }
            img { max-width: 100%; height: auto; }
            .mce-pagebreak, hr[data-mce-pagebreak] {
              border: 0;
              border-top: 2px dashed #94a3b8;
              break-after: page;
              page-break-after: always;
            }
            @media print {
              html, body { background: white; }
              body { margin: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>${html || ""}</body>
      </html>
    `);
  printDocument.close();

  printFrame.contentWindow.onafterprint = removePrintFrame;
  window.setTimeout(() => {
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();
    window.setTimeout(removePrintFrame, 1200);
  }, 250);
}

function ProposalWorkspaceTextPanel({
  title,
  description,
  countLabel,
  canEdit,
  loading,
  saving,
  draft,
  onDraftChange,
  placeholder,
  submitLabel,
  onSubmit,
  onCancelEdit,
  editing,
  dialogOpen,
  onDialogOpenChange,
  onCreate,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRefresh,
  toolbar,
  children,
}: {
  title: string;
  description: string;
  countLabel: string;
  canEdit: boolean;
  loading: boolean;
  saving: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  placeholder: string;
  submitLabel: string;
  onSubmit: () => void;
  onCancelEdit: () => void;
  editing: boolean;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onCreate: () => void;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onRefresh: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const hasChildren = Boolean(children && (!Array.isArray(children) || children.length > 0));

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {countLabel}
            </span>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreate}
                disabled={saving}
                className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {submitLabel
                  .replace("Guardar ", "Crear ")
                  .replace("Crear comentario", "Crear comentario")
                  .replace("Crear nota", "Crear nota")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading || saving}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      <ProjectWorkspaceFormDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        title={editing ? submitLabel : submitLabel.replace("Crear", "Crear")}
        description="Visible dentro del workspace de esta propuesta."
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-[180px] resize-y rounded-2xl border-slate-200 bg-white text-sm leading-6 shadow-none"
            disabled={saving}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
          </div>
          <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancelEdit}
              disabled={saving}
              className="rounded-full px-4"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !draft.trim()} className="rounded-full px-4">
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {submitLabel}
            </Button>
          </div>
        </form>
      </ProjectWorkspaceFormDialog>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {loading ? (
          <div className="p-6 text-sm font-medium text-slate-500">Cargando información...</div>
        ) : hasChildren ? (
          children
        ) : (
          <div className="p-4 sm:p-5">
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={canEdit ? submitLabel.replace("Guardar ", "Crear ") : undefined}
              onAction={canEdit ? onCreate : undefined}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ProposalWorkspaceTextItem({
  author,
  meta,
  content,
  canEdit,
  saving,
  onEdit,
  onArchive,
}: {
  author: string;
  meta: string;
  content: string;
  canEdit: boolean;
  saving: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <article className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950">{author}</div>
          <div className="mt-1 text-xs font-normal text-slate-500">{meta}</div>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1 self-start">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={saving}
              className="h-7 rounded-full px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              <Edit3 className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onArchive}
              disabled={saving}
              className="h-7 rounded-full px-2.5 text-xs font-medium text-slate-400 hover:text-rose-600"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Eliminar
            </Button>
          </div>
        ) : null}
      </div>
      <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{content}</div>
    </article>
  );
}

function ProposalPlaceholder({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex min-h-[360px] max-w-2xl items-center justify-center">
      <EmptyState icon={icon} title={title} description={description} />
    </div>
  );
}
