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
    const siteUrl = getEnv("SITE_URL");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "No estás autenticado." }, 401);

    const body = await req.json().catch(() => ({}));
    const redirectTo = body?.redirectTo ? String(body.redirectTo) : `${siteUrl.replace(/\/$/, "")}/settings`;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) return jsonResponse({ error: "Sesión inválida." }, 401);

    const { data: profile, error: profileErr } = await callerClient
      .from("profiles")
      .select("id, company_id, is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);
    if (!profile?.id || !profile?.company_id) return jsonResponse({ error: "No se encontró la compañía del usuario." }, 403);
    if (profile.is_active === false) return jsonResponse({ error: "Tu usuario está inactivo." }, 403);

    const { data: settings, error: settingsError } = await serviceClient
      .from("gmail_settings")
      .select("client_id,redirect_uri,scopes,is_enabled")
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (settingsError) return jsonResponse({ error: settingsError.message }, 400);
    if (!settings?.is_enabled || !settings?.client_id || !settings?.redirect_uri) {
      return jsonResponse({ error: "Falta configurar Gmail API en Settings." }, 400);
    }

    const stateRaw = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const stateHash = await sha256Hex(stateRaw);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: stateErr } = await serviceClient.from("oauth_states").insert({
      provider: "gmail",
      state_hash: stateHash,
      company_id: profile.company_id,
      profile_id: profile.id,
      user_auth_id: authData.user.id,
      redirect_to: redirectTo,
      expires_at: expiresAt,
    });
    if (stateErr) return jsonResponse({ error: stateErr.message }, 400);

    const scope =
      String(settings.scopes || "").trim() ||
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify";

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
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
