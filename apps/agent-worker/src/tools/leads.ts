import type { ToolContext, ToolResult } from "../types";

const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Needed",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
  "Not Interested",
];

const LEAD_SELECT =
  "id,first_name,last_name,company_name,phone,email,whatsapp,source,source_channel,source_platform,status,notes,estimated_value,created_at,updated_at,last_interaction_at";

function splitName(input: string) {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "Sin apellido";

  return {
    first_name: firstName,
    last_name: lastName,
  };
}

function formatLead(lead: any, index: number) {
  const fullName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();

  return `
${index + 1}. ${fullName || "Lead sin nombre"}
- ID: ${lead.id}
- Estado: ${lead.status ?? "No definido"}
- Empresa: ${lead.company_name ?? "No registrada"}
- Teléfono: ${lead.phone ?? "No registrado"}
- WhatsApp: ${lead.whatsapp ?? "No registrado"}
- Email: ${lead.email ?? "No registrado"}
- Origen: ${lead.source ?? "No registrado"}
- Canal de origen: ${lead.source_channel ?? "No registrado"}
- Plataforma: ${lead.source_platform ?? "No registrada"}
- Valor estimado: ${lead.estimated_value ?? "No registrado"}
- Última interacción: ${lead.last_interaction_at ?? "No registrada"}
- Creado: ${lead.created_at ?? "No registrado"}
- Notas: ${lead.notes ?? "Sin notas"}
`.trim();
}

function hasOwn(args: any, key: string) {
  return Object.prototype.hasOwnProperty.call(args ?? {}, key);
}

function optionalString(value: any) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalNumber(value: any) {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function appendNote(current: string | null | undefined, note: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${note}`;
  return current?.trim() ? `${current.trim()}\n${entry}` : entry;
}

async function findLead(ctx: ToolContext, args: any): Promise<ToolResult & { lead?: any }> {
  const leadId = String(args.lead_id || args.id || "").trim();
  const queryText = String(args.query || args.name || args.lead_name || "").trim();

  let query = ctx.supabase.from("leads").select(LEAD_SELECT).eq("company_id", ctx.companyId);

  if (leadId) {
    query = query.eq("id", leadId);
  } else if (queryText) {
    const parts = queryText.split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ");

    if (first && last) {
      query = query.ilike("first_name", `%${first}%`).ilike("last_name", `%${last}%`);
    } else {
      query = query.or(
        `first_name.ilike.%${queryText}%,last_name.ilike.%${queryText}%,company_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%,whatsapp.ilike.%${queryText}%`,
      );
    }
  } else {
    return { ok: false, error: "Falta el lead_id o texto para buscar el lead." };
  }

  const { data: matches, error } = await query.order("created_at", { ascending: false }).limit(5);

  if (error) return { ok: false, error: error.message };
  if (!matches?.length) return { ok: false, error: "No encontré el lead." };

  let lead = matches[0];

  if (matches.length > 1 && !leadId) {
    const normalizedQuery = queryText.toLowerCase().trim();
    const exact = matches.find(
      (item: any) =>
        `${item.first_name ?? ""} ${item.last_name ?? ""}`.toLowerCase().trim() === normalizedQuery,
    );

    if (exact) {
      lead = exact;
    } else {
      return {
        ok: false,
        error: "Encontré más de un lead parecido. Indica el ID exacto del lead.",
        data: matches,
      };
    }
  }

  return { ok: true, lead, data: lead };
}

export async function createLeadTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const fullName = String(args.name || args.full_name || "").trim();
  const firstNameArg = String(args.first_name || "").trim();
  const lastNameArg = String(args.last_name || "").trim();

  let first_name = firstNameArg;
  let last_name = lastNameArg;

  if (!first_name && fullName) {
    const split = splitName(fullName);
    first_name = split.first_name;
    last_name = split.last_name;
  }

  if (!first_name) {
    return { ok: false, error: "Falta el nombre del lead." };
  }

  if (!last_name) {
    last_name = "Sin apellido";
  }

  const status = args.status ?? "New";

  if (!LEAD_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `Estado inválido para lead: ${status}. Usa uno de estos: ${LEAD_STATUSES.join(", ")}`,
    };
  }

  const payload = {
    company_id: ctx.companyId,
    first_name,
    last_name,
    company_name: args.company_name ?? null,
    phone: args.phone ?? null,
    whatsapp: args.whatsapp ?? args.phone ?? null,
    email: args.email ?? null,
    source: args.source ?? "AI Assistant",
    source_channel: args.source_channel ?? "ai",
    status,
    notes: args.notes ?? null,
    estimated_value: args.estimated_value ?? null,
    metadata: {
      created_by_ai: true,
      raw_args: args,
    },
    last_interaction_at: new Date().toISOString(),
  };

  const { data, error } = await ctx.supabase.from("leads").insert(payload).select(LEAD_SELECT).single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Listo, creé el lead ${data.first_name} ${data.last_name}.\n\nInformación registrada:\n${formatLead(data, 0)}`,
    data,
  };
}

export async function searchLeadsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const query = String(args.query || args.name || "").trim();

  if (!query) {
    return { ok: false, error: "Falta el texto de búsqueda." };
  }

  const { data, error } = await ctx.supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("company_id", ctx.companyId)
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,company_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,whatsapp.ilike.%${query}%`,
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return { ok: false, error: error.message };

  if (!data?.length) {
    return {
      ok: true,
      message: `No encontré leads relacionados con "${query}".`,
      data: [],
    };
  }

  return {
    ok: true,
    message: `Encontré ${data.length} lead(s) relacionados con "${query}":\n\n${data.map(formatLead).join("\n\n")}`,
    data,
  };
}

export async function listLeadsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const status = String(args.status || "all").trim();
  const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

  if (status !== "all" && !LEAD_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `Estado inválido. Usa all o uno de estos: ${LEAD_STATUSES.join(", ")}`,
    };
  }

  let query = ctx.supabase.from("leads").select(LEAD_SELECT).eq("company_id", ctx.companyId);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: true, message: "No hay leads para ese filtro.", data: [] };

  return {
    ok: true,
    message: `Encontré ${data.length} lead(s):\n\n${data.map(formatLead).join("\n\n")}`,
    data,
  };
}

export async function updateLeadStatusTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const status = String(args.status || "").trim();

  if (!LEAD_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `Estado inválido. Usa uno de estos: ${LEAD_STATUSES.join(", ")}`,
    };
  }

  const found = await findLead(ctx, args);
  if (!found.ok || !found.lead) return found;

  const { data, error } = await ctx.supabase
    .from("leads")
    .update({
      status,
      last_interaction_at: new Date().toISOString(),
    })
    .eq("company_id", ctx.companyId)
    .eq("id", found.lead.id)
    .select(LEAD_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Actualicé el lead ${data.first_name} ${data.last_name} al estado ${data.status}.`,
    data,
  };
}

export async function updateLeadTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const found = await findLead(ctx, args);
  if (!found.ok || !found.lead) return found;

  const updates: Record<string, any> = { last_interaction_at: new Date().toISOString() };

  for (const key of ["first_name", "last_name", "company_name", "phone", "whatsapp", "email", "source", "source_channel", "notes"]) {
    if (hasOwn(args, key)) updates[key] = optionalString(args[key]);
  }

  const fullName = String(args.name || args.full_name || "").trim();
  if (fullName && !hasOwn(args, "first_name")) {
    const split = splitName(fullName);
    updates.first_name = split.first_name;
    updates.last_name = hasOwn(args, "last_name") ? updates.last_name : split.last_name;
  }

  if (hasOwn(args, "estimated_value")) {
    const value = optionalNumber(args.estimated_value);
    if (value === undefined) return { ok: false, error: "estimated_value debe ser un número válido." };
    updates.estimated_value = value;
  }

  if (hasOwn(args, "status")) {
    const status = String(args.status || "").trim();
    if (!LEAD_STATUSES.includes(status)) {
      return { ok: false, error: `Estado inválido. Usa uno de estos: ${LEAD_STATUSES.join(", ")}` };
    }
    updates.status = status;
  }

  if (Object.keys(updates).length <= 1) {
    return { ok: false, error: "No recibí campos para actualizar." };
  }

  const { data, error } = await ctx.supabase
    .from("leads")
    .update(updates)
    .eq("company_id", ctx.companyId)
    .eq("id", found.lead.id)
    .select(LEAD_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Actualicé el lead ${data.first_name} ${data.last_name}.\n\n${formatLead(data, 0)}`,
    data,
  };
}

export async function addLeadNoteTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const note = String(args.note || args.notes || "").trim();
  if (!note) return { ok: false, error: "Falta la nota para agregar al lead." };

  const found = await findLead(ctx, args);
  if (!found.ok || !found.lead) return found;

  const { data, error } = await ctx.supabase
    .from("leads")
    .update({
      notes: appendNote(found.lead.notes, note),
      last_interaction_at: new Date().toISOString(),
    })
    .eq("company_id", ctx.companyId)
    .eq("id", found.lead.id)
    .select(LEAD_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Agregué la nota al lead ${data.first_name} ${data.last_name}.`,
    data,
  };
}

export async function convertLeadToClientTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const found = await findLead(ctx, args);
  if (!found.ok || !found.lead) return found;

  const lead = found.lead;
  const fullName = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
  const companyName = String(args.company_name || lead.company_name || fullName || "").trim();

  if (!companyName) return { ok: false, error: "No pude determinar el nombre del cliente." };

  const clientPayload = {
    company_id: ctx.companyId,
    company_name: companyName,
    contact_person: fullName || null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    whatsapp: lead.whatsapp ?? lead.phone ?? null,
    status: args.status ?? "Active",
    notes: appendNote(args.notes ?? lead.notes ?? null, `Cliente convertido desde lead ${lead.id}.`),
  };

  const { data: client, error: clientError } = await ctx.supabase
    .from("clients")
    .insert(clientPayload)
    .select("id,company_id,company_name,contact_person,email,phone,whatsapp,status,notes,created_at,updated_at")
    .single();

  if (clientError) return { ok: false, error: clientError.message };

  let contact = null;
  if (fullName) {
    const { data: contactData } = await ctx.supabase
      .from("contacts")
      .insert({
        company_id: ctx.companyId,
        client_id: client.id,
        first_name: lead.first_name || "Contacto",
        last_name: lead.last_name || "Principal",
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        whatsapp: lead.whatsapp ?? lead.phone ?? null,
        notes: "Contacto creado al convertir lead en cliente.",
        is_primary: true,
      })
      .select("id,client_id,first_name,last_name,email,phone,whatsapp,is_primary,created_at")
      .single();

    contact = contactData ?? null;
  }

  await ctx.supabase
    .from("leads")
    .update({ status: "Won", last_interaction_at: new Date().toISOString() })
    .eq("company_id", ctx.companyId)
    .eq("id", lead.id);

  return {
    ok: true,
    message: `Convertí el lead ${fullName || lead.id} en cliente ${client.company_name}.`,
    data: { client, contact, lead_id: lead.id },
  };
}
