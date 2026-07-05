## 02-widget-registry-agent-autopilot
```
27-
28-function layout(
29-  id: string,
30-  lg: Omit<DashboardGridLayoutItem, "i">,
31-  md?: Omit<DashboardGridLayoutItem, "i">,
32-  sm?: Omit<DashboardGridLayoutItem, "i">,
33-  xs?: Omit<DashboardGridLayoutItem, "i">,
34-) {
35-  return {
36-    lg: { i: id, ...lg },
37-    md: { i: id, ...(md || { ...lg, x: Math.min(lg.x, 3), w: Math.min(lg.w, 6) }) },
38-    sm: { i: id, ...(sm || { ...lg, x: 0, w: 6 }) },
39-    xs: { i: id, ...(xs || { ...lg, x: 0, w: 1 }) },
40-  };
41-}
42-
43-export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
44-  {
45:    id: "agent.autopilot",
46-    module: "agent",
47-    title: "Autopilot del agente",
48-    description: "Sirve los planes diarios del agente con prioridades, contexto y próximos pasos.",
49-    icon: Sparkles,
50-    size: "expanded",
51-    supportedModes: ["mini", "standard"],
52-    defaultMode: "standard",
53:    defaultLayout: layout("agent.autopilot", {
54-      x: 0,
55-      y: 24,
56-      w: 12,
57-      h: 5,
58-      minW: 6,
59-      minH: 4,
60-    }),
61-  },
62-  {
63-    id: "sales.pipeline-summary",
64-    module: "sales",
65-    title: "Resumen del pipeline",
66-    description: "Muestra el valor abierto, las etapas activas y las oportunidades recientes.",
67-    icon: GitBranch,
68-    size: "expanded",
69-    supportedModes: ["mini", "standard"],
70-    defaultMode: "standard",
71-    defaultLayout: layout("sales.pipeline-summary", {
--
254-    size: "standard",
255-    supportedModes: ["mini", "standard"],
256-    defaultMode: "mini",
257-    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
258-  },
259-  {
260-    id: "sales.quick-kpis",
261-    module: "sales",
262-    title: "Indicadores rápidos de ventas",
263-    description: "Presenta métricas compactas de prospectos, pipeline y cierres.",
264-    icon: TrendingUp,
265-    size: "compact",
266-    supportedModes: ["mini", "standard"],
267-    defaultMode: "mini",
268-    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
269-  },
270-];
271-
272:const dashboardDefaultPreset: DashboardWidgetPreference[] = [
273-  {
274:    widgetId: "agent.autopilot",
275-    enabled: true,
276-    mode: "standard",
277:    layout: layout("agent.autopilot", { x: 0, y: 24, w: 6, h: 3, minW: 4, minH: 2 }),
278-    settings: {},
279-  },
280-  {
281-    widgetId: "sales.quick-kpis",
282-    enabled: true,
283-    mode: "mini",
284-    layout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
285-    settings: {},
286-  },
287-  {
288-    widgetId: "leads.attention",
289-    enabled: true,
290-    mode: "mini",
291-    layout: layout("leads.attention", { x: 3, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
292-    settings: {},
293-  },
294-  {
295-    widgetId: "invoices.collections",
--
369-    settings: {},
370-  },
371-  {
372-    widgetId: "personal.todo-items",
373-    enabled: true,
374-    mode: "standard",
375-    layout: layout("personal.todo-items", { x: 8, y: 14, w: 4, h: 5, minW: 3, minH: 4 }),
376-    settings: {},
377-  },
378-  {
379-    widgetId: "work.center",
380-    enabled: true,
381-    mode: "standard",
382-    layout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
383-    settings: {},
384-  },
385-];
386-
387:const dashboardDefaultPresetById = new Map(
388:  dashboardDefaultPreset.map((preference) => [preference.widgetId, preference]),
389-);
390-
391-export function getDashboardWidgetDefinition(widgetId: string) {
392-  return dashboardWidgetRegistry.find((widget) => widget.id === widgetId) || null;
393-}
394-
395:export function getDefaultDashboardWidgetPreferences(): DashboardWidgetPreference[] {
396-  return dashboardWidgetRegistry.map((widget) => {
397:    const preset = dashboardDefaultPresetById.get(widget.id);
398-
399-    return {
400-      widgetId: widget.id,
401-      enabled: preset?.enabled ?? false,
402-      mode: preset?.mode ?? widget.defaultMode,
403-      layout: preset?.layout ?? widget.defaultLayout,
404-      settings: preset?.settings ?? {},
405-    };
406-  });
407-}
408-
409-export function getDefaultDashboardLayouts() {
410-  return breakpoints.reduce(
411-    (acc, breakpoint) => {
412:      acc[breakpoint] = getDefaultDashboardWidgetPreferences()
413-        .filter((widget) => widget.enabled)
414-        .map((widget) => widget.layout[breakpoint])
415-        .filter(Boolean) as DashboardGridLayoutItem[];
416-      return acc;
417-    },
418-    {} as Record<DashboardBreakpoint, DashboardGridLayoutItem[]>,
419-  );
420-}
421-
422:export function normalizeDashboardWidgetPreferences(
423-  preferences: DashboardWidgetPreference[] | null | undefined,
424-) {
425-  const byId = new Map((preferences || []).map((preference) => [preference.widgetId, preference]));
426-
427-  return dashboardWidgetRegistry.map((widget) => {
428-    const stored = byId.get(widget.id);
429:    const preset = dashboardDefaultPresetById.get(widget.id);
430-    const nextMode = (stored?.mode || preset?.mode || widget.defaultMode) as DashboardWidgetMode;
431-
432-    return {
433-      widgetId: widget.id,
434-      enabled: stored?.enabled ?? preset?.enabled ?? false,
435-      mode: widget.supportedModes.includes(nextMode) ? nextMode : widget.defaultMode,
436-      layout: {
437-        ...(preset?.layout || widget.defaultLayout),
438-        ...(stored?.layout || {}),
439-      },
440-      settings: {
441-        ...(preset?.settings || {}),
442-        ...(stored?.settings || {}),
443-      },
444-    } satisfies DashboardWidgetPreference;
445-  });
446-}
```
