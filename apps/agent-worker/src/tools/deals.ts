import type { ToolContext, ToolResult } from "../types";

const DEAL_SELECT =
  "id,name,lead_id,stage,value,probability,expected_close,assigned_to,notes,created_at,updated_at";

const STAGE_ALIASES: Record<string, string> = {
  new: "New Opportunity",
  opportunity: "New Opportunity",
  "new opportunity": "New Opportunity",
  discovery: "Discovery",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  "proposal preparation": "Proposal Preparation",
  "proposal sent": "Proposal Sent",
  negotiation: "Negotiation",
  contract: "Contract Sent",
  "contract sent": "Contract Sent",
  won: "Won",
  lost: "Lost",
};

function normalizeStage(value: any, fallback = "New Opportunity") {
  const raw = String(value || fallback).trim();
  const key = raw.toLowerCase();
  return STAGE_ALIASES[key] || raw || fallback;
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

function formatDeal(deal: any, index: number) {
  return `
${index + 1}. ${deal.name ?? "Deal sin nombre"}
- ID: ${deal.id}
- Etapa: ${deal.stage ?? "No definida"}
- Valor: ${deal.value ?? "No registrado"}
- Probabilidad: ${deal.probability ?? "No registrada"}
- Cierre esperado: ${deal.expected_close ?? "No registrado"}
- Lead relacionado: ${deal.lead_id ?? "No relacionado"}
- Asignado a: ${deal.assigned_to ?? "Sin asignar"}
- Notas: ${deal.notes ?? "Sin notas"}
- Creado: ${deal.created_at ?? "No registrado"}
`.trim();
}

async function findDeal(ctx: ToolContext, args: any): Promise<ToolResult & { deal?: any }> {
  const dealId = String(args.deal_id || args.id || "").trim();
  const queryText = String(args.query || args.name || args.title || "").trim();

  let query = ctx.supabase.from("deals").select(DEAL_SELECT).eq("company_id", ctx.companyId);

  if (dealId) {
    query = query.eq("id", dealId);
  } else if (queryText) {
    query = query.or(`name.ilike.%${queryText}%,notes.ilike.%${queryText}%`);
  } else {
    return { ok: false, error: "Falta el deal_id o texto para buscar la oportunidad." };
  }

  const { data: matches, error } = await query.order("updated_at", { ascending: false }).limit(5);
  if (error) return { ok: false, error: error.message };
  if (!matches?.length) return { ok: false, error: "No encontré la oportunidad." };

  if (matches.length > 1 && !dealId) {
    const normalizedQuery = queryText.toLowerCase().trim();
    const exact = matches.find((item: any) => String(item.name || "").toLowerCase().trim() === normalizedQuery);
    if (!exact) {
      return {
        ok: false,
        error: "Encontré más de una oportunidad parecida. Indica el ID exacto de la oportunidad.",
        data: matches,
      };
    }
    return { ok: true, deal: exact, data: exact };
  }

  return { ok: true, deal: matches[0], data: matches[0] };
}

export async function createDealTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const name = String(args.name || args.title || "").trim();

  if (!name) {
    return {
      ok: false,
      error: "Falta el nombre de la oportunidad/deal.",
    };
  }

  const probability = optionalNumber(args.probability);
  const value = optionalNumber(args.value);

  const payload = {
    company_id: ctx.companyId,
    name,
    lead_id: args.lead_id ?? null,
    stage: normalizeStage(args.stage),
    value: value ?? null,
    probability: probability ?? null,
    expected_close: args.expected_close ?? null,
    assigned_to: args.assigned_to ?? null,
    notes: args.notes ?? null,
  };

  const { data, error } = await ctx.supabase.from("deals").insert(payload).select(DEAL_SELECT).single();

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
  const stage = String(args.stage ?? "all").trim();
  const limit = Math.min(Math.max(Number(args.limit || 20), 1), 50);

  let query = ctx.supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("company_id", ctx.companyId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (stage !== "all") {
    query = query.eq("stage", normalizeStage(stage));
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
    message: `Encontré ${data.length} oportunidad(es):\n\n${data.map(formatDeal).join("\n\n")}`,
    data,
  };
}

export async function searchDealsTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const queryText = String(args.query || args.name || args.title || "").trim();
  if (!queryText) return { ok: false, error: "Falta el texto de búsqueda." };

  const { data, error } = await ctx.supabase
    .from("deals")
    .select(DEAL_SELECT)
    .eq("company_id", ctx.companyId)
    .or(`name.ilike.%${queryText}%,notes.ilike.%${queryText}%`)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: true, message: `No encontré oportunidades relacionadas con "${queryText}".`, data: [] };

  return {
    ok: true,
    message: `Encontré ${data.length} oportunidad(es) relacionadas con "${queryText}":\n\n${data.map(formatDeal).join("\n\n")}`,
    data,
  };
}

export async function updateDealTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const found = await findDeal(ctx, args);
  if (!found.ok || !found.deal) return found;

  const updates: Record<string, any> = {};
  for (const key of ["name", "expected_close", "assigned_to", "lead_id", "notes"]) {
    if (hasOwn(args, key)) updates[key] = optionalString(args[key]);
  }

  if (hasOwn(args, "title") && !hasOwn(args, "name")) updates.name = optionalString(args.title);
  if (hasOwn(args, "stage")) updates.stage = normalizeStage(args.stage, found.deal.stage || "New Opportunity");

  if (hasOwn(args, "value")) {
    const value = optionalNumber(args.value);
    if (value === undefined) return { ok: false, error: "value debe ser un número válido." };
    updates.value = value;
  }

  if (hasOwn(args, "probability")) {
    const probability = optionalNumber(args.probability);
    if (probability === undefined) return { ok: false, error: "probability debe ser un número válido." };
    updates.probability = Math.max(0, Math.min(100, probability));
  }

  if (Object.keys(updates).length === 0) return { ok: false, error: "No recibí campos para actualizar." };

  const { data, error } = await ctx.supabase
    .from("deals")
    .update(updates)
    .eq("company_id", ctx.companyId)
    .eq("id", found.deal.id)
    .select(DEAL_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Actualicé la oportunidad ${data.name}.\n\n${formatDeal(data, 0)}`,
    data,
  };
}

export async function updateDealStageTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const stage = normalizeStage(args.stage || args.new_stage || args.to_stage || "");
  if (!stage) return { ok: false, error: "Falta la etapa destino." };
  return updateDealTool(ctx, { ...args, stage });
}

export async function addDealNoteTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const note = String(args.note || args.notes || "").trim();
  if (!note) return { ok: false, error: "Falta la nota para agregar a la oportunidad." };

  const found = await findDeal(ctx, args);
  if (!found.ok || !found.deal) return found;

  const { data, error } = await ctx.supabase
    .from("deals")
    .update({ notes: appendNote(found.deal.notes, note) })
    .eq("company_id", ctx.companyId)
    .eq("id", found.deal.id)
    .select(DEAL_SELECT)
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Agregué la nota a la oportunidad ${data.name}.`,
    data,
  };
}

export async function linkDealToLeadTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const leadId = String(args.lead_id || "").trim();
  if (!leadId) return { ok: false, error: "Falta el lead_id para vincular la oportunidad." };
  return updateDealTool(ctx, { ...args, lead_id: leadId });
}

export async function assignDealOwnerTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const assignedTo = String(args.assigned_to || args.owner_id || args.user_id || "").trim();
  if (!assignedTo) return { ok: false, error: "Falta el usuario responsable para asignar la oportunidad." };
  return updateDealTool(ctx, { ...args, assigned_to: assignedTo });
}
