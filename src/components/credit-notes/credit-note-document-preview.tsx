import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";

export type CreditNoteDocumentData = {
  number?: string | number | null;
  status?: string | null;
  dateIssued?: string | null;
  reason?: string | null;
  notes?: string | null;
  currency?: string | null;
  amount?: number | null;
  issuer?: {
    name?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    logoUrl?: string | null;
  };
  client?: {
    name?: string | null;
    taxId?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  invoice?: {
    number?: string | null;
    date?: string | null;
    total?: number | null;
    currency?: string | null;
  };
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function PartyBlock({ title, party }: { title: string; party?: CreditNoteDocumentData["issuer"] }) {
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
      <div className="mt-2 text-sm text-slate-950">{name}</div>
      {lines.map((line) => (
        <div key={line} className="mt-1 break-words text-xs text-slate-500">
          {line}
        </div>
      ))}
    </div>
  );
}

export function CreditNoteDocumentPreview({ data }: { data: CreditNoteDocumentData }) {
  const currency = clean(data.currency).toUpperCase() || "USD";
  const invoiceCurrency = clean(data.invoice?.currency).toUpperCase() || currency;

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
                className="h-12 w-12 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Documento fiscal</div>
              <h1 className="mt-2 text-2xl font-normal text-slate-950">Nota de crédito</h1>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Número</div>
            <div className="mt-2 text-lg text-slate-950">NC-{data.number || "—"}</div>
            <div className="mt-1 text-sm text-slate-500">{formatDate(data.dateIssued)}</div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <PartyBlock title="Emitido por" party={data.issuer} />
          <PartyBlock title="Cliente" party={data.client} />
        </section>

        <section className="grid gap-5 border-b border-slate-200 py-6 sm:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Factura afectada</div>
            <div className="mt-1 text-sm text-slate-950">{data.invoice?.number || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Fecha factura</div>
            <div className="mt-1 text-sm text-slate-950">{formatDate(data.invoice?.date)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total factura</div>
            <div className="mt-1 text-sm text-slate-950">
              {formatCurrencyAmount(data.invoice?.total || 0, invoiceCurrency)}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 py-7">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Motivo</div>
          <div className="mt-2 text-base text-slate-950">{data.reason || "—"}</div>
        </section>

        <section className="py-7">
          <div className="ml-auto max-w-md border-t border-slate-200 pt-4">
            <div className="flex items-end justify-between gap-6">
              <span className="text-base text-slate-950">Monto acreditado</span>
              <span className="text-3xl font-normal text-slate-950">
                {formatCurrencyAmount(data.amount || 0, currency)}
              </span>
            </div>
          </div>
        </section>

        {data.notes ? (
          <section className="border-t border-slate-200 pt-6">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Notas</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{data.notes}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
