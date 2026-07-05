#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Implementing Agent Widget Phase 4A"
echo " Final Widget Contract Types + Adapter"
echo "=========================================="
echo ""

AGENT_DIR="./src/components/agent"
CONTRACT_FILE="$AGENT_DIR/agentWidgetContract.ts"
ADAPTER_FILE="$AGENT_DIR/agentPromptPayloadAdapter.ts"
INDEX_FILE="$AGENT_DIR/index.ts"
BACKUP_DIR="./agent-ready-patch/backups-agent-phase4A-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

for file in "$CONTRACT_FILE" "$ADAPTER_FILE" "$INDEX_FILE"; do
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
    echo "Backup: $file"
  fi
done

echo ""
echo "1) Writing final widget contract..."

cat > "$CONTRACT_FILE" <<'TS'
export const AGENT_WIDGET_CONTRACT_VERSION = "agent_widget_contract_v1" as const;

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
  schema_version: typeof AGENT_WIDGET_CONTRACT_VERSION;
  status: AgentWidgetContractStatus;
  generated_at: string;
  summary: AgentWidgetContractSummary;
  recovery_plans: AgentWidgetRecoveryPlan[];
};

export function isAgentWidgetContractV1(value: unknown): value is AgentWidgetContractV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const contract = value as Record<string, unknown>;

  return (
    contract.schema_version === AGENT_WIDGET_CONTRACT_VERSION &&
    Array.isArray(contract.recovery_plans)
  );
}
TS

echo "2) Patching adapter to understand agent_widget_contract_v1..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/agent/agentPromptPayloadAdapter.ts";
let src = fs.readFileSync(file, "utf8");

if (!src.includes("isAgentWidgetContractV1")) {
  src = src.replace(
    'import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";',
    `import type { AgentRecoveryPlan, AgentSeverity } from "./AgentCommandWidget";
import {
  isAgentWidgetContractV1,
  type AgentWidgetContractV1,
  type AgentWidgetRecoveryPlan,
} from "./agentWidgetContract";`,
  );
}

if (!src.includes("widget_contract?: AgentWidgetContractV1")) {
  src = src.replace(
    `export type AgentPromptPayload = {
  schema_version?: string;`,
    `export type AgentPromptPayload = {
  schema_version?: string;
  status?: string;
  widget_contract?: AgentWidgetContractV1;
  agent_widget_contract?: AgentWidgetContractV1;`,
  );
}

if (!src.includes("function normalizeWidgetContractRecoveryPlan")) {
  const insertAfter = `function normalizeRecoveryPlan(plan: AgentPromptRecoveryPlan, payload: AgentPromptPayload): AgentRecoveryPlan {`;

  const helper = `
function normalizeWidgetContractRecoveryPlan(plan: AgentWidgetRecoveryPlan): AgentRecoveryPlan {
  return {
    case_key: cleanText(plan.case_key, "unknown_case"),
    title: cleanText(plan.plan_title, "Plan de sanación"),
    severity: normalizeSeverity(plan.severity),
    message: cleanText(
      plan.message,
      "El agente preparó un plan de sanación para este caso.",
    ),
    diagnosis: cleanText(
      plan.diagnosis,
      "Este caso requiere revisión y una acción controlada.",
    ),
    plan_steps: (plan.recommended_steps || []).map((step) => ({
      title: cleanText(step.title, "Paso"),
      description: cleanText(step.description, "Ejecutar este paso con validación."),
    })),
    suggested_actions: (plan.suggested_actions || []).map((action) => ({
      type: cleanText(action.type, "review_record"),
      label: cleanText(action.label, "Revisar caso"),
      requires_confirmation:
        typeof action.requires_confirmation === "boolean"
          ? action.requires_confirmation
          : true,
    })),
    result: {
      title: "Criterio de éxito",
      message: cleanText(
        plan.success_criteria,
        "El caso queda resuelto o con el próximo paso definido.",
      ),
      data: [
        { label: "Confirmación", value: plan.requires_confirmation ? "Requerida" : "No requerida" },
        { label: "Severidad", value: cleanText(plan.severity, "low") },
      ],
    },
  };
}

`;

  src = src.replace(insertAfter, helper + insertAfter);
}

const oldFunction = `export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
  if (!payload) return [];

  const realRecoveryPlans = payload.recovery_plans || [];

  if (realRecoveryPlans.length > 0) {
    return realRecoveryPlans.map((plan) => normalizeRecoveryPlan(plan, payload));
  }

  return (payload.detected_cases || []).map((detectedCase) =>
    detectedCaseToTemporaryRecoveryPlan(detectedCase, payload),
  );
}`;

const newFunction = `export function agentPromptPayloadToRecoveryPlans(payload?: AgentPromptPayload | null): AgentRecoveryPlan[] {
  if (!payload) return [];

  if (isAgentWidgetContractV1(payload)) {
    return payload.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
  }

  if (isAgentWidgetContractV1(payload.widget_contract)) {
    return payload.widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
  }

  if (isAgentWidgetContractV1(payload.agent_widget_contract)) {
    return payload.agent_widget_contract.recovery_plans.map(normalizeWidgetContractRecoveryPlan);
  }

  const realRecoveryPlans = payload.recovery_plans || [];

  if (realRecoveryPlans.length > 0) {
    return realRecoveryPlans.map((plan) => normalizeRecoveryPlan(plan, payload));
  }

  return (payload.detected_cases || []).map((detectedCase) =>
    detectedCaseToTemporaryRecoveryPlan(detectedCase, payload),
  );
}`;

if (src.includes(oldFunction)) {
  src = src.replace(oldFunction, newFunction);
} else if (!src.includes("isAgentWidgetContractV1(payload)")) {
  console.log("WARNING: Could not replace agentPromptPayloadToRecoveryPlans automatically.");
}

fs.writeFileSync(file, src);
console.log("OK: Adapter patched.");
NODE

echo "3) Updating exports..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/agent/index.ts";
let src = fs.readFileSync(file, "utf8");

if (!src.includes("agentWidgetContract")) {
  src = `${src.trimEnd()}

export {
  AGENT_WIDGET_CONTRACT_VERSION,
  isAgentWidgetContractV1,
} from "./agentWidgetContract";

export type {
  AgentWidgetContractStatus,
  AgentWidgetSeverity,
  AgentWidgetContractSummary,
  AgentWidgetRecommendedStep,
  AgentWidgetSuggestedAction,
  AgentWidgetRecoveryPlan,
  AgentWidgetContractV1,
} from "./agentWidgetContract";
`;
}

fs.writeFileSync(file, src);
console.log("OK: index exports updated.");
NODE

echo ""
echo "4) Validation grep..."
grep -RIn "agent_widget_contract_v1\|AgentWidgetContractV1\|isAgentWidgetContractV1\|normalizeWidgetContractRecoveryPlan" ./src/components/agent | tee "$BACKUP_DIR/validation-grep.txt"

echo ""
echo "=========================================="
echo " Phase 4A patch completed"
echo "=========================================="
echo ""
echo "Created/updated:"
echo "- $CONTRACT_FILE"
echo "- $ADAPTER_FILE"
echo "- $INDEX_FILE"
echo ""
echo "Backups:"
echo "$BACKUP_DIR"
echo ""
echo "Now run:"
echo "npm run build"
