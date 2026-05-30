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

function last4(value: string) {
  return value.length <= 4 ? value : value.slice(-4);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
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
    if (!jwt) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON body" }, 400);

    const metaAppId = cleanOptionalString((body as any).metaAppId);
    const phoneNumberId = cleanOptionalString((body as any).phoneNumberId);
    const wabaId = cleanOptionalString((body as any).wabaId);
    const businessPhone = cleanOptionalString((body as any).businessPhone);
    const webhookUrl = cleanOptionalString((body as any).webhookUrl);
    const botApiUrl = cleanOptionalString((body as any).botApiUrl);
    const verifyToken = cleanOptionalString((body as any).verifyToken);
    const metaGraphVersion = cleanOptionalString((body as any).metaGraphVersion);

    const subscribedFieldsRaw = (body as any).subscribedFields;
    const subscribedFields = subscribedFieldsRaw === undefined || subscribedFieldsRaw === null
      ? null
      : isStringArray(subscribedFieldsRaw)
      ? subscribedFieldsRaw
      : null;
    if (subscribedFieldsRaw !== undefined && subscribedFieldsRaw !== null && !subscribedFields) {
      return jsonResponse({ error: "Invalid subscribedFields (must be string[])" }, 400);
    }

    const accessToken = cleanOptionalString((body as any).accessToken);
    const appSecret = cleanOptionalString((body as any).appSecret);

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);

    const [{ data: companyId, error: companyErr }, { data: isMember, error: memberErr }, { data: hasRole, error: roleErr }] =
      await Promise.all([
        callerClient.rpc("get_current_company_id"),
        callerClient.rpc("is_company_member"),
        callerClient.rpc("has_any_role", {
          _user_id: authData.user.id,
          _roles: ["super_admin", "admin", "manager"] as AllowedRole[],
        }),
      ]);

    if (companyErr) return jsonResponse({ error: companyErr.message }, 403);
    if (memberErr) return jsonResponse({ error: memberErr.message }, 403);
    if (roleErr) return jsonResponse({ error: roleErr.message }, 403);
    if (!companyId) return jsonResponse({ error: "No company context (missing profile.company_id)" }, 403);
    if (!isMember) return jsonResponse({ error: "Account is inactive or not a company member" }, 403);
    if (!hasRole) return jsonResponse({ error: "Not authorized (super_admin/admin/manager only)" }, 403);

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const settingsUpsert: Record<string, unknown> = {
      company_id: companyId,
      provider: "meta",
    };
    if (metaAppId) settingsUpsert.meta_app_id = metaAppId;
    if (phoneNumberId) settingsUpsert.phone_number_id = phoneNumberId;
    if (wabaId) settingsUpsert.whatsapp_business_account_id = wabaId;
    if (businessPhone) settingsUpsert.business_phone = businessPhone;
    if (webhookUrl) settingsUpsert.webhook_url = webhookUrl;
    if (botApiUrl) settingsUpsert.bot_api_url = botApiUrl;
    if (verifyToken) settingsUpsert.verify_token = verifyToken;
    if (metaGraphVersion) settingsUpsert.meta_graph_version = metaGraphVersion;
    if (subscribedFields) settingsUpsert.subscribed_fields = subscribedFields;

    const { error: settingsErr } = await serviceClient
      .from("company_whatsapp_settings")
      .upsert(settingsUpsert, { onConflict: "company_id" });
    if (settingsErr) return jsonResponse({ error: settingsErr.message }, 500);

    let secretsUpdated = false;
    const secretsUpsert: Record<string, unknown> = { company_id: companyId };
    if (accessToken) {
      secretsUpdated = true;
      secretsUpsert.access_token = accessToken;
      secretsUpsert.access_token_last4 = last4(accessToken);
      secretsUpsert.access_token_configured_at = new Date().toISOString();
    }
    if (appSecret) {
      secretsUpdated = true;
      secretsUpsert.app_secret = appSecret;
      secretsUpsert.app_secret_last4 = last4(appSecret);
      secretsUpsert.app_secret_configured_at = new Date().toISOString();
    }

    if (secretsUpdated) {
      const { error: secretsErr } = await serviceClient
        .from("company_whatsapp_secrets")
        .upsert(secretsUpsert, { onConflict: "company_id" });
      if (secretsErr) return jsonResponse({ error: secretsErr.message }, 500);
    }

    const [{ data: savedSettings, error: readSettingsErr }, { data: savedSecrets, error: readSecretsErr }] =
      await Promise.all([
        serviceClient
          .from("company_whatsapp_settings")
          .select(
            "company_id, provider, meta_app_id, phone_number_id, whatsapp_business_account_id, business_phone, webhook_url, bot_api_url, verify_token, meta_graph_version, subscribed_fields",
          )
          .eq("company_id", companyId)
          .maybeSingle(),
        serviceClient
          .from("company_whatsapp_secrets")
          .select("access_token_last4, app_secret_last4, access_token_configured_at, app_secret_configured_at")
          .eq("company_id", companyId)
          .maybeSingle(),
      ]);

    if (readSettingsErr) return jsonResponse({ error: readSettingsErr.message }, 500);
    if (readSecretsErr) return jsonResponse({ error: readSecretsErr.message }, 500);

    return jsonResponse({
      ok: true,
      success: true,
      settings: savedSettings
        ? {
          companyId: savedSettings.company_id,
          provider: savedSettings.provider,
          metaAppId: savedSettings.meta_app_id,
          phoneNumberId: savedSettings.phone_number_id,
          wabaId: savedSettings.whatsapp_business_account_id,
          businessPhone: savedSettings.business_phone,
          webhookUrl: savedSettings.webhook_url,
          botApiUrl: savedSettings.bot_api_url,
          verifyToken: savedSettings.verify_token,
          metaGraphVersion: savedSettings.meta_graph_version,
          subscribedFields: savedSettings.subscribed_fields,
        }
        : {
          companyId,
          provider: "meta",
          metaAppId: metaAppId,
          phoneNumberId,
          wabaId,
          businessPhone,
          webhookUrl,
          botApiUrl,
          verifyToken,
          metaGraphVersion,
          subscribedFields,
        },
      secrets: {
        accessTokenConfigured: Boolean(savedSecrets?.access_token_configured_at),
        accessTokenLast4: savedSecrets?.access_token_last4 || null,
        appSecretConfigured: Boolean(savedSecrets?.app_secret_configured_at),
        appSecretLast4: savedSecrets?.app_secret_last4 || null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
