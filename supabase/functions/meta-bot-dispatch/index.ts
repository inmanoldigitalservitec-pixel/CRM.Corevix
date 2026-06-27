/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";
import { matchIntent, normalizeText, type MessengerIntent } from "../_shared/messenger-intents.ts";
import { interpretWithDeepSeek } from "../_shared/deepseek-interpreter.ts";

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

function cleanOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function metaErrorToMessage(payload: any): string {
  const message = payload?.error?.message || payload?.message || "Meta Graph API error";
  const type = payload?.error?.type || null;
  const code = payload?.error?.code ?? null;
  const subcode = payload?.error?.error_subcode ?? null;
  const suffix: string[] = [];
  if (type) suffix.push(String(type));
  if (code !== null) suffix.push(`code:${code}`);
  if (subcode !== null) suffix.push(`subcode:${subcode}`);
  return suffix.length ? `${message} (${suffix.join(", ")})` : message;
}

function getSantoDomingoNow() {
  // Build a Date representing "now" but evaluate business hours using Santo Domingo local parts.
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const weekday = map.weekday || "";
  const hour = Number(map.hour ?? NaN);
  const minute = Number(map.minute ?? NaN);
  return { now, weekday, hour, minute };
}

function isBusinessOpenNow() {
  const { weekday, hour, minute } = getSantoDomingoNow();
  const mins = hour * 60 + minute;
  // Sun closed.
  if (weekday === "Sun") return false;
  // Sat 9:00-13:00.
  if (weekday === "Sat") return mins >= 9 * 60 && mins < 13 * 60;
  // Mon-Fri 9:00-18:00.
  return mins >= 9 * 60 && mins < 18 * 60;
}

function getNextBusinessOpenLabel() {
  const { weekday, hour, minute } = getSantoDomingoNow();
  const mins = hour * 60 + minute;

  // Helper to map weekday short to Spanish.
  const es: Record<string, string> = {
    Mon: "lunes",
    Tue: "martes",
    Wed: "miércoles",
    Thu: "jueves",
    Fri: "viernes",
    Sat: "sábado",
    Sun: "domingo",
  };

  // If before opening time today.
  const beforeOpenWeekday = (w: string) => w !== "Sun" && w !== "Sat";
  if (weekday === "Sat") {
    if (mins < 9 * 60) return "hoy a las 9:00 a.m.";
    // After Saturday hours -> Monday.
    return "el lunes a las 9:00 a.m.";
  }
  if (weekday === "Sun") return "el lunes a las 9:00 a.m.";
  // Mon-Fri
  if (mins < 9 * 60) return "hoy a las 9:00 a.m.";
  if (mins >= 18 * 60) {
    // Next day: if Friday then Saturday 9am, else tomorrow 9am.
    if (weekday === "Fri") return "mañana a las 9:00 a.m.";
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const idx = order.indexOf(weekday);
    const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : "Mon";
    return `mañana a las 9:00 a.m.`; // keep simple; "mañana" is enough.
  }

  // Fallback (shouldn't happen when closed but safe).
  return `próximo horario hábil (${es[weekday] ?? "pronto"} 9:00 a.m.)`;
}

function phase1MenuText() {
  // Keep all visible bot text in Spanish.
  return [
    "¡Hola! Gracias por escribir a Corevix 👋",
    "Para ayudarte mejor, dime qué necesitas:",
    "1. Página web",
    "2. Redes sociales",
    "3. CRM / automatización",
    "4. Hablar con un asesor",
  ].join("\n");
}

function awaitingAdvisorOpenText() {
  return [
    "Perfecto, ya avisamos a nuestro equipo. Un asesor de Corevix te responderá lo antes posible por este mismo chat.",
    "",
    "Mientras tanto, para ir avanzando y ayudarte mejor, cuéntame un poquito: ¿qué tipo de negocio tienes y qué te gustaría mejorar ahora mismo?",
  ].join("\n");
}

function awaitingAdvisorClosedText(nextOpenLabel: string) {
  return [
    "Gracias por escribirnos. En este momento estamos fuera de horario. Nuestro equipo estará disponible nuevamente " +
      nextOpenLabel +
      " y te responderá por este mismo chat.",
    "",
    "Mientras tanto, podemos ir avanzando por aquí. Cuéntame un poquito: ¿qué tipo de negocio tienes y qué te gustaría mejorar ahora mismo?",
  ].join("\n");
}

function businessHoursLabel() {
  return "lunes a viernes de 9:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m.";
}

function businessHoursReply(isOpen: boolean, nextOpenLabel: string) {
  if (isOpen) {
    return (
      `Nuestro horario de atención es de ${businessHoursLabel()} ` +
      "Ahora mismo estamos disponibles, así que un asesor te responderá lo antes posible.\n\n" +
      "Mientras tanto, si quieres, cuéntame un poquito qué tipo de negocio tienes para que el asesor llegue con más contexto."
    );
  }
  return (
    `Nuestro horario de atención es de ${businessHoursLabel()} ` +
    `Ahora mismo estamos fuera de horario. Nuestro equipo estará disponible nuevamente ${nextOpenLabel}.\n\n` +
    "Mientras tanto, si quieres, cuéntame un poquito qué tipo de negocio tienes para que el asesor llegue con más contexto."
  );
}

type BotState = {
  stage:
    | "start"
    | "awaiting_website_goal"
    | "awaiting_current_presence"
    | "awaiting_social_goal"
    | "awaiting_crm_goal"
    | "awaiting_reference"
    | "awaiting_business_type"
    | "awaiting_goal"
    | "ready_for_advisor";
  interest: MessengerIntent | null;
  business_type: string | null;
  goal: string | null;
  reference: string | null;
  ready_for_advisor: boolean;
  current_presence?: string | null;
  // Used only to prevent AI clarification loops. Stored in bot_state payload (no schema changes).
  ai_clarify_stage?: string | null;
  ai_clarify_count?: number | null;
  // Optional: compact summary we can show to the advisor later.
  conversation_summary?: string | null;
  additional_interests?: string[] | null;
};

function defaultBotState(): BotState {
  return {
    stage: "start",
    interest: null,
    business_type: null,
    goal: null,
    reference: null,
    ready_for_advisor: false,
    current_presence: null,
  };
}

function buildAdvisorContextSummary(state: BotState) {
  const parts: string[] = [];

  const interest = state.interest;
  const biz = String(state.business_type || "").trim();
  const goal = String(state.goal || "").trim();
  const presence = String(state.current_presence || "").trim();
  const ref = String(state.reference || "").trim();

  if (interest === "web_interest") {
    parts.push("buscas una web");
  } else if (interest === "social_interest") {
    parts.push("buscas mejorar tus redes");
  } else if (interest === "crm_interest") {
    parts.push("buscas automatización/CRM");
  }

  if (goal) {
    if (interest === "web_interest") parts.push(`para ${goal}`);
    else parts.push(`con el objetivo de ${goal}`);
  }

  if (biz) parts.push(`y que el negocio es ${biz}`);
  if (presence) parts.push(`(actualmente: ${presence})`);
  if (ref) parts.push(`(referencia: ${ref})`);

  const sentence = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!sentence) return null;
  return `Ya tenemos claro que ${sentence}.`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadLatestBotState(opts: {
  serviceClient: any;
  companyId: string;
  conversationId: string;
}) {
  const { serviceClient, companyId, conversationId } = opts;
  const { data, error } = await serviceClient
    .from("meta_messages")
    .select("id, raw_payload, created_at")
    .eq("company_id", companyId)
    .eq("conversation_id", conversationId)
    .eq("platform", "messenger")
    .eq("message_type", "bot_state")
    .eq("raw_payload->>source", "messenger_bot_state")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.raw_payload) return defaultBotState();
  const raw = data.raw_payload as any;
  const st = raw?.state;
  if (!isObject(st)) return defaultBotState();
  return {
    ...defaultBotState(),
    ...(st as any),
  } as BotState;
}

function stateEquals(a: BotState, b: BotState) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

async function saveBotState(opts: {
  serviceClient: any;
  companyId: string;
  accountId: string;
  conversationId: string;
  inboundMessageId: string;
  state: BotState;
  aiMeta?: {
    ai_attempted: boolean;
    ai_used: boolean;
    ai_provider: "deepseek" | null;
    ai_confidence: number | null;
    ai_reason: string | null;
    ai_stage_action?: string | null;
    ai_reply_used?: boolean | null;
    conversation_summary?: string | null;
  } | null;
}) {
  const nowIso = new Date().toISOString();
  const { serviceClient, companyId, accountId, conversationId, inboundMessageId, state } = opts;
  const rawPayload: Record<string, unknown> = {
    source: "messenger_bot_state",
    state,
    trigger_inbound_message_id: inboundMessageId,
  };
  if (opts.aiMeta?.ai_attempted) {
    rawPayload.ai_attempted = true;
    rawPayload.ai_used = Boolean(opts.aiMeta.ai_used);
    rawPayload.ai_provider = opts.aiMeta.ai_provider;
    rawPayload.ai_confidence = opts.aiMeta.ai_confidence ?? null;
    rawPayload.ai_reason = opts.aiMeta.ai_reason ?? null;
    rawPayload.ai_stage_action = opts.aiMeta.ai_stage_action ?? null;
    rawPayload.ai_reply_used = opts.aiMeta.ai_reply_used ?? null;
    rawPayload.conversation_summary = opts.aiMeta.conversation_summary ?? null;
  }

  // Prevent duplicate bot_state rows for the same inbound when nothing changed.
  // Best-effort: if a bot_state already exists for this inbound with the same state + ai metadata, skip insert.
  const { data: existing, error: existingErr } = await serviceClient
    .from("meta_messages")
    .select("id, raw_payload")
    .eq("company_id", companyId)
    .eq("conversation_id", conversationId)
    .eq("platform", "messenger")
    .eq("message_type", "bot_state")
    .eq("raw_payload->>source", "messenger_bot_state")
    .eq("raw_payload->>trigger_inbound_message_id", inboundMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existingErr && existing?.raw_payload) {
    try {
      const prevRaw = existing.raw_payload as any;
      const prevState = prevRaw?.state;
      const sameState = JSON.stringify(prevState ?? null) === JSON.stringify(state ?? null);
      const sameAi =
        JSON.stringify({
          ai_attempted: prevRaw?.ai_attempted ?? null,
          ai_used: prevRaw?.ai_used ?? null,
          ai_provider: prevRaw?.ai_provider ?? null,
          ai_confidence: prevRaw?.ai_confidence ?? null,
          ai_reason: prevRaw?.ai_reason ?? null,
          ai_stage_action: prevRaw?.ai_stage_action ?? null,
          ai_reply_used: prevRaw?.ai_reply_used ?? null,
          conversation_summary: prevRaw?.conversation_summary ?? null,
        }) ===
        JSON.stringify({
          ai_attempted: rawPayload.ai_attempted ?? null,
          ai_used: rawPayload.ai_used ?? null,
          ai_provider: rawPayload.ai_provider ?? null,
          ai_confidence: rawPayload.ai_confidence ?? null,
          ai_reason: rawPayload.ai_reason ?? null,
          ai_stage_action: rawPayload.ai_stage_action ?? null,
          ai_reply_used: rawPayload.ai_reply_used ?? null,
          conversation_summary: rawPayload.conversation_summary ?? null,
        });
      if (sameState && sameAi) return;
    } catch {
      // Ignore and proceed to insert.
    }
  }

  const { error } = await serviceClient.from("meta_messages").insert({
    company_id: companyId,
    account_id: accountId,
    conversation_id: conversationId,
    platform: "messenger",
    direction: "outbound",
    message_type: "bot_state",
    text: null,
    attachments: [],
    raw_payload: rawPayload,
    sent_at: nowIso,
  });
  if (error)
    console.warn("No se pudo guardar el bot_state (best-effort).", {
      conversationId,
      message: error.message,
    });
}

async function loadRecentConversationForAI(opts: {
  serviceClient: any;
  companyId: string;
  conversationId: string;
  limit?: number;
}) {
  const { serviceClient, companyId, conversationId, limit = 8 } = opts;
  const { data, error } = await serviceClient
    .from("meta_messages")
    .select("direction, text, created_at")
    .eq("company_id", companyId)
    .eq("conversation_id", conversationId)
    .eq("platform", "messenger")
    .neq("message_type", "bot_state")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("No se pudo cargar el contexto reciente para AI (best-effort).", {
      conversationId,
      message: error.message,
    });
    return [];
  }
  const rows = Array.isArray(data) ? data : [];
  // Return ascending order for readability.
  return rows
    .map((r: any) => ({
      direction: String(r?.direction || ""),
      text: cleanOptionalString(r?.text),
      created_at: cleanOptionalString(r?.created_at),
    }))
    .filter((r: any) => Boolean(r.text))
    .reverse();
}

function isGloballyClearCase(opts: {
  normalizedInput: string;
  intent: MessengerIntent;
  stage: BotState["stage"];
  text: string;
}) {
  const { normalizedInput, intent, stage, text } = opts;
  if (normalizedInput === "test deepseek" || normalizedInput === "probar deepseek") return true;
  if (intent === "advisor_request") return true;
  if (intent === "business_hours_question") return true;
  if (intent === "reference_link") return true;
  if (intent === "waiting" || isVagueWaitingMessage(text)) return true;
  // Only treat no_reference as globally clear inside awaiting_reference.
  if (stage === "awaiting_reference" && detectNoReference(text)) return true;
  return false;
}

function isActiveStage(stage: BotState["stage"]) {
  return (
    stage === "awaiting_website_goal" ||
    stage === "awaiting_current_presence" ||
    stage === "awaiting_social_goal" ||
    stage === "awaiting_crm_goal" ||
    stage === "awaiting_business_type" ||
    stage === "awaiting_goal" ||
    stage === "awaiting_reference"
  );
}

function normalizeExtractedSpanish(value: string | null) {
  const t = String(value || "").trim();
  if (!t) return null;
  const k = t.toLowerCase();
  if (k === "existing_website") return "ya tiene una página actualmente";
  if (k === "starting_from_zero") return "empezaría desde cero";
  if (k === "no_reference") return "sin referencia";
  return t;
}

function isValidReplyDraft(draft: string) {
  const t = String(draft || "").trim();
  if (t.length < 20 || t.length > 500) return false;
  const lower = t.toLowerCase();
  const banned = [
    "deepseek",
    "modelo",
    "ai",
    "ia",
    "json",
    "bot_state",
    "stage",
    "instruccion",
    "sistema",
  ];
  if (banned.some((b) => lower.includes(b))) return false;
  // Avoid promising exact times.
  const timePromises = [
    "en 5 minutos",
    "en cinco minutos",
    "hoy mismo seguro",
    "mañana seguro",
    "en una hora",
    "en 1 hora",
    "en 10 minutos",
  ];
  if (timePromises.some((p) => lower.includes(p))) return false;
  // No URLs in draft (avoid invented links).
  if (lower.includes("http://") || lower.includes("https://") || /\bwww\./i.test(t)) return false;
  // Max one main question.
  const qCount = (t.match(/\?/g) || []).length;
  if (qCount > 1) return false;
  // Lightweight Spanish check: allow if it has common Spanish characters/words.
  const spanishHints = [
    "que",
    "para",
    "puedes",
    "gracias",
    "tienes",
    "cuentame",
    "cuéntame",
    "perfecto",
    "entiendo",
    "ayudarte",
    "hola",
    "claro",
  ];
  const ascii = normalizeText(t);
  if (!spanishHints.some((h) => ascii.includes(normalizeText(h)))) return false;
  return true;
}

function buildAISummaryContext(input: {
  stage: BotState["stage"];
  state: BotState;
  intentMatch: any;
  recentMessages: Array<{ direction: string; text: string | null; created_at: string | null }>;
  text: string;
}) {
  return {
    stage: input.stage,
    state: {
      stage: input.state.stage,
      interest: input.state.interest,
      business_type: input.state.business_type,
      goal: input.state.goal,
      current_presence: input.state.current_presence ?? null,
      reference: input.state.reference,
      ready_for_advisor: input.state.ready_for_advisor,
      conversation_summary: input.state.conversation_summary ?? null,
      additional_interests: input.state.additional_interests ?? null,
    },
    recentMessages: input.recentMessages.map((m) => ({
      direction: m.direction,
      text: m.text,
      created_at: m.created_at,
    })),
    currentMessage: input.text,
    intentMatch: {
      intent: input.intentMatch.intent,
      confidence: input.intentMatch.confidence,
      normalizedText: (input.intentMatch as any).normalizedText ?? null,
    },
  };
}

function isVagueWaitingMessage(text: string) {
  const t = matchIntent(text).normalizedText;
  if (!t) return true;
  if (t.length <= 2) return true;
  const set = new Set([
    "hola",
    "buenas",
    "ok",
    "okay",
    "gracias",
    "sigo esperando",
    "nadie responde",
    "alguien",
    "por favor",
    "que",
    "que tal",
  ]);
  return set.has(t);
}

function looksLikeGoal(text: string) {
  const t = matchIntent(text).normalizedText;
  const keys = [
    "cliente",
    "clientes",
    "vender",
    "ventas",
    "organizar",
    "mensajes",
    "crm",
    "automat",
    "seguimiento",
    "pagina",
    "web",
    "instagram",
    "redes",
  ];
  return keys.some((k) => t.includes(k));
}

function looksLikeBusinessType(text: string) {
  const t = normalizeText(text);
  if (!t) return false;
  // Fast heuristic: "un/una" + common business nouns.
  const nouns = [
    "colmado",
    "tienda",
    "restaurante",
    "salon",
    "salon de belleza",
    "constructora",
    "ropa",
    "boutique",
    "farmacia",
    "barberia",
    "peluqueria",
    "cafe",
    "cafeteria",
    "clinica",
    "consultorio",
    "gimnasio",
    "supermercado",
    "minimarket",
  ];
  if (
    t.startsWith("un ") ||
    t.startsWith("una ") ||
    t.includes("mi negocio") ||
    t.includes("mi empresa")
  )
    return true;
  return nouns.some((n) => t.includes(n));
}

function classifyWebsitePurpose(text: string): string | null {
  const t = normalizeText(text);
  if (!t) return null;
  if (t.includes("recibir") || t.includes("clientes") || t.includes("prospect"))
    return "recibir clientes potenciales";
  if (
    t.includes("vender") ||
    t.includes("tienda") ||
    t.includes("online") ||
    t.includes("internet")
  )
    return "vender directamente";
  if (
    t.includes("present") ||
    t.includes("mostrar") ||
    t.includes("inform") ||
    t.includes("servicios")
  )
    return "presentar tu negocio";
  return null;
}

function looksLikeNoReference(text: string) {
  return detectNoReference(text);
}

function detectNoReference(text: string) {
  const t = normalizeText(text);
  if (!t) return false;
  if (t === "no") return true;
  if (t.startsWith("no ") || t.includes("no tengo")) return true;
  const patterns = [
    "nada",
    "ninguno",
    "ninguna",
    "no aplica",
    "no tengo eso",
    "no uso eso",
    "no tengo por ahora",
    "continuemos",
    "continue",
    "sigue",
    "sigamos",
    "seguir",
    "podemos seguir",
    "no tengo nada",
    "no por ahora",
    "no aun",
    "no aún",
    "todavia no",
    "todavía no",
    "no tengo instagram",
    "no tengo web",
    "no tengo pagina",
    "no tengo página",
    "no tengo referencia",
    "no manejo redes",
    "no uso instagram",
  ];
  return patterns.some((p) => t === p || t.includes(p));
}

function detectAdvisorHelp(text: string) {
  const t = normalizeText(text);
  if (!t) return false;
  const patterns = [
    "hay alguien",
    "alguien ayuda",
    "ayuda",
    "me pueda entender",
    "me pueden ayudar",
    "necesito ayuda",
    "necesito asistencia",
    "asistencia",
    "asistencia de alguien",
    "soporte humano",
    "asesor",
    "humano",
    "persona",
    "hablar con alguien",
  ];
  return patterns.some((p) => t === p || t.includes(p));
}

function detectDomainLikeReference(text: string): string | null {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("http://") || lower.includes("https://") || lower.includes("www.")) return raw;
  if (/\s/.test(raw)) return null;
  if (/^[a-z0-9][a-z0-9-_.]*\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(raw)) return raw;
  return null;
}

function detectPartialReference(
  text: string,
):
  | { kind: "needs_at_prefix"; suggested: string }
  | { kind: "normalized_handle"; value: string }
  | null {
  const t = normalizeText(text);
  if (!t) return null;

  const compact = t.replace(/\s+/g, "");
  const mEndsAt = /^([a-z0-9._]{2,})@$/.exec(compact);
  if (mEndsAt) return { kind: "needs_at_prefix", suggested: `@${mEndsAt[1]}` };

  const mIg = /^(instagram|ig|arroba)\s+([a-z0-9._]{2,})$/.exec(t);
  if (mIg) return { kind: "normalized_handle", value: `@${mIg[2]}` };

  const mMyUser = /^(mi usuario es|mi instagram es|mi ig es)\s+([a-z0-9._]{2,})$/.exec(t);
  if (mMyUser) return { kind: "normalized_handle", value: `@${mMyUser[2]}` };

  const mFb = /^facebook\s+([a-z0-9._-]{2,})$/.exec(t);
  if (mFb) return { kind: "normalized_handle", value: `facebook ${mFb[1]}` };

  return null;
}

function interpretCurrentPresenceRuleBased(text: string): string | null {
  const t = normalizeText(text);
  if (!t) return null;
  if (t.includes("desde cero") || t.includes("de cero") || t.includes("cero")) return "desde cero";
  if (
    t.includes("ya tengo") ||
    t.includes("tengo una") ||
    t.includes("tengo un") ||
    t.includes("existe")
  )
    return "ya tengo una actualmente";
  return null;
}

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTypingDelayMs(text: string, index = 0) {
  const length = String(text || "").length;

  let delay = 900;

  if (length > 80) delay = 1200;
  if (length > 160) delay = 1700;
  if (length > 240) delay = 2200;

  // Small extra pause between multiple messages.
  if (index > 0) delay += 350;

  return Math.min(delay, 2600);
}

async function sendMessengerSenderAction(opts: {
  accessToken: string;
  recipientId: string;
  action: "mark_seen" | "typing_on" | "typing_off";
}) {
  try {
    const response = await fetch("https://graph.facebook.com/v20.0/me/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: opts.recipientId },
        sender_action: opts.action,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.warn("Messenger sender action failed", {
        action: opts.action,
        message: metaErrorToMessage(payload),
      });
    }
  } catch (error) {
    console.warn("Messenger sender action exception", {
      action: opts.action,
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

function isValidAIOnlyReply(reply: string | null) {
  if (!reply) return false;
  const text = reply.trim();
  if (text.length < 10 || text.length > 320) return false;

  const lower = text.toLowerCase();

  const blocked = [
    "deepseek",
    "json",
    "bot_state",
    "stage",
    "modelo",
    "prompt",
    "api key",
    "token",
  ];

  if (blocked.some((word) => lower.includes(word))) return false;

  const exactTimePromises = [
    "en 5 minutos",
    "en cinco minutos",
    "hoy mismo seguro",
    "mañana seguro",
    "te responderán seguro",
  ];

  if (exactTimePromises.some((word) => lower.includes(word))) return false;

  return true;
}

function normalizeAIOnlyMessages(parsed: any) {
  const rawMessages = Array.isArray(parsed?.messages)
    ? parsed.messages
    : parsed?.reply
      ? [parsed.reply]
      : [];

  const messages = rawMessages
    .map((item: any) => cleanOptionalString(item))
    .filter((item: string | null) => isValidAIOnlyReply(item))
    .slice(0, 3);

  return messages;
}

function normalizeCapturedFields(parsed: any) {
  const fields = parsed?.captured_fields;

  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return null;
  }

  return {
    name: cleanOptionalString(fields.name),
    phone: cleanOptionalString(fields.phone),
    business_type: cleanOptionalString(fields.business_type),
    service_interest: cleanOptionalString(fields.service_interest),
    goal: cleanOptionalString(fields.goal),
    current_status: cleanOptionalString(fields.current_status),
    reference: cleanOptionalString(fields.reference),
    urgency: cleanOptionalString(fields.urgency),
  };
}

function mergeNonEmptyLeadFields(
  existing: Record<string, any> | null,
  incoming: Record<string, any> | null,
) {
  const result: Record<string, any> = { ...(existing || {}) };

  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return result;
  }

  for (const key of [
    "name",
    "phone",
    "business_type",
    "service_interest",
    "goal",
    "current_status",
    "reference",
    "urgency",
  ]) {
    const value = cleanOptionalString(incoming[key]);
    if (value) result[key] = value;
  }

  return result;
}

async function loadConversationLeadProfile(opts: {
  serviceClient: any;
  companyId: string;
  conversationId: string;
}) {
  const { data, error } = await opts.serviceClient
    .from("meta_conversation_lead_profiles")
    .select("*")
    .eq("company_id", opts.companyId)
    .eq("conversation_id", opts.conversationId)
    .eq("platform", "messenger")
    .maybeSingle();

  if (error) {
    console.warn("AI_ONLY lead profile load failed", {
      conversationId: opts.conversationId,
      message: error.message,
    });
    return null;
  }

  return data || null;
}

async function upsertConversationLeadProfile(opts: {
  serviceClient: any;
  companyId: string;
  accountId: string;
  conversationId: string;
  externalUserId: string | null;
  capturedFields: Record<string, any> | null;
  summary: string | null;
  leadStatus: string | null;
  needsHuman: boolean;
}) {
  const existing = await loadConversationLeadProfile({
    serviceClient: opts.serviceClient,
    companyId: opts.companyId,
    conversationId: opts.conversationId,
  });

  const previousCaptured =
    existing?.captured_fields && typeof existing.captured_fields === "object"
      ? existing.captured_fields
      : {};

  const mergedCaptured = mergeNonEmptyLeadFields(previousCaptured, opts.capturedFields);

  const statusFromAI = cleanOptionalString(opts.leadStatus);
  const nextStatus = opts.needsHuman
    ? "awaiting_advisor"
    : statusFromAI || existing?.lead_status || "collecting";

  const row = {
    company_id: opts.companyId,
    account_id: opts.accountId,
    conversation_id: opts.conversationId,
    platform: "messenger",
    external_user_id: opts.externalUserId,

    lead_status: nextStatus,

    name: cleanOptionalString(mergedCaptured.name) || existing?.name || null,
    phone: cleanOptionalString(mergedCaptured.phone) || existing?.phone || null,
    business_type:
      cleanOptionalString(mergedCaptured.business_type) || existing?.business_type || null,
    service_interest:
      cleanOptionalString(mergedCaptured.service_interest) || existing?.service_interest || null,
    goal: cleanOptionalString(mergedCaptured.goal) || existing?.goal || null,
    current_status:
      cleanOptionalString(mergedCaptured.current_status) || existing?.current_status || null,
    reference: cleanOptionalString(mergedCaptured.reference) || existing?.reference || null,
    urgency: cleanOptionalString(mergedCaptured.urgency) || existing?.urgency || null,

    summary: cleanOptionalString(opts.summary) || existing?.summary || null,
    captured_fields: mergedCaptured,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await opts.serviceClient
    .from("meta_conversation_lead_profiles")
    .upsert(row, {
      onConflict: "company_id,platform,conversation_id",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("AI_ONLY lead profile upsert failed", {
      conversationId: opts.conversationId,
      message: error.message,
    });
    return existing || null;
  }

  console.info("AI_ONLY lead profile updated", {
    conversationId: opts.conversationId,
    lead_status: data?.lead_status || null,
    has_name: Boolean(data?.name),
    has_phone: Boolean(data?.phone),
    service_interest: data?.service_interest || null,
  });

  return data || existing || null;
}

function normalizePhoneLike(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? cleaned : raw;
}

function leadProfileIsReadyForCrm(profile: any) {
  if (!profile) return false;

  const name = cleanOptionalString(profile.name);
  const phone = cleanOptionalString(profile.phone);
  const serviceInterest = cleanOptionalString(profile.service_interest);
  const businessType = cleanOptionalString(profile.business_type);
  const goal = cleanOptionalString(profile.goal);

  return Boolean((name || phone) && serviceInterest && (businessType || goal));
}

function buildMessengerLeadNotes(opts: {
  profile: any;
  conversationId: string;
  externalUserId: string | null;
}) {
  const p = opts.profile || {};

  const lines = [
    "Prospecto captado por Clara Rodríguez desde Messenger.",
    "",
    `Messenger Conversation ID: ${opts.conversationId}`,
    `Messenger User ID: ${opts.externalUserId || "—"}`,
    "",
    `Nombre: ${cleanOptionalString(p.name) || "—"}`,
    `WhatsApp/Teléfono: ${cleanOptionalString(p.phone) || "—"}`,
    `Tipo de negocio: ${cleanOptionalString(p.business_type) || "—"}`,
    `Servicio de interés: ${cleanOptionalString(p.service_interest) || "—"}`,
    `Objetivo: ${cleanOptionalString(p.goal) || "—"}`,
    `Estado actual: ${cleanOptionalString(p.current_status) || "—"}`,
    `Referencia: ${cleanOptionalString(p.reference) || "—"}`,
    `Urgencia: ${cleanOptionalString(p.urgency) || "—"}`,
    "",
    `Resumen Clara: ${cleanOptionalString(p.summary) || "—"}`,
  ];

  return lines.join("\n");
}

async function syncCrmFromMessengerLeadProfile(opts: {
  serviceClient: any;
  companyId: string;
  accountId: string;
  conversationId: string;
  externalUserId: string | null;
  leadProfile: any;
}) {
  const profile = opts.leadProfile;
  if (!leadProfileIsReadyForCrm(profile)) {
    console.info("CRM sync skipped: lead profile not ready", {
      conversationId: opts.conversationId,
      has_name: Boolean(profile?.name),
      has_phone: Boolean(profile?.phone),
      service_interest: profile?.service_interest || null,
      business_type: profile?.business_type || null,
      goal: profile?.goal || null,
    });

    return {
      synced: false,
      reason: "profile_not_ready",
      lead_id: null,
      contact_id: null,
      task_id: null,
    };
  }

  const db = opts.serviceClient;
  const name = cleanOptionalString(profile.name) || "Prospecto Messenger";
  const phone = normalizePhoneLike(profile.phone);
  const businessType = cleanOptionalString(profile.business_type);
  const serviceInterest = cleanOptionalString(profile.service_interest);
  const goal = cleanOptionalString(profile.goal);
  const notes = buildMessengerLeadNotes({
    profile,
    conversationId: opts.conversationId,
    externalUserId: opts.externalUserId,
  });

  let leadId: string | null = null;
  let createdLead = false;

  // 1) If conversation is already linked, use that lead.
  const { data: conversationRow } = await db
    .from("meta_conversations")
    .select("linked_lead_id")
    .eq("id", opts.conversationId)
    .eq("company_id", opts.companyId)
    .maybeSingle();

  if (conversationRow?.linked_lead_id) {
    leadId = String(conversationRow.linked_lead_id);
  }

  // 2) If no linked lead, try to find by phone.
  if (!leadId && phone) {
    const { data: leadByPhone, error: leadByPhoneErr } = await db
      .from("leads")
      .select("id")
      .eq("company_id", opts.companyId)
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!leadByPhoneErr && leadByPhone?.id) {
      leadId = String(leadByPhone.id);
    }
  }

  // 3) If no linked lead, try to find by Messenger ID in notes.
  if (!leadId && opts.externalUserId) {
    const { data: leadByMessenger, error: leadByMessengerErr } = await db
      .from("leads")
      .select("id")
      .eq("company_id", opts.companyId)
      .ilike("notes", `%${opts.externalUserId}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!leadByMessengerErr && leadByMessenger?.id) {
      leadId = String(leadByMessenger.id);
    }
  }

  const leadPayload: Record<string, any> = {
    company_id: opts.companyId,
    name,
    first_name: name,
    company_name: businessType || null,
    phone: phone || null,
    status: "New",
    stage: "New",
    source: "Messenger",
    source_channel: "messenger",
    notes,
  };

  if (leadId) {
    const { error: updateLeadErr } = await db
      .from("leads")
      .update({
        name,
        company_name: businessType || null,
        phone: phone || null,
        source: "Messenger",
        source_channel: "messenger",
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("company_id", opts.companyId);

    if (updateLeadErr) {
      console.warn("CRM sync lead update failed", {
        conversationId: opts.conversationId,
        leadId,
        message: updateLeadErr.message,
      });
    }
  } else {
    const { data: created, error: createLeadErr } = await db
      .from("leads")
      .insert(leadPayload)
      .select("id")
      .maybeSingle();

    if (createLeadErr) {
      console.warn("CRM sync lead create failed", {
        conversationId: opts.conversationId,
        message: createLeadErr.message,
      });

      return {
        synced: false,
        reason: "lead_create_failed",
        lead_id: null,
        contact_id: null,
        task_id: null,
      };
    }

    leadId = created?.id ? String(created.id) : null;
    createdLead = Boolean(leadId);
  }

  if (!leadId) {
    return {
      synced: false,
      reason: "lead_id_missing",
      lead_id: null,
      contact_id: null,
      task_id: null,
    };
  }

  // 4) Link conversation to lead and move status to awaiting advisor.
  const { error: linkErr } = await db
    .from("meta_conversations")
    .update({
      linked_lead_id: leadId,
      status: "awaiting_advisor",
      updated_at: new Date().toISOString(),
    })
    .eq("id", opts.conversationId)
    .eq("company_id", opts.companyId);

  if (linkErr) {
    console.warn("CRM sync conversation link failed", {
      conversationId: opts.conversationId,
      leadId,
      message: linkErr.message,
    });
  }

  // 5) Best-effort contact creation/update.
  let contactId: string | null = null;
  if (phone || name) {
    const { data: existingContact } = await db
      .from("contacts")
      .select("id")
      .eq("company_id", opts.companyId)
      .eq("phone", phone || "")
      .limit(1)
      .maybeSingle();

    if (existingContact?.id) {
      contactId = String(existingContact.id);
      await db
        .from("contacts")
        .update({
          name,
          phone: phone || null,
          lead_id: leadId,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", opts.companyId)
        .eq("id", contactId);
    } else {
      const { data: createdContact, error: contactErr } = await db
        .from("contacts")
        .insert({
          company_id: opts.companyId,
          lead_id: leadId,
          name,
          phone: phone || null,
          source: "Messenger",
          notes: `Contacto creado automáticamente por Clara Rodríguez.\n${notes}`,
        })
        .select("id")
        .maybeSingle();

      if (!contactErr && createdContact?.id) {
        contactId = String(createdContact.id);
      } else if (contactErr) {
        console.warn("CRM sync contact create failed", {
          conversationId: opts.conversationId,
          leadId,
          message: contactErr.message,
        });
      }
    }
  }

  // 6) Create follow-up task if one does not already exist for this lead from Clara.
  let taskId: string | null = null;
  const { data: existingTask } = await db
    .from("tasks")
    .select("id")
    .eq("company_id", opts.companyId)
    .eq("related_lead_id", leadId)
    .ilike("title", "%Clara%")
    .in("status", ["To Do", "In Progress"])
    .limit(1)
    .maybeSingle();

  if (existingTask?.id) {
    taskId = String(existingTask.id);
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);

    const taskDescription = [
      "Dar seguimiento a prospecto captado por Clara Rodríguez.",
      "",
      `Nombre: ${name}`,
      `Teléfono/WhatsApp: ${phone || "—"}`,
      `Servicio de interés: ${serviceInterest || "—"}`,
      `Tipo de negocio: ${businessType || "—"}`,
      `Objetivo: ${goal || "—"}`,
      `Estado actual: ${cleanOptionalString(profile.current_status) || "—"}`,
      `Referencia: ${cleanOptionalString(profile.reference) || "—"}`,
      `Urgencia: ${cleanOptionalString(profile.urgency) || "—"}`,
      "",
      `Resumen: ${cleanOptionalString(profile.summary) || "—"}`,
      "",
      `Messenger Conversation ID: ${opts.conversationId}`,
      `Messenger User ID: ${opts.externalUserId || "—"}`,
    ].join("\n");

    const { data: createdTask, error: taskErr } = await db
      .from("tasks")
      .insert({
        company_id: opts.companyId,
        title: `Seguimiento Clara — ${name}`,
        description: taskDescription,
        status: "To Do",
        priority: "High",
        due_date: dueDate,
        related_lead_id: leadId,
      })
      .select("id")
      .maybeSingle();

    if (!taskErr && createdTask?.id) {
      taskId = String(createdTask.id);
    } else if (taskErr) {
      console.warn("CRM sync task create failed", {
        conversationId: opts.conversationId,
        leadId,
        message: taskErr.message,
      });
    }
  }

  // 7) Mark profile as synced.
  await db
    .from("meta_conversation_lead_profiles")
    .update({
      lead_status: "synced_to_crm",
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", opts.companyId)
    .eq("conversation_id", opts.conversationId)
    .eq("platform", "messenger");

  console.info("CRM sync completed from Clara", {
    conversationId: opts.conversationId,
    lead_id: leadId,
    contact_id: contactId,
    task_id: taskId,
    created_lead: createdLead,
  });

  return {
    synced: true,
    reason: createdLead ? "lead_created" : "lead_updated",
    lead_id: leadId,
    contact_id: contactId,
    task_id: taskId,
  };
}

async function callDeepSeekAIOnly(opts: {
  serviceClient: any;
  companyId: string;
  conversationId: string;
  userText: string;
  state: any;
  leadProfile?: any;
}) {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");

  if (!apiKey) {
    return {
      ok: false,
      reason: "missing_key",
      reply: null,
      summary: null,
      needs_human: false,
    };
  }

  const model = Deno.env.get("DEEPSEEK_MODEL") || "deepseek-chat";

  const { data: recentMessages } = await opts.serviceClient
    .from("meta_messages")
    .select("direction, text, created_at, message_type")
    .eq("company_id", opts.companyId)
    .eq("conversation_id", opts.conversationId)
    .eq("platform", "messenger")
    .neq("message_type", "bot_state")
    .order("created_at", { ascending: false })
    .limit(8);

  const compactMessages = (recentMessages || [])
    .reverse()
    .filter((m: any) => String(m.text || "").trim())
    .map((m: any) => ({
      role: String(m.direction || "").toLowerCase() === "inbound" ? "cliente" : "asistente",
      text: String(m.text || "").slice(0, 700),
    }));

  const systemPrompt = [
    "Eres Clara Rodríguez, asistente comercial conversacional de Corevix.",
    "Corevix ayuda a negocios con desarrollo de páginas web, manejo de redes sociales, CRM, automatización y agentes virtuales.",
    "Tu objetivo no es solo conversar: debes orientar al prospecto, detectar oportunidad comercial y recopilar información útil para que un asesor pueda cerrar mejor.",
    "Responde SIEMPRE en español con tono cálido, claro, profesional, humano y amigable.",
    "No suenes como robot ni como formulario.",
    "No envíes bloques largos.",
    "Usa mensajes cortos tipo chat, no párrafos largos.",
    "Usa máximo 3 mensajes por turno.",
    "Cada mensaje debe tener idealmente menos de 220 caracteres.",
    "Nunca envíes mensajes de más de 320 caracteres.",
    "Si necesitas explicar algo, divídelo en mensajes cortos.",

    "Prefiere responder en 1 a 3 mensajes cortos cuando sea natural.",
    "Haz máximo una pregunta principal por turno.",
    "No pidas todos los datos de golpe.",
    "No menciones IA, DeepSeek, JSON, stages, bot_state, prompt, modelo ni procesos internos.",
    "No prometas tiempos exactos.",
    "No inventes precios, descuentos, garantías ni disponibilidad.",
    "Si el usuario pide hablar con una persona, reconoce la solicitud y dile que un asesor continuará por este mismo chat.",
    "Al inicio de la conversación, preséntate como Clara Rodríguez y ofrece las opciones principales de forma simple y amigable.",
    "Opciones principales: desarrollo de páginas web, manejo de redes sociales, CRM/automatización y agentes virtuales.",
    "Ejemplo de inicio en mensajes cortos: 1) ¡Hey! Soy Clara Rodríguez, asistente comercial de Corevix 👋 2) Puedo ayudarte con páginas web, redes sociales, CRM, automatización y agentes virtuales. 3) ¿Qué te gustaría mejorar en tu negocio?",
    "Debes intentar recopilar poco a poco: nombre, teléfono o WhatsApp, tipo de negocio, servicio de interés, objetivo principal, estado actual, referencia o link si existe, y qué tan pronto quiere empezar.",
    "No reinicies la conversación si el prospecto ya dio información. Usa el contexto reciente para continuar.",
    "Si el prospecto ya está registrado o ya compartió datos importantes, no vuelvas al menú inicial. Acepta información adicional y confirma que la agregas al contexto.",
    "Si el usuario está confundido, explícale con ejemplos simples y guíalo con una pregunta clara.",
    "Si muestra intención fuerte como 'quiero empezar', 'cuánto cuesta', 'cómo seguimos' o 'me interesa', pide nombre y WhatsApp de forma natural.",
    "Si ya tienes suficiente contexto pero falta contacto, pide nombre y WhatsApp.",
    "Si ya tienes nombre y WhatsApp, resume brevemente el caso y confirma que queda registrado para el asesor.",
    "Devuelve únicamente JSON válido con esta forma:",
    '{"messages":["mensaje 1","mensaje 2"],"reply":"mensaje principal opcional","summary":"resumen comercial breve","needs_human":false,"reason":"motivo breve","lead_status":"collecting","captured_fields":{"name":null,"phone":null,"business_type":null,"service_interest":null,"goal":null,"current_status":null,"reference":null,"urgency":null}}',
  ].join("\\n");

  const userPayload = {
    current_message: opts.userText,
    current_state: opts.state || {},
    lead_profile: opts.leadProfile || null,
    recent_messages: compactMessages,
  };

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        reason: payload?.error?.message || `deepseek_http_${response.status}`,
        reply: null,
        summary: null,
        needs_human: false,
      };
    }

    const content = payload?.choices?.[0]?.message?.content;

    if (!content) {
      return {
        ok: false,
        reason: "empty_deepseek_content",
        reply: null,
        summary: null,
        needs_human: false,
      };
    }

    let parsed: any = null;

    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        ok: false,
        reason: "invalid_deepseek_json",
        reply: null,
        summary: null,
        needs_human: false,
      };
    }

    const messages = normalizeAIOnlyMessages(parsed);
    const reply = messages[0] || cleanOptionalString(parsed?.reply);
    const summary = cleanOptionalString(parsed?.summary);
    const reason = cleanOptionalString(parsed?.reason) || "ai_only_reply";
    const needsHuman = Boolean(parsed?.needs_human);
    const capturedFields = normalizeCapturedFields(parsed);
    const leadStatus = cleanOptionalString(parsed?.lead_status);

    if (!messages.length) {
      return {
        ok: false,
        reason: "invalid_reply",
        reply: null,
        messages: [],
        summary,
        needs_human: needsHuman,
        captured_fields: capturedFields,
        lead_status: leadStatus,
      };
    }

    return {
      ok: true,
      reason,
      reply,
      messages,
      summary,
      needs_human: needsHuman,
      captured_fields: capturedFields,
      lead_status: leadStatus,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "deepseek_unknown_error",
      reply: null,
      summary: null,
      needs_human: false,
    };
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid JSON body" }, 400);

    const platform = cleanOptionalString((body as any).platform);
    const companyId = cleanOptionalString((body as any).company_id);
    const accountId = cleanOptionalString((body as any).account_id);
    const conversationId = cleanOptionalString((body as any).conversation_id);
    const inboundMessageId = cleanOptionalString((body as any).inbound_message_id);
    const text = cleanOptionalString((body as any).text);

    if (platform !== "messenger") {
      console.info("Messenger bot skipped", { reason: "platform_not_supported", platform });
      return jsonResponse({ ok: true, skipped: true, reason: "platform_not_supported" });
    }

    if (!companyId || !isUuid(companyId))
      return jsonResponse({ error: "company_id inválido" }, 400);
    if (!accountId || !isUuid(accountId))
      return jsonResponse({ error: "account_id inválido" }, 400);
    if (!conversationId || !isUuid(conversationId))
      return jsonResponse({ error: "conversation_id inválido" }, 400);
    if (!inboundMessageId || !isUuid(inboundMessageId))
      return jsonResponse({ error: "inbound_message_id inválido" }, 400);

    if (!text) {
      console.info("Messenger bot skipped", { reason: "empty_text", conversationId });
      return jsonResponse({ ok: true, skipped: true, reason: "empty_text" });
    }

    // Load conversation.
    const { data: conversation, error: convErr } = await serviceClient
      .from("meta_conversations")
      .select("id, company_id, account_id, platform, status, bot_status, external_user_id, page_id")
      .eq("id", conversationId)
      .eq("company_id", companyId)
      .eq("account_id", accountId)
      .eq("platform", "messenger")
      .maybeSingle();
    if (convErr) return jsonResponse({ error: convErr.message }, 500);
    if (!conversation) {
      console.info("Messenger bot skipped", { reason: "conversation_not_found", conversationId });
      return jsonResponse({ ok: true, skipped: true, reason: "conversation_not_found" });
    }

    if (String((conversation as any).bot_status || "active").toLowerCase() === "paused") {
      console.info("Messenger bot skipped", {
        reason: "bot_paused",
        conversationId,
      });
      return jsonResponse({ ok: true, skipped: true, reason: "bot_paused" });
    }

    const status = String(conversation.status || "")
      .trim()
      .toLowerCase();
    const allowed = new Set(["open", "awaiting_advisor"]);
    if (!allowed.has(status)) {
      console.info("Messenger bot skipped", {
        reason: "conversation_status_not_allowed",
        status: conversation.status,
        conversationId,
      });
      return jsonResponse({ ok: true, skipped: true, reason: "conversation_status_not_allowed" });
    }

    // Load inbound message row (source of truth for ordering).
    const { data: inboundRow, error: inboundErr } = await serviceClient
      .from("meta_messages")
      .select("id, created_at, sent_at, direction")
      .eq("id", inboundMessageId)
      .eq("company_id", companyId)
      .eq("conversation_id", conversationId)
      .eq("platform", "messenger")
      .maybeSingle();
    if (inboundErr) return jsonResponse({ error: inboundErr.message }, 500);
    if (!inboundRow) {
      console.info("Messenger bot skipped", {
        reason: "inbound_message_not_found",
        inboundMessageId,
        conversationId,
      });
      return jsonResponse({ ok: true, skipped: true, reason: "inbound_message_not_found" });
    }
    if (String(inboundRow.direction || "").toLowerCase() !== "inbound") {
      console.info("Messenger bot skipped", {
        reason: "inbound_message_not_inbound",
        inboundMessageId,
      });
      return jsonResponse({ ok: true, skipped: true, reason: "inbound_message_not_inbound" });
    }

    // Duplicate prevention: was this inbound already replied by our bot?
    const { data: existingBotReply, error: dupErr } = await serviceClient
      .from("meta_messages")
      .select("id")
      .eq("company_id", companyId)
      .eq("conversation_id", conversationId)
      .eq("platform", "messenger")
      .eq("direction", "outbound")
      .eq("message_type", "text")
      .eq("raw_payload->>source", "messenger_bot")
      .eq("raw_payload->>trigger_inbound_message_id", inboundMessageId)
      .limit(1)
      .maybeSingle();
    if (dupErr) {
      console.warn("Messenger bot duplicate check failed", {
        conversationId,
        message: dupErr.message,
      });
      return jsonResponse({ ok: true, skipped: true, reason: "dup_check_failed" });
    }
    if (existingBotReply?.id) {
      console.info("Messenger bot skipped", { reason: "already_replied", inboundMessageId });
      return jsonResponse({ ok: true, skipped: true, reason: "already_replied" });
    }

    const intentMatch = matchIntent(text);
    console.info("Messenger bot intent matched", {
      intent: intentMatch.intent,
      confidence: intentMatch.confidence,
      matchedTerm: intentMatch.matchedTerm,
      method: (intentMatch as any).method ?? null,
    });

    // Load latest state (best-effort) BEFORE any anti-repeat logic, so expected-answer stages
    // (like awaiting_reference) are handled even when the user replies quickly.
    const prevState = await loadLatestBotState({ serviceClient, companyId, conversationId });
    let nextState: BotState = { ...prevState };
    let aiMeta: {
      ai_attempted: boolean;
      ai_used: boolean;
      ai_provider: "deepseek" | null;
      ai_confidence: number | null;
      ai_reason: string | null;
      ai_stage_action?: string | null;
    } | null = null;

    // Debug trigger: force a DeepSeek call to verify Edge secrets/config.
    // Bypasses anti-repeat and normal stage logic.
    const normalizedInput = normalizeText(text);
    const isDeepSeekDebugTrigger =
      normalizedInput === "test deepseek" || normalizedInput === "probar deepseek";
    let forcedReplyText: string | null = null;
    if (isDeepSeekDebugTrigger) {
      console.info("DeepSeek debug trigger received", { conversationId });
      const interpreted = await interpretWithDeepSeek({
        stage: "debug_test",
        state: prevState as any,
        userText: "Interpreta esta respuesta: no desde cero",
        intentMatch: {
          intent: "unknown",
          confidence: 0.1,
          normalizedText: "no desde cero",
        },
      });

      if (interpreted.ok && interpreted.data) {
        console.info("DeepSeek debug trigger success", { conversationId });
        aiMeta = {
          ai_attempted: true,
          ai_used: true,
          ai_provider: "deepseek",
          ai_confidence: interpreted.data.confidence ?? null,
          ai_reason: interpreted.data.reason || null,
          ai_stage_action: interpreted.data.stage_action ?? null,
        };
        forcedReplyText = "DeepSeek respondió correctamente. La conexión de IA está activa.";
      } else {
        console.warn("DeepSeek debug trigger failed", {
          conversationId,
          reason: (interpreted as any)?.reason ?? (interpreted as any)?.error ?? "unknown_error",
        });
        aiMeta = {
          ai_attempted: true,
          ai_used: false,
          ai_provider: null,
          ai_confidence: null,
          ai_reason: (interpreted as any)?.reason
            ? String((interpreted as any).reason)
            : (interpreted as any)?.error
              ? String((interpreted as any).error)
              : "deepseek_error",
          ai_stage_action: null,
        };
        forcedReplyText =
          "No pude conectar con DeepSeek todavía. Revisa el secret DEEPSEEK_API_KEY en Supabase.";
      }
    }

    const activeExpectedAnswerStage =
      prevState.stage === "awaiting_reference" ||
      prevState.stage === "awaiting_current_presence" ||
      prevState.stage === "awaiting_website_goal" ||
      prevState.stage === "awaiting_business_type" ||
      prevState.stage === "awaiting_goal" ||
      prevState.stage === "awaiting_social_goal" ||
      prevState.stage === "awaiting_crm_goal";

    const stagePriority =
      prevState.stage === "awaiting_reference" ||
      prevState.stage === "awaiting_current_presence" ||
      prevState.stage === "awaiting_website_goal" ||
      prevState.stage === "awaiting_goal" ||
      prevState.stage === "awaiting_business_type";

    // Anti-repeat: only block true "vague waiting" messages repeated right after a bot reminder.
    // Never block unknown/ambiguous content in active stages, because DeepSeek/stage logic should see it.
    if (!isDeepSeekDebugTrigger && !stagePriority) {
      const { data: lastBot, error: lastBotErr } = await serviceClient
        .from("meta_messages")
        .select("id, created_at")
        .eq("company_id", companyId)
        .eq("conversation_id", conversationId)
        .eq("platform", "messenger")
        .eq("direction", "outbound")
        .eq("raw_payload->>source", "messenger_bot")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!lastBotErr && lastBot?.created_at) {
        const lastMs = Date.parse(String(lastBot.created_at));
        const nowMs = Date.now();
        const withinWindow = Number.isFinite(lastMs) && nowMs - lastMs < 20 * 1000;
        if (withinWindow) {
          const isVague = isVagueWaitingMessage(text) || intentMatch.intent === "waiting";
          if (isVague) {
            console.info("Messenger bot skipped: recent reminder", { conversationId });
            return jsonResponse({ ok: true, skipped: true, reason: "recent_bot_message" });
          }

          if (
            (intentMatch.intent === "unknown" || intentMatch.confidence < 0.68) &&
            activeExpectedAnswerStage
          ) {
            console.info("Messenger bot anti-repeat allowed unknown for AI fallback", {
              conversationId,
              stage: prevState.stage,
              intent: intentMatch.intent,
              confidence: intentMatch.confidence,
            });
          }
        }
      }
    } else if (!isDeepSeekDebugTrigger) {
      console.info("Messenger bot anti-repeat skipped after stage check", {
        conversationId,
        stage: prevState.stage,
      });
    }

    // If there's any outbound message after the inbound, assume human/CRM already replied; skip.
    const inboundTs =
      cleanOptionalString((inboundRow as any).sent_at) ||
      cleanOptionalString((inboundRow as any).created_at) ||
      null;
    if (inboundTs) {
      const { data: outboundAfter, error: outboundAfterErr } = await serviceClient
        .from("meta_messages")
        .select("id")
        .eq("company_id", companyId)
        .eq("conversation_id", conversationId)
        .eq("platform", "messenger")
        .eq("direction", "outbound")
        .gt("created_at", inboundTs)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (outboundAfterErr) {
        console.warn("Messenger bot outbound-after check failed", {
          conversationId,
          message: outboundAfterErr.message,
        });
        return jsonResponse({ ok: true, skipped: true, reason: "outbound_after_check_failed" });
      }
      if (outboundAfter?.id) {
        console.info("Messenger bot skipped", {
          reason: "outbound_exists_after_inbound",
          inboundMessageId,
        });
        return jsonResponse({ ok: true, skipped: true, reason: "outbound_exists_after_inbound" });
      }
    }

    // Load meta account and access token secret.
    const { data: account, error: accErr } = await serviceClient
      .from("meta_accounts")
      .select("id, company_id, platform, page_id, access_token_secret_id, status")
      .eq("id", accountId)
      .eq("company_id", companyId)
      .eq("platform", "messenger")
      .maybeSingle();
    if (accErr) return jsonResponse({ error: accErr.message }, 500);
    if (!account)
      return jsonResponse({ error: "Cuenta Meta no encontrada para la empresa indicada" }, 404);

    const secretRef = cleanOptionalString((account as any).access_token_secret_id);
    if (!secretRef || !isUuid(secretRef)) {
      console.warn("Messenger bot skipped", { reason: "missing_token_secret", conversationId });
      return jsonResponse({ ok: true, skipped: true, reason: "missing_token_secret" });
    }

    const { data: secretRow, error: secretError } = await serviceClient
      .from("meta_account_secrets")
      .select("id, access_token")
      .eq("id", secretRef)
      .eq("company_id", companyId)
      .maybeSingle();
    if (secretError) return jsonResponse({ error: secretError.message }, 500);

    const accessToken = cleanOptionalString((secretRow as any)?.access_token);
    if (!accessToken) {
      console.warn("Messenger bot skipped", { reason: "empty_token", conversationId });
      return jsonResponse({ ok: true, skipped: true, reason: "empty_token" });
    }

    // AI_ONLY mode: bypass old rule-based/stage pipeline and let DeepSeek reply conversationally.
    const messengerBotMode = "ai_only";

    if (messengerBotMode === "ai_only") {
      console.info("Messenger bot AI_ONLY mode enabled", { conversationId });

      const existingLeadProfile = await loadConversationLeadProfile({
        serviceClient,
        companyId,
        conversationId,
      });

      const aiResult = await callDeepSeekAIOnly({
        serviceClient,
        companyId,
        conversationId,
        userText: text,
        state: prevState,
        leadProfile: existingLeadProfile,
      });

      const savedLeadProfile = await upsertConversationLeadProfile({
        serviceClient,
        companyId,
        accountId,
        conversationId,
        externalUserId: cleanOptionalString((conversation as any).external_user_id),
        capturedFields: (aiResult as any).captured_fields || null,
        summary: cleanOptionalString((aiResult as any).summary),
        leadStatus: cleanOptionalString((aiResult as any).lead_status),
        needsHuman: Boolean((aiResult as any).needs_human),
      });

      const crmSyncResult = await syncCrmFromMessengerLeadProfile({
        serviceClient,
        companyId,
        accountId,
        conversationId,
        externalUserId: cleanOptionalString((conversation as any).external_user_id),
        leadProfile: savedLeadProfile,
      });

      const fallbackReply =
        "Claro, entiendo. Para orientarte mejor, cuéntame qué tipo de negocio tienes y qué te gustaría mejorar.";

      const aiMessages =
        aiResult.ok &&
        Array.isArray((aiResult as any).messages) &&
        (aiResult as any).messages.length
          ? (aiResult as any).messages
          : aiResult.ok && aiResult.reply
            ? [aiResult.reply]
            : [fallbackReply];

      if (aiResult.needs_human) {
        const { error: statusErr } = await serviceClient
          .from("meta_conversations")
          .update({ status: "awaiting_advisor" })
          .eq("id", conversationId)
          .eq("company_id", companyId);

        if (statusErr) {
          console.warn("AI_ONLY failed to set awaiting_advisor", {
            conversationId,
            message: statusErr.message,
          });
        }
      }

      const recipientId = cleanOptionalString((conversation as any).external_user_id);

      if (!recipientId) {
        return jsonResponse({ error: "external_user_id faltante" }, 400);
      }

      const nowIso = new Date().toISOString();
      let lastSentText = "";
      let sentCount = 0;

      await sendMessengerSenderAction({
        accessToken,
        recipientId,
        action: "mark_seen",
      });

      for (const [index, messageText] of aiMessages.entries()) {
        await sendMessengerSenderAction({
          accessToken,
          recipientId,
          action: "typing_on",
        });

        await sleepMs(getTypingDelayMs(messageText, index));

        const graphResponse = await fetch("https://graph.facebook.com/v20.0/me/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            messaging_type: "RESPONSE",
            message: { text: messageText },
          }),
        });

        await sendMessengerSenderAction({
          accessToken,
          recipientId,
          action: "typing_off",
        });

        const graphPayload = await graphResponse.json().catch(() => null);

        if (!graphResponse.ok) {
          await sendMessengerSenderAction({
            accessToken,
            recipientId,
            action: "typing_off",
          });

          console.warn("DeepSeek AI_ONLY Messenger send failed", {
            conversationId,
            message: metaErrorToMessage(graphPayload),
          });

          return jsonResponse(
            {
              ok: false,
              error: metaErrorToMessage(graphPayload),
              ai_mode: "ai_only",
            },
            502,
          );
        }

        lastSentText = messageText;
        sentCount += 1;

        const { error: insertOutboundErr } = await serviceClient.from("meta_messages").insert({
          company_id: companyId,
          account_id: accountId,
          conversation_id: conversationId,
          platform: "messenger",
          direction: "outbound",
          message_type: "text",
          text: messageText,
          attachments: [],
          raw_payload: {
            source: "messenger_bot",
            phase: "ai_only_deepseek",
            trigger_inbound_message_id: inboundMessageId,
            graph_response: graphPayload,
            ai_attempted: true,
            ai_used: aiResult.ok,
            ai_provider: aiResult.ok ? "deepseek" : null,
            ai_reply_used: aiResult.ok,
            ai_reason: aiResult.reason,
            ai_mode: "ai_only",
            ai_message_index: index,
            ai_message_count: aiMessages.length,
            conversation_summary: aiResult.summary || null,
            captured_fields: (aiResult as any).captured_fields || null,
            lead_profile: savedLeadProfile || null,
            crm_sync_result: crmSyncResult || null,
            lead_status: (aiResult as any).lead_status || null,
            needs_human: aiResult.needs_human,
          },
          sent_at: nowIso,
        });

        if (insertOutboundErr) {
          console.warn("AI_ONLY outbound insert failed", {
            conversationId,
            message: insertOutboundErr.message,
          });
        }
      }

      await serviceClient
        .from("meta_conversations")
        .update({
          last_message_text: lastSentText || aiMessages[aiMessages.length - 1] || fallbackReply,
          last_message_at: nowIso,
          updated_at: nowIso,
          status: aiResult.needs_human ? "awaiting_advisor" : conversation.status,
        })
        .eq("id", conversationId)
        .eq("company_id", companyId);

      console.info("DeepSeek AI_ONLY reply generated", {
        conversationId,
        inboundMessageId,
        ai_used: aiResult.ok,
        needs_human: aiResult.needs_human,
        message_count: sentCount,
      });

      return jsonResponse({
        ok: true,
        replied: true,
        ai_mode: "ai_only",
        ai_used: aiResult.ok,
        message_count: sentCount,
      });
    }

    console.info("Messenger bot status evaluated", { status: conversation.status });
    console.info("Business hours evaluated", { isOpen: isBusinessOpenNow() });

    const openNow = isBusinessOpenNow();
    const nextOpenLabel = getNextBusinessOpenLabel();

    const isAdvisorIntent = intentMatch.intent === "advisor_request";
    let replyText = phase1MenuText();
    let handledByGlobalPriority = false;

    // DeepSeek debug trigger: reply with controlled diagnostics and persist aiMeta even if state didn't change.
    if (isDeepSeekDebugTrigger && forcedReplyText) {
      replyText = forcedReplyText;
      handledByGlobalPriority = true;
      await saveBotState({
        serviceClient,
        companyId,
        accountId,
        conversationId,
        inboundMessageId,
        state: nextState,
        aiMeta,
      });
    }

    // Global priority checks (before any stage-specific handling).
    // If the user asks for a human/advisor, always honor it first.
    if (!handledByGlobalPriority && (isAdvisorIntent || detectAdvisorHelp(text))) {
      console.info("Messenger bot global advisor/help detected", { conversationId });

      // Best-effort: mark conversation as awaiting advisor.
      const { error: statusErr } = await serviceClient
        .from("meta_conversations")
        .update({ status: "awaiting_advisor" })
        .eq("id", conversationId)
        .eq("company_id", companyId);
      if (statusErr)
        console.warn("Messenger bot failed to set awaiting_advisor", {
          conversationId,
          message: statusErr.message,
        });

      nextState.stage = "ready_for_advisor";
      nextState.ready_for_advisor = true;
      replyText =
        "Sí, ya tenemos tu solicitud registrada. Un asesor de Corevix continuará contigo por este mismo chat lo antes posible. " +
        "Con lo que me contaste ya tenemos buen contexto para ayudarte mejor.";
      handledByGlobalPriority = true;
    }

    // Business hours question should be answered before stage prompts.
    if (!handledByGlobalPriority && intentMatch.intent === "business_hours_question") {
      replyText = businessHoursReply(openNow, nextOpenLabel);
      console.info("Messenger bot global business_hours_question handled", { conversationId });
      handledByGlobalPriority = true;
    }

    // Avoid treating greetings/waiting as a business type when we are asking for it.
    if (
      !handledByGlobalPriority &&
      prevState.stage === "awaiting_business_type" &&
      (intentMatch.intent === "waiting" || isVagueWaitingMessage(text))
    ) {
      console.info("Messenger bot greeting ignored as business_type", { conversationId });
      replyText = "Claro. Para ayudarte mejor, cuéntame primero: ¿qué tipo de negocio tienes?";
      handledByGlobalPriority = true;
    }

    // Guard: if ready_for_advisor is true, do not ask new discovery questions.
    if (!handledByGlobalPriority && prevState.ready_for_advisor === true) {
      // Normalize inconsistent states.
      if (nextState.stage !== "ready_for_advisor") {
        nextState.stage = "ready_for_advisor";
      }

      const summary = buildAdvisorContextSummary(nextState);

      // Reference corrections (accept links/domains/normalized handles).
      const domainLike = detectDomainLikeReference(text);
      const partial = detectPartialReference(text);
      if (
        intentMatch.intent === "reference_link" ||
        domainLike ||
        partial?.kind === "normalized_handle"
      ) {
        const refValue =
          (intentMatch.intent === "reference_link" ? String(text || "").trim() : null) ||
          domainLike ||
          (partial?.kind === "normalized_handle" ? partial.value : null);
        if (refValue) nextState.reference = refValue;
        replyText =
          "Perfecto, gracias. Agregué esa referencia para que el asesor la revise. En cuanto esté disponible, continuará contigo por este mismo chat.";
      } else if (intentMatch.intent === "business_hours_question") {
        replyText = businessHoursReply(openNow, nextOpenLabel);
        if (summary) replyText = `${replyText}\n\n${summary}`;
      } else if (intentMatch.intent === "business_type" || looksLikeBusinessType(text)) {
        const incoming = String(text || "").trim();
        if (
          incoming &&
          normalizeText(incoming) !== normalizeText(String(nextState.business_type || ""))
        ) {
          nextState.business_type = incoming;
        }
        replyText =
          "Perfecto, lo tomo en cuenta. Con eso el asesor tendrá mejor contexto para orientarte.";
        if (summary) replyText = `${replyText}\n\n${summary}`;
      } else if (intentMatch.intent === "goal" || looksLikeGoal(text)) {
        const incoming = String(text || "").trim();
        if (incoming && normalizeText(incoming) !== normalizeText(String(nextState.goal || ""))) {
          nextState.goal = incoming;
        }
        replyText =
          "Perfecto, gracias por aclararlo. Ya tenemos ese objetivo en cuenta para que el asesor pueda orientarte mejor.";
        if (summary) replyText = `${replyText}\n\n${summary}`;
      } else if (intentMatch.intent === "advisor_request" || intentMatch.intent === "waiting") {
        replyText =
          "Ya tenemos tu solicitud registrada y el contexto que nos compartiste. Un asesor de Corevix continuará contigo por este mismo chat lo antes posible.";
        if (summary) replyText = `${replyText}\n\n${summary}`;
      } else {
        replyText =
          "Gracias, lo tengo en cuenta. Ya tenemos buen contexto para que un asesor pueda orientarte mejor por este mismo chat.";
        if (summary) replyText = `${replyText}\n\n${summary}`;
      }

      // Persist bot_state if it changed (best-effort).
      if (!stateEquals(prevState, nextState)) {
        await saveBotState({
          serviceClient,
          companyId,
          accountId,
          conversationId,
          inboundMessageId,
          state: nextState,
          aiMeta,
        });
      }
    } else if (!handledByGlobalPriority) {
      console.info("Messenger bot stage handled after global priority", {
        conversationId,
        stage: prevState.stage,
      });

      // Prefer DeepSeek as contextual analyst inside active stages, unless the message is globally clear.
      // This keeps replies controlled: we only apply structured actions and optionally use a validated reply_draft.
      const normalizedTextInput = normalizeText(text);
      const globallyClear = isGloballyClearCase({
        normalizedInput: normalizedTextInput,
        intent: intentMatch.intent,
        stage: prevState.stage,
        text,
      });
      const shouldPreferDeepSeek = isActiveStage(prevState.stage) && !globallyClear;
      let handledByAI = false;

      if (shouldPreferDeepSeek) {
        const recentMessages = await loadRecentConversationForAI({
          serviceClient,
          companyId,
          conversationId,
          limit: 8,
        });
        const aiContext = buildAISummaryContext({
          stage: prevState.stage,
          state: prevState,
          intentMatch,
          recentMessages,
          text,
        });

        const interpreted = await interpretWithDeepSeek({
          stage: prevState.stage,
          state: prevState as any,
          userText: JSON.stringify(aiContext),
          intentMatch: {
            intent: intentMatch.intent,
            confidence: intentMatch.confidence,
            normalizedText: (intentMatch as any).normalizedText,
          },
        });

        aiMeta = {
          ai_attempted: true,
          ai_used: interpreted.ok ? true : false,
          ai_provider: interpreted.ok ? "deepseek" : null,
          ai_confidence: interpreted.ok ? interpreted.data.confidence : null,
          ai_reason: interpreted.ok
            ? interpreted.data.reason || null
            : (interpreted as any)?.reason
              ? String((interpreted as any).reason)
              : (interpreted as any)?.error
                ? String((interpreted as any).error)
                : null,
          ai_stage_action: interpreted.ok ? interpreted.data.stage_action : null,
          ai_reply_used: false,
          conversation_summary: interpreted.ok
            ? interpreted.data.conversation_summary || null
            : null,
        };

        if (interpreted.ok && interpreted.data.understood && interpreted.data.confidence >= 0.72) {
          handledByAI = true;
          console.info("DeepSeek active-stage analyst applied", {
            conversationId,
            stage: prevState.stage,
            action: interpreted.data.stage_action,
            confidence: interpreted.data.confidence,
          });

          // Apply safe structured actions.
          const action = interpreted.data.stage_action;
          const extracted: any = interpreted.data.extracted || {};

          if (
            typeof interpreted.data.conversation_summary === "string" &&
            interpreted.data.conversation_summary.trim()
          ) {
            nextState.conversation_summary = interpreted.data.conversation_summary
              .trim()
              .slice(0, 500);
          }
          if (
            Array.isArray(extracted.additional_interests) &&
            extracted.additional_interests.length
          ) {
            nextState.additional_interests = extracted.additional_interests.slice(0, 5);
          }

          if (action === "advisor_request") {
            const { error: statusErr } = await serviceClient
              .from("meta_conversations")
              .update({ status: "awaiting_advisor" })
              .eq("id", conversationId)
              .eq("company_id", companyId);
            if (statusErr)
              console.warn("Messenger bot failed to set awaiting_advisor", {
                conversationId,
                message: statusErr.message,
              });
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "Sí, ya tenemos tu solicitud registrada. Un asesor de Corevix continuará contigo por este mismo chat lo antes posible. " +
              "Con lo que me contaste ya tenemos buen contexto para ayudarte mejor.";
          } else if (action === "business_hours_question") {
            replyText = businessHoursReply(openNow, nextOpenLabel);
          } else if (action === "save_business_type") {
            nextState.business_type =
              normalizeExtractedSpanish(cleanOptionalString(extracted.business_type)) ||
              String(text || "").trim() ||
              null;
            nextState.stage = "awaiting_goal";
            replyText =
              "Perfecto, gracias por contarme. ¿Y qué te gustaría lograr primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
          } else if (action === "save_goal") {
            nextState.goal =
              normalizeExtractedSpanish(cleanOptionalString(extracted.goal)) ||
              String(text || "").trim() ||
              null;
            // For web, keep the web flow.
            if (nextState.interest === "web_interest" && !nextState.current_presence) {
              nextState.stage = "awaiting_current_presence";
              replyText = "Perfecto. ¿Ya tienes una página actualmente o empezaríamos desde cero?";
            } else {
              nextState.stage = "awaiting_reference";
              const goal = String(nextState.goal || "").trim();
              replyText = goal
                ? `Claro, tomo en cuenta que buscas ${goal}. Para orientar mejor la conversación, ¿ya tienes una página actualmente o empezaríamos desde cero?`
                : "Claro, tomo eso en cuenta. Para orientar mejor la conversación, ¿ya tienes una página actualmente o empezaríamos desde cero?";
            }
          } else if (action === "save_current_presence") {
            nextState.current_presence =
              normalizeExtractedSpanish(cleanOptionalString(extracted.current_presence)) ||
              String(text || "").trim() ||
              null;
            nextState.stage = "awaiting_reference";
            const presence = String(nextState.current_presence || "").trim();
            if (normalizeText(presence) === normalizeText("ya tiene una página actualmente")) {
              replyText =
                "Entiendo, ya tienes una página actualmente. Para que el asesor tenga mejor contexto, ¿puedes compartir esa página, tu Instagram o alguna referencia?";
            } else {
              replyText = presence
                ? `Entiendo, lo tomo en cuenta: ${presence}. ¿Tienes algún Instagram, página actual o referencia que podamos revisar?`
                : "Entiendo. ¿Tienes algún Instagram, página actual o referencia que podamos revisar?";
            }
          } else if (action === "save_reference") {
            nextState.reference =
              normalizeExtractedSpanish(cleanOptionalString(extracted.reference)) ||
              String(text || "").trim() ||
              null;
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
          } else if (action === "no_reference") {
            nextState.reference = null;
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "No hay problema. Con lo que me contaste ya tenemos buen contexto para que el asesor te oriente mejor. En cuanto esté disponible, continuará contigo por este mismo chat.";
          } else if (action === "ready_for_advisor") {
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "Perfecto. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
          } else if (action === "ask_clarification") {
            // Avoid loops: if we already asked a clarification in this stage, close to advisor.
            const sameStage =
              normalizeText(String(nextState.ai_clarify_stage || "")) ===
              normalizeText(prevState.stage);
            const count = Number(nextState.ai_clarify_count || 0);
            if (sameStage && count >= 1) {
              nextState.stage = "ready_for_advisor";
              nextState.ready_for_advisor = true;
              replyText =
                "No hay problema. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
            } else {
              nextState.ai_clarify_stage = prevState.stage;
              nextState.ai_clarify_count = (Number.isFinite(count) ? count : 0) + 1;
              // Controlled clarification (do NOT advance to awaiting_reference).
              // Keep it natural and goal-oriented, with a single main question.
              if (prevState.stage === "awaiting_current_presence") {
                replyText =
                  "Solo para confirmar: ¿ya tienes una página actualmente o empezaríamos desde cero?";
              } else if (prevState.stage === "awaiting_business_type") {
                replyText =
                  "Para ubicarte mejor, ¿me puedes decir qué tipo de negocio tienes? Por ejemplo: tienda, restaurante, inmobiliaria, supermercado, salón, etc.";
              } else {
                replyText =
                  "Claro, entiendo. Para orientarte mejor, ¿te interesa principalmente redes sociales, una página web o automatización/CRM?";
              }
            }
          }

          // Optionally use DeepSeek reply_draft if it passes validation.
          const draft = cleanOptionalString((interpreted.data as any).reply_draft);
          if (draft) {
            if (isValidReplyDraft(draft)) {
              replyText = draft;
              if (aiMeta) aiMeta.ai_reply_used = true;
              console.info("DeepSeek reply draft used", { conversationId, stage: prevState.stage });
            } else {
              console.info("DeepSeek reply draft rejected", {
                conversationId,
                stage: prevState.stage,
              });
            }
          } else if (aiMeta?.ai_used) {
            console.info("DeepSeek contextual template used", {
              conversationId,
              stage: prevState.stage,
              action: interpreted.data.stage_action,
            });
          }

          // Save state changes early (best-effort) so the rest of the pipeline uses updated state.
          if (!stateEquals(prevState, nextState)) {
            await saveBotState({
              serviceClient,
              companyId,
              accountId,
              conversationId,
              inboundMessageId,
              state: nextState,
              aiMeta,
            });
          }
        }
      }

      // Stage-priority logic (website flow, advisor flow, references).
      if (handledByAI) {
        console.info("DeepSeek handled inbound; skipping rule-based stage", {
          conversationId,
          stage: prevState.stage,
        });
      } else if (prevState.stage === "awaiting_website_goal") {
        const purpose = classifyWebsitePurpose(text);
        if (purpose) {
          nextState.goal = purpose;
          nextState.stage = "awaiting_current_presence";
          replyText = `Perfecto. Entonces la página debe estar enfocada en ${purpose}. ¿Ya tienes una página actualmente o empezaríamos desde cero?`;
        } else {
          const shouldCallDeepSeek =
            intentMatch.intent === "unknown" ||
            intentMatch.confidence < 0.68 ||
            isVagueWaitingMessage(text);

          if (shouldCallDeepSeek) {
            const interpreted = await interpretWithDeepSeek({
              stage: prevState.stage,
              state: prevState as any,
              userText: text,
              intentMatch: {
                intent: intentMatch.intent,
                confidence: intentMatch.confidence,
                normalizedText: (intentMatch as any).normalizedText,
              },
            });
            aiMeta = {
              ai_attempted: true,
              ai_used: interpreted.ok ? true : false,
              ai_provider: interpreted.ok ? "deepseek" : null,
              ai_confidence: interpreted.ok ? interpreted.data.confidence : null,
              ai_reason: interpreted.ok
                ? interpreted.data.reason || null
                : (interpreted as any)?.reason
                  ? String((interpreted as any).reason)
                  : (interpreted as any)?.error
                    ? String((interpreted as any).error)
                    : null,
              ai_stage_action: interpreted.ok ? interpreted.data.stage_action : null,
            };

            if (
              interpreted.ok &&
              interpreted.data.understood &&
              interpreted.data.confidence >= 0.75
            ) {
              if (interpreted.data.stage_action === "save_goal") {
                nextState.goal =
                  interpreted.data.extracted.goal || String(text || "").trim() || null;
                nextState.stage = "awaiting_current_presence";
                replyText =
                  "Perfecto. ¿Ya tienes una página actualmente o empezaríamos desde cero?";
              } else if (interpreted.data.stage_action === "ask_clarification") {
                const sameStage =
                  normalizeText(String(nextState.ai_clarify_stage || "")) ===
                  normalizeText(prevState.stage);
                const count = Number(nextState.ai_clarify_count || 0);
                if (sameStage && count >= 1) {
                  nextState.stage = "ready_for_advisor";
                  nextState.ready_for_advisor = true;
                  replyText =
                    "No hay problema. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
                } else {
                  nextState.ai_clarify_stage = prevState.stage;
                  nextState.ai_clarify_count = (Number.isFinite(count) ? count : 0) + 1;
                  replyText =
                    "Solo para confirmar: ¿la web sería más para presentar tu negocio, recibir clientes potenciales o vender directamente?";
                }
              } else if (interpreted.data.stage_action === "ready_for_advisor") {
                nextState.stage = "ready_for_advisor";
                nextState.ready_for_advisor = true;
                replyText =
                  "Perfecto. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
              } else {
                // Re-ask in a natural way.
                replyText =
                  "Para orientarte mejor: ¿la página sería más para presentar tu negocio, recibir clientes potenciales o vender directamente?";
              }
            } else {
              // Re-ask in a natural way.
              replyText =
                "Para orientarte mejor: ¿la página sería más para presentar tu negocio, recibir clientes potenciales o vender directamente?";
            }
          } else {
            // Re-ask in a natural way.
            replyText =
              "Para orientarte mejor: ¿la página sería más para presentar tu negocio, recibir clientes potenciales o vender directamente?";
          }
        }
      } else if (prevState.stage === "awaiting_current_presence") {
        const inferred = interpretCurrentPresenceRuleBased(text);
        if (inferred) {
          nextState.current_presence = inferred;
          nextState.stage = "awaiting_reference";
          replyText =
            "Entiendo. ¿Tienes algún Instagram, página actual o referencia que quieras compartir para que el asesor lo revise?";
        } else {
          // DeepSeek fallback interpreter for ambiguous answers.
          const shouldCallDeepSeek =
            (intentMatch.intent === "unknown" || intentMatch.confidence < 0.68) &&
            intentMatch.intent !== "advisor_request" &&
            intentMatch.intent !== "business_hours_question" &&
            intentMatch.intent !== "reference_link" &&
            intentMatch.intent !== "waiting";

          if (shouldCallDeepSeek) {
            const interpreted = await interpretWithDeepSeek({
              stage: prevState.stage,
              state: prevState as any,
              userText: text,
              intentMatch: {
                intent: intentMatch.intent,
                confidence: intentMatch.confidence,
                normalizedText: (intentMatch as any).normalizedText,
              },
            });
            aiMeta = {
              ai_attempted: true,
              ai_used: interpreted.ok ? true : false,
              ai_provider: interpreted.ok ? "deepseek" : null,
              ai_confidence: interpreted.ok ? interpreted.data.confidence : null,
              ai_reason: interpreted.ok
                ? interpreted.data.reason || null
                : (interpreted as any)?.reason
                  ? String((interpreted as any).reason)
                  : (interpreted as any)?.error
                    ? String((interpreted as any).error)
                    : null,
              ai_stage_action: interpreted.ok ? interpreted.data.stage_action : null,
            };
            if (
              interpreted.ok &&
              interpreted.data.understood &&
              interpreted.data.confidence >= 0.75
            ) {
              if (interpreted.data.stage_action === "save_current_presence") {
                nextState.current_presence =
                  interpreted.data.extracted.current_presence || String(text || "").trim() || null;
                nextState.stage = "awaiting_reference";
                replyText =
                  "Entiendo. ¿Tienes algún Instagram, página actual o referencia que quieras compartir para que el asesor lo revise?";
              } else if (interpreted.data.stage_action === "ask_clarification") {
                const sameStage =
                  normalizeText(String(nextState.ai_clarify_stage || "")) ===
                  normalizeText(prevState.stage);
                const count = Number(nextState.ai_clarify_count || 0);
                if (sameStage && count >= 1) {
                  nextState.stage = "ready_for_advisor";
                  nextState.ready_for_advisor = true;
                  replyText =
                    "No hay problema. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
                } else {
                  nextState.ai_clarify_stage = prevState.stage;
                  nextState.ai_clarify_count = (Number.isFinite(count) ? count : 0) + 1;
                  replyText =
                    "Perfecto. Solo para confirmar: ¿ya tienes una página actualmente o empezaríamos desde cero?";
                }
              } else {
                // Safe fallback.
                nextState.current_presence = String(text || "").trim() || null;
                nextState.stage = "awaiting_reference";
                replyText =
                  "Entiendo. ¿Tienes algún Instagram, página actual o referencia que quieras compartir para que el asesor lo revise?";
              }
            } else {
              // No AI or low confidence: proceed deterministically.
              nextState.current_presence = String(text || "").trim() || null;
              nextState.stage = "awaiting_reference";
              replyText =
                "Entiendo. ¿Tienes algún Instagram, página actual o referencia que quieras compartir para que el asesor lo revise?";
            }
          } else {
            nextState.current_presence = String(text || "").trim() || null;
            nextState.stage = "awaiting_reference";
            replyText =
              "Entiendo. ¿Tienes algún Instagram, página actual o referencia que quieras compartir para que el asesor lo revise?";
          }
        }
      } else if (prevState.stage === "awaiting_reference") {
        // Stage-priority (do not let anti-repeat block expected answers).
        console.info("Messenger bot stage priority handled", {
          conversationId,
          stage: "awaiting_reference",
        });

        // Priority:
        // A) No-reference
        // B) Advisor/help request
        // C) Valid reference (links/domains/handles)
        // D) Malformed partial reference
        // E) Soft fallback (do not repeat the exact question)
        if (detectNoReference(text)) {
          console.info("Messenger bot awaiting_reference: no_reference_detected", {
            conversationId,
          });
          nextState.reference = null;
          nextState.stage = "ready_for_advisor";
          nextState.ready_for_advisor = true;
          replyText =
            "No hay problema. Con lo que me contaste ya tenemos buen contexto para que el asesor te oriente mejor. En cuanto esté disponible, continuará contigo por este mismo chat.";
        } else if (detectAdvisorHelp(text)) {
          console.info("Messenger bot awaiting_reference: advisor_help_detected", {
            conversationId,
          });
          // Mark the conversation as awaiting an advisor (best-effort).
          const { error: statusErr } = await serviceClient
            .from("meta_conversations")
            .update({ status: "awaiting_advisor" })
            .eq("id", conversationId)
            .eq("company_id", companyId);
          if (statusErr)
            console.warn("Messenger bot failed to set awaiting_advisor", {
              conversationId,
              message: statusErr.message,
            });

          nextState.stage = "ready_for_advisor";
          nextState.ready_for_advisor = true;
          replyText =
            "Sí, ya tenemos tu solicitud registrada. Un asesor de Corevix continuará contigo por este mismo chat lo antes posible. " +
            "Con lo que me contaste ya tenemos buen contexto para ayudarte mejor.";
        } else {
          const domainLike = detectDomainLikeReference(text);
          const partial = detectPartialReference(text);

          if (intentMatch.intent === "reference_link") {
            nextState.reference = String(text || "").trim() || null;
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
          } else if (domainLike) {
            nextState.reference = domainLike;
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
          } else if (partial?.kind === "needs_at_prefix") {
            replyText =
              `Creo que intentaste compartir un usuario. Si es de Instagram, puedes enviarlo así: ${partial.suggested}. ` +
              "Si no tienes referencia, no hay problema, también podemos seguir.";
          } else if (partial?.kind === "normalized_handle") {
            nextState.reference = partial.value;
            nextState.stage = "ready_for_advisor";
            nextState.ready_for_advisor = true;
            replyText =
              "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
          } else {
            console.info("Messenger bot awaiting_reference: fallback", { conversationId });
            replyText =
              "No te preocupes. Si tienes un Instagram, una web o alguna referencia, puedes compartirla. " +
              "Si no tienes nada todavía, dime 'no tengo' y seguimos con lo que ya me contaste.";
          }
        }
      } else if (prevState.stage === "awaiting_social_goal") {
        nextState.goal = String(text || "").trim() || null;
        nextState.stage = "awaiting_reference";
        replyText =
          "Perfecto. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
      } else if (prevState.stage === "awaiting_crm_goal") {
        nextState.goal = String(text || "").trim() || null;
        nextState.stage = "awaiting_reference";
        replyText =
          "Entiendo. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
      } else if (prevState.stage === "awaiting_business_type") {
        if (intentMatch.intent === "business_type" || looksLikeBusinessType(text)) {
          nextState.business_type = String(text || "").trim() || null;
          nextState.stage = "awaiting_goal";
          replyText =
            "Perfecto, gracias por contarme. ¿Y qué te gustaría mejorar primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
        } else if (intentMatch.intent === "goal") {
          nextState.goal = String(text || "").trim() || null;
          nextState.stage = "awaiting_reference";
          replyText =
            "Entiendo. Eso nos ayuda bastante. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
        } else {
          const shouldCallDeepSeek =
            intentMatch.intent === "unknown" || intentMatch.confidence < 0.68;
          if (shouldCallDeepSeek) {
            const interpreted = await interpretWithDeepSeek({
              stage: prevState.stage,
              state: prevState as any,
              userText: text,
              intentMatch: {
                intent: intentMatch.intent,
                confidence: intentMatch.confidence,
                normalizedText: (intentMatch as any).normalizedText,
              },
            });
            aiMeta = {
              ai_attempted: true,
              ai_used: interpreted.ok ? true : false,
              ai_provider: interpreted.ok ? "deepseek" : null,
              ai_confidence: interpreted.ok ? interpreted.data.confidence : null,
              ai_reason: interpreted.ok
                ? interpreted.data.reason || null
                : (interpreted as any)?.reason
                  ? String((interpreted as any).reason)
                  : (interpreted as any)?.error
                    ? String((interpreted as any).error)
                    : null,
              ai_stage_action: interpreted.ok ? interpreted.data.stage_action : null,
            };
            if (
              interpreted.ok &&
              interpreted.data.understood &&
              interpreted.data.confidence >= 0.75
            ) {
              if (interpreted.data.stage_action === "save_business_type") {
                nextState.business_type =
                  interpreted.data.extracted.business_type || String(text || "").trim() || null;
                nextState.stage = "awaiting_goal";
                replyText =
                  "Perfecto, gracias por contarme. ¿Y qué te gustaría lograr primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
              } else if (interpreted.data.stage_action === "save_goal") {
                nextState.goal =
                  interpreted.data.extracted.goal || String(text || "").trim() || null;
                nextState.stage = "awaiting_reference";
                replyText =
                  "Entiendo. Eso nos ayuda bastante. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
              } else if (interpreted.data.stage_action === "ready_for_advisor") {
                nextState.stage = "ready_for_advisor";
                nextState.ready_for_advisor = true;
                replyText =
                  "Perfecto. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
              } else if (interpreted.data.stage_action === "ask_clarification") {
                replyText =
                  "Para ubicarme un poquito mejor, ¿qué tipo de negocio tienes? (por ejemplo: colmado, tienda, restaurante...)";
              } else {
                replyText = "Para ubicarme un poquito mejor, ¿qué tipo de negocio tienes?";
              }
            } else {
              replyText = "Para ubicarme un poquito mejor, ¿qué tipo de negocio tienes?";
            }
          } else {
            replyText = "Para ubicarme un poquito mejor, ¿qué tipo de negocio tienes?";
          }
        }
      } else if (prevState.stage === "awaiting_goal") {
        if (intentMatch.intent === "goal") {
          nextState.goal = String(text || "").trim() || null;
          nextState.stage = "awaiting_reference";
          replyText =
            "Entiendo. Eso nos ayuda bastante. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
        } else if (intentMatch.intent === "reference_link") {
          nextState.reference = String(text || "").trim() || null;
          nextState.stage = "ready_for_advisor";
          nextState.ready_for_advisor = true;
          replyText =
            "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
        } else {
          const shouldCallDeepSeek =
            intentMatch.intent === "unknown" || intentMatch.confidence < 0.68;
          if (shouldCallDeepSeek) {
            const interpreted = await interpretWithDeepSeek({
              stage: prevState.stage,
              state: prevState as any,
              userText: text,
              intentMatch: {
                intent: intentMatch.intent,
                confidence: intentMatch.confidence,
                normalizedText: (intentMatch as any).normalizedText,
              },
            });
            aiMeta = {
              ai_attempted: true,
              ai_used: interpreted.ok ? true : false,
              ai_provider: interpreted.ok ? "deepseek" : null,
              ai_confidence: interpreted.ok ? interpreted.data.confidence : null,
              ai_reason: interpreted.ok
                ? interpreted.data.reason || null
                : (interpreted as any)?.reason
                  ? String((interpreted as any).reason)
                  : (interpreted as any)?.error
                    ? String((interpreted as any).error)
                    : null,
              ai_stage_action: interpreted.ok ? interpreted.data.stage_action : null,
            };
            if (
              interpreted.ok &&
              interpreted.data.understood &&
              interpreted.data.confidence >= 0.75
            ) {
              if (interpreted.data.stage_action === "save_goal") {
                nextState.goal =
                  interpreted.data.extracted.goal || String(text || "").trim() || null;
                nextState.stage = "awaiting_reference";
                replyText =
                  "Entiendo. Eso nos ayuda bastante. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
              } else if (interpreted.data.stage_action === "ready_for_advisor") {
                nextState.stage = "ready_for_advisor";
                nextState.ready_for_advisor = true;
                replyText =
                  "Perfecto. Con lo que me contaste ya tenemos suficiente contexto para que un asesor continúe contigo por este mismo chat.";
              } else if (interpreted.data.stage_action === "ask_clarification") {
                replyText =
                  "Perfecto. ¿Qué te gustaría lograr primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
              } else {
                replyText =
                  "Perfecto. ¿Qué te gustaría lograr primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
              }
            } else {
              replyText =
                "Perfecto. ¿Qué te gustaría lograr primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
            }
          } else {
            replyText =
              "Perfecto. ¿Qué te gustaría lograr primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
          }
        }
      } else if (isAdvisorIntent) {
        // Do NOT set human_mode; we are awaiting an advisor.
        const { error: statusErr } = await serviceClient
          .from("meta_conversations")
          .update({ status: "awaiting_advisor" })
          .eq("id", conversationId)
          .eq("company_id", companyId);
        if (statusErr)
          console.warn("Messenger bot failed to set awaiting_advisor", {
            conversationId,
            message: statusErr.message,
          });

        // Keep bot_state conversational flow while waiting.
        nextState.stage = nextState.business_type ? "awaiting_goal" : "awaiting_business_type";
        replyText = openNow ? awaitingAdvisorOpenText() : awaitingAdvisorClosedText(nextOpenLabel);
        console.info("Messenger bot awaiting advisor", { conversationId, open: openNow });
      } else if (intentMatch.intent === "web_interest") {
        replyText =
          "Excelente. Para entender mejor tu caso: ¿la página web sería para presentar tu negocio, recibir clientes potenciales o vender directamente?";
        console.info("Messenger bot menu option handled", { conversationId, option: "1" });
        nextState.interest = "web_interest";
        nextState.stage = "awaiting_website_goal";
      } else if (intentMatch.intent === "social_interest") {
        replyText =
          "Perfecto. ¿Quieres mejorar tus redes para atraer más clientes, organizar mejor el contenido o convertir más mensajes en ventas?";
        console.info("Messenger bot menu option handled", { conversationId, option: "2" });
        nextState.interest = "social_interest";
        nextState.stage = "awaiting_social_goal";
      } else if (intentMatch.intent === "crm_interest") {
        replyText =
          "Muy bien. ¿Lo que más necesitas ahora es organizar clientes, dar seguimiento a mensajes o automatizar parte del proceso de ventas?";
        console.info("Messenger bot menu option handled", { conversationId, option: "3" });
        nextState.interest = "crm_interest";
        nextState.stage = "awaiting_crm_goal";
      } else if (status === "awaiting_advisor") {
        // Conversational waiting flow: one question at a time, avoid menu.
        // If we don't have a saved state yet, fall back to the existing conversational heuristic.
        const { data: recentBot, error: recentBotErr } = await serviceClient
          .from("meta_messages")
          .select("text, created_at")
          .eq("company_id", companyId)
          .eq("conversation_id", conversationId)
          .eq("platform", "messenger")
          .eq("direction", "outbound")
          .eq("raw_payload->>source", "messenger_bot")
          .order("created_at", { ascending: false })
          .limit(5);
        const recentBotText =
          !recentBotErr && Array.isArray(recentBot)
            ? normalizeText(recentBot.map((r: any) => String(r?.text || "")).join("\n"))
            : "";

        const alreadyAskedBusiness = recentBotText.includes("que tipo de negocio tienes");
        const alreadyAskedGoal =
          recentBotText.includes("que te gustaria lograr") ||
          recentBotText.includes("que te gustaria mejorar primero");
        const alreadyAskedReference =
          recentBotText.includes("instagram") &&
          recentBotText.includes("pagina web") &&
          recentBotText.includes("referencia");

        if (intentMatch.intent === "reference_link") {
          replyText =
            "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
        } else if (intentMatch.intent === "waiting" || isVagueWaitingMessage(text)) {
          replyText = openNow
            ? "Disculpa la espera. Ya tenemos tu solicitud registrada y un asesor te responderá lo antes posible. Para que pueda ayudarte mejor cuando entre, cuéntame: ¿tu negocio ya tiene presencia en Instagram, página web o algún canal digital?"
            : `Disculpa la espera. Ahora mismo estamos fuera de horario y nuestro equipo estará disponible nuevamente ${nextOpenLabel}. Mientras tanto, cuéntame: ¿tu negocio ya tiene Instagram, página web o algún canal digital?`;
        } else if (intentMatch.intent === "business_type" || looksLikeBusinessType(text)) {
          replyText =
            "Perfecto, gracias por contarme. ¿Y qué te gustaría mejorar primero: atraer más clientes, organizar mejor los mensajes, mejorar tu presencia digital o automatizar seguimientos?";
        } else if (intentMatch.intent === "goal" || looksLikeGoal(text)) {
          replyText =
            "Entiendo. Eso nos ayuda bastante. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
        } else {
          if (!alreadyAskedBusiness) {
            replyText = "Perfecto. Para ubicarme un poquito mejor, ¿qué tipo de negocio tienes?";
          } else if (!alreadyAskedGoal) {
            replyText =
              "Gracias. ¿Y qué te gustaría lograr primero ahora mismo: atraer más clientes, organizar mejor los mensajes, mejorar tu web o automatizar seguimientos?";
          } else if (!alreadyAskedReference) {
            replyText =
              "Buenísimo. ¿Tienes algún Instagram, página web o referencia que quieras compartir para que el asesor lo revise cuando se conecte?";
          } else {
            replyText =
              "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
          }
        }
      } else if (intentMatch.intent === "reference_link") {
        // Even in open status: acknowledge links in a helpful way.
        replyText =
          "Excelente, gracias. Ya con eso el asesor tendrá mejor contexto para orientarte. En cuanto esté disponible, continuará contigo por este mismo chat.";
      } else if (intentMatch.intent === "waiting") {
        // In open status, keep menu for now.
        replyText = phase1MenuText();
      } else if (intentMatch.intent === "unknown") {
        replyText =
          "Te entiendo. Para ubicarte mejor, ¿te interesa más una página web, redes sociales o automatización/CRM?";
      }
    }

    // Persist bot_state if it changed (best-effort).
    if (!stateEquals(prevState, nextState)) {
      await saveBotState({
        serviceClient,
        companyId,
        accountId,
        conversationId,
        inboundMessageId,
        state: nextState,
        aiMeta,
      });
    }

    // Send reply through Graph API (server-side).
    const graphVersion = cleanOptionalString(Deno.env.get("META_GRAPH_VERSION")) || "v22.0";
    const pageId = cleanOptionalString((account as any).page_id);
    const endpoint = pageId
      ? `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(pageId)}/messages`
      : `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/me/messages`;

    const sendRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_type: "RESPONSE",
        recipient: { id: conversation.external_user_id },
        message: { text: replyText },
      }),
    });

    const rawText = await sendRes.text();
    let rawJson: any = null;
    try {
      rawJson = JSON.parse(rawText);
    } catch {
      rawJson = null;
    }

    if (!sendRes.ok) {
      console.warn("Messenger bot failed", {
        conversationId,
        status: sendRes.status,
        message: metaErrorToMessage(rawJson || rawText),
      });
      return jsonResponse({ ok: false, error: metaErrorToMessage(rawJson || rawText) }, 502);
    }

    const nowIso = new Date().toISOString();

    console.info("Messenger bot outbound ai metadata", {
      ai_attempted: aiMeta?.ai_attempted ?? false,
      ai_used: aiMeta?.ai_used ?? false,
      ai_provider: aiMeta?.ai_provider ?? null,
      ai_reply_used: aiMeta?.ai_reply_used ?? false,
      ai_stage_action: aiMeta?.ai_stage_action ?? null,
    });
    if (aiMeta?.ai_attempted) {
      console.info("Outbound AI metadata attached", {
        ai_attempted: aiMeta.ai_attempted,
        ai_used: aiMeta.ai_used,
        ai_provider: aiMeta.ai_provider,
        ai_reply_used: aiMeta.ai_reply_used ?? false,
        ai_stage_action: aiMeta.ai_stage_action ?? null,
      });
    }

    const outboundInsert = await serviceClient
      .from("meta_messages")
      .insert({
        company_id: companyId,
        account_id: accountId,
        conversation_id: conversationId,
        platform: "messenger",
        external_message_id: cleanOptionalString(rawJson?.message_id),
        direction: "outbound",
        message_type: "text",
        text: replyText,
        attachments: [],
        raw_payload: {
          ...(rawJson && typeof rawJson === "object" ? rawJson : { raw: rawText }),
          source: "messenger_bot",
          phase: "rule_based_phase_1",
          trigger_inbound_message_id: inboundMessageId,
          ...(aiMeta?.ai_attempted
            ? {
                ai_attempted: aiMeta.ai_attempted,
                ai_used: aiMeta.ai_used,
                ai_provider: aiMeta.ai_provider,
                ai_confidence: aiMeta.ai_confidence,
                ai_stage_action: aiMeta.ai_stage_action ?? null,
                ai_reason: aiMeta.ai_reason ?? null,
                ai_reply_used: aiMeta.ai_reply_used ?? false,
              }
            : {}),
        },
        sent_at: nowIso,
      })
      .select("id")
      .maybeSingle();
    if (outboundInsert.error) {
      console.warn("Messenger bot failed to save outbound message", {
        conversationId,
        message: outboundInsert.error.message,
      });
      return jsonResponse({ ok: false, error: outboundInsert.error.message }, 500);
    }

    const { error: convUpdateError } = await serviceClient
      .from("meta_conversations")
      .update({
        last_message_text: replyText,
        last_message_at: nowIso,
      })
      .eq("id", conversationId)
      .eq("company_id", companyId);
    if (convUpdateError) {
      console.warn("Messenger bot failed to update conversation", {
        conversationId,
        message: convUpdateError.message,
      });
    }

    const handoff = isAdvisorIntent || nextState.ready_for_advisor === true;
    console.info("Messenger bot replied", { conversationId, inboundMessageId, handoff });
    return jsonResponse({ ok: true, replied: true, handoff });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    console.warn("Messenger bot failed", { message });
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
