import type { AttentionSeverity } from "@/lib/crm/attention-rules";

export type AttentionModule =
  | "clients"
  | "leads"
  | "tasks"
  | "invoices"
  | "proposals"
  | "projects"
  | "inbox"
  | "calendar"
  | "tickets";

export type AttentionTiming =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "stale"
  | "past"
  | "upcoming"
  | "open"
  | "renewal_due"
  | "sla_due";

export type AttentionState = "new" | "acknowledged" | "snoozed" | "resolved" | "auto_resolved";

export type AttentionSourceRef = {
  type: string;
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
};

export type AttentionSignal = {
  key: string;
  label: string;
  reason: string;
  timing: AttentionTiming;
  recommendedAction: string;
};

export type AttentionContextEntity = {
  id?: string | null;
  label?: string | null;
  href?: string | null;
  status?: string | null;
};

export type AttentionContextAmount = {
  value: number;
  currency?: string | null;
  label: string;
};

export type AttentionEventContext = {
  client?: AttentionContextEntity;
  lead?: AttentionContextEntity;
  project?: AttentionContextEntity;
  owner?: AttentionContextEntity;
  amount?: AttentionContextAmount;
  keyDate?: string | null;
  lastActivityAt?: string | null;
  urgencyReason?: string;
  recommendation?: string;
  relations?: AttentionContextEntity[];
  metadata?: Record<string, string | number | boolean | null>;
};

export type AttentionActionType =
  | "create_task"
  | "send_reminder"
  | "schedule_call"
  | "draft_email"
  | "reassign_owner"
  | "move_due_date"
  | "escalate_ticket"
  | "record_outcome"
  | "mark_resolved"
  | "review_record";

export type AttentionRecommendedAction = {
  id: string;
  type: AttentionActionType;
  label: string;
  reason: string;
  module: AttentionModule;
  target: AttentionSourceRef;
  priority: AttentionSeverity;
  requiresConfirmation: boolean;
  payload?: Record<string, string | number | boolean | null>;
};

export type AttentionEvent = {
  id: string;
  ruleId: string;
  module: AttentionModule;
  memoryKey?: string;
  attentionState?: AttentionState;
  sourceType?: string;
  sourceId?: string | null;
  source?: AttentionSourceRef;
  signal?: AttentionSignal;
  context?: AttentionEventContext;
  actions?: AttentionRecommendedAction[];
  title: string;
  summary: string;
  severity: AttentionSeverity;
  href?: string;
  recommendedAction?: string;
  status?: string | null;
  count?: number;
  dueAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  occurredAt?: string | null;
  unreadCount?: number | null;
  evidence?: string[];
};

export type ScoredAttentionEvent = AttentionEvent & {
  score: number;
};

const severityWeight: Record<AttentionSeverity, number> = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 15,
};

function dateToMs(value?: string | null) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dueScore(event: AttentionEvent, nowMs: number) {
  const dueMs = dateToMs(event.dueAt);
  if (dueMs == null) return 0;

  const diffMs = dueMs - nowMs;
  const diffDays = diffMs / 86400000;

  if (diffDays < 0) return clamp(20 + Math.abs(diffDays) * 6, 20, 45);
  if (diffDays <= 1) return 18;
  if (diffDays <= 3) return 12;
  if (diffDays <= 7) return 6;
  return 0;
}

function recencyScore(event: AttentionEvent, nowMs: number) {
  const updatedMs = dateToMs(event.updatedAt || event.createdAt);
  if (updatedMs == null) return 0;

  const ageHours = (nowMs - updatedMs) / 36e5;
  if (ageHours < 24) return 0;
  if (ageHours < 72) return 4;
  if (ageHours < 168) return 8;
  return 12;
}

function countScore(event: AttentionEvent) {
  const count = Number(event.count || 0) + Number(event.unreadCount || 0);
  if (!count || count <= 1) return 0;
  return clamp(Math.round(Math.log2(count + 1) * 4), 4, 16);
}

function moduleBias(event: AttentionEvent) {
  if (event.module === "invoices") return 6;
  if (event.module === "tasks") return 4;
  if (event.module === "projects") return 4;
  if (event.module === "clients") return 3;
  if (event.module === "leads") return 3;
  return 0;
}

export function scoreAttentionEvent(event: AttentionEvent, now = Date.now()) {
  const base = severityWeight[event.severity] || severityWeight.medium;
  return (
    base + dueScore(event, now) + recencyScore(event, now) + countScore(event) + moduleBias(event)
  );
}

export function rankAttentionEvents(events: AttentionEvent[], now = Date.now()) {
  return events
    .map((event) => ({ ...event, score: scoreAttentionEvent(event, now) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (severityWeight[b.severity] !== severityWeight[a.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      const dueA = dateToMs(a.dueAt);
      const dueB = dateToMs(b.dueAt);
      if (dueA != null && dueB != null && dueA !== dueB) return dueA - dueB;
      if (dueA != null && dueB == null) return -1;
      if (dueA == null && dueB != null) return 1;
      const updatedA = dateToMs(a.updatedAt || a.createdAt);
      const updatedB = dateToMs(b.updatedAt || b.createdAt);
      if (updatedA != null && updatedB != null && updatedA !== updatedB) return updatedA - updatedB;
      return a.title.localeCompare(b.title);
    });
}
