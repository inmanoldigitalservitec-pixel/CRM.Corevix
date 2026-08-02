export type EventSourceType =
  | "calendar_event"
  | "task"
  | "invoice"
  | "proposal"
  | "project"
  | "estimate"
  | "subscription"
  | "contract"
  | "ticket"
  | "payment";
export type CalendarFilter = "all" | EventSourceType;
export type FormType = "event" | "reminder" | "call" | "meeting" | "demo" | "task";

export type CalendarTone = "blue" | "violet" | "amber" | "sky" | "emerald" | "orange" | "slate";

export type CalendarItem = {
  id: string;
  relatedId: string;
  source: EventSourceType;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string | null;
  description?: string | null;
  location?: string | null;
  amount?: number | null;
  amountCurrency?: string | null;
  eventType?: string | null;
  href: string;
  context?: string | null;
  tone: CalendarTone;
};

export type CalendarEventSourceRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  type?: string | null;
  status?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean | null;
};

export type TaskCalendarSourceRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: string | null;
  priority?: string | null;
};

export type InvoiceCalendarSourceRow = {
  id: string;
  number?: string | null;
  due_date?: string | null;
  status?: string | null;
  total?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
};

export type ProposalCalendarSourceRow = {
  id: string;
  number?: string | null;
  title?: string | null;
  valid_until?: string | null;
  status?: string | null;
};

export type EstimateCalendarSourceRow = {
  id: string;
  number?: string | number | null;
  title?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  total?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
};

export type ProjectCalendarSourceRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: string | null;
};

export type SubscriptionCalendarSourceRow = {
  id: string;
  name?: string | null;
  next_billing_date?: string | null;
  status?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
  billing_cycle?: string | null;
};

export type ContractCalendarSourceRow = {
  id: string;
  contract_number?: string | number | null;
  subject?: string | null;
  end_date?: string | null;
  status?: string | null;
  contract_value?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
};

export type TicketCalendarSourceRow = {
  id: string;
  ticket_number?: string | number | null;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
  first_response_due_at?: string | null;
  resolution_due_at?: string | null;
};

export type PaymentCalendarSourceRow = {
  id: string;
  payment_number?: string | number | null;
  reference?: string | null;
  payment_date?: string | null;
  status?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  base_currency?: string | null;
};

export type BuildCalendarItemsInput = {
  calendarEvents?: CalendarEventSourceRow[] | null;
  tasks?: TaskCalendarSourceRow[] | null;
  invoices?: InvoiceCalendarSourceRow[] | null;
  proposals?: ProposalCalendarSourceRow[] | null;
  projects?: ProjectCalendarSourceRow[] | null;
  estimates?: EstimateCalendarSourceRow[] | null;
  subscriptions?: SubscriptionCalendarSourceRow[] | null;
  contracts?: ContractCalendarSourceRow[] | null;
  tickets?: TicketCalendarSourceRow[] | null;
  payments?: PaymentCalendarSourceRow[] | null;
};

export const EVENT_TYPE_LABELS: Record<EventSourceType, string> = {
  calendar_event: "Evento",
  task: "Tarea",
  invoice: "Factura",
  proposal: "Propuesta",
  project: "Proyecto",
  estimate: "Cotización",
  subscription: "Suscripción",
  contract: "Contrato",
  ticket: "Ticket",
  payment: "Pago",
};

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  event: "Evento",
  reminder: "Recordatorio",
  call: "Llamada",
  meeting: "Reunión",
  demo: "Demo",
  task: "Tarea",
};

export const TONE_STYLES: Record<CalendarTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export const DOT_STYLES: Record<CalendarTone, string> = {
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
};

export const CALENDAR_FILTER_OPTIONS: {
  value: CalendarFilter;
  label: string;
  tone: CalendarTone;
}[] = [
  { value: "all", label: "Todos", tone: "slate" },
  { value: "calendar_event", label: "Eventos", tone: "sky" },
  { value: "task", label: "Tareas", tone: "blue" },
  { value: "invoice", label: "Facturas", tone: "orange" },
  { value: "proposal", label: "Propuestas", tone: "emerald" },
  { value: "project", label: "Proyectos", tone: "violet" },
  { value: "estimate", label: "Cotizaciones", tone: "sky" },
  { value: "subscription", label: "Suscripciones", tone: "violet" },
  { value: "contract", label: "Contratos", tone: "slate" },
  { value: "ticket", label: "Tickets", tone: "amber" },
  { value: "payment", label: "Pagos", tone: "orange" },
];

export function toLocalInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toDateInputValue(value?: Date | string | null) {
  if (typeof value === "string") {
    const text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const localDateTime = text.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2})?$/);
    if (localDateTime) return localDateTime[1];
  }
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return localDateKey(date);
}

export function fromInputValue(value: string, allDay: boolean) {
  if (!value) return null;
  if (allDay && value.length === 10) return new Date(`${value}T12:00:00`).toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function dateOnly(value: string) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const localDateTime = text.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2})?$/);
  if (localDateTime) return localDateTime[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return localDateKey(date);
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDate(value: string) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return date.toLocaleDateString("es", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCalendarEventTone(type?: string | null): CalendarTone {
  if (type === "demo") return "violet";
  if (type === "reminder") return "amber";
  if (type === "call") return "sky";
  if (type === "meeting") return "emerald";
  if (type === "task") return "blue";
  return "slate";
}

function toAmount(value?: number | string | null) {
  if (value == null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function isClosedPaymentStatus(status?: string | null) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return ["completed", "paid", "pagado", "completado", "cancelled", "canceled"].includes(
    normalized,
  );
}

function detailHref(source: EventSourceType, id: string) {
  const encodedId = encodeURIComponent(id);
  if (source === "calendar_event") return `/calendar?eventId=calendar_event-${encodedId}`;
  if (source === "task") return `/tasks?taskId=${encodedId}`;
  if (source === "invoice") return `/invoices?invoiceId=${encodedId}`;
  if (source === "proposal") return `/proposals?proposalId=${encodedId}`;
  if (source === "project") return `/projects?projectId=${encodedId}`;
  if (source === "estimate") return `/estimates?estimateId=${encodedId}`;
  if (source === "subscription") return `/subscriptions?subscriptionId=${encodedId}`;
  if (source === "contract") return `/contracts?contractId=${encodedId}`;
  if (source === "ticket") return `/tickets?ticketId=${encodedId}`;
  if (source === "payment") return `/payments?paymentId=${encodedId}`;
  return "/";
}

export function buildCalendarItems(input: BuildCalendarItemsInput): CalendarItem[] {
  return [
    ...(input.calendarEvents || []).map((event) => ({
      id: `calendar_event-${event.id}`,
      relatedId: event.id,
      source: "calendar_event" as const,
      title: event.title || "Evento programado",
      start: event.start_at,
      end: event.end_at,
      allDay: Boolean(event.all_day),
      status: event.status,
      description: event.description,
      location: event.location,
      eventType: event.type,
      href: detailHref("calendar_event", event.id),
      context: event.type
        ? FORM_TYPE_LABELS[event.type as FormType] || event.type
        : "Evento manual",
      tone: getCalendarEventTone(event.type),
    })),
    ...(input.tasks || [])
      .filter((task) => Boolean(task.due_date))
      .map((task) => ({
        id: `task-${task.id}`,
        relatedId: task.id,
        source: "task" as const,
        title: task.title || "Tarea sin título",
        start: task.due_date as string,
        allDay: true,
        status: task.status,
        description: task.description,
        href: detailHref("task", task.id),
        context: task.priority ? `Prioridad ${task.priority}` : "Tarea vinculada",
        tone: "blue" as const,
      })),
    ...(input.invoices || [])
      .filter((invoice) => Boolean(invoice.due_date))
      .map((invoice) => ({
        id: `invoice-${invoice.id}`,
        relatedId: invoice.id,
        source: "invoice" as const,
        title: `Factura vence: ${invoice.number || invoice.id}`,
        start: invoice.due_date as string,
        allDay: true,
        status: invoice.status,
        amount: invoice.total == null ? null : Number(invoice.total),
        amountCurrency: invoice.currency || invoice.base_currency || null,
        href: detailHref("invoice", invoice.id),
        context: invoice.number ? `Factura ${invoice.number}` : "Factura pendiente",
        tone: "orange" as const,
      })),
    ...(input.proposals || [])
      .filter((proposal) => Boolean(proposal.valid_until))
      .map((proposal) => ({
        id: `proposal-${proposal.id}`,
        relatedId: proposal.id,
        source: "proposal" as const,
        title: `Propuesta vence: ${proposal.number || proposal.title || proposal.id}`,
        start: proposal.valid_until as string,
        allDay: true,
        status: proposal.status,
        href: detailHref("proposal", proposal.id),
        context: proposal.number ? `Propuesta ${proposal.number}` : "Propuesta comercial",
        tone: "emerald" as const,
      })),
    ...(input.estimates || [])
      .filter((estimate) => Boolean(estimate.expiry_date))
      .map((estimate) => ({
        id: `estimate-${estimate.id}`,
        relatedId: estimate.id,
        source: "estimate" as const,
        title: `Cotización vence: ${estimate.number || estimate.title || estimate.id}`,
        start: estimate.expiry_date as string,
        allDay: true,
        status: estimate.status,
        amount: toAmount(estimate.total),
        amountCurrency: estimate.currency || estimate.base_currency || null,
        href: detailHref("estimate", estimate.id),
        context: estimate.title ? `Cotización ${estimate.title}` : "Cotización comercial",
        tone: "sky" as const,
      })),
    ...(input.projects || [])
      .filter((project) => Boolean(project.due_date))
      .map((project) => ({
        id: `project-${project.id}`,
        relatedId: project.id,
        source: "project" as const,
        title: `Proyecto: ${project.name || project.id}`,
        start: project.due_date as string,
        allDay: true,
        status: project.status,
        description: project.description,
        href: detailHref("project", project.id),
        context: project.name ? `Proyecto ${project.name}` : "Proyecto activo",
        tone: "violet" as const,
      })),
    ...(input.subscriptions || [])
      .filter((subscription) => Boolean(subscription.next_billing_date))
      .map((subscription) => ({
        id: `subscription-${subscription.id}`,
        relatedId: subscription.id,
        source: "subscription" as const,
        title: `Próximo cobro: ${subscription.name || subscription.id}`,
        start: subscription.next_billing_date as string,
        allDay: true,
        status: subscription.status,
        amount: toAmount(subscription.amount),
        amountCurrency: subscription.currency || subscription.base_currency || null,
        href: detailHref("subscription", subscription.id),
        context: subscription.billing_cycle
          ? `Suscripción ${subscription.billing_cycle}`
          : "Suscripción activa",
        tone: "violet" as const,
      })),
    ...(input.contracts || [])
      .filter((contract) => Boolean(contract.end_date))
      .map((contract) => ({
        id: `contract-${contract.id}`,
        relatedId: contract.id,
        source: "contract" as const,
        title: `Contrato vence: ${contract.contract_number || contract.subject || contract.id}`,
        start: contract.end_date as string,
        allDay: true,
        status: contract.status,
        amount: toAmount(contract.contract_value),
        amountCurrency: contract.currency || contract.base_currency || null,
        href: detailHref("contract", contract.id),
        context: contract.subject ? `Contrato ${contract.subject}` : "Contrato vinculado",
        tone: "slate" as const,
      })),
    ...(input.tickets || []).flatMap((ticket) => {
      const title = ticket.subject || `Ticket ${ticket.ticket_number || ticket.id}`;
      const items: CalendarItem[] = [];
      if (ticket.first_response_due_at) {
        items.push({
          id: `ticket-first-response-${ticket.id}`,
          relatedId: ticket.id,
          source: "ticket",
          title: `Primera respuesta: ${title}`,
          start: ticket.first_response_due_at,
          status: ticket.status,
          href: detailHref("ticket", ticket.id),
          context: ticket.ticket_number
            ? `Ticket #${ticket.ticket_number} · Primera respuesta`
            : "Primera respuesta",
          tone: "amber",
        });
      }
      if (ticket.resolution_due_at) {
        items.push({
          id: `ticket-resolution-${ticket.id}`,
          relatedId: ticket.id,
          source: "ticket",
          title: `Resolución: ${title}`,
          start: ticket.resolution_due_at,
          status: ticket.status,
          href: detailHref("ticket", ticket.id),
          context: ticket.ticket_number
            ? `Ticket #${ticket.ticket_number} · Resolución`
            : "Resolución de ticket",
          tone: "orange",
        });
      }
      return items;
    }),
    ...(input.payments || [])
      .filter((payment) => Boolean(payment.payment_date) && !isClosedPaymentStatus(payment.status))
      .map((payment) => ({
        id: `payment-${payment.id}`,
        relatedId: payment.id,
        source: "payment" as const,
        title: `Pago pendiente: ${payment.reference || payment.payment_number || payment.id}`,
        start: payment.payment_date as string,
        allDay: true,
        status: payment.status,
        amount: toAmount(payment.amount),
        amountCurrency: payment.currency || payment.base_currency || null,
        href: detailHref("payment", payment.id),
        context: payment.payment_number ? `Pago ${payment.payment_number}` : "Pago pendiente",
        tone: "orange" as const,
      })),
  ];
}

export function filterCalendarItems(
  events: CalendarItem[],
  filter: CalendarFilter,
  search: string,
) {
  const query = search.trim().toLowerCase();

  return events.filter((event) => {
    if (filter !== "all" && event.source !== filter) return false;
    if (!query) return true;

    return [
      event.title,
      event.description,
      event.location,
      event.status,
      event.eventType,
      EVENT_TYPE_LABELS[event.source],
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}
