import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckSquare,
  FileText,
  Flag,
  GitBranch,
  Goal,
  Inbox,
  MessageCircle,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

import type {
  DashboardBreakpoint,
  DashboardGridLayoutItem,
  DashboardWidgetDefinition,
  DashboardWidgetMode,
  DashboardWidgetPreference,
} from "./types";

const breakpoints: DashboardBreakpoint[] = ["lg", "md", "sm", "xs"];

function layout(
  id: string,
  lg: Omit<DashboardGridLayoutItem, "i">,
  md?: Omit<DashboardGridLayoutItem, "i">,
  sm?: Omit<DashboardGridLayoutItem, "i">,
  xs?: Omit<DashboardGridLayoutItem, "i">,
) {
  return {
    lg: { i: id, ...lg },
    md: { i: id, ...(md || { ...lg, x: Math.min(lg.x, 3), w: Math.min(lg.w, 6) }) },
    sm: { i: id, ...(sm || { ...lg, x: 0, w: 6 }) },
    xs: { i: id, ...(xs || { ...lg, x: 0, w: 1 }) },
  };
}

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    id: "sales.pipeline-summary",
    module: "sales",
    title: "Resumen del pipeline",
    description: "Muestra el valor abierto, las etapas activas y las oportunidades recientes.",
    icon: GitBranch,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("sales.pipeline-summary", {
      x: 0,
      y: 6,
      w: 4,
      h: 4,
      minW: 3,
      minH: 3,
    }),
  },
  {
    id: "finance.documents-overview",
    module: "finance",
    title: "Documentos de venta",
    description: "Resume facturas, cotizaciones y propuestas para entender qué está pendiente.",
    icon: Receipt,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("finance.documents-overview", {
      x: 0,
      y: 14,
      w: 8,
      h: 5,
      minW: 5,
      minH: 4,
    }),
  },
  {
    id: "work.center",
    module: "work",
    title: "Centro de trabajo",
    description: "Reúne tareas, proyectos, tickets, bandeja y agenda en una sola vista.",
    icon: CheckSquare,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
  },
  {
    id: "personal.todo-items",
    module: "tasks",
    title: "Mis pendientes",
    description: "Muestra tus tareas abiertas y las últimas actividades completadas.",
    icon: CheckSquare,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("personal.todo-items", { x: 8, y: 19, w: 4, h: 5, minW: 3, minH: 4 }),
  },
  {
    id: "leads.attention",
    module: "leads",
    title: "Prospectos por atender",
    description: "Detecta prospectos sin próxima acción o sin interacción reciente.",
    icon: Users,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("leads.attention", { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "tasks.my-work",
    module: "tasks",
    title: "Mis tareas",
    description: "Organiza tareas vencidas, de hoy, próximas y sin asignar.",
    icon: CheckSquare,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
  },
  {
    id: "projects.risk",
    module: "projects",
    title: "Riesgo de proyectos",
    description: "Proyectos activos, próximos a vencer o atrasados.",
    icon: Flag,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("projects.risk", { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "invoices.collections",
    module: "invoices",
    title: "Cobros pendientes",
    description: "Da seguimiento a facturas pendientes, vencidas y dinero cobrado.",
    icon: Receipt,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("invoices.collections", { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "proposals.pending",
    module: "proposals",
    title: "Propuestas pendientes",
    description: "Propuestas enviadas, vistas o esperando respuesta.",
    icon: FileText,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("proposals.pending", { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "inbox.pending",
    module: "inbox",
    title: "Bandeja pendiente",
    description: "WhatsApp, Messenger, Instagram y Email por atender.",
    icon: Inbox,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("inbox.pending", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "calendar.agenda",
    module: "calendar",
    title: "Agenda",
    description: "Tareas, llamadas y eventos de hoy o esta semana.",
    icon: CalendarDays,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
  },
  {
    id: "clients.review",
    module: "clients",
    title: "Clientes por revisar",
    description: "Clientes con cobros, propuestas o seguimiento pendiente.",
    icon: Users,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("clients.review", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "tickets.status",
    module: "tickets",
    title: "Tickets por estado",
    description: "Placeholder para soporte cuando el módulo esté activo.",
    icon: MessageCircle,
    size: "compact",
    supportedModes: ["mini", "standard"],
    defaultMode: "mini",
    defaultLayout: layout("tickets.status", { x: 8, y: 8, w: 2, h: 3, minW: 2, minH: 2 }),
  },
  {
    id: "activity.recent",
    module: "activity",
    title: "Actividad reciente",
    description: "Muestra los últimos movimientos relevantes dentro del CRM.",
    icon: Activity,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "reports.revenue-snapshot",
    module: "reports",
    title: "Resumen financiero",
    description: "Resume ingresos, cuentas por cobrar y señales financieras clave.",
    icon: BarChart3,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("reports.revenue-snapshot", {
      x: 0,
      y: 12,
      w: 6,
      h: 4,
      minW: 3,
      minH: 3,
    }),
  },
  {
    id: "goals.progress",
    module: "goals",
    title: "Avance de metas",
    description: "Placeholder para metas comerciales y operativas.",
    icon: Goal,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "mini",
    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
  },
  {
    id: "sales.quick-kpis",
    module: "sales",
    title: "Indicadores rápidos de ventas",
    description: "Indicadores compactos para leads, pipeline y cierre.",
    icon: TrendingUp,
    size: "compact",
    supportedModes: ["mini", "standard"],
    defaultMode: "mini",
    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
  },
];

const dashboardDefaultPreset: DashboardWidgetPreference[] = [
  {
    widgetId: "sales.quick-kpis",
    enabled: true,
    mode: "mini",
    layout: layout("sales.quick-kpis", { x: 0, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
    settings: {},
  },
  {
    widgetId: "leads.attention",
    enabled: true,
    mode: "mini",
    layout: layout("leads.attention", { x: 3, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
    settings: {},
  },
  {
    widgetId: "invoices.collections",
    enabled: true,
    mode: "mini",
    layout: layout("invoices.collections", { x: 6, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
    settings: {},
  },
  {
    widgetId: "proposals.pending",
    enabled: true,
    mode: "mini",
    layout: layout("proposals.pending", { x: 9, y: 0, w: 3, h: 1, minW: 2, minH: 1 }),
    settings: {},
  },
  {
    widgetId: "tasks.my-work",
    enabled: true,
    mode: "standard",
    layout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "calendar.agenda",
    enabled: true,
    mode: "standard",
    layout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "sales.pipeline-summary",
    enabled: true,
    mode: "standard",
    layout: layout("sales.pipeline-summary", { x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "inbox.pending",
    enabled: true,
    mode: "standard",
    layout: layout("inbox.pending", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "clients.review",
    enabled: true,
    mode: "standard",
    layout: layout("clients.review", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "activity.recent",
    enabled: true,
    mode: "standard",
    layout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "reports.revenue-snapshot",
    enabled: true,
    mode: "standard",
    layout: layout("reports.revenue-snapshot", { x: 4, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "projects.risk",
    enabled: true,
    mode: "standard",
    layout: layout("projects.risk", { x: 8, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
    settings: {},
  },
  {
    widgetId: "finance.documents-overview",
    enabled: true,
    mode: "standard",
    layout: layout("finance.documents-overview", { x: 0, y: 14, w: 8, h: 5, minW: 5, minH: 4 }),
    settings: {},
  },
  {
    widgetId: "personal.todo-items",
    enabled: true,
    mode: "standard",
    layout: layout("personal.todo-items", { x: 8, y: 14, w: 4, h: 5, minW: 3, minH: 4 }),
    settings: {},
  },
  {
    widgetId: "work.center",
    enabled: true,
    mode: "standard",
    layout: layout("work.center", { x: 0, y: 19, w: 8, h: 5, minW: 5, minH: 4 }),
    settings: {},
  },
];

const dashboardDefaultPresetById = new Map(
  dashboardDefaultPreset.map((preference) => [preference.widgetId, preference]),
);

export function getDashboardWidgetDefinition(widgetId: string) {
  return dashboardWidgetRegistry.find((widget) => widget.id === widgetId) || null;
}

export function getDefaultDashboardWidgetPreferences(): DashboardWidgetPreference[] {
  return dashboardWidgetRegistry.map((widget) => {
    const preset = dashboardDefaultPresetById.get(widget.id);

    return {
      widgetId: widget.id,
      enabled: preset?.enabled ?? false,
      mode: preset?.mode ?? widget.defaultMode,
      layout: preset?.layout ?? widget.defaultLayout,
      settings: preset?.settings ?? {},
    };
  });
}

export function getDefaultDashboardLayouts() {
  return breakpoints.reduce(
    (acc, breakpoint) => {
      acc[breakpoint] = getDefaultDashboardWidgetPreferences()
        .filter((widget) => widget.enabled)
        .map((widget) => widget.layout[breakpoint])
        .filter(Boolean) as DashboardGridLayoutItem[];
      return acc;
    },
    {} as Record<DashboardBreakpoint, DashboardGridLayoutItem[]>,
  );
}

export function normalizeDashboardWidgetPreferences(
  preferences: DashboardWidgetPreference[] | null | undefined,
) {
  const byId = new Map((preferences || []).map((preference) => [preference.widgetId, preference]));

  return dashboardWidgetRegistry.map((widget) => {
    const stored = byId.get(widget.id);
    const preset = dashboardDefaultPresetById.get(widget.id);
    const nextMode = (stored?.mode || preset?.mode || widget.defaultMode) as DashboardWidgetMode;

    return {
      widgetId: widget.id,
      enabled: stored?.enabled ?? preset?.enabled ?? false,
      mode: widget.supportedModes.includes(nextMode) ? nextMode : widget.defaultMode,
      layout: {
        ...(preset?.layout || widget.defaultLayout),
        ...(stored?.layout || {}),
      },
      settings: {
        ...(preset?.settings || {}),
        ...(stored?.settings || {}),
      },
    } satisfies DashboardWidgetPreference;
  });
}
