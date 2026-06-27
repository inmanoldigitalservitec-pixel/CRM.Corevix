import type { CrmWhatsappMessageRow } from "@/lib/whatsapp/view-types";

export type ExtractedLeadData = {
  company?: string | null;
  serviceInterest?: string | null;
  mainNeed?: string | null;
  currentChannel?: string | null;
  urgency?: string | null;
  contactPreference?: string | null;
  email?: string | null;
  phone?: string | null;
  budget?: string | null;
  rawSummary?: string | null;
  sourceMessageId?: string | null;
};

function cleanValue(v: string | null | undefined) {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (s === "—" || s === "-") return null;
  return s;
}

function pickFirst<T>(...values: Array<T | null | undefined>) {
  for (const v of values) {
    if (v == null) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (v as any) === "string") {
      if (String(v).trim().length) return v;
      continue;
    }
    return v;
  }
  return null;
}

function extractByLabel(block: string, labels: string[]) {
  for (const label of labels) {
    const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)\\s*$`, "im");
    const m = re.exec(block);
    if (m?.[1]) {
      const v = cleanValue(m[1]);
      if (v) return v;
    }
  }
  return null;
}

function extractEmail(text: string) {
  const m = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.exec(text);
  return cleanValue(m?.[1] ?? null);
}

function extractPhone(text: string) {
  // Very permissive; we only use it as a hint (UI), not as canonical.
  const m = /(\+?\d[\d\s().-]{7,}\d)/.exec(text);
  return cleanValue(m?.[1] ?? null);
}

function looksLikeBotSummary(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("resumen de tu solicitud") ||
    t.includes("resumen de la solicitud") ||
    t.includes("empresa:") ||
    (t.includes("servicio") && t.includes("inter")) ||
    t.includes("necesidad") ||
    t.includes("urgencia") ||
    t.includes("preferencia")
  );
}

export function extractLeadDataFromMessages(messages: CrmWhatsappMessageRow[]): ExtractedLeadData {
  if (!Array.isArray(messages) || messages.length === 0) return { rawSummary: null };

  // Prefer outbound messages (bot/human) where structured summaries are most likely.
  const candidates = messages
    .filter((m) => (m.direction || "") === "outbound")
    .map((m) => ({
      id: m.message_id,
      created_at: m.created_at,
      text: (
        m.content ||
        (m.message_type === "interactive_button" ? m.button_title : null) ||
        ""
      ).trim(),
    }))
    .filter((m) => m.text.length > 0)
    .filter((m) => looksLikeBotSummary(m.text));

  const best = candidates.length ? candidates[candidates.length - 1] : null;
  const block = best?.text || "";

  const company = extractByLabel(block, ["Empresa", "Negocio", "Business", "Company"]);
  const serviceInterest = extractByLabel(block, [
    "Servicio de interés",
    "Servicio",
    "Servicio interesado",
    "Servicio interesado/a",
  ]);
  const mainNeed = extractByLabel(block, [
    "Necesidad principal",
    "Necesidad",
    "Objetivo",
    "Problema",
  ]);
  const currentChannel = extractByLabel(block, ["Canal actual", "Canal", "Plataforma"]);
  const urgency = extractByLabel(block, ["Urgencia", "Prioridad"]);
  const contactPreference = extractByLabel(block, [
    "Preferencia",
    "Preferencia de contacto",
    "Contacto preferido",
  ]);
  const budget = extractByLabel(block, ["Presupuesto", "Budget"]);

  const email = pickFirst(
    extractByLabel(block, ["Email", "Correo", "Correo electrónico"]),
    best ? extractEmail(best.text) : null,
  );
  const phone = pickFirst(
    extractByLabel(block, ["Teléfono", "Telefono", "WhatsApp", "Celular", "Móvil", "Movil"]),
    best ? extractPhone(best.text) : null,
  );

  return {
    company,
    serviceInterest,
    mainNeed,
    currentChannel,
    urgency,
    contactPreference,
    email,
    phone,
    budget,
    rawSummary: block ? block : null,
    sourceMessageId: best?.id ?? null,
  };
}
