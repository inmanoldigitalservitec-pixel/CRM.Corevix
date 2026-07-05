## 04-widget-registry-agent-layout
```
23-  DashboardWidgetPreference,
24-} from "./types";
25-
26-const breakpoints: DashboardBreakpoint[] = ["lg", "md", "sm", "xs"];
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
71:    defaultLayout: layout("sales.pipeline-summary", {
72-      x: 0,
73-      y: 6,
74-      w: 4,
75-      h: 4,
76-      minW: 3,
77-      minH: 3,
78-    }),
79-  },
80-  {
81-    id: "finance.documents-overview",
82-    module: "finance",
83-    title: "Documentos de venta",
84-    description: "Resume facturas, cotizaciones y propuestas para entender qué está pendiente.",
85-    icon: Receipt,
86-    size: "expanded",
87-    supportedModes: ["mini", "standard"],
88-    defaultMode: "standard",
89:    defaultLayout: layout("finance.documents-overview", {
90-      x: 0,
91-      y: 14,
92-      w: 8,
93-      h: 5,
94-      minW: 5,
95-      minH: 4,
96-    }),
97-  },
98-  {
99-    id: "work.center",
100-    module: "work",
101-    title: "Centro de trabajo",
102-    description: "Reúne tareas, proyectos, tickets, bandeja y agenda en una sola vista.",
103-    icon: CheckSquare,
104-    size: "expanded",
105-    supportedModes: ["mini", "standard"],
106-    defaultMode: "standard",
107:    defaultLayout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
108-  },
109-  {
110-    id: "personal.todo-items",
111-    module: "tasks",
112-    title: "Mis pendientes",
113-    description: "Muestra tus tareas abiertas y las últimas actividades completadas.",
114-    icon: CheckSquare,
115-    size: "standard",
116-    supportedModes: ["mini", "standard"],
117-    defaultMode: "standard",
118:    defaultLayout: layout("personal.todo-items", { x: 8, y: 19, w: 4, h: 5, minW: 3, minH: 4 }),
119-  },
120-  {
121-    id: "leads.attention",
122-    module: "leads",
123-    title: "Prospectos por atender",
124-    description: "Detecta prospectos sin próxima acción o sin interacción reciente.",
125-    icon: Users,
126-    size: "standard",
127-    supportedModes: ["mini", "standard"],
128-    defaultMode: "standard",
129:    defaultLayout: layout("leads.attention", { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 }),
130-  },
131-  {
132-    id: "tasks.my-work",
133-    module: "tasks",
134-    title: "Mis tareas",
135-    description: "Organiza tareas vencidas, de hoy, próximas y sin asignar.",
136-    icon: CheckSquare,
137-    size: "standard",
138-    supportedModes: ["mini", "standard"],
139-    defaultMode: "standard",
140:    defaultLayout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
141-  },
142-  {
143-    id: "projects.risk",
144-    module: "projects",
145-    title: "Riesgo de proyectos",
146-    description: "Identifica proyectos activos, próximos a vencer o atrasados.",
147-    icon: Flag,
148-    size: "standard",
149-    supportedModes: ["mini", "standard"],
150-    defaultMode: "standard",
151:    defaultLayout: layout("projects.risk", { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
152-  },
153-  {
154-    id: "invoices.collections",
155-    module: "invoices",
156-    title: "Cobros pendientes",
157-    description: "Da seguimiento a facturas pendientes, vencidas y dinero cobrado.",
158-    icon: Receipt,
159-    size: "standard",
160-    supportedModes: ["mini", "standard"],
161-    defaultMode: "standard",
162:    defaultLayout: layout("invoices.collections", { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
163-  },
164-  {
165-    id: "proposals.pending",
166-    module: "proposals",
167-    title: "Propuestas pendientes",
168-    description: "Muestra propuestas enviadas, vistas o esperando respuesta.",
169-    icon: FileText,
170-    size: "standard",
171-    supportedModes: ["mini", "standard"],
172-    defaultMode: "standard",
173:    defaultLayout: layout("proposals.pending", { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
174-  },
175-  {
176-    id: "inbox.pending",
177-    module: "inbox",
178-    title: "Bandeja pendiente",
179-    description: "Centraliza WhatsApp, Messenger, Instagram y Email por atender.",
180-    icon: Inbox,
181-    size: "standard",
182-    supportedModes: ["mini", "standard"],
183-    defaultMode: "standard",
184:    defaultLayout: layout("inbox.pending", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
185-  },
186-  {
187-    id: "calendar.agenda",
188-    module: "calendar",
189-    title: "Agenda",
190-    description: "Tareas, llamadas y eventos de hoy o esta semana.",
191-    icon: CalendarDays,
192-    size: "standard",
193-    supportedModes: ["mini", "standard"],
194-    defaultMode: "standard",
195:    defaultLayout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
196-  },
197-  {
198-    id: "clients.review",
199-    module: "clients",
200-    title: "Clientes por revisar",
201-    description: "Señala clientes con cobros, propuestas o seguimiento pendiente.",
202-    icon: Users,
203-    size: "standard",
204-    supportedModes: ["mini", "standard"],
205-    defaultMode: "standard",
206:    defaultLayout: layout("clients.review", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
207-  },
208-  {
209-    id: "tickets.status",
210-    module: "tickets",
211-    title: "Tickets por estado",
212-    description: "Reserva espacio para revisar soporte cuando el módulo esté activo.",
213-    icon: MessageCircle,
214-    size: "compact",
215-    supportedModes: ["mini", "standard"],
216-    defaultMode: "mini",
217:    defaultLayout: layout("tickets.status", { x: 8, y: 8, w: 2, h: 3, minW: 2, minH: 2 }),
218-  },
219-  {
220-    id: "activity.recent",
221-    module: "activity",
222-    title: "Actividad reciente",
223-    description: "Muestra los últimos movimientos relevantes dentro del CRM.",
224-    icon: Activity,
225-    size: "standard",
226-    supportedModes: ["mini", "standard"],
227-    defaultMode: "standard",
228:    defaultLayout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
229-  },
230-  {
231-    id: "reports.revenue-snapshot",
232-    module: "reports",
233-    title: "Resumen financiero",
234-    description: "Resume ingresos, cuentas por cobrar y señales financieras clave.",
235-    icon: BarChart3,
236-    size: "expanded",
237-    supportedModes: ["mini", "standard"],
238-    defaultMode: "standard",
239:    defaultLayout: layout("reports.revenue-snapshot", {
240-      x: 0,
241-      y: 12,
242-      w: 6,
243-      h: 4,
244-      minW: 3,
245-      minH: 3,
246-    }),
247-  },
248-  {
249-    id: "goals.progress",
250-    module: "goals",
251-    title: "Avance de metas",
252-    description: "Reserva espacio para medir metas comerciales y operativas.",
253-    icon: Goal,
254-    size: "standard",
255-    supportedModes: ["mini", "standard"],
256-    defaultMode: "mini",
257:    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
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
268:    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
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
296-    enabled: true,
297-    mode: "mini",
298-    layout: layout("invoices.collections", { x: 6, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
299-    settings: {},
--
365-    widgetId: "finance.documents-overview",
366-    enabled: true,
367-    mode: "standard",
368-    layout: layout("finance.documents-overview", { x: 0, y: 14, w: 8, h: 5, minW: 5, minH: 4 }),
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
395-export function getDefaultDashboardWidgetPreferences(): DashboardWidgetPreference[] {
396-  return dashboardWidgetRegistry.map((widget) => {
397:    const preset = dashboardDefaultPresetById.get(widget.id);
398-
399-    return {
400-      widgetId: widget.id,
401-      enabled: preset?.enabled ?? false,
402-      mode: preset?.mode ?? widget.defaultMode,
403:      layout: preset?.layout ?? widget.defaultLayout,
404-      settings: preset?.settings ?? {},
405-    };
406-  });
407-}
408-
409-export function getDefaultDashboardLayouts() {
410-  return breakpoints.reduce(
411-    (acc, breakpoint) => {
412-      acc[breakpoint] = getDefaultDashboardWidgetPreferences()
413-        .filter((widget) => widget.enabled)
414-        .map((widget) => widget.layout[breakpoint])
415-        .filter(Boolean) as DashboardGridLayoutItem[];
416-      return acc;
417-    },
418-    {} as Record<DashboardBreakpoint, DashboardGridLayoutItem[]>,
419-  );
420-}
421-
422-export function normalizeDashboardWidgetPreferences(
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
437:        ...(preset?.layout || widget.defaultLayout),
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
