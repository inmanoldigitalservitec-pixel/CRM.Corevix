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
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function cleanOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function metaErrorToMessage(payload: any): string {
  const message = payload?.error?.message || payload?.message || "Meta Graph API error";
  const type = payload?.error?.type || null;
  const code = payload?.error?.code ?? null;
  const subcode = payload?.error?.error_subcode ?? null;
  const suffix: string[] = [];
  if (type) suffix.push(String(type));
  if (code !== null) suffix.push(`code:${code}`);
  if (subcode !== null) suffix.push(`subcode:${subcode}`);
  return suffix.length ? `${message} (${suffix.join(", ")})` : message;
}

function readBearerToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const jwt = readBearerToken(req);
    if (!jwt) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser(jwt);
    if (authError || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON body" }, 400);

    const companyId = cleanOptionalString((body as any).company_id);
    const accountId = cleanOptionalString((body as any).account_id);
    const conversationId = cleanOptionalString((body as any).conversation_id);
    const text = cleanOptionalString((body as any).text);

    if (!companyId || !isUuid(companyId))
      return jsonResponse({ error: "company_id inválido" }, 400);
    if (!accountId || !isUuid(accountId))
      return jsonResponse({ error: "account_id inválido" }, 400);
    if (!conversationId || !isUuid(conversationId))
      return jsonResponse({ error: "conversation_id inválido" }, 400);
    if (!text) return jsonResponse({ error: "El mensaje no puede estar vacío" }, 400);

    const [
      { data: currentCompanyId, error: companyError },
      { data: isMember, error: memberError },
    ] = await Promise.all([
      callerClient.rpc("get_current_company_id"),
      callerClient.rpc("is_company_member"),
    ]);
    if (companyError) return jsonResponse({ error: companyError.message }, 403);
    if (memberError) return jsonResponse({ error: memberError.message }, 403);
    if (!isMember)
      return jsonResponse({ error: "Account is inactive or not a company member" }, 403);
    if (!currentCompanyId || String(currentCompanyId) !== companyId) {
      return jsonResponse({ error: "La conversación no pertenece a la empresa actual" }, 403);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: account, error: accountError } = await serviceClient
      .from("meta_accounts")
      .select("id, company_id, platform, page_id, access_token_secret_id, status")
      .eq("id", accountId)
      .eq("company_id", companyId)
      .eq("platform", "messenger")
      .maybeSingle();
    if (accountError) return jsonResponse({ error: accountError.message }, 500);
    if (!account)
      return jsonResponse({ error: "Cuenta Meta no encontrada para la empresa indicada" }, 404);

    const { data: conversation, error: conversationError } = await serviceClient
      .from("meta_conversations")
      .select(
        "id, company_id, account_id, platform, external_user_id, last_message_text, last_message_at",
      )
      .eq("id", conversationId)
      .eq("company_id", companyId)
      .eq("account_id", accountId)
      .eq("platform", "messenger")
      .maybeSingle();
    if (conversationError) return jsonResponse({ error: conversationError.message }, 500);
    if (!conversation)
      return jsonResponse({ error: "La conversación no pertenece a la cuenta indicada" }, 404);

    const secretRef = cleanOptionalString(account.access_token_secret_id);
    if (!secretRef) {
      return jsonResponse({ error: "Messenger todavía no tiene token seguro configurado." }, 400);
    }

    const { data: secretRow, error: secretError } = await serviceClient
      .from("meta_account_secrets")
      .select("id, access_token")
      .eq("id", secretRef)
      .eq("company_id", companyId)
      .maybeSingle();
    if (secretError) return jsonResponse({ error: secretError.message }, 500);

    const accessToken = cleanOptionalString(secretRow?.access_token);
    if (!accessToken) {
      return jsonResponse({ error: "Messenger todavía no tiene token seguro configurado." }, 400);
    }

    const graphVersion = cleanOptionalString(Deno.env.get("META_GRAPH_VERSION")) || "v22.0";
    const pageId = cleanOptionalString(account.page_id);
    const endpoint = pageId
      ? `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(pageId)}/messages`
      : `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/me/messages`;

    const sendRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_type: "RESPONSE",
        recipient: { id: conversation.external_user_id },
        message: { text },
      }),
    });

    const rawText = await sendRes.text();
    let rawJson: any = null;
    try {
      rawJson = JSON.parse(rawText);
    } catch {
      rawJson = null;
    }

    if (!sendRes.ok) {
      return jsonResponse(
        { error: metaErrorToMessage(rawJson || rawText) },
        sendRes.status >= 400 && sendRes.status < 500 ? 400 : 502,
      );
    }

    const nowIso = new Date().toISOString();
    const outboundMessageInsert = await serviceClient
      .from("meta_messages")
      .insert({
        company_id: companyId,
        account_id: accountId,
        conversation_id: conversationId,
        platform: "messenger",
        external_message_id: cleanOptionalString(rawJson?.message_id),
        direction: "outbound",
        message_type: "text",
        text,
        attachments: [],
        raw_payload: rawJson ?? { raw: rawText },
        sent_at: nowIso,
      })
      .select("id")
      .maybeSingle();
    if (outboundMessageInsert.error)
      return jsonResponse({ error: outboundMessageInsert.error.message }, 500);

    const { error: conversationUpdateError } = await serviceClient
      .from("meta_conversations")
      .update({
        last_message_text: text,
        last_message_at: nowIso,
        // If a CRM user is replying, we consider this a human takeover for Messenger.
        status: "human_mode",
      })
      .eq("id", conversationId)
      .eq("company_id", companyId);
    if (conversationUpdateError)
      return jsonResponse({ error: conversationUpdateError.message }, 500);

    return jsonResponse({
      ok: true,
      success: true,
      message: "Mensaje enviado correctamente",
      messageId: cleanOptionalString(rawJson?.message_id),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
