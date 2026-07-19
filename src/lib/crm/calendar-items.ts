export type EventSourceType = "calendar_event" | "task" | "invoice" | "proposal" | "project";
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
};

export type ProposalCalendarSourceRow = {
  id: string;
  number?: string | null;
  title?: string | null;
  valid_until?: string | null;
  status?: string | null;
};

export type ProjectCalendarSourceRow = {
  id: string;
  name?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: string | null;
};

export type BuildCalendarItemsInput = {
  calendarEvents?: CalendarEventSourceRow[] | null;
  tasks?: TaskCalendarSourceRow[] | null;
  invoices?: InvoiceCalendarSourceRow[] | null;
  proposals?: ProposalCalendarSourceRow[] | null;
  projects?: ProjectCalendarSourceRow[] | null;
};

export const EVENT_TYPE_LABELS: Record<EventSourceType, string> = {
  calendar_event: "Evento",
  task: "Tarea",
  invoice: "Factura",
  proposal: "Propuesta",
  project: "Proyecto",
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
];

export function toLocalInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toDateInputValue(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function fromInputValue(value: string, allDay: boolean) {
  if (!value) return null;
  if (allDay && value.length === 10) return `${value}T09:00:00`;
  return value;
}

export function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getCalendarEventTone(type?: string | null): CalendarTone {
  if (type === "demo") return "violet";
  if (type === "reminder") return "amber";
  if (type === "call") return "sky";
  if (type === "meeting") return "emerald";
  if (type === "task") return "blue";
  return "slate";
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
      href: "/calendar",
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
        href: "/tasks",
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
        href: "/invoices",
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
        href: "/proposals",
        context: proposal.number ? `Propuesta ${proposal.number}` : "Propuesta comercial",
        tone: "emerald" as const,
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
        href: "/projects",
        context: project.name ? `Proyecto ${project.name}` : "Proyecto activo",
        tone: "violet" as const,
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
