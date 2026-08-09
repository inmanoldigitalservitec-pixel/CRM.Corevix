import { Check, CreditCard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayPalInvoiceButton } from "@/components/invoices/PayPalInvoiceButton";
import { formatCurrencyAmount } from "@/lib/currency";

type InvoiceItem = {
  id?: string;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total?: number | string | null;
};

type InvoiceData = {
  currency?: string;
  clientName?: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTaxId?: string;
  issuerName?: string;
  issuerTaxId?: string;
  issuerEmail?: string;
  issuerPhone?: string;
  issuerAddress?: string;
  issuerWebsite?: string;
  relatedProposalNumber?: string;
  relatedProposalTitle?: string;
  productName?: string;
};

type Invoice = {
  id?: string;
  number?: string | null;
  status?: string | null;
  currency?: string | null;
  date_issued?: string | null;
  due_date?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  discount?: number | string | null;
  total?: number | string | null;
  notes?: string | null;
  public_token?: string | null;
  invoice_data?: InvoiceData | null;
};

type PublicInvoiceViewProps = {
  invoice: Invoice;
  items: InvoiceItem[];
  onPrint?: () => void;
};

export function PublicInvoiceView({ invoice, items, onPrint }: PublicInvoiceViewProps) {
  const data =
    invoice?.invoice_data && typeof invoice.invoice_data === "object" ? invoice.invoice_data : {};
  const currency = clean(invoice.currency) || clean(data.currency) || "USD";
  const statusInfo = getStatusInfo(invoice.status);
  const isPaid = clean(invoice.status).toLowerCase() === "paid";

  const clientName = clean(data.clientCompany) || clean(data.clientName) || "Cliente";
  const clientLines = [
    clean(data.clientName) && clean(data.clientName) !== clientName ? clean(data.clientName) : "",
    clean(data.clientAddress),
    clean(data.clientEmail),
    clean(data.clientPhone),
    clean(data.clientTaxId) ? `RNC / ID: ${clean(data.clientTaxId)}` : "",
  ].filter(Boolean);

  const issuerName = clean(data.issuerName) || "Corevix";
  const issuerLines = [
    clean(data.issuerAddress) || "Santo Domingo, Republica Dominicana",
    clean(data.issuerEmail) || "hello@corevix.com",
    clean(data.issuerPhone),
    clean(data.issuerTaxId) ? `RNC / ID: ${clean(data.issuerTaxId)}` : "",
  ].filter(Boolean);

  const fallbackItem = clean(data.productName) || clean(data.relatedProposalTitle) || "Servicio";
  const visibleItems = items.length
    ? items
    : [
        {
          description: fallbackItem,
          quantity: 1,
          unit_price: invoice.total || 0,
          total: invoice.total || 0,
        },
      ];

  const subtotal = Number(invoice.subtotal ?? invoice.total ?? 0);
  const tax = Number(invoice.tax || 0);
  const discount = Number(invoice.discount || 0);
  const total = Number(invoice.total || subtotal + tax - discount);

  return (
    <main className="min-h-screen bg-[#eef1f6] px-4 py-6 text-slate-950 print:bg-white print:p-0">
      <style>{`
        @page { size: letter; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .invoice-print-toolbar { display: none !important; }
          .invoice-letter-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="invoice-print-toolbar sticky top-3 z-20 mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center justify-end gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-slate-200 bg-white shadow-none"
          onClick={onPrint || (() => window.print())}
        >
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
        {!isPaid ? (
          <div className="flex h-9 items-center rounded-full border border-slate-200 bg-white px-2">
            <PayPalInvoiceButton
              publicToken={invoice.public_token}
              disabled={isPaid}
              onPaid={() => window.location.reload()}
            />
          </div>
        ) : (
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" />
            Pagada
          </span>
        )}
      </div>

      <article className="invoice-letter-page mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col bg-white px-[0.62in] py-[0.58in] shadow-[0_24px_70px_rgba(15,23,42,0.18)] print:h-[11in] print:w-[8.5in] print:max-w-none print:px-[0.62in] print:py-[0.58in]">
        <header className="grid grid-cols-[1fr_auto] gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src="/imagotipo_corevix.svg" alt="Corevix" className="h-14 w-14" />
              <div>
                <div className="text-2xl font-semibold leading-none tracking-normal text-[#1d62f9]">
                  {issuerName}
                </div>
                <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Facturacion comercial
                </div>
              </div>
            </div>

            <div className="mt-8 text-[12px] leading-5 text-slate-600">
              <div className="font-semibold text-slate-950">Emitido por</div>
              {issuerLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>

          <div className="text-right">
            <h1 className="text-[34px] font-bold uppercase leading-none tracking-normal text-[#1d62f9]">
              Invoice
            </h1>
            <div className="mt-2 text-sm font-semibold text-slate-700">
              {formatDate(invoice.date_issued)}
            </div>
            <div className="mt-8 text-[12px] leading-5 text-slate-600">
              <div className="font-semibold uppercase tracking-wide text-slate-500">Para</div>
              <div className="font-semibold text-slate-950">{clientName}</div>
              {clientLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-10 grid grid-cols-3 gap-6 border-y border-slate-200 py-4 text-[12px]">
          <InvoiceMeta label="Factura" value={invoice.number || "Sin numero"} />
          <InvoiceMeta label="Estado" value={statusInfo.label} />
          <InvoiceMeta label="Vencimiento" value={formatDate(invoice.due_date)} />
        </section>

        <section className="mt-8">
          <div className="grid grid-cols-[1fr_1.1in_0.75in_1.25in] bg-[#1d62f9] px-5 py-3 text-[12px] font-semibold text-white">
            <div>Items Description</div>
            <div className="text-right">Unit Price</div>
            <div className="text-center">Qnt</div>
            <div className="text-right">Total</div>
          </div>

          <div>
            {visibleItems.slice(0, 6).map((item, index) => {
              const description = clean(item.description) || "Servicio";
              const title = getFirstItemTitle(description);
              const details = getItemDescription(description);
              const quantity = Number(item.quantity || 1);
              const unitPrice = Number(item.unit_price || item.total || 0);
              const rowTotal = Number(item.total || unitPrice * quantity || 0);

              return (
                <div
                  key={item.id || `${description}-${index}`}
                  className="grid min-h-[0.68in] grid-cols-[1fr_1.1in_0.75in_1.25in] items-start border-b border-slate-300 px-5 py-4 text-[12px]"
                >
                  <div className="pr-6">
                    <div className="font-bold text-slate-950">{title}</div>
                    {details ? (
                      <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
                        {details}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right font-semibold">{formatMoney(unitPrice, currency)}</div>
                  <div className="text-center font-semibold">{quantity}</div>
                  <div className="text-right font-semibold">{formatMoney(rowTotal, currency)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-[1fr_2.45in] gap-10">
          <div className="text-[11px] leading-5 text-slate-600">
            <div className="mb-2 font-bold text-slate-950">Note</div>
            <p className="m-0">
              {clean(invoice.notes) ||
                "Gracias por confiar en Corevix. Esta factura resume los servicios aprobados y el balance pendiente."}
            </p>
          </div>

          <div className="text-[12px]">
            <SummaryLine label="SUBTOTAL" value={formatMoney(subtotal, currency)} accent />
            <SummaryLine label="Tax" value={formatMoney(tax, currency)} />
            <SummaryLine label="DISCOUNT" value={formatMoney(discount, currency)} />
            <div className="mt-4 flex items-center justify-between bg-[#1d62f9] px-5 py-4 text-white">
              <span className="text-[15px] font-bold uppercase">Total due</span>
              <span className="text-[18px] font-bold">{formatMoney(total, currency)}</span>
            </div>
          </div>
        </section>

        <div className="mt-auto">
          <div className="mb-7 text-[15px] font-bold text-[#1d62f9]">
            Thank you for your Business
          </div>

          <footer className="grid grid-cols-3 gap-8 border-t border-[#1d62f9] pt-5 text-[9.5px] leading-4 text-slate-600">
            <div>
              <div className="mb-2 text-[12px] font-bold text-[#1d62f9]">Questions?</div>
              <div>Email: {clean(data.issuerEmail) || "hello@corevix.com"}</div>
              <div>Invoice: {invoice.number || "—"}</div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-bold text-[#1d62f9]">Payment Info</div>
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                PayPal / transferencia
              </div>
              <div>Status: {statusInfo.label}</div>
            </div>
            <div>
              <div className="mb-2 text-[12px] font-bold text-[#1d62f9]">Terms & Conditions</div>
              <div className="line-clamp-3">
                Los pagos se aplican al balance de esta factura. Cualquier ajuste debe confirmarse
                con Corevix.
              </div>
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}

function InvoiceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-2">
      <span className={accent ? "font-semibold uppercase text-[#1d62f9]" : "font-semibold"}>
        {label}
      </span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number | string | null | undefined, currency = "USD") {
  return formatCurrencyAmount(value, currency);
}

function getFirstItemTitle(description?: string | null) {
  const text = clean(description);
  if (!text) return "Servicio";
  const [title] = text.split(" - ");
  return clean(title) || text;
}

function getItemDescription(description?: string | null) {
  const text = clean(description);
  if (!text.includes(" - ")) return "";
  const parts = text.split(" - ");
  return parts.slice(1).join(" - ").trim();
}

function getStatusInfo(status?: string | null) {
  const normalized = clean(status).toLowerCase();
  if (normalized === "paid") return { label: "Pagada" };
  if (normalized === "overdue") return { label: "Vencida" };
  if (normalized === "cancelled" || normalized === "canceled") return { label: "Cancelada" };
  if (normalized === "sent") return { label: "Enviada" };
  return { label: "Pendiente" };
}
