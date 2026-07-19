import { InvoiceItemsView, type InvoiceDetailItem } from "@/components/invoices/invoice-items-view";

type PartyField = {
  label: string;
  value?: string | null;
};

function PartyBlock({ title, fields }: { title: string; fields: PartyField[] }) {
  const visible = fields.filter((field) => field.value);
  return (
    <div className="min-w-0 border-b border-slate-100 bg-white pb-4">
      <h3 className="text-sm font-normal text-slate-950">{title}</h3>
      {visible.length ? (
        <dl className="mt-3 space-y-2 text-sm">
          {visible.map((field) => (
            <div key={field.label}>
              <dt className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                {field.label}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words font-normal text-slate-800">
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
    <div className="min-w-0 space-y-5 overflow-hidden">
      <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Factura
            </div>
            <h2 className="mt-1 break-words text-2xl font-normal text-slate-950">
              {invoice.number}
            </h2>
          </div>
          <dl className="grid min-w-0 gap-2 text-sm sm:text-right">
            {invoice.date_issued ? (
              <div>
                <dt className="text-slate-500">Emitida</dt>
                <dd className="font-normal">{invoice.date_issued}</dd>
              </div>
            ) : null}
            {invoice.due_date ? (
              <div>
                <dt className="text-slate-500">Vence</dt>
                <dd className="font-normal">{invoice.due_date}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <PartyBlock title="Emisor" fields={issuerFields} />
        <PartyBlock title="Cliente" fields={clientFields} />
      </div>

      <section className="space-y-3 border-b border-slate-100 pb-5">
        <h3 className="text-sm font-normal text-slate-950">Detalle facturado</h3>
        <InvoiceItemsView
          items={items}
          loading={itemsLoading}
          error={itemsError}
          currency={currency}
          formatMoney={formatMoney}
        />
      </section>

      <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
        <dl className="ml-auto max-w-sm space-y-2 text-sm">
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
          <div className="border-t border-slate-200 pt-3">
            <div className="flex min-w-0 justify-between gap-4 text-base">
              <dt className="font-normal text-slate-950">Total</dt>
              <dd className="min-w-0 break-words text-right font-normal text-slate-950">{total}</dd>
            </div>
          </div>
        </dl>
      </section>

      {notes ? (
        <section className="min-w-0 border-b border-slate-100 bg-white pb-5">
          <h3 className="text-sm font-normal text-slate-950">Notas</h3>
          <div className="mt-3 space-y-3 text-sm">
            <p className="whitespace-pre-wrap font-normal">{notes}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
