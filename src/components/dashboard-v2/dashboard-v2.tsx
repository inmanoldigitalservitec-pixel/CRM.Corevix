import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  MessageCircle,
  Phone,
  Send,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

import { DashboardCard, DashboardTextButton } from "./dashboard-card";
import { DashboardKpiCard } from "./dashboard-kpi-card";

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

export type DashboardV2Props = {
  kpis?: DashboardV2Kpi[];
  actions?: DashboardV2Action[];
  schedule?: ScheduleItem[];
  collectionRows?: CollectionItem[];
  pipeline?: PipelineItem[];
  clients?: ClientReviewItem[];
  activities?: ActivityItem[];
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

const ACTION_VISIBLE_LIMIT = 5;
const SCHEDULE_VISIBLE_LIMIT = 4;
const COLLECTION_VISIBLE_LIMIT = 3;
const PIPELINE_VISIBLE_LIMIT = 4;
const CLIENT_VISIBLE_LIMIT = 4;
const ACTIVITY_VISIBLE_LIMIT = 4;

const mockCollectionRows: CollectionItem[] = [
  ["Por cobrar", "$86,450", "60%", "bg-blue-500"],
  ["Vencido", "$24,300", "25%", "bg-rose-500"],
  ["Cobrado", "$112,800", "75%", "bg-emerald-500"],
];

function DashboardMoreButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      className="mt-1 grid h-7 w-full place-items-center rounded-lg text-[11px] font-medium text-blue-600 hover:bg-blue-50"
    >
      {children}⌄
    </button>
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
  todayLabel = "Vie. 23 mayo",
  collectionPeriodLabel = "Este mes⌄",
  pipelinePeriodLabel = "Este mes⌄",
}: DashboardV2Props = {}) {
  return (
    <div className="grid min-h-0 gap-2.5 p-3 xl:h-[calc(100svh-64px)] xl:grid-rows-[74px_minmax(0,1fr)_minmax(0,0.68fr)] xl:overflow-hidden xl:p-3">
      <section className="grid min-h-0 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((item) => (
          <DashboardKpiCard key={item.label} item={item} />
        ))}
      </section>

      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[minmax(0,1.78fr)_minmax(292px,.68fr)]">
        <DashboardCard
          title="Qué hacer ahora"
          action={<DashboardTextButton>Ver todas las tareas →</DashboardTextButton>}
          className="xl:min-h-0"
        >
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div className="min-h-0 overflow-hidden">
              <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
                <span>Pendiente</span>
                <span>Cliente</span>
                <span>Cuándo</span>
                <span>Importancia</span>
                <span>Acción</span>
              </div>

              {actions.slice(0, ACTION_VISIBLE_LIMIT).map((item) => {
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

            {actions.length > ACTION_VISIBLE_LIMIT ? (
              <DashboardMoreButton>{`Ver ${actions.length - ACTION_VISIBLE_LIMIT} más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>

        <div className="grid min-h-0 gap-2.5 xl:grid-rows-[minmax(0,1fr)_116px]">
          <DashboardCard title="Tu día de hoy" action={<span className="text-slate-400">‹ ›</span>}>
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
              <div className="min-h-0 overflow-hidden">
                <p className="-mt-0.5 mb-1.5 text-[11px] text-slate-500">{todayLabel}</p>

                {schedule.slice(0, SCHEDULE_VISIBLE_LIMIT).map(([time, title, subtitle, tone]) => (
                  <div
                    key={`${time}-${title}`}
                    className="grid grid-cols-[44px_10px_minmax(0,1fr)] items-center gap-2 border-t border-slate-200 py-0.5"
                  >
                    <span className="text-[11px] font-medium text-slate-700">{time}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${toneDot(String(tone))}`} />
                    <span className="min-w-0">
                      <strong className="block truncate text-[11.5px] font-semibold text-slate-900">
                        {title}
                      </strong>
                      <small className="block truncate text-[10.5px] text-slate-500">
                        {subtitle}
                      </small>
                    </span>
                  </div>
                ))}
              </div>

              {schedule.length > SCHEDULE_VISIBLE_LIMIT ? (
                <DashboardMoreButton>{`Ver ${schedule.length - SCHEDULE_VISIBLE_LIMIT} más`}</DashboardMoreButton>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Cobros"
            action={
              <span className="text-xs font-medium text-slate-500">{collectionPeriodLabel}</span>
            }
          >
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 pb-3 pt-2">
              <div className="min-h-0 space-y-1 overflow-hidden">
                {collectionRows
                  .slice(0, COLLECTION_VISIBLE_LIMIT)
                  .map(([label, value, percent, color]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[72px_76px_1fr_32px] items-center gap-2 text-[11px]"
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

              {collectionRows.length > COLLECTION_VISIBLE_LIMIT ? (
                <DashboardMoreButton>{`Ver ${
                  collectionRows.length - COLLECTION_VISIBLE_LIMIT
                } más`}</DashboardMoreButton>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      </section>

      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[.88fr_.98fr_1.12fr]">
        <DashboardCard
          title="Ventas en proceso"
          action={<span className="text-xs font-medium text-slate-500">{pipelinePeriodLabel}</span>}
          bodyClassName="h-full p-3"
        >
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div className="min-h-0 space-y-1.5 overflow-hidden">
              {pipeline
                .slice(0, PIPELINE_VISIBLE_LIMIT)
                .map(([label, count, value, percent, color]) => (
                  <div
                    key={String(label)}
                    className="grid grid-cols-[72px_1fr_22px_52px] items-center gap-2 text-[10.8px]"
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

            {pipeline.length > PIPELINE_VISIBLE_LIMIT ? (
              <DashboardMoreButton>{`Ver ${
                pipeline.length - PIPELINE_VISIBLE_LIMIT
              } más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard
          title="Clientes a revisar"
          action={<DashboardTextButton>Ver todos</DashboardTextButton>}
          bodyClassName="h-full p-3"
        >
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div className="min-h-0 space-y-1.5 overflow-hidden">
              {clients
                .slice(0, CLIENT_VISIBLE_LIMIT)
                .map(([initials, name, note, status, tone]) => (
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

            {clients.length > CLIENT_VISIBLE_LIMIT ? (
              <DashboardMoreButton>{`Ver ${
                clients.length - CLIENT_VISIBLE_LIMIT
              } más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard
          title="Lo último que pasó"
          action={<DashboardTextButton>Ver todo</DashboardTextButton>}
          bodyClassName="h-full p-3"
        >
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div className="min-h-0 space-y-1.5 overflow-hidden">
              {activities
                .slice(0, ACTIVITY_VISIBLE_LIMIT)
                .map(([title, subtitle, amount, Icon]) => (
                  <div
                    key={String(title)}
                    className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-200 py-1 last:border-0"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[10.8px] font-semibold text-slate-900">
                        {title}
                      </strong>
                      <small className="block truncate text-[10px] text-slate-500">
                        {subtitle}
                      </small>
                    </span>
                    {amount ? (
                      <span className="text-[10.8px] font-semibold text-emerald-600">{amount}</span>
                    ) : null}
                  </div>
                ))}
            </div>

            {activities.length > ACTIVITY_VISIBLE_LIMIT ? (
              <DashboardMoreButton>{`Ver ${
                activities.length - ACTIVITY_VISIBLE_LIMIT
              } más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
