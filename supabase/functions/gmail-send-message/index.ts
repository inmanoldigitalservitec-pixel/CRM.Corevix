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

function readBearerToken(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
}

function cleanOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeEmailList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanOptionalString(item)).filter(Boolean) as string[];
  }
  const text = cleanOptionalString(value);
  if (!text) return [];
  return text
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function decodeMimeWords(value: string) {
  return value.replace(/=\?utf-8\?b\?([^?]+)\?=/gi, (_match, encoded) => {
    try {
      return new TextDecoder().decode(
        Uint8Array.from(atob(String(encoded)), (char) => char.charCodeAt(0)),
      );
    } catch {
      return String(encoded);
    }
  });
}

function extractEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refreshAccessToken(args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text fallback
  }

  if (!res.ok) {
    const message = json?.error_description || json?.error || text || "Refresh token failed";
    throw new Error(message);
  }

  return json as { access_token: string; expires_in?: number; scope?: string };
}

async function sendGmailMessage(args: {
  accessToken: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  threadId: string | null;
}) {
  const html = `<div>${escapeHtml(args.body).replaceAll("\n", "<br>")}</div>`;
  const headers = [
    `From: ${args.from}`,
    `To: ${args.to.join(", ")}`,
    args.cc.length ? `Cc: ${args.cc.join(", ")}` : null,
    args.bcc.length ? `Bcc: ${args.bcc.join(", ")}` : null,
    `Subject: ${encodeHeader(args.subject || "(No Subject)")}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean);

  const raw = base64Url(`${headers.join("\r\n")}\r\n\r\n${html}`);
  const payload: Record<string, unknown> = { raw };
  if (args.threadId) payload.threadId = args.threadId;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text fallback
  }

  if (!res.ok) {
    const message = json?.error?.message || json?.error_description || text || "Gmail send failed";
    throw new Error(message);
  }

  return json as { id: string; threadId?: string; labelIds?: string[] };
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
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser(jwt);
    if (authError || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);

    const { data: profile, error: profileError } = await callerClient
      .from("profiles")
      .select("id, user_id, company_id, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (profileError) return jsonResponse({ error: profileError.message }, 400);
    if (!profile?.id || !profile.company_id)
      return jsonResponse({ error: "No company context for this user" }, 403);
    if (profile.is_active === false) return jsonResponse({ error: "Account is inactive" }, 403);

    const body = await req.json().catch(() => ({}));
    const to = normalizeEmailList((body as any).to);
    const cc = normalizeEmailList((body as any).cc);
    const bcc = normalizeEmailList((body as any).bcc);
    const subject = cleanOptionalString((body as any).subject) || "(No Subject)";
    const messageBody = cleanOptionalString((body as any).body);
    const conversationId = cleanOptionalString((body as any).conversation_id);

    if (!to.length) return jsonResponse({ error: "Agrega al menos un destinatario." }, 400);
    if (!messageBody) return jsonResponse({ error: "El mensaje no puede estar vacío." }, 400);

    const accountQueryIds = [profile.id, authData.user.id].filter(Boolean);
    const { data: accountsRows, error: accountError } = await serviceClient
      .from("email_accounts")
      .select(
        "id, company_id, user_id, provider, email_address, is_active, access_token, refresh_token, token_expires_at",
      )
      .eq("provider", "gmail")
      .in("user_id", accountQueryIds)
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (accountError) return jsonResponse({ error: accountError.message }, 400);
    const account = Array.isArray(accountsRows) && accountsRows.length ? accountsRows[0] : null;
    if (!account?.id) return jsonResponse({ error: "No hay una cuenta de Gmail conectada." }, 400);

    const { data: gmailSettings, error: settingsError } = await serviceClient
      .from("gmail_settings")
      .select("client_id, client_secret_encrypted")
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (settingsError) return jsonResponse({ error: settingsError.message }, 400);
    if (!gmailSettings?.client_id || !gmailSettings?.client_secret_encrypted) {
      return jsonResponse({ error: "Falta configurar Gmail API en Settings." }, 400);
    }

    let conversation: any = null;
    if (conversationId) {
      const { data, error } = await serviceClient
        .from("email_conversations")
        .select("id, company_id, email_account_id, provider, provider_thread_id, subject")
        .eq("id", conversationId)
        .eq("company_id", profile.company_id)
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 400);
      if (!data?.id) return jsonResponse({ error: "Conversación no encontrada." }, 404);
      conversation = data;
    }

    let accessToken = String((account as any).access_token || "");
    const refreshToken = (account as any).refresh_token ? String((account as any).refresh_token) : null;
    const tokenExpiresAt = (account as any).token_expires_at
      ? new Date(String((account as any).token_expires_at))
      : null;
    const isExpired = tokenExpiresAt ? tokenExpiresAt.getTime() <= Date.now() + 30_000 : false;

    if ((!accessToken || isExpired) && refreshToken) {
      const refreshed = await refreshAccessToken({
        refreshToken,
        clientId: String(gmailSettings.client_id),
        clientSecret: String(gmailSettings.client_secret_encrypted),
      });
      accessToken = refreshed.access_token;
      await serviceClient
        .from("email_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
            : null,
          scopes: refreshed.scope ? String(refreshed.scope).split(/\s+/).filter(Boolean) : undefined,
        })
        .eq("id", account.id);
    }

    if (!accessToken) return jsonResponse({ error: "Conecta Gmail antes de enviar." }, 400);

    const providerThreadId = conversation?.provider_thread_id ? String(conversation.provider_thread_id) : null;
    const sent = await sendGmailMessage({
      accessToken,
      from: String(account.email_address || "me"),
      to,
      cc,
      bcc,
      subject,
      body: messageBody,
      threadId: providerThreadId,
    });

    const now = new Date().toISOString();
    const threadId = sent.threadId || providerThreadId || null;
    let conversationRow = conversation;

    if (!conversationRow?.id) {
      let existingConversation: any = null;
      if (threadId) {
        const { data: existing, error: existingError } = await serviceClient
          .from("email_conversations")
          .select("id, provider_thread_id")
          .eq("company_id", profile.company_id)
          .eq("email_account_id", account.id)
          .eq("provider", "gmail")
          .eq("provider_thread_id", threadId)
          .maybeSingle();
        if (existingError) return jsonResponse({ error: existingError.message }, 500);
        existingConversation = existing;
      }

      if (existingConversation?.id) {
        const { data: updated, error: convoUpdateError } = await serviceClient
          .from("email_conversations")
          .update({
            last_message_at: now,
            snippet: messageBody.slice(0, 240),
            subject,
            from_email: String(account.email_address || ""),
            to_email: to.join(", "),
            status: "open",
            updated_at: now,
          })
          .eq("id", existingConversation.id)
          .eq("company_id", profile.company_id)
          .select("id, provider_thread_id")
          .single();
        if (convoUpdateError) return jsonResponse({ error: convoUpdateError.message }, 500);
        conversationRow = updated;
      } else {
        const { data: inserted, error: convoError } = await serviceClient
          .from("email_conversations")
          .insert({
            company_id: profile.company_id,
            email_account_id: account.id,
            provider: "gmail",
            provider_thread_id: threadId,
            subject,
            status: "open",
            last_message_at: now,
            snippet: messageBody.slice(0, 240),
            from_email: String(account.email_address || ""),
            to_email: to.join(", "),
            user_id: account.user_id,
            is_read: true,
          })
          .select("id, provider_thread_id")
          .single();
        if (convoError) return jsonResponse({ error: convoError.message }, 500);
        conversationRow = inserted;
      }
    } else {
      const { error: convoUpdateError } = await serviceClient
        .from("email_conversations")
        .update({
          last_message_at: now,
          snippet: messageBody.slice(0, 240),
          provider_thread_id: threadId,
          status: "open",
          updated_at: now,
        })
        .eq("id", conversationRow.id)
        .eq("company_id", profile.company_id);
      if (convoUpdateError) return jsonResponse({ error: convoUpdateError.message }, 500);
    }

    const { data: savedMessage, error: messageError } = await serviceClient
      .from("email_messages")
      .insert({
        company_id: profile.company_id,
        conversation_id: conversationRow.id,
        direction: "outbound",
        sender: String(account.email_address || ""),
        recipient: to.join(", "),
        body: messageBody,
        body_html: `<div>${escapeHtml(messageBody).replaceAll("\n", "<br>")}</div>`,
        provider: "gmail",
        subject,
        from_email: String(account.email_address || ""),
        to_email: to.join(", "),
        cc,
        bcc,
        sent_at: now,
        is_read: true,
        raw: sent,
        provider_message_id: sent.id,
        provider_thread_id: threadId,
        snippet: messageBody.slice(0, 240),
        label_ids: sent.labelIds || ["SENT"],
        email_account_id: account.id,
        user_id: account.user_id,
        updated_at: now,
      })
      .select("id")
      .single();

    if (messageError) return jsonResponse({ error: messageError.message }, 500);

    return jsonResponse({
      ok: true,
      message_id: savedMessage?.id || null,
      provider_message_id: sent.id,
      provider_thread_id: threadId,
      conversation_id: conversationRow.id,
      from: decodeMimeWords(String(account.email_address || "")),
      to: to.map(extractEmail),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[gmail-send-message] failed", {
      message,
      stack: error instanceof Error ? error.stack : null,
    });
    return jsonResponse({ error: message }, 500);
  }
});
