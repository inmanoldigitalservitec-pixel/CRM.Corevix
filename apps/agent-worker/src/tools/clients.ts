import type { ToolContext, ToolResult } from "../types";

const CLIENT_STATUSES = ["Active", "VIP", "Pending", "Inactive", "Past Client"];
const CLIENT_SELECT =
  "id,company_id,company_name,contact_person,email,phone,whatsapp,address,city,country,tax_id,website,industry,status,account_manager,tags,notes,created_at,updated_at";
const CONTACT_SELECT =
  "id,company_id,client_id,first_name,last_name,email,phone,whatsapp,department,position,tags,notes,is_primary,created_at,updated_at";

function hasOwn(args: any, key: string) {
  return Object.prototype.hasOwnProperty.call(args ?? {}, key);
}

function optionalString(value: any) {
  if (value === undefined) return undefined;
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeTags(value: any) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitName(input: string) {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "Contacto",
    last_name: parts.slice(1).join(" ") || "Principal",
  };
}

function appendNote(current: string | null | undefined, note: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${note}`;
  return current?.trim() ? `${current.trim()}\n${entry}` : entry;
}

function formatClient(client: any, index: number) {
  return `
${index + 1}. ${client.company_name ?? "Cliente sin nombre"}
- ID: ${client.id}
- Estado: ${client.status ?? "No definido"}
- Contacto principal: ${client.contact_person ?? "No registrado"}
- Teléfono: ${client.phone ?? "No registrado"}
- WhatsApp: ${client.whatsapp ?? "No registrado"}
- Email: ${client.email ?? "No registrado"}
- Industria: ${client.industry ?? "No registrada"}
- Ciudad/País: ${[client.city, client.country].filter(Boolean).join(", ") || "No registrado"}
- Website: ${client.website ?? "No registrado"}
- Tags: ${Array.isArray(client.tags) && client.tags.length ? client.tags.join(", ") : "Sin tags"}
- Notas: ${client.notes ?? "Sin notas"}
`.trim();
}

async function findClient(ctx: ToolContext, args: any): Promise<ToolResult & { client?: any }> {
  const clientId = String(args.client_id || args.id || "").trim();
  const queryText = String(args.query || args.name || args.company_name || args.client_name || "").trim();

  let query = ctx.supabase.from("clients").select(CLIENT_SELECT).eq("company_id", ctx.companyId);

  if (clientId) {
    query = query.eq("id", clientId);
  } else if (queryText) {
    query = query.or(
      `company_name.ilike.%${queryText}%,contact_person.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%,whatsapp.ilike.%${queryText}%,industry.ilike.%${queryText}%`,
    );
  } else {
    return { ok: false, error: "Falta el client_id o texto para buscar el cliente." };
  }

  const { data: matches, error } = await query.order("updated_at", { ascending: false }).limit(5);

  if (error) return { ok: false, error: error.message };
  if (!matches?.length) return { ok: false, error: "No encontré el cliente." };

  let client = matches[0];

  if (matches.length > 1 && !clientId) {
    const normalizedQuery = queryText.toLowerCase().trim();
    const exact = matches.find(
      (item: any) => String(item.company_name || "").toLowerCase().trim() === normalizedQuery,
    );

    if (exact) {
      client = exact;
    } else {
      return {
        ok: false,
        error: "Encontré más de un cliente parecido. Indica el ID exacto del cliente.",
        data: matches,
      };
    }
  }

  return { ok: true, client, data: client };
}

export async function createClientTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const companyName = String(args.company_name || args.name || "").trim();
  if (!companyName) return { ok: false, error: "Falta el nombre de la empresa o cliente." };

  const status = String(args.status || "Active").trim();
  if (!CLIENT_STATUSES.includes(status)) {
    return { ok: false, error: `Estado inválido. Usa uno de estos: ${CLIENT_STATUSES.join(", ")}` };
  }

  const tags = normalizeTags(args.tags);
  const payload: Record<string, any> = {
    company_id: ctx.companyId,
    company_name: companyName,
    contact_person: args.contact_person ?? args.contact_name ?? null,
    email: args.email ?? null,
    phone: args.phone ?? null,
    whatsapp: args.whatsapp ?? args.phone ?? null,
    address: args.address ?? null,
    city: args.city ?? null,
    country: args.country ?? null,
    tax_id: args.tax_id ?? null,
    website: args.website ?? null,
    industry: args.industry ?? null,
    status,
    account_manager: args.account_manager ?? null,
    notes: args.notes ?? null,
  };

  if (tags !== undefined) payload.tags = tags;

  const { data: client, error } = await ctx.supabase.from("clients").insert(payload).select(CLIENT_SELECT).single();
  if (error) return { ok: false, error: error.message };

  let contact = null;
  const contactName = String(args.contact_name || args.contact_person || "").trim();
  if (contactName) {
    const split = splitName(contactName);
    const { data: contactData } = await ctx.supabase
      .from("contacts")
      .insert({
        company_id: ctx.companyId,
        client_id: client.id,
        first_name: args.contact_first_name ?? split.first_name,
        last_name: args.contact_last_name ?? split.last_name,
        email: args.contact_email ?? args.email ?? null,
        phone: args.contact_phone ?? args.phone ?? null,
        whatsapp: args.contact_whatsapp ?? args.whatsapp ?? args.phone ?? null,
        department: args.contact_department ?? null,
        position: args.contact_position ?? null,
        notes: args.contact_notes ?? "Contacto principal creado desde Corevix AI.",
        is_primary: true,
      })
      .select(CONTACT_SELECT)
      .single();

    contact = contactData ?? null;
  }

  return {
    ok: true,
    message: `Creé el cliente ${client.company_name}.\n\n${formatClient(client, 0)}`,
    data: { client, contact },
  };
}

export async function searchClientsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const queryText = String(args.query || args.name || args.company_name || "").trim();
  if (!queryText) return { ok: false, error: "Falta el texto de búsqueda." };

  const { data, error } = await ctx.supabase
    .from("clients")
    .select(CLIENT_SELECT)
    .eq("company_id", ctx.companyId)
    .or(
      `company_name.ilike.%${queryText}%,contact_person.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%,whatsapp.ilike.%${queryText}%,industry.ilike.%${queryText}%`,
    )
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: true, message: `No encontré clientes relacionados con "${queryText}".`, data: [] };

  return {
    ok: true,
    message: `Encontré ${data.length} cliente(s) relacionados con "${queryText}":\n\n${data.map(formatClient).join("\n\n")}`,
    data,
  };
}

export async function listClientsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const status = String(args.status || "all").trim();
  const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

  if (status !== "all" && !CLIENT_STATUSES.includes(status)) {
    return { ok: false, error: `Estado inválido. Usa all o uno de estos: ${CLIENT_STATUSES.join(", ")}` };
  }

  let query = ctx.supabase.from("clients").select(CLIENT_SELECT).eq("company_id", ctx.companyId);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(limit);
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: true, message: "No hay clientes para ese filtro.", data: [] };

  return {
    ok: true,
    message: `Encontré ${data.length} cliente(s):\n\n${data.map(formatClient).join("\n\n")}`,
    data,
  };
}

export async function updateClientTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const found = await findClient(ctx, args);
  if (!found.ok || !found.client) return found;

  const updates: Record<string, any> = {};
  for (const key of [
    "company_name",
    "contact_person",
    "email",
    "phone",
    "whatsapp",
    "address",
    "city",
    "country",
    "tax_id",
    "website",
    "industry",
    "account_manager",
    "notes",
  ]) {
    if (hasOwn(args, key)) updates[key] = optionalString(args[key]);
  }

  if (hasOwn(args, "name") && !hasOwn(args, "company_name")) updates.company_name = optionalString(args.name);

  if (hasOwn(args, "status")) {
    const status = String(args.status || "").trim();
    if (!CLIENT_STATUSES.includes(status)) {
      return { ok: false, error: `Estado inválido. Usa uno de estos: ${CLIENT_STATUSES.join(", ")}` };
    }
    updates.status = status;
  }

  if (hasOwn(args, "tags")) updates.tags = normalizeTags(args.tags);

  if (Object.keys(updates).length === 0) return { ok: false, error: "No recibí campos para actualizar." };

  const { data, error } = await ctx.supabase
    .from("clients")
    .update(updates)
    .eq("company_id", ctx.companyId)
    .eq("id", found.client.id)
    .select(CLIENT_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Actualicé el cliente ${data.company_name}.\n\n${formatClient(data, 0)}`,
    data,
  };
}

export async function addClientNoteTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const note = String(args.note || args.notes || "").trim();
  if (!note) return { ok: false, error: "Falta la nota para agregar al cliente." };

  const found = await findClient(ctx, args);
  if (!found.ok || !found.client) return found;

  const { data, error } = await ctx.supabase
    .from("clients")
    .update({ notes: appendNote(found.client.notes, note) })
    .eq("company_id", ctx.companyId)
    .eq("id", found.client.id)
    .select(CLIENT_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Agregué la nota al cliente ${data.company_name}.`,
    data,
  };
}
