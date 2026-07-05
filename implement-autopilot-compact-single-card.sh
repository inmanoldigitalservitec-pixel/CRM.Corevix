#!/usr/bin/env bash
set -euo pipefail

TSX="src/components/agent/AgentCommandWidget.tsx"
CSS="src/components/agent/AgentCommandWidget.css"

for file in "$TSX" "$CSS"; do
  if [ ! -f "$file" ]; then
    echo "❌ No encontré $file"
    exit 1
  fi
done

STAMP="$(date +%Y%m%d%H%M%S)"
cp "$TSX" "${TSX}.bak-single-card-${STAMP}"
cp "$CSS" "${CSS}.bak-single-card-${STAMP}"

python3 - <<'PY'
from pathlib import Path
import re

tsx_path = Path("src/components/agent/AgentCommandWidget.tsx")
css_path = Path("src/components/agent/AgentCommandWidget.css")

tsx = tsx_path.read_text()
css = css_path.read_text()

# 1) Remove the secondary "Ver plan completo / Ocultar plan completo" button.
tsx = re.sub(
    r'''\n\s*<button className="agent-secondary-btn" type="button" onClick=\{handleTogglePlan\} disabled=\{!hasPlans\}>\s*\n\s*\{mode === "compact" \? "Ver plan completo" : "Ocultar plan completo"\}\s*\n\s*</button>''',
    "",
    tsx,
)

# 2) Remove the right plan card aside entirely.
tsx = re.sub(
    r'''\n\s*<aside className="agent-plan-card">[\s\S]*?</aside>''',
    "",
    tsx,
    count=1,
)

# 3) Simplify duplicated headline JSX if present.
tsx = re.sub(
    r'''<div className="agent-headline">\s*\{hasPlans \? \(\s*<>\s*\{hasPlans \? \(\s*<>\s*Encontré <strong>\{availablePlans\.length\}</strong> oportunidades para resolver hoy\.\s*</>\s*\) : \(\s*<>No hay acciones pendientes para resolver ahora\.</>\s*\)\}\s*</>\s*\) : \(\s*<>No hay acciones pendientes para resolver ahora\.</>\s*\)\}\s*</div>''',
    '''<div className="agent-headline">
        {hasPlans ? (
          <>
            Encontré <strong>{availablePlans.length}</strong> oportunidades para resolver hoy.
          </>
        ) : (
          <>No hay acciones pendientes para resolver ahora.</>
        )}
      </div>''',
    tsx,
)

tsx_path.write_text(tsx)

# 4) Make widget compact and single-column.
css = css.replace(
    "width: min(1180px, 100%);",
    "width: min(760px, 100%);",
)

css = re.sub(
    r'''\.agent-review-mode \{\s*padding: 0 22px 22px;\s*display: grid;\s*grid-template-columns: minmax\(0, 1\.1fr\) minmax\(320px, 0\.9fr\);\s*gap: 22px;\s*\}''',
    '''.agent-review-mode {
  padding: 0 22px 22px;
  display: block;
}''',
    css,
)

# 5) Reduce main card height since there is no right panel.
css = re.sub(
    r'''\.agent-main-card,\s*\.agent-plan-card \{\s*border: 1px solid #dbe5f3;\s*border-radius: 16px;\s*background: #fff;\s*min-height: 310px;\s*\}''',
    '''.agent-main-card,
.agent-plan-card {
  border: 1px solid #dbe5f3;
  border-radius: 16px;
  background: #fff;
}

.agent-main-card {
  min-height: auto;
}''',
    css,
)

# 6) Remove compact behavior that hid things we now want controlled by single-card layout.
css = css.replace(
    ".agent-command-widget.compact .agent-headline,\n.agent-command-widget.compact .agent-plan-card,\n.agent-command-widget.compact .agent-promise,\n.agent-command-widget.compact .agent-impact-row {\n  display: none;\n}\n",
    ".agent-command-widget.compact .agent-plan-card {\n  display: none;\n}\n",
)

# 7) Make card less tall in both modes.
css = re.sub(
    r'''\.agent-command-widget\.compact \.agent-main-card \{\s*min-height: auto;\s*padding: 18px;\s*\}''',
    '''.agent-command-widget.compact .agent-main-card {
  min-height: auto;
  padding: 18px;
}''',
    css,
)

css_path.write_text(css)

print("✅ Single-card UX aplicada")
print("- Eliminado aside agent-plan-card del JSX")
print("- Eliminado botón Ver/Ocultar plan completo")
print("- agent-review-mode ahora es una sola columna")
print("- ancho máximo reducido a 760px")
PY

echo ""
echo "✅ Backups:"
echo "${TSX}.bak-single-card-${STAMP}"
echo "${CSS}.bak-single-card-${STAMP}"

echo ""
echo "Verificación:"
grep -n "agent-plan-card\|Ver plan completo\|Ocultar plan completo\|grid-template-columns: minmax(0, 1.1fr)" "$TSX" "$CSS" || true
