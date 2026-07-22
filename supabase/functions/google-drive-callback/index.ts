/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
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
  status: "connected" | "error",
) {
  const baseStr = (base && String(base).trim()) || (fallback && String(fallback).trim()) || "";
  if (!baseStr) return null;
  try {
    const url = new URL(baseStr);
    url.searchParams.set("drive", status);
    return url.toString();
  } catch {
    if (fallback) {
      try {
        const url = new URL(baseStr, fallback);
        url.searchParams.set("drive", status);
        return url.toString();
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
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

async function fetchGoogleUserEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  if (!res.ok) return null;
  const email = String(json?.email || "")
    .trim()
    .toLowerCase();
  return email || null;
}

Deno.serve(async (req) => {
  const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const defaultErrorRedirect = siteUrl ? `${siteUrl}/settings?drive=error` : null;

  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");

    if (!code || !stateRaw) {
      const dest = safeRedirectUrl(null, defaultErrorRedirect, "error");
      return dest ? redirect(dest) : new Response("Missing code/state", { status: 400 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const stateHash = await sha256Hex(stateRaw);
    const nowIso = new Date().toISOString();
    const { data: oauthState } = await serviceClient
      .from("oauth_states")
      .select("id,company_id,user_auth_id,redirect_to,expires_at")
      .eq("provider", "google_drive")
      .eq("state_hash", stateHash)
      .gte("expires_at", nowIso)
      .maybeSingle();

    const redirectBase = oauthState?.redirect_to
      ? String(oauthState.redirect_to)
      : siteUrl
        ? `${siteUrl}/settings`
        : null;
    const errorRedirect = safeRedirectUrl(redirectBase, defaultErrorRedirect, "error");

    if (!oauthState?.id || !oauthState.company_id || !oauthState.user_auth_id) {
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response("Invalid/expired state", { status: 400 });
    }

    const { data: settings, error: settingsError } = await serviceClient
      .from("drive_settings")
      .select("client_id,client_secret_encrypted,redirect_uri,scopes")
      .eq("company_id", oauthState.company_id)
      .maybeSingle();
    if (
      settingsError ||
      !settings?.client_id ||
      !settings?.client_secret_encrypted ||
      !settings?.redirect_uri
    ) {
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response("Missing Drive settings", { status: 400 });
    }

    const tokens = await exchangeCodeForTokens({
      code,
      clientId: String(settings.client_id),
      clientSecret: String(settings.client_secret_encrypted),
      redirectUri: String(settings.redirect_uri),
    });
    if (!tokens.access_token) {
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response("Token exchange failed", { status: 400 });
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;
    const googleEmail = await fetchGoogleUserEmail(tokens.access_token);
    const requestedDriveScope = String(
      settings.scopes || "https://www.googleapis.com/auth/drive.file",
    )
      .split(/\s+/)
      .filter((scope) => scope.includes("/auth/drive"))
      .join(" ")
      .trim();
    const effectiveScope = requestedDriveScope || "https://www.googleapis.com/auth/drive.file";

    const upsertPayload: Record<string, unknown> = {
      company_id: oauthState.company_id,
      user_id: oauthState.user_auth_id,
      google_email: googleEmail,
      access_token_encrypted: tokens.access_token,
      expires_at: expiresAt,
      scope: effectiveScope,
    };
    if (tokens.refresh_token) upsertPayload.refresh_token_encrypted = tokens.refresh_token;

    const { error: upsertError } = await serviceClient
      .from("drive_connections")
      .upsert(upsertPayload, { onConflict: "company_id,user_id" });

    await serviceClient.from("oauth_states").delete().eq("id", oauthState.id);

    if (upsertError) {
      return errorRedirect
        ? redirect(errorRedirect)
        : new Response(upsertError.message || "Upsert failed", { status: 400 });
    }

    const successRedirect = safeRedirectUrl(redirectBase, siteUrl || null, "connected");
    return successRedirect ? redirect(successRedirect) : new Response("Connected", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const fallback = safeRedirectUrl(null, defaultErrorRedirect, "error");
    if (fallback) return redirect(fallback);
    return new Response(message, { status: 500 });
  }
});
