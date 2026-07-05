#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%Y%m%d%H%M%S)"
FILE="apps/agent-worker/src/index.ts"

echo "💾 Backup: ${FILE}.bak-promptstats-widget-label-$STAMP"
cp "$FILE" "${FILE}.bak-promptstats-widget-label-$STAMP"

python3 <<'PY'
from pathlib import Path

path = Path("apps/agent-worker/src/index.ts")
text = path.read_text()

# Cambia cualquier firma restante que solo acepte initial/final.
text = text.replace(
    "label: 'initial' | 'final',",
    "label: 'initial' | 'final' | 'widget_contract',"
)

text = text.replace(
    "label: 'initial' | 'final';",
    "label: 'initial' | 'final' | 'widget_contract';"
)

path.write_text(text)
PY

echo ""
echo "============================================================"
echo "Verificando buildPromptStats"
echo "============================================================"
grep -n -C 4 "function buildPromptStats\|label: 'initial'" "$FILE"

echo ""
echo "============================================================"
echo "Typecheck worker"
echo "============================================================"
cd apps/agent-worker
npx tsc --noEmit
cd ../..

echo ""
echo "✅ Error de widget_contract corregido."
