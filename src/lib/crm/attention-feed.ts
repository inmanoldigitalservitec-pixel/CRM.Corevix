import {
  rankAttentionEvents,
  type AttentionEvent,
  type AttentionEventContext,
  type AttentionSignal,
  type AttentionSourceRef,
  type ScoredAttentionEvent,
} from "@/lib/crm/attention-engine";
import { attachAttentionActionsToEvents } from "@/lib/crm/attention-actions";
import {
  isActiveProjectStatus,
  isClosedLeadStatusValue,
  isCompletedTaskStatusValue,
  isNewLeadStatus,
  isOpenInvoiceStatus,
  isOverdueInvoiceStatus,
  isPaidInvoiceStatus,
  isPendingProposalStatus,
} from "@/lib/crm/status";

export type AttentionLeadRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_interaction_at?: string | null;
};

export type AttentionTaskRow = {
  id: string;
  title?: string | null;
  status: string;
  priority?: string | null;
  due_date?: string | null;
  updated_at?: string | null;
  related_lead_id?: string | null;
  related_client_id?: string | null;
  related_project_id?: string | null;
};

export type AttentionProjectRow = {
  id: string;
  name?: string | null;
  status: string;
  due_date?: string | null;
};

export type AttentionInvoiceRow = {
  id: string;
  status: string;
  total?: number | string | null;
  due_date?: string | null;
  number?: string | null;
  client_id?: string | null;
};

export type AttentionProposalRow = {
  id: string;
  status: string;
  valid_until?: string | null;
  title?: string | null;
  number?: string | null;
  amount?: number | string | null;
  client_id?: string | null;
  sent_at?: string | null;
  updated_at?: string | null;
};

export type AttentionTicketRow = {
  id: string;
  ticket_number?: string | null;
  subject?: string | null;
  department?: string | null;
  service?: string | null;
  status: string;
  priority?: string | null;
  updated_at?: string | null;
  resolution_due_at?: string | null;
};

export type AttentionCalendarEventRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  type?: string | null;
  status?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean | null;
  created_at?: string | null;
};

export type AttentionClientSummaryRow = {
  id: string;
  company_name?: string | null;
  contact_person?: string | null;
  status?: string | null;
  updated_at?: string | null;
  account_manager?: string | null;
};

export type AttentionClientProductRow = {
  id: string;
  client_id: string;
  product_id?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | string | null;
  billing_type?: string | null;
  updated_at?: string | null;
};

export type AttentionConversationCounts = {
  whatsappOpen: number;
  messengerOpen: number;
  instagramOpen: number;
  emailOpen: number;
};

export type BuildAttentionFeedInput = {
  leads: AttentionLeadRow[];
  tasks: AttentionTaskRow[];
  projects: AttentionProjectRow[];
  invoices: AttentionInvoiceRow[];
  proposals: AttentionProposalRow[];
  tickets: AttentionTicketRow[];
  calendarEvents: AttentionCalendarEventRow[];
  clients?: AttentionClientSummaryRow[];
  clientProducts?: AttentionClientProductRow[];
  clientsById?: Map<string, AttentionClientSummaryRow>;
  leadsById?: Map<string, AttentionLeadRow>;
  projectsById?: Map<string, AttentionProjectRow>;
  conversations: AttentionConversationCounts;
  now?: Date;
};

function normalizeStatus(status: string | null | undefined) {
  return String(status || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function dateKeyFromISO(iso: string | null | undefined) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDateKey(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return dateKeyFromISO(value);
}

function localDateKey(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hoursSince(iso: string | null | undefined, nowMs: number) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return Infinity;
  return (nowMs - t) / 36e5;
}

function daysSince(iso: string | null | undefined, nowMs: number) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return Infinity;
  return (nowMs - t) / 86400000;
}

function clientLabel(client?: AttentionClientSummaryRow | null) {
  if (!client) return "Sin cliente vinculado";
  return client.company_name || client.contact_person || "Cliente sin nombre";
}

function leadLabel(lead: AttentionLeadRow) {
  return (
    lead.company_name ||
    `${lead.first_name || ""} ${lead.last_name || ""}`.trim() ||
    "Lead sin nombre"
  );
}

function clientContext(client?: AttentionClientSummaryRow | null) {
  if (!client) return undefined;
  return {
    id: client.id,
    label: clientLabel(client),
    href: "/clients",
    status: client.status || null,
  };
}

function leadContext(lead?: AttentionLeadRow | null) {
  if (!lead) return undefined;
  return {
    id: lead.id,
    label: leadLabel(lead),
    href: "/leads",
    status: lead.status,
  };
}

function projectContext(project?: AttentionProjectRow | null) {
  if (!project) return undefined;
  return {
    id: project.id,
    label: project.name || "Proyecto sin nombre",
    href: "/projects",
    status: project.status,
  };
}

function ownerContext(owner?: string | null) {
  if (!owner) return undefined;
  return {
    label: owner,
  };
}

function amountContext(value?: number | string | null): AttentionEventContext["amount"] {
  if (value == null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return {
    value: numeric,
    currency: "USD",
    label: `$${numeric.toLocaleString()}`,
  };
}

function compactRelations(
  relations: Array<NonNullable<AttentionEventContext["relations"]>[number] | undefined>,
) {
  const compacted = relations.filter(Boolean) as NonNullable<AttentionEventContext["relations"]>;
  return compacted.length ? compacted : undefined;
}

function taskRelationLabel(args: {
  task: AttentionTaskRow;
  leadsById: Map<string, AttentionLeadRow>;
  clientsById: Map<string, AttentionClientSummaryRow>;
  projectsById: Map<string, AttentionProjectRow>;
}) {
  const { task, leadsById, clientsById, projectsById } = args;
  if (task.related_project_id) {
    const project = projectsById.get(String(task.related_project_id));
    if (project?.name) return `Proyecto: ${project.name}`;
  }
  if (task.related_client_id) {
    const client = clientsById.get(String(task.related_client_id));
    if (client) return `Cliente: ${clientLabel(client)}`;
  }
  if (task.related_lead_id) {
    const lead = leadsById.get(String(task.related_lead_id));
    if (lead) return `Lead: ${leadLabel(lead)}`;
  }
  return "Sin relación";
}

function isCalendarEventOpen(event: AttentionCalendarEventRow) {
  const status = normalizeStatus(event.status);
  return !status.includes("complete") && !status.includes("done") && !status.includes("cancel");
}

function isDateKeyInNextDays(dateKey: string, days: number, now: Date) {
  const [y, m, d] = dateKey.split("-").map((value) => Number(value));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const dt = new Date(y, m - 1, d);
  return dt >= start && dt <= end;
}

function daysUntil(dateKey: string, now: Date) {
  const [y, m, d] = dateKey.split("-").map((value) => Number(value));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return Infinity;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

function calendarSummary(event: AttentionCalendarEventRow) {
  return (
    [event.type, event.location, event.description]
      .filter(Boolean)
      .map((value) => String(value))
      .join(" · ") || "Evento del calendario"
  );
}

function interpretedEvent(
  event: Omit<AttentionEvent, "source" | "signal"> & {
    source: AttentionSourceRef;
    signal: AttentionSignal;
  },
): AttentionEvent {
  return {
    ...event,
    sourceType: event.source.type,
    sourceId: event.source.id,
    recommendedAction: event.signal.recommendedAction,
  };
}

export function buildAttentionFeed(input: BuildAttentionFeedInput): ScoredAttentionEvent[] {
  const now = input.now || new Date();
  const nowMs = now.getTime();
  const today = localDateKey(now);
  const leadsById = input.leadsById || new Map(input.leads.map((lead) => [String(lead.id), lead]));
  const clients =
    input.clients || (input.clientsById ? Array.from(input.clientsById.values()) : []);
  const clientsById =
    input.clientsById || new Map(clients.map((client) => [String(client.id), client]));
  const projectsById =
    input.projectsById || new Map(input.projects.map((project) => [String(project.id), project]));
  const openTaskLeadIds = new Set(
    input.tasks
      .filter((task) => !isCompletedTaskStatusValue(task.status) && task.related_lead_id)
      .map((task) => String(task.related_lead_id)),
  );

  const events: AttentionEvent[] = [];

  for (const lead of input.leads) {
    if (isClosedLeadStatusValue(lead.status)) continue;
    const reasons: string[] = [];
    if (!openTaskLeadIds.has(String(lead.id))) reasons.push("Sin próxima tarea");
    if (lead.last_interaction_at && hoursSince(lead.last_interaction_at, nowMs) > 72) {
      reasons.push("Sin interacción reciente");
    }
    if (isNewLeadStatus(lead.status) && daysSince(lead.created_at, nowMs) >= 2) {
      reasons.push("Sigue en New");
    }
    if (!reasons.length) continue;
    events.push({
      ...interpretedEvent({
        id: `lead:${lead.id}`,
        ruleId:
          Math.min(
            daysSince(lead.last_interaction_at || lead.updated_at || lead.created_at, nowMs),
            daysSince(lead.updated_at || lead.created_at, nowMs),
          ) >= 5
            ? "leads_stale_5_days"
            : "leads_needs_follow_up",
        module: "leads",
        source: {
          type: "lead",
          id: lead.id,
          label: leadLabel(lead),
          href: "/leads",
          status: lead.status,
        },
        signal: {
          key: "lead_follow_up",
          label: "Lead necesita seguimiento",
          reason: reasons.join(" · "),
          timing: reasons.some((reason) => reason.includes("interacción")) ? "stale" : "open",
          recommendedAction: "Crear seguimiento, reasignar responsable o actualizar el estado.",
        },
        context: {
          lead: leadContext(lead),
          keyDate: lead.last_interaction_at || lead.updated_at || lead.created_at,
          lastActivityAt: lead.last_interaction_at || lead.updated_at || lead.created_at,
          urgencyReason: reasons.join(" · "),
          recommendation: "Crear seguimiento, reasignar responsable o actualizar el estado.",
        },
        title: leadLabel(lead),
        summary: reasons.join(" · "),
        severity: reasons.length > 1 ? "high" : "medium",
        status: lead.status,
        count: reasons.length,
        href: "/leads",
        updatedAt: lead.updated_at,
        createdAt: lead.created_at,
        evidence: reasons,
      }),
    });
  }

  for (const task of input.tasks) {
    if (isCompletedTaskStatusValue(task.status)) continue;
    const dueKey = toDateKey(task.due_date);
    if (!dueKey || (dueKey > today && !isDateKeyInNextDays(dueKey, 3, now))) continue;
    const overdue = dueKey < today;
    const dueInDays = daysUntil(dueKey, now);
    const relatedLead = task.related_lead_id ? leadsById.get(String(task.related_lead_id)) : null;
    const relatedClient = task.related_client_id
      ? clientsById.get(String(task.related_client_id))
      : null;
    const relatedProject = task.related_project_id
      ? projectsById.get(String(task.related_project_id))
      : null;
    const ruleId = overdue
      ? "tasks_overdue"
      : dueKey === today
        ? "tasks_due_today"
        : "tasks_due_soon";
    events.push({
      ...interpretedEvent({
        id: `task:${task.id}`,
        ruleId,
        module: "tasks",
        source: {
          type: "task",
          id: task.id,
          label: task.title || "Tarea sin título",
          href: "/tasks",
          status: task.status,
        },
        signal: {
          key: ruleId,
          label: overdue
            ? "Tarea vencida"
            : dueKey === today
              ? "Tarea vence hoy"
              : "Tarea vence pronto",
          reason:
            dueKey === today
              ? "La tarea vence hoy."
              : overdue
                ? "La tarea está vencida."
                : `La tarea vence en ${dueInDays} días.`,
          timing: overdue ? "overdue" : dueKey === today ? "due_today" : "due_soon",
          recommendedAction: overdue
            ? "Reasignar, completar o mover la fecha."
            : "Preparar el seguimiento antes de que venza.",
        },
        context: {
          client: clientContext(relatedClient),
          lead: leadContext(relatedLead),
          project: projectContext(relatedProject),
          keyDate: task.due_date || null,
          lastActivityAt: task.updated_at || null,
          urgencyReason:
            dueKey === today
              ? "La tarea vence hoy."
              : overdue
                ? "La tarea está vencida."
                : `La tarea vence en ${dueInDays} días.`,
          recommendation: overdue
            ? "Reasignar, completar o mover la fecha."
            : "Preparar el seguimiento antes de que venza.",
          relations: compactRelations([
            clientContext(relatedClient),
            leadContext(relatedLead),
            projectContext(relatedProject),
          ]),
          metadata: {
            priority: task.priority || null,
          },
        },
        title: task.title || "Tarea sin título",
        summary: taskRelationLabel({ task, leadsById, clientsById, projectsById }),
        severity: overdue ? "critical" : dueKey === today ? "medium" : "medium",
        status: task.status,
        count: 1,
        href: "/tasks",
        dueAt: task.due_date,
        updatedAt: task.updated_at,
        evidence: [task.status, task.priority, task.due_date].filter(Boolean) as string[],
      }),
    });
  }

  for (const invoice of input.invoices) {
    if (!isOpenInvoiceStatus(invoice.status)) continue;
    const invoiceClient = invoice.client_id ? clientsById.get(String(invoice.client_id)) : null;
    const dueKey = toDateKey(invoice.due_date);
    const overdue =
      isOverdueInvoiceStatus(invoice.status) ||
      Boolean(dueKey && !isPaidInvoiceStatus(invoice.status) && dueKey < today);
    const dueToday = Boolean(dueKey && dueKey === today);
    const dueSoon = Boolean(dueKey && dueKey > today && isDateKeyInNextDays(dueKey, 3, now));
    const ruleId = overdue
      ? "invoices_overdue"
      : dueToday
        ? "invoices_due_today"
        : dueSoon
          ? "invoices_due_soon"
          : "pending_invoices";
    events.push({
      ...interpretedEvent({
        id: `invoice:${invoice.id}`,
        ruleId,
        module: "invoices",
        source: {
          type: "invoice",
          id: invoice.id,
          label: invoice.number ? `Factura ${invoice.number}` : "Factura pendiente",
          href: "/invoices",
          status: invoice.status,
        },
        signal: {
          key: ruleId,
          label: overdue
            ? "Factura vencida"
            : dueToday
              ? "Factura vence hoy"
              : dueSoon
                ? "Factura vence pronto"
                : "Factura pendiente",
          reason:
            dueSoon && dueKey
              ? `La factura vence en ${daysUntil(dueKey, now)} días.`
              : "La factura requiere seguimiento de cobro.",
          timing: overdue ? "overdue" : dueToday ? "due_today" : dueSoon ? "due_soon" : "open",
          recommendedAction: overdue
            ? "Confirmar cobro, enviar recordatorio o escalar seguimiento."
            : dueToday
              ? "Enviar recordatorio o confirmar pago hoy."
              : "Preparar seguimiento preventivo de cobro.",
        },
        context: {
          client: clientContext(invoiceClient),
          amount: amountContext(invoice.total),
          keyDate: invoice.due_date || null,
          urgencyReason:
            dueSoon && dueKey
              ? `La factura vence en ${daysUntil(dueKey, now)} días.`
              : overdue
                ? "La factura está vencida."
                : "La factura requiere seguimiento de cobro.",
          recommendation: overdue
            ? "Confirmar cobro, enviar recordatorio o escalar seguimiento."
            : dueToday
              ? "Enviar recordatorio o confirmar pago hoy."
              : "Preparar seguimiento preventivo de cobro.",
          relations: compactRelations([clientContext(invoiceClient)]),
          metadata: {
            invoiceNumber: invoice.number || null,
          },
        },
        title: invoice.number ? `Factura ${invoice.number}` : "Factura pendiente",
        summary: invoice.client_id
          ? clientLabel(clientsById.get(String(invoice.client_id)))
          : "Sin cliente vinculado",
        severity: overdue ? "critical" : dueToday ? "high" : dueSoon ? "medium" : "high",
        status: invoice.status,
        count: 1,
        href: "/invoices",
        dueAt: invoice.due_date,
        evidence: [invoice.status, invoice.due_date, invoice.number].filter(Boolean) as string[],
      }),
    });
  }

  for (const proposal of input.proposals) {
    if (!isPendingProposalStatus(proposal.status)) continue;
    const proposalClient = proposal.client_id ? clientsById.get(String(proposal.client_id)) : null;
    const dueKey = toDateKey(proposal.valid_until);
    const expired = Boolean(dueKey && dueKey < today);
    const viewedNoResponse =
      normalizeStatus(proposal.status) === "viewed" &&
      daysSince(proposal.updated_at || proposal.sent_at, nowMs) >= 2;
    const ruleId = viewedNoResponse
      ? "proposals_viewed_no_response"
      : expired
        ? "proposals_near_expiry"
        : "proposals_pending_response";
    events.push({
      ...interpretedEvent({
        id: `proposal:${proposal.id}`,
        ruleId,
        module: "proposals",
        source: {
          type: "proposal",
          id: proposal.id,
          label: proposal.title || proposal.number || "Propuesta pendiente",
          href: "/proposals",
          status: proposal.status,
        },
        signal: {
          key: ruleId,
          label: viewedNoResponse
            ? "Propuesta vista sin respuesta"
            : expired
              ? "Propuesta vencida"
              : "Propuesta pendiente",
          reason: viewedNoResponse
            ? "El cliente ya vio la propuesta y sigue sin respuesta."
            : expired
              ? "La propuesta ya pasó su fecha de validez."
              : "La propuesta necesita seguimiento comercial.",
          timing: viewedNoResponse ? "stale" : expired ? "overdue" : "open",
          recommendedAction: viewedNoResponse
            ? "Dar seguimiento comercial con contexto de la propuesta."
            : expired
              ? "Revisar con el cliente antes de que caduque."
              : "Hacer seguimiento, responder dudas o actualizar el alcance.",
        },
        context: {
          client: clientContext(proposalClient),
          amount: amountContext(proposal.amount),
          keyDate: proposal.valid_until || proposal.updated_at || proposal.sent_at || null,
          lastActivityAt: proposal.updated_at || proposal.sent_at || null,
          urgencyReason: viewedNoResponse
            ? "El cliente ya vio la propuesta y sigue sin respuesta."
            : expired
              ? "La propuesta ya pasó su fecha de validez."
              : "La propuesta necesita seguimiento comercial.",
          recommendation: viewedNoResponse
            ? "Dar seguimiento comercial con contexto de la propuesta."
            : expired
              ? "Revisar con el cliente antes de que caduque."
              : "Hacer seguimiento, responder dudas o actualizar el alcance.",
          relations: compactRelations([clientContext(proposalClient)]),
          metadata: {
            proposalNumber: proposal.number || null,
          },
        },
        title: proposal.title || proposal.number || "Propuesta pendiente",
        summary: proposal.client_id
          ? clientLabel(clientsById.get(String(proposal.client_id)))
          : "Sin cliente vinculado",
        severity: "high",
        status: proposal.status,
        count: 1,
        href: "/proposals",
        dueAt: proposal.valid_until,
        updatedAt: proposal.updated_at,
        evidence: [proposal.status, proposal.valid_until, proposal.number].filter(
          Boolean,
        ) as string[],
      }),
    });
  }

  for (const project of input.projects) {
    if (!isActiveProjectStatus(project.status)) continue;
    const dueKey = toDateKey(project.due_date);
    if (!dueKey || dueKey >= today) continue;
    events.push({
      ...interpretedEvent({
        id: `project:${project.id}`,
        ruleId: "projects_risk",
        module: "projects",
        source: {
          type: "project",
          id: project.id,
          label: project.name || "Proyecto por revisar",
          href: "/projects",
          status: project.status,
        },
        signal: {
          key: "projects_risk",
          label: "Proyecto en riesgo",
          reason: "El proyecto tiene la fecha de entrega vencida.",
          timing: "overdue",
          recommendedAction: "Revisar avance, dependencias y bloqueos.",
        },
        context: {
          project: projectContext(project),
          keyDate: project.due_date || null,
          urgencyReason: "El proyecto tiene la fecha de entrega vencida.",
          recommendation: "Revisar avance, dependencias y bloqueos.",
          relations: compactRelations([projectContext(project)]),
        },
        title: project.name || "Proyecto por revisar",
        summary: project.due_date ? `Entrega ${project.due_date}` : "Sin fecha de entrega",
        severity: "critical",
        status: project.status,
        count: 1,
        href: "/projects",
        dueAt: project.due_date,
        evidence: [project.status, project.due_date].filter(Boolean) as string[],
      }),
    });
  }

  for (const event of input.calendarEvents) {
    if (!isCalendarEventOpen(event)) continue;
    const startAt = Date.parse(event.start_at);
    if (!Number.isFinite(startAt)) continue;
    const overdue = startAt < nowMs;
    const upcomingSoon = !overdue && startAt - nowMs <= 24 * 36e5;
    if (!overdue && !upcomingSoon) continue;
    const isMeeting = normalizeStatus(event.type) === "meeting";
    const missingOutcome = overdue && isMeeting;
    const ruleId = missingOutcome
      ? "calendar_meeting_missing_outcome"
      : overdue
        ? "calendar_overdue"
        : "calendar_upcoming";
    events.push({
      ...interpretedEvent({
        id: `calendar:${event.id}`,
        ruleId,
        module: "calendar",
        source: {
          type: "calendar_event",
          id: event.id,
          label: event.title || "Evento pendiente",
          href: "/calendar",
          status: event.status || null,
        },
        signal: {
          key: ruleId,
          label: missingOutcome
            ? "Reunión sin resultado"
            : overdue
              ? "Evento vencido"
              : "Evento próximo",
          reason: missingOutcome
            ? "La reunión ya pasó y sigue sin resultado visible."
            : overdue
              ? "El evento ya debería haberse ejecutado."
              : "El evento está próximo.",
          timing: overdue ? "past" : "upcoming",
          recommendedAction: missingOutcome
            ? "Registrar resultado, crear tarea siguiente o reprogramar."
            : overdue
              ? "Marcar como completado o reprogramar."
              : "Preparar o confirmar el evento.",
        },
        context: {
          keyDate: event.start_at,
          lastActivityAt: event.created_at || null,
          urgencyReason: missingOutcome
            ? "La reunión ya pasó y sigue sin resultado visible."
            : overdue
              ? "El evento ya debería haberse ejecutado."
              : "El evento está próximo.",
          recommendation: missingOutcome
            ? "Registrar resultado, crear tarea siguiente o reprogramar."
            : overdue
              ? "Marcar como completado o reprogramar."
              : "Preparar o confirmar el evento.",
          metadata: {
            eventType: event.type || null,
            location: event.location || null,
            allDay: Boolean(event.all_day),
          },
        },
        title: event.title || "Evento pendiente",
        summary: calendarSummary(event),
        severity: missingOutcome ? "medium" : overdue ? "medium" : "low",
        status: event.status || null,
        count: 1,
        href: "/calendar",
        dueAt: event.start_at,
        createdAt: event.created_at,
        evidence: [event.status || "", event.type || "", event.all_day ? "all_day" : ""].filter(
          Boolean,
        ) as string[],
      }),
    });
  }

  for (const ticket of input.tickets) {
    if (normalizeStatus(ticket.status).includes("closed")) continue;
    const dueKey = toDateKey(ticket.resolution_due_at);
    const overdue = Boolean(dueKey && dueKey < today);
    const slaSoon =
      !overdue &&
      ticket.resolution_due_at &&
      Date.parse(ticket.resolution_due_at) - nowMs <= 24 * 36e5;
    const ruleId = slaSoon ? "tickets_sla_due_soon" : "tickets_overdue";
    events.push({
      ...interpretedEvent({
        id: `ticket:${ticket.id}`,
        ruleId,
        module: "tickets",
        source: {
          type: "ticket",
          id: ticket.id,
          label:
            ticket.subject || (ticket.ticket_number ? `Ticket ${ticket.ticket_number}` : "Ticket"),
          href: "/tickets",
          status: ticket.status,
        },
        signal: {
          key: ruleId,
          label: slaSoon ? "Ticket cerca del SLA" : "Ticket abierto con riesgo",
          reason: slaSoon
            ? "La fecha de resolución está dentro de las próximas 24 horas."
            : "El ticket abierto requiere atención.",
          timing: slaSoon ? "sla_due" : overdue ? "overdue" : "open",
          recommendedAction: slaSoon
            ? "Responder o escalar antes de incumplir el SLA."
            : "Responder o escalar al área responsable.",
        },
        context: {
          keyDate: ticket.resolution_due_at || null,
          lastActivityAt: ticket.updated_at || null,
          urgencyReason: slaSoon
            ? "La fecha de resolución está dentro de las próximas 24 horas."
            : "El ticket abierto requiere atención.",
          recommendation: slaSoon
            ? "Responder o escalar antes de incumplir el SLA."
            : "Responder o escalar al área responsable.",
          metadata: {
            ticketNumber: ticket.ticket_number || null,
            department: ticket.department || null,
            service: ticket.service || null,
            priority: ticket.priority || null,
          },
        },
        title:
          ticket.subject || (ticket.ticket_number ? `Ticket ${ticket.ticket_number}` : "Ticket"),
        summary: ticket.department || ticket.service || "Ticket abierto",
        severity:
          slaSoon ||
          normalizeStatus(ticket.priority).includes("urgent") ||
          normalizeStatus(ticket.status).includes("open")
            ? "high"
            : "medium",
        status: ticket.status,
        count: 1,
        href: "/tickets",
        dueAt: ticket.resolution_due_at,
        updatedAt: ticket.updated_at,
        evidence: [
          ticket.status,
          ticket.priority,
          ticket.resolution_due_at ? "resolution_due_at" : "",
        ].filter(Boolean) as string[],
      }),
    });
  }

  for (const client of clients) {
    if (normalizeStatus(client.status) !== "vip") continue;
    if (daysSince(client.updated_at, nowMs) < 5) continue;
    events.push(
      interpretedEvent({
        id: `client:vip:${client.id}`,
        ruleId: "vip_client_stale",
        module: "clients",
        source: {
          type: "client",
          id: client.id,
          label: clientLabel(client),
          href: "/clients",
          status: client.status || null,
        },
        signal: {
          key: "vip_client_stale",
          label: "Cliente VIP sin seguimiento",
          reason: "El cliente VIP lleva 5 días o más sin actualización visible.",
          timing: "stale",
          recommendedAction: "Programar seguimiento o revisar oportunidades abiertas.",
        },
        context: {
          client: clientContext(client),
          owner: ownerContext(client.account_manager),
          keyDate: client.updated_at || null,
          lastActivityAt: client.updated_at || null,
          urgencyReason: "El cliente VIP lleva 5 días o más sin actualización visible.",
          recommendation: "Programar seguimiento o revisar oportunidades abiertas.",
          relations: compactRelations([
            clientContext(client),
            ownerContext(client.account_manager),
          ]),
        },
        title: clientLabel(client),
        summary: client.account_manager
          ? `VIP · Responsable ${client.account_manager}`
          : "Cliente VIP sin seguimiento reciente",
        severity: "high",
        status: client.status || null,
        count: 1,
        href: "/clients",
        updatedAt: client.updated_at,
        evidence: [
          client.status || "",
          client.updated_at || "",
          client.account_manager || "",
        ].filter(Boolean) as string[],
      }),
    );
  }

  for (const product of input.clientProducts || []) {
    const endKey = toDateKey(product.end_date);
    if (!endKey || !isDateKeyInNextDays(endKey, 30, now)) continue;
    const status = normalizeStatus(product.status);
    if (status.includes("cancel") || status.includes("inactive")) continue;
    const client = clientsById.get(String(product.client_id));
    const renewalRecommendation = "Contactar al cliente para confirmar renovación o continuidad.";
    events.push(
      interpretedEvent({
        id: `client_product:renewal:${product.id}`,
        ruleId: "client_product_renewal_due_soon",
        module: "clients",
        source: {
          type: "client_product",
          id: product.id,
          label: client ? clientLabel(client) : "Renovación de cliente",
          href: "/clients",
          status: product.status || null,
        },
        signal: {
          key: "client_product_renewal_due_soon",
          label: "Renovación próxima",
          reason: `El servicio vence en ${daysUntil(endKey, now)} días.`,
          timing: "renewal_due",
          recommendedAction: renewalRecommendation,
        },
        context: {
          client: clientContext(client),
          amount: amountContext(product.price),
          keyDate: product.end_date || null,
          lastActivityAt: product.updated_at || null,
          urgencyReason: `El servicio vence en ${daysUntil(endKey, now)} días.`,
          recommendation: renewalRecommendation,
          relations: compactRelations([clientContext(client)]),
          metadata: {
            productId: product.product_id || null,
            billingType: product.billing_type || null,
          },
        },
        title: client ? `Renovación: ${clientLabel(client)}` : "Renovación próxima",
        summary:
          [
            product.billing_type,
            product.price ? `$${Number(product.price).toLocaleString()}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Producto o servicio próximo a vencer",
        severity: daysUntil(endKey, now) <= 7 ? "high" : "medium",
        status: product.status || null,
        count: 1,
        href: "/clients",
        dueAt: product.end_date,
        updatedAt: product.updated_at,
        evidence: [
          product.client_id,
          product.status || "",
          product.end_date || "",
          product.billing_type || "",
        ].filter(Boolean) as string[],
      }),
    );
  }

  const inboxPendingTotal =
    input.conversations.whatsappOpen +
    input.conversations.messengerOpen +
    input.conversations.instagramOpen;
  events.push({
    ...interpretedEvent({
      id: "inbox:pending",
      ruleId: "wa_open",
      module: "inbox",
      source: {
        type: "conversation_inbox",
        id: null,
        label: "Meta Inbox pendiente",
        href: "/whatsapp-web",
      },
      signal: {
        key: "wa_open",
        label: "Conversaciones Meta abiertas",
        reason:
          inboxPendingTotal > 0
            ? "Hay conversaciones de Meta que necesitan respuesta."
            : "No hay conversaciones Meta pendientes.",
        timing: "open",
        recommendedAction: "Responder o reasignar la conversación.",
      },
      context: {
        urgencyReason:
          inboxPendingTotal > 0
            ? "Hay conversaciones de Meta que necesitan respuesta."
            : "No hay conversaciones Meta pendientes.",
        recommendation: "Responder o reasignar la conversación.",
        metadata: {
          whatsappOpen: input.conversations.whatsappOpen,
          messengerOpen: input.conversations.messengerOpen,
          instagramOpen: input.conversations.instagramOpen,
        },
      },
      title: "Meta Inbox pendiente",
      summary:
        inboxPendingTotal > 0
          ? `${input.conversations.whatsappOpen} WhatsApp, ${
              input.conversations.messengerOpen + input.conversations.instagramOpen
            } redes abiertas`
          : "Sin mensajes Meta pendientes",
      severity: inboxPendingTotal > 0 ? "medium" : "low",
      count: inboxPendingTotal,
      href: "/whatsapp-web",
      unreadCount: inboxPendingTotal,
    }),
  });

  return attachAttentionActionsToEvents(rankAttentionEvents(events, nowMs));
}
