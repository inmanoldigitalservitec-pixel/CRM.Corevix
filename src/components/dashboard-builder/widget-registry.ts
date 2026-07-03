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
    title: "Pipeline summary",
    description: "Valor abierto, etapas y oportunidades recientes.",
    icon: GitBranch,
    size: "expanded",
    supportedModes: ["mini", "standard", "advanced"],
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
    id: "leads.attention",
    module: "leads",
    title: "Leads needing attention",
    description: "Prospectos sin próxima acción o sin interacción reciente.",
    icon: Users,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("leads.attention", { x: 6, y: 0, w: 3, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "tasks.my-work",
    module: "tasks",
    title: "My tasks",
    description: "Tareas vencidas, de hoy, próximas y sin asignar.",
    icon: CheckSquare,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("tasks.my-work", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 }),
  },
  {
    id: "projects.risk",
    module: "projects",
    title: "Project risk",
    description: "Proyectos activos, próximos a vencer o atrasados.",
    icon: Flag,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("projects.risk", { x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "invoices.collections",
    module: "invoices",
    title: "Awaiting payment",
    description: "Facturas pendientes, vencidas y dinero cobrado.",
    icon: Receipt,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("invoices.collections", { x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "proposals.pending",
    module: "proposals",
    title: "Pending proposals",
    description: "Propuestas enviadas, vistas o esperando respuesta.",
    icon: FileText,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("proposals.pending", { x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "inbox.pending",
    module: "inbox",
    title: "Inbox pending",
    description: "WhatsApp, Messenger, Instagram y Email por atender.",
    icon: Inbox,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
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
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("calendar.agenda", { x: 8, y: 1, w: 4, h: 5, minW: 3, minH: 3 }),
  },
  {
    id: "clients.review",
    module: "clients",
    title: "Clients to review",
    description: "Clientes con cobros, propuestas o seguimiento pendiente.",
    icon: Users,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("clients.review", { x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "tickets.status",
    module: "tickets",
    title: "Tickets by status",
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
    title: "Recent CRM activity",
    description: "Últimos movimientos relevantes dentro del CRM.",
    icon: Activity,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "standard",
    defaultLayout: layout("activity.recent", { x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "reports.revenue-snapshot",
    module: "reports",
    title: "Revenue snapshot",
    description: "Resumen de ingresos, cuentas por cobrar y tendencia.",
    icon: BarChart3,
    size: "expanded",
    supportedModes: ["mini", "standard", "advanced"],
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
    title: "Goals progress",
    description: "Placeholder para metas comerciales y operativas.",
    icon: Goal,
    size: "standard",
    supportedModes: ["mini", "standard", "advanced"],
    defaultMode: "mini",
    defaultLayout: layout("goals.progress", { x: 6, y: 12, w: 3, h: 3, minW: 2, minH: 2 }),
  },
  {
    id: "sales.quick-kpis",
    module: "sales",
    title: "Sales quick KPIs",
    description: "Indicadores compactos para leads, pipeline y cierre.",
    icon: TrendingUp,
    size: "compact",
    supportedModes: ["mini", "standard"],
    defaultMode: "mini",
    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 12, h: 1, minW: 6, minH: 1 }),
  },
];

export function getDashboardWidgetDefinition(widgetId: string) {
  return dashboardWidgetRegistry.find((widget) => widget.id === widgetId) || null;
}

export function getDefaultDashboardWidgetPreferences(): DashboardWidgetPreference[] {
  return dashboardWidgetRegistry.map((widget) => ({
    widgetId: widget.id,
    enabled: true,
    mode: widget.defaultMode,
    layout: widget.defaultLayout,
    settings: {},
  }));
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
    const nextMode = (stored?.mode || widget.defaultMode) as DashboardWidgetMode;

    return {
      widgetId: widget.id,
      enabled: stored?.enabled ?? true,
      mode: widget.supportedModes.includes(nextMode) ? nextMode : widget.defaultMode,
      layout: {
        ...widget.defaultLayout,
        ...(stored?.layout || {}),
      },
      settings: stored?.settings || {},
    } satisfies DashboardWidgetPreference;
  });
}
