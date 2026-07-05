#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="agent-ready-patch/investigation-autopilot-grid-deep-$(date +%Y%m%d%H%M%S)"
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

run "02-widget-registry-agent-autopilot" grep -n -C 18 \
  "agent.autopilot\|compactAutopilot\|dashboardDefaultPreset\|normalizeDashboardWidgetPreferences\|getDefaultDashboardWidgetPreferences" \
  src/components/dashboard-builder/widget-registry.ts

run "03-widget-registry-full" sed -n '1,470p' src/components/dashboard-builder/widget-registry.ts

run "04-dashboard-builder-grid-config" sed -n '1,430p' src/components/dashboard-builder/dashboard-builder.tsx

run "05-use-dashboard-layout-full" sed -n '1,220p' src/components/dashboard-builder/use-dashboard-layout.ts

run "06-dashboard-builder-types" sed -n '1,140p' src/components/dashboard-builder/types.ts

run "07-dashboard-v2-widget-mount" sed -n '1700,1770p' src/components/dashboard-v2/dashboard-v2.tsx

run "08-agent-widget-current-dimensions" grep -n -C 5 \
  "agent-command-widget\|agent-review-mode\|agent-main-card\|agent-execution-mode\|width: min\|min-height\|height\|display:" \
  src/components/agent/AgentCommandWidget.css

run "09-react-grid-layout-css-imports" grep -R \
  "react-grid-layout/css/styles.css\|react-resizable/css/styles.css\|ResponsiveGridLayout\|rowHeight\|margin=\|containerPadding\|layouts=\|onLayoutChange" \
  -n src package.json 2>/dev/null

run "10-dashboard-layout-supabase-table-usage" grep -R \
  "dashboard_layouts\|widgets.*upsert\|widgets.*select\|normalizedPreferences\|stored.*layout\|remotePreferences" \
  -n src/components/dashboard-builder src/lib src/hooks src/routes 2>/dev/null

run "11-tailwind-grid-box-suspects" grep -R \
  "agent.autopilot\|h-full min-h-0 overflow-hidden\|relative min-h-0 pl-6\|dashboard-widget-drag-grip\|dashboard-builder-grid\|react-grid-item\|react-grid-layout" \
  -n src 2>/dev/null

run "12-package-grid-version" sh -c 'cat package.json | grep -iE "react-grid-layout|react-resizable|@types/react-grid-layout" -C 3 || true'

run "13-current-agent-component-box" sed -n '360,510p' src/components/agent/AgentCommandWidget.tsx

run "14-current-agent-connected" sed -n '1,90p' src/components/agent/AgentCommandWidgetConnected.tsx

run "15-current-dashboard-builder-render-wrapper" sed -n '320,380p' src/components/dashboard-builder/dashboard-builder.tsx

run "16-all-layout-functions" grep -R \
  "function layout\|function .*Layout\|layoutMap\|defaultLayout\|preference.layout\|toGridLayouts\|normalize.*Preference\|updateWidgetPreference" \
  -n src/components/dashboard-builder 2>/dev/null

cat > "$OUT_DIR/browser-debug-autopilot-box.js" <<'JS'
// Pega esto en la consola del navegador estando en el dashboard.
// No modifica nada. Solo imprime medidas reales del widget y del grid item.

(() => {
  const agent = document.querySelector(".agent-command-widget");
  const gridItem =
    agent?.closest(".react-grid-item") ||
    agent?.closest("[class*='react-grid-item']");

  const shell =
    agent?.closest(".relative.min-h-0") ||
    agent?.closest("[class*='min-h-0']");

  const grip =
    gridItem?.querySelector(".dashboard-widget-drag-grip") ||
    document.querySelector(".dashboard-widget-drag-grip");

  const grid = document.querySelector(".react-grid-layout");

  function rect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
    };
  }

  function stylePick(el) {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      display: s.display,
      position: s.position,
      width: s.width,
      height: s.height,
      minWidth: s.minWidth,
      minHeight: s.minHeight,
      maxWidth: s.maxWidth,
      maxHeight: s.maxHeight,
      overflow: s.overflow,
      transform: s.transform,
      padding: s.padding,
      margin: s.margin,
    };
  }

  function attrs(el) {
    if (!el) return null;
    return {
      className: el.className,
      style: el.getAttribute("style"),
      dataGrid: el.getAttribute("data-grid"),
    };
  }

  console.table({
    agent_width: rect(agent)?.width,
    agent_height: rect(agent)?.height,
    grid_item_width: rect(gridItem)?.width,
    grid_item_height: rect(gridItem)?.height,
    shell_width: rect(shell)?.width,
    shell_height: rect(shell)?.height,
    grid_width: rect(grid)?.width,
    grid_height: rect(grid)?.height,
  });

  console.log("agent", { rect: rect(agent), style: stylePick(agent), attrs: attrs(agent) });
  console.log("gridItem", { rect: rect(gridItem), style: stylePick(gridItem), attrs: attrs(gridItem) });
  console.log("shell", { rect: rect(shell), style: stylePick(shell), attrs: attrs(shell) });
  console.log("grip", { rect: rect(grip), style: stylePick(grip), attrs: attrs(grip) });
  console.log("grid", { rect: rect(grid), style: stylePick(grid), attrs: attrs(grid) });

  const allGridItems = [...document.querySelectorAll(".react-grid-item")].map((el, index) => ({
    index,
    rect: rect(el),
    style: el.getAttribute("style"),
    text: el.textContent?.trim().slice(0, 80),
  }));

  console.table(allGridItems);
})();
JS

cat > "$OUT_DIR/browser-debug-layout-storage.js" <<'JS'
// Pega esto en consola para ver si hay layout guardado en localStorage/sessionStorage.
// No modifica nada.

(() => {
  const hits = [];

  function scanStorage(storage, name) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      const value = storage.getItem(key);
      if (
        key?.toLowerCase().includes("dashboard") ||
        key?.toLowerCase().includes("layout") ||
        value?.includes("agent.autopilot")
      ) {
        hits.push({
          storage: name,
          key,
          valuePreview: value?.slice(0, 1200),
        });
      }
    }
  }

  scanStorage(localStorage, "localStorage");
  scanStorage(sessionStorage, "sessionStorage");

  console.log("Storage hits:");
  console.table(hits);
  console.log(hits);
})();
JS

cat > "$OUT_DIR/SUMMARY.md" <<'SUMMARY'
# Investigación profunda tamaño box agent.autopilot

No se modificó código.

Objetivo:
Identificar por qué el área externa/draggable del widget agent.autopilot sigue grande aunque el componente visual esté compacto.

Revisar en este orden:

1. `02-widget-registry-agent-autopilot.md`
   - Confirmar si el default y preset actual están realmente reducidos.
   - Confirmar si quedó algún patch/clamp activo.

2. `04-dashboard-builder-grid-config.md`
   - Ver `rowHeight`, `margin`, `containerPadding`, `ResponsiveGridLayout`.
   - Ver si el wrapper fuerza `h-full`.

3. `05-use-dashboard-layout-full.md`
   - Ver cómo carga `dashboard_layouts` desde Supabase.
   - Ver si las preferencias remotas tienen prioridad.

4. `15-current-dashboard-builder-render-wrapper.md`
   - Ver el wrapper exacto:
     - `.react-grid-item`
     - `.relative min-h-0 pl-6`
     - `DashboardGridItemShell`

5. Abrir dashboard en navegador y pegar:
   - `browser-debug-autopilot-box.js`
   - `browser-debug-layout-storage.js`

La clave será comparar:
- tamaño `.agent-command-widget`
- tamaño `.react-grid-item`
- style inline del `.react-grid-item`
- si el layout guardado tiene w/h viejo
- si el registry/preset nuevo se está aplicando o no
SUMMARY

echo ""
echo "✅ Investigación profunda creada."
echo "📁 Carpeta: $OUT_DIR"
echo ""
echo "Pega estos outputs primero:"
echo "cat $OUT_DIR/02-widget-registry-agent-autopilot.md"
echo "cat $OUT_DIR/04-dashboard-builder-grid-config.md"
echo "cat $OUT_DIR/05-use-dashboard-layout-full.md"
echo "cat $OUT_DIR/15-current-dashboard-builder-render-wrapper.md"
echo ""
echo "Luego pega en el navegador estos JS y mándame la salida:"
echo "$OUT_DIR/browser-debug-autopilot-box.js"
echo "$OUT_DIR/browser-debug-layout-storage.js"
