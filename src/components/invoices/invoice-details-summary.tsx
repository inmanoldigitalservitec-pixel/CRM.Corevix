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
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </div>
      <div className={mono ? "mt-1 break-words font-mono text-sm" : "mt-1 break-words text-sm font-medium"}>
        {value}
      </div>
    </div>
  );
}

export function InvoiceDetailsSummary({
  invoice,
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
  publicUrl,
  formatMoney,
}: {
  invoice: { status: string };
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
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Estado
            </div>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Total
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-950">{total}</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Saldo: {balance}</div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <DetailField key={field.label} {...field} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-950">Artículos</h3>
        <InvoiceItemsView
          items={items}
          loading={itemsLoading}
          error={itemsError}
          currency={currency}
          formatMoney={formatMoney}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Totales
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="font-semibold">{subtotal}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Impuesto</dt>
              <dd className="font-semibold">{tax}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Descuento</dt>
              <dd className="font-semibold">{discount}</dd>
            </div>
          </dl>
        </div>
      </section>

      {notes || publicUrl ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          {notes ? <DetailField label="Notas" value={notes} /> : null}
          {publicUrl ? <DetailField label="Factura pública" value={publicUrl} mono /> : null}
        </section>
      ) : null}
    </div>
  );
}
