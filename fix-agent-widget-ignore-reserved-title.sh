#!/usr/bin/env bash
set -euo pipefail

FILE="apps/agent-worker/src/agent-widget-contract.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ No encontré $FILE"
  exit 1
fi

BACKUP="${FILE}.bak-ignore-reserved-title-$(date +%Y%m%d%H%M%S)"
cp "$FILE" "$BACKUP"

python3 - <<'PY'
from pathlib import Path
path = Path("apps/agent-worker/src/agent-widget-contract.ts")
text = path.read_text()

# 1) Insert helper if it does not exist
helper = """
function isReservedAgentPlaceholder(value: unknown): boolean {
\tif (typeof value !== 'string') return false;
\tconst normalized = value.trim().toLowerCase();
\treturn (
\t\tnormalized === 'reserved for future agent' ||
\t\tnormalized === 'reserved_for_future_agent' ||
\t\tnormalized.includes('reserved for future agent')
\t);
}

function cleanWidgetText(value: unknown): string | null {
\tif (typeof value !== 'string') return null;
\tconst trimmed = value.trim();
\tif (!trimmed || isReservedAgentPlaceholder(trimmed)) return null;
\treturn trimmed;
}
"""

if "function isReservedAgentPlaceholder" not in text:
    marker = "function "
    idx = text.find(marker)
    if idx == -1:
        text += "\n" + helper + "\n"
    else:
        text = text[:idx] + helper + "\n" + text[idx:]

# 2) Replace common title fallback patterns
replacements = {
"""const title =
\t\tgeneratedPlan.title ||
\t\tplan.plan_title ||
\t\tplan.case_title ||
\t\t'Diagnóstico del agente';""":
"""const title =
\t\tcleanWidgetText(plan.case_title) ||
\t\tcleanWidgetText(detectedCase.title) ||
\t\tcleanWidgetText(plan.plan_title) ||
\t\tcleanWidgetText(generatedPlan.title) ||
\t\t'Diagnóstico del agente';""",

"""const title =
\t\tgeneratedPlan?.title ||
\t\tplan.plan_title ||
\t\tplan.case_title ||
\t\t'Diagnóstico del agente';""":
"""const title =
\t\tcleanWidgetText(plan.case_title) ||
\t\tcleanWidgetText(detectedCase.title) ||
\t\tcleanWidgetText(plan.plan_title) ||
\t\tcleanWidgetText(generatedPlan?.title) ||
\t\t'Diagnóstico del agente';""",

"""const title = generatedPlan.title || plan.plan_title || plan.case_title || 'Diagnóstico del agente';""":
"""const title =
\t\tcleanWidgetText(plan.case_title) ||
\t\tcleanWidgetText(detectedCase.title) ||
\t\tcleanWidgetText(plan.plan_title) ||
\t\tcleanWidgetText(generatedPlan.title) ||
\t\t'Diagnóstico del agente';""",

"""const title = generatedPlan?.title || plan.plan_title || plan.case_title || 'Diagnóstico del agente';""":
"""const title =
\t\tcleanWidgetText(plan.case_title) ||
\t\tcleanWidgetText(detectedCase.title) ||
\t\tcleanWidgetText(plan.plan_title) ||
\t\tcleanWidgetText(generatedPlan?.title) ||
\t\t'Diagnóstico del agente';""",
}

changed = False
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new)
        changed = True

if not changed:
    print("⚠️ No encontré el patrón exacto del title. Mostrando líneas relacionadas:")
    for i, line in enumerate(text.splitlines(), 1):
        if "generatedPlan" in line or "plan_title" in line or "case_title" in line:
            print(f"{i}: {line}")
    path.write_text(text)
    raise SystemExit(2)

path.write_text(text)
print("✅ Patch aplicado en", path)
PY

echo "✅ Backup creado en: $BACKUP"
