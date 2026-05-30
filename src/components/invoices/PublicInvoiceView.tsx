import { PayPalInvoiceButton } from "@/components/invoices/PayPalInvoiceButton";
type InvoiceItem = {
  id?: string;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total?: number | string | null;
};

type InvoiceData = {
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

  paymentMethod?: string;
  paymentInstructions?: string;
  relatedProposalNumber?: string;
  relatedProposalTitle?: string;
  productName?: string;
};

type Invoice = {
  id?: string;
  number?: string | null;
  status?: string | null;
  date_issued?: string | null;
  due_date?: string | null;
  subtotal?: number | string | null;
  tax?: number | string | null;
  discount?: number | string | null;
  total?: number | string | null;
  payment_link?: string | null;
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
  const data = invoice?.invoice_data && typeof invoice.invoice_data === "object" ? invoice.invoice_data : {};

  const statusInfo = getStatusInfo(invoice.status);
  const currency = "USD";

  const clientName = clean(data.clientCompany) || clean(data.clientName) || "Cliente sin nombre";

  const clientDetails = [
    clean(data.clientName) && clean(data.clientName) !== clientName ? clean(data.clientName) : "",
    clean(data.clientEmail),
    clean(data.clientPhone),
    clean(data.clientAddress),
    clean(data.clientTaxId) ? `RNC / ID: ${clean(data.clientTaxId)}` : "",
  ].filter(Boolean);

  const issuerName = clean(data.issuerName) || "Corevix";

  const issuerDetails = [
    clean(data.issuerTaxId) ? `RNC / ID: ${clean(data.issuerTaxId)}` : "",
    clean(data.issuerEmail) || "ic.corniel@gmail.com",
    clean(data.issuerPhone),
    clean(data.issuerAddress) || "Santo Domingo, República Dominicana",
    clean(data.issuerWebsite),
  ].filter(Boolean);

  const relatedProposalNumber = clean(data.relatedProposalNumber) || "Sin propuesta relacionada";

  const productName = clean(data.productName) || getFirstItemTitle(items[0]?.description) || "Servicio aprobado";

  const paymentMessage =
    clean(data.paymentInstructions) ||
    clean(invoice.notes) ||
    (invoice.payment_link
      ? "Puedes pagar usando el botón superior o contactar a Corevix para coordinar el pago."
      : "Método de pago pendiente de configurar. Nuestro equipo te contactará para completar el pago.");

  const visibleItems =
    items && items.length > 0
      ? items
      : [
          {
            description: productName,
            quantity: 1,
            unit_price: invoice.total || 0,
            total: invoice.total || 0,
          },
        ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(103,162,255,0.25),transparent_32%),radial-gradient(circle_at_100%_0%,rgba(29,98,249,0.22),transparent_28%),linear-gradient(180deg,#020918_0%,#06142b_42%,#0b2e73_100%)] px-2.5 py-[18px] text-[#101828] print:bg-white print:p-0">
      <style>
        {`
          @media print {
            @page {
              size: 4in 6.8in;
              margin: 0;
            }

            .invoice-print-toolbar {
              display: none !important;
            }

            .invoice-voucher {
              width: 4in !important;
              min-height: 6.8in !important;
              max-width: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              border: 0 !important;
            }

            .invoice-voucher::before,
            .invoice-voucher::after {
              display: none !important;
            }

            .invoice-hero {
              border-radius: 0 !important;
            }
          }
        `}
      </style>

      <div className="mx-auto w-full max-w-[430px]">
        <div className="invoice-print-toolbar mb-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onPrint || (() => window.print())}
            className="inline-flex min-h-[43px] items-center justify-center gap-2 rounded-[13px] border border-[#dce6f3] bg-white px-[15px] text-[13px] font-[680] tracking-[0.002em] text-[#101828] shadow-[0_8px_20px_rgba(10,32,80,0.08)] transition-transform hover:-translate-y-px"
          >
            <PrintIcon />
            Imprimir
          </button>

          {invoice.payment_link ? (
            <a
              href={String(invoice.payment_link)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[43px] items-center justify-center gap-2 rounded-[13px] bg-[linear-gradient(180deg,#1d62f9,#0f4de6)] px-[15px] text-[13px] font-[680] tracking-[0.002em] text-white no-underline shadow-[0_12px_24px_rgba(29,98,249,0.28)] transition-transform hover:-translate-y-px"
            >
              <CheckIcon />
              Pagar
            </a>
          ) : null}
        </div>

        <article className="invoice-voucher relative flex min-h-[805px] w-full flex-col overflow-hidden rounded-[30px] border border-[rgba(220,230,243,0.96)] bg-white shadow-[0_28px_70px_rgba(10,32,80,0.16)] before:absolute before:-left-3.5 before:top-[345px] before:z-[5] before:h-7 before:w-7 before:rounded-full before:border before:border-[rgba(220,230,243,0.96)] before:bg-[#f2f5fa] after:absolute after:-right-3.5 after:top-[345px] after:z-[5] after:h-7 after:w-7 after:rounded-full after:border after:border-[rgba(220,230,243,0.96)] after:bg-[#f2f5fa]">
          <header className="invoice-hero relative isolate min-h-[230px] overflow-hidden bg-[radial-gradient(circle_at_86%_20%,rgba(29,98,249,0.52),transparent_32%),linear-gradient(135deg,#030b1d_0%,#07152e_57%,#0b3c94_100%)] px-5 pb-[22px] pt-6 text-white before:absolute before:inset-0 before:-z-10 before:translate-x-[106px] before:-translate-y-2 before:bg-[linear-gradient(30deg,transparent_0_47%,rgba(255,255,255,0.07)_48%_49%,transparent_50%),linear-gradient(150deg,transparent_0_47%,rgba(255,255,255,0.05)_48%_49%,transparent_50%)] before:bg-[length:78px_78px] before:opacity-55">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/corevix-logo-white.svg"
                  alt="Corevix"
                  className="h-7 w-auto max-w-[150px] object-contain"
                />
              </div>

              <div className="inline-flex min-h-8 items-center gap-[7px] whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-[13px] text-[11.8px] font-[680] leading-none text-white">
                <span className={`h-[7px] w-[7px] rounded-full ${statusInfo.dotClass}`} />
                <span>{statusInfo.label}</span>
              </div>
            </div>

            <div className="mt-10 flex items-end justify-between gap-3.5">
              <h1 className="m-0 text-[53px] font-[760] leading-[0.92] tracking-[-0.045em]">Factura</h1>

              <div className="grid gap-1 pb-1 text-right">
                <span className="text-[9.8px] font-bold uppercase tracking-[0.12em] text-white/60">Número</span>
                <strong className="text-[14.5px] font-[720] tracking-[-0.012em] text-white">
                  {invoice.number || "INV-SIN-NÚMERO"}
                </strong>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <DateChip label="Fecha de factura" value={formatDate(invoice.date_issued)} />
              <DateChip label="Vencimiento" value={formatDate(invoice.due_date)} />
            </div>
          </header>


          {String(invoice.status || "").toLowerCase() !== "paid" ? (
            <section
              data-demo="invoice-paypal-payment"
              className="mx-5 -mt-5 mb-5 overflow-hidden rounded-[24px] border border-[#d8e5f7] bg-white shadow-[0_22px_55px_rgba(10,32,80,0.14)] print:hidden"
            >
              <div className="bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_55%,#fff8e6_100%)] px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-[800] uppercase tracking-[0.12em] text-[#1d62f9]">
                      Pago seguro
                    </div>

                    <h2 className="m-0 text-[22px] font-[850] leading-[1.05] tracking-[-0.03em] text-[#101828]">
                      Pagar factura
                    </h2>

                    <p className="mt-2 max-w-[360px] text-[12.5px] font-medium leading-relaxed text-[#667085]">
                      Completa el pago de esta factura de forma segura con PayPal.
                    </p>
                  </div>

                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#fef7df]">
                    <img
                      src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-mark-color.svg"
                      alt="PayPal"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-[18px] border border-[#e6eef9] bg-white p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-[#667085]">
                        Total a pagar
                      </div>
                      <div className="mt-1 text-[26px] font-[850] leading-none tracking-[-0.03em] text-[#101828]">
                        {formatMoney(invoice.total || 0, currency)}
                      </div>
                    </div>

                    <PayPalInvoiceButton
                      publicToken={invoice.public_token}
                      disabled={String(invoice.status || "").toLowerCase() === "paid"}
                      onPaid={() => window.location.reload()}
                    />
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#f8fafc] px-3 py-2 text-[11.5px] font-medium leading-relaxed text-[#667085]">
                    <span className="mt-[2px] inline-block h-2 w-2 shrink-0 rounded-full bg-[#1d62f9]" />
                    Cuando integremos el backend, el CRM podrá confirmar el pago automáticamente, marcar la factura como pagada y crear el proyecto relacionado.
                  </div>
                </div>
              </div>
            </section>
          ) : null}



          <section className="grid flex-1 content-start gap-[13px] bg-[linear-gradient(180deg,#fff_0%,#fbfdff_100%)] px-3.5 py-4">
            <div className="grid grid-cols-2 gap-[11px] max-[380px]:grid-cols-1">
              <PartyCard label="Facturado a" name={clientName} lines={clientDetails} />
              <PartyCard label="Emitido por" name={issuerName} lines={issuerDetails} />
            </div>

            <div className="grid grid-cols-2 gap-[11px] max-[380px]:grid-cols-1">
              <SmallInfo label="Propuesta relacionada" value={relatedProposalNumber} />
              <SmallInfo label="Servicio" value={productName} />
            </div>

            <section className="overflow-hidden rounded-[19px] border border-[#dce6f3] bg-white">
              <div className="grid min-h-[39px] grid-cols-[25px_1fr_54px_68px] items-center gap-2 bg-[linear-gradient(180deg,#1d62f9,#0f4de6)] px-[13px] text-[9.7px] font-[720] uppercase tracking-[0.08em] text-white max-[380px]:grid-cols-[22px_1fr_44px_58px]">
                <span>#</span>
                <span>Artículo</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">Importe</span>
              </div>

              {visibleItems.map((item, index) => {
                const description = clean(item.description) || "Servicio aprobado";
                const title = getFirstItemTitle(description);
                const itemDescription = getItemDescription(description);

                return (
                  <div
                    key={item.id || `${description}-${index}`}
                    className="grid min-h-[95px] grid-cols-[25px_1fr_54px_68px] items-start gap-2 border-b border-dashed border-[#d8e3f2] px-[13px] py-[17px] last:border-b-0 max-[380px]:grid-cols-[22px_1fr_44px_58px]"
                  >
                    <div className="grid h-[22px] w-[22px] place-items-center rounded-lg bg-[#eef5ff] text-[10.5px] font-[750] text-[#1d62f9]">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="mb-1.5 mt-0 text-[13.2px] font-[720] leading-[1.18] text-[#101828]">
                        {title}
                      </h3>
                      {itemDescription ? (
                        <p className="m-0 text-[10.9px] font-medium leading-[1.5] text-[#667085]">{itemDescription}</p>
                      ) : null}
                    </div>

                    <div className="text-right text-xs font-[650] leading-[1.3] text-[#101828]">{item.quantity || 1}</div>

                    <div className="text-right text-xs font-[650] leading-[1.3] text-[#101828]">
                      {formatMoney(item.total || item.unit_price || 0, currency)}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="grid gap-[13px]">
              <div className="min-h-[92px] rounded-[18px] border border-[#dbe9ff] bg-[radial-gradient(circle_at_100%_0%,rgba(29,98,249,0.12),transparent_42%),#f7faff] p-3.5">
                <h3 className="mb-[7px] mt-0 text-xs font-[720] tracking-[-0.004em] text-[#1d62f9]">Información de pago</h3>
                <p className="m-0 text-[10.9px] font-medium leading-[1.5] text-[#46556b]">{paymentMessage}</p>
              </div>

              <div className="overflow-hidden rounded-[18px] border border-[#dce6f3] bg-white">
                <SummaryLine label="Subtotal" value={formatMoney(invoice.subtotal || 0, currency)} />
                <SummaryLine label="Descuento" value={formatMoney(invoice.discount || 0, currency)} />
                <SummaryLine label="Impuesto" value={formatMoney(invoice.tax || 0, currency)} />

                <div className="flex min-h-[58px] items-center justify-between bg-[linear-gradient(180deg,#06142b,#020918)] px-3.5 text-white">
                  <span className="text-xs font-semibold text-white/70">Total a pagar</span>
                  <strong className="text-[23px] font-[740] tracking-[-0.018em]">
                    {formatMoney(invoice.total || 0, currency)}
                  </strong>
                </div>
              </div>
            </section>
          </section>

          <footer className="grid grid-cols-[1fr_auto] items-center gap-3.5 bg-white px-3.5 pb-4">
            <div className="text-[10.2px] font-medium leading-[1.44] text-[#7b8495]">
              Gracias por confiar en Corevix.
              <strong className="block font-[720] text-[#667085]">Impulsamos tu marca, conectamos resultados.</strong>
            </div>

            <div className="h-[58px] w-[58px] rounded-[13px] border border-[#dce6f3] bg-[linear-gradient(90deg,#101828_8px,transparent_8px)_0_0/16px_16px,linear-gradient(#101828_8px,transparent_8px)_0_0/16px_16px,#fff] opacity-85" />
          </footer>
        </article>
      </div>
    </main>
  );
}

function PartyCard({ label, name, lines }: { label: string; name: string; lines: string[] }) {
  return (
    <article className="min-h-[132px] rounded-[18px] border border-[#dce6f3] bg-white px-[13px] pb-3.5 pt-[15px]">
      <p className="mb-[9px] mt-0 text-[9.8px] font-[760] uppercase leading-none tracking-[0.12em] text-[#1d62f9]">
        {label}
      </p>
      <h2 className="mb-2 mt-0 text-[14.2px] font-[720] leading-[1.18] tracking-[-0.01em] text-[#101828]">{name}</h2>
      <p className="m-0 whitespace-pre-line text-[10.8px] font-medium leading-[1.52] tracking-[0.002em] text-[#667085]">
        {lines.length ? lines.join("\n") : "Sin información adicional"}
      </p>
    </article>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[66px] rounded-2xl border border-[#dce6f3] bg-[#f5f8fc] px-3 py-3">
      <span className="mb-[5px] block text-[9.5px] font-[720] uppercase tracking-[0.1em] text-[#667085]">{label}</span>
      <strong className="block text-[12.8px] font-[680] leading-[1.28] text-[#101828]">{value || "—"}</strong>
    </div>
  );
}

function DateChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[58px] rounded-[17px] border border-white/15 bg-white/10 p-3 backdrop-blur-xl">
      <span className="mb-[5px] block text-[9.6px] font-bold uppercase tracking-[0.08em] text-white/60">{label}</span>
      <strong className="text-sm font-[680] text-white">{value}</strong>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-9 items-center justify-between border-b border-[#edf2f7] px-3.5 text-[11.8px] font-semibold text-[#667085]">
      <span>{label}</span>
      <strong className="font-bold text-[#101828]">{value}</strong>
    </div>
  );
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatMoney(value: number | string | null | undefined, currency = "USD") {
  const number = Number(value || 0);
  return `${currency} ${number.toLocaleString("en-US", {
    minimumFractionDigits: number % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function getFirstItemTitle(description?: string | null) {
  const text = clean(description);
  if (!text) return "Servicio aprobado";
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
  if (normalized === "paid") {
    return { label: "Pagada", dotClass: "bg-[#12b76a] shadow-[0_0_0_4px_rgba(18,183,106,0.18)]" };
  }
  if (normalized === "overdue") {
    return { label: "Vencida", dotClass: "bg-[#f04438] shadow-[0_0_0_4px_rgba(240,68,56,0.18)]" };
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return { label: "Cancelada", dotClass: "bg-[#98a2b3] shadow-[0_0_0_4px_rgba(152,162,179,0.18)]" };
  }
  if (normalized === "sent") {
    return { label: "Enviada", dotClass: "bg-[#1d62f9] shadow-[0_0_0_4px_rgba(29,98,249,0.18)]" };
  }
  return { label: "Pendiente de pago", dotClass: "bg-[#f79009] shadow-[0_0_0_4px_rgba(247,144,9,0.18)]" };
}

function PrintIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
