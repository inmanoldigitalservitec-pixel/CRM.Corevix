import type { ToolContext, ToolResult } from "../types";

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
    return {
      ok: false,
      error: "Falta el nombre del lead.",
    };
  }

  if (!last_name) {
    last_name = "Sin apellido";
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
    status: args.status ?? "New",
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

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    message: `Listo, creé el lead ${data.first_name} ${data.last_name}.

Información registrada:
${formatLead(data, 0)}`,
    data,
  };
}

export async function searchLeadsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const query = String(args.query || args.name || "").trim();

  if (!query) {
    return {
      ok: false,
      error: "Falta el texto de búsqueda.",
    };
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

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (!data?.length) {
    return {
      ok: true,
      message: `No encontré leads relacionados con "${query}".`,
      data: [],
    };
  }

  return {
    ok: true,
    message: `Encontré ${data.length} lead(s) relacionados con "${query}":

${data.map(formatLead).join("\n\n")}`,
    data,
  };
}
