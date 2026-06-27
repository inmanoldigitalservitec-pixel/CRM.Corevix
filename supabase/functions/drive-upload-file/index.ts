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

function safeName(value: string | null | undefined, fallback: string) {
  const clean = String(value || "").trim();
  return clean || fallback;
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
    // ignore parse error
  }
  if (!res.ok) {
    const message =
      json?.error?.message || json?.error_description || text || "Google Drive request failed";
    throw new Error(`No se pudo subir el archivo a Google Drive. Detalle: ${message}`);
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
    // ignore
  }
  if (!res.ok || !json?.access_token) {
    const message =
      json?.error_description ||
      json?.error ||
      text ||
      "No se pudo refrescar el token de Google Drive.";
    const error = new Error(message);
    (error as any).googleError = json?.error || null;
    (error as any).googleErrorDescription = json?.error_description || null;
    (error as any).googleStatus = res.status;
    throw error;
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
  const q = `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=1`;
  const listed = await driveRequest(args.accessToken, listUrl);
  const found = Array.isArray(listed?.files) ? listed.files[0] : null;
  if (found?.id) return found as { id: string; name: string; webViewLink?: string };

  const metadata: Record<string, unknown> = {
    name: args.name,
    mimeType: "application/vnd.google-apps.folder",
  };
  const parentFolderId = String(args.parentId || "").trim();
  if (parentFolderId) metadata.parents = [parentFolderId];

  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
  );

  const createText = await createRes.text();
  let createJson: any = null;
  try {
    createJson = createText ? JSON.parse(createText) : null;
  } catch {
    // ignore parse errors
  }
  if (!createRes.ok) {
    console.error("create folder failed", {
      status: createRes.status,
      folderName: args.name,
      hasParent: Boolean(parentFolderId),
      detail: createText || null,
    });
    throw new Error(
      `GOOGLE_FOLDER_CREATE_FAILED|${createRes.status}|${createText || createJson?.error?.message || "Unknown error"}`,
    );
  }

  const created = createJson;
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

  const uploaded = await driveRequest(
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

  return uploaded as {
    id: string;
    name: string;
    mimeType?: string;
    webViewLink?: string;
    webContentLink?: string;
    thumbnailLink?: string;
    iconLink?: string;
    size?: string | number;
  };
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
    if (authError || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);
    const authUserId = String(authData.user.id);

    const formData = await req.formData();
    const taskId = String(formData.get("task_id") || "").trim();
    const file = formData.get("file");
    if (!taskId) return jsonResponse({ error: "No se recibió task_id." }, 400);
    if (!(file instanceof File)) return jsonResponse({ error: "No se recibió archivo." }, 400);

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

    const { data: task, error: taskError } = await callerClient
      .from("tasks")
      .select(
        "id,company_id,title,related_project_id,drive_folder_id,drive_folder_url,related_client_id,related_lead_id,related_deal_id",
      )
      .eq("id", taskId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (taskError) return jsonResponse({ error: taskError.message }, 400);
    if (!task?.id) return jsonResponse({ error: "La tarea no existe." }, 404);
    if (String(task.company_id) !== companyId)
      return jsonResponse({ error: "La tarea no pertenece a esta compañía." }, 403);

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

    if (isExpired && !refreshToken) {
      return jsonResponse(
        {
          error: "No se pudo refrescar el token de Google Drive.",
          detail:
            "La conexión de Google Drive no tiene refresh_token guardado. Vuelve a conectar Drive desde Settings.",
        },
        400,
      );
    }

    if (isExpired && refreshToken) {
      const { data: driveSettings, error: driveSettingsError } = await serviceClient
        .from("drive_settings")
        .select("client_id,client_secret_encrypted,redirect_uri")
        .eq("company_id", companyId)
        .maybeSingle();
      if (driveSettingsError) return jsonResponse({ error: driveSettingsError.message }, 400);
      if (!driveSettings?.client_id || !driveSettings?.client_secret_encrypted) {
        return jsonResponse({ error: "Falta configuración de Google Drive." }, 400);
      }

      let refreshed: { access_token: string; expires_in: number };
      try {
        refreshed = await refreshAccessToken({
          clientId: String(driveSettings.client_id),
          clientSecret: String(driveSettings.client_secret_encrypted),
          refreshToken,
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "No se pudo refrescar el token de Google Drive.";
        console.error("drive-upload-file refresh token failed:", {
          detail,
          googleError: (error as any)?.googleError || null,
          googleErrorDescription: (error as any)?.googleErrorDescription || null,
          googleStatus: (error as any)?.googleStatus || null,
          hasRefreshToken: Boolean(refreshToken),
          hasClientSecret: Boolean(driveSettings.client_secret_encrypted),
          hasClientId: Boolean(driveSettings.client_id),
        });
        return jsonResponse(
          { error: "No se pudo refrescar el token de Google Drive.", detail },
          400,
        );
      }
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await serviceClient
        .from("drive_connections")
        .update({
          access_token_encrypted: accessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);
    }

    const taskName = safeName(task.title, "Task");
    let taskFolderId = task.drive_folder_id ? String(task.drive_folder_id) : "";
    let taskFolderUrl = task.drive_folder_url ? String(task.drive_folder_url) : "";

    if (!taskFolderId) {
      let folderParentId: string | null = null;
      if (task.related_project_id) {
        const { data: project } = await callerClient
          .from("projects")
          .select("id,name,drive_folder_id,drive_folder_url")
          .eq("id", String(task.related_project_id))
          .eq("company_id", companyId)
          .maybeSingle();

        if (project?.id) {
          let projectFolderId = project.drive_folder_id ? String(project.drive_folder_id) : "";
          let projectFolderUrl = project.drive_folder_url ? String(project.drive_folder_url) : "";

          if (!projectFolderId) {
            const { data: driveSettings } = await callerClient
              .from("drive_settings")
              .select("root_folder_id")
              .eq("company_id", companyId)
              .maybeSingle();

            const rootFolderId = driveSettings?.root_folder_id
              ? String(driveSettings.root_folder_id)
              : null;
            let corevixFolder: { id: string; name: string; webViewLink?: string };
            let projectsFolder: { id: string; name: string; webViewLink?: string };
            let projectFolder: { id: string; name: string; webViewLink?: string };
            try {
              corevixFolder = await getOrCreateFolder({
                accessToken,
                name: "Corevix CRM",
                parentId: rootFolderId,
              });
              projectsFolder = await getOrCreateFolder({
                accessToken,
                name: "Projects",
                parentId: corevixFolder.id,
              });
              projectFolder = await getOrCreateFolder({
                accessToken,
                name: safeName(project.name, "Project"),
                parentId: projectsFolder.id,
              });
            } catch (folderError) {
              const detail = folderError instanceof Error ? folderError.message : "unknown";
              return jsonResponse(
                { error: "No se pudo crear la carpeta en Google Drive.", detail },
                400,
              );
            }
            projectFolderId = projectFolder.id;
            projectFolderUrl = String(projectFolder.webViewLink || "");
            await serviceClient
              .from("projects")
              .update({
                drive_folder_id: projectFolderId,
                drive_folder_url: projectFolderUrl || null,
              })
              .eq("id", String(project.id))
              .eq("company_id", companyId);
          }
          folderParentId = projectFolderId || null;
        }
      }

      if (!folderParentId) {
        const { data: driveSettings } = await callerClient
          .from("drive_settings")
          .select("root_folder_id")
          .eq("company_id", companyId)
          .maybeSingle();
        const rootFolderId = driveSettings?.root_folder_id
          ? String(driveSettings.root_folder_id)
          : null;
        let corevixFolder: { id: string; name: string; webViewLink?: string };
        let tasksFolder: { id: string; name: string; webViewLink?: string };
        try {
          corevixFolder = await getOrCreateFolder({
            accessToken,
            name: "Corevix CRM",
            parentId: rootFolderId,
          });
          tasksFolder = await getOrCreateFolder({
            accessToken,
            name: "Tasks",
            parentId: corevixFolder.id,
          });
        } catch (folderError) {
          const detail = folderError instanceof Error ? folderError.message : "unknown";
          return jsonResponse(
            { error: "No se pudo crear la carpeta en Google Drive.", detail },
            400,
          );
        }
        folderParentId = tasksFolder.id;
      }

      let createdTaskFolder: { id: string; name: string; webViewLink?: string };
      try {
        createdTaskFolder = await getOrCreateFolder({
          accessToken,
          name: taskName,
          parentId: folderParentId,
        });
      } catch (folderError) {
        const detail = folderError instanceof Error ? folderError.message : "unknown";
        return jsonResponse({ error: "No se pudo crear la carpeta en Google Drive.", detail }, 400);
      }
      taskFolderId = createdTaskFolder.id;
      taskFolderUrl = String(createdTaskFolder.webViewLink || "");
      await serviceClient
        .from("tasks")
        .update({
          drive_folder_id: taskFolderId,
          drive_folder_url: taskFolderUrl || null,
        })
        .eq("id", taskId)
        .eq("company_id", companyId);
    }

    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    let uploaded:
      | {
          id: string;
          name: string;
          mimeType?: string;
          webViewLink?: string;
          webContentLink?: string;
          thumbnailLink?: string;
          iconLink?: string;
          size?: string | number;
        }
      | undefined;
    try {
      uploaded = await uploadFileMultipart({
        accessToken,
        folderId: taskFolderId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes: fileBuffer,
      });
    } catch (uploadError) {
      const detail = uploadError instanceof Error ? uploadError.message : "unknown";
      return jsonResponse({ error: "No se pudo subir el archivo a Google Drive.", detail }, 400);
    }

    const rowPayload = {
      company_id: companyId,
      drive_file_id: String(uploaded!.id),
      name: String(uploaded!.name || file.name),
      mime_type: uploaded!.mimeType ? String(uploaded!.mimeType) : file.type || null,
      web_view_link: uploaded!.webViewLink ? String(uploaded!.webViewLink) : null,
      web_content_link: uploaded!.webContentLink ? String(uploaded!.webContentLink) : null,
      thumbnail_link: uploaded!.thumbnailLink ? String(uploaded!.thumbnailLink) : null,
      icon_link: uploaded!.iconLink ? String(uploaded!.iconLink) : null,
      size_bytes: uploaded!.size != null ? Number(uploaded!.size) : file.size,
      linked_type: "task",
      linked_id: taskId,
      created_by: authUserId,
    };

    const { data: saved, error: saveError } = await serviceClient
      .from("drive_files")
      .insert(rowPayload)
      .select("*")
      .single();
    if (saveError) return jsonResponse({ error: saveError.message }, 400);

    return jsonResponse({ file: saved });
  } catch (error) {
    console.error("drive-upload-file unhandled error:", error);
    const message =
      error instanceof Error ? error.message : "Error interno subiendo archivo a Google Drive";
    return jsonResponse({ error: message }, 500);
  }
});
