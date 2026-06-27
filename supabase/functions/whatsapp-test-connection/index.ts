/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type AllowedRole = "super_admin" | "admin" | "manager";

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

function cleanOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function metaErrorToMessage(errJson: any): string {
  const message = errJson?.error?.message || errJson?.message || "Meta Graph API error";
  const type = errJson?.error?.type || null;
  const code = errJson?.error?.code ?? null;
  const subcode = errJson?.error?.error_subcode ?? null;
  const parts = [message];
  const metaBits: string[] = [];
  if (type) metaBits.push(String(type));
  if (code !== null) metaBits.push(`code:${code}`);
  if (subcode !== null) metaBits.push(`subcode:${subcode}`);
  if (metaBits.length) parts.push(`(${metaBits.join(", ")})`);
  return parts.join(" ");
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
    if (!jwt)
      return jsonResponse(
        {
          ok: false,
          success: false,
          connected: false,
          error: "Missing Authorization bearer token",
        },
        401,
      );

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) {
      return jsonResponse(
        { ok: false, success: false, connected: false, error: "Invalid session" },
        401,
      );
    }

    const [
      { data: companyId, error: companyErr },
      { data: isMember, error: memberErr },
      { data: hasRole, error: roleErr },
    ] = await Promise.all([
      callerClient.rpc("get_current_company_id"),
      callerClient.rpc("is_company_member"),
      callerClient.rpc("has_any_role", {
        _user_id: authData.user.id,
        _roles: ["super_admin", "admin", "manager"] as AllowedRole[],
      }),
    ]);

    if (companyErr)
      return jsonResponse(
        { ok: false, success: false, connected: false, error: companyErr.message },
        403,
      );
    if (memberErr)
      return jsonResponse(
        { ok: false, success: false, connected: false, error: memberErr.message },
        403,
      );
    if (roleErr)
      return jsonResponse(
        { ok: false, success: false, connected: false, error: roleErr.message },
        403,
      );
    if (!companyId)
      return jsonResponse(
        {
          ok: false,
          success: false,
          connected: false,
          error: "No company context (missing profile.company_id)",
        },
        403,
      );
    if (!isMember)
      return jsonResponse(
        {
          ok: false,
          success: false,
          connected: false,
          error: "Account is inactive or not a company member",
        },
        403,
      );
    if (!hasRole)
      return jsonResponse(
        {
          ok: false,
          success: false,
          connected: false,
          error: "Not authorized (super_admin/admin/manager only)",
        },
        403,
      );

    // Read settings with caller client (RLS applies)
    const { data: settings, error: settingsErr } = await callerClient
      .from("company_whatsapp_settings")
      .select("phone_number_id, meta_graph_version, whatsapp_business_account_id, business_phone")
      .eq("company_id", companyId)
      .maybeSingle();
    if (settingsErr)
      return jsonResponse(
        { ok: false, success: false, connected: false, error: settingsErr.message },
        400,
      );

    const phoneNumberId = cleanOptionalString((settings as any)?.phone_number_id);
    const metaGraphVersion = cleanOptionalString((settings as any)?.meta_graph_version) || "v22.0";

    if (!phoneNumberId) {
      return jsonResponse(
        { ok: false, success: false, connected: false, error: "Falta configurar Phone Number ID" },
        400,
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: secrets, error: secretsErr } = await serviceClient
      .from("company_whatsapp_secrets")
      .select("access_token")
      .eq("company_id", companyId)
      .maybeSingle();
    if (secretsErr)
      return jsonResponse(
        { ok: false, success: false, connected: false, error: "No se pudieron leer credenciales" },
        500,
      );

    const accessToken = cleanOptionalString((secrets as any)?.access_token);
    if (!accessToken) {
      return jsonResponse(
        {
          ok: false,
          success: false,
          connected: false,
          error: "Falta configurar Permanent Access Token",
        },
        400,
      );
    }

    const url = `https://graph.facebook.com/${encodeURIComponent(metaGraphVersion)}/${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating`;
    const metaRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const metaText = await metaRes.text();
    let metaJson: any = null;
    try {
      metaJson = JSON.parse(metaText);
    } catch {
      // ignore
    }

    const nowIso = new Date().toISOString();

    if (!metaRes.ok) {
      const message = metaErrorToMessage(metaJson || metaText);
      await serviceClient
        .from("company_whatsapp_settings")
        .update({
          is_connected: false,
          connection_status: "error",
          last_verified_at: nowIso,
          last_error: message,
        })
        .eq("company_id", companyId);

      return jsonResponse(
        { ok: false, success: false, connected: false, error: message },
        metaRes.status >= 400 && metaRes.status < 500 ? 400 : 502,
      );
    }

    const displayPhoneNumber = cleanOptionalString(metaJson?.display_phone_number);
    const verifiedName = cleanOptionalString(metaJson?.verified_name);
    const qualityRating = cleanOptionalString(metaJson?.quality_rating);

    await serviceClient
      .from("company_whatsapp_settings")
      .update({
        is_connected: true,
        connection_status: "connected",
        last_verified_at: nowIso,
        last_error: null,
        ...(displayPhoneNumber ? { business_phone: displayPhoneNumber } : {}),
      })
      .eq("company_id", companyId);

    return jsonResponse({
      ok: true,
      success: true,
      connected: true,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      qualityRating,
      message: "Conexión verificada correctamente",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ ok: false, success: false, connected: false, error: message }, 500);
  }
});
