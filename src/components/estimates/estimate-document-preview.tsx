import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";

type Party = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

type EstimateItem = {
  id?: string | null;
  item_name?: string | null;
  description?: string | null;
  quantity?: number | null;
  rate?: number | null;
  tax_rate?: number | null;
  amount?: number | null;
};

export type EstimateDocumentData = {
  number?: string | number | null;
  title?: string | null;
  status?: string | null;
  dateIssued?: string | null;
  expiryDate?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  adjustment?: number | null;
  total?: number | null;
  notes?: string | null;
  terms?: string | null;
  issuer?: Party;
  client?: Party;
  items?: EstimateItem[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function PartyBlock({ title, party }: { title: string; party?: Party }) {
  const name = clean(party?.name) || "—";
  const lines = [
    clean(party?.address),
    clean(party?.email),
    clean(party?.phone),
    clean(party?.website),
    clean(party?.taxId) ? `RNC / ID: ${clean(party?.taxId)}` : "",
  ].filter(Boolean);

  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 font-semibold text-slate-950">{name}</div>
      {lines.map((line) => (
        <div key={line} className="mt-1 break-words text-xs text-slate-500">
          {line}
        </div>
      ))}
    </div>
  );
}

export function EstimateDocumentPreview({ data }: { data: EstimateDocumentData }) {
  const currency = clean(data.currency).toUpperCase() || "USD";
  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="min-w-0">
      <div className="mb-4 flex justify-end print:hidden">
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="mx-auto min-h-[760px] max-w-[850px] border border-slate-200 bg-white px-6 py-7 shadow-sm md:px-10 md:py-9 print:min-h-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-start gap-4">
            {data.issuer?.logoUrl ? (
              <img
                src={data.issuer.logoUrl}
                alt={clean(data.issuer.name) || "Empresa"}
                className="h-14 w-14 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Documento comercial</div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Cotización</h1>
              <div className="mt-2 text-sm text-slate-500">{data.title || "Cotización comercial"}</div>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Número</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">EST-{data.number || "—"}</div>
            <div className="mt-1 text-sm text-slate-500">Emitida: {formatDate(data.dateIssued)}</div>
            <div className="mt-1 text-sm text-slate-500">Válida hasta: {formatDate(data.expiryDate)}</div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <PartyBlock title="Emitido por" party={data.issuer} />
          <PartyBlock title="Cliente" party={data.client} />
        </section>

        <section className="py-6">
          <div className="overflow-hidden border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Descripción</th>
                  <th className="px-3 py-3 text-right">Cant.</th>
                  <th className="px-3 py-3 text-right">Tarifa</th>
                  <th className="px-3 py-3 text-right">Imp.</th>
                  <th className="px-3 py-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id || index} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-950">{item.item_name || "Servicio"}</div>
                      {item.description ? (
                        <div className="mt-1 text-xs text-slate-500">{item.description}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">{Number(item.quantity || 0)}</td>
                    <td className="px-3 py-3 text-right">{formatCurrencyAmount(item.rate || 0, currency)}</td>
                    <td className="px-3 py-3 text-right">{Number(item.tax_rate || 0)}%</td>
                    <td className="px-3 py-3 text-right font-medium">{formatCurrencyAmount(item.amount || 0, currency)}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">No hay líneas registradas.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ml-auto max-w-sm space-y-3 border-t border-slate-200 pt-5 text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-500">Subtotal</span><strong>{formatCurrencyAmount(data.subtotal || 0, currency)}</strong></div>
          <div className="flex justify-between gap-4"><span className="text-slate-500">Impuestos</span><strong>{formatCurrencyAmount(data.tax || 0, currency)}</strong></div>
          {Number(data.discount || 0) ? <div className="flex justify-between gap-4"><span className="text-slate-500">Descuento</span><strong>-{formatCurrencyAmount(data.discount || 0, currency)}</strong></div> : null}
          {Number(data.adjustment || 0) ? <div className="flex justify-between gap-4"><span className="text-slate-500">Ajuste</span><strong>{formatCurrencyAmount(data.adjustment || 0, currency)}</strong></div> : null}
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-4 text-lg"><span>Total</span><strong>{formatCurrencyAmount(data.total || 0, currency)}</strong></div>
        </section>

        {data.notes || data.terms ? (
          <section className="mt-8 grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2">
            {data.notes ? <div><div className="text-[11px] uppercase tracking-wide text-slate-500">Notas</div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{data.notes}</p></div> : null}
            {data.terms ? <div><div className="text-[11px] uppercase tracking-wide text-slate-500">Términos</div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{data.terms}</p></div> : null}
          </section>
        ) : null}
      </article>
    </div>
  );
}
