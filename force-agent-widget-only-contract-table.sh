#!/usr/bin/env bash

set -euo pipefail

DASHBOARD_FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
WIDGET_FILE="./src/components/agent/AgentCommandWidget.tsx"
BACKUP_DIR="./agent-ready-patch/backups-force-only-contract-table-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

cp "$DASHBOARD_FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"
cp "$WIDGET_FILE" "$BACKUP_DIR/AgentCommandWidget.tsx.bak"

echo "1) Forzando dashboard a leer SOLO agent_widget_contracts..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");

const functionRegex =
  /  const refreshAgentPromptPayload = useCallback\(async \(\) => \{\n[\s\S]*?\n  \}, \[\]\);/;

const replacement = `  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const widgetContractResult = await fetchAgentWidgetContract();

      console.log("[AgentWidget][ONLY_CONTRACT_TABLE]", {
        row: widgetContractResult.row,
        payload: widgetContractResult.payload,
        firstPlanTitle: Array.isArray(widgetContractResult.payload?.recovery_plans)
          ? widgetContractResult.payload.recovery_plans[0]?.plan_title
          : null,
      });

      if (!widgetContractResult.payload) {
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
          recovery_plans: [
            {
              case_key: "debug::agent_widget_contracts::empty",
              case_type: "debug",
              plan_title: "NO LLEGÓ NINGÚN CONTRATO DESDE agent_widget_contracts",
              severity: "critical",
              message: "El widget intentó leer agent_widget_contracts, pero no recibió contract_json.",
              diagnosis: "Esto indica un problema de permisos, conexión Supabase, tabla vacía para el entorno actual o query que no está llegando a la base correcta.",
              recommended_steps: [
                {
                  title: "Confirmar tabla",
                  description: "Verifica que agent_widget_contracts tenga al menos una fila en el mismo proyecto Supabase usado por .env.local."
                },
                {
                  title: "Confirmar permisos",
                  description: "Verifica que anon/authenticated puedan hacer select sobre agent_widget_contracts."
                }
              ],
              suggested_actions: [],
              requires_confirmation: false,
              success_criteria: "El widget debe recibir un contract_json válido desde agent_widget_contracts."
            }
          ]
        });
        return;
      }

      setAgentPromptPayload(widgetContractResult.payload);
    } catch (error) {
      console.error("[AgentWidget][ONLY_CONTRACT_TABLE][ERROR]", error);

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
        recovery_plans: [
          {
            case_key: "debug::agent_widget_contracts::error",
            case_type: "debug",
            plan_title: "ERROR LEYENDO agent_widget_contracts",
            severity: "critical",
            message: "El frontend lanzó un error al intentar leer agent_widget_contracts.",
            diagnosis: error instanceof Error ? error.message : String(error),
            recommended_steps: [
              {
                title: "Ver consola",
                description: "Abrir DevTools y revisar el error [AgentWidget][ONLY_CONTRACT_TABLE][ERROR]."
              }
            ],
            suggested_actions: [],
            requires_confirmation: false,
            success_criteria: "La consulta a agent_widget_contracts debe responder correctamente."
          }
        ]
      });
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);`;

if (!functionRegex.test(src)) {
  console.error("ERROR: No encontré refreshAgentPromptPayload.");
  process.exit(1);
}

src = src.replace(functionRegex, replacement);

fs.writeFileSync(file, src);
console.log("OK: dashboard ahora lee SOLO agent_widget_contracts.");
NODE

echo "2) Quitando demoPlans como fallback visual..."

node <<'NODE'
const fs = require("fs");

const file = "./src/components/agent/AgentCommandWidget.tsx";
let src = fs.readFileSync(file, "utf8");

src = src.replace(
  "const availablePlans = plans && plans.length > 0 ? plans : demoPlans;",
  "const availablePlans = plans && plans.length > 0 ? plans : [];"
);

src = src.replace(
  "const selectedPlan = availablePlans[Math.min(selectedIndex, availablePlans.length - 1)] || availablePlans[0];",
  `const selectedPlan = availablePlans[Math.min(selectedIndex, availablePlans.length - 1)] || {
    case_key: "debug::no_plans",
    title: "NO HAY PLANES PARA MOSTRAR",
    severity: "critical",
    message: "El widget no recibió planes. Ya no está usando demoPlans.",
    diagnosis: "Si ves este mensaje, el adapter no produjo recovery plans.",
    plan_steps: [
      {
        title: "Revisar payload",
        description: "Verificar si agent_widget_contracts.contract_json contiene recovery_plans."
      }
    ],
    suggested_actions: [],
    result: {
      title: "Sin planes",
      message: "No llegó ningún recovery_plan al widget.",
      data: [
        { label: "Fuente", value: "Sin datos" }
      ]
    }
  };`
);

fs.writeFileSync(file, src);
console.log("OK: demoPlans desactivado como fallback.");
NODE

echo ""
echo "Validation:"
grep -n "ONLY_CONTRACT_TABLE\|NO LLEGÓ NINGÚN CONTRATO\|NO HAY PLANES PARA MOSTRAR\|availablePlans" "$DASHBOARD_FILE" "$WIDGET_FILE" || true

echo ""
echo "Backup:"
echo "$BACKUP_DIR"

echo ""
echo "Ahora corre:"
echo "npm run build"
