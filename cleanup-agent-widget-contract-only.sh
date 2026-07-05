#!/usr/bin/env bash

set -euo pipefail

DASHBOARD_FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
WIDGET_FILE="./src/components/agent/AgentCommandWidget.tsx"
BACKUP_DIR="./agent-ready-patch/backups-clean-contract-only-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

cp "$DASHBOARD_FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"
cp "$WIDGET_FILE" "$BACKUP_DIR/AgentCommandWidget.tsx.bak"

echo "1) Limpiando dashboard: solo agent_widget_contracts, sin fallback a agent_operating_context..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");

// Remove fetchAgentPromptPayload from import if present.
src = src.replace(
  /import \{ fetchAgentPromptPayload, fetchAgentWidgetContract \} from "@\/lib\/agentClient";/,
  'import { fetchAgentWidgetContract } from "@/lib/agentClient";',
);

src = src.replace(
  /import \{ fetchAgentWidgetContract, fetchAgentPromptPayload \} from "@\/lib\/agentClient";/,
  'import { fetchAgentWidgetContract } from "@/lib/agentClient";',
);

// Replace refresh function.
const functionRegex =
  /  const refreshAgentPromptPayload = useCallback\(async \(\) => \{\n[\s\S]*?\n  \}, \[\]\);/;

const replacement = `  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const widgetContractResult = await fetchAgentWidgetContract();

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "idle",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } catch (error) {
      console.error("Failed to refresh agent widget contract", error);

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "error",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);`;

if (!functionRegex.test(src)) {
  console.error("ERROR: No encontré refreshAgentPromptPayload para reemplazar.");
  process.exit(1);
}

src = src.replace(functionRegex, replacement);

// Remove old debug strings if any remain.
src = src.replace(/console\.log\("\[AgentWidget\]\[ONLY_CONTRACT_TABLE\]"[\s\S]*?\);\n\n?/g, "");
src = src.replace(/console\.error\("\[AgentWidget\]\[ONLY_CONTRACT_TABLE\]\[ERROR\]"[\s\S]*?\);\n\n?/g, "");

fs.writeFileSync(file, src);

console.log("OK: dashboard limpio, solo lee agent_widget_contracts.");
NODE

echo "2) Ajustando widget: si no hay planes, mostrar Todo está bien..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/agent/AgentCommandWidget.tsx";
let src = fs.readFileSync(file, "utf8");

// Ensure availablePlans does not fallback to demoPlans.
src = src.replace(
  "const availablePlans = plans && plans.length > 0 ? plans : demoPlans;",
  "const availablePlans = plans && plans.length > 0 ? plans : [];"
);

// Insert hasPlans after availablePlans if not present.
if (!src.includes("const hasPlans = availablePlans.length > 0;")) {
  src = src.replace(
    "const availablePlans = plans && plans.length > 0 ? plans : [];",
    "const availablePlans = plans && plans.length > 0 ? plans : [];\n  const hasPlans = availablePlans.length > 0;"
  );
}

// Replace debug no-plans selectedPlan fallback with clean healthy state.
const selectedPlanRegex =
  /  const selectedPlan = availablePlans\[Math\.min\(selectedIndex, availablePlans\.length - 1\)\] \|\| \{[\s\S]*?\n  \};/;

const selectedPlanReplacement = `  const selectedPlan = availablePlans[Math.min(selectedIndex, availablePlans.length - 1)] || {
    case_key: "system::all_clear",
    title: "Todo está bien por ahora",
    severity: "low",
    message: "No encontré acciones pendientes que requieran intervención del agente.",
    diagnosis: "El agente no tiene contratos activos para mostrar en este momento.",
    plan_steps: [
      {
        title: "Sin acciones críticas",
        description: "Cuando el agente detecte algo importante, aparecerá aquí con un plan claro."
      }
    ],
    suggested_actions: [],
    result: {
      title: "Sistema estable",
      message: "No hay planes de recuperación pendientes.",
      data: [
        { label: "Estado", value: "Todo bien" }
      ]
    }
  };`;

if (!selectedPlanRegex.test(src)) {
  console.error("ERROR: No encontré selectedPlan fallback para reemplazar.");
  process.exit(1);
}

src = src.replace(selectedPlanRegex, selectedPlanReplacement);

// Fix count text to avoid "Encontré 0 oportunidades..." if no plans.
src = src.replace(
  /Encontré <strong>\{availablePlans\.length\}<\/strong> oportunidades para resolver hoy\./,
  `{hasPlans ? (
          <>
            Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
          </>
        ) : (
          <>No hay acciones pendientes para resolver ahora.</>
        )}`
);

// If exact replacement failed because formatting changed, do a broader fallback.
if (src.includes("Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.")) {
  src = src.replace(
    "Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.",
    `{hasPlans ? (
          <>
            Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
          </>
        ) : (
          <>No hay acciones pendientes para resolver ahora.</>
        )}`
  );
}

// Disable primary execution when no real plans.
src = src.replace(
  /<button className="agent-primary-btn" type="button" onClick=\{handleStartExecution\}>/,
  '<button className="agent-primary-btn" type="button" onClick={handleStartExecution} disabled={!hasPlans}>'
);

// Disable plan detail button when no real plans.
src = src.replace(
  /<button className="agent-secondary-btn" type="button" onClick=\{handleTogglePlan\}>/,
  '<button className="agent-secondary-btn" type="button" onClick={handleTogglePlan} disabled={!hasPlans}>'
);

// Prevent execution without real plans.
src = src.replace(
  "async function handleStartExecution() {",
  "async function handleStartExecution() {\n    if (!hasPlans) return;"
);

// Prevent opening review without real plans.
src = src.replace(
  "function handleTogglePlan() {",
  "function handleTogglePlan() {\n    if (!hasPlans) return;"
);

fs.writeFileSync(file, src);

console.log("OK: widget muestra estado limpio cuando no hay contratos.");
NODE

echo ""
echo "Validation:"
grep -RIn \
  "ONLY_CONTRACT_TABLE\|NO LLEGÓ NINGÚN CONTRATO\|NO HAY PLANES PARA MOSTRAR\|fetchAgentPromptPayload\|agent_operating_context\|Todo está bien por ahora\|No hay acciones pendientes" \
  "$DASHBOARD_FILE" "$WIDGET_FILE" || true

echo ""
echo "Backup:"
echo "$BACKUP_DIR"

echo ""
echo "Ahora corre:"
echo "npm run build"
