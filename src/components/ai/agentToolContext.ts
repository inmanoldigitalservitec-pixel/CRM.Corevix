export type AgentWidgetKind =
  | "leads"
  | "clients"
  | "tasks"
  | "calendar"
  | "summary"
  | "deals"
  | "invoices"
  | "projects"
  | "proposals"
  | "products";

export type AgentWidgetTone = "blue" | "red" | "orange" | "purple" | "teal" | "slate";

export type AgentWidgetRow = {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  tone?: AgentWidgetTone;
};

export type AgentWidgetMetric = {
  id: string;
  label: string;
  value: string;
  tone?: AgentWidgetTone;
};

export type AgentToolContext = {
  kind: AgentWidgetKind;
  tool: string;
  title: string;
  summary?: string;
  status: "ready" | "empty" | "error";
  rows: AgentWidgetRow[];
  metrics?: AgentWidgetMetric[];
};

type ToolResultLike = {
  ok?: boolean;
  message?: string;
  data?: unknown;
  error?: string;
};

const TOOL_KIND_MAP: Record<string, AgentWidgetKind> = {
  create_lead: "leads",
  search_leads: "leads",
  list_leads: "leads",
  update_lead: "leads",
  update_lead_status: "leads",
  add_lead_note: "leads",
  convert_lead_to_client: "clients",
  create_client: "clients",
  search_clients: "clients",
  list_clients: "clients",
  update_client: "clients",
  add_client_note: "clients",
  create_task: "tasks",
  update_task: "tasks",
  complete_task: "tasks",
  reschedule_task: "tasks",
  add_task_note: "tasks",
  create_reminder: "tasks",
  create_crm_demo: "tasks",
  list_tasks: "tasks",
  create_calendar_event: "calendar",
  list_calendar_events: "calendar",
  update_calendar_event: "calendar",
  cancel_calendar_event: "calendar",
  crm_summary: "summary",
  create_deal: "deals",
  list_deals: "deals",
  list_unpaid_invoices: "invoices",
  create_project: "projects",
  list_projects: "projects",
  create_proposal: "proposals",
  search_products: "products",
};

const KIND_TITLE_MAP: Record<AgentWidgetKind, string> = {
  leads: "Leads relacionados",
  clients: "Clientes relacionados",
  tasks: "Tareas del CRM",
  calendar: "Agenda y calendario",
  summary: "Resumen CRM",
  deals: "Oportunidades",
  invoices: "Facturas pendientes",
  projects: "Proyectos",
  proposals: "Propuestas",
  products: "Productos y servicios",
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function asArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function compact(parts: Array<string | number | null | undefined | false>) {
  return parts
    .map((part) => (part == null || part === false ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" · ");
}

function fullName(item: Record<string, any>) {
  return compact([item.first_name, item.last_name]) || item.name || item.title || "Sin nombre";
}

function formatCurrency(value: unknown, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value == null ? undefined : String(value);

  try {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("es-DO")} ${currency}`;
  }
}

function formatDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-DO", { month: "short", day: "numeric" });
}

function normalizeResult(toolResult: unknown): ToolResultLike {
  const result = asRecord(toolResult);
  return {
    ok: Boolean(result.ok),
    message: typeof result.message === "string" ? result.message : undefined,
    data: result.data,
    error: typeof result.error === "string" ? result.error : undefined,
  };
}

function baseContext(tool: string, result: ToolResultLike): AgentToolContext {
  const kind = TOOL_KIND_MAP[tool] || "summary";
  return {
    kind,
    tool,
    title: KIND_TITLE_MAP[kind],
    summary: result.message,
    status: result.ok ? "ready" : "error",
    rows: [],
  };
}

function unwrapClientData(data: unknown) {
  const item = asRecord(data);
  if (item.client) return item.client;
  return data;
}

function unwrapTaskData(data: unknown) {
  const item = asRecord(data);
  if (item.task) return item.task;
  return data;
}

function mapLeadRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((lead, index) => {
    const item = asRecord(lead);
    return {
      id: String(item.id || `lead-${index}`),
      title: fullName(item),
      subtitle: compact([item.company_name, item.status, item.phone || item.whatsapp || item.email]),
      value: formatCurrency(item.estimated_value),
      tone: "blue",
    };
  });
}

function mapClientRows(data: unknown): AgentWidgetRow[] {
  return asArray(unwrapClientData(data)).map((client, index) => {
    const item = asRecord(client);
    return {
      id: String(item.id || `client-${index}`),
      title: item.company_name || item.contact_person || "Cliente sin nombre",
      subtitle: compact([item.status, item.contact_person, item.phone || item.whatsapp || item.email, item.industry]),
      value: Array.isArray(item.tags) && item.tags.length ? item.tags.slice(0, 2).join(", ") : undefined,
      tone: item.status === "VIP" ? "purple" : "teal",
    };
  });
}

function mapTaskRows(data: unknown): AgentWidgetRow[] {
  return asArray(unwrapTaskData(data)).map((task, index) => {
    const item = asRecord(task);
    return {
      id: String(item.id || `task-${index}`),
      title: item.title || "Tarea sin titulo",
      subtitle: compact([item.priority, item.status, item.description]),
      value: formatDate(item.due_date),
      tone: item.priority === "High" || item.priority === "Urgent" || item.priority === "high" ? "red" : "purple",
    };
  });
}

function mapCalendarRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((event, index) => {
    const item = asRecord(event);
    return {
      id: String(item.id || `calendar-${index}`),
      title: item.title || "Evento sin titulo",
      subtitle: compact([item.type, item.status, item.location, item.description]),
      value: formatDate(item.start_at),
      tone: item.status === "cancelled" ? "red" : item.type === "demo" ? "purple" : "blue",
    };
  });
}

function mapDealRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((deal, index) => {
    const item = asRecord(deal);
    return {
      id: String(item.id || `deal-${index}`),
      title: item.name || "Oportunidad sin nombre",
      subtitle: compact([item.stage, item.notes, formatDate(item.expected_close)]),
      value: formatCurrency(item.value),
      tone: "blue",
    };
  });
}

function mapInvoiceRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((invoice, index) => {
    const item = asRecord(invoice);
    return {
      id: String(item.id || `invoice-${index}`),
      title: item.number ? `Factura ${item.number}` : "Factura pendiente",
      subtitle: compact([item.status, item.client_id, formatDate(item.due_date)]),
      value: formatCurrency(item.total),
      tone: item.status === "overdue" || item.status === "vencida" ? "red" : "orange",
    };
  });
}

function mapProjectRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((project, index) => {
    const item = asRecord(project);
    return {
      id: String(item.id || `project-${index}`),
      title: item.name || "Proyecto sin nombre",
      subtitle: compact([item.status, item.priority, item.description]),
      value: item.progress != null ? `${item.progress}%` : formatDate(item.due_date),
      tone: "teal",
    };
  });
}

function mapProposalRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((proposal, index) => {
    const item = asRecord(proposal);
    return {
      id: String(item.id || `proposal-${index}`),
      title: item.title || item.number || "Propuesta sin titulo",
      subtitle: compact([item.number, item.status, formatDate(item.valid_until)]),
      value: formatCurrency(item.amount, item.currency || "USD"),
      tone: "teal",
    };
  });
}

function mapProductRows(data: unknown): AgentWidgetRow[] {
  return asArray(data).map((product, index) => {
    const item = asRecord(product);
    return {
      id: String(item.id || `product-${index}`),
      title: item.name || "Producto sin nombre",
      subtitle: compact([item.type, item.category, item.description]),
      value: formatCurrency(item.base_price, item.currency || "USD"),
      tone: "slate",
    };
  });
}

function mapSummaryMetrics(data: unknown): AgentWidgetMetric[] {
  const item = asRecord(data);
  return [
    { id: "new_leads_today", label: "Leads nuevos", value: String(item.new_leads_today ?? 0), tone: "blue" },
    { id: "open_tasks", label: "Tareas abiertas", value: String(item.open_tasks ?? 0), tone: "purple" },
    { id: "unpaid_invoices", label: "Facturas pendientes", value: String(item.unpaid_invoices ?? 0), tone: "orange" },
    { id: "active_projects", label: "Proyectos activos", value: String(item.active_projects ?? 0), tone: "teal" },
  ];
}

export function mapAgentToolContext(tool: unknown, toolResult: unknown): AgentToolContext | null {
  if (typeof tool !== "string" || !tool.trim()) return null;
  if (!TOOL_KIND_MAP[tool]) return null;

  const result = normalizeResult(toolResult);
  const context = baseContext(tool, result);

  if (!result.ok) {
    return {
      ...context,
      summary: result.error || result.message || "No se pudo cargar este contexto del CRM.",
      status: "error",
    };
  }

  if (tool === "crm_summary") {
    const metrics = mapSummaryMetrics(result.data);
    return {
      ...context,
      status: metrics.length ? "ready" : "empty",
      metrics,
    };
  }

  const rowMappers: Partial<Record<string, (data: unknown) => AgentWidgetRow[]>> = {
    create_lead: mapLeadRows,
    search_leads: mapLeadRows,
    list_leads: mapLeadRows,
    update_lead: mapLeadRows,
    update_lead_status: mapLeadRows,
    add_lead_note: mapLeadRows,
    convert_lead_to_client: mapClientRows,
    create_client: mapClientRows,
    search_clients: mapClientRows,
    list_clients: mapClientRows,
    update_client: mapClientRows,
    add_client_note: mapClientRows,
    create_task: mapTaskRows,
    update_task: mapTaskRows,
    complete_task: mapTaskRows,
    reschedule_task: mapTaskRows,
    add_task_note: mapTaskRows,
    create_reminder: mapTaskRows,
    create_crm_demo: mapTaskRows,
    list_tasks: mapTaskRows,
    create_calendar_event: mapCalendarRows,
    list_calendar_events: mapCalendarRows,
    update_calendar_event: mapCalendarRows,
    cancel_calendar_event: mapCalendarRows,
    create_deal: mapDealRows,
    list_deals: mapDealRows,
    list_unpaid_invoices: mapInvoiceRows,
    create_project: mapProjectRows,
    list_projects: mapProjectRows,
    create_proposal: mapProposalRows,
    search_products: mapProductRows,
  };

  const rows = rowMappers[tool]?.(result.data) || [];

  return {
    ...context,
    status: rows.length ? "ready" : "empty",
    rows,
  };
}

export function getLatestAgentToolContext(messages: Array<{ toolContext?: AgentToolContext }>) {
  return [...messages].reverse().find((message) => message.toolContext)?.toolContext || null;
}
