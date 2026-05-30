/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

type Channel = "whatsapp" | "website" | "instagram" | "messenger";
type MatchedBy = "external_id" | "phone" | "email" | "none";

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

function cleanOptionalEmail(value: unknown): string | null {
  const s = cleanOptionalString(value);
  if (!s) return null;
  return s.toLowerCase();
}

function normalizePhone(value: string): string {
  // Best-effort normalization without external deps: keep digits only.
  return value.replace(/[^\d]/g, "");
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    const s = String(v).trim();
    if (!s.length) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "Unknown" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Unknown" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMetadata(existing: unknown, incoming: unknown): Record<string, unknown> {
  const base = isObject(existing) ? existing : {};
  const add = isObject(incoming) ? incoming : {};
  return { ...base, ...add };
}

function withSelectedServiceMetadata(incoming: unknown, selectedService: string | null) {
  if (!selectedService) return incoming;
  const base = isObject(incoming) ? incoming : {};
  return { ...base, selected_service: selectedService };
}

function shouldFillEmpty(existing: unknown): boolean {
  if (existing === null || existing === undefined) return true;
  if (typeof existing === "string") return existing.trim().length === 0;
  return false;
}

function isValidChannel(value: unknown): value is Channel {
  return value === "whatsapp" || value === "website" || value === "instagram" || value === "messenger";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ ok: false, success: false, error: "Method not allowed" }, 405);

    // TODO(security): Require auth / shared secret before exposing publicly (website/bot).
    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ ok: false, success: false, error: "Invalid JSON body" }, 400);

    const companyId = cleanOptionalString((body as any).companyId);
    const channelRaw = (body as any).channel;
    const channel = isValidChannel(channelRaw) ? channelRaw : null;

    if (!companyId || !isUuid(companyId)) {
      return jsonResponse({ ok: false, success: false, error: "Invalid companyId (uuid required)" }, 400);
    }
    if (!channel) {
      return jsonResponse(
        { ok: false, success: false, error: "Invalid channel (whatsapp|website|instagram|messenger)" },
        400,
      );
    }

    const sourcePlatform = cleanOptionalString((body as any).sourcePlatform);
    const sourceDetail = cleanOptionalString((body as any).sourceDetail);

    const name = cleanOptionalString((body as any).name);
    let firstName = cleanOptionalString((body as any).firstName);
    let lastName = cleanOptionalString((body as any).lastName);

    const email = cleanOptionalEmail((body as any).email);

    const phoneRaw = cleanOptionalString((body as any).phone);
    const whatsappRaw = cleanOptionalString((body as any).whatsapp);
    const phoneNormalized = phoneRaw ? normalizePhone(phoneRaw) : null;
    const whatsappNormalized = whatsappRaw ? normalizePhone(whatsappRaw) : null;

    const businessName = cleanOptionalString((body as any).businessName);
    const selectedService = cleanOptionalString((body as any).selectedService);

    const externalId = cleanOptionalString((body as any).externalId);

    const utmSource = cleanOptionalString((body as any).utmSource);
    const utmMedium = cleanOptionalString((body as any).utmMedium);
    const utmCampaign = cleanOptionalString((body as any).utmCampaign);
    const utmContent = cleanOptionalString((body as any).utmContent);
    const utmTerm = cleanOptionalString((body as any).utmTerm);

    const metadataIncoming = withSelectedServiceMetadata((body as any).metadata, selectedService);

    if ((!firstName || !lastName) && name) {
      const split = splitName(name);
      firstName = firstName || split.firstName;
      lastName = lastName || split.lastName;
    }

    // DB requires NOT NULL first_name/last_name. If caller provides nothing, use safe placeholders.
    const firstNameForInsert = firstName || "Unknown";
    const lastNameForInsert = lastName || "Unknown";

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const leadSelect =
      "id, company_id, first_name, last_name, email, phone, whatsapp, company_name, source, source_channel, source_platform, source_detail, first_touch_channel, last_touch_channel, utm_source, utm_medium, utm_campaign, utm_content, utm_term, external_id, metadata";

    let matchedBy: MatchedBy = "none";
    let existingLead:
      | (Record<string, any> & { id: string })
      | null = null;

    if (externalId) {
      const { data, error } = await serviceClient
        .from("leads")
        .select(leadSelect)
        .eq("company_id", companyId)
        .eq("source_channel", channel)
        .eq("external_id", externalId)
        .limit(1)
        .maybeSingle();
      if (error) return jsonResponse({ ok: false, success: false, error: error.message }, 400);
      if (data?.id) {
        existingLead = data as any;
        matchedBy = "external_id";
      }
    }

    if (!existingLead) {
      const phoneCandidates = uniqueStrings([
        phoneNormalized,
        whatsappNormalized,
        phoneRaw ? normalizePhone(phoneRaw) : null,
        whatsappRaw ? normalizePhone(whatsappRaw) : null,
      ]).filter((v) => v.length >= 6);

      if (phoneCandidates.length) {
        const orParts: string[] = [];
        for (const p of phoneCandidates) {
          orParts.push(`phone.eq.${p}`);
          orParts.push(`whatsapp.eq.${p}`);
        }

        const { data, error } = await serviceClient
          .from("leads")
          .select(leadSelect)
          .eq("company_id", companyId)
          .or(orParts.join(","))
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (error) return jsonResponse({ ok: false, success: false, error: error.message }, 400);
        if (data?.id) {
          existingLead = data as any;
          matchedBy = "phone";
        }
      }
    }

    if (!existingLead && email) {
      const { data, error } = await serviceClient
        .from("leads")
        .select(leadSelect)
        .eq("company_id", companyId)
        .eq("email", email)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) return jsonResponse({ ok: false, success: false, error: error.message }, 400);
      if (data?.id) {
        existingLead = data as any;
        matchedBy = "email";
      }
    }

    const nowIso = new Date().toISOString();

    if (existingLead?.id) {
      const update: Record<string, unknown> = {
        last_touch_channel: channel,
        last_interaction_at: nowIso,
        metadata: mergeMetadata(existingLead.metadata, metadataIncoming),
      };

      if (sourcePlatform && shouldFillEmpty(existingLead.source_platform)) update.source_platform = sourcePlatform;
      if (sourceDetail && shouldFillEmpty(existingLead.source_detail)) update.source_detail = sourceDetail;

      if (email && shouldFillEmpty(existingLead.email)) update.email = email;
      if (phoneNormalized && shouldFillEmpty(existingLead.phone)) update.phone = phoneNormalized;
      if (whatsappNormalized && shouldFillEmpty(existingLead.whatsapp)) update.whatsapp = whatsappNormalized;

      if (businessName && shouldFillEmpty(existingLead.company_name)) update.company_name = businessName;

      if (externalId && shouldFillEmpty(existingLead.external_id)) update.external_id = externalId;
      if (shouldFillEmpty(existingLead.source_channel)) update.source_channel = channel;

      // Keep legacy source for compatibility; only set if empty.
      if (shouldFillEmpty(existingLead.source)) update.source = channel;

      if (utmSource && shouldFillEmpty(existingLead.utm_source)) update.utm_source = utmSource;
      if (utmMedium && shouldFillEmpty(existingLead.utm_medium)) update.utm_medium = utmMedium;
      if (utmCampaign && shouldFillEmpty(existingLead.utm_campaign)) update.utm_campaign = utmCampaign;
      if (utmContent && shouldFillEmpty(existingLead.utm_content)) update.utm_content = utmContent;
      if (utmTerm && shouldFillEmpty(existingLead.utm_term)) update.utm_term = utmTerm;

      // Fill names only if missing (DB columns are NOT NULL, but legacy data might still be low-quality).
      if (firstName && shouldFillEmpty(existingLead.first_name)) update.first_name = firstName;
      if (lastName && shouldFillEmpty(existingLead.last_name)) update.last_name = lastName;

      const { error: updateErr } = await serviceClient.from("leads").update(update).eq("id", existingLead.id);
      if (updateErr) return jsonResponse({ ok: false, success: false, error: updateErr.message }, 400);

      return jsonResponse({
        ok: true,
        success: true,
        leadId: existingLead.id,
        created: false,
        matchedBy,
      });
    }

    const insert: Record<string, unknown> = {
      company_id: companyId,
      first_name: firstNameForInsert,
      last_name: lastNameForInsert,
      email: email,
      phone: phoneNormalized,
      whatsapp: whatsappNormalized,
      company_name: businessName,

      source_channel: channel,
      source_platform: sourcePlatform,
      source_detail: sourceDetail,
      source: channel, // legacy field for compatibility

      first_touch_channel: channel,
      last_touch_channel: channel,
      last_interaction_at: nowIso,

      external_id: externalId,
      metadata: mergeMetadata({}, metadataIncoming),
    };

    if (utmSource) insert.utm_source = utmSource;
    if (utmMedium) insert.utm_medium = utmMedium;
    if (utmCampaign) insert.utm_campaign = utmCampaign;
    if (utmContent) insert.utm_content = utmContent;
    if (utmTerm) insert.utm_term = utmTerm;

    const { data: createdLead, error: insertErr } = await serviceClient
      .from("leads")
      .insert(insert)
      .select("id")
      .single();
    if (insertErr) return jsonResponse({ ok: false, success: false, error: insertErr.message }, 400);

    return jsonResponse({
      ok: true,
      success: true,
      leadId: createdLead.id,
      created: true,
      matchedBy: "none",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return jsonResponse({ ok: false, success: false, error: message }, 500);
  }
});
