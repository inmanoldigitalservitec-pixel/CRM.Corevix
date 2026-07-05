export type AgentWidgetContractStatus =
  | "idle"
  | "analyzing"
  | "ready"
  | "executing"
  | "done"
  | "error";

export type AgentWidgetSeverity = "critical" | "high" | "medium" | "low";

export type AgentWidgetContractSummary = {
  total_cases: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type AgentWidgetRecommendedStep = {
  title: string;
  description: string;
};

export type AgentWidgetSuggestedAction = {
  action_id: string;
  type: string;
  label: string;
  requires_confirmation: boolean;
  payload?: Record<string, string | number | boolean | null>;
};

export type AgentWidgetRecoveryPlan = {
  case_key: string;
  case_type?: string;
  plan_title: string;
  severity: AgentWidgetSeverity;
  message?: string;
  diagnosis: string;
  recommended_steps: AgentWidgetRecommendedStep[];
  suggested_actions: AgentWidgetSuggestedAction[];
  requires_confirmation: boolean;
  success_criteria: string;
};

export type AgentWidgetContractV1 = {
  schema_version: "agent_widget_contract_v1";
  status: AgentWidgetContractStatus;
  generated_at: string;
  summary: AgentWidgetContractSummary;
  recovery_plans: AgentWidgetRecoveryPlan[];
};
