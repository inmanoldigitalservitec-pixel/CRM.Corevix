import { AlertTriangle, Clock3, FileSignature, ReceiptText, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  displayStatus,
  formatHours,
  formatMoney,
  type ProjectSalesSummary,
} from "@/components/projects/project-sales-utils";
import { cn } from "@/lib/utils";

export function ProjectSalesSummaryView({ summary }: { summary: ProjectSalesSummary }) {
  const currency = summary.contextualCurrency;
  const collectionPct = summary.invoicedTotal
    ? Math.min(100, Math.round((summary.collectedTotal / summary.invoicedTotal) * 100))
    : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Cobrado</p>
            <h4 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-slate-950">
              {formatMoney(summary.collectedTotal, currency)}
            </h4>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              de {formatMoney(summary.invoicedTotal, currency)} facturados
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Progreso de cobro</span>
            <span>{collectionPct}%</span>
          </div>
          <Progress value={collectionPct} className="h-2" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryLine
            label="Pendiente"
            value={formatMoney(summary.pendingCollectionTotal, currency)}
          />
          <SummaryLine
            label="Gastos"
            value={formatMoney(summary.confirmedExpensesTotal, currency)}
          />
          <SummaryLine
            label="Balance registrado"
            value={formatMoney(summary.registeredBalance, currency)}
            strong
          />
        </div>
        {summary.hasMultipleCurrencies ? (
          <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Hay documentos en más de una moneda; los totales no incluyen conversión.
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-slate-400" />
          <h4 className="text-sm font-extrabold text-slate-950">Acuerdos</h4>
        </div>
        <div className="space-y-3">
          <SummaryLine
            label="Valor contratado"
            value={formatMoney(summary.contractedTotal, currency)}
          />
          <SummaryLine label="Propuesto" value={formatMoney(summary.proposedTotal, currency)} />
          <SummaryLine label="Propuestas relacionadas" value={String(summary.proposalCount)} />
          <SummaryLine label="Contratos activos" value={String(summary.activeContractCount)} />
          <SummaryLine
            label="Última propuesta"
            value={summary.latestProposal ? displayStatus(summary.latestProposal.status) : "—"}
          />
          <SummaryLine
            label="Firma"
            value={
              summary.latestSignatureStatus ? displayStatus(summary.latestSignatureStatus) : "—"
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-slate-400" />
          <h4 className="text-sm font-extrabold text-slate-950">Costos y tiempo</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryLine
            label="Gastos confirmados"
            value={formatMoney(summary.confirmedExpensesTotal, currency)}
          />
          <SummaryLine
            label="Gastos pendientes"
            value={formatMoney(summary.pendingExpensesTotal, currency)}
          />
          <SummaryLine label="Horas totales" value={formatHours(summary.totalMinutes)} />
          <SummaryLine label="Horas facturables" value={formatHours(summary.billableMinutes)} />
          <SummaryLine
            label="Horas no facturables"
            value={formatHours(summary.nonBillableMinutes)}
          />
          <SummaryLine label="Registros de tiempo" value={String(summary.timeEntryCount)} />
          <SummaryLine
            label="Facturas vencidas"
            value={String(summary.overdueInvoiceCount)}
            danger={summary.overdueInvoiceCount > 0}
          />
          <SummaryLine label="Facturas" value={formatMoney(summary.invoicedTotal, currency)} />
        </div>
      </section>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-extrabold text-slate-800",
          strong && "text-slate-950",
          danger && "text-rose-700",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
