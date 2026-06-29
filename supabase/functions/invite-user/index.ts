/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "viewer";

type InvitationRow = {
  id: string;
  company_id: string;
  email: string;
  role: AppRole;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
};

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

function buildInvitationLink(args: {
  siteUrl: string;
  token: string;
  email: string;
  redirectTo: string;
}) {
  const base = args.siteUrl.replace(/\/$/, "");
  return `${base}/login?invite=${encodeURIComponent(args.token)}&email=${encodeURIComponent(args.email)}&redirectTo=${encodeURIComponent(args.redirectTo)}`;
}

function invitationEmailHtml(args: { role: string; invitationLink: string }) {
  return `
    <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #0f172a;">
      <div style="max-width: 520px; margin: 0 auto; border: 1px solid #e5edf8; border-radius: 18px; padding: 24px; background: #ffffff;">
        <h2 style="margin: 0 0 8px; font-size: 22px;">You're invited to Corevix CRM</h2>
        <p style="margin: 0 0 16px; color: #475569;">You have been invited to join a company workspace.</p>
        <p style="margin: 0 0 18px;"><strong>Role:</strong> ${args.role}</p>
        <p style="margin: 0 0 18px;">
          <a href="${args.invitationLink}" style="display:inline-block;background:#1d62f9;color:#fff;padding:11px 16px;border-radius:12px;text-decoration:none;font-weight:800;">
            Accept invitation
          </a>
        </p>
        <p style="color:#64748b;font-size:12px;margin: 0 0 6px;">If the button doesn't work, copy and paste this link:</p>
        <p style="color:#64748b;font-size:12px;word-break:break-all;margin:0;">${args.invitationLink}</p>
      </div>
    </div>
  `;
}

async function sendResendEmail(args: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
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
    const siteUrl = getEnv("SITE_URL").replace(/\/$/, "");
    const resendApiKey = getOptionalEnv("RESEND_API_KEY");
    const resendFrom = getOptionalEnv("RESEND_FROM") || "Corevix CRM <onboarding@resend.dev>";

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
    if (!jwt) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "create").trim();
    const redirectTo = body?.redirectTo ? String(body.redirectTo) : `${siteUrl}/dashboard`;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await callerClient.auth.getUser(jwt);
    if (authErr || !authData?.user) return jsonResponse({ error: "Invalid session" }, 401);

    const [
      { data: companyId, error: companyErr },
      { data: canManage, error: manageErr },
      { data: inviterProfileId, error: profileErr },
    ] = await Promise.all([
      callerClient.rpc("get_current_company_id"),
      callerClient.rpc("can_manage_users"),
      callerClient.rpc("get_current_profile_id"),
    ]);

    if (companyErr) return jsonResponse({ error: companyErr.message }, 403);
    if (manageErr) return jsonResponse({ error: manageErr.message }, 403);
    if (profileErr) return jsonResponse({ error: profileErr.message }, 403);
    if (!companyId) return jsonResponse({ error: "No company context (missing profile.company_id)" }, 403);
    if (!canManage) return jsonResponse({ error: "Not authorized (admin/super_admin only)" }, 403);

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    async function sendInvitationEmail(invitation: InvitationRow) {
      const invitationLink = buildInvitationLink({
        siteUrl,
        token: invitation.token,
        email: invitation.email,
        redirectTo,
      });

      if (!resendApiKey) {
        return {
          email_sent: false,
          invitation_link: invitationLink,
          resend_error: undefined,
        };
      }

      try {
        await sendResendEmail({
          apiKey: resendApiKey,
          from: resendFrom,
          to: invitation.email,
          subject: "You're invited to Corevix CRM",
          html: invitationEmailHtml({ role: invitation.role, invitationLink }),
        });
        return { email_sent: true, invitation_link: invitationLink };
      } catch (e) {
        return {
          email_sent: false,
          invitation_link: invitationLink,
          resend_error: e instanceof Error ? e.message : "Resend failed",
        };
      }
    }

    if (action === "revoke") {
      const invitationId = String(body?.invitationId || "").trim();
      if (!invitationId) return jsonResponse({ error: "Missing invitationId" }, 400);

      const { data: invitation, error: getErr } = await serviceClient
        .from("invitations")
        .select("id,company_id,email,role,token,status,expires_at")
        .eq("id", invitationId)
        .eq("company_id", companyId)
        .single();

      if (getErr || !invitation) return jsonResponse({ error: getErr?.message || "Invitation not found" }, 404);
      if ((invitation as InvitationRow).status !== "pending") {
        return jsonResponse({ error: "Only pending invitations can be revoked" }, 400);
      }

      const { error: revokeErr } = await serviceClient
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId)
        .eq("company_id", companyId);

      if (revokeErr) return jsonResponse({ error: revokeErr.message }, 400);
      return jsonResponse({ ok: true, email_sent: false, status: "revoked", invitationId });
    }

    if (action === "resend") {
      const invitationId = String(body?.invitationId || "").trim();
      if (!invitationId) return jsonResponse({ error: "Missing invitationId" }, 400);

      const { data: invitation, error: getErr } = await serviceClient
        .from("invitations")
        .select("id,company_id,email,role,token,status,expires_at")
        .eq("id", invitationId)
        .eq("company_id", companyId)
        .single();

      if (getErr || !invitation) return jsonResponse({ error: getErr?.message || "Invitation not found" }, 404);
      const row = invitation as InvitationRow;
      if (row.status !== "pending") return jsonResponse({ error: "Only pending invitations can be resent" }, 400);
      if (new Date(row.expires_at).getTime() < Date.now()) return jsonResponse({ error: "Invitation expired" }, 400);

      const emailResult = await sendInvitationEmail(row);
      return jsonResponse({
        ok: true,
        invitationId: row.id,
        token: row.token,
        ...emailResult,
      });
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const fullName = body?.full_name ? String(body.full_name).trim() : null;
    const department = body?.department ? String(body.department).trim() : null;
    const role = String(body?.role || "viewer").trim() as AppRole;
    const allowedRoles: AppRole[] = ["super_admin", "admin", "manager", "sales_agent", "viewer"];

    if (!email || !email.includes("@")) return jsonResponse({ error: "Invalid email" }, 400);
    if (!allowedRoles.includes(role)) return jsonResponse({ error: "Invalid role" }, 400);

    const token = buildToken();
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
      .select("id,company_id,email,role,token,status,expires_at")
      .single();

    if (invErr) return jsonResponse({ error: invErr.message }, 400);

    const row = invitation as InvitationRow;
    const emailResult = await sendInvitationEmail(row);
    return jsonResponse({
      ok: true,
      invitationId: row.id,
      token: row.token,
      ...emailResult,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
