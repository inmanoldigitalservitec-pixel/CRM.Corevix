import type { AttentionState, ScoredAttentionEvent } from "@/lib/crm/attention-engine";

export type AttentionMemoryEntry = {
  key: string;
  state: AttentionState;
  firstSeenAt: string;
  lastSeenAt: string;
  notifiedAt?: string | null;
  acknowledgedAt?: string | null;
  ignoredAt?: string | null;
  snoozedUntil?: string | null;
  resolvedAt?: string | null;
  autoResolvedAt?: string | null;
  lastTitle?: string | null;
  lastSummary?: string | null;
};

export type AttentionMemoryScope = {
  companyId: string;
  userId: string;
};

export type AttentionMemorySnapshot = Record<string, AttentionMemoryEntry>;

const STORAGE_VERSION = "v1";

function storageKey(scope: AttentionMemoryScope) {
  return `corevix:attention-memory:${STORAGE_VERSION}:${scope.companyId}:${scope.userId}`;
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

export function attentionMemoryKey(
  event: Pick<ScoredAttentionEvent, "id" | "ruleId" | "module" | "sourceType" | "sourceId">,
) {
  return [event.module, event.ruleId, event.sourceType || "", event.sourceId || "", event.id].join(
    "::",
  );
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readAttentionMemory(scope: AttentionMemoryScope): AttentionMemorySnapshot {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeAttentionMemory(scope: AttentionMemoryScope, memory: AttentionMemorySnapshot) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey(scope), JSON.stringify(memory));
}

function rowToEntry(row: any): AttentionMemoryEntry {
  return {
    key: row.key,
    state: row.state,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    notifiedAt: row.notified_at,
    acknowledgedAt: row.acknowledged_at,
    ignoredAt: row.ignored_at,
    snoozedUntil: row.snoozed_until,
    resolvedAt: row.resolved_at,
    autoResolvedAt: row.auto_resolved_at,
    lastTitle: row.last_title,
    lastSummary: row.last_summary,
  };
}

function entryToRow(scope: AttentionMemoryScope, entry: AttentionMemoryEntry) {
  return {
    company_id: scope.companyId,
    user_id: scope.userId,
    key: entry.key,
    state: entry.state,
    first_seen_at: entry.firstSeenAt,
    last_seen_at: entry.lastSeenAt,
    notified_at: entry.notifiedAt || null,
    acknowledged_at: entry.acknowledgedAt || null,
    ignored_at: entry.ignoredAt || null,
    snoozed_until: entry.snoozedUntil || null,
    resolved_at: entry.resolvedAt || null,
    auto_resolved_at: entry.autoResolvedAt || null,
    last_title: entry.lastTitle || null,
    last_summary: entry.lastSummary || null,
  };
}

export async function loadAttentionMemoryFromSupabase(
  db: any,
  scope: AttentionMemoryScope,
): Promise<{ memory: AttentionMemorySnapshot; error: unknown | null }> {
  const { data, error } = await db
    .from("attention_memory")
    .select(
      "key,state,first_seen_at,last_seen_at,notified_at,acknowledged_at,ignored_at,snoozed_until,resolved_at,auto_resolved_at,last_title,last_summary",
    )
    .eq("company_id", scope.companyId)
    .eq("user_id", scope.userId);

  if (error) return { memory: readAttentionMemory(scope), error };

  const memory = Object.fromEntries((data || []).map((row: any) => [row.key, rowToEntry(row)]));
  writeAttentionMemory(scope, memory);
  return { memory, error: null };
}

export async function saveAttentionMemoryToSupabase(
  db: any,
  scope: AttentionMemoryScope,
  memory: AttentionMemorySnapshot,
) {
  const rows = Object.values(memory).map((entry) => entryToRow(scope, entry));
  if (!rows.length) return { error: null as unknown };

  const { error } = await db
    .from("attention_memory")
    .upsert(rows, { onConflict: "company_id,user_id,key" });
  return { error };
}

export function markAttentionState(
  scope: AttentionMemoryScope,
  key: string,
  state: AttentionState,
  options?: { snoozedUntil?: string | null; ignored?: boolean; now?: Date },
) {
  const current = readAttentionMemory(scope);
  const timestamp = nowIso(options?.now);
  const entry = current[key] || {
    key,
    state: "new" as AttentionState,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
  };

  current[key] = {
    ...entry,
    state,
    lastSeenAt: timestamp,
    acknowledgedAt: state === "acknowledged" ? timestamp : entry.acknowledgedAt || undefined,
    ignoredAt: options?.ignored ? timestamp : entry.ignoredAt || undefined,
    snoozedUntil: state === "snoozed" ? options?.snoozedUntil || null : entry.snoozedUntil || null,
    resolvedAt: state === "resolved" ? timestamp : entry.resolvedAt || undefined,
    autoResolvedAt: state === "auto_resolved" ? timestamp : entry.autoResolvedAt || undefined,
  };

  writeAttentionMemory(scope, current);
  return current[key];
}

export async function markAttentionStateRemote(
  db: any,
  scope: AttentionMemoryScope,
  key: string,
  state: AttentionState,
  options?: { snoozedUntil?: string | null; ignored?: boolean; now?: Date },
) {
  const entry = markAttentionState(scope, key, state, options);
  const { error } = await db
    .from("attention_memory")
    .upsert([entryToRow(scope, entry)], { onConflict: "company_id,user_id,key" });
  return { entry, error };
}

export function markAttentionNotified(
  scope: AttentionMemoryScope,
  events: ScoredAttentionEvent[],
  now = new Date(),
) {
  const memory = readAttentionMemory(scope);
  const timestamp = nowIso(now);

  for (const event of events) {
    const key = event.memoryKey || attentionMemoryKey(event);
    const entry = memory[key] || {
      key,
      state: "new" as AttentionState,
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
    };
    memory[key] = {
      ...entry,
      key,
      state: entry.state || "new",
      lastSeenAt: timestamp,
      notifiedAt: entry.notifiedAt || timestamp,
      lastTitle: event.title,
      lastSummary: event.summary,
    };
  }

  writeAttentionMemory(scope, memory);
}

export async function markAttentionNotifiedRemote(
  db: any,
  scope: AttentionMemoryScope,
  events: ScoredAttentionEvent[],
  now = new Date(),
) {
  markAttentionNotified(scope, events, now);
  const memory = readAttentionMemory(scope);
  const keys = new Set(events.map((event) => event.memoryKey || attentionMemoryKey(event)));
  const rows = Object.values(memory)
    .filter((entry) => keys.has(entry.key))
    .map((entry) => entryToRow(scope, entry));

  if (!rows.length) return { error: null as unknown };

  const { error } = await db
    .from("attention_memory")
    .upsert(rows, { onConflict: "company_id,user_id,key" });
  return { error };
}

export function applyAttentionMemory(
  events: ScoredAttentionEvent[],
  scope: AttentionMemoryScope | null,
  now = new Date(),
) {
  if (!scope) {
    return events.map((event) => ({
      ...event,
      memoryKey: event.memoryKey || attentionMemoryKey(event),
      attentionState: event.attentionState || ("new" as AttentionState),
    }));
  }

  const memory = readAttentionMemory(scope);

  return events
    .map((event) => {
      const key = event.memoryKey || attentionMemoryKey(event);
      const entry = memory[key];
      const state = entry?.state || "new";

      return {
        ...event,
        memoryKey: key,
        attentionState: state,
      };
    })
    .filter((event) => {
      const entry = memory[event.memoryKey || ""];
      if (!entry) return true;
      if (entry.state === "resolved" || entry.state === "auto_resolved") return false;
      if (entry.state === "snoozed") {
        const untilMs = Date.parse(String(entry.snoozedUntil || ""));
        return Number.isFinite(untilMs) ? untilMs <= now.getTime() : false;
      }
      return true;
    });
}

export function reconcileAttentionMemory(
  scope: AttentionMemoryScope,
  events: ScoredAttentionEvent[],
  now = new Date(),
) {
  const memory = readAttentionMemory(scope);
  const timestamp = nowIso(now);
  const activeKeys = new Set<string>();

  for (const event of events) {
    const key = event.memoryKey || attentionMemoryKey(event);
    activeKeys.add(key);
    const entry = memory[key];
    const state = entry?.state || "new";
    memory[key] = {
      ...(entry || {
        key,
        state,
        firstSeenAt: timestamp,
      }),
      key,
      state,
      lastSeenAt: timestamp,
      lastTitle: event.title,
      lastSummary: event.summary,
    };
  }

  for (const [key, entry] of Object.entries(memory)) {
    if (activeKeys.has(key)) continue;
    if (entry.state === "resolved" || entry.state === "auto_resolved") continue;
    memory[key] = {
      ...entry,
      state: "auto_resolved",
      autoResolvedAt: entry.autoResolvedAt || timestamp,
    };
  }

  writeAttentionMemory(scope, memory);
  return memory;
}

export async function reconcileAttentionMemoryRemote(
  db: any,
  scope: AttentionMemoryScope,
  events: ScoredAttentionEvent[],
  now = new Date(),
) {
  const memory = reconcileAttentionMemory(scope, events, now);
  const { error } = await saveAttentionMemoryToSupabase(db, scope, memory);
  return { memory, error };
}
