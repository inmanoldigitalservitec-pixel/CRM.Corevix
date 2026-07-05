## 16-all-layout-functions
```
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:28:function layout(
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:53:    defaultLayout: layout("agent.autopilot", {
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:71:    defaultLayout: layout("sales.pipeline-summary", {
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:89:    defaultLayout: layout("finance.documents-overview", {
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:107:    defaultLayout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:118:    defaultLayout: layout("personal.todo-items", { x: 8, y: 19, w: 4, h: 5, minW: 3, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:129:    defaultLayout: layout("leads.attention", { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:140:    defaultLayout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:151:    defaultLayout: layout("projects.risk", { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:162:    defaultLayout: layout("invoices.collections", { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:173:    defaultLayout: layout("proposals.pending", { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:184:    defaultLayout: layout("inbox.pending", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:195:    defaultLayout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:206:    defaultLayout: layout("clients.review", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:217:    defaultLayout: layout("tickets.status", { x: 8, y: 8, w: 2, h: 3, minW: 2, minH: 2 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:228:    defaultLayout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:239:    defaultLayout: layout("reports.revenue-snapshot", {
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:257:    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:268:    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:403:      layout: preset?.layout ?? widget.defaultLayout,
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:409:export function getDefaultDashboardLayouts() {
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:422:export function normalizeDashboardWidgetPreferences(
src/components/dashboard-builder/widget-registry.ts.bak-autopilot-box-20260705182935:437:        ...(preset?.layout || widget.defaultLayout),
src/components/dashboard-builder/dashboard-builder.tsx:31:  normalizeDashboardWidgetPreferences,
src/components/dashboard-builder/dashboard-builder.tsx:54:function toGridLayouts(preferences: DashboardWidgetPreference[], renderableIds: Set<string>) {
src/components/dashboard-builder/dashboard-builder.tsx:60:      .map((preference) => preference.layout[breakpoint])
src/components/dashboard-builder/dashboard-builder.tsx:72:function mergeLayoutsIntoPreferences(
src/components/dashboard-builder/dashboard-builder.tsx:78:    const nextLayout = { ...preference.layout };
src/components/dashboard-builder/dashboard-builder.tsx:107:function inferWidgetMode(item: LayoutItem): DashboardWidgetMode {
src/components/dashboard-builder/dashboard-builder.tsx:208:  const normalizedPreferences = useMemo(
src/components/dashboard-builder/dashboard-builder.tsx:209:    () => normalizeDashboardWidgetPreferences(preferences),
src/components/dashboard-builder/dashboard-builder.tsx:212:  const visiblePreferences = normalizedPreferences.filter(
src/components/dashboard-builder/dashboard-builder.tsx:216:    () => toGridLayouts(normalizedPreferences, renderableIds),
src/components/dashboard-builder/dashboard-builder.tsx:217:    [normalizedPreferences, renderableIds],
src/components/dashboard-builder/dashboard-builder.tsx:231:      mergeLayoutsIntoPreferences(normalizedPreferences, _currentLayout, allLayouts),
src/components/dashboard-builder/dashboard-builder.tsx:238:  const updateWidgetPreference = (
src/components/dashboard-builder/dashboard-builder.tsx:242:    const nextPreferences = normalizedPreferences.map((preference) =>
src/components/dashboard-builder/dashboard-builder.tsx:279:              preferences={normalizedPreferences}
src/components/dashboard-builder/dashboard-builder.tsx:282:              onEnabledChange={(widgetId, enabled) => updateWidgetPreference(widgetId, { enabled })}
src/components/dashboard-builder/types.ts:51:  defaultLayout: Partial<Record<DashboardBreakpoint, DashboardGridLayoutItem>>;
src/components/dashboard-builder/index.ts:17:  normalizeDashboardWidgetPreferences,
src/components/dashboard-builder/widget-registry.ts:28:function layout(
src/components/dashboard-builder/widget-registry.ts:53:    defaultLayout: layout("agent.autopilot", {
src/components/dashboard-builder/widget-registry.ts:71:    defaultLayout: layout("sales.pipeline-summary", {
src/components/dashboard-builder/widget-registry.ts:89:    defaultLayout: layout("finance.documents-overview", {
src/components/dashboard-builder/widget-registry.ts:107:    defaultLayout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:118:    defaultLayout: layout("personal.todo-items", { x: 8, y: 19, w: 4, h: 5, minW: 3, minH: 4 }),
src/components/dashboard-builder/widget-registry.ts:129:    defaultLayout: layout("leads.attention", { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:140:    defaultLayout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:151:    defaultLayout: layout("projects.risk", { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:162:    defaultLayout: layout("invoices.collections", { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:173:    defaultLayout: layout("proposals.pending", { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:184:    defaultLayout: layout("inbox.pending", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:195:    defaultLayout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:206:    defaultLayout: layout("clients.review", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:217:    defaultLayout: layout("tickets.status", { x: 8, y: 8, w: 2, h: 3, minW: 2, minH: 2 }),
src/components/dashboard-builder/widget-registry.ts:228:    defaultLayout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
src/components/dashboard-builder/widget-registry.ts:239:    defaultLayout: layout("reports.revenue-snapshot", {
src/components/dashboard-builder/widget-registry.ts:257:    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
src/components/dashboard-builder/widget-registry.ts:268:    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
src/components/dashboard-builder/widget-registry.ts:403:      layout: preset?.layout ?? widget.defaultLayout,
src/components/dashboard-builder/widget-registry.ts:409:export function getDefaultDashboardLayouts() {
src/components/dashboard-builder/widget-registry.ts:422:export function normalizeDashboardWidgetPreferences(
src/components/dashboard-builder/widget-registry.ts:437:        ...(preset?.layout || widget.defaultLayout),
src/components/dashboard-builder/use-dashboard-layout.ts:10:  normalizeDashboardWidgetPreferences,
src/components/dashboard-builder/use-dashboard-layout.ts:44:export function useDashboardLayout() {
src/components/dashboard-builder/use-dashboard-layout.ts:49:    normalizeDashboardWidgetPreferences(getDefaultDashboardWidgetPreferences()),
src/components/dashboard-builder/use-dashboard-layout.ts:57:      setPreferences(normalizeDashboardWidgetPreferences(readStoredPreferences(companyId, userId)));
src/components/dashboard-builder/use-dashboard-layout.ts:70:        setPreferences(normalizeDashboardWidgetPreferences(localPreferences));
src/components/dashboard-builder/use-dashboard-layout.ts:84:        setPreferences(normalizeDashboardWidgetPreferences(localPreferences));
src/components/dashboard-builder/use-dashboard-layout.ts:93:      const nextPreferences = normalizeDashboardWidgetPreferences(remotePreferences);
src/components/dashboard-builder/use-dashboard-layout.ts:108:      const normalized = normalizeDashboardWidgetPreferences(nextPreferences);
```
