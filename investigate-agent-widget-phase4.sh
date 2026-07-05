#!/usr/bin/env bash

set -euo pipefail

echo "=========================================="
echo " Agent Widget Phase 4 Investigation"
echo " Final Widget Contract"
echo "=========================================="
echo ""

OUT_DIR="./agent-ready-patch/phase4-investigation-$(date +%Y%m%d-%H%M%S)"
REPORT="$OUT_DIR/report.md"

mkdir -p "$OUT_DIR"

echo "# Agent Widget Phase 4 Investigation" > "$REPORT"
echo "" >> "$REPORT"
echo "Generated at: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

FILES=(
  "./src/components/agent/AgentCommandWidget.tsx"
  "./src/components/agent/AgentCommandWidgetConnected.tsx"
  "./src/components/agent/agentPromptPayloadAdapter.ts"
  "./src/components/agent/index.ts"
  "./src/components/dashboard-v2/dashboard-v2.tsx"
  "./src/lib/agentClient.ts"
  "./apps/agent-worker/src/agent-operating-context.ts"
  "./apps/agent-worker/src/agent-daily-plans.ts"
  "./src/lib/crm/agent-plan-generation.ts"
  "./src/lib/crm/agent-plans.ts"
)

echo "1) Checking files..."
echo "## File existence" >> "$REPORT"
echo "" >> "$REPORT"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "OK: $file"
    echo "- OK: \`$file\`" >> "$REPORT"
  else
    echo "MISSING: $file"
    echo "- MISSING: \`$file\`" >> "$REPORT"
  fi
done

echo "" >> "$REPORT"

echo ""
echo "2) Searching current agent/widget contract markers..."
echo "## Contract markers" >> "$REPORT"
echo "" >> "$REPORT"

grep -RIn \
  "AgentPromptPayload\|AgentPromptRecoveryPlan\|AgentRecoveryPlan\|recovery_plans\|detected_cases\|suggested_actions\|requires_confirmation\|success_criteria\|schema_version\|agent_widget_contract\|agent_prompt_payload" \
  ./src ./apps ./supabase 2>/dev/null \
  | grep -v ".wrangler/tmp" \
  | tee "$OUT_DIR/contract-markers.txt" || true

echo '```txt' >> "$REPORT"
cat "$OUT_DIR/contract-markers.txt" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "3) Extracting current adapter types..."
echo "## Current adapter types" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/agentPromptPayloadAdapter.ts" ]; then
  echo '```ts' >> "$REPORT"
  sed -n '1,180p' ./src/components/agent/agentPromptPayloadAdapter.ts >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "4) Extracting widget prop contract..."
echo "## AgentCommandWidget props" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/AgentCommandWidget.tsx" ]; then
  grep -n "export type AgentWidgetMode\|export type AgentSeverity\|export type AgentRecoveryPlan\|type AgentCommandWidgetProps\|function AgentCommandWidget" \
    ./src/components/agent/AgentCommandWidget.tsx \
    | tee "$OUT_DIR/widget-prop-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/widget-prop-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"

  echo "" >> "$REPORT"
  echo "### Top of AgentCommandWidget.tsx" >> "$REPORT"
  echo '```tsx' >> "$REPORT"
  sed -n '1,90p' ./src/components/agent/AgentCommandWidget.tsx >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "5) Inspecting connected component..."
echo "## AgentCommandWidgetConnected" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/components/agent/AgentCommandWidgetConnected.tsx" ]; then
  cat ./src/components/agent/AgentCommandWidgetConnected.tsx | tee "$OUT_DIR/connected-component.txt"
  echo '```tsx' >> "$REPORT"
  cat ./src/components/agent/AgentCommandWidgetConnected.tsx >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "6) Inspecting fetchAgentPromptPayload..."
echo "## fetchAgentPromptPayload" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./src/lib/agentClient.ts" ]; then
  grep -n "AgentPromptPayloadRow\|FetchAgentPromptPayloadOptions\|FetchAgentPromptPayloadResult\|fetchAgentPromptPayload" \
    ./src/lib/agentClient.ts \
    | tee "$OUT_DIR/agent-client-fetch-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/agent-client-fetch-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"

  START_LINE=$(grep -n "export async function fetchAgentPromptPayload" ./src/lib/agentClient.ts | head -1 | cut -d: -f1 || true)
  if [ -n "${START_LINE:-}" ]; then
    FROM=$((START_LINE - 30))
    TO=$((START_LINE + 80))
    if [ "$FROM" -lt 1 ]; then FROM=1; fi

    echo "" >> "$REPORT"
    echo "### fetchAgentPromptPayload block" >> "$REPORT"
    echo '```ts' >> "$REPORT"
    sed -n "${FROM},${TO}p" ./src/lib/agentClient.ts >> "$REPORT"
    echo '```' >> "$REPORT"
  fi
fi

echo ""
echo "7) Inspecting backend payload generation..."
echo "## Backend payload generation" >> "$REPORT"
echo "" >> "$REPORT"

if [ -f "./apps/agent-worker/src/agent-operating-context.ts" ]; then
  grep -n "AGENT_BRIEF_VERSION\|compactDetectedCasesFromPlans\|compactPlansForCompatibility\|detected_cases\|agent_brief\|recovery_plans\|rules\|plans:" \
    ./apps/agent-worker/src/agent-operating-context.ts \
    | tee "$OUT_DIR/backend-context-markers.txt" || true

  echo '```txt' >> "$REPORT"
  cat "$OUT_DIR/backend-context-markers.txt" >> "$REPORT"
  echo '```' >> "$REPORT"

  echo "" >> "$REPORT"
  echo "### contextJson area estimate" >> "$REPORT"
  echo '```ts' >> "$REPORT"
  sed -n '360,450p' ./apps/agent-worker/src/agent-operating-context.ts >> "$REPORT" || true
  echo '```' >> "$REPORT"
fi

echo ""
echo "8) Checking legacy duplicate sections still present..."
echo "## Legacy duplicated sections" >> "$REPORT"
echo "" >> "$REPORT"

LEGACY_TERMS=(
  "plans:"
  "timeline"
  "recent_changes"
  "module_summaries"
  "top_priorities"
  "risks"
  "action_queue"
  "notifications"
  "agent_workspace"
  "agent_instructions"
)

for term in "${LEGACY_TERMS[@]}"; do
  COUNT=$(grep -RIn "$term" ./src ./apps 2>/dev/null | grep -v ".wrangler/tmp" | wc -l | tr -d ' ')
  echo "$term: $COUNT"
  echo "- \`$term\`: $COUNT occurrence(s)" >> "$REPORT"
done

echo ""
echo "9) Creating proposed final contract file for review..."
echo "## Proposed final contract" >> "$REPORT"
echo "" >> "$REPORT"

cat > "$OUT_DIR/proposed-agent-widget-contract-v1.json" <<'JSON'
{
  "schema_version": "agent_widget_contract_v1",
  "status": "ready",
  "generated_at": "2026-07-05T20:00:00.000Z",
  "summary": {
    "total_cases": 12,
    "critical": 3,
    "high": 5,
    "medium": 2,
    "low": 2
  },
  "recovery_plans": [
    {
      "case_key": "risk::tasks::task::123",
      "case_type": "task_overdue",
      "plan_title": "Sanar tarea vencida",
      "severity": "critical",
      "message": "Encontré una tarea vencida que puede afectar el cumplimiento.",
      "diagnosis": "La tarea está vencida y puede afectar el seguimiento del cliente o la entrega interna.",
      "recommended_steps": [
        {
          "title": "Confirmar estado",
          "description": "Verificar si la tarea ya fue completada fuera del CRM."
        },
        {
          "title": "Reprogramar o reasignar",
          "description": "Si no fue completada, mover la fecha y asignar un responsable."
        }
      ],
      "suggested_actions": [
        {
          "action_id": "reschedule_task::123",
          "type": "reschedule_task",
          "label": "Reprogramar tarea",
          "requires_confirmation": true,
          "payload": {
            "task_id": "123",
            "new_due_date": "2026-07-08"
          }
        }
      ],
      "requires_confirmation": true,
      "success_criteria": "La tarea queda completada, reprogramada o reasignada con responsable claro."
    }
  ]
}
JSON

echo '```json' >> "$REPORT"
cat "$OUT_DIR/proposed-agent-widget-contract-v1.json" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "10) Generating TypeScript contract proposal..."
echo "## Proposed TypeScript types" >> "$REPORT"
echo "" >> "$REPORT"

cat > "$OUT_DIR/proposed-agent-widget-contract-v1.ts" <<'TS'
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
TS

echo '```ts' >> "$REPORT"
cat "$OUT_DIR/proposed-agent-widget-contract-v1.ts" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo ""
echo "11) Running build smoke check..."
echo "## Build smoke check" >> "$REPORT"
echo "" >> "$REPORT"

if npm run build > "$OUT_DIR/build.log" 2>&1; then
  echo "OK: npm run build passed"
  echo "- OK: \`npm run build\` passed." >> "$REPORT"
else
  echo "FAIL: npm run build failed"
  echo "- FAIL: \`npm run build\` failed." >> "$REPORT"
  echo '```txt' >> "$REPORT"
  tail -120 "$OUT_DIR/build.log" >> "$REPORT"
  echo '```' >> "$REPORT"
fi

echo ""
echo "12) Recommendations..."
echo "## Recommendations" >> "$REPORT"
echo "" >> "$REPORT"

HAS_CONTRACT=$(grep -RIn "agent_widget_contract_v1" ./src ./apps 2>/dev/null | grep -v ".wrangler/tmp" || true)
HAS_CONNECTED=$(grep -RIn "AgentCommandWidgetConnected" ./src/components/agent ./src/components/dashboard-v2 2>/dev/null || true)
HAS_FETCH=$(grep -RIn "fetchAgentPromptPayload" ./src/lib ./src/components 2>/dev/null || true)
HAS_RECOVERY_PLANS=$(grep -RIn "recovery_plans" ./src/components/agent ./src/lib ./apps 2>/dev/null | grep -v ".wrangler/tmp" || true)

if [ -z "$HAS_CONTRACT" ]; then
  echo "- PENDING: No existe todavía un tipo/contrato explícito \`agent_widget_contract_v1\` en el código." >> "$REPORT"
else
  echo "- OK: Ya aparece \`agent_widget_contract_v1\` en el código." >> "$REPORT"
fi

if [ -n "$HAS_CONNECTED" ]; then
  echo "- OK: El widget conectado ya existe y/o está montado." >> "$REPORT"
else
  echo "- WARNING: No encontré \`AgentCommandWidgetConnected\`." >> "$REPORT"
fi

if [ -n "$HAS_FETCH" ]; then
  echo "- OK: Existe \`fetchAgentPromptPayload\` o referencias al fetch del payload." >> "$REPORT"
else
  echo "- WARNING: No encontré \`fetchAgentPromptPayload\`." >> "$REPORT"
fi

if [ -n "$HAS_RECOVERY_PLANS" ]; then
  echo "- OK: Hay referencias actuales a \`recovery_plans\`." >> "$REPORT"
else
  echo "- WARNING: No encontré referencias a \`recovery_plans\`." >> "$REPORT"
fi

echo "- NEXT: Implementar Fase 4A creando \`src/components/agent/agentWidgetContract.ts\`." >> "$REPORT"
echo "- NEXT: Actualizar adapter para aceptar explícitamente \`AgentWidgetContractV1\`." >> "$REPORT"
echo "- NEXT: Mantener compatibilidad temporal con \`agent_prompt_payload.detected_cases\` hasta instalar el agente real." >> "$REPORT"

echo ""
echo "=========================================="
echo " Phase 4 investigation complete"
echo "=========================================="
echo ""
echo "Report:"
echo "$REPORT"
echo ""
echo "Useful files:"
echo "- $OUT_DIR/contract-markers.txt"
echo "- $OUT_DIR/widget-prop-markers.txt"
echo "- $OUT_DIR/connected-component.txt"
echo "- $OUT_DIR/agent-client-fetch-markers.txt"
echo "- $OUT_DIR/backend-context-markers.txt"
echo "- $OUT_DIR/proposed-agent-widget-contract-v1.json"
echo "- $OUT_DIR/proposed-agent-widget-contract-v1.ts"
echo "- $OUT_DIR/build.log"
echo ""
echo "To view report:"
echo "cat $REPORT"
