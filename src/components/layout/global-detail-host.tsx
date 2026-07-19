import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  RefreshCw,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/status-badge";
import { CrmDetailRow, CrmDetailSection } from "@/components/crm/crm-detail";
import { DetailSheet } from "@/components/crm/detail-sheet";
import { EmailHtmlViewer } from "@/components/email/email-html-viewer";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { InvoiceDetailsPanel } from "@/components/invoices/invoice-details-panel";
import type { InvoiceActivityEvent } from "@/components/invoices/invoice-activity";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import { ProjectWorkspaceDialog } from "@/routes/projects";
import { TicketDetailDialog } from "@/routes/tickets";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarItem } from "@/lib/crm/calendar-items";
import { getCalendarEventTone } from "@/lib/crm/calendar-items";
import { isClosedTaskStatusValue } from "@/lib/crm/status";

type GlobalDetailGroup =
  | "clients"
  | "leads"
  | "tasks"
  | "projects"
  | "tickets"
  | "invoices"
  | "proposals"
  | "estimates"
  | "payments"
  | "credit_notes"
  | "expenses"
  | "subscriptions"
  | "email"
  | "conversations"
  | "calendar";

type GlobalDetailEvent = {
  group: GlobalDetailGroup;
  id: string;
  href?: string;
};

type GlobalTask = {
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

type ProjectTask = GlobalTask & {
  related_lead_id?: string | null;
  related_deal_id?: string | null;
  updated_at?: string | null;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  author_type: string;
  author_profile_id: string | null;
  contact_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  client_id?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  discount?: number | string | null;
  total?: number | string | null;
  notes?: string | null;
  date_issued?: string | null;
  due_date?: string | null;
  public_token?: string | null;
  payment_link?: string | null;
  paid_at?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  invoice_data?: Record<string, unknown> | null;
  currency?: string | null;
};

type GlobalEmailConversation = {
  id: string;
  subject: string | null;
  status: string | null;
  unread_count?: number | null;
  last_message_at?: string | null;
  snippet?: string | null;
  from_email?: string | null;
  to_email?: string | null;
};

type GlobalEmailMessage = {
  id: string;
  sender?: string | null;
  recipient?: string | null;
  subject?: string | null;
  body?: string | null;
  body_html?: string | null;
  direction?: string | null;
  from_email?: string | null;
  to_email?: string | null;
  snippet?: string | null;
  sent_at?: string | null;
  created_at: string;
};

type GlobalWhatsappConversation = {
  conversation_id: string;
  display_name?: string | null;
  contact_name?: string | null;
  whatsapp_profile_name?: string | null;
  lead_name?: string | null;
  business_name?: string | null;
  phone?: string | null;
  channel?: string | null;
  conversation_status?: string | null;
  unread_count?: number | null;
  selected_service?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
};

type GlobalWhatsappMessage = {
  message_id?: string | null;
  whatsapp_message_id?: string | null;
  conversation_id: string;
  direction?: string | null;
  message_type?: string | null;
  content?: string | null;
  button_title?: string | null;
  created_at: string;
  delivery_status?: string | null;
};

type GlobalRecordDetail = {
  kind:
    | "client"
    | "lead"
    | "proposal"
    | "estimate"
    | "payment"
    | "credit_note"
    | "expense"
    | "subscription";
  eyebrow: string;
  title: string;
  subtitle: string;
  status?: string | null;
  href: string;
  primaryActionLabel: string;
  sections: Array<{
    title: string;
    icon: ReactNode;
    rows: Array<{ label: string; value: ReactNode }>;
  }>;
  body?: { label: string; value: string | null | undefined };
};

const TICKET_LABELS: Record<string, string> = {
  "tickets.editAction": "Editar",
  "tickets.noDescription": "Sin descripción",
  "tickets.noMessages": "Sin mensajes",
  "tickets.table.priority": "Prioridad",
  "tickets.department": "Departamento",
  "tickets.service": "Servicio",
  "tickets.table.lastReply": "Última respuesta",
  "tickets.replyLabel": "Respuesta",
  "tickets.replyPlaceholder": "Escribe una respuesta...",
  "tickets.internalNote": "Nota interna",
  "tickets.addInternalNote": "Agregar nota interna",
  "tickets.sendReply": "Enviar respuesta",
};

function money(amount: unknown, currency = "USD") {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function dateText(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-DO", { month: "short", day: "numeric", year: "numeric" });
}

function dateTimeText(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-DO", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function extractEmailName(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "Remitente";
  const match = raw.match(/^\s*"?([^"<]+)"?\s*</);
  if (match?.[1]) return match[1].trim();
  return raw.replace(/<.*?>/g, "").trim() || raw;
}

function initials(value?: string | null) {
  const parts = extractEmailName(value).split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "@"
  );
}

function whatsappTitle(conversation: GlobalWhatsappConversation | null) {
  if (!conversation) return "Conversación";
  return (
    conversation.display_name ||
    conversation.contact_name ||
    conversation.whatsapp_profile_name ||
    conversation.lead_name ||
    conversation.business_name ||
    conversation.phone ||
    "Conversación"
  );
}

function buildInvoiceActivity(invoice: InvoiceRow): InvoiceActivityEvent[] {
  const events: InvoiceActivityEvent[] = [];
  if (invoice.created_at) {
    events.push({
      key: `${invoice.id}:created`,
      title: "Factura creada",
      description: invoice.number,
      date: invoice.created_at,
    } as InvoiceActivityEvent);
  }
  if (invoice.sent_at) {
    events.push({
      key: `${invoice.id}:sent`,
      title: "Factura enviada",
      description: null,
      date: invoice.sent_at,
    } as InvoiceActivityEvent);
  }
  if (invoice.viewed_at) {
    events.push({
      key: `${invoice.id}:viewed`,
      title: "Factura vista",
      description: null,
      date: invoice.viewed_at,
    } as InvoiceActivityEvent);
  }
  if (invoice.paid_at) {
    events.push({
      key: `${invoice.id}:paid`,
      title: "Factura pagada",
      description: null,
      date: invoice.paid_at,
    } as InvoiceActivityEvent);
  }
  return events;
}

function projectStats(tasks: ProjectTask[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => isClosedTaskStatusValue(task.status)).length;
  const abiertas = total - completed;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(
    (task) =>
      task.due_date && String(task.due_date) < today && !isClosedTaskStatusValue(task.status),
  ).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, abiertas, overdue, pct };
}

function buildCalendarItem(row: any): CalendarItem {
  return {
    id: `calendar_event-${row.id}`,
    relatedId: String(row.id),
    source: "calendar_event",
    title: row.title || "Evento programado",
    start: row.start_at,
    end: row.end_at,
    allDay: Boolean(row.all_day),
    status: row.status,
    description: row.description,
    location: row.location,
    eventType: row.type,
    href: "/calendar",
    context: row.type || "Evento manual",
    tone: getCalendarEventTone(row.type),
  };
}

function detailIcon(kind: GlobalRecordDetail["kind"]) {
  if (kind === "client") return <Building2 className="h-5 w-5" />;
  if (kind === "lead") return <Target className="h-5 w-5" />;
  if (kind === "proposal") return <FileText className="h-5 w-5" />;
  if (kind === "payment") return <CreditCard className="h-5 w-5" />;
  if (kind === "credit_note") return <RefreshCw className="h-5 w-5" />;
  if (kind === "expense") return <Receipt className="h-5 w-5" />;
  if (kind === "subscription") return <CalendarClock className="h-5 w-5" />;
  return <CircleDollarSign className="h-5 w-5" />;
}

function GlobalRecordDetailDialog({
  detail,
  onClose,
}: {
  detail: GlobalRecordDetail | null;
  onClose: () => void;
}) {
  if (detail?.kind === "client" || detail?.kind === "lead") {
    return (
      <DetailSheet
        open={!!detail}
        onClose={onClose}
        title={detail.title}
        subtitle={detail.subtitle}
        status={detail.status || undefined}
        accent={detail.kind === "client" ? "violet" : "blue"}
        size="lg"
        icon={detailIcon(detail.kind)}
        fields={detail.sections.flatMap((section) =>
          section.rows.map((row) => ({
            label: row.label,
            value: typeof row.value === "string" || typeof row.value === "number" ? row.value : "—",
          })),
        )}
        notes={detail.body?.value || undefined}
      >
        <div className="space-y-4">
          {detail.sections.map((section) => (
            <CrmDetailSection key={section.title} title={section.title} icon={section.icon}>
              <div className="space-y-3">
                {section.rows.map((row) => (
                  <CrmDetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </CrmDetailSection>
          ))}
        </div>
      </DetailSheet>
    );
  }

  return (
    <Dialog open={!!detail} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 p-0 md:h-[90vh] md:w-[calc(100vw-24px)] md:max-w-3xl md:rounded-2xl md:border [&>button]:hidden">
        {detail ? (
          <div className="flex h-full min-h-0 flex-col bg-white text-slate-950">
            <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-left md:px-6 md:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-500">{detail.eyebrow}</p>
                  <DialogTitle className="mt-1 line-clamp-2 text-[24px] font-extrabold leading-tight tracking-normal text-slate-950">
                    {detail.title}
                  </DialogTitle>
                  <p className="mt-2 truncate text-[14px] font-semibold text-slate-500">
                    {detail.subtitle}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {detail.status ? <StatusBadge status={detail.status} /> : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full text-slate-700"
                  onClick={onClose}
                  aria-label={`Cerrar ${detail.eyebrow.toLowerCase()}`}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="flex min-h-full flex-col gap-5 px-5 py-4 md:px-6 md:py-5">
                {detail.sections.map((section) => (
                  <section key={section.title}>
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                      <h3 className="flex min-w-0 items-center gap-2 text-[15px] font-extrabold text-slate-900">
                        <span className="text-slate-400">{section.icon}</span>
                        <span className="truncate">{section.title}</span>
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {section.rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-start justify-between gap-4 py-2.5 text-sm"
                        >
                          <div className="shrink-0 text-[12px] font-semibold text-slate-500">
                            {row.label}
                          </div>
                          <div className="min-w-0 text-right text-[13.5px] font-bold text-slate-900">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                {detail.body?.value ? (
                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
                      <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                        <FileText className="h-4 w-4 text-slate-400" />
                        {detail.body.label}
                      </h3>
                    </div>
                    <div className="whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[14px] font-medium leading-7 text-slate-800">
                      {detail.body.value}
                    </div>
                  </section>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GlobalEmailDetailDialog({
  conversation,
  messages,
  onClose,
}: {
  conversation: GlobalEmailConversation | null;
  messages: GlobalEmailMessage[];
  onClose: () => void;
}) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    setHeaderHidden(false);
    lastScrollTopRef.current = 0;
  }, [conversation?.id]);

  const handleBodyScroll = (event: UIEvent<HTMLDivElement>) => {
    const nextScrollTop = event.currentTarget.scrollTop;
    const delta = nextScrollTop - lastScrollTopRef.current;

    if (nextScrollTop < 24) {
      setHeaderHidden(false);
    } else if (delta > 10) {
      setHeaderHidden(true);
    } else if (delta < -10) {
      setHeaderHidden(false);
    }

    lastScrollTopRef.current = nextScrollTop;
  };

  return (
    <Dialog open={!!conversation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] w-[100dvw] max-w-[100dvw] overflow-hidden rounded-none border-0 p-0 md:h-[90vh] md:w-[calc(100vw-24px)] md:max-w-4xl md:rounded-2xl md:border [&>button]:hidden">
        {conversation ? (
          <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
            <DialogHeader
              className={`absolute inset-x-0 top-0 z-10 border-b bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-left shadow-[0_14px_30px_rgba(15,23,42,0.04)] transition-[opacity,transform] duration-200 ease-out md:relative md:translate-y-0 md:opacity-100 md:shadow-none md:py-4 ${
                headerHidden
                  ? "-translate-y-full opacity-0 md:translate-y-0 md:opacity-100"
                  : "translate-y-0 opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">Email</p>
                    <DialogTitle className="mt-1 line-clamp-2 text-xl font-bold leading-tight tracking-normal text-slate-950">
                      {conversation.subject || "Correo sin asunto"}
                    </DialogTitle>
                    <p className="mt-1 truncate text-sm font-medium text-slate-500">
                      {conversation.from_email ||
                        conversation.to_email ||
                        conversation.snippet ||
                        "Conversación de correo"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={onClose}
                  aria-label="Cerrar email"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {conversation.status ? <StatusBadge status={conversation.status} /> : null}
                {conversation.unread_count ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {conversation.unread_count} sin leer
                  </span>
                ) : null}
                <a
                  href={`/email?conversationId=${encodeURIComponent(conversation.id)}`}
                  className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                >
                  Abrir inbox completo
                </a>
              </div>
            </DialogHeader>

            <div
              className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-[190px] md:pt-0"
              onScroll={handleBodyScroll}
            >
              <div className="min-w-0 divide-y divide-slate-200 overflow-x-hidden">
                {messages.length ? (
                  messages.map((message) => {
                    const sender = message.from_email || message.sender;
                    return (
                      <article
                        key={message.id}
                        className="min-w-0 max-w-full overflow-x-hidden bg-white px-5 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700">
                              {initials(sender)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-950">
                                {extractEmailName(sender)}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {String(sender || "—").trim()}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-xs font-medium text-slate-400">
                            {dateTimeText(message.sent_at || message.created_at)}
                          </div>
                        </div>
                        <div className="mt-4 min-w-0 max-w-full overflow-hidden bg-white">
                          {message.body_html ? (
                            <EmailHtmlViewer html={message.body_html} />
                          ) : (
                            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                              {message.body || message.snippet || "Sin contenido"}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-sm font-medium text-slate-500">
                    No hay mensajes sincronizados para este correo.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GlobalWhatsappDetailDialog({
  conversation,
  messages,
  onClose,
}: {
  conversation: GlobalWhatsappConversation | null;
  messages: GlobalWhatsappMessage[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!conversation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 p-0 md:h-[90vh] md:w-[calc(100vw-24px)] md:max-w-3xl md:rounded-2xl md:border [&>button]:hidden">
        {conversation ? (
          <div className="flex h-full min-h-0 flex-col bg-[#f8fafc]">
            <DialogHeader className="shrink-0 border-b bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-left md:py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-50 text-lime-700">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500">
                      {conversation.channel || "WhatsApp"}
                    </p>
                    <DialogTitle className="mt-1 truncate text-xl font-bold leading-tight tracking-normal text-slate-950">
                      {whatsappTitle(conversation)}
                    </DialogTitle>
                    <p className="mt-1 truncate text-sm font-medium text-slate-500">
                      {conversation.phone ||
                        conversation.selected_service ||
                        "Mensajes y notificaciones"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full"
                  onClick={onClose}
                  aria-label="Cerrar conversación"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {conversation.conversation_status ? (
                  <StatusBadge status={conversation.conversation_status} />
                ) : null}
                {conversation.unread_count ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {conversation.unread_count} sin leer
                  </span>
                ) : null}
                <a
                  href={`/whatsapp?conversationId=${encodeURIComponent(conversation.conversation_id)}`}
                  className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                >
                  Abrir conversación completa
                </a>
              </div>
            </DialogHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-3 p-5">
                {messages.length ? (
                  messages.map((message) => {
                    const outbound = message.direction === "outbound";
                    const content = message.content || message.button_title || "Mensaje sin texto";
                    return (
                      <div
                        key={
                          message.message_id || message.whatsapp_message_id || message.created_at
                        }
                        className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            outbound
                              ? "rounded-br-md bg-slate-950 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <div className="whitespace-pre-wrap leading-6">{content}</div>
                          <div
                            className={`mt-2 text-[11px] font-medium ${
                              outbound ? "text-white/65" : "text-slate-400"
                            }`}
                          >
                            {dateTimeText(message.created_at)}
                            {message.delivery_status ? ` · ${message.delivery_status}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">
                    No hay mensajes disponibles para esta conversación.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function GlobalDetailHost() {
  const { profile } = useAuth();
  const [selection, setSelection] = useState<GlobalDetailEvent | null>(null);
  const [task, setTask] = useState<GlobalTask | null>(null);
  const [projectBundle, setProjectBundle] = useState<any | null>(null);
  const [ticket, setTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketReply, setTicketReply] = useState("");
  const [ticketReplyInternal, setTicketReplyInternal] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceDetailItem[]>([]);
  const [invoiceItemsLoading, setInvoiceItemsLoading] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState<CalendarItem | null>(null);
  const [recordDetail, setRecordDetail] = useState<GlobalRecordDetail | null>(null);
  const [emailConversation, setEmailConversation] = useState<GlobalEmailConversation | null>(null);
  const [emailMessages, setEmailMessages] = useState<GlobalEmailMessage[]>([]);
  const [whatsappConversation, setWhatsappConversation] =
    useState<GlobalWhatsappConversation | null>(null);
  const [whatsappMessages, setWhatsappMessages] = useState<GlobalWhatsappMessage[]>([]);

  const close = useCallback(() => {
    setSelection(null);
    setTask(null);
    setProjectBundle(null);
    setTicket(null);
    setTicketMessages([]);
    setTicketReply("");
    setTicketReplyInternal(false);
    setInvoice(null);
    setInvoiceItems([]);
    setCalendarEvent(null);
    setRecordDetail(null);
    setEmailConversation(null);
    setEmailMessages([]);
    setWhatsappConversation(null);
    setWhatsappMessages([]);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<GlobalDetailEvent>).detail;
      if (!detail?.group || !detail?.id) return;
      setSelection(detail);
    };
    window.addEventListener("corevix:open-global-detail", onOpen);
    return () => window.removeEventListener("corevix:open-global-detail", onOpen);
  }, []);

  useEffect(() => {
    if (!selection || !profile?.company_id) return;
    let cancelled = false;
    const db = supabase as any;
    const cid = profile.company_id;

    const load = async () => {
      try {
        if (selection.group === "clients") {
          const [
            clientRes,
            contactsRes,
            projectsRes,
            tasksRes,
            invoicesRes,
            proposalsRes,
            profilesRes,
          ] = await Promise.all([
            db.from("clients").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db
              .from("contacts")
              .select("id,first_name,last_name,email,phone,whatsapp,position,is_primary")
              .eq("company_id", cid)
              .eq("client_id", selection.id)
              .order("is_primary", { ascending: false }),
            db
              .from("projects")
              .select("id,name,status,due_date,updated_at")
              .eq("company_id", cid)
              .eq("client_id", selection.id)
              .order("updated_at", { ascending: false }),
            db
              .from("tasks")
              .select("id,title,status,priority,due_date,updated_at")
              .eq("company_id", cid)
              .eq("related_client_id", selection.id)
              .order("updated_at", { ascending: false }),
            db
              .from("invoices")
              .select("id,number,status,total,due_date,updated_at")
              .eq("company_id", cid)
              .eq("client_id", selection.id)
              .order("updated_at", { ascending: false }),
            db
              .from("proposals")
              .select("id,number,title,status,amount,valid_until,updated_at")
              .eq("company_id", cid)
              .eq("client_id", selection.id)
              .order("updated_at", { ascending: false }),
            db.from("profiles").select("id,user_id,full_name,email").eq("company_id", cid),
          ]);
          if (clientRes.error) throw clientRes.error;
          const client = clientRes.data;
          const contacts = contactsRes.data || [];
          const projects = projectsRes.data || [];
          const tasks = tasksRes.data || [];
          const invoices = invoicesRes.data || [];
          const proposals = proposalsRes.data || [];
          const manager =
            (profilesRes.data || []).find(
              (item: any) =>
                item.id === client.account_manager || item.user_id === client.account_manager,
            )?.full_name || "—";
          const primaryContact = contacts.find((item: any) => item.is_primary) || contacts[0];
          const pendingInvoices = invoices.filter((item: any) =>
            ["Sent", "Overdue", "Partially Paid", "Unpaid"].includes(String(item.status || "")),
          );
          if (!cancelled) {
            setRecordDetail({
              kind: "client",
              eyebrow: "Cliente",
              title: client.company_name || client.contact_person || "Cliente sin nombre",
              subtitle:
                text([client.industry, client.city, client.country].filter(Boolean).join(" · ")) ||
                "Cuenta CRM",
              status: client.status,
              href: `/clients?clientId=${encodeURIComponent(client.id)}`,
              primaryActionLabel: "Abrir ficha completa",
              sections: [
                {
                  title: "Contacto",
                  icon: <Phone className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Principal",
                      value: primaryContact
                        ? `${primaryContact.first_name || ""} ${primaryContact.last_name || ""}`.trim() ||
                          "—"
                        : client.contact_person || "—",
                    },
                    { label: "Email", value: primaryContact?.email || client.email || "—" },
                    { label: "Teléfono", value: primaryContact?.phone || client.phone || "—" },
                    {
                      label: "WhatsApp",
                      value: primaryContact?.whatsapp || client.whatsapp || "—",
                    },
                  ],
                },
                {
                  title: "Resumen",
                  icon: <Building2 className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Responsable", value: manager },
                    { label: "Contactos", value: contacts.length },
                    { label: "Proyectos", value: projects.length },
                    { label: "Tareas", value: tasks.length },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Facturas", value: invoices.length },
                    { label: "Pendientes", value: pendingInvoices.length },
                    { label: "Propuestas", value: proposals.length },
                    {
                      label: "Total facturado",
                      value: money(
                        invoices.reduce(
                          (sum: number, item: any) => sum + Number(item.total || 0),
                          0,
                        ),
                      ),
                    },
                  ],
                },
              ],
              body: { label: "Notas", value: client.notes },
            });
          }
          return;
        }

        if (selection.group === "leads") {
          const [leadRes, tasksRes, dealsRes, profilesRes] = await Promise.all([
            db.from("leads").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db
              .from("tasks")
              .select("id,title,status,priority,due_date,updated_at")
              .eq("company_id", cid)
              .eq("related_lead_id", selection.id)
              .order("updated_at", { ascending: false }),
            db
              .from("deals")
              .select("id,name,stage,value,expected_close,updated_at")
              .eq("company_id", cid)
              .eq("lead_id", selection.id)
              .order("updated_at", { ascending: false }),
            db.from("profiles").select("id,user_id,full_name,email").eq("company_id", cid),
          ]);
          if (leadRes.error) throw leadRes.error;
          const lead = leadRes.data;
          const tasks = tasksRes.data || [];
          const deals = dealsRes.data || [];
          const owner =
            (profilesRes.data || []).find(
              (item: any) => item.id === lead.assigned_to || item.user_id === lead.assigned_to,
            )?.full_name || "Sin asignar";
          const nextTask = tasks.find((item: any) => !isClosedTaskStatusValue(item.status));
          const latestDeal = deals[0];
          if (!cancelled) {
            setRecordDetail({
              kind: "lead",
              eyebrow: "Lead",
              title:
                lead.company_name ||
                text(`${lead.first_name || ""} ${lead.last_name || ""}`) ||
                lead.email ||
                "Lead sin nombre",
              subtitle:
                text(`${lead.first_name || ""} ${lead.last_name || ""}`) ||
                lead.email ||
                lead.phone ||
                "Prospecto",
              status: lead.status,
              href: `/leads?leadId=${encodeURIComponent(lead.id)}`,
              primaryActionLabel: "Abrir lead completo",
              sections: [
                {
                  title: "Contacto",
                  icon: <Target className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Email", value: lead.email || "—" },
                    { label: "Teléfono", value: lead.phone || "—" },
                    { label: "WhatsApp", value: lead.whatsapp || "—" },
                    { label: "Fuente", value: lead.source || lead.source_channel || "—" },
                  ],
                },
                {
                  title: "Seguimiento",
                  icon: <CalendarClock className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Responsable", value: owner },
                    { label: "Tareas", value: tasks.length },
                    { label: "Próxima tarea", value: nextTask?.title || "—" },
                    {
                      label: "Última interacción",
                      value: dateText(lead.last_interaction_at || lead.updated_at),
                    },
                  ],
                },
                {
                  title: "Venta",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Valor estimado", value: money(lead.estimated_value) },
                    { label: "Oportunidades", value: deals.length },
                    { label: "Última oportunidad", value: latestDeal?.name || "—" },
                    { label: "Etapa", value: latestDeal?.stage || "—" },
                  ],
                },
              ],
              body: { label: "Notas", value: lead.notes },
            });
          }
          return;
        }

        if (selection.group === "tasks") {
          const { data, error } = await db
            .from("tasks")
            .select("*")
            .eq("company_id", cid)
            .eq("id", selection.id)
            .single();
          if (error) throw error;
          if (!cancelled) setTask(data as GlobalTask);
          return;
        }

        if (selection.group === "projects") {
          const [projectRes, tasksRes, clientsRes, productsRes, dealsRes, leadsRes, profilesRes] =
            await Promise.all([
              db.from("projects").select("*").eq("company_id", cid).eq("id", selection.id).single(),
              db
                .from("tasks")
                .select("*")
                .eq("company_id", cid)
                .eq("related_project_id", selection.id)
                .order("updated_at", { ascending: false }),
              db
                .from("clients")
                .select("id,company_id,company_name,account_manager")
                .eq("company_id", cid),
              db
                .from("products")
                .select("id,company_id,name,category,base_price,is_active")
                .eq("company_id", cid),
              db
                .from("deals")
                .select(
                  "id,company_id,name,stage,value,lead_id,assigned_to,probability,expected_close,updated_at",
                )
                .eq("company_id", cid),
              db
                .from("leads")
                .select("id,company_id,first_name,last_name,company_name,email")
                .eq("company_id", cid),
              db
                .from("profiles")
                .select("id,company_id,full_name,email,user_id,is_active")
                .eq("company_id", cid),
            ]);
          if (projectRes.error) throw projectRes.error;
          const project = projectRes.data;
          const tasks = (tasksRes.data || []) as ProjectTask[];
          const clients = clientsRes.data || [];
          const products = productsRes.data || [];
          const deals = dealsRes.data || [];
          const leads = leadsRes.data || [];
          const profiles = profilesRes.data || [];
          const stats = projectStats(tasks);
          const today = new Date().toISOString().slice(0, 10);
          if (!cancelled) {
            setProjectBundle({
              project,
              tasks,
              clientName:
                clients.find((item: any) => item.id === project.client_id)?.company_name || "—",
              productName:
                products.find((item: any) => item.id === project.product_id)?.name || "—",
              dealName: deals.find((item: any) => item.id === project.deal_id)?.name || "—",
              leadName: (() => {
                const lead = leads.find((item: any) => item.id === project.lead_id);
                return lead
                  ? text(`${lead.first_name || ""} ${lead.last_name || ""}`) ||
                      lead.company_name ||
                      "—"
                  : "—";
              })(),
              managerName:
                profiles.find(
                  (item: any) => item.id === project.manager || item.user_id === project.manager,
                )?.full_name || "—",
              meta: {
                stats,
                isOverdue:
                  Boolean(project.due_date) &&
                  String(project.due_date) < today &&
                  !["Completed", "Cancelled"].includes(project.status),
                hasRisk: stats.overdue > 0,
              },
            });
          }
          return;
        }

        if (selection.group === "tickets") {
          const [ticketRes, messagesRes, clientsRes, projectsRes, profilesRes] = await Promise.all([
            db.from("tickets").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db
              .from("ticket_messages")
              .select("*")
              .eq("ticket_id", selection.id)
              .order("created_at", { ascending: true }),
            db.from("clients").select("id,company_name,contact_person").eq("company_id", cid),
            db.from("projects").select("id,name,client_id").eq("company_id", cid),
            db
              .from("profiles")
              .select("id,user_id,full_name,email,is_active")
              .eq("company_id", cid),
          ]);
          if (ticketRes.error) throw ticketRes.error;
          if (!cancelled) {
            const profileMap = new Map(
              (profilesRes.data || []).map((item: any) => [item.id, item]),
            );
            setTicket({
              row: ticketRes.data,
              clientName:
                (clientsRes.data || []).find((item: any) => item.id === ticketRes.data.client_id)
                  ?.company_name || "Sin cliente",
              projectName:
                (projectsRes.data || []).find((item: any) => item.id === ticketRes.data.project_id)
                  ?.name || "Sin proyecto",
              assignedName: profileMap.get(ticketRes.data.assigned_to)?.full_name || "Sin asignar",
              profileMap,
            });
            setTicketMessages(messagesRes.data || []);
          }
          return;
        }

        if (selection.group === "invoices") {
          setInvoiceItemsLoading(true);
          const [invoiceRes, itemsRes] = await Promise.all([
            db.from("invoices").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db
              .from("invoice_items")
              .select("id,description,quantity,unit_price,total,created_at")
              .eq("company_id", cid)
              .eq("invoice_id", selection.id)
              .order("created_at", { ascending: true }),
          ]);
          if (invoiceRes.error) throw invoiceRes.error;
          if (!cancelled) {
            setInvoice(invoiceRes.data as InvoiceRow);
            setInvoiceItems((itemsRes.data || []) as InvoiceDetailItem[]);
            setInvoiceItemsLoading(false);
          }
          return;
        }

        if (selection.group === "proposals") {
          const [proposalRes, clientsRes, productsRes] = await Promise.all([
            db.from("proposals").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db.from("clients").select("id,company_name,contact_person,email").eq("company_id", cid),
            db
              .from("products")
              .select("id,name,category,base_price,currency")
              .eq("company_id", cid),
          ]);
          if (proposalRes.error) throw proposalRes.error;
          const proposal = proposalRes.data;
          const client = (clientsRes.data || []).find(
            (item: any) => item.id === proposal.client_id,
          );
          const product = (productsRes.data || []).find(
            (item: any) => item.id === proposal.product_id,
          );
          const publicUrl =
            proposal.public_token && typeof window !== "undefined"
              ? `${window.location.origin}/proposal/public/${proposal.public_token}`
              : null;
          if (!cancelled) {
            setRecordDetail({
              kind: "proposal",
              eyebrow: "Propuesta",
              title: proposal.number
                ? `${proposal.number} · ${proposal.title || "Propuesta"}`
                : proposal.title || "Propuesta",
              subtitle: client?.company_name || client?.contact_person || "Sin cliente vinculado",
              status: proposal.status,
              href: publicUrl || `/proposals?proposalId=${encodeURIComponent(proposal.id)}`,
              primaryActionLabel: publicUrl ? "Ver propuesta pública" : "Abrir propuesta completa",
              sections: [
                {
                  title: "Resumen",
                  icon: <FileText className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Número", value: proposal.number || "—" },
                    {
                      label: "Cliente",
                      value: client?.company_name || client?.contact_person || "—",
                    },
                    { label: "Producto", value: product?.name || "—" },
                    { label: "Válida hasta", value: dateText(proposal.valid_until) },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Monto", value: money(proposal.amount, proposal.currency || "USD") },
                    { label: "Moneda", value: proposal.currency || "USD" },
                    { label: "Enviada", value: dateText(proposal.sent_at) },
                    { label: "Vista", value: dateText(proposal.viewed_at) },
                  ],
                },
              ],
              body: {
                label: proposal.description ? "Descripción" : "Contenido",
                value: proposal.description || proposal.content || proposal.notes,
              },
            });
          }
          return;
        }

        if (selection.group === "estimates") {
          const [estimateRes, clientsRes, projectsRes, dealsRes] = await Promise.all([
            db.from("estimates").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db.from("clients").select("id,company_name,contact_person,email").eq("company_id", cid),
            db.from("projects").select("id,name,status").eq("company_id", cid),
            db.from("deals").select("id,name,stage,value").eq("company_id", cid),
          ]);
          if (estimateRes.error) throw estimateRes.error;
          const estimate = estimateRes.data;
          const client = (clientsRes.data || []).find(
            (item: any) => item.id === estimate.client_id,
          );
          const project = (projectsRes.data || []).find(
            (item: any) => item.id === estimate.project_id,
          );
          const deal = (dealsRes.data || []).find((item: any) => item.id === estimate.deal_id);
          if (!cancelled) {
            setRecordDetail({
              kind: "estimate",
              eyebrow: "Cotización",
              title: estimate.number
                ? `#${estimate.number} · ${estimate.title || "Cotización"}`
                : estimate.title || "Cotización",
              subtitle: client?.company_name || client?.contact_person || "Sin cliente vinculado",
              status: estimate.status,
              href: `/estimates?estimateId=${encodeURIComponent(estimate.id)}`,
              primaryActionLabel: "Abrir cotización completa",
              sections: [
                {
                  title: "Resumen",
                  icon: <FileText className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Cliente",
                      value: client?.company_name || client?.contact_person || "—",
                    },
                    { label: "Proyecto", value: project?.name || "—" },
                    { label: "Oportunidad", value: deal?.name || "—" },
                    { label: "Vence", value: dateText(estimate.expiry_date) },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Subtotal", value: money(estimate.subtotal) },
                    { label: "Impuesto", value: money(estimate.tax) },
                    { label: "Total", value: money(estimate.total) },
                    { label: "Emitida", value: dateText(estimate.date_issued) },
                  ],
                },
              ],
              body: { label: "Notas", value: estimate.notes },
            });
          }
          return;
        }

        if (selection.group === "payments") {
          const [paymentRes, clientsRes, invoicesRes] = await Promise.all([
            db.from("payments").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db.from("clients").select("id,company_name,contact_person,email").eq("company_id", cid),
            db.from("invoices").select("id,number,status,total,due_date").eq("company_id", cid),
          ]);
          if (paymentRes.error) throw paymentRes.error;
          const payment = paymentRes.data;
          const client = (clientsRes.data || []).find((item: any) => item.id === payment.client_id);
          const invoice = (invoicesRes.data || []).find(
            (item: any) => item.id === payment.invoice_id,
          );
          if (!cancelled) {
            setRecordDetail({
              kind: "payment",
              eyebrow: "Pago",
              title:
                payment.payment_number || payment.reference || invoice?.number
                  ? [payment.payment_number, payment.reference || invoice?.number]
                      .filter(Boolean)
                      .join(" · ")
                  : "Pago",
              subtitle: client?.company_name || client?.contact_person || "Sin cliente vinculado",
              status: payment.status,
              href: `/payments?invoiceId=${encodeURIComponent(payment.invoice_id || "")}`,
              primaryActionLabel: "Abrir pagos",
              sections: [
                {
                  title: "Resumen",
                  icon: <CreditCard className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Referencia", value: payment.reference || "—" },
                    { label: "Número", value: payment.payment_number || "—" },
                    { label: "Método", value: payment.method || "—" },
                    { label: "Fecha", value: dateText(payment.payment_date) },
                  ],
                },
                {
                  title: "Relaciones",
                  icon: <FileText className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Cliente",
                      value: client?.company_name || client?.contact_person || "—",
                    },
                    { label: "Factura", value: invoice?.number || "—" },
                    { label: "Estado factura", value: invoice?.status || "—" },
                    { label: "Vence factura", value: dateText(invoice?.due_date) },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Monto pagado", value: money(payment.amount) },
                    { label: "Total factura", value: money(invoice?.total) },
                  ],
                },
              ],
              body: { label: "Notas", value: payment.notes },
            });
          }
          return;
        }

        if (selection.group === "credit_notes") {
          const [creditNoteRes, clientsRes, invoicesRes] = await Promise.all([
            db
              .from("credit_notes")
              .select("*")
              .eq("company_id", cid)
              .eq("id", selection.id)
              .single(),
            db.from("clients").select("id,company_name,contact_person,email").eq("company_id", cid),
            db.from("invoices").select("id,number,status,total").eq("company_id", cid),
          ]);
          if (creditNoteRes.error) throw creditNoteRes.error;
          const creditNote = creditNoteRes.data;
          const client = (clientsRes.data || []).find(
            (item: any) => item.id === creditNote.client_id,
          );
          const invoice = (invoicesRes.data || []).find(
            (item: any) => item.id === creditNote.invoice_id,
          );
          if (!cancelled) {
            setRecordDetail({
              kind: "credit_note",
              eyebrow: "Nota de crédito",
              title: creditNote.credit_note_number
                ? `${creditNote.credit_note_number} · ${creditNote.reason || "Nota de crédito"}`
                : creditNote.reason || "Nota de crédito",
              subtitle: client?.company_name || client?.contact_person || "Sin cliente vinculado",
              status: creditNote.status,
              href: `/credit-notes`,
              primaryActionLabel: "Abrir notas de crédito",
              sections: [
                {
                  title: "Resumen",
                  icon: <RefreshCw className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Número", value: creditNote.credit_note_number || "—" },
                    { label: "Razón", value: creditNote.reason || "—" },
                    { label: "Fecha", value: dateText(creditNote.date_issued) },
                    { label: "Estado", value: creditNote.status || "—" },
                  ],
                },
                {
                  title: "Relaciones",
                  icon: <FileText className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Cliente",
                      value: client?.company_name || client?.contact_person || "—",
                    },
                    { label: "Factura", value: invoice?.number || "—" },
                    { label: "Estado factura", value: invoice?.status || "—" },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Monto", value: money(creditNote.amount) },
                    { label: "Total factura", value: money(invoice?.total) },
                  ],
                },
              ],
              body: { label: "Notas", value: creditNote.notes },
            });
          }
          return;
        }

        if (selection.group === "expenses") {
          const [expenseRes, clientsRes, projectsRes] = await Promise.all([
            db.from("expenses").select("*").eq("company_id", cid).eq("id", selection.id).single(),
            db.from("clients").select("id,company_name,contact_person,email").eq("company_id", cid),
            db.from("projects").select("id,name,status").eq("company_id", cid),
          ]);
          if (expenseRes.error) throw expenseRes.error;
          const expense = expenseRes.data;
          const client = (clientsRes.data || []).find((item: any) => item.id === expense.client_id);
          const project = (projectsRes.data || []).find(
            (item: any) => item.id === expense.project_id,
          );
          if (!cancelled) {
            setRecordDetail({
              kind: "expense",
              eyebrow: "Gasto",
              title: expense.title || expense.vendor || "Gasto",
              subtitle: expense.vendor || expense.category || "Gasto operativo",
              status: expense.status,
              href: `/expenses`,
              primaryActionLabel: "Abrir gastos",
              sections: [
                {
                  title: "Resumen",
                  icon: <Receipt className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Proveedor", value: expense.vendor || "—" },
                    { label: "Categoría", value: expense.category || "—" },
                    { label: "Fecha", value: dateText(expense.expense_date) },
                    { label: "Recibo", value: expense.receipt_url || "—" },
                  ],
                },
                {
                  title: "Relaciones",
                  icon: <Building2 className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Cliente",
                      value: client?.company_name || client?.contact_person || "—",
                    },
                    { label: "Proyecto", value: project?.name || "—" },
                    { label: "Estado proyecto", value: project?.status || "—" },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [{ label: "Monto", value: money(expense.amount) }],
                },
              ],
              body: { label: "Notas", value: expense.notes },
            });
          }
          return;
        }

        if (selection.group === "subscriptions") {
          const [subscriptionRes, clientsRes, productsRes] = await Promise.all([
            db
              .from("subscriptions")
              .select("*")
              .eq("company_id", cid)
              .eq("id", selection.id)
              .single(),
            db.from("clients").select("id,company_name,contact_person,email").eq("company_id", cid),
            db
              .from("products")
              .select("id,name,category,base_price,currency")
              .eq("company_id", cid),
          ]);
          if (subscriptionRes.error) throw subscriptionRes.error;
          const subscription = subscriptionRes.data;
          const client = (clientsRes.data || []).find(
            (item: any) => item.id === subscription.client_id,
          );
          const product = (productsRes.data || []).find(
            (item: any) => item.id === subscription.product_id,
          );
          if (!cancelled) {
            setRecordDetail({
              kind: "subscription",
              eyebrow: "Suscripción",
              title: subscription.name || product?.name || "Suscripción",
              subtitle: client?.company_name || client?.contact_person || "Sin cliente vinculado",
              status: subscription.status,
              href: `/subscriptions`,
              primaryActionLabel: "Abrir suscripciones",
              sections: [
                {
                  title: "Resumen",
                  icon: <CalendarClock className="h-3.5 w-3.5" />,
                  rows: [
                    { label: "Ciclo", value: subscription.billing_cycle || "—" },
                    { label: "Inicio", value: dateText(subscription.start_date) },
                    { label: "Próximo cobro", value: dateText(subscription.next_billing_date) },
                    { label: "Fin", value: dateText(subscription.end_date) },
                  ],
                },
                {
                  title: "Relaciones",
                  icon: <Building2 className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Cliente",
                      value: client?.company_name || client?.contact_person || "—",
                    },
                    { label: "Producto", value: product?.name || "—" },
                    { label: "Categoría", value: product?.category || "—" },
                  ],
                },
                {
                  title: "Finanzas",
                  icon: <CircleDollarSign className="h-3.5 w-3.5" />,
                  rows: [
                    {
                      label: "Monto recurrente",
                      value: money(subscription.amount, product?.currency || "USD"),
                    },
                    {
                      label: "Precio base producto",
                      value: money(product?.base_price, product?.currency || "USD"),
                    },
                  ],
                },
              ],
              body: { label: "Notas", value: subscription.notes },
            });
          }
          return;
        }

        if (selection.group === "calendar") {
          const { data, error } = await db
            .from("calendar_events")
            .select("id,title,description,location,type,status,start_at,end_at,all_day")
            .eq("company_id", cid)
            .eq("id", selection.id)
            .single();
          if (error) throw error;
          if (!cancelled) setCalendarEvent(buildCalendarItem(data));
          return;
        }

        if (selection.group === "email") {
          const [conversationRes, messagesRes] = await Promise.all([
            db
              .from("email_conversations")
              .select("*")
              .eq("company_id", cid)
              .eq("id", selection.id)
              .single(),
            db
              .from("email_messages")
              .select("*")
              .eq("conversation_id", selection.id)
              .order("created_at", { ascending: true }),
          ]);
          if (conversationRes.error) throw conversationRes.error;
          if (!cancelled) {
            setEmailConversation(conversationRes.data as GlobalEmailConversation);
            setEmailMessages((messagesRes.data || []) as GlobalEmailMessage[]);
          }
          return;
        }

        if (selection.group === "conversations") {
          const [conversationRes, messagesRes] = await Promise.all([
            db
              .from("crm_whatsapp_conversation_list")
              .select("*")
              .eq("company_id", cid)
              .eq("conversation_id", selection.id)
              .single(),
            db
              .from("crm_whatsapp_messages")
              .select("*")
              .eq("company_id", cid)
              .eq("conversation_id", selection.id)
              .order("created_at", { ascending: true }),
          ]);
          if (conversationRes.error) throw conversationRes.error;
          if (!cancelled) {
            setWhatsappConversation(conversationRes.data as GlobalWhatsappConversation);
            setWhatsappMessages((messagesRes.data || []) as GlobalWhatsappMessage[]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "No se pudo abrir el detalle.");
          close();
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [close, profile?.company_id, selection]);

  const updateTask = async (taskId: string, patch: Partial<GlobalTask>) => {
    const { error } = await (supabase as any).from("tasks").update(patch).eq("id", taskId);
    if (error) throw error;
    setTask((current) => (current?.id === taskId ? { ...current, ...patch } : current));
  };

  const updateProjectTask = async (nextTask: ProjectTask) => {
    const { error } = await (supabase as any)
      .from("tasks")
      .update({ status: "Completed" })
      .eq("id", nextTask.id);
    if (error) throw error;
    setProjectBundle((current: any) => {
      if (!current) return current;
      const tasks = current.tasks.map((item: ProjectTask) =>
        item.id === nextTask.id ? { ...item, status: "Completed" } : item,
      );
      const stats = projectStats(tasks);
      return { ...current, tasks, meta: { ...current.meta, stats, hasRisk: stats.overdue > 0 } };
    });
  };

  const updateTicketStatus = async (ticketRow: any, status: string) => {
    const { data, error } = await (supabase as any)
      .from("tickets")
      .update({ status })
      .eq("id", ticketRow.id)
      .select("*")
      .single();
    if (error) throw error;
    setTicket((current: any) => (current ? { ...current, row: data } : current));
  };

  const addTicketMessage = async () => {
    if (!ticket?.row?.id || !ticketReply.trim()) return;
    const payload = {
      ticket_id: ticket.row.id,
      author_type: "agent",
      author_profile_id: profile?.id || null,
      body: ticketReply.trim(),
      is_internal: ticketReplyInternal,
    };
    const { data, error } = await (supabase as any)
      .from("ticket_messages")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    setTicketMessages((current) => [...current, data]);
    setTicketReply("");
    toast.success("Mensaje agregado.");
  };

  const invoiceCurrency = invoice?.currency || "USD";
  const invoiceSummaryFields = useMemo(
    () =>
      invoice
        ? [
            { label: "Estado", value: invoice.status },
            { label: "Emisión", value: invoice.date_issued || "—" },
            { label: "Vence", value: invoice.due_date || "—" },
            { label: "Total", value: money(invoice.total, invoiceCurrency) },
          ]
        : [],
    [invoice, invoiceCurrency],
  );

  return (
    <>
      <TaskDetailDialog
        open={!!task}
        onOpenChange={(open) => !open && close()}
        task={task}
        profiles={[]}
        canEdit
        onUpdateTask={updateTask}
        onComplete={() => task && updateTask(task.id, { status: "Completed" })}
        onSetInProgress={() => task && updateTask(task.id, { status: "In Progress" })}
      />

      {projectBundle ? (
        <ProjectWorkspaceDialog
          project={projectBundle.project}
          meta={projectBundle.meta}
          tasks={projectBundle.tasks}
          clientName={projectBundle.clientName}
          productName={projectBundle.productName}
          dealName={projectBundle.dealName}
          leadName={projectBundle.leadName}
          managerName={projectBundle.managerName}
          canEdit={false}
          canDelete={false}
          canCreateTask={false}
          canEditTasks
          onClose={close}
          onEdit={() => {}}
          onDelete={() => {}}
          onCreateTask={() => {}}
          onCompleteTask={(projectTask) => void updateProjectTask(projectTask)}
        />
      ) : null}

      <TicketDetailDialog
        ticket={ticket?.row || null}
        messages={ticketMessages}
        clientName={ticket?.clientName || "Sin cliente"}
        projectName={ticket?.projectName || "Sin proyecto"}
        assignedName={ticket?.assignedName || "Sin asignar"}
        profileById={ticket?.profileMap || new Map()}
        reply={ticketReply}
        replyInternal={ticketReplyInternal}
        labelFor={(value) => value}
        t={(key) => TICKET_LABELS[key] || key}
        canEdit={false}
        onClose={close}
        onStatusChange={updateTicketStatus}
        onEdit={() => {}}
        onReplyChange={setTicketReply}
        onReplyInternalChange={setTicketReplyInternal}
        onAddMessage={addTicketMessage}
      />

      <Dialog open={!!invoice} onOpenChange={(open) => !open && close()}>
        <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 p-0 md:h-[90vh] md:w-[calc(100vw-24px)] md:max-w-5xl md:rounded-2xl md:border [&>button]:hidden">
          {invoice ? (
            <div className="flex h-full min-h-0 flex-col">
              <DialogHeader className="border-b px-5 py-4 text-left">
                <div className="flex items-center justify-between gap-3 pr-8">
                  <DialogTitle>Factura {invoice.number}</DialogTitle>
                  <Button variant="ghost" size="icon" onClick={close}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-5">
                  <InvoiceDetailsPanel
                    invoice={invoice}
                    actions={null}
                    summaryFields={invoiceSummaryFields}
                    issuerFields={[]}
                    clientFields={[]}
                    items={invoiceItems}
                    itemsLoading={invoiceItemsLoading}
                    itemsError={null}
                    activity={buildInvoiceActivity(invoice)}
                    currency={invoiceCurrency}
                    total={money(invoice.total, invoiceCurrency)}
                    balance={money(invoice.total, invoiceCurrency)}
                    subtotal={money(invoice.subtotal, invoiceCurrency)}
                    tax={money(invoice.tax, invoiceCurrency)}
                    discount={money(invoice.discount, invoiceCurrency)}
                    notes={invoice.notes}
                    publicUrl={invoice.payment_link || null}
                    formatMoney={money}
                  />
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <GlobalRecordDetailDialog detail={recordDetail} onClose={close} />
      <GlobalEmailDetailDialog
        conversation={emailConversation}
        messages={emailMessages}
        onClose={close}
      />
      <GlobalWhatsappDetailDialog
        conversation={whatsappConversation}
        messages={whatsappMessages}
        onClose={close}
      />

      <CalendarEventDetailDialog event={calendarEvent} onClose={close} />
    </>
  );
}
