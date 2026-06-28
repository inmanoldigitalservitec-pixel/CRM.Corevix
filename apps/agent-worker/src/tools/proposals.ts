import type { ToolContext, ToolResult } from "../types";

function makeProposalNumber() {
  return `PROP-AI-${Date.now()}`;
}

export async function createProposalTool(ctx: ToolContext, args: any): Promise<ToolResult> {
  const title = String(args.title || args.name || "").trim();

  if (!title) {
    return { ok: false, error: "Falta el título de la propuesta." };
  }

  const payload = {
    company_id: ctx.companyId,
    title,
    number: args.number || makeProposalNumber(),
    description: args.description ?? null,
    content: args.content ?? args.description ?? null,
    amount: args.amount ?? args.total ?? 0,
    currency: args.currency ?? "USD",
    status: args.status ?? "draft",
    lead_id: args.lead_id ?? null,
    client_id: args.client_id ?? null,
    deal_id: args.deal_id ?? null,
    product_id: args.product_id ?? null,
    valid_until: args.valid_until ?? null,
    notes: args.notes ?? null,
    created_by: ctx.userId,
  };

  const { data, error } = await ctx.supabase
    .from("proposals")
    .insert(payload)
    .select("id,number,title,description,amount,currency,status,lead_id,client_id,deal_id,product_id,valid_until,created_at")
    .single();

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: `Propuesta creada correctamente: ${data.title} (${data.number}).`,
    data,
  };
}
