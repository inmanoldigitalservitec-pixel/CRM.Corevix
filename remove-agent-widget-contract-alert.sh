#!/usr/bin/env bash

set -euo pipefail

FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
BACKUP_DIR="./agent-ready-patch/backups-remove-widget-alert-$(date +%Y%m%d-%H%M%S)"

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

const before = src;

src = src.replace(
/\s*const firstPlanTitle = Array\.isArray\(widgetContractResult\.payload\.recovery_plans\)\s*\?\s*widgetContractResult\.payload\.recovery_plans\[0\]\?\.plan_title\s*:\s*null;\s*console\.log\("\[AgentWidgetContractAlert\] Using agent_widget_contracts:", firstPlanTitle\);\s*if \(typeof window !== "undefined"\) \{\s*window\.alert\(\s*"Widget leyendo desde agent_widget_contracts:\\n\\n" \+\s*\(firstPlanTitle \|\| "Contrato encontrado, pero sin título de plan"\)\s*\);\s*\}\s*/s,
"\n"
);

if (src === before) {
  console.log("WARNING: No encontré el bloque del alert. Puede que ya no exista.");
} else {
  fs.writeFileSync(file, src);
  console.log("OK: alert removed.");
}
NODE

echo ""
echo "Verificando que no quede alert debug:"
grep -n "AgentWidgetContractAlert\|window.alert\|Widget leyendo desde agent_widget_contracts" "$FILE" || true

echo ""
echo "Backup:"
echo "$BACKUP_DIR/dashboard-v2.tsx.bak"

echo ""
echo "Ahora corre:"
echo "npm run build"
