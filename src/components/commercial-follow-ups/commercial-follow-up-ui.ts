import { supabase } from "@/integrations/supabase/client";
import type { CommercialEntityRef } from "@/lib/commercial-follow-ups";

export const CHANNELS = [
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo" },
  { value: "meeting", label: "Reunión" },
  { value: "other", label: "Otro" },
] as const;

export const OUTCOMES = [
  { value: "contacted", label: "Contactado" },
  { value: "no_answer", label: "Sin respuesta" },
  { value: "busy", label: "Ocupado" },
  { value: "callback_requested", label: "Solicitó devolución" },
  { value: "rescheduled", label: "Reprogramado" },
  { value: "wrong_contact", label: "Contacto incorrecto" },
  { value: "other", label: "Otro" },
] as const;

export const ENTITY_LABELS = { lead: "Prospecto", deal: "Oportunidad", client: "Cliente" } as const;
export const ENTITY_PERMISSION_MODULE = {
  lead: "leads",
  deal: "deals",
  client: "clients",
} as const;
export const STATUS_LABELS = {
  scheduled: "Programado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
} as const;

export function labelFor(value: string, options: readonly { value: string; label: string }[]) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function localDateTimeInput(value: Date = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function currentTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export type CommercialEntityOption = {
  entity: CommercialEntityRef;
  label: string;
  detail?: string;
};

export async function searchCommercialEntities(
  companyId: string,
  type: CommercialEntityRef["type"],
  query: string,
): Promise<CommercialEntityOption[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const db = supabase as any;
  if (type === "lead") {
    const results = await Promise.all(
      ["first_name", "last_name", "company_name"].map((column) =>
        db
          .from("leads")
          .select("id,first_name,last_name,company_name")
          .eq("company_id", companyId)
          .ilike(column, `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(20),
      ),
    );
    const failure = results.find((result) => result.error);
    if (failure?.error) throw failure.error;
    const rows = [
      ...new Map(
        results.flatMap((result) => result.data || []).map((row: any) => [row.id, row]),
      ).values(),
    ].slice(0, 20);
    return rows.map((row: any) => ({
      entity: { type: "lead", id: row.id },
      label:
        [row.first_name, row.last_name].filter(Boolean).join(" ") ||
        row.company_name ||
        "Prospecto",
      detail: row.company_name || undefined,
    }));
  }
  if (type === "deal") {
    const { data, error } = await db
      .from("deals")
      .select("id,name")
      .eq("company_id", companyId)
      .ilike("name", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      entity: { type: "deal", id: row.id },
      label: row.name || "Oportunidad",
    }));
  }
  const results = await Promise.all(
    ["company_name", "contact_person"].map((column) =>
      db
        .from("clients")
        .select("id,company_name,contact_person")
        .eq("company_id", companyId)
        .ilike(column, `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
  );
  const failure = results.find((result) => result.error);
  if (failure?.error) throw failure.error;
  const rows = [
    ...new Map(
      results.flatMap((result) => result.data || []).map((row: any) => [row.id, row]),
    ).values(),
  ].slice(0, 20);
  return rows.map((row: any) => ({
    entity: { type: "client", id: row.id },
    label: row.company_name || row.contact_person || "Cliente",
    detail: row.contact_person || undefined,
  }));
}

export async function loadEntityLabels(
  companyId: string,
  refs: CommercialEntityRef[],
): Promise<Record<string, string>> {
  const grouped = {
    lead: [...new Set(refs.filter((ref) => ref.type === "lead").map((ref) => ref.id))],
    deal: [...new Set(refs.filter((ref) => ref.type === "deal").map((ref) => ref.id))],
    client: [...new Set(refs.filter((ref) => ref.type === "client").map((ref) => ref.id))],
  };
  const db = supabase as any;
  const results = await Promise.all(
    (Object.keys(grouped) as CommercialEntityRef["type"][]).map(async (type) => {
      const ids = grouped[type];
      if (!ids.length) return { type, rows: [] as any[] };
      const table = type === "lead" ? "leads" : type === "deal" ? "deals" : "clients";
      const fields =
        type === "lead"
          ? "id,first_name,last_name,company_name"
          : type === "deal"
            ? "id,name"
            : "id,company_name,contact_person";
      const { data, error } = await db
        .from(table)
        .select(fields)
        .eq("company_id", companyId)
        .in("id", ids);
      if (error) throw error;
      return { type, rows: data || [] };
    }),
  );
  const labels: Record<string, string> = {};
  for (const result of results) {
    for (const row of result.rows) {
      labels[`${result.type}:${row.id}`] =
        result.type === "lead"
          ? [row.first_name, row.last_name].filter(Boolean).join(" ") ||
            row.company_name ||
            "Prospecto"
          : result.type === "deal"
            ? row.name || "Oportunidad"
            : row.company_name || row.contact_person || "Cliente";
    }
  }
  return labels;
}
