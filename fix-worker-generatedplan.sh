#!/usr/bin/env bash

set -euo pipefail

FILE="./apps/agent-worker/src/agent-daily-plans.ts"
BACKUP="./agent-ready-patch/agent-daily-plans-before-generatedplan-fix-$(date +%Y%m%d-%H%M%S).bak"

if [ ! -f "$FILE" ]; then
  echo "ERROR: No existe $FILE"
  exit 1
fi

mkdir -p ./agent-ready-patch
cp "$FILE" "$BACKUP"

echo "Backup creado:"
echo "$BACKUP"
echo ""

python3 <<'PY'
from pathlib import Path

path = Path("./apps/agent-worker/src/agent-daily-plans.ts")
text = path.read_text()

text = text.replace(
    "actions: generatedPlan.actions.map((action) => ({",
    "actions: reservedAgentPlan.actions.map((action) => ({"
)

text = text.replace(
    "actions: (generatedPlan.actions || []).map((action) => ({",
    "actions: (reservedAgentPlan.actions || []).map((action) => ({"
)

text = text.replace(
    "actions: generatedPlan.actions.map((action: any) => ({",
    "actions: reservedAgentPlan.actions.map((action: any) => ({"
)

text = text.replace(
    "actions: (generatedPlan.actions || []).map((action: any) => ({",
    "actions: (reservedAgentPlan.actions || []).map((action: any) => ({"
)

path.write_text(text)
print("Fix aplicado.")
PY

echo ""
echo "Validando referencias viejas..."
echo ""

if grep -RIn "generatedPlan" ./apps/agent-worker/src/agent-daily-plans.ts; then
  echo ""
  echo "WARN: Todavía aparece generatedPlan arriba. Pégame esa salida si aparece."
else
  echo "OK: Ya no aparece generatedPlan en agent-daily-plans.ts"
fi

echo ""
echo "Ahora corre:"
echo "npm run build"
