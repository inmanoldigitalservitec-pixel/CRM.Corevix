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

function base64Url(bytes: Uint8Array) {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = getEnv("SITE_URL").replace(/\/$/, "");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const body = await req.json().catch(() => ({}));
    const redirectTo = body?.redirectTo ? String(body.redirectTo) : `${siteUrl}/settings`;

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
      .select("id, company_id, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profileError) return jsonResponse({ error: profileError.message }, 400);
    if (!profile?.id || !profile?.company_id) return jsonResponse({ error: "No company/profile context" }, 403);
    if (profile.is_active === false) return jsonResponse({ error: "Account inactive" }, 403);

    const { data: settings, error: settingsError } = await callerClient
      .from("drive_settings")
      .select("client_id,redirect_uri,scopes,is_enabled")
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (settingsError) return jsonResponse({ error: settingsError.message }, 400);
    if (!settings?.client_id) return jsonResponse({ error: "Missing Google Drive Client ID in settings" }, 400);
    if (!settings?.redirect_uri) return jsonResponse({ error: "Missing Google Drive Redirect URI in settings" }, 400);
    if (settings?.is_enabled === false) return jsonResponse({ error: "Google Drive integration is disabled" }, 400);

    const scope = String(settings.scopes || "https://www.googleapis.com/auth/drive.file").trim();
    const stateRaw = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const stateHash = await sha256Hex(stateRaw);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: stateError } = await serviceClient.from("oauth_states").insert({
      provider: "google_drive",
      state_hash: stateHash,
      company_id: profile.company_id,
      profile_id: profile.id,
      user_auth_id: authData.user.id,
      redirect_to: redirectTo,
      expires_at: expiresAt,
    });
    if (stateError) return jsonResponse({ error: stateError.message }, 400);

    const params = new URLSearchParams({
      client_id: String(settings.client_id),
      redirect_uri: String(settings.redirect_uri),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope,
      state: stateRaw,
    });

    return jsonResponse({
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});

