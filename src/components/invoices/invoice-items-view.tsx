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
  compact = false,
}: {
  items: InvoiceDetailItem[];
  loading: boolean;
  error: string | null;
  currency: string;
  formatMoney: (amount: number, currency: string) => string;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className="border-y border-slate-100 bg-white py-3 text-sm font-normal text-slate-500">
        Cargando artículos...
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {error ? (
        <div className="border-y border-destructive/20 bg-white py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {items.length ? (
        <div className={`min-w-0 ${compact ? "overflow-hidden border-y border-slate-100" : "overflow-x-auto border-y border-slate-100"}`}>
          <div className={compact ? "min-w-0" : "min-w-[560px]"}>
            <div className={`grid ${compact ? "grid-cols-[minmax(0,1fr)_32px_52px_60px] gap-1 py-1 text-[8px]" : "grid-cols-[minmax(220px,1fr)_80px_120px_120px] gap-3 py-2 text-[11px]"} border-b border-slate-100 bg-white font-normal uppercase tracking-wide text-slate-500`}>
              <span>Descripción</span>
              <span className="text-right">Cantidad</span>
              <span className="text-right">Precio</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`grid ${compact ? "grid-cols-[minmax(0,1fr)_32px_52px_60px] gap-1 py-1.5 text-[9px] leading-tight" : "grid-cols-[minmax(220px,1fr)_80px_120px_120px] gap-3 py-3 text-sm"}`}
                >
                  <div className="min-w-0 whitespace-normal break-words font-normal leading-5 text-slate-900">
                    {item.description || "Sin descripción"}
                  </div>
                  <div className="whitespace-nowrap text-right">
                    {Number(item.quantity || 0).toLocaleString("es-DO")}
                  </div>
                  <div className="whitespace-nowrap text-right">
                    {formatMoney(item.unit_price, currency)}
                  </div>
                  <div className="whitespace-nowrap text-right font-normal">
                    {formatMoney(item.total, currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? null : (
        <div className="flex min-h-10 items-center border-y border-slate-100 bg-white py-2.5 text-sm font-normal text-slate-500">
          Sin artículos
        </div>
      )}
    </div>
  );
}
