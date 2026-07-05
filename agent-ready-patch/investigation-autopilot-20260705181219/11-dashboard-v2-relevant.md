## 11-dashboard-v2-relevant
```
import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  Flag,
  Goal,
  Instagram,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

import { DashboardCard, DashboardTextButton } from "./dashboard-card";
import { DashboardKpiCard } from "./dashboard-kpi-card";
import { DashboardBuilder } from "@/components/dashboard-builder";
import { AgentCommandWidgetConnected } from "@/components/agent";
import type { DashboardWidgetMode } from "@/components/dashboard-builder";
import { fetchAgentWidgetContract } from "@/lib/agentClient";

type DashboardV2Tone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";

type DashboardV2Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: DashboardV2Tone;
  icon: LucideIcon;
};

type DashboardV2Action = {
  title: string;
  relatedTo: string;
  due: string;
  priority: "Alta" | "Media" | "Normal";
  button: string;
  icon: LucideIcon;
  tone: DashboardV2Tone;
  href?: string;
};

type ScheduleItem = [string, string, string, string];
type PipelineItem = [string, number, string, number, string];
type ClientReviewItem = [string, string, string, string, string];
type CollectionItem = [string, string, string, string];
type ActivityItem = [string, string, string, LucideIcon];
type CommunicationItem = [string, string, string, string, string, string];
type ListWidgetItem = [string, string, string, string, string];
type SnapshotMetricItem = [string, string, string, DashboardV2Tone];
type DocumentStatusItem = [string, number, number, DashboardV2Tone];
type SalesDocumentsOverview = {
  invoices: DocumentStatusItem[];
  estimates: DocumentStatusItem[];
  proposals: DocumentStatusItem[];
  totals: [string, string, DashboardV2Tone][];
};
type WorkCenterItem = [string, string, string, DashboardV2Tone, string];
type WorkCenterData = {
  tasks: WorkCenterItem[];
  projects: WorkCenterItem[];
  tickets: WorkCenterItem[];
  inbox: WorkCenterItem[];
  calendar: WorkCenterItem[];
};
type TodoItem = [string, string, DashboardV2Tone, string];
type TodoWidgetData = {
  pending: TodoItem[];
  completed: TodoItem[];
};

export type DashboardV2Props = {
  kpis?: DashboardV2Kpi[];
  actions?: DashboardV2Action[];
  schedule?: ScheduleItem[];
  collectionRows?: CollectionItem[];
  pipeline?: PipelineItem[];
  clients?: ClientReviewItem[];
  activities?: ActivityItem[];
  communications?: CommunicationItem[];
  leadsAttention?: ListWidgetItem[];
  projectRisks?: ListWidgetItem[];
  invoiceRows?: ListWidgetItem[];
  proposalRows?: ListWidgetItem[];
  reportSnapshot?: SnapshotMetricItem[];
  salesDocumentsOverview?: SalesDocumentsOverview;
  workCenter?: WorkCenterData;
  todoItems?: TodoWidgetData;
  todayLabel?: string;
  collectionPeriodLabel?: string;
  pipelinePeriodLabel?: string;
};

const mockKpis: DashboardV2Kpi[] = [
  {
    label: "Dinero por cobrar",
    value: "$86,450",
    helper: "Requiere tu atención",
    tone: "green" as const,
    icon: DollarSign,
  },
  {
    label: "Oportunidades",
    value: "35",
    helper: "Con avance activo",
    tone: "blue" as const,
    icon: TrendingUp,
  },
  {
    label: "Tareas atrasadas",
    value: "12",
    helper: "Necesitan acción",
    tone: "orange" as const,
    icon: Clock3,
  },
  {
    label: "Propuestas",
    value: "18",
    helper: "Esperando respuesta",
    tone: "purple" as const,
    icon: FileText,
  },
  {
    label: "Mensajes",
    value: "8",
    helper: "Por atender",
    tone: "red" as const,
    icon: MessageCircle,
  },
  {
    label: "Proyectos",
    value: "7",
    helper: "En ejecución",
    tone: "teal" as const,
    icon: Workflow,
  },
];

const mockActions: DashboardV2Action[] = [
  {
    title: "Cobrar factura vencida",
    relatedTo: "Constructora Norte",
    due: "Ayer",
    priority: "Alta",
    button: "Ver factura",
    icon: DollarSign,
    tone: "red",
  },
  {
    title: "Llamar lead pendiente",
    relatedTo: "María F. López",
    due: "Hoy, 10:00 a.m.",
    priority: "Media",
    button: "Abrir lead",
    icon: Phone,
    tone: "blue",
  },
  {
    title: "Responder mensaje",
    relatedTo: "Diego Ramírez",
    due: "Hoy, 11:30 a.m.",
    priority: "Media",
    button: "Responder",
    icon: MessageCircle,
    tone: "green",
  },
  {
    title: "Crear propuesta",
    relatedTo: "Café Buen Día",
    due: "Hoy, 2:00 p.m.",
    priority: "Alta",
    button: "Crear propuesta",
    icon: FileText,
    tone: "purple",
  },
  {
    title: "Revisar proyecto",
    relatedTo: "Vista Azul",
    due: "Mañana, 9:00 a.m.",
    priority: "Alta",
    button: "Ver proyecto",
    icon: AlertTriangle,
    tone: "orange",
  },
];

const mockSchedule: ScheduleItem[] = [
  ["09:00", "Reunión equipo", "Sala de juntas", "blue"],
  ["10:30", "Llamada cliente", "Constructora Norte", "purple"],
  ["12:00", "Seguimiento propuestas", "Revisión y envío", "green"],
  ["02:00", "Presentar propuesta", "Café Buen Día", "orange"],
  ["04:00", "Revisar pendientes", "Cierre de jornada", "blue"],
];

const mockPipeline: PipelineItem[] = [
  ["Leads nuevos", 48, "$96,000", 82, "bg-blue-200"],
  ["Calificados", 32, "$64,000", 58, "bg-blue-300"],
  ["Propuesta", 18, "$45,500", 35, "bg-violet-400"],
  ["Negociación", 9, "$28,700", 20, "bg-orange-300"],
  ["Ganado", 6, "$18,250", 13, "bg-emerald-300"],
];

const mockClients: ClientReviewItem[] = [
  ["CV", "Constructora Valle", "Compra: 15 mar", "Pago pendiente", "red"],
  ["MR", "María Rodríguez", "Sin compra 45 días", "Sin actividad", "orange"],
  ["IC", "Inversiones Cantera", "Compra: 10 abr", "Seguimiento", "orange"],
  ["LD", "Logística del Pacífico", "Compra: 20 feb", "Activo", "green"],
  ["AC", "Alimentos del Centro", "Sin compra 60 días", "En riesgo", "red"],
];

const mockActivities: ActivityItem[] = [
  [
    "Factura FAC-1258 cobrada a Café Buen Día",
    "Hoy, 9:15 a.m. por Ana Torres",
    "$12,450",
    DollarSign,
  ],
  ["Propuesta enviada a Inversiones Cantera", "Hoy, 8:47 a.m. por Ana Torres", "", Send],
  ["Nuevo cliente: Diseño y Muebles S.A.", "Ayer, 4:32 p.m. por Carlos M.", "", Users],
  ["Tarea hecha: llamada con María López", "Ayer, 3:18 p.m. por Ana Torres", "", CheckCircle2],
  ["Mensaje respondido a Diego Ramírez", "Ayer, 2:05 p.m. por Ana Torres", "", MessageCircle],
];

function toneDot(tone: string) {
  if (tone === "red") return "bg-rose-500";
  if (tone === "orange") return "bg-orange-500";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "purple") return "bg-violet-500";
  return "bg-blue-500";
}

function softIcon(tone: string) {
  if (tone === "red") return "border-rose-200 bg-rose-50 text-rose-600";
  if (tone === "orange") return "border-orange-200 bg-orange-50 text-orange-600";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-600";
  if (tone === "purple") return "border-violet-200 bg-violet-50 text-violet-600";
  return "border-blue-200 bg-blue-50 text-blue-600";
}

function priorityClass(priority: string) {
  if (priority === "Alta") return "bg-rose-50 text-rose-600";
  if (priority === "Media") return "bg-orange-50 text-orange-600";
  return "bg-slate-50 text-slate-600";
}

function actionTone(tone: string) {
  if (tone === "red") return "text-rose-600";
  if (tone === "orange") return "text-orange-600";
  if (tone === "green") return "text-emerald-600";
  if (tone === "purple") return "text-violet-600";
  if (tone === "teal") return "text-teal-600";
```
