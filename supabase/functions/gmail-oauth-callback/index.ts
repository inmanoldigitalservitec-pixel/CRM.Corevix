/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

function getEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

function safeRedirectUrl(
  base: string | null,
  fallback: string | null,
  gmail: "connected" | "error",
  reason?: string,
) {
  const baseStr = (base && String(base).trim()) || (fallback && String(fallback).trim()) || "";
  if (!baseStr) return null;
  try {
    const u = new URL(baseStr);
    u.searchParams.set("gmail", gmail);
    if (reason) u.searchParams.set("reason", reason);
    return u.toString();
  } catch {
    // If baseStr is a relative path, anchor it to fallback if available.
    if (fallback) {
      try {
        const u = new URL(baseStr, fallback);
        u.searchParams.set("gmail", gmail);
        if (reason) u.searchParams.set("reason", reason);
        return u.toString();
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function exchangeCodeForTokens(args: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    code: args.code,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
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
    const msg = json?.error_description || json?.error || text || "Token exchange failed";
    throw new Error(msg);
  }
  return json as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };
}

async function fetchGmailProfile(accessToken: string) {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = json?.error?.message || text || "Failed to fetch Gmail profile";
    throw new Error(msg);
  }
  return json as { emailAddress?: string };
}

Deno.serve(async (req) => {
  const siteUrl = Deno.env.get("SITE_URL") || "";
  const cleanSiteUrl = siteUrl ? siteUrl.replace(/\/$/, "") : "";
  const defaultErrorRedirect = cleanSiteUrl ? `${cleanSiteUrl}/settings?gmail=error` : null;

  try {
    console.log("[gmail-oauth-callback] start", { method: req.method, url: req.url });

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const googleError = url.searchParams.get("error");
    const googleErrorDescription = url.searchParams.get("error_description");

    console.log("[gmail-oauth-callback] query", {
      hasCode: !!code,
      hasState: !!stateRaw,
      googleError: googleError || null,
      googleErrorDescription: googleErrorDescription || null,
    });

    if (!code || !stateRaw) {
      console.error("[gmail-oauth-callback] missing code/state", {
        hasCode: !!code,
        hasState: !!stateRaw,
        googleError,
        googleErrorDescription,
      });
      const r = safeRedirectUrl(null, defaultErrorRedirect, "error", "missing_code_or_state");
      return r ? redirect(r) : new Response("Missing code/state", { status: 400 });
    }

    const stateHash = await sha256Hex(stateRaw);
    console.log("[gmail-oauth-callback] stateHash", { stateHash });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const nowIso = new Date().toISOString();
    const { data: stateRow, error: stateErr } = await serviceClient
      .from("oauth_states")
      .select("id, company_id, profile_id, user_auth_id, redirect_to, expires_at")
      .eq("provider", "gmail")
      .eq("state_hash", stateHash)
      .gte("expires_at", nowIso)
      .maybeSingle();

    console.log("[gmail-oauth-callback] oauth_state lookup", {
      found: !!stateRow?.id,
      oauthStateError: stateErr?.message || null,
      company_id: stateRow?.company_id || null,
      profile_id: stateRow?.profile_id || null,
      user_auth_id: stateRow?.user_auth_id || null,
      expires_at: stateRow?.expires_at || null,
      now: nowIso,
    });

    const stateRedirectBase = stateRow?.redirect_to
      ? String(stateRow.redirect_to)
      : cleanSiteUrl
        ? `${cleanSiteUrl}/settings`
        : null;
    const errorRedirect =
      safeRedirectUrl(stateRedirectBase, cleanSiteUrl || null, "error") || defaultErrorRedirect;

    if (!stateRow?.id)
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response("Invalid/expired state", { status: 400 });

    const { data: gmailSettings, error: gmailSettingsErr } = await serviceClient
      .from("gmail_settings")
      .select("client_id,client_secret_encrypted,redirect_uri")
      .eq("company_id", stateRow.company_id)
      .maybeSingle();
    if (gmailSettingsErr) {
      console.error("[gmail-oauth-callback] gmail_settings lookup error", {
        error: gmailSettingsErr.message,
      });
      const r = safeRedirectUrl(
        stateRedirectBase,
        cleanSiteUrl || null,
        "error",
        "missing_settings",
      );
      return r
        ? redirect(r)
        : new Response("Falta configurar Gmail API en Settings.", { status: 400 });
    }
    if (
      !gmailSettings?.client_id ||
      !gmailSettings?.client_secret_encrypted ||
      !gmailSettings?.redirect_uri
    ) {
      const r = safeRedirectUrl(
        stateRedirectBase,
        cleanSiteUrl || null,
        "error",
        "missing_settings",
      );
      return r
        ? redirect(r)
        : new Response("Falta configurar Gmail API en Settings.", { status: 400 });
    }

    let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
    try {
      tokens = await exchangeCodeForTokens({
        code,
        clientId: String(gmailSettings.client_id),
        clientSecret: String(gmailSettings.client_secret_encrypted),
        redirectUri: String(gmailSettings.redirect_uri),
      });
    } catch (e: any) {
      console.error("[gmail-oauth-callback] token exchange failed", {
        message: e?.message || "unknown",
      });
      const r = safeRedirectUrl(
        stateRedirectBase,
        cleanSiteUrl || null,
        "error",
        "token_exchange_failed",
      );
      return r ? redirect(r) : new Response("Token exchange failed", { status: 400 });
    }
    console.log("[gmail-oauth-callback] token exchange ok");
    console.log("[gmail-oauth-callback] token exchange result", {
      hasAccessToken: !!tokens?.access_token,
      hasRefreshToken: !!tokens?.refresh_token,
      expiresIn: tokens?.expires_in ?? null,
      tokenType: tokens?.token_type ?? null,
      scope: tokens?.scope ?? null,
    });
    if (!tokens.access_token) {
      const r = safeRedirectUrl(
        stateRedirectBase,
        cleanSiteUrl || null,
        "error",
        "missing_access_token",
      );
      return r ? redirect(r) : new Response("Token exchange failed", { status: 400 });
    }

    let email = "";
    let displayName: string | null = null;
    try {
      const gmailProfile = await fetchGmailProfile(tokens.access_token);
      email = String(gmailProfile?.emailAddress || "")
        .trim()
        .toLowerCase();
      console.log("[gmail-oauth-callback] gmail profile ok", { email });
    } catch (e: any) {
      console.error("[gmail-oauth-callback] gmail profile failed", {
        detail: e?.message || "unknown",
      });
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;
    const scopes = tokens.scope ? String(tokens.scope).split(/\s+/).filter(Boolean) : [];

    const uid = stateRow.user_auth_id ? String(stateRow.user_auth_id) : "";
    if (!uid)
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response("Missing oauth state user_auth_id", { status: 400 });

    const fallbackEmail = `gmail-connected-${uid.slice(0, 8)}`;
    const finalEmail = email && email.includes("@") ? email : fallbackEmail;
    const { data: existingAccount } = await serviceClient
      .from("email_accounts")
      .select("id, refresh_token")
      .eq("company_id", stateRow.company_id)
      .eq("provider", "gmail")
      .eq("user_id", uid)
      .eq("email_address", finalEmail)
      .maybeSingle();

    const basePayload: Record<string, unknown> = {
      company_id: stateRow.company_id,
      provider: "gmail",
      email: finalEmail,
      email_address: finalEmail,
      display_name: displayName,
      status: "connected",
      is_active: true,
      settings: {},
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
      scopes,
    };
    if (tokens.refresh_token) basePayload.refresh_token = tokens.refresh_token;
    else if (existingAccount?.refresh_token)
      basePayload.refresh_token = existingAccount.refresh_token;

    // Use auth user id for email_accounts.user_id in this schema.
    let upsertErr: any = null;

    {
      console.log("[gmail-oauth-callback] upsert email_accounts attempt", {
        company_id: stateRow.company_id,
        user_id: uid,
        provider: "gmail",
        email_address: finalEmail,
      });
      const r = await serviceClient
        .from("email_accounts")
        .upsert({ ...basePayload, user_id: uid }, { onConflict: "user_id,provider,email_address" })
        .select("id, user_id, company_id, provider, email_address, status")
        .maybeSingle();
      console.log("[gmail-oauth-callback] upsert result", {
        user_id: uid,
        emailAccountCreated: r.data
          ? {
              id: r.data.id,
              user_id: r.data.user_id,
              company_id: r.data.company_id,
              provider: r.data.provider,
              email_address: r.data.email_address,
              status: (r.data as any).status,
            }
          : null,
        emailAccountError: r.error?.message || null,
      });
      upsertErr = r.error;
    }

    // Best-effort cleanup of used state
    const { error: cleanupErr } = await serviceClient
      .from("oauth_states")
      .delete()
      .eq("id", stateRow.id);
    if (cleanupErr)
      console.error("[gmail-oauth-callback] oauth_state cleanup failed", {
        error: cleanupErr.message,
      });

    if (upsertErr) {
      console.error("[gmail-oauth-callback] upsert failed", {
        error: String(upsertErr.message || upsertErr),
      });
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response(`Upsert failed: ${String(upsertErr.message || upsertErr)}`, { status: 400 });
    }

    const okRedirect = safeRedirectUrl(stateRedirectBase, cleanSiteUrl || null, "connected");
    return okRedirect
      ? redirect(okRedirect)
      : new Response("Connected (no redirect url)", { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.error("[gmail-oauth-callback] fatal error", { message });
    const r = safeRedirectUrl(null, defaultErrorRedirect, "error");
    if (r) return redirect(r);
    return new Response(message, { status: 500 });
  }
});
