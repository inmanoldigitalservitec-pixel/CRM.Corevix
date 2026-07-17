import { cn } from "@/lib/utils";

type InvoiceMetric = {
  key: string;
  label: string;
  value: string;
  hint: string;
  active?: boolean;
  tone?: "default" | "danger" | "success" | "muted";
};

export function InvoiceSummaryMetrics({
  metrics,
  onSelect,
}: {
  metrics: InvoiceMetric[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <button
          key={metric.key}
          type="button"
          onClick={() => onSelect(metric.key)}
          className={cn(
            "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50",
            metric.active && "border-slate-900 ring-1 ring-slate-900",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                {metric.label}
              </p>
              <p
                className={cn(
                  "mt-1 truncate text-xl font-extrabold text-slate-950",
                  metric.tone === "danger" && "text-rose-700",
                  metric.tone === "success" && "text-emerald-700",
                  metric.tone === "muted" && "text-slate-600",
                )}
                title={metric.value}
              >
                {metric.value}
              </p>
            </div>
          </div>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{metric.hint}</p>
        </button>
      ))}
    </div>
  );
}
