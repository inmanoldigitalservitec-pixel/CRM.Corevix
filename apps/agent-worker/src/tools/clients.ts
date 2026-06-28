import type { ToolContext, ToolResult } from "../types";

function formatClient(client: any, index: number) {
  return `
${index + 1}. ${client.company_name ?? "Cliente sin empresa"}
- ID: ${client.id}
- Contacto: ${client.contact_person ?? "No registrado"}
- Estado: ${client.status ?? "No definido"}
- Teléfono: ${client.phone ?? "No registrado"}
- Email: ${client.email ?? "No registrado"}
- Creado: ${client.created_at ?? "No registrado"}
`.trim();
}

export async function createClientTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const company_name = String(args.company_name || args.name || "").trim();

  if (!company_name) {
    return {
      ok: false,
      error: "Falta el nombre del cliente o empresa.",
    };
  }

  const payload = {
    company_id: ctx.companyId,
    company_name,
    contact_person: args.contact_person ?? null,
    phone: args.phone ?? null,
    email: args.email ?? null,
    status: args.status ?? "active",
    tags: args.tags ?? [],
  };

  const { data, error } = await ctx.supabase
    .from("clients")
    .insert(payload)
    .select("id,company_name,contact_person,phone,email,status,created_at")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: `Cliente creado correctamente: ${data.company_name}`,
    data,
  };
}

export async function searchClientsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const query = String(args.query || args.name || "").trim();

  if (!query) {
    return {
      ok: false,
      error: "Falta el texto de búsqueda.",
    };
  }

  const { data, error } = await ctx.supabase
    .from("clients")
    .select("id,company_name,contact_person,phone,email,status,created_at")
    .eq("company_id", ctx.companyId)
    .or(
      `company_name.ilike.%${query}%,contact_person.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.length) {
    return {
      ok: true,
      message: `No encontré clientes relacionados con "${query}".`,
      data: [],
    };
  }

  return {
    ok: true,
    message: `Encontré ${data.length} cliente(s) relacionados con "${query}":

${data.map(formatClient).join("\n\n")}`,
    data,
  };
}
