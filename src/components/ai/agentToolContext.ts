export type AgentWidgetKind =
  | "leads"
  | "clients"
  | "tasks"
  | "calendar"
  | "summary"
  | "deals"
  | "communication"
  | "reports"
  | "global"
  | "invoices"
  | "projects"
  | "proposals"
  | "products";

export type AgentWidgetTone = "blue" | "red" | "orange" | "purple" | "teal" | "slate";

export type AgentWidgetAction = {
  id: string;
  label: string;
  href: string;
  intent?: "view" | "filter" | "follow_up";
  tone?: AgentWidgetTone;
};

export type AgentWidgetRow = {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  tone?: AgentWidgetTone;
  entityType?: AgentWidgetKind;
  href?: string;
  actions?: AgentWidgetAction[];
};

export type AgentWidgetMetric = {
  id: string;
  label: string;
  value: string;
  tone?: AgentWidgetTone;
  href?: string;
  actions?: AgentWidgetAction[];
};

export type AgentToolContext = {
  kind: AgentWidgetKind;
  tool: string;
  title: string;
  summary?: string;
  status: "ready" | "empty" | "error";
  rows: AgentWidgetRow[];
  metrics?: AgentWidgetMetric[];
  primaryAction?: AgentWidgetAction;
  actions?: AgentWidgetAction[];
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
  search_deals: "deals",
  update_deal: "deals",
  update_deal_stage: "deals",
  add_deal_note: "deals",
  link_deal_to_lead: "deals",
  assign_deal_owner: "deals",
  list_email_threads: "communication",
  search_email_messages: "communication",
  draft_email_reply: "communication",
  list_inbox_conversations: "communication",
  list_whatsapp_messages: "communication",
  draft_whatsapp_reply: "communication",
  sales_report: "reports",
  pipeline_report: "reports",
  activity_report: "reports",
  agent_daily_briefing: "reports",
  global_search: "global",
  get_record_by_id: "global",
  add_global_note: "global",
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
  communication: "Comunicacion",
  reports: "Reportes CRM",
  global: "Busqueda global",
  invoices: "Facturas pendientes",
  projects: "Proyectos",
  proposals: "Propuestas",
  products: "Productos y servicios",
};

const KIND_VIEW_LABEL: Partial<Record<AgentWidgetKind, string>> = {
  leads: "Ver lead",
  clients: "Ver cliente",
  tasks: "Ver tarea",
  calendar: "Ver evento",
  deals: "Ver oportunidad",
  communication: "Ver conversacion",
  invoices: "Ver factura",
  projects: "Ver proyecto",
  proposals: "Ver propuesta",
  products: "Ver producto",
};

const KIND_LIST_ACTION: Partial<Record<AgentWidgetKind, AgentWidgetAction>> = {
  leads: { id: "open-leads", label: "Ver leads", href: "/leads", intent: "filter", tone: "blue" },
  clients: { id: "open-clients", label: "Ver clientes", href: "/clients", intent: "filter", tone: "teal" },
  tasks: { id: "open-tasks", label: "Ver tareas", href: "/tasks", intent: "filter", tone: "purple" },
  calendar: { id: "open-calendar", label: "Ver agenda", href: "/calendar", intent: "filter", tone: "blue" },
  deals: { id: "open-deals", label: "Ver pipeline", href: "/pipeline", intent: "filter", tone: "blue" },
  communication: { id: "open-inbox", label: "Ver bandeja", href: "/whatsapp", intent: "filter", tone: "blue" },
  invoices: { id: "open-invoices", label: "Ver facturas", href: "/invoices", intent: "filter", tone: "orange" },
  projects: { id: "open-projects", label: "Ver proyectos", href: "/projects", intent: "filter", tone: "teal" },
  proposals: { id: "open-proposals", label: "Ver propuestas", href: "/proposals", intent: "filter", tone: "teal" },
  products: { id: "open-products", label: "Ver productos", href: "/products", intent: "filter", tone: "slate" },
  summary: { id: "open-dashboard", label: "Ver dashboard", href: "/dashboard", intent: "filter", tone: "blue" },
  reports: { id: "open-reports", label: "Ver reportes", href: "/reports", intent: "filter", tone: "purple" },
};

const METRIC_ACTIONS: Record<string, AgentWidgetAction> = {
  new_leads_today: { id: "metric-new-leads", label: "Ver leads", href: "/leads?chip=today", intent: "filter", tone: "blue" },
  open_tasks: { id: "metric-open-tasks", label: "Ver tareas", href: "/tasks?quick=all", intent: "filter", tone: "purple" },
  unpaid_invoices: { id: "metric-unpaid-invoices", label: "Ver facturas", href: "/invoices?status=Sent", intent: "filter", tone: "orange" },
  active_projects: { id: "metric-active-projects", label: "Ver proyectos", href: "/projects?status=In%20Progress", intent: "filter", tone: "teal" },
  open_pipeline: { id: "metric-open-pipeline", label: "Ver pipeline", href: "/pipeline", intent: "filter", tone: "blue" },
  won_value: { id: "metric-won-deals", label: "Ver ganadas", href: "/pipeline?status=won", intent: "filter", tone: "teal" },
  open_deals: { id: "metric-open-deals", label: "Ver oportunidades", href: "/pipeline", intent: "filter", tone: "purple" },
  activity: { id: "metric-activity", label: "Ver urgentes", href: "/tasks?quick=overdue", intent: "filter", tone: "orange" },
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

function flattenObjectArrays(data: unknown) {
  const item = asRecord(data);
  if (Array.isArray(data)) return data;
  return Object.entries(item).flatMap(([type, value]) =>
    Array.isArray(value) ? value.map((row) => ({ type, ...asRecord(row) })) : [],
  );
}

function normalizeEntityKind(kind: AgentWidgetKind, row: AgentWidgetRow): AgentWidgetKind {
  if (kind !== "global" && kind !== "reports") return kind;
  const raw = String(row.entityType || row.subtitle?.split(" · ")[0] || "").toLowerCase();
  if (raw.includes("lead")) return "leads";
  if (raw.includes("client") || raw.includes("cliente")) return "clients";
  if (raw.includes("task") || raw.includes("tarea")) return "tasks";
  if (raw.includes("deal") || raw.includes("oportun")) return "deals";
  if (raw.includes("invoice") || raw.includes("factura")) return "invoices";
  if (raw.includes("project") || raw.includes("proyecto")) return "projects";
  if (raw.includes("proposal") || raw.includes("propuesta")) return "proposals";
  if (raw.includes("product") || raw.includes("producto")) return "products";
  return kind === "reports" ? "deals" : "global";
}

function entityHref(kind: AgentWidgetKind, id: string) {
  if (!id || /-\d+$/.test(id)) return undefined;
  const encoded = encodeURIComponent(id);
  const routes: Partial<Record<AgentWidgetKind, string>> = {
    leads: `/leads?leadId=${encoded}`,
    clients: `/clients?clientId=${encoded}`,
    tasks: `/tasks?taskId=${encoded}`,
    calendar: `/calendar?eventId=${encoded}`,
    deals: `/pipeline?dealId=${encoded}`,
    communication: `/whatsapp?conversationId=${encoded}`,
    invoices: `/invoices?invoiceId=${encoded}`,
    projects: `/projects?projectId=${encoded}`,
    proposals: `/proposals?proposalId=${encoded}`,
    products: `/products?productId=${encoded}`,
  };
  return routes[kind];
}

function rowAction(kind: AgentWidgetKind, row: AgentWidgetRow): AgentWidgetAction | null {
  const entityType = normalizeEntityKind(kind, row);
  const href = entityHref(entityType, row.id);
  if (!href) return null;
  return {
    id: `view-${entityType}-${row.id}`,
    label: KIND_VIEW_LABEL[entityType] || "Ver detalle",
    href,
    intent: "view",
    tone: row.tone,
  };
}

function enrichRows(kind: AgentWidgetKind, rows: AgentWidgetRow[]) {
  return rows.map((row) => {
    const entityType = normalizeEntityKind(kind, row);
    const action = rowAction(entityType, row);
    return {
      ...row,
      entityType,
      href: action?.href || row.href,
      actions: action ? [action, ...(row.actions || [])] : row.actions,
    };
  });
}

function enrichMetrics(metrics: AgentWidgetMetric[]) {
  return metrics.map((metric) => {
    const action = METRIC_ACTIONS[metric.id];
    return action
      ? { ...metric, href: action.href, actions: [action, ...(metric.actions || [])] }
      : metric;
  });
}

function contextActions(kind: AgentWidgetKind, rows: AgentWidgetRow[], metrics?: AgentWidgetMetric[]) {
  const primary = rows.find((row) => row.actions?.[0])?.actions?.[0] || metrics?.find((metric) => metric.actions?.[0])?.actions?.[0] || KIND_LIST_ACTION[kind];
  const actions = [primary, KIND_LIST_ACTION[kind]].filter((action, index, list): action is AgentWidgetAction =>
    Boolean(action && list.findIndex((item) => item?.href === action.href) === index),
  );
  return { primaryAction: primary, actions };
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
      subtitle: compact([item.stage, item.probability != null ? `${item.probability}%` : null, item.notes, formatDate(item.expected_close)]),
      value: formatCurrency(item.value),
      tone: item.stage === "Won" ? "teal" : item.stage === "Lost" ? "red" : "blue",
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

function mapCommunicationRows(data: unknown): AgentWidgetRow[] {
  const rows = Array.isArray(data) ? data : flattenObjectArrays(data);
  return rows.map((row, index) => {
    const item = asRecord(row);
    return {
      id: String(item.conversation_id || item.id || `communication-${index}`),
      title: item.subject || item.display_name || item.contact_name || item.sender_name || item.phone || "Conversacion",
      subtitle: compact([
        item.type,
        item.provider,
        item.status || item.conversation_status,
        item.snippet || item.last_message || item.last_message_text || item.body || item.text,
      ]),
      value: item.unread_count != null ? `${item.unread_count} sin leer` : formatDate(item.last_message_at || item.created_at || item.sent_at),
      tone: Number(item.unread_count || 0) > 0 ? "blue" : "slate",
    };
  });
}

function mapGlobalRows(data: unknown): AgentWidgetRow[] {
  const rows = flattenObjectArrays(data);
  return rows.map((row, index) => {
    const item = asRecord(row);
    return {
      id: String(item.id || `global-${index}`),
      title: item.name || item.title || item.company_name || fullName(item),
      subtitle: compact([item.type, item.status || item.stage || item.priority, item.phone || item.email || item.whatsapp]),
      value: item.value != null ? formatCurrency(item.value) : formatDate(item.updated_at || item.created_at),
      tone: "blue",
    };
  });
}

function mapReportRows(data: unknown): AgentWidgetRow[] {
  const item = asRecord(data);
  const topOpenDeals = Array.isArray(item.top_open_deals) ? item.top_open_deals : [];
  const recentTasks = Array.isArray(item.recent_tasks) ? item.recent_tasks : [];
  const nestedDeals = asRecord(item.pipeline).top_open_deals;
  const sourceType = topOpenDeals.length || Array.isArray(nestedDeals) ? "deals" : "tasks";
  const rows = topOpenDeals.length ? topOpenDeals : recentTasks.length ? recentTasks : Array.isArray(nestedDeals) ? nestedDeals : [];

  return rows.slice(0, 5).map((row, index) => {
    const entry = asRecord(row);
    return {
      id: String(entry.id || `report-${index}`),
      title: entry.name || entry.title || "Elemento destacado",
      subtitle: compact([sourceType, entry.stage || entry.status, entry.priority, formatDate(entry.expected_close || entry.due_date)]),
      value: entry.value != null ? formatCurrency(entry.value) : undefined,
      tone: "purple",
    };
  });
}

function mapSummaryMetrics(data: unknown): AgentWidgetMetric[] {
  const item = asRecord(data);
  return enrichMetrics([
    { id: "new_leads_today", label: "Leads nuevos", value: String(item.new_leads_today ?? 0), tone: "blue" },
    { id: "open_tasks", label: "Tareas abiertas", value: String(item.open_tasks ?? 0), tone: "purple" },
    { id: "unpaid_invoices", label: "Facturas pendientes", value: String(item.unpaid_invoices ?? 0), tone: "orange" },
    { id: "active_projects", label: "Proyectos activos", value: String(item.active_projects ?? 0), tone: "teal" },
  ]);
}

function mapReportMetrics(data: unknown): AgentWidgetMetric[] {
  const item = asRecord(data);
  const sales = asRecord(item.sales);
  const pipeline = asRecord(item.pipeline);
  const activity = asRecord(item.activity);
  const source = Object.keys(item).length ? item : {};

  return enrichMetrics([
    { id: "open_pipeline", label: "Pipeline abierto", value: formatCurrency(source.open_pipeline_value ?? sales.open_pipeline_value ?? 0) || "0", tone: "blue" },
    { id: "won_value", label: "Ganado", value: formatCurrency(source.won_value ?? sales.won_value ?? 0) || "0", tone: "teal" },
    { id: "open_deals", label: "Oportunidades", value: String(source.open_deals ?? pipeline.total_deals ?? 0), tone: "purple" },
    { id: "activity", label: "Actividad", value: String(source.urgent_tasks ?? activity.urgent_tasks ?? 0), tone: "orange" },
  ]);
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
    const actions = contextActions(context.kind, [], metrics);
    return {
      ...context,
      status: metrics.length ? "ready" : "empty",
      metrics,
      ...actions,
    };
  }

  if (["sales_report", "pipeline_report", "activity_report", "agent_daily_briefing"].includes(tool)) {
    const rows = enrichRows(context.kind, mapReportRows(result.data));
    const metrics = mapReportMetrics(result.data);
    const actions = contextActions(context.kind, rows, metrics);
    return {
      ...context,
      status: rows.length || metrics.length ? "ready" : "empty",
      rows,
      metrics,
      ...actions,
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
    search_deals: mapDealRows,
    update_deal: mapDealRows,
    update_deal_stage: mapDealRows,
    add_deal_note: mapDealRows,
    link_deal_to_lead: mapDealRows,
    assign_deal_owner: mapDealRows,
    list_email_threads: mapCommunicationRows,
    search_email_messages: mapCommunicationRows,
    draft_email_reply: mapCommunicationRows,
    list_inbox_conversations: mapCommunicationRows,
    list_whatsapp_messages: mapCommunicationRows,
    draft_whatsapp_reply: mapCommunicationRows,
    global_search: mapGlobalRows,
    get_record_by_id: mapGlobalRows,
    add_global_note: mapGlobalRows,
    list_unpaid_invoices: mapInvoiceRows,
    create_project: mapProjectRows,
    list_projects: mapProjectRows,
    create_proposal: mapProposalRows,
    search_products: mapProductRows,
  };

  const rows = enrichRows(context.kind, rowMappers[tool]?.(result.data) || []);
  const actions = contextActions(context.kind, rows);

  return {
    ...context,
    status: rows.length ? "ready" : "empty",
    rows,
    ...actions,
  };
}

export function getLatestAgentToolContext(messages: Array<{ toolContext?: AgentToolContext | null }>) {
  return [...messages].reverse().find((message) => message.toolContext)?.toolContext || null;
}
