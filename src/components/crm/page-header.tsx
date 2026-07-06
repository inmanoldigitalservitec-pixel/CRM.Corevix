import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const TASKS_MOBILE_KPI_STYLES = `
@media (max-width: 767px) {
  [data-corevix-page-header="tasks"] + div.grid {
    display: flex !important;
    grid-template-columns: none !important;
    gap: 8px !important;
    margin-right: -16px;
    margin-left: -16px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    padding: 0 16px 2px;
    scrollbar-width: none;
  }

  [data-corevix-page-header="tasks"] + div.grid::-webkit-scrollbar {
    display: none;
  }

  [data-corevix-page-header="tasks"] + div.grid > button {
    min-width: 138px;
    scroll-snap-align: start;
    border-radius: 12px;
    padding: 10px 12px;
  }

  [data-corevix-page-header="tasks"] + div.grid > button > div:first-child {
    gap: 6px;
  }

  [data-corevix-page-header="tasks"] + div.grid > button svg {
    width: 14px;
    height: 14px;
  }

  [data-corevix-page-header="tasks"] + div.grid > button span {
    max-width: 92px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
  }

  [data-corevix-page-header="tasks"] + div.grid > button > div:last-child {
    margin-top: 2px;
    font-size: 17px;
    line-height: 1.1;
  }
}
`;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
  children,
}: PageHeaderProps) {
  const [isTasksRoute, setIsTasksRoute] = useState(false);

  useEffect(() => {
    const syncRoute = () => setIsTasksRoute(window.location.pathname === "/tasks");
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const showAction = Boolean(actionLabel && onAction && !isTasksRoute);

  return (
    <>
      {isTasksRoute ? <style>{TASKS_MOBILE_KPI_STYLES}</style> : null}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        data-corevix-page-header={isTasksRoute ? "tasks" : undefined}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {children}
          {showAction && (
            <Button size="sm" onClick={onAction} className="gap-2">
              {actionIcon || <Plus className="h-4 w-4" />}
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
