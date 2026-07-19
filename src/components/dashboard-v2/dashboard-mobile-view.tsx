import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  DollarSign,
  LifeBuoy,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  TrendingUp,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { MobileNotificationCenter } from "@/components/notifications/mobile-notification-center";
import { useNotifications } from "@/components/notifications/use-notifications";
import type { DashboardV2Props } from "./dashboard-v2";

type MobileTone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";
type WorkFilterKey = "all" | "attention" | "overdue" | "today" | "unassigned";
type KpiItem = NonNullable<DashboardV2Props["kpis"]>[number];
type ActionItem = NonNullable<DashboardV2Props["actions"]>[number];
type CollectionRow = NonNullable<DashboardV2Props["collectionRows"]>[number];
type PipelineRow = NonNullable<DashboardV2Props["pipeline"]>[number];
type WorkCenterData = NonNullable<DashboardV2Props["workCenter"]>;
type WorkCenterKey = keyof WorkCenterData;
type WorkItem = NonNullable<DashboardV2Props["workCenter"]>[keyof NonNullable<
  DashboardV2Props["workCenter"]
>][number];

type DashboardMobileViewProps = DashboardV2Props & {
  error?: string | null;
  summarySlides?: MobileSummarySlide[];
  userName?: string | null;
  onWorkItemOpen?: (item: WorkItem) => boolean | void;
};

export type MobileSummarySlide = {
  type:
    | "invoice_overdue"
    | "receivable"
    | "leads"
    | "proposals"
    | "tasks"
    | "projects"
    | "calendar"
    | "messages";
  title: string;
  value: string;
  detail: string;
  href: string;
  tone: MobileTone;
  ctaLabel: string;
  previewItems?: Array<{
    label: string;
    value: string;
    meta?: string;
    tone?: MobileTone;
  }>;
  chart?: {
    kind: "percent" | "bars" | "list" | "timeline" | "chat" | "none";
    segments?: Array<{
      label: string;
      value: string;
      percent: number;
      tone?: MobileTone;
    }>;
    showPercentLabel?: boolean;
  };
  percent?: number;
};

function toneClasses(tone?: MobileTone) {
  if (tone === "red") return "bg-rose-50 text-rose-600 border-rose-100";
  if (tone === "orange") return "bg-orange-50 text-orange-600 border-orange-100";
  if (tone === "green") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (tone === "purple") return "bg-violet-50 text-violet-600 border-violet-100";
  if (tone === "teal") return "bg-teal-50 text-teal-600 border-teal-100";
  if (tone === "neutral") return "bg-white text-slate-500 border-[#edf1f7]";
  return "bg-blue-50 text-blue-600 border-blue-100";
}

function mobileGradient(tone?: MobileTone) {
  if (tone === "red") return "from-rose-50 via-white to-white";
  if (tone === "orange") return "from-orange-50 via-white to-white";
  if (tone === "green") return "from-emerald-50 via-white to-white";
  if (tone === "purple") return "from-violet-50 via-white to-white";
  if (tone === "teal") return "from-teal-50 via-white to-white";
  if (tone === "neutral") return "from-white via-white to-white";
  return "from-[#edf5ff] via-white to-white";
}

function mobileSummaryFrame(tone?: MobileTone) {
  if (tone === "red") return "border-rose-100 shadow-[0_18px_38px_rgba(244,63,94,0.10)]";
  if (tone === "orange") return "border-orange-100 shadow-[0_18px_38px_rgba(249,115,22,0.10)]";
  if (tone === "green") return "border-emerald-100 shadow-[0_18px_38px_rgba(16,185,129,0.10)]";
  if (tone === "purple") return "border-violet-100 shadow-[0_18px_38px_rgba(124,58,237,0.10)]";
  if (tone === "teal") return "border-teal-100 shadow-[0_18px_38px_rgba(20,184,166,0.10)]";
  if (tone === "neutral") return "border-[#edf1f7] shadow-none";
  return "border-[#dbeafe] shadow-[0_18px_38px_rgba(29,98,249,0.10)]";
}

function mobileSummaryButton(tone?: MobileTone) {
  if (tone === "green") return "bg-emerald-600 text-white hover:bg-emerald-700";
  if (tone === "red") return "bg-rose-600 text-white hover:bg-rose-700";
  if (tone === "orange") return "bg-orange-600 text-white hover:bg-orange-700";
  return "bg-[#111827] text-white hover:bg-slate-800";
}

function toneDot(tone?: MobileTone) {
  if (tone === "red") return "bg-rose-500";
  if (tone === "orange") return "bg-orange-500";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "purple") return "bg-violet-500";
  if (tone === "teal") return "bg-teal-500";
  if (tone === "neutral") return "bg-slate-300";
  return "bg-blue-500";
}

function progressColor(tone?: string) {
  if (tone?.includes("rose")) return "bg-rose-500";
  if (tone?.includes("emerald")) return "bg-emerald-500";
  if (tone?.includes("orange")) return "bg-orange-500";
  return "bg-blue-500";
}

function percentValue(percent?: string | number) {
  if (typeof percent === "number") return clampPercent(percent);
  const value = Number(String(percent || "0").replace("%", ""));
  return clampPercent(value);
}

function getKpi(kpis: KpiItem[], key: string) {
  return kpis.find((item) => item.label.toLowerCase().includes(key));
}

function percentFromKpi(kpi?: KpiItem) {
  if (!kpi?.progressTotal) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round(((kpi.progressCurrent || 0) / kpi.progressTotal) * 100)),
  );
}

function clampPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function goTo(path: string) {
  window.location.href = path;
}

function openTaskCreate() {
  window.dispatchEvent(new CustomEvent("corevix:open-task-create"));
}

function MobileCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-none ${className}`}>
      {children}
    </section>
  );
}

function MobileMetricCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        const label = item.label.toLowerCase();
        if (label.includes("lead")) goTo("/leads");
        else if (label.includes("tarea")) goTo("/tasks");
        else if (label.includes("mensaje")) goTo("/whatsapp");
        else if (label.includes("propuesta")) goTo("/proposals");
        else if (label.includes("factura")) goTo("/invoices");
      }}
      className="grid min-h-[104px] min-w-0 bg-white px-1 py-2.5 text-left"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-slate-900">
          {item.label}
        </span>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${toneClasses(item.tone)}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </span>
      <strong className="mt-2 block truncate text-[24px] font-semibold leading-none tracking-normal text-slate-950">
        {item.value}
      </strong>
      <span className="mt-1.5 block truncate text-[11px] font-medium text-slate-500">
        {item.helper}
      </span>
    </button>
  );
}

function segmentColor(tone?: MobileTone) {
  if (tone === "red") return "bg-rose-500";
  if (tone === "orange") return "bg-orange-500";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "purple") return "bg-violet-500";
  if (tone === "teal") return "bg-teal-500";
  if (tone === "neutral") return "bg-slate-300";
  return "bg-[#1d62f9]";
}

function SummaryPreview({ slide }: { slide: MobileSummarySlide }) {
  const items = slide.previewItems?.slice(0, 2) || [];

  if (!items.length) return null;

  return (
    <span className="mt-3 grid gap-1.5">
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 border-t border-[#edf1f7] pt-2 first:border-t-0 first:pt-0"
        >
          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${toneDot(item.tone || slide.tone)}`} />
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-slate-800">
              {item.label}
            </span>
            <span className="block truncate text-[11px] font-medium text-slate-500">
              {item.value}
              {item.meta ? ` · ${item.meta}` : ""}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

function summaryVisualPlacement(slide: MobileSummarySlide) {
  return slide.chart?.kind === "none" ? "none" : "side";
}

function shouldShowInlinePreview(slide: MobileSummarySlide) {
  if (slide.type === "invoice_overdue") return false;
  return (slide.chart?.kind || "none") === "percent";
}

function SummaryVisual({
  slide,
  animatedPercent,
}: {
  slide: MobileSummarySlide;
  animatedPercent: number;
}) {
  const kind = slide.chart?.kind || "none";

  if (kind === "percent") {
    return (
      <span
        key={`summary-ring-${slide.title}`}
        className="ml-auto grid h-[82px] w-[82px] place-items-center rounded-full text-[17px] font-semibold"
        style={{
          animation: "dashboardMobileRingIn 420ms ease both",
          background: `radial-gradient(circle at center, #ffffff 0 47%, transparent 49%), conic-gradient(#1d62f9 0 ${animatedPercent}%, #dbeafe ${animatedPercent}% 100%)`,
        }}
      >
        {slide.chart?.showPercentLabel ? `${animatedPercent}%` : <Receipt className="h-6 w-6" />}
      </span>
    );
  }

  if (kind === "bars") {
    const segments = slide.chart?.segments?.slice(0, 3) || [];

    return (
      <span className="grid w-full gap-1.5 self-center">
        {segments.map((segment) => (
          <span key={segment.label} className="grid gap-1">
            <span className="flex items-center justify-between gap-2 text-[10px] font-medium text-slate-500">
              <span className="truncate">{segment.label}</span>
              <span>{segment.value}</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-[#edf1f7]">
              <span
                className={`block h-full rounded-full ${segmentColor(segment.tone || slide.tone)}`}
                style={{ width: `${clampPercent(segment.percent)}%` }}
              />
            </span>
          </span>
        ))}
      </span>
    );
  }

  if (kind === "chat") {
    const item = slide.previewItems?.[0];

    return (
      <span className="grid w-full rounded-[18px] border border-[#edf1f7] bg-white px-3 py-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.045)]">
        <span className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <MessageCircle className="h-3.5 w-3.5 text-[#1d62f9]" />
          {item?.label || "Mensaje"}
        </span>
        <span className="line-clamp-3 text-[12px] font-medium leading-5 text-slate-700">
          {item?.value || "Sin mensajes pendientes"}
        </span>
      </span>
    );
  }

  if (kind === "timeline") {
    const items = slide.previewItems?.slice(0, 2) || [];

    return (
      <span className="grid w-full gap-2 self-center">
        {items.map((item) => (
          <span key={`${item.label}-${item.value}`} className="grid grid-cols-[auto_1fr] gap-2">
            <span className={`mt-1 h-2 w-2 rounded-full ${toneDot(item.tone || slide.tone)}`} />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-slate-900">
                {item.label}
              </span>
              <span className="block truncate text-[11px] font-medium text-slate-500">
                {item.value}
              </span>
            </span>
          </span>
        ))}
      </span>
    );
  }

  const items = slide.previewItems?.slice(0, 2) || [];

  return (
    <span className="grid w-full gap-2 self-center">
      {items.length ? (
        items.map((item) => (
          <span
            key={`${item.label}-${item.value}`}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2"
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 rounded-full ${toneDot(item.tone || slide.tone)}`}
            />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-slate-800">
                {item.label}
              </span>
              <span className="block truncate text-[11px] font-medium text-slate-500">
                {item.value}
                {item.meta ? ` · ${item.meta}` : ""}
              </span>
            </span>
          </span>
        ))
      ) : (
        <span
          className={`grid h-[58px] w-[58px] place-items-center rounded-full border ${toneClasses(slide.tone)}`}
        >
          <TrendingUp className="h-5 w-5" />
        </span>
      )}
    </span>
  );
}

function buildWeekDays() {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return {
      key: date.toISOString(),
      day: date.toLocaleDateString("es-DO", { weekday: "short" }).replace(".", ""),
      number: date.getDate(),
      active: index === 0,
    };
  });
}

const emptyWorkCenter: WorkCenterData = {
  tasks: [],
  projects: [],
  tickets: [],
  inbox: [],
  calendar: [],
  sales: [],
};

const mobileWorkTabs = [
  ["tasks", "Tareas", CheckCircle2, "/tasks"],
  ["projects", "Proyectos", Workflow, "/projects"],
  ["tickets", "Tickets", LifeBuoy, "/tickets"],
  ["inbox", "Inbox", MessageCircle, "/whatsapp"],
  ["calendar", "Agenda", Clock3, "/calendar"],
  ["sales", "Ventas", DollarSign, "/invoices"],
] as const;

const mobileWorkVisibleLimit = 4;
const mobileWorkTabCountLimit = 9;

function compactMobileCount(count: number) {
  return count > mobileWorkTabCountLimit ? `${mobileWorkTabCountLimit}+` : String(count);
}

function staticLabel(label?: string, fallback = "") {
  return (label || fallback).replace(/[⌄▾▼]/g, "").trim();
}

function workItemsForTab(args: {
  activeTab: WorkCenterKey | "overview";
  resolvedWorkCenter: WorkCenterData;
  overviewItems: WorkItem[];
}) {
  if (args.activeTab === "overview") return args.overviewItems;
  return args.resolvedWorkCenter[args.activeTab] || [];
}

function normalizeWorkText(value?: string) {
  return String(value || "").toLowerCase();
}

function workItemMatchesFilter(item: WorkItem, filter: WorkFilterKey) {
  const searchable = normalizeWorkText(
    [item.title, item.subtitle, item.badge, item.meta, item.dueLabel].filter(Boolean).join(" "),
  );
  if (filter === "attention") return item.tone === "red" || item.tone === "orange";
  if (filter === "overdue") {
    return item.tone === "red" || searchable.includes("venc") || searchable.includes("atras");
  }
  if (filter === "today") {
    return searchable.includes("hoy") || searchable.includes(new Date().toLocaleDateString());
  }
  if (filter === "unassigned") {
    return (
      searchable.includes("sin asign") ||
      searchable.includes("sin relación") ||
      searchable.includes("sin relacion") ||
      searchable.includes("sin cliente")
    );
  }
  return true;
}

function workItemGroupLabel(item: WorkItem) {
  const searchable = normalizeWorkText(
    [item.title, item.subtitle, item.badge, item.meta, item.dueLabel].filter(Boolean).join(" "),
  );
  if (item.tone === "red" || item.tone === "orange") return "Requieren atención";
  if (searchable.includes("hoy")) return "Para hoy";
  if (item.dueLabel && item.dueLabel !== "Sin fecha") return "Con fecha";
  return "Otros";
}

function groupedWorkItems(items: WorkItem[]) {
  const groupOrder = ["Requieren atención", "Para hoy", "Con fecha", "Otros"];
  const groups = items.reduce<Record<string, WorkItem[]>>((acc, item) => {
    const label = workItemGroupLabel(item);
    acc[label] = acc[label] || [];
    acc[label].push(item);
    return acc;
  }, {});

  return groupOrder
    .map((label) => [label, groups[label] || []] as const)
    .filter(([, groupItems]) => groupItems.length > 0);
}

function MobileWorkItemRow({
  item,
  onWorkItemOpen,
}: {
  item: WorkItem;
  onWorkItemOpen?: (item: WorkItem) => boolean | void;
}) {
  return (
    <div
      key={`${item.type}-${item.id || item.title}-${item.subtitle}`}
      className="border-t border-[#edf1f7] py-3 first:border-t-0"
    >
      <button
        type="button"
        onClick={() => {
          if (onWorkItemOpen?.(item)) return;
          goTo(item.href);
        }}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${toneDot(item.tone)}`} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-slate-950">
            {item.title}
          </span>
          <span className="mt-0.5 flex min-w-0 gap-2 text-[12px] font-medium text-slate-500">
            <span className="truncate">{item.subtitle}</span>
            {item.meta ? <span className="shrink-0 text-slate-400">{item.meta}</span> : null}
          </span>
        </span>
        <span
          className={`max-w-[92px] truncate rounded-full border px-2 py-1 text-[11px] font-medium ${toneClasses(item.tone)}`}
        >
          {item.badge}
        </span>
      </button>
    </div>
  );
}

function MobileWorkCenterFullscreen({
  open,
  activeTab,
  resolvedWorkCenter,
  overviewItems,
  totalItems,
  attentionCount,
  onClose,
  onTabChange,
  onWorkItemOpen,
}: {
  open: boolean;
  activeTab: WorkCenterKey | "overview";
  resolvedWorkCenter: WorkCenterData;
  overviewItems: WorkItem[];
  totalItems: number;
  attentionCount: number;
  onClose: () => void;
  onTabChange: (tab: WorkCenterKey | "overview") => void;
  onWorkItemOpen?: (item: WorkItem) => boolean | void;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<WorkFilterKey>("all");
  const activeTabConfig = mobileWorkTabs.find(([key]) => key === activeTab);
  const rawItems = workItemsForTab({ activeTab, resolvedWorkCenter, overviewItems });
  const normalizedQuery = query.trim().toLowerCase();
  const queryItems = normalizedQuery
    ? rawItems.filter((item) =>
        normalizeWorkText(
          [item.title, item.subtitle, item.badge, item.meta, item.dueLabel]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedQuery),
      )
    : rawItems;
  const visibleItems = queryItems.filter((item) => workItemMatchesFilter(item, activeFilter));
  const visibleGroups = activeFilter === "all" ? groupedWorkItems(visibleItems) : [];
  const filterOptions: Array<{ key: WorkFilterKey; label: string; count: number }> = [
    { key: "all", label: "Todos", count: rawItems.length },
    {
      key: "attention",
      label: "Atención",
      count: rawItems.filter((item) => workItemMatchesFilter(item, "attention")).length,
    },
    {
      key: "overdue",
      label: "Vencidos",
      count: rawItems.filter((item) => workItemMatchesFilter(item, "overdue")).length,
    },
    {
      key: "today",
      label: "Hoy",
      count: rawItems.filter((item) => workItemMatchesFilter(item, "today")).length,
    },
    {
      key: "unassigned",
      label: "Sin asignar",
      count: rawItems.filter((item) => workItemMatchesFilter(item, "unassigned")).length,
    },
  ];

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveFilter("all");
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setActiveFilter("all");
  }, [activeTab]);

  if (!open) return null;

  const emptyTitle =
    activeTab === "overview"
      ? "No hay prioridades ahora"
      : `No hay ${activeTabConfig?.[1] || "elementos"}`;
  const emptyDetail = query
    ? "Prueba con otra búsqueda o limpia el texto."
    : activeFilter !== "all"
      ? "Cambia el filtro para ver más resultados."
      : "Todo limpio por aquí.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Centro de trabajo"
      className="fixed inset-0 z-50 flex h-[100dvh] max-w-full flex-col overflow-x-hidden bg-white text-slate-950"
    >
      <header className="shrink-0 border-b border-[#edf1f7] bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-700"
            aria-label="Cerrar centro de trabajo"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-[18px] font-semibold tracking-normal">
              Centro de trabajo
            </h2>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {totalItems} activos · {attentionCount} requieren atención
            </p>
          </div>
          <button
            type="button"
            onClick={openTaskCreate}
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-white"
            aria-label="Crear tarea"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="-mx-1 mt-3 grid grid-cols-7 gap-1 px-1">
          <button
            type="button"
            onClick={() => onTabChange("overview")}
            className={`min-w-0 rounded-[14px] px-0.5 py-2 text-center transition ${
              activeTab === "overview" ? "bg-[#edf5ff] text-[#1d62f9]" : "text-slate-500"
            }`}
          >
            <BarChart3 className="mx-auto h-3.5 w-3.5" />
            <span className="mt-1 block truncate text-[9.5px] font-medium">Resumen</span>
            <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">
              {compactMobileCount(overviewItems.length)}
            </span>
          </button>
          {mobileWorkTabs.map(([key, label, Icon]) => {
            const count = resolvedWorkCenter[key].length;
            const urgent = resolvedWorkCenter[key].filter(
              (item) => item.tone === "red" || item.tone === "orange",
            ).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={`relative min-w-0 rounded-[14px] px-0.5 py-2 text-center transition ${
                  activeTab === key ? "bg-[#edf5ff] text-[#1d62f9]" : "text-slate-500"
                }`}
              >
                <Icon className="mx-auto h-3.5 w-3.5" />
                <span className="mt-1 block truncate text-[9.5px] font-medium">{label}</span>
                <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">
                  {compactMobileCount(count)}
                </span>
                {urgent ? (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500">
                    <span className="sr-only">{urgent} requieren atención</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`h-8 shrink-0 rounded-full border px-3 text-[11px] font-medium transition ${
                activeFilter === filter.key
                  ? "border-[#1d62f9] bg-[#edf5ff] text-[#1d62f9]"
                  : "border-[#edf1f7] bg-white text-slate-500"
              }`}
            >
              {filter.label} {compactMobileCount(filter.count)}
            </button>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[12px] font-medium text-slate-700">
            {activeTab === "overview"
              ? "Lo más importante ahora"
              : activeTabConfig?.[1] || "Elementos"}
          </p>
          <span className="text-[11px] font-medium text-slate-400">
            {visibleItems.length} items
          </span>
        </div>

        {visibleItems.length ? (
          activeFilter === "all" ? (
            <div className="grid gap-3">
              {visibleGroups.map(([label, groupItems]) => (
                <section key={label}>
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-semibold uppercase tracking-normal text-slate-400">
                      {label}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {groupItems.length}
                    </span>
                  </div>
                  <div className="rounded-[22px] border border-[#edf1f7] bg-white px-3">
                    {groupItems.map((item) => (
                      <MobileWorkItemRow
                        key={`${item.type}-${item.id || item.title}-${item.subtitle}`}
                        item={item}
                        onWorkItemOpen={onWorkItemOpen}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-[#edf1f7] bg-white px-3">
              {visibleItems.map((item) => (
                <MobileWorkItemRow
                  key={`${item.type}-${item.id || item.title}-${item.subtitle}`}
                  item={item}
                  onWorkItemOpen={onWorkItemOpen}
                />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-[22px] border border-dashed border-[#edf1f7] bg-white px-4 py-10 text-center">
            <p className="text-[14px] font-semibold text-slate-700">{emptyTitle}</p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">{emptyDetail}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function MobileWorkCenter({
  workCenter,
  actions,
  onWorkItemOpen,
}: {
  workCenter?: DashboardV2Props["workCenter"];
  actions: ActionItem[];
  onWorkItemOpen?: (item: WorkItem) => boolean | void;
}) {
  const resolvedWorkCenter = workCenter || emptyWorkCenter;
  const [activeTab, setActiveTab] = useState<WorkCenterKey | "overview">("overview");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const activeTabConfig = mobileWorkTabs.find(([key]) => key === activeTab);
  const activeItems = activeTabConfig ? resolvedWorkCenter[activeTabConfig[0]] : [];
  const totalItems = mobileWorkTabs.reduce((sum, [key]) => sum + resolvedWorkCenter[key].length, 0);
  const attentionCount = mobileWorkTabs.reduce(
    (sum, [key]) =>
      sum +
      resolvedWorkCenter[key].filter((item) => item.tone === "red" || item.tone === "orange")
        .length,
    0,
  );
  const fallbackActions: WorkItem[] = actions.slice(0, 4).map((action) => ({
    type: "task",
    title: action.title,
    subtitle: action.relatedTo || action.due,
    badge: action.priority,
    tone: action.tone,
    href: action.href || "/tasks",
  }));
  const priorityRank: Record<MobileTone, number> = {
    red: 0,
    orange: 1,
    purple: 2,
    blue: 3,
    teal: 4,
    green: 5,
    neutral: 6,
  };
  const priorityItems = mobileWorkTabs
    .flatMap(([key]) => resolvedWorkCenter[key])
    .sort((a, b) => priorityRank[a.tone] - priorityRank[b.tone]);
  const overviewItems = priorityItems.length ? priorityItems : fallbackActions;
  const visibleOverviewItems = overviewItems.slice(0, mobileWorkVisibleLimit);
  const visibleActiveItems = activeItems.slice(0, mobileWorkVisibleLimit);
  const hiddenOverviewCount = Math.max(0, overviewItems.length - visibleOverviewItems.length);
  const hiddenActiveCount = Math.max(0, activeItems.length - visibleActiveItems.length);
  const openFullscreen = (tab: WorkCenterKey | "overview") => {
    setActiveTab(tab);
    setFullscreenOpen(true);
  };

  return (
    <>
      <MobileCard className="p-0">
        <div className="grid gap-3 p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-semibold tracking-normal">
                Centro de trabajo
              </h2>
              <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
                {totalItems} activos · {attentionCount} requieren atención
              </p>
            </div>
            <button
              type="button"
              onClick={openTaskCreate}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Tarea
            </button>
          </div>

          <div className="-mx-1 grid grid-cols-7 gap-1 border-t border-blue-100 px-1 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`min-w-0 rounded-[14px] px-0.5 py-2 text-center transition ${
                activeTab === "overview" ? "bg-blue-50 text-blue-700" : "text-slate-500"
              }`}
            >
              <BarChart3 className="mx-auto h-3.5 w-3.5" />
              <span className="mt-1 block truncate text-[9.5px] font-medium">Resumen</span>
              <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">
                {compactMobileCount(overviewItems.length)}
              </span>
            </button>
            {mobileWorkTabs.slice(0, 6).map(([key, label, Icon]) => {
              const count = resolvedWorkCenter[key].length;
              const urgent = resolvedWorkCenter[key].filter(
                (item) => item.tone === "red" || item.tone === "orange",
              ).length;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`relative min-w-0 rounded-[14px] px-0.5 py-2 text-center transition ${
                    activeTab === key ? "bg-blue-50 text-blue-700" : "text-slate-500"
                  }`}
                >
                  <Icon className="mx-auto h-3.5 w-3.5" />
                  <span className="mt-1 block truncate text-[9.5px] font-medium">{label}</span>
                  <span className="mt-0.5 block text-[9px] font-semibold text-slate-400">
                    {compactMobileCount(count)}
                  </span>
                  {urgent ? (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500">
                      <span className="sr-only">{urgent} requieren atención</span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3">
          {activeTab === "overview" ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[12px] font-medium text-slate-700">Lo más importante ahora</p>
                <span className="text-[11px] font-medium text-slate-400">
                  {overviewItems.length} items
                </span>
              </div>
              {overviewItems.length ? (
                <>
                  {visibleOverviewItems.map((item) => (
                    <MobileWorkItemRow
                      key={`${item.type}-${item.id || item.title}-${item.subtitle}`}
                      item={item}
                      onWorkItemOpen={onWorkItemOpen}
                    />
                  ))}
                  {hiddenOverviewCount ? (
                    <button
                      type="button"
                      onClick={() => openFullscreen("overview")}
                      className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-[12px] font-medium text-blue-700"
                    >
                      Ver {hiddenOverviewCount} más
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="py-6 text-center text-[13px] font-medium text-slate-500">
                  No hay prioridades pendientes.
                </p>
              )}
            </>
          ) : activeItems.length ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => openFullscreen(activeTab)}
                  className="text-[12px] font-medium text-slate-700"
                >
                  Expandir
                </button>
                <span className="text-[11px] font-medium text-slate-400">
                  {activeItems.length} items
                </span>
              </div>
              {visibleActiveItems.map((item) => (
                <MobileWorkItemRow
                  key={`${item.type}-${item.id || item.title}-${item.subtitle}`}
                  item={item}
                  onWorkItemOpen={onWorkItemOpen}
                />
              ))}
              {hiddenActiveCount ? (
                <button
                  type="button"
                  onClick={() => openFullscreen(activeTab)}
                  className="mt-2 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-[12px] font-medium text-blue-700"
                >
                  Ver {hiddenActiveCount} más
                </button>
              ) : null}
            </>
          ) : (
            <p className="py-6 text-center text-[13px] font-medium text-slate-500">
              No hay elementos en {activeTabConfig?.[1] || "esta vista"}.
            </p>
          )}
        </div>
      </MobileCard>

      <MobileWorkCenterFullscreen
        open={fullscreenOpen}
        activeTab={activeTab}
        resolvedWorkCenter={resolvedWorkCenter}
        overviewItems={overviewItems}
        totalItems={totalItems}
        attentionCount={attentionCount}
        onClose={() => setFullscreenOpen(false)}
        onTabChange={setActiveTab}
        onWorkItemOpen={onWorkItemOpen}
      />
    </>
  );
}

function MobileFinanceWidget({
  collectionRows,
  pipeline,
  collectionPeriodLabel,
  pipelinePeriodLabel,
}: {
  collectionRows: CollectionRow[];
  pipeline: PipelineRow[];
  collectionPeriodLabel?: string;
  pipelinePeriodLabel?: string;
}) {
  const visibleCollections = collectionRows.slice(0, 3);
  const visiblePipeline = pipeline.slice(0, 3);
  const primary = collectionRows[0];
  const overdue = collectionRows.find(([label]) => label.toLowerCase().includes("vencido"));
  const paid = collectionRows.find(([label]) => label.toLowerCase().includes("cobrado"));
  const mainValue = primary?.[1] || "$0";
  const mainPercent = percentValue(primary?.[2]);
  const overdueValue = overdue?.[1] || "$0";
  const paidValue = paid?.[1] || "$0";
  const collectionLabel = staticLabel(collectionPeriodLabel, "Cobros");
  const pipelineLabel = staticLabel(pipelinePeriodLabel, "Ventas");

  return (
    <MobileCard className="overflow-hidden p-0">
      <div className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-semibold tracking-normal">Finanzas</h2>
            <p className="mt-1 truncate text-[12px] font-medium text-slate-500">
              {collectionLabel} · {pipelineLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goTo("/invoices")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"
            aria-label="Abrir facturas"
          >
            <DollarSign className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => goTo("/invoices")}
          className="grid rounded-lg border border-blue-100 bg-white p-4 text-left"
        >
          <span className="text-[12px] font-medium text-blue-700">Por cobrar</span>
          <strong className="mt-2 block truncate text-[32px] font-semibold leading-none tracking-normal text-slate-950">
            {mainValue}
          </strong>
          <span className="mt-3 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
            <span>{mainPercent}% del flujo financiero</span>
            <span className="text-blue-700">Ver facturas</span>
          </span>
        </button>

        <div className="grid gap-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-[#edf1f7]">
            {visibleCollections.map(([label, , percent, tone]) => (
              <span
                key={label}
                className={`h-full ${progressColor(tone)}`}
                style={{ width: `${percentValue(percent)}%` }}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {visibleCollections.map(([label, value, percent, tone]) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  goTo(label.toLowerCase().includes("cobrado") ? "/payments" : "/invoices")
                }
                className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-left"
              >
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${progressColor(tone)}`} />
                  <span className="min-w-0 truncate text-[10.5px] font-medium text-slate-500">
                    {label}
                  </span>
                </span>
                <strong className="mt-1 block truncate text-[12px] font-semibold text-slate-950">
                  {value}
                </strong>
                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                  {percent}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 border-t border-blue-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium text-slate-700">Pipeline activo</span>
            <button
              type="button"
              onClick={() => goTo("/pipeline")}
              className="text-[12px] font-medium text-blue-700"
            >
              Ver pipeline
            </button>
          </div>

          {visiblePipeline.length ? (
            visiblePipeline.map(([label, count, value, percent, color]) => (
              <button
                key={label}
                type="button"
                onClick={() => goTo("/pipeline")}
                className="grid grid-cols-[minmax(0,72px)_minmax(0,1fr)_auto] items-center gap-2 text-left"
              >
                <span className="truncate text-[11px] font-medium text-slate-600">{label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[#edf1f7]">
                  <span className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
                </span>
                <span className="text-right">
                  <strong className="block text-[11px] font-semibold text-slate-950">
                    {value}
                  </strong>
                  <span className="block text-[9.5px] font-medium text-slate-400">{count} ops</span>
                </span>
              </button>
            ))
          ) : (
            <p className="py-2 text-center text-[12px] font-medium text-slate-500">
              No hay oportunidades en pipeline.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => goTo("/invoices")}
            className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-[12px] font-medium text-rose-700"
          >
            Vencido {overdueValue}
          </button>
          <button
            type="button"
            onClick={() => goTo("/payments")}
            className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-[12px] font-medium text-emerald-700"
          >
            Cobrado {paidValue}
          </button>
        </div>
      </div>
    </MobileCard>
  );
}

export function DashboardMobileView({
  kpis = [],
  actions = [],
  schedule = [],
  collectionRows = [],
  pipeline = [],
  collectionPeriodLabel,
  pipelinePeriodLabel,
  workCenter,
  todayLabel,
  error,
  summarySlides = [],
  userName,
  onWorkItemOpen,
}: DashboardMobileViewProps) {
  const receivableKpi = getKpi(kpis, "facturas") || kpis[0];
  const leadsKpi = getKpi(kpis, "oportunidades") || getKpi(kpis, "lead") || kpis[1];
  const tasksKpi = getKpi(kpis, "tareas") || kpis[2];
  const fallbackHeroPercent = percentFromKpi(receivableKpi);
  const weekDays = buildWeekDays();
  const nextEvents = schedule.slice(0, 2);
  const resolvedSummarySlides =
    summarySlides.length > 0
      ? summarySlides
      : [
          {
            title: "Facturas por cobrar",
            value: receivableKpi?.helper || "$0",
            detail: receivableKpi?.progressLabel || todayLabel || "Hoy",
            href: "/invoices",
            tone: "blue" as const,
            type: "receivable" as const,
            ctaLabel: "Ver facturas",
            chart: { kind: "percent" as const },
            percent: fallbackHeroPercent,
          },
        ];
  const [activeSummaryIndex, setActiveSummaryIndex] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const {
    loading: notificationsLoading,
    markAllRead,
    notifications,
    openNotification,
    unreadCount,
  } = useNotifications();
  const activeSummary =
    resolvedSummarySlides[Math.min(activeSummaryIndex, resolvedSummarySlides.length - 1)] ||
    resolvedSummarySlides[0];
  const activeSummaryPercent = clampPercent(activeSummary?.percent);
  const activeVisualPlacement = summaryVisualPlacement(activeSummary);
  const showInlinePreview = shouldShowInlinePreview(activeSummary);
  const [animatedSummaryPercent, setAnimatedSummaryPercent] = useState(0);

  useEffect(() => {
    setActiveSummaryIndex((index) => Math.min(index, resolvedSummarySlides.length - 1));
  }, [resolvedSummarySlides.length]);

  useEffect(() => {
    if (resolvedSummarySlides.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {
      setActiveSummaryIndex((index) => (index + 1) % resolvedSummarySlides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [resolvedSummarySlides.length]);

  useEffect(() => {
    let frameId = 0;
    const duration = 850;
    const start = performance.now();

    setAnimatedSummaryPercent(0);

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedSummaryPercent(Math.round(activeSummaryPercent * eased));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSummaryIndex, activeSummaryPercent]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white px-4 pb-8 pt-4 text-slate-950">
      <style>{`
        @keyframes dashboardMobileSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes dashboardMobileRingIn {
          from { opacity: 0; transform: scale(.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div className="mx-auto grid max-w-[430px] gap-4">
        <header className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-blue-100 pb-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-slate-500">Buenos dias</p>
            <h1 className="truncate text-[22px] font-semibold tracking-normal">
              {userName || "Corevix CRM"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => goTo("/calendar")}
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-900"
            aria-label="Abrir calendario"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-900"
            aria-label="Abrir notificaciones"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {Math.min(unreadCount, 9)}
              </span>
            ) : null}
          </button>
        </header>

        <MobileNotificationCenter
          loading={notificationsLoading}
          notifications={notifications}
          open={notificationsOpen}
          unreadCount={unreadCount}
          onClose={() => setNotificationsOpen(false)}
          onMarkAllRead={markAllRead}
          onOpenNotification={openNotification}
        />

        {error ? (
          <MobileCard className="border-orange-100 bg-orange-50 text-[13px] font-medium text-orange-700">
            {error}
          </MobileCard>
        ) : null}

        <div
          role="button"
          onClick={() => goTo(activeSummary.href)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") goTo(activeSummary.href);
          }}
          className={`grid min-h-[178px] gap-3 rounded-[28px] border bg-gradient-to-br ${mobileGradient(activeSummary.tone)} ${mobileSummaryFrame(activeSummary.tone)} p-4 text-left text-slate-950`}
        >
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <Receipt
              className={`h-4 w-4 ${activeSummary.tone === "green" ? "text-emerald-600" : "text-[#1d62f9]"}`}
            />
            Resumen de hoy
          </span>

          <span
            className={`grid gap-3 ${
              activeVisualPlacement === "side"
                ? "grid-cols-[minmax(0,1fr)_minmax(108px,40%)] items-center"
                : "grid-cols-1"
            }`}
          >
            <span
              key={`summary-copy-${activeSummary.title}`}
              className="min-w-0"
              style={{ animation: "dashboardMobileSlideIn 420ms ease both" }}
            >
              <span className="block truncate text-[16px] font-medium">{activeSummary.title}</span>
              <strong className="mt-2 block truncate text-[40px] font-semibold leading-none tracking-normal">
                {activeSummary.value}
              </strong>
              <span className="mt-2 block truncate text-[13px] font-medium text-slate-600">
                {activeSummary.detail}
              </span>
              {showInlinePreview ? <SummaryPreview slide={activeSummary} /> : null}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goTo(activeSummary.href);
                }}
                className={`mt-4 inline-flex h-9 items-center justify-center rounded-full px-4 text-[12px] font-medium shadow-none transition ${mobileSummaryButton(activeSummary.tone)}`}
              >
                {activeSummary.ctaLabel}
              </button>
            </span>
            {activeVisualPlacement === "side" ? (
              <SummaryVisual slide={activeSummary} animatedPercent={animatedSummaryPercent} />
            ) : null}
          </span>

          {activeVisualPlacement === "full" ? (
            <SummaryVisual slide={activeSummary} animatedPercent={animatedSummaryPercent} />
          ) : null}

          <span className="-mt-1 flex justify-end">
            {resolvedSummarySlides.length > 1 ? (
              <span className="flex items-center gap-1.5">
                {resolvedSummarySlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveSummaryIndex(index);
                    }}
                    aria-label={`Ver ${slide.title}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeSummaryIndex ? "w-6 bg-[#1d62f9]" : "w-1.5 bg-[#dbe3ef]"
                    }`}
                  />
                ))}
              </span>
            ) : null}
          </span>
        </div>

        <section className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2">
          {leadsKpi ? <MobileMetricCard item={leadsKpi} /> : null}
          {tasksKpi ? <MobileMetricCard item={tasksKpi} /> : null}
        </section>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-semibold tracking-normal">Hoy</h2>
              <p className="mt-1 text-[12px] font-medium text-slate-500">{todayLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => goTo("/calendar")}
              className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"
              aria-label="Ver calendario"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map((day) => (
              <div
                key={day.key}
                className={`grid min-h-[62px] place-items-center rounded-full px-1 py-2 text-center ${
                  day.active
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "bg-white text-slate-500 ring-1 ring-slate-200"
                }`}
              >
                <span className="text-[12px] font-medium capitalize">{day.day}</span>
                <strong className="text-[17px] font-semibold">{day.number}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {nextEvents.length ? (
              nextEvents.map(([when, title, subtitle, tone]) => (
                <button
                  key={`${when}-${title}`}
                  type="button"
                  onClick={() => goTo("/calendar")}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-[#edf1f7] px-1 py-3 text-left first:border-t-0"
                >
                  <Clock3 className="h-4 w-4 text-slate-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-slate-900">
                      {title}
                    </span>
                    <span className="block truncate text-[12px] font-medium text-slate-500">
                      {subtitle}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${toneClasses(tone as MobileTone)}`}
                  >
                    {when}
                  </span>
                </button>
              ))
            ) : (
              <p className="border-t border-[#edf1f7] px-3 py-4 text-center text-[13px] font-medium text-slate-500">
                No hay eventos pendientes para mostrar.
              </p>
            )}
          </div>
        </MobileCard>

        <MobileWorkCenter
          workCenter={workCenter}
          actions={actions}
          onWorkItemOpen={onWorkItemOpen}
        />

        <MobileFinanceWidget
          collectionRows={collectionRows}
          pipeline={pipeline}
          collectionPeriodLabel={collectionPeriodLabel}
          pipelinePeriodLabel={pipelinePeriodLabel}
        />
      </div>
    </main>
  );
}
