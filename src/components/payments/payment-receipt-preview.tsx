import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyAmount } from "@/lib/currency";
import type { PaymentNetBalance } from "@/lib/payments/payment-net-balance";

type ReceiptParty = {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
};

export type PaymentReceiptPreviewData = {
  paymentNumber?: string | number | null;
  paymentDate?: string | null;
  method?: string | null;
  reference?: string | null;
  currency?: string | null;
  notes?: string | null;
  invoiceNumber?: string | null;
  invoiceTotal?: number | null;
  invoiceBalance?: number | null;
  invoiceStatus?: string | null;
  issuer?: ReceiptParty;
  client?: ReceiptParty;
  financial: PaymentNetBalance;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function PartyBlock({
  title,
  party,
}: {
  title: string;
  party?: ReceiptParty;
}) {
  const displayName = clean(party?.company) || clean(party?.name) || "—";
  const lines = [
    clean(party?.name) && clean(party?.name) !== displayName
      ? clean(party?.name)
      : "",
    clean(party?.address),
    clean(party?.email),
    clean(party?.phone),
    clean(party?.taxId) ? `RNC / ID: ${clean(party?.taxId)}` : "",
  ].filter(Boolean);

  return (
    <div className="min-w-0">
      <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-sm font-normal text-slate-950">
        {displayName}
      </div>
      {lines.map((line) => (
        <div
          key={line}
          className="mt-1 break-words text-xs font-normal text-slate-500"
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function PaymentReceiptPreview({
  data,
}: {
  data: PaymentReceiptPreviewData;
}) {
  const currency = clean(data.currency).toUpperCase() || "USD";

  return (
    <div className="min-w-0">
      <div className="mb-4 flex justify-end print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="mx-auto min-h-[720px] max-w-[850px] border border-slate-200 bg-white px-6 py-7 shadow-sm md:px-10 md:py-9 print:min-h-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Documento comercial
            </div>
            <h2 className="mt-2 text-2xl font-normal tracking-normal text-slate-950">
              Recibo de pago
            </h2>
          </div>

          <div className="sm:text-right">
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Pago
            </div>
            <div className="mt-2 text-lg font-normal text-slate-950">
              #{data.paymentNumber || "—"}
            </div>
            <div className="mt-1 text-sm font-normal text-slate-500">
              {formatDate(data.paymentDate)}
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <PartyBlock title="Emitido por" party={data.issuer} />
          <PartyBlock title="Cliente" party={data.client} />
        </section>

        <section className="grid gap-5 border-b border-slate-200 py-6 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Método
            </div>
            <div className="mt-1 text-sm font-normal text-slate-950">
              {data.method || "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Referencia
            </div>
            <div className="mt-1 break-all text-sm font-normal text-slate-950">
              {data.reference || "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Factura
            </div>
            <div className="mt-1 text-sm font-normal text-slate-950">
              {data.invoiceNumber || "Pago sin factura"}
            </div>
          </div>
        </section>

        <section className="py-7">
          <div className="ml-auto max-w-md space-y-3">
            <div className="flex justify-between gap-5 text-sm">
              <span className="text-slate-500">Monto original</span>
              <span className="font-normal text-slate-950">
                {formatCurrencyAmount(
                  data.financial.originalAmount,
                  currency,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-5 text-sm">
              <span className="text-slate-500">Reembolsado</span>
              <span className="font-normal text-slate-950">
                {formatCurrencyAmount(
                  data.financial.movementAmount,
                  currency,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-5 border-t border-slate-200 pt-4">
              <span className="text-base font-normal text-slate-950">
                Cobrado neto
              </span>
              <span className="text-2xl font-normal leading-none text-slate-950">
                {formatCurrencyAmount(
                  data.financial.netAmount,
                  currency,
                )}
              </span>
            </div>
          </div>
        </section>

        {data.invoiceNumber ? (
          <section className="grid gap-4 border-t border-slate-200 py-6 sm:grid-cols-3">
            <div>
              <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Total factura
              </div>
              <div className="mt-1 text-sm font-normal text-slate-950">
                {formatCurrencyAmount(data.invoiceTotal || 0, currency)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Saldo pendiente
              </div>
              <div className="mt-1 text-sm font-normal text-slate-950">
                {formatCurrencyAmount(data.invoiceBalance || 0, currency)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Estado factura
              </div>
              <div className="mt-1 text-sm font-normal text-slate-950">
                {data.invoiceStatus || "—"}
              </div>
            </div>
          </section>
        ) : null}

        {data.notes ? (
          <section className="border-t border-slate-200 pt-6">
            <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Notas
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-normal text-slate-700">
              {data.notes}
            </p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
