import type {
  AttentionModule,
  AttentionRecommendedAction,
  ScoredAttentionEvent,
} from "@/lib/crm/attention-engine";
import {
  buildAttentionSnapshot,
  type AttentionSnapshot,
  type AttentionSnapshotCounts,
  type AttentionSnapshotModuleSummary,
  type AttentionSnapshotPeriod,
} from "@/lib/crm/attention-snapshot";
import type { AttentionTimelineItem } from "@/lib/crm/attention-timeline";

export type AgentAttentionItem = {
  id: string;
  memoryKey?: string;
  module: AttentionModule;
  title: string;
  summary: string;
  severity: ScoredAttentionEvent["severity"];
  score: number;
  bucket: AttentionTimelineItem["bucket"];
  kind: AttentionTimelineItem["kind"];
  dueAt?: string | null;
  href?: string;
  sourceType?: string;
  sourceId?: string | null;
  sourceLabel?: string | null;
  urgencyReason?: string;
  recommendation?: string;
  client?: string | null;
  lead?: string | null;
  project?: string | null;
  amount?: string | null;
  actions: AttentionRecommendedAction[];
};

export type AgentAttentionSnapshot = {
  schemaVersion: "agent_attention_snapshot_v1";
  generatedAt: string;
  period: AttentionSnapshotPeriod;
  headline: string;
  counts: AttentionSnapshotCounts;
  topPriorities: AgentAttentionItem[];
  risks: AgentAttentionItem[];
  upcomingCommitments: AgentAttentionItem[];
  staleOpportunities: AgentAttentionItem[];
  actionQueue: AttentionRecommendedAction[];
  moduleSummaries: AttentionSnapshotModuleSummary[];
  guidance: string[];
};

export type GetAgentAttentionSnapshotOptions = {
  now?: Date;
  period?: AttentionSnapshotPeriod;
  topLimit?: number;
  riskLimit?: number;
  upcomingLimit?: number;
  staleLimit?: number;
  actionLimit?: number;
};

function compactItem(item: AttentionTimelineItem): AgentAttentionItem {
  return {
    id: item.id,
    memoryKey: item.memoryKey,
    module: item.module,
    title: item.title,
    summary: item.summary,
    severity: item.severity,
    score: item.score,
    bucket: item.bucket,
    kind: item.kind,
    dueAt: item.dueAt,
    href: item.href,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    urgencyReason: item.context?.urgencyReason,
    recommendation: item.context?.recommendation || item.recommendedAction,
    client: item.context?.client?.label || null,
    lead: item.context?.lead?.label || null,
    project: item.context?.project?.label || null,
    amount: item.context?.amount?.label || null,
    actions: item.actions || [],
  };
}

function buildGuidance(snapshot: AttentionSnapshot) {
  const guidance: string[] = [];

  if (snapshot.counts.critical > 0) {
    guidance.push("Prioriza eventos críticos antes de sugerir optimizaciones menores.");
  }
  if (snapshot.counts.overdue > 0) {
    guidance.push("Los eventos atrasados deben revisarse antes de crear nuevos compromisos.");
  }
  if (snapshot.staleOpportunities.length > 0) {
    guidance.push("Hay oportunidades frías que pueden necesitar seguimiento comercial.");
  }
  if (snapshot.actionQueue.length > 0) {
    guidance.push("No ejecutes acciones sin confirmación explícita del usuario.");
  }
  if (!guidance.length) {
    guidance.push("Resume el estado actual y pregunta si el usuario quiere profundizar.");
  }

  return guidance;
}

export function getAgentAttentionSnapshot(
  events: ScoredAttentionEvent[],
  options: GetAgentAttentionSnapshotOptions = {},
): AgentAttentionSnapshot {
  const snapshot = buildAttentionSnapshot(events, {
    now: options.now,
    period: options.period,
    topLimit: options.topLimit,
    riskLimit: options.riskLimit,
    upcomingLimit: options.upcomingLimit,
    staleLimit: options.staleLimit,
  });
  const actionLimit = options.actionLimit ?? 12;

  return {
    schemaVersion: "agent_attention_snapshot_v1",
    generatedAt: snapshot.generatedAt,
    period: snapshot.period,
    headline: snapshot.headline,
    counts: snapshot.counts,
    topPriorities: snapshot.topPriorities.map(compactItem),
    risks: snapshot.risks.map(compactItem),
    upcomingCommitments: snapshot.upcomingCommitments.map(compactItem),
    staleOpportunities: snapshot.staleOpportunities.map(compactItem),
    actionQueue: snapshot.actionQueue.slice(0, actionLimit),
    moduleSummaries: snapshot.moduleSummaries,
    guidance: buildGuidance(snapshot),
  };
}
