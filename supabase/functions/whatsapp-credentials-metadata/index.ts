/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type AllowedRole = "super_admin" | "admin" | "manager";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST" && req.method !== "GET")
      return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt)
      return jsonResponse(
        { ok: false, success: false, error: "Missing Authorization bearer token" },
        401,
      );

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) {
      return jsonResponse({ ok: false, success: false, error: "Invalid session" }, 401);
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
      return jsonResponse({ ok: false, success: false, error: companyErr.message }, 403);
    if (memberErr)
      return jsonResponse({ ok: false, success: false, error: memberErr.message }, 403);
    if (roleErr) return jsonResponse({ ok: false, success: false, error: roleErr.message }, 403);
    if (!companyId)
      return jsonResponse(
        { ok: false, success: false, error: "No company context (missing profile.company_id)" },
        403,
      );
    if (!isMember)
      return jsonResponse(
        { ok: false, success: false, error: "Account is inactive or not a company member" },
        403,
      );
    if (!hasRole)
      return jsonResponse(
        { ok: false, success: false, error: "Not authorized (super_admin/admin/manager only)" },
        403,
      );

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: secrets, error: secretsErr } = await serviceClient
      .from("company_whatsapp_secrets")
      .select(
        "access_token_last4, app_secret_last4, access_token_configured_at, app_secret_configured_at",
      )
      .eq("company_id", companyId)
      .maybeSingle();
    if (secretsErr)
      return jsonResponse({ ok: false, success: false, error: secretsErr.message }, 500);

    return jsonResponse({
      ok: true,
      success: true,
      companyId,
      accessTokenConfigured: Boolean((secrets as any)?.access_token_configured_at),
      accessTokenLast4: (secrets as any)?.access_token_last4 || null,
      accessTokenConfiguredAt: (secrets as any)?.access_token_configured_at || null,
      appSecretConfigured: Boolean((secrets as any)?.app_secret_configured_at),
      appSecretLast4: (secrets as any)?.app_secret_last4 || null,
      appSecretConfiguredAt: (secrets as any)?.app_secret_configured_at || null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ ok: false, success: false, error: message }, 500);
  }
});
