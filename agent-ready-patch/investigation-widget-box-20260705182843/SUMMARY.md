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
