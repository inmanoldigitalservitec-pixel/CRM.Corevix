import { cn } from "@/lib/utils";

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  open: { label: "Abierto", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40" },
  pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/15 dark:text-amber-300 dark:border-amber-800/40" },
  resolved: { label: "Resuelto", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/15 dark:text-blue-300 dark:border-blue-800/40" },
  archived: { label: "Archivado", className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/25 dark:text-slate-200 dark:border-slate-800/50" },
};

export function WhatsappStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const key = String(status ?? "").toLowerCase();
  const meta = STATUS_META[key] ?? { label: status || "—", className: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/25 dark:text-slate-200 dark:border-slate-800/50" };
  return (
    <span
      className={cn(
        "h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
