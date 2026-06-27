import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-slate-200/80 px-4">
          {title ? (
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.035em] text-slate-950">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}

      <div className={cn("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
    </section>
  );
}

export function DashboardTextButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap text-xs font-medium text-blue-600 hover:text-blue-700"
    >
      {children}
    </button>
  );
}
