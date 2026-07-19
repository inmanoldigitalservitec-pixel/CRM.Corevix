import { EmptyState } from "@/components/crm/empty-state";

export type InvoiceDetailItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at?: string | null;
};

export function InvoiceItemsView({
  items,
  loading,
  error,
  currency,
  formatMoney,
}: {
  items: InvoiceDetailItem[];
  loading: boolean;
  error: string | null;
  currency: string;
  formatMoney: (amount: number, currency: string) => string;
}) {
  if (loading) {
    return (
      <div className="border-y border-slate-100 bg-white py-3 text-sm font-normal text-slate-500">
        Cargando artículos...
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      {error ? (
        <div className="border-y border-destructive/20 bg-white py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {items.length ? (
        <div className="min-w-0 overflow-hidden border-y border-slate-100">
          <div className="hidden grid-cols-[1fr_90px_120px_120px] gap-3 border-b border-slate-100 bg-white py-2 text-[11px] font-normal uppercase tracking-wide text-slate-500 sm:grid">
            <span>Descripción</span>
            <span className="text-right">Cantidad</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid min-w-0 gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_90px_120px_120px] sm:gap-3"
              >
                <div className="min-w-0 break-words font-normal text-slate-900">
                  {item.description || "Sin descripción"}
                </div>
                <div className="flex min-w-0 justify-between gap-3 sm:block sm:text-right">
                  <span className="text-xs font-normal uppercase text-slate-500 sm:hidden">
                    Cantidad
                  </span>
                  <span className="min-w-0 break-words">
                    {Number(item.quantity || 0).toLocaleString("es-DO")}
                  </span>
                </div>
                <div className="flex min-w-0 justify-between gap-3 sm:block sm:text-right">
                  <span className="text-xs font-normal uppercase text-slate-500 sm:hidden">
                    Precio
                  </span>
                  <span className="min-w-0 break-words">
                    {formatMoney(item.unit_price, currency)}
                  </span>
                </div>
                <div className="flex min-w-0 justify-between gap-3 font-normal sm:block sm:text-right">
                  <span className="text-xs font-normal uppercase text-slate-500 sm:hidden">
                    Total
                  </span>
                  <span className="min-w-0 break-words">{formatMoney(item.total, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? null : (
        <EmptyState
          title="Sin artículos"
          description="Esta factura no tiene artículos registrados."
        />
      )}
    </div>
  );
}
