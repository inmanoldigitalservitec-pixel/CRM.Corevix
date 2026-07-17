import type { ReactNode } from "react";
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
  actionLabel,
  actionMenu,
  onOpen,
  onPrimaryAction,
}: {
  number: string;
  client: string;
  service: string;
  proposal: string;
  status: string;
  total: string;
  dueLabel: string;
  collectionLabel: string;
  actionLabel: string;
  actionMenu: ReactNode;
  onOpen: () => void;
  onPrimaryAction: () => void;
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
      className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
        <span className="text-base font-extrabold text-slate-950">{total}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Vencimiento
          </span>
          <span className="mt-0.5 block truncate">{dueLabel}</span>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Cobro
          </span>
          <span className="mt-0.5 block truncate">{collectionLabel}</span>
        </div>
      </div>

      <div
        className="mt-3"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <Button type="button" size="sm" className="h-9 w-full" onClick={onPrimaryAction}>
          {actionLabel}
        </Button>
      </div>
    </article>
  );
}
