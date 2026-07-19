import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SelectTrigger } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DetailActionTone = "default" | "success" | "danger";

const lineButtonTone: Record<DetailActionTone, string> = {
  default: "text-slate-950 hover:text-slate-950",
  success: "text-emerald-700 hover:text-emerald-800",
  danger: "text-rose-700 hover:text-rose-700",
};

export const CrmDetailLineButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & {
    icon?: ReactNode;
    tone?: DetailActionTone;
  }
>(({ children, icon, className, tone = "default", ...props }, ref) => (
  <Button
    ref={ref}
    variant="outline"
    size="sm"
    className={cn(
      "h-9 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-xs font-normal shadow-none hover:bg-white",
      lineButtonTone[tone],
      className,
    )}
    {...props}
  >
    {icon ? <span className="mr-2 inline-flex h-4 w-4 items-center">{icon}</span> : null}
    {children}
  </Button>
));

CrmDetailLineButton.displayName = "CrmDetailLineButton";

export function CrmDetailActionGrid({
  actions,
  columns = 2,
  className,
}: {
  actions: Array<{
    key: string;
    label: ReactNode;
    icon?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    tone?: DetailActionTone;
  }>;
  columns?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        columns === 3 ? "grid-cols-3" : "grid-cols-2",
        "grid gap-x-4 gap-y-1",
        className,
      )}
    >
      {actions.map((action) => (
        <CrmDetailLineButton
          key={action.key}
          className="justify-center gap-1.5"
          tone={action.tone}
          icon={action.icon}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.title}
        >
          {action.label}
        </CrmDetailLineButton>
      ))}
    </div>
  );
}

export function CrmDetailSummaryGrid({
  items,
  columns = 4,
  className,
}: {
  items: Array<{
    key: string;
    label: ReactNode;
    value: ReactNode;
  }>;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-3" : "grid-cols-4",
        "grid gap-x-4 gap-y-3 text-sm",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0">
          <div className="text-[10px] font-normal uppercase tracking-wide text-slate-500">
            {item.label}
          </div>
          <div className="mt-1 truncate font-normal text-slate-950">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CrmDetailSelectTrigger({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      className={cn(
        "h-9 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0",
        className,
      )}
      {...props}
    >
      {children}
    </SelectTrigger>
  );
}
