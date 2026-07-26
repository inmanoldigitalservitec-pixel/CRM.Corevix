import { StatusBadge } from "@/components/ui/status-badge";
import { InvoiceItemsView, type InvoiceDetailItem } from "@/components/invoices/invoice-items-view";

type SummaryField = {
  label: string;
  value?: string | null;
  mono?: boolean;
};

function DetailField({ label, value, mono }: SummaryField) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={
          mono
            ? "mt-1 min-w-0 break-all font-mono text-sm font-normal text-slate-950"
            : "mt-1 min-w-0 break-words text-sm font-normal text-slate-950"
        }
      >
        {value}
      </div>
    </div>
  );
}

export function InvoiceDetailsSummary({
  invoice,
  financialStatus,
  fields,
  items,
  itemsLoading,
  itemsError,
  currency,
  total,
  balance,
  subtotal,
  tax,
  discount,
  notes,
  formatMoney,
}: {
  invoice: { status: string };
  financialStatus: string;
  fields: SummaryField[];
  items: InvoiceDetailItem[];
  itemsLoading: boolean;
  itemsError: string | null;
  currency: string;
  total: string;
  balance: string;
  subtotal: string;
  tax: string;
  discount: string;
  notes?: string | null;
  publicUrl?: string | null;
  formatMoney: (amount: number, currency: string) => string;
}) {
  return (
    <div className="min-w-0 space-y-5 overflow-hidden">
      <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Estado
            </div>
            <div className="mt-2">
              <StatusBadge status={financialStatus} />
            </div>
          </div>
          <div className="min-w-0 sm:text-right">
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="mt-1 break-words text-2xl font-normal leading-tight text-slate-950">
              {total}
            </div>
            <div className="mt-1 break-words text-sm font-normal text-slate-500">
              Saldo pendiente: {balance}
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <DetailField key={field.label} {...field} />
          ))}
        </div>
      </section>

      <section className="space-y-3 border-b border-slate-100 pb-5">
        <h3 className="text-sm font-normal text-slate-950">Artículos</h3>
        <InvoiceItemsView
          items={items}
          loading={itemsLoading}
          error={itemsError}
          currency={currency}
          formatMoney={formatMoney}
        />
      </section>

      <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
        <div>
          <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
            Totales
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex min-w-0 justify-between gap-4">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="min-w-0 break-words text-right font-normal">{subtotal}</dd>
            </div>
            <div className="flex min-w-0 justify-between gap-4">
              <dt className="text-slate-500">Impuesto</dt>
              <dd className="min-w-0 break-words text-right font-normal">{tax}</dd>
            </div>
            <div className="flex min-w-0 justify-between gap-4">
              <dt className="text-slate-500">Descuento</dt>
              <dd className="min-w-0 break-words text-right font-normal">{discount}</dd>
            </div>
          </dl>
        </div>
      </section>

      {notes ? (
        <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
          <DetailField label="Notas" value={notes} />
        </section>
      ) : null}
    </div>
  );
}
