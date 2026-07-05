import type { ScoredAttentionEvent } from "@/lib/crm/attention-engine";
import {
  attentionMemoryKey,
  markAttentionStateRemote,
  type AttentionMemoryScope,
} from "@/lib/crm/attention-memory";

type AttentionNotificationScope = AttentionMemoryScope & {
  companyId: string;
  userId: string;
};

type AttentionNotificationDraft = {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  link: string | null;
  read: boolean;
};

type AttentionNotificationInput = {
  title: string;
  message?: string | null;
  type: string;
  link?: string | null;
};

function stableHash(input: string, seed: number) {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableUuidFromString(input: string) {
  const part1 = stableHash(input, 0x811c9dc5).toString(16).padStart(8, "0");
  const part2 = stableHash(input, 0x01000193).toString(16).padStart(8, "0");
  const part3 = stableHash(input, 0x9e3779b9).toString(16).padStart(8, "0");
  const part4 = stableHash(input, 0x85ebca6b).toString(16).padStart(8, "0");
  const part5 = stableHash(input, 0xc2b2ae35).toString(16).padStart(8, "0");
  const hex = `${part1}${part2}${part3}${part4}${part5}`.slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20, 32)}`;
}

function shouldMaterializeAttentionEvent(event: ScoredAttentionEvent) {
  if (
    event.attentionState === "acknowledged" ||
    event.attentionState === "snoozed" ||
    event.attentionState === "resolved" ||
    event.attentionState === "auto_resolved"
  ) {
    return false;
  }
  return event.severity !== "low" || event.score >= 35 || (event.count ?? 0) > 1;
}

export function buildAttentionNotificationDrafts(
  events: ScoredAttentionEvent[],
  scope: AttentionNotificationScope,
  limit = 5,
): AttentionNotificationDraft[] {
  return events
    .filter(shouldMaterializeAttentionEvent)
    .slice(0, limit)
    .map((event) => ({
      id: stableUuidFromString(
        [scope.companyId, scope.userId, event.id, event.ruleId, event.module].join("|"),
      ),
      company_id: scope.companyId,
      user_id: scope.userId,
      title: event.title,
      message: event.summary || (event.evidence?.length ? event.evidence.join(" · ") : null),
      type: `attention:${event.module}`,
      link: event.href || null,
      read: false,
    }));
}

export async function syncAttentionNotifications(
  db: any,
  events: ScoredAttentionEvent[],
  scope: AttentionNotificationScope,
  limit = 5,
) {
  const materializedEvents = events.filter(shouldMaterializeAttentionEvent).slice(0, limit);
  const drafts = buildAttentionNotificationDrafts(events, scope, limit);
  if (!drafts.length) return { drafts: 0, error: null as unknown };

  const ids = drafts.map((draft) => draft.id);
  const { data: existing, error: loadError } = await db
    .from("notifications")
    .select("id, read")
    .eq("user_id", scope.userId)
    .eq("company_id", scope.companyId)
    .in("id", ids);

  if (loadError) return { drafts: drafts.length, error: loadError };

  const readById = new Map<string, boolean>(
    (existing || []).map((row: { id: string; read: boolean }) => [row.id, row.read]),
  );

  const rows = drafts.map((draft) => ({
    ...draft,
    read: readById.get(draft.id) ?? false,
  }));

  await Promise.all(
    drafts.map((draft, index) => {
      if (!readById.get(draft.id)) return Promise.resolve();
      const event = materializedEvents[index];
      if (!event) return Promise.resolve();
      return markAttentionStateRemote(
        db,
        scope,
        event.memoryKey || attentionMemoryKey(event),
        "acknowledged",
      );
    }),
  );

  const { error } = await db.from("notifications").upsert(rows, { onConflict: "id" });
  return { drafts: rows.length, error };
}

export async function createAttentionNotification(
  db: any,
  scope: AttentionNotificationScope,
  input: AttentionNotificationInput,
) {
  if (!scope.companyId || !scope.userId) return { error: null as unknown };

  return db.from("notifications").insert({
    company_id: scope.companyId,
    user_id: scope.userId,
    title: input.title,
    message: input.message ?? null,
    type: input.type,
    link: input.link ?? null,
    read: false,
  });
}
