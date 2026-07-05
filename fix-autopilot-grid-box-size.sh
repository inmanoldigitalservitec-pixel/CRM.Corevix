#!/usr/bin/env bash
set -euo pipefail

FILE="src/components/dashboard-builder/widget-registry.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ No encontré $FILE"
  exit 1
fi

STAMP="$(date +%Y%m%d%H%M%S)"
cp "$FILE" "${FILE}.bak-autopilot-box-${STAMP}"

python3 - <<'PY'
from pathlib import Path

path = Path("src/components/dashboard-builder/widget-registry.ts")
text = path.read_text()

replacements = {
    'layout("agent.autopilot", { x: 0, y: 24, w: 12, h: 5, minW: 6, minH: 4 })':
    'layout("agent.autopilot", { x: 0, y: 24, w: 6, h: 3, minW: 4, minH: 2 })',

    'defaultLayout: layout("agent.autopilot", {':
    'defaultLayout: layout("agent.autopilot", {',
}

old = 'layout("agent.autopilot", { x: 0, y: 24, w: 12, h: 5, minW: 6, minH: 4 })'
new = 'layout("agent.autopilot", { x: 0, y: 24, w: 6, h: 3, minW: 4, minH: 2 })'

if old not in text:
    print("⚠️ No encontré el layout exacto del preset. Buscando variante...")
    import re
    text2 = re.sub(
        r'layout\("agent\.autopilot", \{ x: 0, y: 24, w: \d+, h: \d+, minW: \d+, minH: \d+ \}\)',
        new,
        text,
        count=1,
    )
    if text2 == text:
        raise SystemExit("❌ No pude reemplazar el layout agent.autopilot automáticamente.")
    text = text2
else:
    text = text.replace(old, new)

path.write_text(text)
print("✅ Layout agent.autopilot reducido a w:6 h:3 minW:4 minH:2")
PY

echo ""
echo "✅ Backup creado:"
echo "${FILE}.bak-autopilot-box-${STAMP}"

echo ""
echo "Verificación:"
grep -n "agent.autopilot" "$FILE" -C 4
