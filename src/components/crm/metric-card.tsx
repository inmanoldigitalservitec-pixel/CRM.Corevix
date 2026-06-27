import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  iconClassName?: string;
  className?: string;
  variant?: "default" | "reference";
  iconChipClassName?: string;
  size?: "default" | "compact";
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  iconClassName = "text-primary",
  className,
  variant = "default",
  iconChipClassName,
  size = "default",
}: MetricCardProps) {
  if (variant === "reference") {
    const compact = size === "compact";
    return (
      <Card
        className={cn(
          "rounded-[22px] border border-[#e6eaf0] bg-white shadow-[0_8px_26px_rgba(15,23,42,0.05)]",
          className,
        )}
      >
        <CardContent className={compact ? "p-3" : "p-4"}>
          <div className="flex items-center justify-between">
            <div
              className={cn(
                compact ? "h-[34px] w-[34px] rounded-[12px]" : "h-[38px] w-[38px] rounded-[14px]",
                "grid place-items-center",
                iconChipClassName,
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", iconClassName)} />
            </div>
            {trend && <span className="text-[11px] font-extrabold text-emerald-600">{trend}</span>}
          </div>
          <div
            className={cn(
              compact ? "mt-2 text-[18px]" : "mt-2 text-[20px]",
              "font-extrabold tracking-[-0.04em] text-[#111827]",
            )}
          >
            {value}
          </div>
          <div
            className={cn(
              compact ? "mt-0.5 text-[11px]" : "mt-1 text-[12px]",
              "font-bold leading-tight text-[#667085]",
            )}
          >
            {label}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/40 shadow-sm bg-card", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-4 w-4 ${iconClassName}`} />
          {trend && <span className="text-[10px] text-muted-foreground">{trend}</span>}
        </div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}
