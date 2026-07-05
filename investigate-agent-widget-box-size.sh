#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="agent-ready-patch/investigation-widget-box-$(date +%Y%m%d%H%M%S)"
mkdir -p "$OUT_DIR"

echo "📁 Output: $OUT_DIR"

run() {
  local name="$1"
  shift
  echo ""
  echo "============================================================"
  echo "▶ $name"
  echo "============================================================"
  {
    echo "## $name"
    echo '```'
    "$@" 2>&1 || true
    echo '```'
  } | tee "$OUT_DIR/$name.md"
}

run "01-git-status" git status --short

run "02-agent-widget-files" find src/components/agent src/components/dashboard-v2 -maxdepth 2 -type f | sort

run "03-agent-widget-placement-dashboard" grep -R \
  "AgentCommandWidget\|AgentCommandWidgetConnected\|agentPromptPayload\|agent-widget\|autopilot\|Autopilot" \
  -n src/components/dashboard-v2 src/pages src/app src/components 2>/dev/null

run "04-dashboard-layout-containers" grep -R \
  "grid\|Grid\|layout\|draggable\|resize\|widget\|card\|dashboard-card\|DashboardCard\|section\|col-span\|row-span\|min-h\|height\|h-\|w-" \
  -n src/components/dashboard-v2 src/components src/pages src/app 2>/dev/null

run "05-agent-widget-tsx-relevant" sed -n '1,560p' src/components/agent/AgentCommandWidget.tsx

run "06-agent-widget-css-full" sed -n '1,680p' src/components/agent/AgentCommandWidget.css

run "07-connected-widget" sed -n '1,260p' src/components/agent/AgentCommandWidgetConnected.tsx

run "08-dashboard-v2-agent-area" grep -n -C 35 \
  "AgentCommandWidget\|AgentCommandWidgetConnected\|Corevix Autopilot\|agentPromptPayload" \
  src/components/dashboard-v2/dashboard-v2.tsx

run "09-dashboard-card" sed -n '1,180p' src/components/dashboard-v2/dashboard-card.tsx

run "10-dashboard-css-and-styles" find src -type f \( -name "*.css" -o -name "*.scss" -o -name "*.module.css" -o -name "*.tsx" \) \
  | xargs grep -n \
  "dashboard-v2\|dashboard-grid\|dashboard-card\|widget-shell\|drag\|draggable\|grid-stack\|react-grid-layout\|min-height\|min-h\|height:" \
  2>/dev/null || true

run "11-package-grid-libs" sh -c 'cat package.json | grep -iE "grid|drag|resize|layout|dnd|sortable|react-grid-layout" -C 2 || true'

run "12-agent-dimensions-grep" grep -R \
  "agent-command-widget\|agent-review-mode\|agent-main-card\|agent-plan-card\|agent-execution-mode\|min-height\|width: min\|height" \
  -n src/components/agent src/components/dashboard-v2 2>/dev/null

cat > "$OUT_DIR/SUMMARY.md" <<'SUMMARY'
# Investigación box/tamaño del widget Autopilot

Objetivo:
Detectar por qué el área externa/draggable/seleccionable del widget sigue grande aunque el contenedor visual del agente ya fue reducido.

Revisar en este orden:

1. `08-dashboard-v2-agent-area.md`
   - Ver exactamente dónde se monta AgentCommandWidgetConnected.
   - Identificar si está dentro de DashboardCard, grid item, wrapper, section, etc.

2. `04-dashboard-layout-containers.md`
   - Buscar clases tipo min-h, row-span, col-span, grid, widget, draggable.

3. `09-dashboard-card.md`
   - Confirmar si DashboardCard impone min-height/padding/height.

4. `10-dashboard-css-and-styles.md`
   - Buscar CSS global que esté dando altura fija o min-height.

5. `06-agent-widget-css-full.md`
   - Revisar si `.agent-command-widget`, `.agent-review-mode`, `.agent-main-card` o `.agent-execution-mode` todavía fuerzan alto grande.

Hipótesis:
- El área grande no viene del widget visual, sino del wrapper del dashboard.
- Puede haber un `min-height`, `row-span`, `h-[...]`, `min-h-[...]`, `grid-template`, `DashboardCard`, o layout draggable manteniendo tamaño anterior.
- También puede venir de `.agent-execution-mode` aunque esté oculto visualmente.
SUMMARY

echo ""
echo "✅ Investigación completada."
echo "📁 Carpeta creada: $OUT_DIR"
echo ""
echo "Pega estos outputs:"
echo "cat $OUT_DIR/08-dashboard-v2-agent-area.md"
echo "cat $OUT_DIR/09-dashboard-card.md"
echo "cat $OUT_DIR/10-dashboard-css-and-styles.md"
echo "cat $OUT_DIR/12-agent-dimensions-grep.md"
