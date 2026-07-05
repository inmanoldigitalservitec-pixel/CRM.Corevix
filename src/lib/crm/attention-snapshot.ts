import type {
  AttentionModule,
  AttentionRecommendedAction,
  ScoredAttentionEvent,
} from "@/lib/crm/attention-engine";
import type { AttentionSeverity } from "@/lib/crm/attention-rules";
import {
  buildAttentionTimeline,
  groupAttentionTimeline,
  type AttentionTimelineBucket,
  type AttentionTimelineGroup,
  type AttentionTimelineItem,
} from "@/lib/crm/attention-timeline";

export type AttentionSnapshotPeriod = "daily" | "weekly";

export type AttentionSnapshotModuleSummary = {
  module: AttentionModule;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  score: number;
};

export type AttentionSnapshotCounts = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  overdue: number;
  dueToday: number;
  upcoming: number;
  recent: number;
  open: number;
};

export type AttentionSnapshot = {
  generatedAt: string;
  period: AttentionSnapshotPeriod;
  counts: AttentionSnapshotCounts;
  headline: string;
  topPriorities: AttentionTimelineItem[];
  risks: AttentionTimelineItem[];
  upcomingCommitments: AttentionTimelineItem[];
  recentChanges: AttentionTimelineItem[];
  staleOpportunities: AttentionTimelineItem[];
  actionQueue: AttentionRecommendedAction[];
  moduleSummaries: AttentionSnapshotModuleSummary[];
  timelineGroups: AttentionTimelineGroup[];
};

export type BuildAttentionSnapshotOptions = {
  now?: Date;
  period?: AttentionSnapshotPeriod;
  topLimit?: number;
  riskLimit?: number;
  upcomingLimit?: number;
  recentLimit?: number;
  staleLimit?: number;
};

const severityKeys: AttentionSeverity[] = ["critical", "high", "medium", "low"];

function emptyCounts(): AttentionSnapshotCounts {
  return {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    recent: 0,
    open: 0,
  };
}

function bucketCountKey(bucket: AttentionTimelineBucket): keyof AttentionSnapshotCounts {
  if (bucket === "today") return "dueToday";
  return bucket;
}

function buildCounts(items: AttentionTimelineItem[]): AttentionSnapshotCounts {
  const counts = emptyCounts();

  for (const item of items) {
    counts.total += 1;
    counts[item.severity] += 1;
    counts[bucketCountKey(item.bucket)] += 1;
  }

  return counts;
}

function buildModuleSummaries(items: AttentionTimelineItem[]): AttentionSnapshotModuleSummary[] {
  const summaries = new Map<AttentionModule, AttentionSnapshotModuleSummary>();

  for (const item of items) {
    const summary =
      summaries.get(item.module) ||
      ({
        module: item.module,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        overdue: 0,
        dueToday: 0,
        upcoming: 0,
        score: 0,
      } satisfies AttentionSnapshotModuleSummary);

    summary.total += 1;
    summary[item.severity] += 1;
    if (item.isOverdue) summary.overdue += 1;
    if (item.isDueToday) summary.dueToday += 1;
    if (item.isUpcoming) summary.upcoming += 1;
    summary.score += item.score;
    summaries.set(item.module, summary);
  }

  return Array.from(summaries.values()).sort((a, b) => {
    if (b.critical !== a.critical) return b.critical - a.critical;
    if (b.high !== a.high) return b.high - a.high;
    if (b.score !== a.score) return b.score - a.score;
    return a.module.localeCompare(b.module);
  });
}

function isRisk(item: AttentionTimelineItem) {
  return item.kind === "risk" || item.severity === "critical" || item.isOverdue;
}

function isStaleOpportunity(item: AttentionTimelineItem) {
  return (
    item.event.signal?.timing === "stale" ||
    item.event.ruleId.includes("stale") ||
    item.event.ruleId.includes("follow_up") ||
    item.event.ruleId.includes("no_response")
  );
}

function buildHeadline(counts: AttentionSnapshotCounts) {
  if (!counts.total) return "No hay eventos de atención activos.";

  const parts = [
    counts.critical ? `${counts.critical} críticos` : null,
    counts.overdue ? `${counts.overdue} atrasados` : null,
    counts.dueToday ? `${counts.dueToday} para hoy` : null,
    counts.upcoming ? `${counts.upcoming} próximos` : null,
  ].filter(Boolean);

  return parts.length
    ? `Hay ${counts.total} eventos de atención: ${parts.join(", ")}.`
    : `Hay ${counts.total} eventos de atención activos.`;
}

function sortByPriority(a: AttentionTimelineItem, b: AttentionTimelineItem) {
  if (b.sortScore !== a.sortScore) return b.sortScore - a.sortScore;
  if (b.score !== a.score) return b.score - a.score;

  const severityA = severityKeys.indexOf(a.severity);
  const severityB = severityKeys.indexOf(b.severity);
  if (severityA !== severityB) return severityA - severityB;

  return a.title.localeCompare(b.title);
}

function buildActionQueue(items: AttentionTimelineItem[], limit = 12) {
  const actions: AttentionRecommendedAction[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    for (const action of item.actions || []) {
      if (seen.has(action.id)) continue;
      seen.add(action.id);
      actions.push(action);
      if (actions.length >= limit) return actions;
    }
  }

  return actions;
}

export function buildAttentionSnapshot(
  events: ScoredAttentionEvent[],
  options: BuildAttentionSnapshotOptions = {},
): AttentionSnapshot {
  const now = options.now || new Date();
  const timeline = buildAttentionTimeline(events, { now });
  const counts = buildCounts(timeline);
  const topLimit = options.topLimit ?? 7;
  const riskLimit = options.riskLimit ?? 5;
  const upcomingLimit = options.upcomingLimit ?? 6;
  const recentLimit = options.recentLimit ?? 5;
  const staleLimit = options.staleLimit ?? 5;

  return {
    generatedAt: now.toISOString(),
    period: options.period || "daily",
    counts,
    headline: buildHeadline(counts),
    topPriorities: timeline.slice(0, topLimit),
    risks: timeline.filter(isRisk).sort(sortByPriority).slice(0, riskLimit),
    upcomingCommitments: timeline
      .filter((item) => item.isDueToday || item.isUpcoming)
      .sort(sortByPriority)
      .slice(0, upcomingLimit),
    recentChanges: timeline
      .filter((item) => item.bucket === "recent")
      .sort(sortByPriority)
      .slice(0, recentLimit),
    staleOpportunities: timeline
      .filter(isStaleOpportunity)
      .sort(sortByPriority)
      .slice(0, staleLimit),
    actionQueue: buildActionQueue(timeline),
    moduleSummaries: buildModuleSummaries(timeline),
    timelineGroups: groupAttentionTimeline(timeline),
  };
}
