import { useMemo, useState } from "react";
import { FileSignature, Receipt, ReceiptText, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  displayStatus,
  formatDate,
  formatMoney,
  type ProjectSalesDocument,
  type ProjectSalesDocumentType,
} from "@/components/projects/project-sales-utils";
import { cn } from "@/lib/utils";

const FILTERS: Array<{ value: ProjectSalesDocumentType; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "invoice", label: "Facturas" },
  { value: "payment", label: "Pagos" },
  { value: "proposal", label: "Propuestas" },
  { value: "contract", label: "Contratos" },
  { value: "expense", label: "Gastos" },
];

const TYPE_LABELS: Record<ProjectSalesDocument["type"], string> = {
  contract: "Contrato",
  proposal: "Propuesta",
  invoice: "Factura",
  payment: "Pago",
  expense: "Gasto",
};

export function ProjectSalesDocuments({
  documents,
  currency,
  onOpenDocument,
}: {
  documents: ProjectSalesDocument[];
  currency?: string;
  onOpenDocument: (document: ProjectSalesDocument) => void;
}) {
  const [filter, setFilter] = useState<ProjectSalesDocumentType>("all");
  const visibleDocuments = useMemo(() => {
    if (filter === "all") return documents;
    return documents.filter((document) => document.type === filter);
  }, [documents, filter]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-extrabold text-slate-950">Documentos relacionados</h4>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Propuestas, contratos, facturas, pagos y gastos vinculados por relaciones confiables.
          </p>
        </div>
        <div className="md:hidden">
          <Select value={filter} onValueChange={(value) => setFilter(value as ProjectSalesDocumentType)}>
            <SelectTrigger className="h-9 w-full rounded-full border-slate-200 text-xs font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden rounded-full border border-slate-200 bg-slate-50 p-1 md:inline-flex">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 transition",
                filter === item.value && "bg-white text-slate-950 shadow-sm",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visibleDocuments.length ? (
        <>
          <div className="hidden divide-y divide-slate-100 md:block">
            {visibleDocuments.map((document) => (
              <button
                key={`${document.type}-${document.id}`}
                type="button"
                onClick={() => onOpenDocument(document)}
                className="grid w-full grid-cols-[minmax(0,1.4fr)_120px_130px_110px] items-center gap-3 px-2 py-3 text-left transition hover:bg-slate-50"
              >
                <DocumentTitle document={document} />
                <span className="text-sm font-bold text-slate-800">
                  {formatMoney(document.amount, currency)}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    document.isOverdue ? "text-rose-700" : "text-slate-500",
                  )}
                >
                  {displayStatus(document.status)}
                </span>
                <span className="text-right text-xs font-semibold text-slate-500">
                  {formatDate(document.date)}
                </span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 md:hidden">
            {visibleDocuments.map((document) => (
              <button
                key={`${document.type}-${document.id}`}
                type="button"
                onClick={() => onOpenDocument(document)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left"
              >
                <DocumentTitle document={document} />
                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="text-slate-900">{formatMoney(document.amount, currency)}</span>
                  <span className={document.isOverdue ? "text-rose-700" : "text-slate-500"}>
                    {displayStatus(document.status)}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-400">
                  {formatDate(document.date)}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
          No hay documentos para este filtro.
        </div>
      )}
    </section>
  );
}

function DocumentTitle({ document }: { document: ProjectSalesDocument }) {
  const Icon = getDocumentIcon(document.type);
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            {TYPE_LABELS[document.type]}
          </span>
          {document.isOverdue ? (
            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
              Vencido
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm font-extrabold text-slate-950">{document.title}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{document.subtitle}</p>
      </div>
    </div>
  );
}

function getDocumentIcon(type: ProjectSalesDocument["type"]) {
  if (type === "contract") return FileSignature;
  if (type === "proposal") return ReceiptText;
  if (type === "payment") return WalletCards;
  if (type === "expense") return Receipt;
  return ReceiptText;
}
