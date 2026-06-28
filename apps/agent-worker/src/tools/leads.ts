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

  const { data, error } = await ctx.supabase
    .from("leads")
    .insert(payload)
    .select("id,first_name,last_name,company_name,phone,email,whatsapp,source,source_channel,source_platform,status,notes,estimated_value,created_at,last_interaction_at")
    .single();

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
    .select("id,first_name,last_name,company_name,phone,email,whatsapp,source,source_channel,source_platform,status,notes,estimated_value,created_at,last_interaction_at")
    .eq("company_id", ctx.companyId)
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,company_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,whatsapp.ilike.%${query}%`
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

export async function updateLeadStatusTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const status = String(args.status || "").trim();

  if (!LEAD_STATUSES.includes(status)) {
    return {
      ok: false,
      error: `Estado inválido. Usa uno de estos: ${LEAD_STATUSES.join(", ")}`,
    };
  }

  const leadId = String(args.lead_id || "").trim();
  const queryText = String(args.query || args.name || args.lead_name || "").trim();

  let query = ctx.supabase
    .from("leads")
    .select("id,first_name,last_name,company_name,phone,email,status,notes,created_at")
    .eq("company_id", ctx.companyId);

  if (leadId) {
    query = query.eq("id", leadId);
  } else if (queryText) {
    const parts = queryText.split(/\\s+/).filter(Boolean);
    const first = parts[0] || "";
    const last = parts.slice(1).join(" ");

    if (first && last) {
      query = query
        .ilike("first_name", `%${first}%`)
        .ilike("last_name", `%${last}%`);
    } else {
      query = query.or(
        `first_name.ilike.%${queryText}%,last_name.ilike.%${queryText}%,company_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%,whatsapp.ilike.%${queryText}%`
      );
    }
  } else {
    return { ok: false, error: "Falta el lead_id o nombre del lead." };
  }

  const { data: matches, error: findError } = await query
    .order("created_at", { ascending: false })
    .limit(5);

  if (findError) return { ok: false, error: findError.message };

  if (!matches?.length) {
    return { ok: false, error: "No encontré el lead para actualizar." };
  }

  let lead = matches[0];

  if (matches.length > 1 && !leadId) {
    const normalizedQuery = queryText.toLowerCase().trim();
    const exact = matches.find((item: any) =>
      `${item.first_name ?? ""} ${item.last_name ?? ""}`.toLowerCase().trim() === normalizedQuery
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

  const { data, error } = await ctx.supabase
    .from("leads")
    .update({
      status,
      last_interaction_at: new Date().toISOString(),
    })
    .eq("company_id", ctx.companyId)
    .eq("id", lead.id)
    .select("id,first_name,last_name,company_name,phone,email,status,notes,updated_at,last_interaction_at")
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Actualicé el lead ${data.first_name} ${data.last_name} al estado ${data.status}.`,
    data,
  };
}
