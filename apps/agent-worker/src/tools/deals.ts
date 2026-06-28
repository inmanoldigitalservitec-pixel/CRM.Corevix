import type { ToolContext, ToolResult } from "../types";

function formatDeal(deal: any, index: number) {
  return `
${index + 1}. ${deal.name ?? "Deal sin nombre"}
- ID: ${deal.id}
- Etapa: ${deal.stage ?? "No definida"}
- Valor: ${deal.value ?? "No registrado"}
- Cierre esperado: ${deal.expected_close ?? "No registrado"}
- Lead relacionado: ${deal.lead_id ?? "No relacionado"}
- Notas: ${deal.notes ?? "Sin notas"}
- Creado: ${deal.created_at ?? "No registrado"}
`.trim();
}

export async function createDealTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const name = String(args.name || args.title || "").trim();

  if (!name) {
    return {
      ok: false,
      error: "Falta el nombre de la oportunidad/deal.",
    };
  }

  const payload = {
    company_id: ctx.companyId,
    name,
    lead_id: args.lead_id ?? null,
    stage: args.stage ?? "new",
    value: args.value ?? null,
    expected_close: args.expected_close ?? null,
    notes: args.notes ?? null,
  };

  const { data, error } = await ctx.supabase
    .from("deals")
    .insert(payload)
    .select("id,name,lead_id,stage,value,expected_close,notes,created_at")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    message: `Oportunidad creada correctamente: ${data.name}`,
    data,
  };
}

export async function listDealsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const stage = args.stage ?? "all";

  let query = ctx.supabase
    .from("deals")
    .select("id,name,lead_id,stage,value,expected_close,notes,created_at")
    .eq("company_id", ctx.companyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (stage !== "all") {
    query = query.eq("stage", stage);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data?.length) {
    return {
      ok: true,
      message: "No encontré oportunidades registradas.",
      data: [],
    };
  }

  return {
    ok: true,
    message: `Encontré ${data.length} oportunidad(es):

${data.map(formatDeal).join("\n\n")}`,
    data,
  };
}
