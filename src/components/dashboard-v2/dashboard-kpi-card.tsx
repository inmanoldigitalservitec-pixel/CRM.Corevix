import type { DashboardKpi, DashboardTone } from "./types";
import { cn } from "@/lib/utils";

const toneClasses: Record<DashboardTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-600",
  green: "border-emerald-200 bg-emerald-50 text-emerald-600",
  orange: "border-orange-200 bg-orange-50 text-orange-600",
  red: "border-rose-200 bg-rose-50 text-rose-600",
  purple: "border-violet-200 bg-violet-50 text-violet-600",
  teal: "border-teal-200 bg-teal-50 text-teal-600",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

const helperClasses: Record<DashboardTone, string> = {
  blue: "text-blue-600",
  green: "text-emerald-600",
  orange: "text-orange-600",
  red: "text-rose-600",
  purple: "text-violet-600",
  teal: "text-teal-600",
  neutral: "text-slate-500",
};

export function DashboardKpiCard({ item }: { item: DashboardKpi }) {
  const Icon = item.icon;

  return (
    <article className="flex h-[74px] min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
          toneClasses[item.tone],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-[11.5px] font-normal text-slate-600">{item.label}</p>
        <strong className="block truncate text-[19px] font-semibold leading-none tracking-[-0.04em] text-slate-950">
          {item.value}
        </strong>
        <small
          className={cn(
            "block truncate pt-0.5 text-[10.5px] font-medium",
            helperClasses[item.tone],
          )}
        >
          {item.helper}
        </small>
      </div>
    </article>
  );
}
