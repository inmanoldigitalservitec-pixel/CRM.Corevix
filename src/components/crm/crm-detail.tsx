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
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon ? (
            <span className="grid h-6 w-6 place-items-center rounded-[9px] border bg-background/70 text-muted-foreground">
              {icon}
            </span>
          ) : null}
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="rounded-[14px] border bg-background p-4 shadow-[0_10px_26px_rgba(15,23,42,.04)]">
        {children}
      </div>
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
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="min-w-0 text-right text-[13px] font-medium text-foreground">{value}</div>
    </div>
  );
}

export function CrmDetailEmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground">{children}</div>;
}
