import type { DashboardKpi, DashboardTone } from "./types";
import { cn } from "@/lib/utils";

const helperClasses: Record<DashboardTone, string> = {
  blue: "text-blue-600",
  green: "text-emerald-600",
  orange: "text-orange-600",
  red: "text-rose-600",
  purple: "text-violet-600",
  teal: "text-teal-600",
  neutral: "text-slate-500",
};

const progressClasses: Record<DashboardTone, string> = {
  blue: "bg-blue-600",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  red: "bg-rose-500",
  purple: "bg-violet-500",
  teal: "bg-teal-500",
  neutral: "bg-slate-500",
};

export function DashboardKpiCard({ item }: { item: DashboardKpi }) {
  const progressTotal = Math.max(Number(item.progressTotal) || 0, 0);
  const progressCurrent = Math.max(Number(item.progressCurrent) || 0, 0);
  const progressPercent = progressTotal
    ? Math.min(100, Math.round((progressCurrent / progressTotal) * 100))
    : item.value === "0"
      ? 0
      : 100;

  return (
    <article className="grid h-[86px] min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="flex min-w-0 items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
          {item.label}
        </p>
        <strong className="shrink-0 whitespace-nowrap text-[18px] font-semibold leading-none tracking-normal text-slate-800">
          {item.value}
        </strong>
      </div>

      <div className="self-center">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <span
            className={cn("block h-full rounded-full", progressClasses[item.tone])}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <small className={cn("min-w-0 truncate text-[11px] font-medium", helperClasses[item.tone])}>
          {item.progressLabel || item.helper}
        </small>
        {item.progressLabel ? (
          <small className="shrink-0 truncate text-[10.5px] font-normal text-slate-400">
            {item.helper}
          </small>
        ) : null}
      </div>
    </article>
  );
}
