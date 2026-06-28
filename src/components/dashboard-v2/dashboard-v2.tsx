import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  Instagram,
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
  priority: "High" | "Medium" | "Normal";
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

export type DashboardV2Props = {
  kpis?: DashboardV2Kpi[];
  actions?: DashboardV2Action[];
  schedule?: ScheduleItem[];
  collectionRows?: CollectionItem[];
  pipeline?: PipelineItem[];
  clients?: ClientReviewItem[];
  activities?: ActivityItem[];
  communications?: CommunicationItem[];
  todayLabel?: string;
  collectionPeriodLabel?: string;
  pipelinePeriodLabel?: string;
};

const mockKpis: DashboardV2Kpi[] = [
  {
    label: "Money to collect",
    value: "$86,450",
    helper: "Needs attention",
    tone: "green" as const,
    icon: DollarSign,
  },
  {
    label: "Opportunities",
    value: "35",
    helper: "Active progress",
    tone: "blue" as const,
    icon: TrendingUp,
  },
  {
    label: "Overdue tasks",
    value: "12",
    helper: "Need action",
    tone: "orange" as const,
    icon: Clock3,
  },
  {
    label: "Proposals",
    value: "18",
    helper: "Waiting for response",
    tone: "purple" as const,
    icon: FileText,
  },
  {
    label: "Messages",
    value: "8",
    helper: "Needs attention",
    tone: "red" as const,
    icon: MessageCircle,
  },
  {
    label: "Projects",
    value: "7",
    helper: "In progress",
    tone: "teal" as const,
    icon: Workflow,
  },
];

const mockActions: DashboardV2Action[] = [
  {
    title: "Collect overdue invoice",
    relatedTo: "Constructora Norte",
    due: "Yesterday",
    priority: "Alta",
    button: "View invoice",
    icon: DollarSign,
    tone: "red",
  },
  {
    title: "Call pending lead",
    relatedTo: "María F. López",
    due: "Today, 10:00 a.m.",
    priority: "Media",
    button: "Open lead",
    icon: Phone,
    tone: "blue",
  },
  {
    title: "Reply message",
    relatedTo: "Diego Ramírez",
    due: "Today, 11:30 a.m.",
    priority: "Media",
    button: "Reply",
    icon: MessageCircle,
    tone: "green",
  },
  {
    title: "Create proposal",
    relatedTo: "Café Buen Día",
    due: "Today, 2:00 p.m.",
    priority: "Alta",
    button: "Create proposal",
    icon: FileText,
    tone: "purple",
  },
  {
    title: "Review project",
    relatedTo: "Vista Azul",
    due: "Tomorrow, 9:00 a.m.",
    priority: "Alta",
    button: "View project",
    icon: AlertTriangle,
    tone: "orange",
  },
];

const mockSchedule: ScheduleItem[] = [
  ["09:00", "Team meeting", "Meeting room", "blue"],
  ["10:30", "Client call", "Constructora Norte", "purple"],
  ["12:00", "Proposal follow-up", "Review and send", "green"],
  ["02:00", "Present proposal", "Café Buen Día", "orange"],
  ["04:00", "Review pending items", "End of day", "blue"],
];

const mockPipeline: PipelineItem[] = [
  ["New leads", 48, "$96,000", 82, "bg-blue-200"],
  ["Qualified", 32, "$64,000", 58, "bg-blue-300"],
  ["Proposal", 18, "$45,500", 35, "bg-violet-400"],
  ["Negotiation", 9, "$28,700", 20, "bg-orange-300"],
  ["Won", 6, "$18,250", 13, "bg-emerald-300"],
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
  if (priority === "High") return "bg-rose-50 text-rose-600";
  if (priority === "Medium") return "bg-orange-50 text-orange-600";
  return "bg-slate-50 text-slate-600";
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
  ["To collect", "$86,450", "60%", "bg-blue-500"],
  ["Overdue", "$24,300", "25%", "bg-rose-500"],
  ["Collected", "$112,800", "75%", "bg-emerald-500"],
];

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

export function DashboardV2({
  kpis = mockKpis,
  actions = mockActions,
  schedule = mockSchedule,
  collectionRows = mockCollectionRows,
  pipeline = mockPipeline,
  clients = mockClients,
  activities = mockActivities,
  communications = mockCommunications,
  todayLabel = "Fri, May 23",
  collectionPeriodLabel = "This month⌄",
  pipelinePeriodLabel = "This month⌄",
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
          title="What to do now"
          action={<DashboardTextButton href="/tasks">View priorities →</DashboardTextButton>}
          className="xl:min-h-0"
        >
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
            <div className="border-b border-slate-200 px-4 py-2 text-[11.5px] font-medium text-slate-500">
              Urgent actions that may affect sales, collections, or clients.
            </div>
            <div className="min-h-0 overflow-hidden">
              <div className="grid grid-cols-[minmax(210px,1.3fr)_minmax(116px,.68fr)_minmax(104px,.58fr)_74px_116px] border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-[10.5px] font-medium text-slate-500">
                <span>Pending</span>
                <span>Client</span>
                <span>Reason</span>
                <span>Priority</span>
                <span>Action</span>
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
                        item.due === "Yesterday"
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
              <DashboardMoreButton href="/tasks">{`Ver ${actions.length - ACTION_VISIBLE_LIMIT} más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>

        <div className="min-h-0">
          <DashboardCard
            title="Today agenda"
            action={<span className="text-slate-400">‹ ›</span>}
            className="h-full"
          >
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] px-4 py-2">
              <div className="min-h-0 overflow-hidden">
                <p className="-mt-0.5 mb-1.5 text-[11px] text-slate-500">
                  {todayLabel} · Due dates and scheduled tasks
                </p>

                {schedule.slice(0, SCHEDULE_VISIBLE_LIMIT).map(([time, title, subtitle, tone]) => (
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
                        <i
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot(String(tone))}`}
                        />
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

              {schedule.length > SCHEDULE_VISIBLE_LIMIT ? (
                <DashboardMoreButton href="/calendar">{`Ver ${schedule.length - SCHEDULE_VISIBLE_LIMIT} más`}</DashboardMoreButton>
              ) : null}
            </div>
          </DashboardCard>
        </div>
      </section>

      <section className="grid min-h-0 gap-2.5 xl:grid-cols-[1.05fr_.95fr_1.05fr]">
        <DashboardCard
          title="Sales and collections"
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
                  <span className="text-[10.5px] font-medium text-slate-400">Stages</span>
                </div>

                <div className="space-y-1.5">
                  {pipeline
                    .slice(0, PIPELINE_VISIBLE_LIMIT)
                    .map(([label, count, value, percent, color]) => (
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

            {pipeline.length > PIPELINE_VISIBLE_LIMIT ? (
              <DashboardMoreButton href="/pipeline">{`Ver ${
                pipeline.length - PIPELINE_VISIBLE_LIMIT
              } más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard
          title="Clients to review"
          action={<DashboardTextButton href="/clients">View all</DashboardTextButton>}
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
                        tone === "red" ? "High" : tone === "orange" ? "Medium" : "Normal",
                      )}`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
            </div>

            {clients.length > CLIENT_VISIBLE_LIMIT ? (
              <DashboardMoreButton href="/clients">{`Ver ${
                clients.length - CLIENT_VISIBLE_LIMIT
              } más`}</DashboardMoreButton>
            ) : null}
          </div>
        </DashboardCard>

        <DashboardCard
          title="Communications"
          action={<DashboardTextButton href="/whatsapp">View inbox</DashboardTextButton>}
          bodyClassName="h-full p-3"
        >
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
            <div className="min-h-0 space-y-1 overflow-hidden">
              {communications.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl bg-slate-50 px-4 text-center">
                  <div>
                    <strong className="block text-[12px] font-semibold text-slate-900">
                      No pending chats
                    </strong>
                    <small className="mt-1 block text-[11px] text-slate-500">
                      WhatsApp, Messenger, Instagram and Email are up to date.
                    </small>
                  </div>
                </div>
              ) : (
                communications.slice(0, 5).map(([channel, name, preview, count, tone, href]) => {
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
              Open unified inbox →
            </button>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
