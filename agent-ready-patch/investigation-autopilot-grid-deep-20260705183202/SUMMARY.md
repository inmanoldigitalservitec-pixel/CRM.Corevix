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
