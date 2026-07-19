import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
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
  Plus,
  Send,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { DashboardCard, DashboardTextButton } from "./dashboard-card";
import { DashboardKpiCard } from "./dashboard-kpi-card";
import { DashboardBuilder } from "@/components/dashboard-builder";
import { AgentCommandWidgetConnected } from "@/components/agent";
import type { DashboardWidgetMode } from "@/components/dashboard-builder";
import { fetchAgentWidgetContract, refreshAgentOperatingContext } from "@/lib/agentClient";
import { DashboardCalendarWidget } from "./dashboard-calendar-widget";
import type { CalendarItem } from "@/lib/crm/calendar-items";

type DashboardV2Tone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";

type DashboardV2Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: DashboardV2Tone;
  icon: LucideIcon;
  progressCurrent?: number;
  progressTotal?: number;
  progressLabel?: string;
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
type WorkCenterItemType = "task" | "project" | "ticket" | "inbox" | "calendar" | "sales";
type WorkCenterItem = {
  id?: string;
  type: WorkCenterItemType;
  title: string;
  subtitle: string;
  badge: string;
  tone: DashboardV2Tone;
  href: string;
  meta?: string;
  dueLabel?: string;
  quickAction?: "complete-task" | "start-task";
};
type WorkCenterData = {
  tasks: WorkCenterItem[];
  projects: WorkCenterItem[];
  tickets: WorkCenterItem[];
  inbox: WorkCenterItem[];
  calendar: WorkCenterItem[];
  sales: WorkCenterItem[];
};
type WorkCenterKey = keyof WorkCenterData;
type TodoItem = {
  id?: string;
  title: string;
  subtitle: string;
  tone: DashboardV2Tone;
  href: string;
  completed?: boolean;
};
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
  calendarItems?: CalendarItem[];
  onCalendarRefresh?: () => void | Promise<void>;
  onTaskComplete?: (taskId: string) => void | Promise<void>;
  onTaskStart?: (taskId: string) => void | Promise<void>;
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
  return "text-blue-600";
}

function communicationIcon(channel: string) {
  const normalized = channel.toLowerCase();

  if (normalized.includes("instagram")) return Instagram;
  if (normalized.includes("email")) return Mail;
  if (normalized.includes("messenger")) return MessageSquare;

  return MessageCircle;
}

const ACTION_VISIBLE_LIMIT = 5;
const SCHEDULE_VISIBLE_LIMIT = 8;
const COLLECTION_VISIBLE_LIMIT = 3;
const PIPELINE_VISIBLE_LIMIT = 4;
const CLIENT_VISIBLE_LIMIT = 4;
const ACTIVITY_VISIBLE_LIMIT = 4;

const mockCommunications: CommunicationItem[] = [
  ["Messenger", "Usuario de Messenger", "Mensaje reciente pendiente.", "2", "blue", "/whatsapp"],
  ["WhatsApp", "Contacto de WhatsApp", "Hola, quiero información.", "1", "green", "/whatsapp"],
  ["Instagram", "Usuario de Instagram", "Mensaje recibido.", "1", "purple", "/whatsapp"],
];

const mockCollectionRows: CollectionItem[] = [
  ["Por cobrar", "$86,450", "60%", "bg-blue-500"],
  ["Vencido", "$24,300", "25%", "bg-rose-500"],
  ["Cobrado", "$112,800", "75%", "bg-emerald-500"],
];

const mockListItems: ListWidgetItem[] = [
  ["Sin datos", "Conecta datos para ver este widget.", "Pendiente", "neutral", "/dashboard"],
];

const mockReportSnapshot: SnapshotMetricItem[] = [
  ["Ingresos cobrados", "$0", "Sin ingresos registrados", "neutral"],
  ["Por cobrar", "$0", "Sin facturas abiertas", "neutral"],
  ["Pipeline", "$0", "Sin oportunidades abiertas", "neutral"],
];

function MiniWidgetCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "blue",
  status,
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: DashboardV2Tone;
  status?: string;
}) {
  return (
    <DashboardCard bodyClassName="p-3">
      <div className="flex h-full min-h-0 items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${softIcon(tone)}`}
        >
          <Icon className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="block truncate text-[10.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">
              {title}
            </span>
            {status ? (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${toneBadgeClass(
                  tone,
                )}`}
              >
                {status}
              </span>
            ) : null}
          </span>
          <strong className="mt-0.5 block truncate text-2xl font-semibold tracking-[-0.045em] text-slate-950">
            {value}
          </strong>
          <small className={`block truncate text-[11px] font-semibold ${actionTone(tone)}`}>
            {helper}
          </small>
        </span>
      </div>
    </DashboardCard>
  );
}

export function DashboardKpiStripWidget({
  kpis,
  mode = "standard",
}: {
  kpis: DashboardV2Kpi[];
  mode?: DashboardWidgetMode;
}) {
  return (
    <section
      className={
        mode === "advanced"
          ? "grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-3"
          : "grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-6"
      }
    >
      {kpis.map((item) => (
        <DashboardKpiCard key={item.label} item={item} />
      ))}
    </section>
  );
}

function DashboardMoreButton({ children, href }: { children: string; href?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (href) {
          window.location.href = href;
        }
      }}
      className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
    >
      {children}⌄
    </button>
  );
}

function toneBadgeClass(tone: string) {
  if (tone === "red") return "bg-rose-50 text-rose-600";
  if (tone === "orange") return "bg-orange-50 text-orange-600";
  if (tone === "green") return "bg-emerald-50 text-emerald-600";
  if (tone === "purple") return "bg-violet-50 text-violet-600";
  if (tone === "teal") return "bg-teal-50 text-teal-600";
  return "bg-blue-50 text-blue-600";
}

function listToneSummary(items: ListWidgetItem[]) {
  const attentionCount = items.filter(([, , , tone]) => tone === "red" || tone === "orange").length;
  const okCount = items.filter(([, , , tone]) => tone === "green").length;

  return {
    attentionCount,
    okCount,
    neutralCount: Math.max(items.length - attentionCount - okCount, 0),
  };
}

function DashboardListWidget({
  title,
  question,
  emptyLabel,
  href,
  icon: Icon,
  items,
  mode = "standard",
  tone = "blue",
}: {
  title: string;
  question: string;
  emptyLabel: string;
  href: string;
  icon: LucideIcon;
  items: ListWidgetItem[];
  mode?: DashboardWidgetMode;
  tone?: DashboardV2Tone;
}) {
  const summary = listToneSummary(items);

  if (mode === "mini") {
    const hasAttention = summary.attentionCount > 0;

    return (
      <MiniWidgetCard
        title={title}
        value={String(items.length)}
        helper={hasAttention ? `${summary.attentionCount} requieren acción` : emptyLabel}
        icon={Icon}
        tone={hasAttention ? "orange" : tone}
        status={hasAttention ? "Atención" : "OK"}
      />
    );
  }

  const visibleLimit = mode === "advanced" ? 8 : 5;

  return (
    <DashboardCard
      title={title}
      action={<DashboardTextButton href={href}>Abrir lista →</DashboardTextButton>}
      bodyClassName="h-full p-3"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="min-w-0">
            <strong className="block truncate text-[12px] font-semibold text-slate-900">
              {question}
            </strong>
            <small className="block truncate text-[10.5px] font-medium text-slate-500">
              {summary.attentionCount
                ? `${summary.attentionCount} necesitan seguimiento ahora`
                : emptyLabel}
            </small>
          </span>
          <span className="grid grid-cols-3 gap-1 text-center">
            <span className="rounded-md bg-rose-50 px-2 py-1">
              <strong className="block text-[12px] leading-none text-rose-600">
                {summary.attentionCount}
              </strong>
              <small className="text-[9px] font-semibold text-rose-500">alerta</small>
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-1">
              <strong className="block text-[12px] leading-none text-blue-600">
                {summary.neutralCount}
              </strong>
              <small className="text-[9px] font-semibold text-blue-500">abierto</small>
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-1">
              <strong className="block text-[12px] leading-none text-emerald-600">
                {summary.okCount}
              </strong>
              <small className="text-[9px] font-semibold text-emerald-500">ok</small>
            </span>
          </span>
        </div>

        <div className="min-h-0 space-y-1.5 overflow-hidden">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
              <span className="text-[12px] font-semibold text-slate-500">{emptyLabel}</span>
            </div>
          ) : (
            items.slice(0, visibleLimit).map(([primary, secondary, badge, itemTone, itemHref]) => (
              <button
                key={`${title}-${primary}-${secondary}`}
                type="button"
                onClick={() => {
                  window.location.href = itemHref || href;
                }}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-slate-200 hover:bg-white"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <i className={`h-2 w-2 shrink-0 rounded-full ${toneDot(itemTone)}`} />
                  <span className="min-w-0">
                    <strong className="block truncate text-[11.7px] font-semibold text-slate-900">
                      {primary}
                    </strong>
                    <small className="block truncate text-[10.5px] font-medium text-slate-500">
                      {secondary}
                    </small>
                  </span>
                </span>
                <span
                  className={`max-w-[96px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneBadgeClass(
                    itemTone,
                  )}`}
                >
                  {badge}
                </span>
              </button>
            ))
          )}
        </div>

        {items.length > visibleLimit ? (
          <DashboardMoreButton
            href={href}
          >{`Ver ${items.length - visibleLimit} más`}</DashboardMoreButton>
        ) : null}
      </div>
    </DashboardCard>
  );
}

function actionListItems(
  actions: DashboardV2Action[],
  href: string,
  fallbackTone: DashboardV2Tone,
) {
  return actions
    .filter((action) => action.href === href)
    .map(
      (action) =>
        [
          action.title,
          action.relatedTo || action.due,
          action.priority,
          action.tone || fallbackTone,
          href,
        ] as ListWidgetItem,
    );
}

function DashboardReportSnapshotWidget({
  metrics,
  pipeline,
  collectionRows,
  invoiceRows,
  proposalRows,
  mode = "standard",
}: {
  metrics: SnapshotMetricItem[];
  pipeline: PipelineItem[];
  collectionRows: CollectionItem[];
  invoiceRows: ListWidgetItem[];
  proposalRows: ListWidgetItem[];
  mode?: DashboardWidgetMode;
}) {
  const primary = metrics[0];
  const [activeSlide, setActiveSlide] = useState(0);

  if (mode === "mini") {
    return (
      <MiniWidgetCard
        title="Revenue"
        value={primary?.[1] || "$0"}
        helper={primary?.[2] || "Sin datos"}
        icon={BarChart3}
        tone={primary?.[3] || "blue"}
        status="Finanzas"
      />
    );
  }

  const collectedMetric = metrics.find(([label]) => label.toLowerCase().includes("cobrado"));
  const receivableMetric = metrics.find(([label]) => label.toLowerCase().includes("cobrar"));
  const pipelineMetric = metrics.find(([label]) => label.toLowerCase().includes("pipeline"));
  const proposalMetric = metrics.find(([label]) => label.toLowerCase().includes("propuesta"));
  const overdueInvoicesCount = invoiceRows.filter(([, , badge]) =>
    badge.toLowerCase().includes("venc"),
  ).length;
  const proposalsNeedingAttention = proposalRows.filter(
    ([, , , tone]) => tone !== "neutral",
  ).length;
  const proposalChartData = [
    { name: "Necesitan seguimiento", value: proposalsNeedingAttention || 0, color: "#7c3aed" },
    {
      name: "Sin urgencia inmediata",
      value: Math.max(proposalRows.length - proposalsNeedingAttention, 0),
      color: "#e2e8f0",
    },
  ].filter((item) => item.value > 0);
  const priorityRows = [...invoiceRows, ...proposalRows]
    .filter(([, , , tone]) => tone === "red" || tone === "orange" || tone === "purple")
    .slice(0, 5);
  const slides = [
    {
      key: "collections",
      label: "Cobros",
      title: "Cobros y cuentas",
      value: receivableMetric?.[1] || "$0",
      helper: `${overdueInvoicesCount} vencidas · ${collectedMetric?.[1] || "$0"} cobrado`,
      description: "Estado de facturas: cobrado, vencido y por cobrar.",
      href: "/invoices",
    },
    {
      key: "pipeline",
      label: "Pipeline",
      title: "Pipeline abierto",
      value: pipelineMetric?.[2] || pipelineMetric?.[1] || "$0",
      helper: pipelineMetric?.[1] ? `${pipelineMetric[1]} abiertas` : "Oportunidades abiertas",
      description: "Valor y cantidad por etapa comercial.",
      href: "/pipeline",
    },
    {
      key: "proposals",
      label: "Propuestas",
      title: "Propuestas pendientes",
      value: proposalMetric?.[1] || String(proposalRows.length),
      helper: proposalMetric?.[2] || "Pendientes",
      description: "Seguimiento comercial antes de que pierdan impulso.",
      href: "/proposals",
    },
    {
      key: "priorities",
      label: "Prioridad",
      title: "Prioridades financieras",
      value: String(priorityRows.length),
      helper: "Facturas y propuestas para revisar primero",
      description: "Lo más urgente para proteger cobros y cierres.",
      href: "/reports",
    },
  ];
  const slide = slides[activeSlide] || slides[0];

  const renderSlideContent = () => {
    if (slide.key === "collections") {
      return collectionRows.length ? (
        <div className="space-y-3">
          <FinancialInsight
            label="Balance"
            value="Dinero cobrado, vencido y pendiente en una sola lectura."
          />
          <div className="space-y-2.5">
            {collectionRows.slice(0, 3).map(([label, value, percent, tone]) => (
              <FinancialMetricRow
                key={label}
                label={label}
                value={value}
                percent={percent}
                tone={tone as DashboardV2Tone}
              />
            ))}
          </div>
        </div>
      ) : (
        <FinancialEmptyChart />
      );
    }

    if (slide.key === "pipeline") {
      return pipeline.length ? (
        <div className="space-y-3">
          <FinancialInsight
            label="Distribución"
            value="Valor abierto organizado por etapa comercial."
          />
          <div className="space-y-2.5">
            {pipeline.slice(0, 5).map(([label, count, value, percent, tone]) => (
              <FinancialMetricRow
                key={label}
                label={label}
                value={value}
                percent={`${percent}%`}
                detail={`${count} oportunidades`}
                tone={tone as DashboardV2Tone}
              />
            ))}
          </div>
        </div>
      ) : (
        <FinancialEmptyChart />
      );
    }

    if (slide.key === "proposals") {
      return proposalChartData.length ? (
        <div className="grid h-full min-h-[160px] grid-cols-[116px_minmax(0,1fr)] items-center gap-4">
          <div className="h-[132px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proposalChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={34}
                  outerRadius={54}
                  paddingAngle={4}
                >
                  {proposalChartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="min-w-0 space-y-3">
            <FinancialInsight
              label="Seguimiento"
              value="Propuestas activas separadas por nivel de atención."
            />
            <div className="space-y-2">
              {proposalChartData.map((item) => (
                <div key={item.name} className="flex min-w-0 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-slate-600">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <strong className="shrink-0 text-[12px] font-medium text-slate-900">
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <FinancialEmptyChart />
      );
    }

    return (
      <div className="h-full min-h-0 overflow-y-auto pr-1">
        <FinancialInsight label="En foco" value="Facturas y propuestas que requieren atención." />
        {priorityRows.length ? (
          <div className="mt-2 divide-y divide-slate-100">
            {priorityRows.map(([title, subtitle, badge, tone, href]) => (
              <button
                key={`${title}-${subtitle}`}
                type="button"
                onClick={() => {
                  window.location.href = href;
                }}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 text-left hover:bg-slate-50/70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-normal text-slate-900">
                    {title}
                  </span>
                  <span className="block truncate text-[10.5px] font-normal text-slate-500">
                    {subtitle}
                  </span>
                </span>
                <span
                  className={`max-w-[90px] truncate text-[10.5px] font-medium ${actionTone(tone as DashboardV2Tone)}`}
                >
                  {badge}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <FinancialEmptyChart />
        )}
      </div>
    );
  };

  return (
    <DashboardCard
      title="Panel financiero"
      action={<DashboardTextButton href="/reports">Ver reportes →</DashboardTextButton>}
      bodyClassName="h-full p-0"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] px-4 pb-3 pt-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-500">{slide.title}</div>
          <div className="mt-0.5 truncate text-[24px] font-semibold tracking-normal text-slate-950">
            {slide.value}
          </div>
          <div className="mt-0.5 truncate text-[12px] font-normal text-slate-500">
            {slide.helper}
          </div>
          <div className="mt-1 line-clamp-2 text-[11.5px] font-normal leading-4 text-slate-400">
            {slide.description}
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-4 overflow-x-auto border-b border-slate-100">
          {slides.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveSlide(index)}
              className={`flex h-8 shrink-0 items-center border-b-2 text-[12px] font-medium ${
                activeSlide === index
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto py-3">{renderSlideContent()}</div>

        <div className="grid gap-2 border-t border-slate-100 pt-2 text-[11px] sm:grid-cols-3">
          <FinancialSignal label="Cobrado" value={collectedMetric?.[1] || "$0"} />
          <FinancialSignal label="Por cobrar" value={receivableMetric?.[1] || "$0"} />
          <FinancialSignal
            label="Propuestas"
            value={proposalMetric?.[1] || String(proposalRows.length)}
          />
        </div>
      </div>
    </DashboardCard>
  );
}

function FinancialInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-[11.5px] font-normal leading-4 text-slate-500">
      <span className="font-medium text-slate-700">{label}:</span> {value}
    </div>
  );
}

function FinancialMetricRow({
  label,
  value,
  percent,
  detail,
  tone,
}: {
  label: string;
  value: string;
  percent: string;
  detail?: string;
  tone: DashboardV2Tone;
}) {
  const normalizedPercent = Math.max(
    6,
    Math.min(100, Number(percent.replace(/[^0-9.]/g, "")) || 0),
  );

  return (
    <div className="min-w-0">
      <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] font-normal text-slate-700">{label}</span>
        <strong className="shrink-0 text-[12px] font-medium text-slate-950">{value}</strong>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <span
            className={`block h-full rounded-full ${progressColor(tone)}`}
            style={{ width: `${normalizedPercent}%` }}
          />
        </span>
        <span className="w-10 shrink-0 text-right text-[10.5px] font-normal text-slate-400">
          {percent}
        </span>
      </div>
      {detail ? (
        <div className="mt-1 truncate text-[10.5px] font-normal text-slate-400">{detail}</div>
      ) : null}
    </div>
  );
}

function FinancialSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block truncate font-normal text-slate-400">{label}</span>
      <strong className="block truncate text-[12px] font-medium text-slate-800">{value}</strong>
    </div>
  );
}

function FinancialEmptyChart() {
  return (
    <div className="grid h-full min-h-[120px] place-items-center text-center text-[12px] font-normal text-slate-500">
      No hay datos suficientes.
    </div>
  );
}

function progressColor(tone: DashboardV2Tone) {
  if (tone === "red") return "bg-rose-500";
  if (tone === "orange") return "bg-orange-500";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "purple") return "bg-violet-500";
  if (tone === "teal") return "bg-teal-500";
  return "bg-blue-500";
}

function DashboardDocumentColumn({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: LucideIcon;
  rows: DocumentStatusItem[];
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
        <strong className="truncate text-[13px] font-semibold text-slate-900">{title}</strong>
      </div>
      <div className="space-y-2">
        {rows.map(([label, count, percent, tone]) => (
          <div key={`${title}-${label}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[11.5px]">
              <span className={`truncate font-semibold ${actionTone(tone)}`}>
                {count} {label}
              </span>
              <span className="shrink-0 font-medium text-slate-400">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${progressColor(tone)}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSalesDocumentsOverviewWidget({
  overview,
  mode = "standard",
}: {
  overview: SalesDocumentsOverview;
  mode?: DashboardWidgetMode;
}) {
  const openInvoices =
    overview.invoices.find(([label]) => label.toLowerCase().includes("unpaid"))?.[1] || 0;
  const totalDocuments = [
    ...overview.invoices,
    ...overview.estimates,
    ...overview.proposals,
  ].reduce((sum, [, count]) => sum + count, 0);

  if (mode === "mini") {
    return (
      <MiniWidgetCard
        title="Documentos"
        value={String(totalDocuments)}
        helper={overview.totals[0]?.[1] ? `${overview.totals[0][1]} outstanding` : "Sin documentos"}
        icon={FileText}
        tone={openInvoices ? "orange" : "blue"}
        status="Ventas"
      />
    );
  }

  return (
    <DashboardCard
      title="Sales documents overview"
      action={<DashboardTextButton href="/invoices">Ver documentos →</DashboardTextButton>}
      bodyClassName="h-full p-4"
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
        <div className="grid min-h-0 gap-5 overflow-hidden md:grid-cols-3">
          <DashboardDocumentColumn
            title="Invoice overview"
            icon={FileText}
            rows={overview.invoices}
          />
          <DashboardDocumentColumn
            title="Estimate overview"
            icon={FileText}
            rows={overview.estimates}
          />
          <DashboardDocumentColumn
            title="Proposal overview"
            icon={FileText}
            rows={overview.proposals}
          />
        </div>

        <div className="grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
          {overview.totals.map(([label, value, tone]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                window.location.href = "/invoices";
              }}
              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className={`block truncate text-[11px] font-semibold ${actionTone(tone)}`}>
                {label}
              </span>
              <strong className="mt-1 block truncate text-[13px] font-semibold text-slate-800">
                {value}
              </strong>
            </button>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

function DashboardWorkCenterWidget({
  workCenter,
  mode = "standard",
  onTaskComplete,
  onTaskStart,
}: {
  workCenter: WorkCenterData;
  mode?: DashboardWidgetMode;
  onTaskComplete?: (taskId: string) => void | Promise<void>;
  onTaskStart?: (taskId: string) => void | Promise<void>;
}) {
  const workTabs = [
    ["tasks", "Tareas", CheckCircle2, "/tasks"],
    ["projects", "Proyectos", Workflow, "/projects"],
    ["tickets", "Tickets", LifeBuoy, "/tickets"],
    ["inbox", "Inbox", MessageCircle, "/whatsapp"],
    ["calendar", "Agenda", Clock3, "/calendar"],
    ["sales", "Ventas", DollarSign, "/invoices"],
  ] as const;
  const tabs = [["overview", "Resumen", BarChart3, "/dashboard"], ...workTabs] as const;
  const [activeTab, setActiveTab] = useState<WorkCenterKey | "overview">("overview");
  const [workingItemId, setWorkingItemId] = useState<string | null>(null);
  const active = tabs.find(([key]) => key === activeTab) || tabs[0];
  const activeItems = active[0] === "overview" ? [] : workCenter[active[0]];
  const totalItems = workTabs.reduce((sum, [key]) => sum + workCenter[key].length, 0);
  const attentionCount = workTabs.reduce(
    (sum, [key]) =>
      sum + workCenter[key].filter((item) => item.tone === "red" || item.tone === "orange").length,
    0,
  );
  const priorityItems = workTabs
    .flatMap(([key]) => workCenter[key].map((item) => ({ ...item, group: key })))
    .sort((a, b) => {
      const rank = { red: 0, orange: 1, purple: 2, blue: 3, teal: 4, green: 5, neutral: 6 };
      return rank[a.tone] - rank[b.tone];
    })
    .slice(0, 5);

  const handleQuickAction = async (
    item: WorkCenterItem,
    action: "complete-task" | "start-task",
  ) => {
    if (!item.id || workingItemId) return;
    const handler = action === "complete-task" ? onTaskComplete : onTaskStart;
    if (!handler) return;

    setWorkingItemId(item.id);
    try {
      await handler(item.id);
    } finally {
      setWorkingItemId(null);
    }
  };

  if (mode === "mini") {
    return (
      <MiniWidgetCard
        title="Trabajo"
        value={String(totalItems)}
        helper={attentionCount ? `${attentionCount} requieren atención` : "Sin urgencias"}
        icon={CheckCircle2}
        tone={attentionCount ? "orange" : "green"}
        status="Hoy"
      />
    );
  }

  const renderWorkItem = (item: WorkCenterItem) => (
    <div
      key={`${item.type}-${item.id || item.title}-${item.subtitle}`}
      className="group grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-1 py-2.5 last:border-b-0 hover:bg-slate-50/70"
    >
      <button
        type="button"
        onClick={() => {
          window.location.href = item.href;
        }}
        className="min-w-0 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${toneDot(item.tone)}`} />
          <span className="truncate text-[12.5px] font-medium text-slate-900">{item.title}</span>
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-normal text-slate-500">
          <span className="truncate">{item.subtitle}</span>
          {item.meta ? <span className="truncate text-slate-400">{item.meta}</span> : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`max-w-[92px] truncate rounded-md bg-transparent px-1.5 py-0.5 text-[10.5px] font-medium ${actionTone(
            item.tone,
          )}`}
        >
          {item.badge}
        </span>
        {item.type === "task" && item.id ? (
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => void handleQuickAction(item, "start-task")}
              disabled={!onTaskStart || Boolean(workingItemId)}
              className="rounded-md px-2 py-1 text-[10.5px] font-medium text-slate-500 opacity-80 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            >
              Iniciar
            </button>
            <button
              type="button"
              onClick={() => void handleQuickAction(item, "complete-task")}
              disabled={!onTaskComplete || Boolean(workingItemId)}
              className="rounded-md px-2 py-1 text-[10.5px] font-medium text-emerald-700 opacity-90 hover:bg-emerald-50 disabled:opacity-40"
            >
              Listo
            </button>
          </div>
        ) : (
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        )}
      </div>
    </div>
  );

  return (
    <DashboardCard bodyClassName="h-full p-0">
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)]">
        <header className="px-4 pb-2 pt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-slate-950">
                Centro de trabajo
              </h3>
              <p className="mt-0.5 truncate text-[12px] font-normal text-slate-500">
                {totalItems} activos · {attentionCount} requieren atención
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("corevix:open-task-create"));
              }}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-[12px] font-medium text-white hover:bg-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva tarea
            </button>
          </div>
        </header>

        <div className="flex min-w-0 items-center gap-4 overflow-x-auto border-b border-slate-100 px-4">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex h-9 shrink-0 items-center gap-1.5 border-b-2 text-[12px] font-medium ${
                activeTab === key
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-hidden bg-white px-4 py-3">
          {active[0] === "overview" ? (
            <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                {workTabs.slice(0, 6).map(([key, label, Icon]) => {
                  const count = workCenter[key].length;
                  const urgent = workCenter[key].filter(
                    (item) => item.tone === "red" || item.tone === "orange",
                  ).length;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className="inline-flex min-w-0 items-center gap-1.5 text-left font-normal text-slate-500 hover:text-slate-900"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {count} {label.toLowerCase()}
                      </span>
                      {urgent ? <span className="text-orange-600">· {urgent}</span> : null}
                    </button>
                  );
                })}
              </div>

              <div className="text-[12px] font-medium text-slate-700">Lo más importante ahora</div>

              <div className="min-h-0 overflow-y-auto pr-1">
                <div className="border-t border-slate-100">
                  {priorityItems.length ? (
                    priorityItems.map(renderWorkItem)
                  ) : (
                    <div className="grid h-24 place-items-center text-center text-[12px] font-normal text-slate-500">
                      No hay prioridades pendientes.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <span className="text-[12px] font-normal text-slate-500">
                No hay elementos en {active[1]}.
              </span>
            </div>
          ) : (
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
              <div className="flex items-center justify-between gap-3">
                <DashboardTextButton href={active[3]}>Ver panel completo</DashboardTextButton>
                <span className="text-[11px] font-normal text-slate-400">
                  {activeItems.length} items
                </span>
              </div>
              <div className="min-h-0 overflow-y-auto border-t border-slate-100 pr-1">
                {activeItems.slice(0, 8).map(renderWorkItem)}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

function DashboardTodoItemsWidget({
  todos,
  mode = "standard",
  onTaskComplete,
}: {
  todos: TodoWidgetData;
  mode?: DashboardWidgetMode;
  onTaskComplete?: (taskId: string) => void | Promise<void>;
}) {
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const handleComplete = async (task: TodoItem) => {
    if (!task.id || task.completed || completingTaskId || !onTaskComplete) return;
    setCompletingTaskId(task.id);
    try {
      await onTaskComplete?.(task.id);
    } finally {
      setCompletingTaskId(null);
    }
  };

  if (mode === "mini") {
    return (
      <MiniWidgetCard
        title="To Do"
        value={String(todos.pending.length)}
        helper={todos.pending[0]?.title || `${todos.completed.length} completadas`}
        icon={CheckCircle2}
        tone={todos.pending.length ? "orange" : "green"}
        status={todos.pending.length ? "Pendiente" : "Listo"}
      />
    );
  }

  const checklistItems = [...todos.pending.slice(0, 8), ...todos.completed.slice(0, 4)];

  return (
    <DashboardCard
      title="To Do"
      action={<DashboardTextButton href="/tasks">Ver todas</DashboardTextButton>}
      bodyClassName="h-full p-4"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[12px] font-semibold text-slate-700">
            {todos.pending.length} pendientes
          </span>
          <span className="text-[12px] font-semibold text-emerald-600">
            {todos.completed.length} completadas
          </span>
        </div>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden">
          <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Checklist
          </h4>
          <div className="min-h-0 space-y-1.5 overflow-y-auto pb-2 pr-1">
            {checklistItems.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-[12px] font-medium text-slate-400">
                No hay tareas pendientes
              </p>
            ) : (
              checklistItems.map((task) => (
                <div
                  key={`${task.completed ? "done" : "pending"}-${task.id || task.title}-${task.subtitle}`}
                  className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleComplete(task)}
                      disabled={!task.id || !onTaskComplete || Boolean(completingTaskId)}
                      className="grid h-5 w-5 place-items-center rounded border border-slate-300 bg-white text-slate-300 transition hover:border-emerald-400 hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Completar ${task.title}`}
                    >
                      {completingTaskId === task.id ? (
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      ) : null}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = task.href;
                    }}
                    className="min-w-0 text-left"
                  >
                    <strong
                      className={`block truncate text-[11.8px] font-semibold ${
                        task.completed
                          ? "text-slate-500 line-through decoration-slate-300"
                          : "text-slate-800"
                      }`}
                    >
                      {task.title}
                    </strong>
                    <small className="block truncate text-[10.5px] text-slate-500">
                      {task.subtitle}
                    </small>
                  </button>
                  <span className={`h-2 w-2 rounded-full ${toneDot(task.tone)}`} />
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardCard>
  );
}

function DashboardPlaceholderWidget({
  title,
  helper,
  icon: Icon,
  mode = "standard",
}: {
  title: string;
  helper: string;
  icon: LucideIcon;
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    return <MiniWidgetCard title={title} value="Soon" helper={helper} icon={Icon} tone="neutral" />;
  }

  return (
    <DashboardCard title={title} bodyClassName="h-full p-4">
      <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
        <div>
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
            <Icon className="h-4 w-4" />
          </span>
          <strong className="mt-3 block text-sm font-semibold text-slate-900">{title}</strong>
          <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
        </div>
      </div>
    </DashboardCard>
  );
}

export function DashboardActionPrioritiesWidget({
  actions,
  mode = "standard",
}: {
  actions: DashboardV2Action[];
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    const urgentCount = actions.filter((action) => action.priority === "Alta").length;
    return (
      <MiniWidgetCard
        title="Prioridades"
        value={String(actions.length)}
        helper={urgentCount ? `${urgentCount} alta prioridad` : "Sin urgencias altas"}
        icon={AlertTriangle}
        tone={urgentCount ? "red" : "green"}
        status={urgentCount ? "Urgente" : "OK"}
      />
    );
  }

  const visibleLimit = mode === "advanced" ? 8 : ACTION_VISIBLE_LIMIT;

  return (
    <DashboardCard
      title="Qué hacer ahora"
      action={<DashboardTextButton href="/tasks">Ver prioridades →</DashboardTextButton>}
      className="xl:min-h-0"
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
        <div className="border-b border-slate-200 px-4 py-2 text-[11.5px] font-medium text-slate-500">
          Acciones urgentes que pueden afectar ventas, cobros o clientes.
        </div>
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
            <span>Pendiente</span>
            <span>Cliente</span>
            <span>Motivo</span>
            <span>Prioridad</span>
            <span>Acción</span>
          </div>

          {actions.slice(0, visibleLimit).map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={`${index}-${item.title}-${item.relatedTo}`}
                className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] items-center gap-2 border-b border-slate-200 px-4 py-1.5 text-[11.5px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded border border-slate-300" />
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${softIcon(item.tone)}`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="truncate font-medium text-slate-900">{item.title}</span>
                </div>

                <span className="truncate text-slate-700">{item.relatedTo}</span>

                <span
                  className={
                    item.due === "Ayer"
                      ? "truncate font-medium text-rose-600"
                      : "truncate text-slate-700"
                  }
                >
                  {item.due}
                </span>

                <span
                  className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-medium ${priorityClass(
                    item.priority,
                  )}`}
                >
                  {item.priority}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (item.href) window.location.href = item.href;
                  }}
                  className="h-7 rounded-lg border border-blue-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50"
                >
                  {item.button}
                </button>
              </div>
            );
          })}
        </div>

        {actions.length > visibleLimit ? (
          <DashboardMoreButton href="/tasks">{`Ver ${actions.length - visibleLimit} más`}</DashboardMoreButton>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export function DashboardScheduleWidget({
  schedule,
  todayLabel,
  mode = "standard",
}: {
  schedule: ScheduleItem[];
  todayLabel: string;
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    const next = schedule[0];
    return (
      <MiniWidgetCard
        title="Agenda"
        value={String(schedule.length)}
        helper={next ? `${next[0]} · ${next[1]}` : "Sin pendientes"}
        icon={Clock3}
        tone={schedule.length ? "blue" : "green"}
        status="Hoy"
      />
    );
  }

  const visibleLimit = mode === "advanced" ? 12 : SCHEDULE_VISIBLE_LIMIT;

  return (
    <DashboardCard
      title="Agenda de hoy"
      action={<span className="text-slate-400">‹ ›</span>}
      className="h-full"
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
        <div className="min-h-0 overflow-hidden">
          <p className="-mt-0.5 mb-1.5 text-[11px] text-slate-500">
            {todayLabel} · Vencimientos y tareas programadas
          </p>

          {schedule.slice(0, visibleLimit).map(([time, title, subtitle, tone]) => (
            <div
              key={`${time}-${title}`}
              className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 border-t border-slate-200 py-1.5"
            >
              <span
                className={`w-fit rounded-lg px-2 py-0.5 text-[10.5px] font-semibold ${
                  tone === "red"
                    ? "bg-rose-50 text-rose-600"
                    : tone === "orange"
                      ? "bg-orange-50 text-orange-600"
                      : tone === "purple"
                        ? "bg-violet-50 text-violet-600"
                        : tone === "teal"
                          ? "bg-teal-50 text-teal-600"
                          : "bg-blue-50 text-blue-600"
                }`}
              >
                {time}
              </span>

              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(String(tone))}`} />
                  <strong className="block truncate text-[12px] font-semibold text-slate-900">
                    {title}
                  </strong>
                </span>
                <small className="block truncate pl-3 text-[10.8px] font-medium text-slate-500">
                  {subtitle}
                </small>
              </span>
            </div>
          ))}
        </div>

        {schedule.length > visibleLimit ? (
          <DashboardMoreButton href="/calendar">{`Ver ${schedule.length - visibleLimit} más`}</DashboardMoreButton>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export function DashboardSalesCollectionsWidget({
  pipeline,
  collectionRows,
  collectionPeriodLabel,
  pipelinePeriodLabel,
  mode = "standard",
}: {
  pipeline: PipelineItem[];
  collectionRows: CollectionItem[];
  collectionPeriodLabel: string;
  pipelinePeriodLabel: string;
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    const pipelineTotal = pipeline.reduce((sum, [, count]) => sum + count, 0);
    return (
      <MiniWidgetCard
        title="Pipeline"
        value={String(pipelineTotal)}
        helper={collectionRows[0] ? `${collectionRows[0][1]} por cobrar` : "Sin cobros"}
        icon={TrendingUp}
        tone="blue"
        status="Ventas"
      />
    );
  }

  const pipelineLimit = mode === "advanced" ? pipeline.length : PIPELINE_VISIBLE_LIMIT;

  return (
    <DashboardCard
      title="Ventas y cobros"
      action={<span className="text-xs font-medium text-slate-500">{pipelinePeriodLabel}</span>}
      bodyClassName="h-full p-3"
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
        <div className="grid min-h-0 gap-3 overflow-hidden md:grid-cols-[1.15fr_.85fr]">
          <div className="min-h-0 overflow-hidden">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                Ventas
              </span>
              <span className="text-[10.5px] font-medium text-slate-400">Etapas</span>
            </div>

            <div className="space-y-1.5">
              {pipeline.slice(0, pipelineLimit).map(([label, count, value, percent, color]) => (
                <div
                  key={String(label)}
                  className="grid grid-cols-[72px_1fr_20px_52px] items-center gap-2 text-[10.8px]"
                >
                  <span className="truncate font-medium text-blue-600">{label}</span>
                  <span className="h-4 overflow-hidden rounded bg-slate-100">
                    <i className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
                  </span>
                  <span>{count}</span>
                  <strong className="text-right font-semibold">{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 overflow-hidden border-t border-slate-200 pt-2 md:border-l md:border-t-0 md:pl-3 md:pt-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                Cobros
              </span>
              <span className="text-[10.5px] font-medium text-slate-400">
                {collectionPeriodLabel}
              </span>
            </div>

            <div className="space-y-1.5">
              {collectionRows
                .slice(0, COLLECTION_VISIBLE_LIMIT)
                .map(([label, value, percent, color]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[62px_60px_1fr_28px] items-center gap-2 text-[10.5px]"
                  >
                    <span className="truncate text-slate-600">{label}</span>
                    <strong className="font-semibold text-slate-800">{value}</strong>
                    <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <i className={`block h-full ${color}`} style={{ width: percent }} />
                    </span>
                    <span className="text-slate-600">{percent}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {pipeline.length > pipelineLimit ? (
          <DashboardMoreButton href="/pipeline">{`Ver ${
            pipeline.length - pipelineLimit
          } más`}</DashboardMoreButton>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export function DashboardClientsReviewWidget({
  clients,
  mode = "standard",
}: {
  clients: ClientReviewItem[];
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    const riskyCount = clients.filter(
      ([, , , , tone]) => tone === "red" || tone === "orange",
    ).length;
    return (
      <MiniWidgetCard
        title="Clientes"
        value={String(clients.length)}
        helper={riskyCount ? `${riskyCount} requieren revisión` : "Sin alertas"}
        icon={Users}
        tone={riskyCount ? "orange" : "green"}
        status={riskyCount ? "Riesgo" : "OK"}
      />
    );
  }

  const visibleLimit = mode === "advanced" ? 8 : CLIENT_VISIBLE_LIMIT;

  return (
    <DashboardCard
      title="Clientes a revisar"
      action={<DashboardTextButton href="/clients">Ver todos</DashboardTextButton>}
      bodyClassName="h-full p-3"
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
        <div className="min-h-0 space-y-1.5 overflow-hidden">
          {clients.slice(0, visibleLimit).map(([initials, name, note, status, tone], index) => (
            <div
              key={`${index}-${String(name)}-${String(note)}-${String(status)}`}
              className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1 last:border-0"
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-lg text-[9.5px] font-semibold text-white ${
                  tone === "red"
                    ? "bg-rose-500"
                    : tone === "orange"
                      ? "bg-orange-500"
                      : "bg-blue-500"
                }`}
              >
                {initials}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[10.8px] font-semibold text-slate-900">
                  {name}
                </strong>
                <small className="block truncate text-[10px] text-slate-500">{note}</small>
              </span>
              <span
                className={`rounded-lg px-1.5 py-0.5 text-[9.8px] font-medium ${priorityClass(
                  tone === "red" ? "Alta" : tone === "orange" ? "Media" : "Normal",
                )}`}
              >
                {status}
              </span>
            </div>
          ))}
        </div>

        {clients.length > visibleLimit ? (
          <DashboardMoreButton href="/clients">{`Ver ${clients.length - visibleLimit} más`}</DashboardMoreButton>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export function DashboardCommunicationsWidget({
  communications,
  mode = "standard",
}: {
  communications: CommunicationItem[];
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    const unreadCount = communications.reduce((sum, [, , , count]) => sum + Number(count || 0), 0);
    return (
      <MiniWidgetCard
        title="Inbox"
        value={String(unreadCount)}
        helper={communications[0] ? `${communications[0][0]} más reciente` : "Sin mensajes"}
        icon={MessageCircle}
        tone={unreadCount ? "red" : "green"}
        status={unreadCount ? "Pendiente" : "OK"}
      />
    );
  }

  const visibleLimit = mode === "advanced" ? 8 : 5;

  return (
    <DashboardCard
      title="Comunicaciones"
      action={<DashboardTextButton href="/whatsapp">Ver bandeja</DashboardTextButton>}
      bodyClassName="h-full p-3"
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
        <div className="min-h-0 space-y-1 overflow-hidden">
          {communications.length === 0 ? (
            <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
              <div>
                <strong className="block text-[12px] font-semibold text-slate-900">
                  No hay chats pendientes
                </strong>
                <small className="mt-1 block text-[11px] text-slate-500">
                  WhatsApp, Messenger, Instagram y Email están al día.
                </small>
              </div>
            </div>
          ) : (
            communications
              .slice(0, visibleLimit)
              .map(([channel, name, preview, count, tone, href]) => {
                const ChannelIcon = communicationIcon(channel);

                return (
                  <button
                    key={`${channel}-${name}-${preview}`}
                    type="button"
                    onClick={() => {
                      if (href) window.location.href = href;
                    }}
                    className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 text-left last:border-0 hover:bg-slate-50"
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full border ${
                        tone === "green"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : tone === "purple"
                            ? "border-violet-200 bg-violet-50 text-violet-600"
                            : tone === "red"
                              ? "border-rose-200 bg-rose-50 text-rose-600"
                              : tone === "blue"
                                ? "border-blue-200 bg-blue-50 text-blue-600"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <ChannelIcon className="h-3.5 w-3.5" />
                    </span>

                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <strong className="truncate text-[11.7px] font-semibold text-slate-900">
                          {name}
                        </strong>
                        <small className="shrink-0 text-[9.8px] font-medium text-slate-400">
                          {channel}
                        </small>
                      </span>
                      <small className="block truncate text-[10.5px] text-slate-500">
                        {preview}
                      </small>
                    </span>

                    {Number(count) > 0 ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-600">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/whatsapp";
          }}
          className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
        >
          Abrir bandeja unificada →
        </button>
      </div>
    </DashboardCard>
  );
}

export function DashboardActivityWidget({
  activities,
  mode = "standard",
}: {
  activities: ActivityItem[];
  mode?: DashboardWidgetMode;
}) {
  if (mode === "mini") {
    const latest = activities[0];
    return (
      <MiniWidgetCard
        title="Actividad"
        value={String(activities.length)}
        helper={latest?.[0] || "Sin actividad reciente"}
        icon={CheckCircle2}
        tone={activities.length ? "teal" : "neutral"}
        status="CRM"
      />
    );
  }

  const visibleLimit = mode === "advanced" ? 8 : ACTIVITY_VISIBLE_LIMIT;

  return (
    <DashboardCard
      title="Actividad reciente"
      action={<DashboardTextButton href="/reports">Ver reporte</DashboardTextButton>}
      bodyClassName="h-full p-3"
    >
      <div className="min-h-0 space-y-1.5 overflow-hidden">
        {activities.slice(0, visibleLimit).map(([title, subtitle, amount, Icon]) => (
          <div
            key={`${title}-${subtitle}`}
            className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1.5 last:border-0"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-[11.5px] font-semibold text-slate-900">
                {title}
              </strong>
              <small className="block truncate text-[10.5px] text-slate-500">{subtitle}</small>
            </span>
            {amount ? (
              <strong className="text-[11px] font-semibold text-emerald-600">{amount}</strong>
            ) : null}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function DashboardV2({
  kpis = mockKpis,
  actions = mockActions,
  schedule = mockSchedule,
  collectionRows = mockCollectionRows,
  pipeline = mockPipeline,
  clients = mockClients,
  activities = mockActivities,
  communications = mockCommunications,
  leadsAttention,
  projectRisks,
  invoiceRows,
  proposalRows,
  reportSnapshot,
  salesDocumentsOverview,
  workCenter,
  todoItems,
  calendarItems = [],
  onCalendarRefresh,
  onTaskComplete,
  onTaskStart,
  todayLabel = "Vie. 23 mayo",
  collectionPeriodLabel = "Este mes⌄",
  pipelinePeriodLabel = "Este mes⌄",
}: DashboardV2Props = {}) {
  const [agentPromptPayload, setAgentPromptPayload] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isAgentPromptPayloadLoading, setIsAgentPromptPayloadLoading] = useState(false);

  const refreshAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      await refreshAgentOperatingContext({
        expireMissing: true,
        debug: true,
      });

      const widgetContractResult = await fetchAgentWidgetContract();

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "idle",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } catch (error) {
      console.warn("[dashboard-v2] No se pudo refrescar agent_widget_contracts", error);

      try {
        const widgetContractResult = await fetchAgentWidgetContract();

        if (widgetContractResult.payload) {
          setAgentPromptPayload(widgetContractResult.payload);
          return;
        }
      } catch (fallbackError) {
        console.warn("[dashboard-v2] Tampoco se pudo cargar el contrato existente", fallbackError);
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "error",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);

  const loadAgentPromptPayload = useCallback(async () => {
    setIsAgentPromptPayloadLoading(true);

    try {
      const widgetContractResult = await fetchAgentWidgetContract();

      if (widgetContractResult.payload) {
        setAgentPromptPayload(widgetContractResult.payload);
        return;
      }

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "idle",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } catch (error) {
      console.warn("[dashboard-v2] No se pudo cargar agent_widget_contracts", error);

      setAgentPromptPayload({
        schema_version: "agent_widget_contract_v1",
        status: "error",
        generated_at: new Date().toISOString(),
        summary: {
          total_cases: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        recovery_plans: [],
      });
    } finally {
      setIsAgentPromptPayloadLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgentPromptPayload();
  }, [loadAgentPromptPayload]);

  const resolvedLeadAttention = leadsAttention ?? actionListItems(actions, "/leads", "blue");
  const resolvedProjectRisks = projectRisks ?? actionListItems(actions, "/projects", "orange");
  const resolvedInvoiceRows =
    invoiceRows ??
    actionListItems(actions, "/invoices", "orange").concat(
      collectionRows
        .slice(0, 3)
        .map(
          ([label, value, percent, color]) =>
            [
              label,
              `${value} · ${percent}`,
              label.toLowerCase().includes("venc") ? "Vencido" : "Cobros",
              color.includes("rose") ? "red" : color.includes("emerald") ? "green" : "blue",
              "/invoices",
            ] as ListWidgetItem,
        ),
    );
  const resolvedProposalRows = proposalRows ?? actionListItems(actions, "/proposals", "purple");
  const resolvedReportSnapshot =
    reportSnapshot ??
    ([
      [
        "Dinero por cobrar",
        kpis.find((kpi) => kpi.label.toLowerCase().includes("cobrar"))?.value ||
          collectionRows[0]?.[1] ||
          "$0",
        collectionRows[1] ? `${collectionRows[1][1]} vencido` : "Sin vencidas",
        collectionRows[1]?.[1] && collectionRows[1][1] !== "$0" ? "orange" : "blue",
      ],
      [
        "Pipeline abierto",
        kpis.find((kpi) => kpi.label.toLowerCase().includes("oportun"))?.helper || "$0",
        `${pipeline.reduce((sum, [, count]) => sum + count, 0)} oportunidades`,
        "blue",
      ],
      [
        "Propuestas",
        kpis.find((kpi) => kpi.label.toLowerCase().includes("propuesta"))?.value || "0",
        "Esperando respuesta",
        "purple",
      ],
      [
        "Actividad",
        String(activities.length),
        activities[0]?.[0] || "Sin actividad reciente",
        activities.length ? "teal" : "neutral",
      ],
    ] satisfies SnapshotMetricItem[]);
  const resolvedSalesDocumentsOverview =
    salesDocumentsOverview ??
    ({
      invoices: [
        ["Draft", 0, 0, "neutral"],
        ["Not Sent", 0, 0, "neutral"],
        ["Unpaid", resolvedInvoiceRows.length, resolvedInvoiceRows.length ? 100 : 0, "orange"],
        ["Partially Paid", 0, 0, "orange"],
        [
          "Overdue",
          resolvedInvoiceRows.filter(([, , badge]) => badge.includes("Venc")).length,
          0,
          "red",
        ],
        ["Paid", 0, 0, "green"],
      ],
      estimates: [
        ["Draft", 0, 0, "neutral"],
        ["Sent", 0, 0, "blue"],
        ["Expired", 0, 0, "orange"],
        ["Declined", 0, 0, "red"],
        ["Accepted", 0, 0, "green"],
      ],
      proposals: [
        ["Draft", 0, 0, "neutral"],
        ["Sent", resolvedProposalRows.length, resolvedProposalRows.length ? 100 : 0, "blue"],
        ["Open", 0, 0, "neutral"],
        ["Declined", 0, 0, "red"],
        ["Accepted", 0, 0, "green"],
      ],
      totals: collectionRows.map(
        ([label, value, , color]) =>
          [
            label === "Por cobrar"
              ? "Outstanding Invoices"
              : label === "Vencido"
                ? "Past Due Invoices"
                : "Paid Invoices",
            value,
            color.includes("rose") ? "red" : color.includes("emerald") ? "green" : "orange",
          ] as [string, string, DashboardV2Tone],
      ),
    } satisfies SalesDocumentsOverview);
  const resolvedWorkCenter =
    workCenter ??
    ({
      tasks: actions
        .filter((action) => action.href === "/tasks")
        .map(
          (action) =>
            ({
              type: "task",
              title: action.title,
              subtitle: action.relatedTo || action.due,
              badge: action.priority,
              tone: action.tone,
              href: "/tasks",
              meta: action.due,
            }) as WorkCenterItem,
        ),
      projects: resolvedProjectRisks.map(
        ([title, subtitle, badge, tone, href]) =>
          ({
            type: "project",
            title,
            subtitle,
            badge,
            tone: tone as DashboardV2Tone,
            href,
          }) as WorkCenterItem,
      ),
      tickets: [],
      inbox: communications.map(
        ([channel, name, preview, count, tone, href]) =>
          ({
            type: "inbox",
            title: `${channel}: ${name}`,
            subtitle: preview,
            badge: Number(count) > 0 ? `${count} nuevo` : "Abierto",
            tone: tone as DashboardV2Tone,
            href,
          }) as WorkCenterItem,
      ),
      calendar: schedule.map(
        ([when, title, subtitle, tone]) =>
          ({
            type: "calendar",
            title,
            subtitle,
            badge: when,
            tone: tone as DashboardV2Tone,
            href: "/calendar",
          }) as WorkCenterItem,
      ),
      sales: resolvedInvoiceRows
        .concat(resolvedProposalRows)
        .slice(0, 6)
        .map(
          ([title, subtitle, badge, tone, href]) =>
            ({
              type: "sales",
              title,
              subtitle,
              badge,
              tone: tone as DashboardV2Tone,
              href,
            }) as WorkCenterItem,
        ),
    } satisfies WorkCenterData);
  const resolvedTodoItems =
    todoItems ??
    ({
      pending: actions
        .filter((action) => action.href === "/tasks")
        .map(
          (action) =>
            ({
              title: action.title,
              subtitle: `${action.relatedTo} · ${action.due}`,
              tone: action.tone,
              href: "/tasks",
              completed: false,
            }) as TodoItem,
        ),
      completed: [],
    } satisfies TodoWidgetData);

  return (
    <DashboardBuilder
      widgets={[
        {
          id: "agent.autopilot",
          render: () => (
            <AgentCommandWidgetConnected
              payload={agentPromptPayload}
              isLoading={isAgentPromptPayloadLoading}
              onAnalyzeNow={refreshAgentPromptPayload}
            />
          ),
        },
        {
          id: "sales.quick-kpis",
          render: ({ mode }) => <DashboardKpiStripWidget kpis={kpis} mode={mode} />,
        },
        {
          id: "leads.attention",
          render: ({ mode }) => (
            <DashboardListWidget
              title="Leads por atender"
              question="¿Qué prospectos necesitan seguimiento?"
              emptyLabel="No hay leads urgentes."
              href="/leads"
              icon={Users}
              items={resolvedLeadAttention}
              mode={mode}
              tone="blue"
            />
          ),
        },
        {
          id: "calendar.agenda",
          render: ({ mode }) => (
            <DashboardCalendarWidget
              events={calendarItems}
              mode={mode}
              onRefresh={onCalendarRefresh}
            />
          ),
        },
        {
          id: "finance.documents-overview",
          render: ({ mode }) => (
            <DashboardSalesDocumentsOverviewWidget
              overview={resolvedSalesDocumentsOverview}
              mode={mode}
            />
          ),
        },
        {
          id: "work.center",
          render: ({ mode }) => (
            <DashboardWorkCenterWidget
              workCenter={resolvedWorkCenter}
              mode={mode}
              onTaskComplete={onTaskComplete}
              onTaskStart={onTaskStart}
            />
          ),
        },
        {
          id: "personal.todo-items",
          render: ({ mode }) => (
            <DashboardTodoItemsWidget
              todos={resolvedTodoItems}
              mode={mode}
              onTaskComplete={onTaskComplete}
            />
          ),
        },
        {
          id: "clients.review",
          render: ({ mode }) => <DashboardClientsReviewWidget clients={clients} mode={mode} />,
        },
        {
          id: "projects.risk",
          render: ({ mode }) => (
            <DashboardListWidget
              title="Proyectos en riesgo"
              question="¿Qué entregas pueden atrasarse?"
              emptyLabel="No hay proyectos en riesgo."
              href="/projects"
              icon={Flag}
              items={resolvedProjectRisks}
              mode={mode}
              tone="teal"
            />
          ),
        },
        {
          id: "invoices.collections",
          render: ({ mode }) => (
            <DashboardListWidget
              title="Cobros pendientes"
              question="¿Qué facturas requieren acción?"
              emptyLabel="No hay facturas por cobrar."
              href="/invoices"
              icon={DollarSign}
              items={resolvedInvoiceRows}
              mode={mode}
              tone="orange"
            />
          ),
        },
        {
          id: "proposals.pending",
          render: ({ mode }) => (
            <DashboardListWidget
              title="Propuestas pendientes"
              question="¿Qué propuestas esperan respuesta?"
              emptyLabel="No hay propuestas pendientes."
              href="/proposals"
              icon={FileText}
              items={resolvedProposalRows}
              mode={mode}
              tone="purple"
            />
          ),
        },
        {
          id: "inbox.pending",
          render: ({ mode }) => (
            <DashboardCommunicationsWidget communications={communications} mode={mode} />
          ),
        },
        {
          id: "activity.recent",
          render: ({ mode }) => <DashboardActivityWidget activities={activities} mode={mode} />,
        },
        {
          id: "reports.revenue-snapshot",
          render: ({ mode }) => (
            <DashboardReportSnapshotWidget
              metrics={resolvedReportSnapshot}
              pipeline={pipeline}
              collectionRows={collectionRows}
              invoiceRows={resolvedInvoiceRows}
              proposalRows={resolvedProposalRows}
              mode={mode}
            />
          ),
        },
        {
          id: "tickets.status",
          render: ({ mode }) => (
            <DashboardPlaceholderWidget
              title="Tickets by status"
              helper="Listo para conectar cuando soporte tenga métricas activas."
              icon={LifeBuoy}
              mode={mode}
            />
          ),
        },
        {
          id: "goals.progress",
          render: ({ mode }) => (
            <DashboardPlaceholderWidget
              title="Goals progress"
              helper="Preparado para metas comerciales y operativas."
              icon={Goal}
              mode={mode}
            />
          ),
        },
      ]}
    />
  );
}
