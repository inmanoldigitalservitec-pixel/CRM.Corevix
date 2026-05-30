/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "viewer";

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

function getOptionalEnv(name: string) {
  return Deno.env.get(name) || null;
}

function buildToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

async function sendResendEmail(args: { apiKey: string; from: string; to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    const message = json?.message || json?.error || text || "Resend request failed";
    throw new Error(message);
  }
  return json;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = getEnv("SITE_URL");
    const resendApiKey = getOptionalEnv("RESEND_API_KEY");
    const resendFrom = getOptionalEnv("RESEND_FROM") || "Corevix CRM <onboarding@resend.dev>";

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const fullName = body?.full_name ? String(body.full_name).trim() : null;
    const department = body?.department ? String(body.department).trim() : null;
    const role = String(body?.role || "viewer").trim() as AppRole;
    const cleanSiteUrl = siteUrl.replace(/\/$/, "");
    const redirectTo = body?.redirectTo ? String(body.redirectTo) : `${cleanSiteUrl}/dashboard`;

    const allowedRoles: AppRole[] = ["super_admin", "admin", "manager", "sales_agent", "viewer"];
    if (!email || !email.includes("@")) return jsonResponse({ error: "Invalid email" }, 400);
    if (!allowedRoles.includes(role)) return jsonResponse({ error: "Invalid role" }, 400);

    // Caller client (RLS applies) + validate JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);

    const [{ data: companyId, error: companyErr }, { data: canManage, error: manageErr }, { data: inviterProfileId, error: profileErr }] =
      await Promise.all([
        callerClient.rpc("get_current_company_id"),
        callerClient.rpc("can_manage_users"),
        callerClient.rpc("get_current_profile_id"),
      ]);

    if (companyErr) return jsonResponse({ error: companyErr.message }, 403);
    if (manageErr) return jsonResponse({ error: manageErr.message }, 403);
    if (profileErr) return jsonResponse({ error: profileErr.message }, 403);
    if (!companyId) return jsonResponse({ error: "No company context (missing profile.company_id)" }, 403);
    if (!canManage) return jsonResponse({ error: "Not authorized (admin/super_admin only)" }, 403);

    // Service role client for trusted DB insert
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const token = buildToken();
    const base = cleanSiteUrl;
    const invitationLink = `${base}/login?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&redirectTo=${encodeURIComponent(redirectTo)}`;

    const { data: invitation, error: invErr } = await serviceClient
      .from("invitations")
      .insert({
        company_id: companyId,
        email,
        full_name: fullName,
        department,
        role,
        token,
        invited_by: inviterProfileId || null,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, token")
      .single();

    if (invErr) return jsonResponse({ error: invErr.message }, 400);

    if (resendApiKey) {
      try {
        const subject = "You're invited to Corevix CRM";
        const html = `
          <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5;">
            <h2>You're invited to Corevix CRM</h2>
            <p>You have been invited to join a company workspace.</p>
            <p><strong>Role:</strong> ${role}</p>
            <p>
              <a href="${invitationLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;">
                Accept invitation
              </a>
            </p>
            <p style="color:#64748b;font-size:12px">If the button doesn't work, copy and paste this link:</p>
            <p style="color:#64748b;font-size:12px;word-break:break-all">${invitationLink}</p>
          </div>
        `;
        await sendResendEmail({ apiKey: resendApiKey, from: resendFrom, to: email, subject, html });
        return jsonResponse({ ok: true, email_sent: true, invitationId: invitation.id, invitation_link: invitationLink, token: invitation.token });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Resend failed";
        return jsonResponse(
          { ok: true, email_sent: false, resend_error: message, invitationId: invitation.id, invitation_link: invitationLink, token: invitation.token },
          200,
        );
      }
    }

    return jsonResponse({ ok: true, email_sent: false, invitationId: invitation.id, invitation_link: invitationLink, token: invitation.token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
