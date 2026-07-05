#!/usr/bin/env bash
set -euo pipefail

FILE="apps/agent-worker/src/agent-widget-contract.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ No encontré $FILE"
  exit 1
fi

BACKUP="${FILE}.bak-title-priority-$(date +%Y%m%d%H%M%S)"
cp "$FILE" "$BACKUP"

python3 - <<'PY'
from pathlib import Path

path = Path("apps/agent-worker/src/agent-widget-contract.ts")
text = path.read_text()

old = """\t\tplan_title:
\t\t\tcleanText(generatedPlan.title, '') ||
\t\t\tcleanText(plan.plan_title, '') ||
\t\t\tcleanText(plan.case_title, 'Caso detectado'),"""

new = """\t\tplan_title:
\t\t\tcleanWidgetText(plan.case_title) ||
\t\t\tcleanWidgetText(detectedCase.title) ||
\t\t\tcleanWidgetText(plan.plan_title) ||
\t\t\tcleanWidgetText(generatedPlan.title) ||
\t\t\t'Caso detectado',"""

if old not in text:
    print("❌ No encontré el bloque exacto para reemplazar.")
    print("Busca manual:")
    for i, line in enumerate(text.splitlines(), 1):
        if 232 <= i <= 245:
            print(f"{i}: {line}")
    raise SystemExit(1)

text = text.replace(old, new)

path.write_text(text)
print("✅ Prioridad del título corregida.")
PY

echo "✅ Backup creado en: $BACKUP"
