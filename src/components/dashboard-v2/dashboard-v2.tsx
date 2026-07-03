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
import type { DashboardWidgetMode } from "@/components/dashboard-builder";

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
  if (mode === "mini") {
    const primary = kpis[0];
    return (
      <MiniWidgetCard
        title={primary?.label || "Indicador"}
        value={primary?.value || "0"}
        helper={primary?.helper || "Sin datos"}
        icon={primary?.icon || DollarSign}
        tone={primary?.tone || "blue"}
      />
    );
  }

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
  mode = "standard",
}: {
  metrics: SnapshotMetricItem[];
  mode?: DashboardWidgetMode;
}) {
  const primary = metrics[0];

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

  const visibleLimit = mode === "advanced" ? metrics.length : 4;

  return (
    <DashboardCard
      title="Resumen financiero"
      action={<DashboardTextButton href="/reports">Ver reportes →</DashboardTextButton>}
      bodyClassName="h-full p-3"
    >
      <div className="grid h-full min-h-0 gap-2 md:grid-cols-2">
        {metrics.slice(0, visibleLimit).map(([label, value, helper, tone]) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="block truncate text-[10.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">
              {label}
            </span>
            <strong className="mt-1 block truncate text-[20px] font-semibold tracking-[-0.04em] text-slate-950">
              {value}
            </strong>
            <small
              className={`mt-1 block truncate text-[10.5px] font-semibold ${toneBadgeClass(tone)}`}
            >
              {helper}
            </small>
          </div>
        ))}
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

          {actions.slice(0, visibleLimit).map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={`${item.title}-${item.relatedTo}`}
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
          {clients.slice(0, visibleLimit).map(([initials, name, note, status, tone]) => (
            <div
              key={String(name)}
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
  todayLabel = "Vie. 23 mayo",
  collectionPeriodLabel = "Este mes⌄",
  pipelinePeriodLabel = "Este mes⌄",
}: DashboardV2Props = {}) {
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

  return (
    <DashboardBuilder
      widgets={[
        {
          id: "sales.quick-kpis",
          render: ({ mode }) => <DashboardKpiStripWidget kpis={kpis} mode={mode} />,
        },
        {
          id: "tasks.my-work",
          render: ({ mode }) => <DashboardActionPrioritiesWidget actions={actions} mode={mode} />,
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
            <DashboardScheduleWidget schedule={schedule} todayLabel={todayLabel} mode={mode} />
          ),
        },
        {
          id: "sales.pipeline-summary",
          render: ({ mode }) => (
            <DashboardSalesCollectionsWidget
              pipeline={pipeline}
              collectionRows={collectionRows}
              collectionPeriodLabel={collectionPeriodLabel}
              pipelinePeriodLabel={pipelinePeriodLabel}
              mode={mode}
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
            <DashboardReportSnapshotWidget metrics={resolvedReportSnapshot} mode={mode} />
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
