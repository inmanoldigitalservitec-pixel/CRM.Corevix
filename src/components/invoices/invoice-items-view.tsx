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
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
        Cargando artículos...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {items.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="hidden grid-cols-[1fr_90px_120px_120px] gap-3 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 sm:grid">
            <span>Descripción</span>
            <span className="text-right">Cantidad</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_90px_120px_120px] sm:gap-3"
              >
                <div className="font-medium text-slate-900">{item.description || "Sin descripción"}</div>
                <div className="flex justify-between gap-3 sm:block sm:text-right">
                  <span className="text-xs font-bold uppercase text-slate-400 sm:hidden">Cantidad</span>
                  <span>{Number(item.quantity || 0).toLocaleString("es-DO")}</span>
                </div>
                <div className="flex justify-between gap-3 sm:block sm:text-right">
                  <span className="text-xs font-bold uppercase text-slate-400 sm:hidden">Precio</span>
                  <span>{formatMoney(item.unit_price, currency)}</span>
                </div>
                <div className="flex justify-between gap-3 font-semibold sm:block sm:text-right">
                  <span className="text-xs font-bold uppercase text-slate-400 sm:hidden">Total</span>
                  <span>{formatMoney(item.total, currency)}</span>
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
