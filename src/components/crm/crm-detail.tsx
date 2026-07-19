import { cn } from "@/lib/utils";

export function CrmDetailSection({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-slate-100 pb-4 last:border-b-0", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? (
            <span className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-500">
              {icon}
            </span>
          ) : null}
          <div className="truncate text-[11px] font-normal uppercase tracking-wide text-slate-500">
            {title}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

export function CrmDetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 text-sm", className)}>
      <div className="text-xs font-normal text-slate-500">{label}</div>
      <div className="min-w-0 text-right text-[13px] font-normal text-slate-950">{value}</div>
    </div>
  );
}

export function CrmDetailEmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-normal text-slate-500">{children}</div>;
}
