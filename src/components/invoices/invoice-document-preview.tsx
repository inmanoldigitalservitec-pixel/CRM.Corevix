import { InvoiceItemsView, type InvoiceDetailItem } from "@/components/invoices/invoice-items-view";

type PartyField = {
  label: string;
  value?: string | null;
};

function PartyBlock({ title, fields, compact = false }: { title: string; fields: PartyField[]; compact?: boolean }) {
  const visible = fields.filter((field) => field.value);
  return (
    <div className={`min-w-0 border-b border-slate-100 bg-white ${compact ? "pb-2" : "pb-4"}`}>
      <h3 className={compact ? "text-xs font-normal text-slate-950" : "text-sm font-normal text-slate-950"}>{title}</h3>
      {visible.length ? (
        <dl className={compact ? "mt-2 space-y-1 text-[10px] leading-tight" : "mt-3 space-y-2 text-sm"}>
          {visible.map((field) => (
            <div key={field.label} className={compact ? "flex min-w-0 items-baseline gap-1" : undefined}>
              <dt className={compact ? "shrink-0 text-[8px] font-normal uppercase tracking-wide text-slate-500" : "text-[11px] font-normal uppercase tracking-wide text-slate-500"}>
                {field.label}
              </dt>
              <dd className={`min-w-0 whitespace-pre-wrap break-words font-normal text-slate-800 ${compact ? "text-[9px]" : "mt-0.5"}`}>
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
  compact = false,
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
  compact?: boolean;
}) {
  return (
    <div className={`min-w-0 overflow-hidden ${compact ? "space-y-3 text-xs" : "space-y-5"}`}>
      <section className={`min-w-0 border-b border-slate-100 bg-white ${compact ? "pb-3" : "pb-5"}`}>
        <div className={`grid min-w-0 ${compact ? "grid-cols-[minmax(0,1fr)_auto] gap-2" : "gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"}`}>
          <div className="min-w-0">
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Factura
            </div>
            <h2 className={`mt-1 break-words font-normal text-slate-950 ${compact ? "text-lg" : "text-2xl"}`}>
              {invoice.number}
            </h2>
          </div>
          <dl className={`grid min-w-0 gap-1 ${compact ? "grid-cols-2 text-right text-[9px]" : "text-sm sm:text-right"}`}>
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

      <div className={`grid ${compact ? "grid-cols-2 gap-2" : "gap-4 md:grid-cols-2"}`}>
        <PartyBlock title="Emisor" fields={issuerFields} compact={compact} />
        <PartyBlock title="Cliente" fields={clientFields} compact={compact} />
      </div>

      <section className={`border-b border-slate-100 ${compact ? "space-y-1 pb-3" : "space-y-3 pb-5"}`}>
        <h3 className={compact ? "text-xs font-normal text-slate-950" : "text-sm font-normal text-slate-950"}>Detalle facturado</h3>
        <InvoiceItemsView
          items={items}
          loading={itemsLoading}
          error={itemsError}
          currency={currency}
          formatMoney={formatMoney}
          compact={compact}
        />
      </section>

      <section className={`min-w-0 border-b border-slate-100 bg-white ${compact ? "pb-3" : "pb-5"}`}>
        <dl className={`ml-auto max-w-sm ${compact ? "space-y-1 text-[10px]" : "space-y-2 text-sm"}`}>
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
            <div className={`flex min-w-0 justify-between gap-4 ${compact ? "text-xs" : "text-base"}`}>
              <dt className="font-normal text-slate-950">Total</dt>
              <dd className="min-w-0 break-words text-right font-normal text-slate-950">{total}</dd>
            </div>
          </div>
        </dl>
      </section>

      {notes ? (
          <section className={`min-w-0 border-b border-slate-100 bg-white ${compact ? "pb-3" : "pb-5"}`}>
          <h3 className={compact ? "text-xs font-normal text-slate-950" : "text-sm font-normal text-slate-950"}>Notas</h3>
          <div className={`${compact ? "mt-2 text-[10px]" : "mt-3 space-y-3 text-sm"}`}>
            <p className="whitespace-pre-wrap font-normal">{notes}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
