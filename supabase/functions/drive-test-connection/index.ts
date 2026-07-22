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

async function refreshAccessToken(args: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
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
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok || !json?.access_token) {
    const message =
      json?.error_description ||
      json?.error ||
      text ||
      "No se pudo refrescar el token de Google Drive.";
    throw new Error(message);
  }
  return {
    access_token: String(json.access_token),
    expires_in: Number(json.expires_in || 3600),
  };
}

async function testDriveApi(accessToken: string) {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id,name)",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message =
      json?.error?.message || json?.error_description || text || "Google Drive API no respondió.";
    throw new Error(message);
  }
  return Array.isArray(json?.files) ? json.files.length : 0;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "No estás autenticado." }, 401);

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser(jwt);
    if (authError || !authData?.user) return jsonResponse({ error: "Sesión inválida." }, 401);
    const authUserId = String(authData.user.id);

    const { data: profile, error: profileError } = await callerClient
      .from("profiles")
      .select("id,company_id,is_active")
      .eq("user_id", authUserId)
      .maybeSingle();
    if (profileError) return jsonResponse({ error: profileError.message }, 400);
    if (!profile?.company_id)
      return jsonResponse({ error: "No se encontró la compañía del usuario." }, 403);
    if (profile.is_active === false) return jsonResponse({ error: "Cuenta inactiva." }, 403);
    const companyId = String(profile.company_id);

    const { data: connection, error: connectionError } = await serviceClient
      .from("drive_connections")
      .select("id,access_token_encrypted,refresh_token_encrypted,expires_at,scope,google_email")
      .eq("company_id", companyId)
      .eq("user_id", authUserId)
      .maybeSingle();
    if (connectionError) return jsonResponse({ error: connectionError.message }, 400);
    if (!connection?.access_token_encrypted) {
      return jsonResponse({ error: "No hay conexión activa de Google Drive." }, 400);
    }

    let accessToken = String(connection.access_token_encrypted || "");
    const refreshToken = connection.refresh_token_encrypted
      ? String(connection.refresh_token_encrypted)
      : "";
    const expiresAt = connection.expires_at
      ? new Date(String(connection.expires_at)).getTime()
      : null;
    const isExpired = !!expiresAt && expiresAt - Date.now() < 60_000;

    if (isExpired) {
      if (!refreshToken) {
        return jsonResponse(
          {
            error:
              "La conexión de Google Drive no tiene refresh token. Vuelve a conectar Google Drive.",
          },
          400,
        );
      }

      const { data: settings, error: settingsError } = await serviceClient
        .from("drive_settings")
        .select("client_id,client_secret_encrypted")
        .eq("company_id", companyId)
        .maybeSingle();
      if (settingsError) return jsonResponse({ error: settingsError.message }, 400);
      if (!settings?.client_id || !settings?.client_secret_encrypted) {
        return jsonResponse({ error: "Falta configuración de Google Drive." }, 400);
      }

      const refreshed = await refreshAccessToken({
        clientId: String(settings.client_id),
        clientSecret: String(settings.client_secret_encrypted),
        refreshToken,
      });
      accessToken = refreshed.access_token;
      await serviceClient
        .from("drive_connections")
        .update({
          access_token_encrypted: accessToken,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    const visibleFiles = await testDriveApi(accessToken);

    return jsonResponse({
      connected: true,
      connection_id: connection.id,
      google_email: connection.google_email || null,
      scope: connection.scope || null,
      visible_files: visibleFiles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo probar Google Drive.";
    return jsonResponse({ error: message }, 400);
  }
});
