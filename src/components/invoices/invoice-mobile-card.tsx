import type { ReactNode } from "react";
import { CalendarDays, CreditCard, ExternalLink, Eye } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export function InvoiceMobileCard({
  number,
  client,
  service,
  proposal,
  status,
  total,
  dueLabel,
  collectionLabel,
  actionMenu,
  onOpen,
  onOpenProject,
}: {
  number: string;
  client: string;
  service: string;
  proposal: string;
  status: string;
  total: string;
  dueLabel: string;
  collectionLabel: string;
  actionMenu: ReactNode;
  onOpen: () => void;
  onOpenProject?: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="min-w-0 max-w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-950">{number}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{client}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
            {service}
            {proposal !== "—" ? ` · ${proposal}` : ""}
          </p>
        </div>
        <div
          className="shrink-0"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {actionMenu}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusBadge status={status} />
        <span className="max-w-[56%] shrink-0 truncate text-right text-base font-extrabold text-slate-950">
          {total}
        </span>
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-4 border-t border-slate-100 pt-2.5 text-xs font-semibold text-slate-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{dueLabel}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{collectionLabel}</span>
        </span>
      </div>

      <div
        className="mt-3 flex items-center gap-2"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-2 rounded-full border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
          onClick={onOpen}
        >
          <Eye className="h-4 w-4" />
          Ver
        </Button>
        {onOpenProject ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-11 rounded-full border-slate-200 bg-white text-slate-700 shadow-none hover:border-slate-300 hover:bg-slate-50"
            aria-label="Ir al proyecto"
            onClick={onOpenProject}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}
