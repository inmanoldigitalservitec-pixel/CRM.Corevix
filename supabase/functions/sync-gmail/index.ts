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
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
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
    // ignore
  }
  if (!res.ok) {
    const msg = json?.error_description || json?.error || text || "Refresh token request failed";
    throw new Error(msg);
  }
  return json as { access_token: string; expires_in?: number; scope?: string; token_type?: string };
}

function getHeader(headers: { name: string; value: string }[], key: string) {
  const h = headers.find((x) => x.name.toLowerCase() === key.toLowerCase());
  return h?.value || null;
}

function extractTextFromPayload(payload: any): {
  bodyText: string | null;
  bodyHtml: string | null;
} {
  // Gmail "full" payload is a MIME tree. We keep v1 simple: prefer text/plain, fallback text/html.
  const stack: any[] = [payload].filter(Boolean);
  let textPlain: string | null = null;
  let textHtml: string | null = null;

  const decodeBase64Url = (data: string) => {
    const base64 = data.replaceAll("-", "+").replaceAll("_", "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    return atob(base64 + "=".repeat(padLen));
  };

  while (stack.length) {
    const node = stack.pop();
    const mimeType = String(node?.mimeType || "");
    const data = node?.body?.data ? String(node.body.data) : null;
    if (data && (mimeType === "text/plain" || mimeType === "text/html")) {
      try {
        const decoded = decodeBase64Url(data);
        if (mimeType === "text/plain" && !textPlain) textPlain = decoded;
        if (mimeType === "text/html" && !textHtml) textHtml = decoded;
      } catch {
        // ignore decode errors
      }
    }
    const parts = Array.isArray(node?.parts) ? node.parts : [];
    parts.forEach((p: any) => stack.push(p));
  }

  return { bodyText: textPlain, bodyHtml: textHtml };
}

Deno.serve(async (req) => {
  try {
    console.log("[sync-gmail] start", { method: req.method, url: req.url });

    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(25, Number(body?.limit ?? 10) || 10));

    // Caller client (RLS applies) + validate JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    console.log("[sync-gmail] auth result", {
      userId: authData?.user?.id ?? null,
      authError: authErr?.message ?? null,
    });
    if (authErr || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);

    const { data: profile, error: profileErr } = await callerClient
      .from("profiles")
      .select("id, company_id, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);
    if (!profile?.id) return jsonResponse({ error: "Profile not found" }, 403);
    if (!profile.company_id)
      return jsonResponse({ error: "No company context (missing profile.company_id)" }, 403);
    if (profile.is_active === false) return jsonResponse({ error: "Account is inactive" }, 403);

    // Service role client for upserts (we enforce company/profile ownership in code)
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    console.log("[sync-gmail] querying connected gmail accounts", {
      authUserId: authData.user.id ?? null,
    });
    const { data: accountsRows, error: accountErr } = await serviceClient
      .from("email_accounts")
      .select(
        "id, company_id, user_id, provider, email_address, is_active, access_token, refresh_token, token_expires_at",
      )
      .eq("provider", "gmail")
      // Some schemas store email_accounts.user_id as profiles.id; others store auth.users.id.
      .in("user_id", [profile.id, authData.user.id])
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    const account = Array.isArray(accountsRows) && accountsRows.length ? accountsRows[0] : null;
    const accounts = account ? [account] : [];
    console.log("[sync-gmail] accounts found", {
      count: accounts.length,
      accounts: accounts.map((a: any) => ({
        id: a.id,
        company_id: a.company_id,
        user_id: a.user_id,
        provider: a.provider,
        email_address: a.email_address,
        status: (a as any).status ?? null,
        is_active: a.is_active,
        last_synced_at: (a as any).last_synced_at ?? null,
        token_expires_at: a.token_expires_at,
        hasAccessToken: !!(a as any).access_token,
        hasRefreshToken: !!(a as any).refresh_token,
      })),
      accountsError: accountErr?.message ?? null,
    });

    if (accountErr) return jsonResponse({ error: accountErr.message }, 400);
    if (!account?.id) return jsonResponse({ error: "No hay una cuenta de Gmail conectada." }, 400);

    const { data: gmailSettings, error: gmailSettingsError } = await serviceClient
      .from("gmail_settings")
      .select("client_id, client_secret_encrypted")
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (gmailSettingsError) return jsonResponse({ error: gmailSettingsError.message }, 400);
    if (!gmailSettings?.client_id || !gmailSettings?.client_secret_encrypted) {
      return jsonResponse({ error: "Falta configurar Gmail API en Settings." }, 400);
    }

    let accountsProcessed = 0;
    let messagesProcessed = 0;
    let messagesInserted = 0;
    let conversationsInserted = 0;

    console.log("[sync-gmail] processing account", {
      accountId: account.id,
      companyId: account.company_id,
      userId: account.user_id,
      emailAddress: account.email_address,
      lastSyncedAt: (account as any).last_synced_at ?? null,
    });
    accountsProcessed += 1;

    let accessToken = String((account as any).access_token || "");
    const refreshToken = (account as any).refresh_token
      ? String((account as any).refresh_token)
      : null;
    const tokenExpiresAt = account.token_expires_at
      ? new Date(String(account.token_expires_at))
      : null;

    const isExpired = tokenExpiresAt ? tokenExpiresAt.getTime() <= Date.now() + 30_000 : false;
    if ((!accessToken || isExpired) && refreshToken) {
      const refreshed = await refreshAccessToken({
        refreshToken,
        clientId: String(gmailSettings.client_id),
        clientSecret: String(gmailSettings.client_secret_encrypted),
      });
      accessToken = refreshed.access_token;
      const newExpiresAt = refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null;
      await serviceClient
        .from("email_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: newExpiresAt,
          scopes: refreshed.scope
            ? String(refreshed.scope).split(/\s+/).filter(Boolean)
            : undefined,
        })
        .eq("id", account.id);
    }

    if (!accessToken) return jsonResponse({ error: "Conecta Gmail antes de sincronizar." }, 400);

    // Fetch last N message IDs
    const query = "";
    const maxResults = limit;
    console.log("[sync-gmail] gmail query", { accountId: account.id, query, maxResults });

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const listJson = await listRes.json().catch(() => null);
    console.log("[sync-gmail] gmail list response", {
      accountId: account.id,
      ok: listRes.ok,
      status: listRes.status,
      messageCount: listJson?.messages?.length ?? 0,
      resultSizeEstimate: listJson?.resultSizeEstimate ?? null,
      error: listJson?.error ?? null,
      errorDescription: listJson?.error_description ?? null,
    });
    if (!listRes.ok) {
      const msg = listJson?.error?.message || "Failed to list Gmail messages";
      return jsonResponse({ error: msg }, 400);
    }
    const messageRefs: Array<{ id: string; threadId?: string | null }> = Array.isArray(
      listJson?.messages,
    )
      ? listJson.messages.map((m: any) => ({
          id: String(m.id),
          threadId: m.threadId ? String(m.threadId) : null,
        }))
      : [];
    if (messageRefs.length === 0) {
      console.warn("[sync-gmail] no gmail messages returned", {
        accountId: account.id,
        emailAddress: account.email_address,
        query,
      });
      console.warn("[sync-gmail] no messages; updating last_synced_at anyway");
      await serviceClient
        .from("email_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id);
      console.log("[sync-gmail] finished", {
        accountsProcessed,
        messagesProcessed,
        messagesInserted,
        conversationsInserted,
      });
      return jsonResponse({ ok: true, synced: 0, conversations: 0 });
    }

    const fetched = await Promise.all(
      messageRefs.map(async (mref) => {
        console.log("[sync-gmail] fetching message detail", {
          accountId: account.id,
          gmailMessageId: mref.id,
          threadId: mref.threadId ?? null,
        });
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(mref.id)}?format=full`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok)
          return { ok: false, error: json?.error?.message || "Fetch failed", id: mref.id };
        return { ok: true, json };
      }),
    );

    const okMessages = fetched.filter((x: any) => x.ok).map((x: any) => x.json);

    // Upsert conversations/messages
    let conversationCount = 0;
    let messageCount = 0;
    let conversationErrors = 0;
    let messageErrors = 0;

    for (const msg of okMessages) {
      const threadId = String(msg.threadId || "");
      const messageId = String(msg.id || "");
      if (!threadId || !messageId) continue;

      messagesProcessed += 1;

      const headers = Array.isArray(msg?.payload?.headers) ? msg.payload.headers : [];
      const subject = getHeader(headers, "Subject") || "(No Subject)";
      const fromEmail = getHeader(headers, "From") || "";
      const toEmail = getHeader(headers, "To") || "";
      const internalDateMs = msg.internalDate ? Number(msg.internalDate) : NaN;
      const createdAt = Number.isFinite(internalDateMs)
        ? new Date(internalDateMs).toISOString()
        : new Date().toISOString();
      const sentAt = createdAt;
      const snippet = msg.snippet ? String(msg.snippet) : null;
      const labelIds: string[] = Array.isArray(msg.labelIds)
        ? msg.labelIds.map((x: any) => String(x))
        : [];
      const isRead = !labelIds.includes("UNREAD");

      const { bodyText, bodyHtml } = extractTextFromPayload(msg.payload);

      console.log("[sync-gmail] gmail message detail parsed", {
        gmailMessageId: messageId,
        providerThreadId: threadId,
        subject,
        fromEmail,
        toEmail,
        sentAt: createdAt,
        hasSnippet: !!snippet,
        hasBodyText: !!bodyText,
        hasBodyHtml: !!bodyHtml,
        labelIds,
      });

      // 1) Upsert conversation (thread)
      console.log("[sync-gmail] upsert conversation attempt", {
        accountId: account.id,
        companyId: account.company_id,
        userId: account.user_id,
        providerThreadId: threadId,
        subject,
      });
      const { data: convo, error: convoErr } = await serviceClient
        .from("email_conversations")
        .upsert(
          {
            company_id: profile.company_id,
            email_account_id: account.id,
            provider: "gmail",
            provider_thread_id: threadId,
            subject,
            status: "open",
            last_message_at: createdAt,
            snippet,
          },
          { onConflict: "email_account_id,provider_thread_id" },
        )
        .select("id")
        .single();

      console.log("[sync-gmail] upsert conversation result", {
        conversationId: convo?.id ?? null,
        error: convoErr?.message ?? null,
      });
      if (convoErr || !convo?.id) {
        conversationErrors += 1;
        console.error("[sync-gmail] conversation upsert failed", {
          accountId: account.id,
          providerThreadId: threadId,
          error: convoErr?.message ?? "Unknown conversation upsert error",
        });
        continue;
      }
      conversationCount += 1;
      conversationsInserted += 1;

      // 2) Upsert message
      console.log("[sync-gmail] upsert message attempt", {
        accountId: account.id,
        companyId: account.company_id,
        userId: account.user_id,
        conversationId: convo?.id ?? null,
        providerMessageId: messageId,
        providerThreadId: threadId,
        subject,
      });
      const { data: emailMessage, error: msgErr } = await serviceClient
        .from("email_messages")
        .upsert(
          {
            company_id: account.company_id,
            conversation_id: convo.id,
            direction: "inbound",
            sender: fromEmail,
            recipient: toEmail,
            body: bodyText || snippet || "",
            provider: "gmail",
            subject,
            from_email: fromEmail,
            to_email: toEmail,
            cc: [],
            bcc: [],
            sent_at: sentAt,
            is_read: isRead,
            body_html: bodyHtml,
            raw: msg,
            provider_message_id: messageId,
            provider_thread_id: threadId,
            snippet,
            label_ids: labelIds,
            email_account_id: account.id,
            user_id: account.user_id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email_account_id,provider_message_id" },
        )
        .select("id")
        .single();

      console.log("[sync-gmail] upsert message result", {
        messageId: emailMessage?.id ?? null,
        error: msgErr?.message ?? null,
      });
      if (msgErr) {
        messageErrors += 1;
        console.error("[sync-gmail] message upsert failed", {
          accountId: account.id,
          providerMessageId: messageId,
          providerThreadId: threadId,
          error: msgErr.message,
        });
        continue;
      }
      messageCount += 1;
      messagesInserted += 1;
    }

    if (messagesProcessed > 0 && messagesInserted === 0) {
      console.warn(
        "[sync-gmail] processed messages but inserted none; not updating last_synced_at as success",
        {
          accountId: account.id,
          messagesProcessed,
          messagesInserted,
          conversationsInserted,
          conversationErrors,
          messageErrors,
        },
      );
    } else {
      console.log("[sync-gmail] updating last_synced_at", {
        accountId: account.id,
        messagesProcessed,
        messagesInserted,
        conversationsInserted,
        conversationErrors,
        messageErrors,
      });
      await serviceClient
        .from("email_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id);
    }

    console.log("[sync-gmail] finished", {
      accountsProcessed,
      messagesProcessed,
      messagesInserted,
      conversationsInserted,
    });
    return jsonResponse({
      ok: true,
      synced: messageCount,
      conversations: conversationCount,
      conversation_errors: conversationErrors,
      message_errors: messageErrors,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("[sync-gmail] failed", {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : null,
    });
    return jsonResponse({ error: message }, 500);
  }
});
