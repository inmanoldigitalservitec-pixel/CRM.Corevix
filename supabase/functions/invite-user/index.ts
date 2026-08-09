/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type AppRole = "super_admin" | "admin" | "manager" | "sales_agent" | "collaborator" | "viewer";

type InvitationRow = {
  id: string;
  company_id: string;
  email: string;
  role: AppRole;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
};

type DeliveryChannel = "gmail" | "resend" | "manual";

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

function siteUrlFromRedirect(redirectTo: string, fallbackSiteUrl: string) {
  try {
    const url = new URL(redirectTo);
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // Keep the configured fallback for malformed or relative redirects.
  }
  return fallbackSiteUrl;
}

function roleDisplayName(role: string) {
  const labels: Record<string, string> = {
    super_admin: "Administrador principal",
    admin: "Administrador",
    manager: "Manager",
    sales_agent: "Agente comercial",
    collaborator: "Colaborador",
    viewer: "Visualizador",
  };
  return labels[role] || role;
}

function displayUrlFromInvitationLink(invitationLink: string) {
  try {
    const url = new URL(invitationLink);
    return `${url.host}/login`;
  } catch {
    return "crm.corevix.agency/login";
  }
}

function invitationEmailHtml(args: { role: string; invitationLink: string }) {
  const roleLabel = escapeHtml(roleDisplayName(args.role));
  const displayUrl = escapeHtml(displayUrlFromInvitationLink(args.invitationLink));
  return `
    <div style="margin:0;padding:0;background:#e5e7eb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#e5e7eb;">
        <tr>
          <td align="center" style="padding:48px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:430px;border-collapse:collapse;background:#ffffff;border:1px solid #d9dee7;border-radius:14px;box-shadow:0 18px 44px rgba(17,24,39,0.18);">
              <tr>
                <td style="padding:34px 28px 28px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;">Corevix CRM</p>
                  <h1 style="margin:0 auto 8px;max-width:310px;font-size:25px;line-height:1.18;font-weight:800;color:#111827;">
                    Te invitaron a unirte al workspace
                  </h1>
                  <p style="margin:0 auto 24px;max-width:320px;font-size:14px;line-height:1.55;color:#6b7280;">
                    Acepta la invitación para crear tu cuenta y acceder al entorno de trabajo de Corevix CRM.
                  </p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 22px;">
                    <tr>
                      <td style="padding:0 0 14px;text-align:left;">
                        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                          <tr>
                            <td width="34" valign="top" style="padding:0;">
                              <div style="width:24px;height:24px;border-radius:999px;border:1px solid #d1d5db;text-align:center;line-height:24px;font-size:13px;color:#111827;font-weight:700;">1</div>
                            </td>
                            <td style="padding:0;">
                              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">Acceso seguro</p>
                              <p style="margin:2px 0 0;font-size:12px;line-height:1.45;color:#6b7280;">La invitación está vinculada a tu correo y al workspace correcto.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0;text-align:left;">
                        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                          <tr>
                            <td width="34" valign="top" style="padding:0;">
                              <div style="width:24px;height:24px;border-radius:999px;border:1px solid #d1d5db;text-align:center;line-height:24px;font-size:13px;color:#111827;font-weight:700;">2</div>
                            </td>
                            <td style="padding:0;">
                              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">Rol asignado</p>
                              <p style="margin:2px 0 0;font-size:12px;line-height:1.45;color:#6b7280;">Entrarás como <strong style="color:#111827;">${roleLabel}</strong>.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <a href="${args.invitationLink}" style="display:block;width:100%;box-sizing:border-box;background:#000000;color:#ffffff;border-radius:999px;padding:13px 18px;text-align:center;text-decoration:none;font-size:14px;font-weight:800;">
                    Continuar
                  </a>

                  <p style="margin:18px 0 0;font-size:11px;line-height:1.45;color:#8b94a3;">
                    Si el botón no abre, usa este enlace seguro:
                    <a href="${args.invitationLink}" style="color:#111827;text-decoration:underline;">${displayUrl}</a>
                  </p>
                  <p style="margin:12px 0 0;font-size:10px;line-height:1.45;color:#9ca3af;">
                    Si no esperabas esta invitación, puedes ignorar este mensaje.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function invitationEmailText(args: { role: string; invitationLink: string }) {
  return [
    "Te invitaron a unirte a Corevix CRM",
    "",
    "Acepta la invitación para crear tu cuenta y acceder al workspace.",
    `Rol asignado: ${roleDisplayName(args.role)}`,
    "",
    "Continuar:",
    args.invitationLink,
    "",
    "Si no esperabas esta invitación, puedes ignorar este mensaje.",
  ].join("\n");
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refreshGmailAccessToken(args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
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
    json = JSON.parse(text);
  } catch {
    // keep text fallback
  }
  if (!res.ok) {
    const message = json?.error_description || json?.error || text || "Refresh token failed";
    throw new Error(message);
  }
  return json as { access_token: string; expires_in?: number; scope?: string };
}

async function sendGmailHtmlEmail(args: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const boundary = `corevix-invite-${crypto.randomUUID()}`;
  const raw = [
    `From: ${args.from}`,
    `Reply-To: ${args.from}`,
    `To: ${args.to}`,
    `Subject: ${encodeHeader(args.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    args.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    args.html,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64Url(raw) }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text fallback
  }
  if (!res.ok) {
    const message = json?.error?.message || json?.error_description || text || "Gmail send failed";
    throw new Error(message);
  }
  return json as { id: string; threadId?: string; labelIds?: string[] };
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
    const invitationSiteUrl = siteUrlFromRedirect(redirectTo, siteUrl);

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
    if (!companyId)
      return jsonResponse({ error: "No company context (missing profile.company_id)" }, 403);
    if (!canManage) return jsonResponse({ error: "Not authorized (admin/super_admin only)" }, 403);

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    async function sendInvitationEmail(invitation: InvitationRow) {
      const invitationLink = buildInvitationLink({
        siteUrl: invitationSiteUrl,
        token: invitation.token,
        email: invitation.email,
        redirectTo,
      });
      const subject = "Invitación para acceder a Corevix CRM";
      const html = invitationEmailHtml({ role: invitation.role, invitationLink });
      const text = invitationEmailText({ role: invitation.role, invitationLink });
      let gmailError: string | undefined;

      try {
        const { data: officialRows, error: officialError } = await serviceClient
          .from("email_accounts")
          .select(
            "id, company_id, user_id, provider, account_type, email_address, is_active, access_token, refresh_token, token_expires_at",
          )
          .eq("provider", "gmail")
          .eq("company_id", companyId)
          .eq("account_type", "official")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (officialError) throw officialError;
        let account = Array.isArray(officialRows) && officialRows.length ? officialRows[0] : null;

        // Backward-compatible fallback for companies created before official
        // mailbox classification. New installations always use the official row.
        if (!account) {
          const accountQueryIds = [inviterProfileId, authData.user.id].filter(Boolean);
          const { data: personalRows, error: personalError } = await serviceClient
            .from("email_accounts")
            .select(
              "id, company_id, user_id, provider, account_type, email_address, is_active, access_token, refresh_token, token_expires_at",
            )
            .eq("provider", "gmail")
            .eq("company_id", companyId)
            .eq("account_type", "personal")
            .in("user_id", accountQueryIds)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(1);
          if (personalError) throw personalError;
          account = Array.isArray(personalRows) && personalRows.length ? personalRows[0] : null;
        }

        if (!account?.id) throw new Error("No hay una cuenta de Gmail conectada.");

        const { data: gmailSettings, error: settingsError } = await serviceClient
          .from("gmail_settings")
          .select("client_id, client_secret_encrypted")
          .eq("company_id", companyId)
          .maybeSingle();
        if (settingsError) throw settingsError;
        if (!gmailSettings?.client_id || !gmailSettings?.client_secret_encrypted) {
          throw new Error("Falta configurar Gmail API en Settings.");
        }

        let accessToken = String((account as any).access_token || "");
        const refreshToken = (account as any).refresh_token
          ? String((account as any).refresh_token)
          : null;
        const tokenExpiresAt = (account as any).token_expires_at
          ? new Date(String((account as any).token_expires_at))
          : null;
        const isExpired = tokenExpiresAt ? tokenExpiresAt.getTime() <= Date.now() + 30_000 : false;

        if ((!accessToken || isExpired) && refreshToken) {
          const refreshed = await refreshGmailAccessToken({
            refreshToken,
            clientId: String(gmailSettings.client_id),
            clientSecret: String(gmailSettings.client_secret_encrypted),
          });
          accessToken = refreshed.access_token;
          await serviceClient
            .from("email_accounts")
            .update({
              access_token: accessToken,
              token_expires_at: refreshed.expires_in
                ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
                : null,
              scopes: refreshed.scope
                ? String(refreshed.scope).split(/\s+/).filter(Boolean)
                : undefined,
            })
            .eq("id", account.id);
        }

        if (!accessToken) throw new Error("Conecta Gmail antes de enviar.");

        const sent = await sendGmailHtmlEmail({
          accessToken,
          from: `Corevix CRM <${String(account.email_address || "me")}>`,
          to: invitation.email,
          subject,
          html,
          text,
        });

        const now = new Date().toISOString();
        const { data: conversationRow, error: convoError } = await serviceClient
          .from("email_conversations")
          .insert({
            company_id: companyId,
            email_account_id: account.id,
            provider: "gmail",
            provider_thread_id: sent.threadId || null,
            subject,
            status: "open",
            last_message_at: now,
            snippet: text.slice(0, 240),
            from_email: String(account.email_address || ""),
            to_email: invitation.email,
            user_id: account.user_id,
            is_read: true,
          })
          .select("id")
          .single();
        if (convoError) throw convoError;

        const { error: messageError } = await serviceClient.from("email_messages").insert({
          company_id: companyId,
          conversation_id: conversationRow.id,
          direction: "outbound",
          sender: String(account.email_address || ""),
          recipient: invitation.email,
          body: text,
          body_html: html,
          provider: "gmail",
          subject,
          from_email: String(account.email_address || ""),
          to_email: invitation.email,
          sent_at: now,
          is_read: true,
          raw: sent,
          provider_message_id: sent.id,
          provider_thread_id: sent.threadId || null,
          snippet: text.slice(0, 240),
          label_ids: sent.labelIds || ["SENT"],
          email_account_id: account.id,
          user_id: account.user_id,
          updated_at: now,
        });
        if (messageError) throw messageError;

        return {
          email_sent: true,
          invitation_link: invitationLink,
          delivery_channel: "gmail" as DeliveryChannel,
        };
      } catch (e) {
        gmailError = e instanceof Error ? e.message : "Gmail failed";
      }

      if (!resendApiKey) {
        return {
          email_sent: false,
          invitation_link: invitationLink,
          delivery_channel: "manual" as DeliveryChannel,
          gmail_error: gmailError,
          resend_error: undefined,
        };
      }

      try {
        await sendResendEmail({
          apiKey: resendApiKey,
          from: resendFrom,
          to: invitation.email,
          subject,
          html,
        });
        return {
          email_sent: true,
          invitation_link: invitationLink,
          delivery_channel: "resend" as DeliveryChannel,
          gmail_error: gmailError,
        };
      } catch (e) {
        return {
          email_sent: false,
          invitation_link: invitationLink,
          delivery_channel: "manual" as DeliveryChannel,
          gmail_error: gmailError,
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

      if (getErr || !invitation)
        return jsonResponse({ error: getErr?.message || "Invitation not found" }, 404);
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

      if (getErr || !invitation)
        return jsonResponse({ error: getErr?.message || "Invitation not found" }, 404);
      const row = invitation as InvitationRow;
      if (row.status !== "pending")
        return jsonResponse({ error: "Only pending invitations can be resent" }, 400);
      if (new Date(row.expires_at).getTime() < Date.now())
        return jsonResponse({ error: "Invitation expired" }, 400);

      const emailResult = await sendInvitationEmail(row);
      return jsonResponse({
        ok: true,
        invitationId: row.id,
        token: row.token,
        ...emailResult,
      });
    }

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const fullName = body?.full_name ? String(body.full_name).trim() : null;
    const department = body?.department ? String(body.department).trim() : null;
    const role = String(body?.role || "viewer").trim() as AppRole;
    const allowedRoles: AppRole[] = [
      "super_admin",
      "admin",
      "manager",
      "sales_agent",
      "collaborator",
      "viewer",
    ];

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
