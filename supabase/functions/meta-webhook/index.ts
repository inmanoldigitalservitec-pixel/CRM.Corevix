/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type MetaMessagingAttachment = {
  type?: string;
  payload?: Record<string, unknown>;
};

type MetaMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: MetaMessagingAttachment[];
  };
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asIsoTimestamp(value: unknown) {
  const ms = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(ms)) return new Date().toISOString();
  return new Date(ms).toISOString();
}

function extractText(event: MetaMessagingEvent) {
  const message = event.message;
  if (!message) return null;
  const text = cleanOptionalString(message.text);
  if (text) return text;
  if (Array.isArray(message.attachments) && message.attachments.length > 0) return "[Adjunto]";
  if (message.is_echo) return "[Eco]";
  return null;
}

function extractAttachments(event: MetaMessagingEvent) {
  const attachments = event.message?.attachments;
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((attachment): attachment is MetaMessagingAttachment => isObject(attachment))
    .map((attachment) => ({
      type: cleanOptionalString(attachment.type),
      payload: isObject(attachment.payload) ? attachment.payload : null,
    }));
}

function getVerifyTokenCandidates() {
  const envToken = cleanOptionalString(Deno.env.get("META_WEBHOOK_VERIFY_TOKEN"));
  return envToken ? [envToken] : [];
}

function normalizePlatform(value: unknown) {
  const s = cleanOptionalString(value)?.toLowerCase() ?? "";
  return s === "messenger" || s === "instagram" ? s : null;
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

async function fetchMessengerSenderProfile(opts: {
  serviceClient: any;
  companyId: string;
  accessTokenSecretId: string | null;
  senderId: string;
}) {
  const { serviceClient, companyId, accessTokenSecretId, senderId } = opts;
  if (!accessTokenSecretId) return null;
  if (!isUuid(accessTokenSecretId)) {
    // Some setups may store a non-uuid reference; we only support UUID secret ids here.
    console.warn("access_token_secret_id inválido (no es UUID).", { senderId });
    return null;
  }

  const { data: secretRow, error: secretError } = await serviceClient
    .from("meta_account_secrets")
    .select("id, access_token")
    .eq("id", accessTokenSecretId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (secretError) throw new Error(secretError.message);
  if (!secretRow?.id) {
    console.warn("No se encontró el secret de token para Messenger.", { senderId });
    return null;
  }
  const accessToken = cleanOptionalString(secretRow?.access_token);
  if (!accessToken) {
    console.warn("Token de Messenger vacío/no configurado en meta_account_secrets.", { senderId });
    return null;
  }

  const endpoint =
    `https://graph.facebook.com/v25.0/${encodeURIComponent(senderId)}` +
    `?fields=${encodeURIComponent("first_name,last_name,profile_pic")}` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(endpoint, { method: "GET" });
  const rawText = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new Error(metaErrorToMessage(json || rawText));
  }

  const first = cleanOptionalString(json?.first_name) || "";
  const last = cleanOptionalString(json?.last_name) || "";
  const senderName = cleanOptionalString(`${first} ${last}`);
  const profilePic = cleanOptionalString(json?.profile_pic);
  console.info("Perfil de Messenger obtenido.", { senderId, hasName: Boolean(senderName), hasPic: Boolean(profilePic) });
  return { senderName, profilePic };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = cleanOptionalString(url.searchParams.get("hub.mode"));
      const verifyToken = cleanOptionalString(url.searchParams.get("hub.verify_token"));
      const challenge = cleanOptionalString(url.searchParams.get("hub.challenge"));

      if (mode !== "subscribe" || !verifyToken || !challenge) {
        return jsonResponse({ error: "Verificación inválida" }, 400);
      }

      const allowedTokens = new Set(getVerifyTokenCandidates());
      const { data, error } = await serviceClient
        .from("meta_accounts")
        .select("verify_token")
        .eq("platform", "messenger");
      if (error) return jsonResponse({ error: error.message }, 500);
      for (const row of data ?? []) {
        const token = cleanOptionalString((row as any)?.verify_token);
        if (token) allowedTokens.add(token);
      }

      if (!allowedTokens.has(verifyToken)) {
        return jsonResponse({ error: "Token de verificación inválido" }, 403);
      }

      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders },
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const payload = await req.json().catch(() => null);
    if (!isObject(payload)) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const platform = normalizePlatform((payload as any).object) || "messenger";
    const eventType = cleanOptionalString((payload as any).object) || "messenger";
    const logInsert = await serviceClient
      .from("meta_webhook_logs")
      .insert({
        platform,
        event_type: eventType,
        payload,
        processed: false,
      })
      .select("id")
      .maybeSingle();
    if (logInsert.error) return jsonResponse({ error: logInsert.error.message }, 500);

    const webhookLogId = logInsert.data?.id as string | undefined;
    let logCompanyId: string | null = null;
    let logAccountId: string | null = null;
    const errors: string[] = [];
    let processedCount = 0;

    const entries = Array.isArray((payload as any).entry) ? (payload as any).entry : [];
    for (const entry of entries) {
      const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : [];
      for (const event of messagingEvents as MetaMessagingEvent[]) {
        if (event?.message?.is_echo) continue;

        const pageId = cleanOptionalString(event?.recipient?.id);
        const senderId = cleanOptionalString(event?.sender?.id);
        const messageId = cleanOptionalString(event?.message?.mid);
        const text = extractText(event);
        const attachments = extractAttachments(event);
        const timestamp = asIsoTimestamp(event?.timestamp);

        if (!pageId || !senderId) {
          errors.push("Evento Messenger incompleto (falta recipient.id o sender.id)");
          continue;
        }

        const { data: account, error: accountError } = await serviceClient
          .from("meta_accounts")
          .select("id, company_id, platform, page_id, page_name, access_token_secret_id")
          .eq("platform", "messenger")
          .eq("page_id", pageId)
          .maybeSingle();
        if (accountError) {
          errors.push(accountError.message);
          continue;
        }
        if (!account) {
          errors.push(`No existe meta_account para page_id ${pageId}`);
          continue;
        }

        const accountId = account.id as string;
        const companyId = account.company_id as string;
        logCompanyId = logCompanyId || companyId;
        logAccountId = logAccountId || accountId;

        // Best-effort: enrich conversation with sender profile (name/photo). Never fail webhook on this.
        let senderName: string | null = null;
        let senderProfilePic: string | null = null;
        try {
          const secretId = cleanOptionalString((account as any).access_token_secret_id);
          if (!secretId) {
            console.warn("meta_account no tiene access_token_secret_id configurado.", { pageId, senderId });
          }
          const profile = await fetchMessengerSenderProfile({
            serviceClient,
            companyId,
            accessTokenSecretId: secretId,
            senderId,
          });
          senderName = profile?.senderName ?? null;
          senderProfilePic = profile?.profilePic ?? null;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Error desconocido";
          console.warn("No se pudo enriquecer el perfil del remitente de Messenger.", {
            senderId,
            pageId,
            message: msg,
          });
        }

        const conversationSelect = await serviceClient
          .from("meta_conversations")
          .select("id, unread_count, sender_name, sender_profile_pic")
          .eq("company_id", companyId)
          .eq("account_id", accountId)
          .eq("platform", "messenger")
          .eq("external_user_id", senderId)
          .maybeSingle();
        if (conversationSelect.error) {
          errors.push(conversationSelect.error.message);
          continue;
        }

        let conversationId = conversationSelect.data?.id as string | undefined;
        const unreadCount = Number(conversationSelect.data?.unread_count ?? 0);

        if (!conversationId) {
          const conversationInsert = await serviceClient
            .from("meta_conversations")
            .insert({
              company_id: companyId,
              account_id: accountId,
              platform: "messenger",
              page_id: pageId,
              external_user_id: senderId,
              sender_name: senderName,
              sender_profile_pic: senderProfilePic,
              last_message_text: text,
              last_message_at: timestamp,
              unread_count: 1,
              status: "open",
            })
            .select("id")
            .maybeSingle();
          if (conversationInsert.error) {
            errors.push(conversationInsert.error.message);
            continue;
          }
          conversationId = conversationInsert.data?.id as string | undefined;
        } else {
          const nextSenderName =
            senderName && !cleanOptionalString((conversationSelect.data as any)?.sender_name) ? senderName : null;
          const nextSenderPic =
            senderProfilePic && !cleanOptionalString((conversationSelect.data as any)?.sender_profile_pic) ? senderProfilePic : null;

          const { error: conversationUpdateError } = await serviceClient
            .from("meta_conversations")
            .update({
              page_id: pageId,
              ...(nextSenderName ? { sender_name: nextSenderName } : {}),
              ...(nextSenderPic ? { sender_profile_pic: nextSenderPic } : {}),
              last_message_text: text,
              last_message_at: timestamp,
              unread_count: unreadCount + 1,
            })
            .eq("id", conversationId)
            .eq("company_id", companyId);
          if (conversationUpdateError) {
            errors.push(conversationUpdateError.message);
            continue;
          }
        }

        if (!conversationId) {
          errors.push("No se pudo resolver la conversación");
          continue;
        }

        if (messageId) {
          const { data: existingMessage, error: existingMessageError } = await serviceClient
            .from("meta_messages")
            .select("id")
            .eq("company_id", companyId)
            .eq("platform", "messenger")
            .eq("external_message_id", messageId)
            .maybeSingle();
          if (existingMessageError) {
            errors.push(existingMessageError.message);
            continue;
          }
          if (existingMessage?.id) {
            processedCount += 1;
            continue;
          }
        }

        const messageInsert = await serviceClient
          .from("meta_messages")
          .insert({
            company_id: companyId,
            account_id: accountId,
            conversation_id: conversationId,
            platform: "messenger",
            external_message_id: messageId,
            direction: "inbound",
            message_type: text ? "text" : attachments[0]?.type || "attachment",
            text,
            attachments,
            raw_payload: event,
            sent_at: timestamp,
          })
          .select("id")
          .maybeSingle();
        if (messageInsert.error) {
          errors.push(messageInsert.error.message);
          continue;
        }

        processedCount += 1;
      }
    }

    if (webhookLogId) {
      const { error: logUpdateError } = await serviceClient
        .from("meta_webhook_logs")
        .update({
          company_id: logCompanyId,
          account_id: logAccountId,
          processed: errors.length === 0,
          error_message: errors.length ? errors.join(" | ") : null,
        })
        .eq("id", webhookLogId);
      if (logUpdateError) return jsonResponse({ error: logUpdateError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      success: true,
      processed: true,
      processedCount,
      warning: errors.length ? errors.join(" | ") : null,
      todo: "Instagram se conectará en una fase posterior usando la misma base Meta.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
