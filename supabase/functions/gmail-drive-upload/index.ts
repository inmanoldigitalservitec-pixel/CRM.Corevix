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

function escapeDriveQuery(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function driveRequest(accessToken: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text fallback
  }
  if (!res.ok) {
    const message =
      json?.error?.message || json?.error_description || text || "Google Drive request failed";
    throw new Error(message);
  }
  return json;
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
    // keep raw text fallback
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

async function getOrCreateFolder(args: {
  accessToken: string;
  name: string;
  parentId?: string | null;
}) {
  const escapedName = escapeDriveQuery(args.name);
  const parentClause = args.parentId ? ` and '${escapeDriveQuery(args.parentId)}' in parents` : "";
  const query = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&pageSize=1`;
  const listed = await driveRequest(args.accessToken, listUrl);
  const found = Array.isArray(listed?.files) ? listed.files[0] : null;
  if (found?.id) return found as { id: string; name: string; webViewLink?: string };

  const metadata: Record<string, unknown> = {
    name: args.name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (args.parentId) metadata.parents = [args.parentId];

  const created = await driveRequest(
    args.accessToken,
    "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    },
  );

  return created as { id: string; name: string; webViewLink?: string };
}

async function uploadFileMultipart(args: {
  accessToken: string;
  folderId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  const boundary = `----corevix-${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const metadata = JSON.stringify({
    name: args.fileName,
    parents: [args.folderId],
  });

  const part1 = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
  );
  const part2Header = encoder.encode(`--${boundary}\r\nContent-Type: ${args.mimeType}\r\n\r\n`);
  const part3 = encoder.encode(`\r\n--${boundary}--`);

  const body = new Uint8Array(part1.length + part2Header.length + args.bytes.length + part3.length);
  body.set(part1, 0);
  body.set(part2Header, part1.length);
  body.set(args.bytes, part1.length + part2Header.length);
  body.set(part3, part1.length + part2Header.length + args.bytes.length);

  return driveRequest(
    args.accessToken,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink,iconLink,size",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "No estás autenticado." }, 401);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser(jwt);
    if (authError || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);
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

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return jsonResponse({ error: "No se recibió archivo." }, 400);

    const companyId = String(profile.company_id);
    const { data: connection, error: connError } = await callerClient
      .from("drive_connections")
      .select("id,company_id,user_id,access_token_encrypted,refresh_token_encrypted,expires_at")
      .eq("company_id", companyId)
      .eq("user_id", authUserId)
      .maybeSingle();
    if (connError) return jsonResponse({ error: connError.message }, 400);
    if (!connection?.access_token_encrypted) {
      return jsonResponse(
        { error: "Google Drive no está conectado. Ve a Settings > Google Drive." },
        400,
      );
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
            error: "No se pudo refrescar el token de Google Drive.",
            detail: "Vuelve a conectar Drive desde Settings.",
          },
          400,
        );
      }

      const { data: driveSettings, error: driveSettingsError } = await serviceClient
        .from("drive_settings")
        .select("client_id,client_secret_encrypted,root_folder_id")
        .eq("company_id", companyId)
        .maybeSingle();
      if (driveSettingsError) return jsonResponse({ error: driveSettingsError.message }, 400);
      if (!driveSettings?.client_id || !driveSettings?.client_secret_encrypted) {
        return jsonResponse({ error: "Falta configuración de Google Drive." }, 400);
      }

      const refreshed = await refreshAccessToken({
        clientId: String(driveSettings.client_id),
        clientSecret: String(driveSettings.client_secret_encrypted),
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

    const { data: driveSettings } = await callerClient
      .from("drive_settings")
      .select("root_folder_id")
      .eq("company_id", companyId)
      .maybeSingle();
    const rootFolderId = driveSettings?.root_folder_id
      ? String(driveSettings.root_folder_id)
      : null;

    const today = new Date().toISOString().slice(0, 10);
    const corevixFolder = await getOrCreateFolder({
      accessToken,
      name: "Corevix CRM",
      parentId: rootFolderId,
    });
    const emailFolder = await getOrCreateFolder({
      accessToken,
      name: "Email Attachments",
      parentId: corevixFolder.id,
    });
    const dateFolder = await getOrCreateFolder({
      accessToken,
      name: today,
      parentId: emailFolder.id,
    });

    const uploaded = await uploadFileMultipart({
      accessToken,
      folderId: dateFolder.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes: new Uint8Array(await file.arrayBuffer()),
    });

    return jsonResponse({ file: uploaded });
  } catch (error) {
    console.error("gmail-drive-upload unhandled error:", error);
    const message =
      error instanceof Error ? error.message : "Error interno subiendo archivo a Google Drive";
    return jsonResponse({ error: message }, 500);
  }
});
