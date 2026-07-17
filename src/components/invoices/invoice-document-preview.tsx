import { InvoiceItemsView, type InvoiceDetailItem } from "@/components/invoices/invoice-items-view";

type PartyField = {
  label: string;
  value?: string | null;
};

function PartyBlock({ title, fields }: { title: string; fields: PartyField[] }) {
  const visible = fields.filter((field) => field.value);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
      {visible.length ? (
        <dl className="mt-3 space-y-2 text-sm">
          {visible.map((field) => (
            <div key={field.label}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                {field.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium text-slate-800">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No disponible.</p>
      )}
    </div>
  );
}

export function InvoiceDocumentPreview({
  invoice,
  issuerFields,
  clientFields,
  items,
  itemsLoading,
  itemsError,
  currency,
  subtotal,
  tax,
  discount,
  total,
  notes,
  formatMoney,
}: {
  invoice: {
    number: string;
    date_issued?: string | null;
    due_date?: string | null;
  };
  issuerFields: PartyField[];
  clientFields: PartyField[];
  items: InvoiceDetailItem[];
  itemsLoading: boolean;
  itemsError: string | null;
  currency: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  notes?: string | null;
  formatMoney: (amount: number, currency: string) => string;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Factura
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{invoice.number}</h2>
          </div>
          <dl className="grid gap-2 text-right text-sm">
            {invoice.date_issued ? (
              <div>
                <dt className="text-slate-500">Emitida</dt>
                <dd className="font-semibold">{invoice.date_issued}</dd>
              </div>
            ) : null}
            {invoice.due_date ? (
              <div>
                <dt className="text-slate-500">Vence</dt>
                <dd className="font-semibold">{invoice.due_date}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <PartyBlock title="Emisor" fields={issuerFields} />
        <PartyBlock title="Cliente" fields={clientFields} />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-950">Detalle facturado</h3>
        <InvoiceItemsView
          items={items}
          loading={itemsLoading}
          error={itemsError}
          currency={currency}
          formatMoney={formatMoney}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <dl className="ml-auto max-w-sm space-y-2 text-sm">
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
          <div className="border-t border-slate-200 pt-3">
            <div className="flex justify-between gap-4 text-base">
              <dt className="font-bold text-slate-950">Total</dt>
              <dd className="font-extrabold text-slate-950">{total}</dd>
            </div>
          </div>
        </dl>
      </section>

      {notes ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-extrabold text-slate-950">Notas</h3>
          <div className="mt-3 space-y-3 text-sm">
            <p className="whitespace-pre-wrap font-medium">{notes}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
