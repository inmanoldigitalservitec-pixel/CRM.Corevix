import type {
  AgentAttentionSnapshot,
  AgentAttentionItem,
} from "@/lib/crm/agent-attention-snapshot";
import type { AttentionRecommendedAction } from "@/lib/crm/attention-engine";
import type { AttentionSeverity } from "@/lib/crm/attention-rules";

export const AGENT_PLAN_STATES = [
  "new",
  "reviewed",
  "approved",
  "executing",
  "completed",
  "dismissed",
  "expired",
] as const;

export type AgentPlanState = (typeof AGENT_PLAN_STATES)[number];

export type AgentPlanCaseType =
  | "top_priority"
  | "risk"
  | "upcoming_commitment"
  | "stale_opportunity"
  | "follow_up";

export type AgentPlanCase = {
  key: string;
  type: AgentPlanCaseType;
  title: string;
  summary: string;
  severity: AttentionSeverity;
  sourceEventIds: string[];
  sourceMemoryKeys: string[];
  sourceModules: string[];
  item: AgentAttentionItem;
};

export type AgentGeneratedPlan = {
  title: string;
  summary: string;
  actions: AttentionRecommendedAction[];
  rationale?: string | null;
};

export type AgentDailyPlanRow = {
  id: string;
  company_id: string;
  user_id: string;
  cycle_date: string;
  snapshot_version: string;
  snapshot_base: AgentAttentionSnapshot;
  case_key: string;
  case_type: AgentPlanCaseType;
  case_title: string;
  case_summary: string | null;
  case_severity: AttentionSeverity;
  detected_case: AgentPlanCase;
  plan_title: string;
  plan_summary: string;
  generated_plan: AgentGeneratedPlan;
  suggested_actions: AttentionRecommendedAction[];
  state: AgentPlanState;
  state_reason: string | null;
  source_memory_keys: string[];
  source_event_ids: string[];
  source_modules: string[];
  origin_fingerprint: string;
  reminder_count: number;
  last_reminded_at: string | null;
  next_reminder_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  executing_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  expired_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentPlanScope = {
  companyId: string;
  userId: string;
};

export type AgentDailyPlanUpsert = {
  company_id: string;
  user_id: string;
  cycle_date: string;
  snapshot_version: string;
  snapshot_base: AgentAttentionSnapshot;
  case_key: string;
  case_type: AgentPlanCaseType;
  case_title: string;
  case_summary: string | null;
  case_severity: AttentionSeverity;
  detected_case: AgentPlanCase;
  plan_title: string;
  plan_summary: string;
  generated_plan: AgentGeneratedPlan;
  suggested_actions: AttentionRecommendedAction[];
  state: AgentPlanState;
  state_reason: string | null;
  source_memory_keys: string[];
  source_event_ids: string[];
  source_modules: string[];
  origin_fingerprint: string;
  reminder_count: number;
  last_reminded_at: string | null;
  next_reminder_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  executing_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  expired_at: string | null;
  metadata: Record<string, unknown>;
};
