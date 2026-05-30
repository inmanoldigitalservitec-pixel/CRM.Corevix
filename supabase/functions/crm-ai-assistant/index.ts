/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

type CRMContext = {
  company_id: string;
  as_of: string;
  intent: string;
  context: Record<string, unknown>;
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isDevRuntime() {
  const v = (Deno.env.get("DENO_ENV") || Deno.env.get("ENV") || "").toLowerCase();
  return v === "development" || v === "dev" || v === "local";
}

function localTodayKey() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysLocal(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function localDateKey(d: Date) {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateKeyFromISO(iso: string) {
  const t = Date.parse(iso);
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

function isDateKeyInNextDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const dt = new Date(y, m - 1, d);
  return dt >= start && dt <= end;
}

function trimText(value: unknown, maxLength = 300) {
  if (value == null) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function detectIntent(message: string) {
  const m = String(message || "").trim().toLowerCase();
  const hasAny = (needles: string[]) => needles.some((n) => m.includes(n));

  if (
    hasAny([
      "qué debo hacer hoy",
      "que debo hacer hoy",
      "resumen de hoy",
      "prioridades de hoy",
      "prioridades para hoy",
      "hoy qué",
      "hoy que",
      "para hoy",
      "agenda de hoy",
      "agenda hoy",
      "hoy",
    ]) &&
    hasAny(["resumen", "prioridad", "agenda", "hoy", "pendiente", "vencid", "atrasad", "que debo", "qué debo"])
  ) {
    return "today_summary";
  }

  if (hasAny(["lead", "leads", "prospect", "prospecto", "prospectos", "sin seguimiento", "nuevos leads", "nuevos prospectos"])) {
    return "leads";
  }

  if (hasAny(["pipeline", "embudo", "oportunidades abiertas", "ventas abiertas", "deals", "deal", "oportunidades"])) {
    return "pipeline";
  }

  if (hasAny(["factura", "facturas", "invoice", "invoices", "cobro", "cobros", "por cobrar", "vencid", "cuentas por cobrar"])) {
    return "invoices";
  }

  if (hasAny(["tarea", "tareas", "pendiente", "pendientes", "atrasad", "vencid", "para hoy", "equipo"])) {
    return "tasks";
  }

  if (hasAny(["proyecto", "proyectos", "producción", "produccion", "estado de producción", "estado de produccion"])) {
    return "projects";
  }

  if (hasAny(["resume el cliente", "resumen del cliente", "cliente ", "qué está pasando con", "que esta pasando con", "estado de "])) {
    return "client_context";
  }

  return "fallback";
}

function isClosedStatus(value: unknown) {
  const s = String(value || "").toLowerCase();
  return s === "completed" || s === "cancelled" || s === "canceled";
}

function isWonLostStage(value: unknown) {
  const s = String(value || "").toLowerCase();
  return s === "won" || s === "lost";
}

function contextStatsFrom(ctx: Record<string, unknown>) {
  const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    leads: count(ctx.leads),
    deals: count(ctx.deals),
    invoices: count(ctx.invoices),
    tasks: count(ctx.tasks),
    projects: count(ctx.projects),
    clients: count(ctx.clients),
  };
}

async function getTodaySummaryContext(serviceClient: any, companyId: string) {
  const todayKey = localTodayKey();
  const next7Key = localDateKey(addDaysLocal(7));

  const [leadsRes, invoicesRes, tasksRes, proposalsRes, projectsRes] = await Promise.all([
    serviceClient
      .from("leads")
      .select("id,first_name,last_name,company_name,status,estimated_value,source,updated_at,created_at,notes,last_interaction_at,assigned_to")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(30),
    serviceClient
      .from("invoices")
      .select("id,number,status,total,due_date,client_id,notes,updated_at,created_at")
      .eq("company_id", companyId)
      .in("status", ["Sent", "Overdue", "Pending"])
      .order("due_date", { ascending: true })
      .limit(30),
    serviceClient
      .from("tasks")
      .select("id,title,status,priority,due_date,related_project_id,related_client_id,related_lead_id,related_deal_id,assigned_to,description,updated_at,created_at")
      .eq("company_id", companyId)
      .neq("status", "Completed")
      .neq("status", "Cancelled")
      .order("due_date", { ascending: true })
      .limit(60),
    serviceClient
      .from("proposals")
      .select("id,number,title,status,amount,currency,valid_until,client_id,lead_id,deal_id,notes,description,updated_at,created_at,sent_at")
      .eq("company_id", companyId)
      .in("status", ["Sent", "Viewed", "Pending"])
      .order("updated_at", { ascending: false })
      .limit(30),
    serviceClient
      .from("projects")
      .select("id,name,status,priority,due_date,progress,client_id,manager,updated_at,created_at,description")
      .eq("company_id", companyId)
      .neq("status", "Completed")
      .neq("status", "Cancelled")
      .order("due_date", { ascending: true })
      .limit(30),
  ]);

  const leads = (leadsRes.data || []).map((l: any) => ({
    id: l.id,
    name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
    company_name: l.company_name || null,
    status: l.status,
    estimated_value: l.estimated_value ?? null,
    source: l.source ?? null,
    updated_at: l.updated_at,
    created_at: l.created_at,
    last_interaction_at: l.last_interaction_at ?? null,
    assigned_to: l.assigned_to ?? null,
    notes: trimText(l.notes, 300),
  }));

  const leadsNeedFollowup = leads
    .filter((l: any) => {
      const status = String(l.status || "").toLowerCase();
      if (status === "won" || status === "lost" || status === "converted") return false;
      const updatedHours = l.updated_at ? (Date.now() - Date.parse(String(l.updated_at))) / 36e5 : Infinity;
      const noInteraction = !l.last_interaction_at;
      return updatedHours > 24 || noInteraction;
    })
    .slice(0, 15);

  const invoices = (invoicesRes.data || []).map((i: any) => ({
    id: i.id,
    number: i.number,
    status: i.status,
    total: i.total,
    due_date: i.due_date,
    client_id: i.client_id ?? null,
    updated_at: i.updated_at,
    notes: trimText(i.notes, 200),
  }));

  const tasksAll = (tasksRes.data || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    assigned_to: t.assigned_to ?? null,
    related_project_id: t.related_project_id ?? null,
    related_client_id: t.related_client_id ?? null,
    related_lead_id: t.related_lead_id ?? null,
    related_deal_id: t.related_deal_id ?? null,
    description: trimText(t.description, 200),
  }));

  const tasksDueOrOverdue = tasksAll
    .filter((t: any) => {
      if (!t.due_date) return false;
      const key = toDateKey(t.due_date);
      if (!key) return false;
      return key <= todayKey;
    })
    .slice(0, 30);

  const proposals = (proposalsRes.data || []).map((p: any) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    status: p.status,
    amount: p.amount,
    currency: p.currency ?? null,
    valid_until: p.valid_until ?? null,
    client_id: p.client_id ?? null,
    lead_id: p.lead_id ?? null,
    deal_id: p.deal_id ?? null,
    notes: trimText(p.notes, 200),
    description: trimText(p.description, 200),
    updated_at: p.updated_at,
    sent_at: p.sent_at ?? null,
  }));

  const projectsAll = (projectsRes.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    priority: p.priority ?? null,
    due_date: p.due_date ?? null,
    progress: p.progress ?? null,
    client_id: p.client_id ?? null,
    manager: p.manager ?? null,
    updated_at: p.updated_at,
    description: trimText(p.description, 200),
  }));

  const projectsAtRisk = projectsAll
    .filter((p: any) => {
      if (!p.due_date) return false;
      const key = toDateKey(p.due_date);
      if (!key) return false;
      return key <= next7Key;
    })
    .slice(0, 20);

  return {
    today: todayKey,
    leads_need_followup: leadsNeedFollowup,
    invoices_pending_or_overdue: invoices.slice(0, 30),
    tasks_due_or_overdue: tasksDueOrOverdue,
    proposals_pending: proposals.slice(0, 20),
    projects_at_risk_7d: projectsAtRisk,
  };
}

async function getLeadsContext(serviceClient: any, companyId: string) {
  const { data: leads } = await serviceClient
    .from("leads")
    .select("id,first_name,last_name,company_name,status,estimated_value,source,updated_at,created_at,notes,last_interaction_at,assigned_to")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(30);

  const leadIds = (leads || []).map((l: any) => l.id).filter(Boolean);
  const { data: deals } = leadIds.length
    ? await serviceClient
        .from("deals")
        .select("id,name,stage,value,probability,expected_close,lead_id,assigned_to,updated_at,notes,created_at")
        .eq("company_id", companyId)
        .in("lead_id", leadIds)
        .order("updated_at", { ascending: false })
        .limit(30)
    : { data: [] };

  return {
    leads: (leads || []).map((l: any) => ({
      id: l.id,
      name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
      company_name: l.company_name || null,
      status: l.status,
      estimated_value: l.estimated_value ?? null,
      source: l.source ?? null,
      updated_at: l.updated_at,
      created_at: l.created_at,
      last_interaction_at: l.last_interaction_at ?? null,
      assigned_to: l.assigned_to ?? null,
      notes: trimText(l.notes, 300),
    })),
    deals_related: (deals || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      stage: d.stage,
      value: d.value,
      probability: d.probability ?? null,
      expected_close: d.expected_close ?? null,
      lead_id: d.lead_id ?? null,
      assigned_to: d.assigned_to ?? null,
      updated_at: d.updated_at,
      notes: trimText(d.notes, 250),
    })),
  };
}

async function getPipelineContext(serviceClient: any, companyId: string) {
  const { data: deals } = await serviceClient
    .from("deals")
    .select("id,name,stage,value,probability,expected_close,lead_id,assigned_to,updated_at,notes,created_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(60);

  const openDeals = (deals || []).filter((d: any) => !isWonLostStage(d.stage)).slice(0, 30);
  const leadIds = Array.from(new Set(openDeals.map((d: any) => d.lead_id).filter(Boolean)));

  const { data: leads } = leadIds.length
    ? await serviceClient
        .from("leads")
        .select("id,first_name,last_name,company_name,status,estimated_value,source,updated_at,last_interaction_at,assigned_to")
        .eq("company_id", companyId)
        .in("id", leadIds)
        .order("updated_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const pipelineOpenValue = openDeals.reduce((s: number, d: any) => s + toNumber(d.value), 0);

  return {
    pipeline_open_value: pipelineOpenValue,
    deals: openDeals.map((d: any) => ({
      id: d.id,
      name: d.name,
      stage: d.stage,
      value: d.value,
      probability: d.probability ?? null,
      expected_close: d.expected_close ?? null,
      lead_id: d.lead_id ?? null,
      assigned_to: d.assigned_to ?? null,
      updated_at: d.updated_at,
      notes: trimText(d.notes, 250),
    })),
    leads_related: (leads || []).map((l: any) => ({
      id: l.id,
      name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
      company_name: l.company_name || null,
      status: l.status,
      estimated_value: l.estimated_value ?? null,
      updated_at: l.updated_at,
      last_interaction_at: l.last_interaction_at ?? null,
      assigned_to: l.assigned_to ?? null,
      notes: trimText((l as any).notes, 250),
    })),
  };
}

async function getInvoicesContext(serviceClient: any, companyId: string) {
  const { data: invoices } = await serviceClient
    .from("invoices")
    .select("id,number,status,total,subtotal,tax,discount,due_date,date_issued,client_id,notes,updated_at,created_at")
    .eq("company_id", companyId)
    .in("status", ["Pending", "Sent", "Overdue"])
    .order("due_date", { ascending: true })
    .limit(30);

  const receivableTotal = (invoices || []).reduce((s: number, i: any) => s + toNumber(i.total), 0);

  return {
    receivable_total: receivableTotal,
    invoices: (invoices || []).map((i: any) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      total: i.total,
      due_date: i.due_date,
      date_issued: i.date_issued,
      client_id: i.client_id ?? null,
      notes: trimText(i.notes, 200),
      updated_at: i.updated_at,
    })),
  };
}

async function getTasksContext(serviceClient: any, companyId: string) {
  const todayKey = localTodayKey();

  const { data: tasks } = await serviceClient
    .from("tasks")
    .select("id,title,status,priority,due_date,assigned_to,related_project_id,related_client_id,related_lead_id,related_deal_id,description,updated_at,created_at")
    .eq("company_id", companyId)
    .order("due_date", { ascending: true })
    .limit(80);

  const open = (tasks || []).filter((t: any) => !isClosedStatus(t.status));

  const dueOrOverdue = open
    .filter((t: any) => {
      if (!t.due_date) return false;
      const key = toDateKey(t.due_date);
      if (!key) return false;
      return key <= todayKey;
    })
    .slice(0, 30);

  const openNoDue = open.filter((t: any) => !t.due_date).slice(0, Math.max(0, 30 - dueOrOverdue.length));
  const selected = dueOrOverdue.concat(openNoDue);

  const projectIds = Array.from(new Set(selected.map((t: any) => t.related_project_id).filter(Boolean)));
  const { data: projects } = projectIds.length
    ? await serviceClient
        .from("projects")
        .select("id,name,status,due_date,priority,progress,client_id,manager,updated_at")
        .eq("company_id", companyId)
        .in("id", projectIds)
        .limit(30)
    : { data: [] };

  return {
    today: todayKey,
    tasks: selected.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date ?? null,
      assigned_to: t.assigned_to ?? null,
      related_project_id: t.related_project_id ?? null,
      related_client_id: t.related_client_id ?? null,
      related_lead_id: t.related_lead_id ?? null,
      related_deal_id: t.related_deal_id ?? null,
      description: trimText(t.description, 250),
      updated_at: t.updated_at,
    })),
    projects_related: (projects || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      due_date: p.due_date ?? null,
      priority: p.priority ?? null,
      progress: p.progress ?? null,
      client_id: p.client_id ?? null,
      manager: p.manager ?? null,
      updated_at: p.updated_at,
    })),
  };
}

async function getProjectsContext(serviceClient: any, companyId: string) {
  const todayKey = localTodayKey();

  const { data: projects } = await serviceClient
    .from("projects")
    .select("id,name,status,priority,due_date,progress,client_id,manager,updated_at,created_at,description")
    .eq("company_id", companyId)
    .neq("status", "Completed")
    .neq("status", "Cancelled")
    .order("due_date", { ascending: true })
    .limit(20);

  const projectIds = (projects || []).map((p: any) => p.id).filter(Boolean);
  const { data: tasks } = projectIds.length
    ? await serviceClient
        .from("tasks")
        .select("id,title,status,priority,due_date,related_project_id,assigned_to,updated_at,description")
        .eq("company_id", companyId)
        .in("related_project_id", projectIds)
        .order("due_date", { ascending: true })
        .limit(120)
    : { data: [] };

  const byProject = new Map<string, any[]>();
  for (const t of tasks || []) {
    const pid = String((t as any).related_project_id || "");
    if (!pid) continue;
    const list = byProject.get(pid) || [];
    list.push(t);
    byProject.set(pid, list);
  }

  const projectsOut = (projects || []).map((p: any) => {
    const list = byProject.get(String(p.id)) || [];
    const open = list.filter((t: any) => !isClosedStatus(t.status));
    const overdue = open.filter((t: any) => {
      const k = toDateKey(t.due_date);
      return !!k && k < todayKey;
    }).length;
    const dueToday = open.filter((t: any) => {
      const k = toDateKey(t.due_date);
      return !!k && k === todayKey;
    }).length;
    const nextDue = open
      .map((t: any) => toDateKey(t.due_date))
      .filter(Boolean)
      .sort()[0] as string | undefined;

    const topTasks = open
      .slice()
      .sort((a: any, b: any) => {
        const aKey = toDateKey(a.due_date) || "9999-12-31";
        const bKey = toDateKey(b.due_date) || "9999-12-31";
        if (aKey !== bKey) return aKey.localeCompare(bKey);
        return String(a.title || "").localeCompare(String(b.title || ""));
      })
      .slice(0, 5)
      .map((t: any) => ({
        id: t.id,
        title: trimText(t.title, 120),
        status: t.status,
        priority: t.priority,
        due_date: t.due_date ?? null,
        assigned_to: t.assigned_to ?? null,
      }));

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority ?? null,
      due_date: p.due_date ?? null,
      progress: p.progress ?? null,
      client_id: p.client_id ?? null,
      manager: p.manager ?? null,
      updated_at: p.updated_at,
      description: trimText(p.description, 200),
      tasks_summary: {
        open: open.length,
        overdue,
        due_today: dueToday,
        next_due: nextDue || null,
        top: topTasks,
      },
    };
  });

  return { today: todayKey, projects: projectsOut };
}

function extractClientQuery(message: string) {
  const raw = String(message || "").trim();
  const quoted = raw.match(/["“”'‘’]([^"“”'‘’]{2,80})["“”'‘’]/);
  if (quoted?.[1]) return quoted[1].trim();

  const m1 = raw.match(/(?:cliente|client)\s+([^\n\?\.\,]{2,80})/i);
  if (m1?.[1]) return m1[1].trim();

  const m2 = raw.match(/(?:con|de)\s+([A-Z0-9][A-Za-z0-9&.\- ]{2,80})/);
  if (m2?.[1]) return m2[1].trim();

  return null;
}

async function getClientContext(serviceClient: any, companyId: string, message: string) {
  const q = extractClientQuery(message);
  if (!q) return { error: "No se detectó un nombre de cliente en el mensaje.", clients: [] };

  const { data: clients } = await serviceClient
    .from("clients")
    .select("id,company_name,status,contact_person,email,phone,website,tags,notes,updated_at,created_at,account_manager")
    .eq("company_id", companyId)
    .ilike("company_name", `%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(5);

  const client = (clients || [])[0] || null;
  if (!client?.id) return { error: `No se encontró un cliente que coincida con "${q}".`, clients: [] };

  const clientId = String(client.id);

  const [leadsRes, dealsRes, proposalsRes, invoicesRes, projectsRes, tasksRes] = await Promise.all([
    serviceClient
      .from("leads")
      .select("id,first_name,last_name,company_name,status,estimated_value,source,updated_at,created_at,notes,last_interaction_at,assigned_to")
      .eq("company_id", companyId)
      .eq("company_name", client.company_name)
      .order("updated_at", { ascending: false })
      .limit(20),
    serviceClient
      .from("deals")
      .select("id,name,stage,value,probability,expected_close,lead_id,assigned_to,updated_at,notes,created_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(30),
    serviceClient
      .from("proposals")
      .select("id,number,title,status,amount,currency,valid_until,client_id,lead_id,deal_id,notes,description,updated_at,created_at,sent_at")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(20),
    serviceClient
      .from("invoices")
      .select("id,number,status,total,due_date,date_issued,client_id,notes,updated_at,created_at")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("due_date", { ascending: true })
      .limit(30),
    serviceClient
      .from("projects")
      .select("id,name,status,priority,due_date,progress,client_id,manager,updated_at,created_at,description,deal_id,lead_id")
      .eq("company_id", companyId)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(20),
    serviceClient
      .from("tasks")
      .select("id,title,status,priority,due_date,assigned_to,related_project_id,related_client_id,related_lead_id,related_deal_id,description,updated_at,created_at")
      .eq("company_id", companyId)
      .eq("related_client_id", clientId)
      .order("due_date", { ascending: true })
      .limit(30),
  ]);

  const leads = (leadsRes.data || []).map((l: any) => ({
    id: l.id,
    name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
    company_name: l.company_name || null,
    status: l.status,
    estimated_value: l.estimated_value ?? null,
    source: l.source ?? null,
    updated_at: l.updated_at,
    last_interaction_at: l.last_interaction_at ?? null,
    assigned_to: l.assigned_to ?? null,
    notes: trimText(l.notes, 250),
  }));

  const leadIds = leads.map((l: any) => l.id).filter(Boolean);
  const { data: waConvs } = leadIds.length
    ? await serviceClient
        .from("whatsapp_conversations")
        .select("id,status,last_message,last_message_at,unread_count,lead_id,updated_at,created_at")
        .eq("company_id", companyId)
        .in("lead_id", leadIds)
        .order("last_message_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const dealsAll = (dealsRes.data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    stage: d.stage,
    value: d.value,
    probability: d.probability ?? null,
    expected_close: d.expected_close ?? null,
    lead_id: d.lead_id ?? null,
    assigned_to: d.assigned_to ?? null,
    updated_at: d.updated_at,
    notes: trimText(d.notes, 250),
  }));

  const deals = leadIds.length ? dealsAll.filter((d: any) => d.lead_id && leadIds.includes(d.lead_id)).slice(0, 30) : dealsAll.slice(0, 15);

  return {
    detected_query: q,
    clients: [
      {
        id: client.id,
        company_name: client.company_name,
        status: client.status,
        contact_person: client.contact_person ?? null,
        email: client.email ?? null,
        phone: client.phone ?? null,
        website: client.website ?? null,
        tags: client.tags ?? null,
        account_manager: client.account_manager ?? null,
        notes: trimText(client.notes, 300),
        updated_at: client.updated_at,
      },
    ],
    leads,
    deals,
    proposals: (proposalsRes.data || []).map((p: any) => ({
      id: p.id,
      number: p.number,
      title: p.title,
      status: p.status,
      amount: p.amount,
      currency: p.currency ?? null,
      valid_until: p.valid_until ?? null,
      lead_id: p.lead_id ?? null,
      deal_id: p.deal_id ?? null,
      notes: trimText(p.notes, 200),
      description: trimText(p.description, 200),
      updated_at: p.updated_at,
      sent_at: p.sent_at ?? null,
    })),
    invoices: (invoicesRes.data || []).map((i: any) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      total: i.total,
      due_date: i.due_date,
      date_issued: i.date_issued,
      notes: trimText(i.notes, 200),
      updated_at: i.updated_at,
    })),
    projects: (projectsRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority ?? null,
      due_date: p.due_date ?? null,
      progress: p.progress ?? null,
      manager: p.manager ?? null,
      deal_id: p.deal_id ?? null,
      lead_id: p.lead_id ?? null,
      updated_at: p.updated_at,
      description: trimText(p.description, 200),
    })),
    tasks: (tasksRes.data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date ?? null,
      assigned_to: t.assigned_to ?? null,
      related_project_id: t.related_project_id ?? null,
      related_lead_id: t.related_lead_id ?? null,
      related_deal_id: t.related_deal_id ?? null,
      description: trimText(t.description, 250),
      updated_at: t.updated_at,
    })),
    conversations_recent: (waConvs || []).map((c: any) => ({
      id: c.id,
      status: c.status ?? null,
      lead_id: c.lead_id ?? null,
      unread_count: c.unread_count ?? null,
      last_message_at: c.last_message_at ?? null,
      last_message: trimText(c.last_message, 220),
    })),
  };
}

async function getFallbackContext(serviceClient: any, companyId: string) {
  const [leadsRes, dealsRes, invoicesRes, tasksRes] = await Promise.all([
    serviceClient
      .from("leads")
      .select("id,first_name,last_name,company_name,status,updated_at,created_at,notes,last_interaction_at,assigned_to")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(5),
    serviceClient
      .from("deals")
      .select("id,name,stage,value,lead_id,updated_at,notes,assigned_to,expected_close,probability")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(5),
    serviceClient
      .from("invoices")
      .select("id,number,status,total,due_date,client_id,updated_at,notes")
      .eq("company_id", companyId)
      .in("status", ["Pending", "Sent", "Overdue"])
      .order("due_date", { ascending: true })
      .limit(5),
    serviceClient
      .from("tasks")
      .select("id,title,status,priority,due_date,related_project_id,assigned_to,updated_at,description")
      .eq("company_id", companyId)
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  return {
    leads: (leadsRes.data || []).map((l: any) => ({
      id: l.id,
      name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
      company_name: l.company_name || null,
      status: l.status,
      updated_at: l.updated_at,
      last_interaction_at: l.last_interaction_at ?? null,
      notes: trimText(l.notes, 220),
    })),
    deals: (dealsRes.data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      stage: d.stage,
      value: d.value,
      expected_close: d.expected_close ?? null,
      probability: d.probability ?? null,
      lead_id: d.lead_id ?? null,
      assigned_to: d.assigned_to ?? null,
      updated_at: d.updated_at,
      notes: trimText(d.notes, 220),
    })),
    invoices: (invoicesRes.data || []).map((i: any) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      total: i.total,
      due_date: i.due_date,
      client_id: i.client_id ?? null,
      notes: trimText(i.notes, 200),
    })),
    tasks: (tasksRes.data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date ?? null,
      related_project_id: t.related_project_id ?? null,
      assigned_to: t.assigned_to ?? null,
      description: trimText(t.description, 200),
    })),
  };
}

async function buildContextByIntent(serviceClient: any, companyId: string, intent: string, message: string) {
  if (intent === "today_summary") return await getTodaySummaryContext(serviceClient, companyId);
  if (intent === "leads") return await getLeadsContext(serviceClient, companyId);
  if (intent === "pipeline") return await getPipelineContext(serviceClient, companyId);
  if (intent === "invoices") return await getInvoicesContext(serviceClient, companyId);
  if (intent === "tasks") return await getTasksContext(serviceClient, companyId);
  if (intent === "projects") return await getProjectsContext(serviceClient, companyId);
  if (intent === "client_context") return await getClientContext(serviceClient, companyId, message);
  return await getFallbackContext(serviceClient, companyId);
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, userMessage: string, crm: CRMContext) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = [
    systemPrompt || "Eres el asistente del CRM Corevix.",
    "",
    "Intención detectada:",
    crm.intent,
    "",
    "Contexto limitado del CRM (JSON):",
    JSON.stringify(crm.context),
    "",
    "Reglas:",
    "- No inventes datos que no estén en el contexto.",
    "- Responde en español, claro y accionable.",
    "- Si faltan datos, pide lo mínimo necesario.",
    "- Nunca pidas ni uses tokens, API keys, credenciales, secretos o configuraciones sensibles.",
    "",
    `Usuario: ${userMessage}`,
  ].join("\n");

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800,
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const rawText = await resp.text().catch(() => "");
  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!resp.ok) {
    const msg = (json && (json.error?.message || json.error?.status)) ? String(json.error?.message || json.error?.status) : rawText || "Gemini error";
    return { ok: false as const, error: msg, status: resp.status, raw: json || rawText };
  }

  const candidateText =
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ||
    json?.text ||
    "";

  return { ok: true as const, text: String(candidateText || "").trim() };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "No estás autenticado." }, 401);

    const body = await req.json().catch(() => ({}));
    const userMessage = body?.message ? String(body.message) : "";
    if (!userMessage.trim()) return jsonResponse({ error: "Falta `message`." }, 400);

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) return jsonResponse({ error: "Sesión inválida." }, 401);

    const { data: profile, error: profileErr } = await callerClient
      .from("profiles")
      .select("id, company_id, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);
    if (!profile?.company_id) return jsonResponse({ error: "No se encontró la compañía del usuario." }, 403);
    if (profile.is_active === false) return jsonResponse({ error: "Tu usuario está inactivo." }, 403);

    const { data: settings, error: settingsErr } = await serviceClient
      .from("gemini_settings")
      .select("api_key_encrypted, model, system_prompt, is_enabled")
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (settingsErr) return jsonResponse({ error: settingsErr.message }, 400);

    if (!settings?.is_enabled || !settings?.api_key_encrypted) {
      return jsonResponse({ error: "Gemini no está configurado. Ve a Settings > AI / Gemini.", code: "gemini_not_configured" }, 400);
    }

    const model = (settings.model && String(settings.model).trim()) || "gemini-1.5-pro";
    const systemPrompt = (settings.system_prompt && String(settings.system_prompt)) || "Eres el asistente del CRM Corevix.";
    const apiKey = String(settings.api_key_encrypted);

    const intent = detectIntent(userMessage);
    const limitedContext = await buildContextByIntent(serviceClient, profile.company_id, intent, userMessage);
    const crm: CRMContext = {
      company_id: profile.company_id,
      as_of: new Date().toISOString(),
      intent,
      context: limitedContext || {},
    };
    const gemini = await callGemini(apiKey, model, systemPrompt, userMessage, crm);

    if (!gemini.ok) {
      return jsonResponse({ error: gemini.error, provider: "gemini" }, 502);
    }

    const answer = gemini.text;
    const stats = contextStatsFrom(crm.context);
    if (isDevRuntime()) {
      return jsonResponse({ reply: answer, answer, intent, contextStats: stats });
    }
    return jsonResponse({ reply: answer });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
