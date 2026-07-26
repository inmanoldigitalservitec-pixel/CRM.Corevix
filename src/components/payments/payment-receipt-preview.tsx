import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyAmount } from "@/lib/currency";
import type { PaymentNetBalance } from "@/lib/payments/payment-net-balance";

type ReceiptParty = {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

type CompanyRow = {
  company_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  logo_url: string | null;
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
  invoiceCurrency?: string | null;
  appliedAmount?: number | null;
  issuer?: ReceiptParty;
  client?: ReceiptParty;
  financial: PaymentNetBalance;
};

function clean(value: unknown) {
  return String(value || "").trim();
}


function translateInvoiceStatus(value?: string | null) {
  const normalized = clean(value).toLowerCase();

  const labels: Record<string, string> = {
    paid: "Pagada",
    sent: "Enviada",
    draft: "Borrador",
    overdue: "Vencida",
    cancelled: "Cancelada",
    canceled: "Cancelada",
    "partially paid": "Parcialmente pagada",
    partial: "Parcialmente pagada",
  };

  return labels[normalized] || clean(value) || "—";
}

function joinAddress(company: CompanyRow | null) {
  if (!company) return "";

  const parts: string[] = [];
  const appendUnique = (value: unknown) => {
    const next = clean(value);
    if (!next) return;

    const normalized = parts.join(", ").toLocaleLowerCase("es");
    if (!normalized.includes(next.toLocaleLowerCase("es"))) {
      parts.push(next);
    }
  };

  appendUnique(company.address);
  appendUnique(company.city);
  appendUnique(company.country);

  return parts.join(", ");
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
    clean(party?.website),
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
  const { profile } = useAuth();
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const currency = clean(data.currency).toUpperCase() || "USD";
  const invoiceCurrency =
    clean(data.invoiceCurrency).toUpperCase() || currency;

  useEffect(() => {
    const companyId = profile?.company_id;

    if (!companyId) {
      setCompany(null);
      return;
    }

    let active = true;

    void supabase
      .from("companies")
      .select(
        "company_name,tax_id,email,phone,address,city,country,website,logo_url",
      )
      .eq("id", companyId)
      .maybeSingle()
      .then(({ data: companyData, error }) => {
        if (!active) return;

        if (error) {
          console.error("No se pudo cargar el emisor del recibo:", error);
          setCompany(null);
          return;
        }

        setCompany(companyData as CompanyRow | null);
      });

    return () => {
      active = false;
    };
  }, [profile?.company_id]);

  const issuer: ReceiptParty = {
    name: clean(data.issuer?.name) || company?.company_name || null,
    company: clean(data.issuer?.company) || company?.company_name || null,
    email: clean(data.issuer?.email) || company?.email || null,
    phone: clean(data.issuer?.phone) || company?.phone || null,
    address: clean(data.issuer?.address) || joinAddress(company) || null,
    taxId: clean(data.issuer?.taxId) || company?.tax_id || null,
    website: clean(data.issuer?.website) || company?.website || null,
    logoUrl: clean(data.issuer?.logoUrl) || company?.logo_url || null,
  };

  const printReceipt = () => {
    const body = document.body;
    const cleanup = () => body.classList.remove("printing-payment-receipt");

    body.classList.add("printing-payment-receipt");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1500);
  };

  return (
    <div className="min-w-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm 14mm 16mm;
          }

          body.printing-payment-receipt {
            background: #fff !important;
          }

          body.printing-payment-receipt * {
            visibility: hidden !important;
          }

          body.printing-payment-receipt .payment-receipt-print-root,
          body.printing-payment-receipt .payment-receipt-print-root * {
            visibility: visible !important;
          }

          body.printing-payment-receipt .payment-receipt-print-root {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #fff !important;
          }

          body.printing-payment-receipt .payment-receipt-print-root section,
          body.printing-payment-receipt .payment-receipt-print-root header {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="mb-4 flex justify-end print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={printReceipt}
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <article className="payment-receipt-print-root mx-auto min-h-[720px] max-w-[850px] border border-slate-200 bg-white px-6 py-7 shadow-sm md:px-10 md:py-9 print:min-h-0 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-start gap-4">
            {issuer.logoUrl ? (
              <img
                src={issuer.logoUrl}
                alt={clean(issuer.company) || clean(issuer.name) || "Empresa"}
                className="h-12 w-12 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Documento comercial
              </div>
              <h2 className="mt-2 text-2xl font-normal tracking-normal text-slate-950">
                Recibo de pago
              </h2>
            </div>
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
          <PartyBlock title="Emitido por" party={issuer} />
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

            {data.invoiceNumber && invoiceCurrency !== currency ? (
              <div className="flex justify-between gap-5 text-sm">
                <span className="text-slate-500">
                  Aplicado a factura
                </span>
                <span className="font-normal text-slate-950">
                  {formatCurrencyAmount(
                    data.appliedAmount || 0,
                    invoiceCurrency,
                  )}
                </span>
              </div>
            ) : null}

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
                {formatCurrencyAmount(data.invoiceTotal || 0, invoiceCurrency)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Saldo pendiente
              </div>
              <div className="mt-1 text-sm font-normal text-slate-950">
                {formatCurrencyAmount(data.invoiceBalance || 0, invoiceCurrency)}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Estado factura
              </div>
              <div className="mt-1 text-sm font-normal text-slate-950">
                {translateInvoiceStatus(data.invoiceStatus)}
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
