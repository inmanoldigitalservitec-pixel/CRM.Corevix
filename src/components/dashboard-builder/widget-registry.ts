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
  Sparkles,
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

const breakpoints: DashboardBreakpoint[] = ["2xl", "xl", "lg", "md", "sm", "xs"];

function layout(
  id: string,
  lg: Omit<DashboardGridLayoutItem, "i">,
  md?: Omit<DashboardGridLayoutItem, "i">,
  sm?: Omit<DashboardGridLayoutItem, "i">,
  xs?: Omit<DashboardGridLayoutItem, "i">,
) {
  return {
    "2xl": { i: id, ...lg },
    xl: { i: id, ...lg },
    lg: { i: id, ...lg },
    md: { i: id, ...(md || { ...lg, x: Math.min(lg.x, 4), w: Math.min(lg.w, 8) }) },
    sm: { i: id, ...(sm || { ...lg, x: 0, w: Math.min(lg.w, 4) }) },
    xs: { i: id, ...(xs || { ...lg, x: 0, w: 1 }) },
  };
}

export const dashboardWidgetRegistry: DashboardWidgetDefinition[] = [
  {
    id: "agent.autopilot",
    module: "agent",
    title: "Autopilot del agente",
    description: "Sirve los planes diarios del agente con prioridades, contexto y próximos pasos.",
    icon: Sparkles,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("agent.autopilot", {
      x: 0,
      y: 24,
      w: 6,
      h: 6,
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
    title: "To Do",
    description: "Checklist de tareas abiertas con completadas recientes.",
    icon: CheckSquare,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("personal.todo-items", { x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 4 }),
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
    id: "projects.risk",
    module: "projects",
    title: "Riesgo de proyectos",
    description: "Identifica proyectos activos, próximos a vencer o atrasados.",
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
    description: "Muestra propuestas enviadas, vistas o esperando respuesta.",
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
    description: "Centraliza WhatsApp, Messenger, Instagram y Email por atender.",
    icon: Inbox,
    size: "standard",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("inbox.pending", { x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 }),
  },
  {
    id: "calendar.agenda",
    module: "calendar",
    title: "Calendario",
    description: "Agenda visual con eventos, tareas, facturas, propuestas y proyectos.",
    icon: CalendarDays,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("calendar.agenda", { x: 4, y: 6, w: 8, h: 8, minW: 5, minH: 5 }),
  },
  {
    id: "clients.review",
    module: "clients",
    title: "Clientes por revisar",
    description: "Señala clientes con cobros, propuestas o seguimiento pendiente.",
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
    description: "Reserva espacio para revisar soporte cuando el módulo esté activo.",
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
    title: "Panel financiero",
    description: "Slides con cobros, pipeline, propuestas y prioridades financieras.",
    icon: BarChart3,
    size: "expanded",
    supportedModes: ["mini", "standard"],
    defaultMode: "standard",
    defaultLayout: layout("reports.revenue-snapshot", {
      x: 0,
      y: 12,
      w: 4,
      h: 5,
      minW: 3,
      minH: 4,
    }),
  },
  {
    id: "goals.progress",
    module: "goals",
    title: "Avance de metas",
    description: "Reserva espacio para medir metas comerciales y operativas.",
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
    description: "Presenta métricas compactas de prospectos, pipeline y cierres.",
    icon: TrendingUp,
    size: "compact",
    supportedModes: ["standard"],
    defaultMode: "standard",
    defaultLayout: layout("sales.quick-kpis", { x: 0, y: 0, w: 12, h: 1, minW: 6, minH: 1 }),
  },
];

const dashboardDefaultPreset: DashboardWidgetPreference[] = [
  {
    widgetId: "agent.autopilot",
    enabled: false,
    mode: "standard",
    layout: {
      "2xl": {
        h: 3,
        i: "agent.autopilot",
        w: 7,
        x: 0,
        y: 15,
        minH: 3,
        minW: 3,
        static: false,
      },
      xl: {
        h: 3,
        i: "agent.autopilot",
        w: 7,
        x: 0,
        y: 15,
        minH: 3,
        minW: 3,
        static: false,
      },
      lg: {
        h: 3,
        i: "agent.autopilot",
        w: 7,
        x: 0,
        y: 15,
        minH: 3,
        minW: 3,
        static: false,
      },
      md: {
        h: 6,
        i: "agent.autopilot",
        w: 6,
        x: 0,
        y: 35,
        minH: 3,
        minW: 3,
        static: false,
      },
      sm: {
        h: 6,
        i: "agent.autopilot",
        w: 1,
        x: 0,
        y: 53,
        minH: 3,
        minW: 1,
        static: false,
      },
      xs: {
        h: 6,
        i: "agent.autopilot",
        w: 1,
        x: 0,
        y: 53,
        minH: 3,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "finance.documents-overview",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 4,
        i: "finance.documents-overview",
        w: 8,
        x: 0,
        y: 1,
        minH: 4,
        minW: 5,
        static: false,
      },
      xl: {
        h: 4,
        i: "finance.documents-overview",
        w: 8,
        x: 0,
        y: 1,
        minH: 4,
        minW: 5,
        static: false,
      },
      lg: {
        h: 4,
        i: "finance.documents-overview",
        w: 8,
        x: 0,
        y: 1,
        minH: 4,
        minW: 5,
        static: false,
      },
      md: {
        i: "finance.documents-overview",
        x: 0,
        y: 3,
        w: 5,
        h: 4,
        minW: 5,
        minH: 4,
        static: false,
      },
      sm: {
        h: 5,
        i: "finance.documents-overview",
        w: 1,
        x: 0,
        y: 1,
        minH: 4,
        minW: 1,
        static: false,
      },
      xs: {
        h: 5,
        i: "finance.documents-overview",
        w: 1,
        x: 0,
        y: 1,
        minH: 4,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "work.center",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 5,
        i: "work.center",
        w: 8,
        x: 0,
        y: 5,
        minH: 4,
        minW: 5,
        static: false,
      },
      xl: {
        h: 5,
        i: "work.center",
        w: 8,
        x: 0,
        y: 5,
        minH: 4,
        minW: 5,
        static: false,
      },
      lg: {
        h: 5,
        i: "work.center",
        w: 8,
        x: 0,
        y: 5,
        minH: 4,
        minW: 5,
        static: false,
      },
      md: {
        i: "work.center",
        x: 0,
        y: 7,
        w: 5,
        h: 5,
        minW: 5,
        minH: 4,
        static: false,
      },
      sm: {
        h: 5,
        i: "work.center",
        w: 1,
        x: 0,
        y: 11,
        minH: 4,
        minW: 1,
        static: false,
      },
      xs: {
        h: 5,
        i: "work.center",
        w: 1,
        x: 0,
        y: 11,
        minH: 4,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "personal.todo-items",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 4,
        i: "personal.todo-items",
        w: 4,
        x: 8,
        y: 1,
        minH: 4,
        minW: 3,
        static: false,
      },
      xl: {
        h: 4,
        i: "personal.todo-items",
        w: 4,
        x: 8,
        y: 1,
        minH: 4,
        minW: 3,
        static: false,
      },
      lg: {
        h: 4,
        i: "personal.todo-items",
        w: 4,
        x: 8,
        y: 1,
        minH: 4,
        minW: 3,
        static: false,
      },
      md: {
        i: "personal.todo-items",
        x: 5,
        y: 3,
        w: 3,
        h: 4,
        minW: 3,
        minH: 4,
        static: false,
      },
      sm: {
        h: 5,
        i: "personal.todo-items",
        w: 1,
        x: 0,
        y: 6,
        minH: 4,
        minW: 1,
        static: false,
      },
      xs: {
        h: 5,
        i: "personal.todo-items",
        w: 1,
        x: 0,
        y: 6,
        minH: 4,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "leads.attention",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 5,
        i: "leads.attention",
        w: 4,
        x: 8,
        y: 15,
        minH: 1,
        minW: 2,
        static: false,
      },
      xl: {
        h: 5,
        i: "leads.attention",
        w: 4,
        x: 8,
        y: 15,
        minH: 1,
        minW: 2,
        static: false,
      },
      lg: {
        h: 5,
        i: "leads.attention",
        w: 4,
        x: 8,
        y: 15,
        minH: 1,
        minW: 2,
        static: false,
      },
      md: {
        h: 5,
        i: "leads.attention",
        w: 3,
        x: 5,
        y: 18,
        minH: 1,
        minW: 2,
        static: false,
      },
      sm: {
        h: 1,
        i: "leads.attention",
        w: 1,
        x: 0,
        y: 30,
        minH: 1,
        minW: 1,
        static: false,
      },
      xs: {
        h: 1,
        i: "leads.attention",
        w: 1,
        x: 0,
        y: 30,
        minH: 1,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "projects.risk",
    enabled: false,
    mode: "standard",
    layout: {
      "2xl": {
        h: 4,
        i: "projects.risk",
        w: 4,
        x: 8,
        y: 6,
        minH: 3,
        minW: 3,
        static: false,
      },
      xl: {
        h: 4,
        i: "projects.risk",
        w: 4,
        x: 8,
        y: 6,
        minH: 3,
        minW: 3,
        static: false,
      },
      lg: {
        h: 4,
        i: "projects.risk",
        w: 4,
        x: 8,
        y: 6,
        minH: 3,
        minW: 3,
        static: false,
      },
      md: {
        h: 4,
        i: "projects.risk",
        w: 4,
        x: 0,
        y: 21,
        minH: 3,
        minW: 3,
        static: false,
      },
      sm: {
        h: 4,
        i: "projects.risk",
        w: 1,
        x: 0,
        y: 26,
        minH: 3,
        minW: 1,
        static: false,
      },
      xs: {
        h: 4,
        i: "projects.risk",
        w: 1,
        x: 0,
        y: 26,
        minH: 3,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "invoices.collections",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 5,
        i: "invoices.collections",
        w: 8,
        x: 0,
        y: 15,
        minH: 1,
        minW: 2,
        static: false,
      },
      xl: {
        h: 5,
        i: "invoices.collections",
        w: 8,
        x: 0,
        y: 15,
        minH: 1,
        minW: 2,
        static: false,
      },
      lg: {
        h: 5,
        i: "invoices.collections",
        w: 8,
        x: 0,
        y: 15,
        minH: 1,
        minW: 2,
        static: false,
      },
      md: {
        h: 5,
        i: "invoices.collections",
        w: 5,
        x: 0,
        y: 18,
        minH: 1,
        minW: 2,
        static: false,
      },
      sm: {
        h: 1,
        i: "invoices.collections",
        w: 1,
        x: 0,
        y: 29,
        minH: 1,
        minW: 1,
        static: false,
      },
      xs: {
        h: 1,
        i: "invoices.collections",
        w: 1,
        x: 0,
        y: 29,
        minH: 1,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "proposals.pending",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 5,
        i: "proposals.pending",
        w: 4,
        x: 8,
        y: 10,
        minH: 1,
        minW: 2,
        static: false,
      },
      xl: {
        h: 5,
        i: "proposals.pending",
        w: 4,
        x: 8,
        y: 10,
        minH: 1,
        minW: 2,
        static: false,
      },
      lg: {
        h: 5,
        i: "proposals.pending",
        w: 4,
        x: 8,
        y: 10,
        minH: 1,
        minW: 2,
        static: false,
      },
      md: {
        h: 4,
        i: "proposals.pending",
        w: 3,
        x: 5,
        y: 14,
        minH: 1,
        minW: 2,
        static: false,
      },
      sm: {
        h: 1,
        i: "proposals.pending",
        w: 1,
        x: 0,
        y: 28,
        minH: 1,
        minW: 1,
        static: false,
      },
      xs: {
        h: 1,
        i: "proposals.pending",
        w: 1,
        x: 0,
        y: 28,
        minH: 1,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "inbox.pending",
    enabled: false,
    mode: "standard",
    layout: {
      "2xl": {
        h: 4,
        i: "inbox.pending",
        w: 4,
        x: 4,
        y: 6,
        minH: 3,
        minW: 3,
        static: false,
      },
      xl: {
        h: 4,
        i: "inbox.pending",
        w: 4,
        x: 4,
        y: 6,
        minH: 3,
        minW: 3,
        static: false,
      },
      lg: {
        h: 4,
        i: "inbox.pending",
        w: 4,
        x: 4,
        y: 6,
        minH: 3,
        minW: 3,
        static: false,
      },
      md: {
        i: "inbox.pending",
        x: 5,
        y: 14,
        w: 3,
        h: 4,
        minW: 3,
        minH: 3,
        static: false,
      },
      sm: {
        h: 4,
        i: "inbox.pending",
        w: 1,
        x: 0,
        y: 18,
        minH: 3,
        minW: 1,
        static: false,
      },
      xs: {
        h: 4,
        i: "inbox.pending",
        w: 1,
        x: 0,
        y: 18,
        minH: 3,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "calendar.agenda",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 5,
        i: "calendar.agenda",
        w: 8,
        x: 0,
        y: 10,
        minH: 5,
        minW: 5,
        static: false,
      },
      xl: {
        h: 5,
        i: "calendar.agenda",
        w: 8,
        x: 0,
        y: 10,
        minH: 5,
        minW: 5,
        static: false,
      },
      lg: {
        h: 5,
        i: "calendar.agenda",
        w: 8,
        x: 0,
        y: 10,
        minH: 5,
        minW: 5,
        static: false,
      },
      md: {
        i: "calendar.agenda",
        x: 0,
        y: 12,
        w: 5,
        h: 6,
        minW: 5,
        minH: 5,
        static: false,
      },
      sm: {
        h: 8,
        i: "calendar.agenda",
        w: 1,
        x: 0,
        y: 20,
        minH: 5,
        minW: 1,
        static: false,
      },
      xs: {
        h: 8,
        i: "calendar.agenda",
        w: 1,
        x: 0,
        y: 20,
        minH: 5,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "clients.review",
    enabled: false,
    mode: "standard",
    layout: {
      "2xl": {
        h: 4,
        i: "clients.review",
        w: 4,
        x: 8,
        y: 11,
        minH: 3,
        minW: 3,
        static: false,
      },
      xl: {
        h: 4,
        i: "clients.review",
        w: 4,
        x: 8,
        y: 11,
        minH: 3,
        minW: 3,
        static: false,
      },
      lg: {
        h: 4,
        i: "clients.review",
        w: 4,
        x: 8,
        y: 11,
        minH: 3,
        minW: 3,
        static: false,
      },
      md: {
        h: 4,
        i: "clients.review",
        w: 4,
        x: 0,
        y: 25,
        minH: 3,
        minW: 3,
        static: false,
      },
      sm: {
        h: 4,
        i: "clients.review",
        w: 1,
        x: 0,
        y: 22,
        minH: 3,
        minW: 1,
        static: false,
      },
      xs: {
        h: 4,
        i: "clients.review",
        w: 1,
        x: 0,
        y: 22,
        minH: 3,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "tickets.status",
    enabled: false,
    mode: "mini",
    layout: {
      "2xl": {
        h: 3,
        i: "tickets.status",
        w: 2,
        x: 8,
        y: 8,
        minH: 2,
        minW: 2,
      },
      xl: {
        h: 3,
        i: "tickets.status",
        w: 2,
        x: 8,
        y: 8,
        minH: 2,
        minW: 2,
      },
      lg: {
        h: 3,
        i: "tickets.status",
        w: 2,
        x: 8,
        y: 8,
        minH: 2,
        minW: 2,
      },
      md: {
        h: 3,
        i: "tickets.status",
        w: 2,
        x: 0,
        y: 41,
        minH: 2,
        minW: 2,
        static: false,
      },
      sm: {
        h: 3,
        i: "tickets.status",
        w: 1,
        x: 0,
        y: 8,
        minH: 2,
        minW: 1,
      },
      xs: {
        h: 3,
        i: "tickets.status",
        w: 1,
        x: 0,
        y: 8,
        minH: 2,
        minW: 1,
      },
    },
    settings: {},
  },
  {
    widgetId: "activity.recent",
    enabled: false,
    mode: "standard",
    layout: {
      "2xl": {
        h: 4,
        i: "activity.recent",
        w: 4,
        x: 0,
        y: 15,
        minH: 3,
        minW: 3,
        static: false,
      },
      xl: {
        h: 4,
        i: "activity.recent",
        w: 4,
        x: 0,
        y: 15,
        minH: 3,
        minW: 3,
        static: false,
      },
      lg: {
        h: 4,
        i: "activity.recent",
        w: 4,
        x: 0,
        y: 15,
        minH: 3,
        minW: 3,
        static: false,
      },
      md: {
        h: 4,
        i: "activity.recent",
        w: 4,
        x: 0,
        y: 17,
        minH: 3,
        minW: 3,
        static: false,
      },
      sm: {
        h: 4,
        i: "activity.recent",
        w: 1,
        x: 0,
        y: 30,
        minH: 3,
        minW: 1,
        static: false,
      },
      xs: {
        h: 4,
        i: "activity.recent",
        w: 1,
        x: 0,
        y: 30,
        minH: 3,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "reports.revenue-snapshot",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 5,
        i: "reports.revenue-snapshot",
        w: 4,
        x: 8,
        y: 5,
        minH: 3,
        minW: 3,
        static: false,
      },
      xl: {
        h: 5,
        i: "reports.revenue-snapshot",
        w: 4,
        x: 8,
        y: 5,
        minH: 3,
        minW: 3,
        static: false,
      },
      lg: {
        h: 5,
        i: "reports.revenue-snapshot",
        w: 4,
        x: 8,
        y: 5,
        minH: 3,
        minW: 3,
        static: false,
      },
      md: {
        i: "reports.revenue-snapshot",
        x: 5,
        y: 7,
        w: 3,
        h: 4,
        minW: 3,
        minH: 3,
        static: false,
      },
      sm: {
        h: 4,
        i: "reports.revenue-snapshot",
        w: 1,
        x: 0,
        y: 16,
        minH: 3,
        minW: 1,
        static: false,
      },
      xs: {
        h: 4,
        i: "reports.revenue-snapshot",
        w: 1,
        x: 0,
        y: 16,
        minH: 3,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "goals.progress",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 2,
        i: "goals.progress",
        w: 12,
        x: 0,
        y: 20,
        minH: 2,
        minW: 2,
        static: false,
      },
      xl: {
        h: 2,
        i: "goals.progress",
        w: 12,
        x: 0,
        y: 20,
        minH: 2,
        minW: 2,
        static: false,
      },
      lg: {
        h: 2,
        i: "goals.progress",
        w: 12,
        x: 0,
        y: 20,
        minH: 2,
        minW: 2,
        static: false,
      },
      md: {
        i: "goals.progress",
        x: 5,
        y: 11,
        w: 3,
        h: 3,
        minW: 2,
        minH: 2,
        static: false,
      },
      sm: {
        h: 3,
        i: "goals.progress",
        w: 1,
        x: 0,
        y: 31,
        minH: 2,
        minW: 1,
        static: false,
      },
      xs: {
        h: 3,
        i: "goals.progress",
        w: 1,
        x: 0,
        y: 31,
        minH: 2,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
  {
    widgetId: "sales.quick-kpis",
    enabled: true,
    mode: "standard",
    layout: {
      "2xl": {
        h: 1,
        i: "sales.quick-kpis",
        w: 12,
        x: 0,
        y: 0,
        minH: 1,
        minW: 6,
        static: false,
      },
      xl: {
        h: 1,
        i: "sales.quick-kpis",
        w: 12,
        x: 0,
        y: 0,
        minH: 1,
        minW: 6,
        static: false,
      },
      lg: {
        h: 1,
        i: "sales.quick-kpis",
        w: 12,
        x: 0,
        y: 0,
        minH: 1,
        minW: 6,
        static: false,
      },
      md: {
        i: "sales.quick-kpis",
        x: 0,
        y: 0,
        w: 8,
        h: 1,
        minW: 6,
        minH: 1,
        static: false,
      },
      sm: {
        h: 1,
        i: "sales.quick-kpis",
        w: 1,
        x: 0,
        y: 0,
        minH: 1,
        minW: 1,
        static: false,
      },
      xs: {
        h: 1,
        i: "sales.quick-kpis",
        w: 1,
        x: 0,
        y: 0,
        minH: 1,
        minW: 1,
        static: false,
      },
    },
    settings: {},
  },
];

const dashboardDefaultPresetById = new Map(
  dashboardDefaultPreset.map((preference) => [preference.widgetId, preference]),
);

const breakpointColumnCounts: Record<DashboardBreakpoint, number> = {
  "2xl": 12,
  xl: 12,
  lg: 12,
  md: 8,
  sm: 1,
  xs: 1,
};

function cloneLayoutForBreakpoint(
  item: DashboardGridLayoutItem,
  breakpoint: DashboardBreakpoint,
): DashboardGridLayoutItem {
  const columnCount = breakpointColumnCounts[breakpoint];
  const minW = Math.min(item.minW || 1, columnCount);
  const w = Math.max(Math.min(item.w, columnCount), minW);
  const maxX = Math.max(columnCount - w, 0);

  return {
    ...item,
    x: Math.min(Math.max(item.x, 0), maxX),
    w,
    minW,
    minH: Math.max(item.minH || 1, 1),
  };
}

function normalizeEquivalentBreakpointLayouts(
  layout: Partial<Record<DashboardBreakpoint, DashboardGridLayoutItem>>,
) {
  const nextLayout = { ...layout };
  const desktopSource = nextLayout.lg || nextLayout.xl || nextLayout["2xl"];
  const mobileSource = nextLayout.sm || nextLayout.xs;

  if (desktopSource) {
    (["2xl", "xl", "lg"] as DashboardBreakpoint[]).forEach((breakpoint) => {
      nextLayout[breakpoint] = cloneLayoutForBreakpoint(desktopSource, breakpoint);
    });
  }

  if (mobileSource) {
    (["sm", "xs"] as DashboardBreakpoint[]).forEach((breakpoint) => {
      nextLayout[breakpoint] = cloneLayoutForBreakpoint(mobileSource, breakpoint);
    });
  }

  return nextLayout;
}

function layoutItemsOverlap(a: DashboardGridLayoutItem, b: DashboardGridLayoutItem) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function layoutItemsOverlapHorizontally(a: DashboardGridLayoutItem, b: DashboardGridLayoutItem) {
  return a.x < b.x + b.w && a.x + a.w > b.x;
}

function repairOverlappingLayouts(preferences: DashboardWidgetPreference[]) {
  const nextPreferences = preferences.map((preference) => ({
    ...preference,
    layout: { ...preference.layout },
  }));

  breakpoints.forEach((breakpoint) => {
    const placedItems: DashboardGridLayoutItem[] = [];
    const enabledPreferences = nextPreferences
      .filter((preference) => preference.enabled && preference.layout[breakpoint])
      .sort((a, b) => {
        const itemA = a.layout[breakpoint];
        const itemB = b.layout[breakpoint];
        if (!itemA || !itemB) return 0;
        return itemA.y - itemB.y || itemA.x - itemB.x;
      });

    enabledPreferences.forEach((preference) => {
      const currentItem = preference.layout[breakpoint];
      if (!currentItem) return;

      let nextItem = cloneLayoutForBreakpoint(currentItem, breakpoint);
      let guard = 0;

      while (placedItems.some((placedItem) => layoutItemsOverlap(nextItem, placedItem))) {
        const blockingItems = placedItems.filter((placedItem) =>
          layoutItemsOverlapHorizontally(nextItem, placedItem),
        );
        const nextY = Math.max(
          nextItem.y + 1,
          ...blockingItems.map((placedItem) => placedItem.y + placedItem.h),
        );

        nextItem = { ...nextItem, y: nextY };
        guard += 1;

        if (guard > placedItems.length + 2) break;
      }

      preference.layout[breakpoint] = nextItem;
      placedItems.push(nextItem);
    });
  });

  return nextPreferences;
}

function compactVerticalLayouts(preferences: DashboardWidgetPreference[]) {
  const nextPreferences = preferences.map((preference) => ({
    ...preference,
    layout: { ...preference.layout },
  }));

  breakpoints.forEach((breakpoint) => {
    const compactedItems: DashboardGridLayoutItem[] = [];
    const enabledPreferences = nextPreferences
      .filter((preference) => preference.enabled && preference.layout[breakpoint])
      .sort((a, b) => {
        const itemA = a.layout[breakpoint];
        const itemB = b.layout[breakpoint];
        if (!itemA || !itemB) return 0;
        return itemA.y - itemB.y || itemA.x - itemB.x;
      });

    enabledPreferences.forEach((preference) => {
      const currentItem = preference.layout[breakpoint];
      if (!currentItem) return;

      let nextItem = currentItem;
      while (nextItem.y > 0) {
        const candidate = { ...nextItem, y: nextItem.y - 1 };
        if (compactedItems.some((placedItem) => layoutItemsOverlap(candidate, placedItem))) break;
        nextItem = candidate;
      }

      preference.layout[breakpoint] = nextItem;
      compactedItems.push(nextItem);
    });
  });

  return nextPreferences;
}

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

  const normalizedPreferences = dashboardWidgetRegistry.map((widget) => {
    const stored = byId.get(widget.id);
    const preset = dashboardDefaultPresetById.get(widget.id);
    const nextMode = (stored?.mode || preset?.mode || widget.defaultMode) as DashboardWidgetMode;
    let nextLayout = {
      ...(preset?.layout || widget.defaultLayout),
      ...(stored?.layout || {}),
    };

    if (widget.id === "sales.quick-kpis") {
      (Object.keys(nextLayout) as DashboardBreakpoint[]).forEach((breakpoint) => {
        const item = nextLayout[breakpoint];
        if (!item) return;

        const minW = Math.max(item.minW || 1, 6);
        nextLayout[breakpoint] = {
          ...item,
          h: 1,
          w: Math.max(item.w, minW),
          minW,
          minH: 1,
          maxH: 1,
          isResizable: false,
        };
      });
    }

    if (widget.id === "calendar.agenda") {
      (Object.keys(nextLayout) as DashboardBreakpoint[]).forEach((breakpoint) => {
        const item = nextLayout[breakpoint];
        if (!item) return;

        const { isResizable: _isResizable, maxW: _maxW, maxH: _maxH, ...restoredItem } = item;

        nextLayout[breakpoint] = {
          ...restoredItem,
          minW: breakpoint === "sm" || breakpoint === "xs" ? 1 : 5,
          minH: 5,
        };
      });
    }

    nextLayout = normalizeEquivalentBreakpointLayouts(nextLayout);

    return {
      widgetId: widget.id,
      enabled: stored?.enabled ?? preset?.enabled ?? false,
      mode: widget.supportedModes.includes(nextMode) ? nextMode : widget.defaultMode,
      layout: nextLayout,
      settings: {
        ...(preset?.settings || {}),
        ...(stored?.settings || {}),
      },
    } satisfies DashboardWidgetPreference;
  });

  return compactVerticalLayouts(repairOverlappingLayouts(normalizedPreferences));
}
