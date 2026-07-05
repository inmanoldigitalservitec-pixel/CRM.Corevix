import type {
  AttentionEventContext,
  AttentionModule,
  AttentionRecommendedAction,
  ScoredAttentionEvent,
} from "@/lib/crm/attention-engine";
import type { AttentionSeverity } from "@/lib/crm/attention-rules";

export type AttentionTimelineKind =
  | "calendar"
  | "activity"
  | "commitment"
  | "risk"
  | "notification";

export type AttentionTimelineBucket = "overdue" | "today" | "upcoming" | "recent" | "open";

export type AttentionTimelineItem = {
  id: string;
  eventId: string;
  memoryKey?: string;
  module: AttentionModule;
  kind: AttentionTimelineKind;
  bucket: AttentionTimelineBucket;
  title: string;
  summary: string;
  severity: AttentionSeverity;
  score: number;
  sortScore: number;
  timelineAt: string | null;
  dueAt?: string | null;
  href?: string;
  status?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  sourceLabel?: string | null;
  signalLabel?: string;
  recommendedAction?: string;
  actions?: AttentionRecommendedAction[];
  context?: AttentionEventContext;
  isOverdue: boolean;
  isDueToday: boolean;
  isUpcoming: boolean;
  event: ScoredAttentionEvent;
};

export type AttentionTimelineGroup = {
  bucket: AttentionTimelineBucket;
  label: string;
  items: AttentionTimelineItem[];
};

export type BuildAttentionTimelineOptions = {
  now?: Date;
  includeLowPriority?: boolean;
  limit?: number;
};

const bucketLabels: Record<AttentionTimelineBucket, string> = {
  overdue: "Atrasado",
  today: "Hoy",
  upcoming: "Próximo",
  recent: "Actividad reciente",
  open: "Abierto",
};

const bucketWeight: Record<AttentionTimelineBucket, number> = {
  overdue: 500,
  today: 400,
  upcoming: 300,
  recent: 200,
  open: 100,
};

const severityWeight: Record<AttentionSeverity, number> = {
  critical: 40,
  high: 30,
  medium: 20,
  low: 10,
};

const kindWeight: Record<AttentionTimelineKind, number> = {
  risk: 35,
  commitment: 25,
  notification: 20,
  calendar: 15,
  activity: 10,
};

function dateToMs(value?: string | null) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function endOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy.getTime();
}

function pickTimelineAt(event: ScoredAttentionEvent) {
  return event.dueAt || event.occurredAt || event.updatedAt || event.createdAt || null;
}

function resolveKind(event: ScoredAttentionEvent): AttentionTimelineKind {
  if (event.module === "calendar") return "calendar";
  if (event.module === "inbox") return "notification";
  if (
    event.severity === "critical" ||
    event.module === "projects" ||
    event.ruleId.includes("risk") ||
    event.signal?.timing === "sla_due"
  ) {
    return "risk";
  }
  if (
    event.dueAt ||
    event.signal?.timing === "due_today" ||
    event.signal?.timing === "due_soon" ||
    event.signal?.timing === "renewal_due" ||
    event.signal?.timing === "upcoming"
  ) {
    return "commitment";
  }
  return "activity";
}

function resolveBucket(args: {
  event: ScoredAttentionEvent;
  timelineAtMs: number | null;
  now: Date;
}): AttentionTimelineBucket {
  const { event, timelineAtMs, now } = args;
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  if (event.signal?.timing === "overdue" || event.signal?.timing === "past") return "overdue";
  if (event.signal?.timing === "due_today") return "today";
  if (
    event.signal?.timing === "due_soon" ||
    event.signal?.timing === "upcoming" ||
    event.signal?.timing === "renewal_due" ||
    event.signal?.timing === "sla_due"
  ) {
    return "upcoming";
  }

  if (timelineAtMs == null) return "open";
  if (timelineAtMs < todayStart) return event.dueAt ? "overdue" : "recent";
  if (timelineAtMs <= todayEnd) return "today";
  return "upcoming";
}

function buildTimelineItem(event: ScoredAttentionEvent, now: Date): AttentionTimelineItem {
  const timelineAt = pickTimelineAt(event);
  const timelineAtMs = dateToMs(timelineAt);
  const bucket = resolveBucket({ event, timelineAtMs, now });
  const kind = resolveKind(event);
  const nowMs = now.getTime();
  const distanceHours = timelineAtMs == null ? 0 : Math.abs(timelineAtMs - nowMs) / 36e5;
  const distanceWeight = Math.max(0, 40 - Math.min(40, distanceHours / 6));

  return {
    id: `${event.module}:${event.ruleId}:${event.sourceType || "source"}:${
      event.sourceId || event.id
    }`,
    eventId: event.id,
    memoryKey: event.memoryKey,
    module: event.module,
    kind,
    bucket,
    title: event.title,
    summary: event.summary,
    severity: event.severity,
    score: event.score,
    sortScore:
      bucketWeight[bucket] +
      severityWeight[event.severity] +
      kindWeight[kind] +
      event.score +
      distanceWeight,
    timelineAt,
    dueAt: event.dueAt,
    href: event.href,
    status: event.status,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    sourceLabel: event.source?.label || null,
    signalLabel: event.signal?.label,
    recommendedAction: event.recommendedAction || event.signal?.recommendedAction,
    actions: event.actions,
    context: event.context,
    isOverdue: bucket === "overdue",
    isDueToday: bucket === "today",
    isUpcoming: bucket === "upcoming",
    event,
  };
}

export function buildAttentionTimeline(
  events: ScoredAttentionEvent[],
  options: BuildAttentionTimelineOptions = {},
): AttentionTimelineItem[] {
  const now = options.now || new Date();
  const includeLowPriority = options.includeLowPriority ?? true;

  const items = events
    .filter((event) => includeLowPriority || event.severity !== "low")
    .map((event) => buildTimelineItem(event, now))
    .sort((a, b) => {
      if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;

      const dateA = dateToMs(a.timelineAt);
      const dateB = dateToMs(b.timelineAt);
      if (dateA != null && dateB != null && dateA !== dateB) return dateA - dateB;
      if (dateA != null && dateB == null) return -1;
      if (dateA == null && dateB != null) return 1;

      return a.title.localeCompare(b.title);
    });

  return typeof options.limit === "number" ? items.slice(0, options.limit) : items;
}

export function groupAttentionTimeline(items: AttentionTimelineItem[]): AttentionTimelineGroup[] {
  const groups = new Map<AttentionTimelineBucket, AttentionTimelineItem[]>();

  for (const item of items) {
    const current = groups.get(item.bucket) || [];
    current.push(item);
    groups.set(item.bucket, current);
  }

  return (Object.keys(bucketLabels) as AttentionTimelineBucket[])
    .map((bucket) => ({
      bucket,
      label: bucketLabels[bucket],
      items: groups.get(bucket) || [],
    }))
    .filter((group) => group.items.length > 0);
}
