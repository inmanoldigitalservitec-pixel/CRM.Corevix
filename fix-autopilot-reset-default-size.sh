#!/usr/bin/env bash
set -euo pipefail

FILE="src/components/dashboard-builder/widget-registry.ts"
BACKUP="${FILE}.bak-autopilot-reset-size-$(date +%Y%m%d%H%M%S)"

echo "🔎 Revisando configuración actual de agent.autopilot..."
grep -n -C 8 "agent.autopilot" "$FILE" || true

echo ""
echo "💾 Backup:"
cp "$FILE" "$BACKUP"
echo "$BACKUP"

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/components/dashboard-builder/widget-registry.ts")
text = path.read_text()

original = text

def patch_layout(match):
    content = match.group(1)

    # Cambiar h a 6
    content = re.sub(r"\bh:\s*\d+", "h: 6", content)

    # Para este widget, el reset no debe permitir minH menor a 3
    content = re.sub(r"\bminH:\s*\d+", "minH: 3", content)

    # El widget compacto debe resetear en 6 columnas, no full width.
    content = re.sub(r"\bw:\s*\d+", "w: 6", content)

    # minW razonable para que no se deforme.
    content = re.sub(r"\bminW:\s*\d+", "minW: 3", content)

    return f'layout("agent.autopilot", {{{content}}})'

text = re.sub(
    r'layout\("agent\.autopilot",\s*\{([^}]*)\}\)',
    patch_layout,
    text,
    flags=re.S,
)

if text == original:
    raise SystemExit("❌ No encontré layout(\"agent.autopilot\", {...}) para modificar.")

path.write_text(text)
print("✅ widget-registry.ts actualizado.")
PY

echo ""
echo "🔎 Configuración nueva de agent.autopilot:"
grep -n -C 8 "agent.autopilot" "$FILE" || true

echo ""
echo "✅ Listo."
echo ""
echo "Siguiente paso:"
echo "1. Reinicia el dev server si no refresca solo."
echo "2. Abre dashboard."
echo "3. Dale Reset Dashboard."
echo "4. Verifica que agent.autopilot quede con h: 6, no h: 3."
