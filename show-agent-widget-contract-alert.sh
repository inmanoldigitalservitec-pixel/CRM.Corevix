#!/usr/bin/env bash

set -euo pipefail

FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
BACKUP_DIR="./agent-ready-patch/backups-widget-contract-alert-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$FILE" ]; then
  echo "ERROR: No existe $FILE"
  exit 1
fi

cp "$FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");

if (src.includes("[AgentWidgetContractAlert]")) {
  console.log("OK: alert already exists.");
  process.exit(0);
}

const target = `      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }`;

const replacement = `      if (widgetContractResult.payload) {
        const firstPlanTitle = Array.isArray(widgetContractResult.payload.recovery_plans)
          ? widgetContractResult.payload.recovery_plans[0]?.plan_title
          : null;

        console.log("[AgentWidgetContractAlert] Using agent_widget_contracts:", firstPlanTitle);

        if (typeof window !== "undefined") {
          window.alert(
            "Widget leyendo desde agent_widget_contracts:\\n\\n" +
              (firstPlanTitle || "Contrato encontrado, pero sin título de plan")
          );
        }

        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }`;

if (!src.includes(target)) {
  console.log("ERROR: No encontré el bloque exacto para insertar alert.");
  process.exit(1);
}

src = src.replace(target, replacement);

fs.writeFileSync(file, src);
console.log("OK: alert inserted.");
NODE

echo ""
echo "Backup:"
echo "$BACKUP_DIR/dashboard-v2.tsx.bak"
echo ""
echo "Ahora corre:"
echo "npm run dev"
