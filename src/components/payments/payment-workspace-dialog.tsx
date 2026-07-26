import { useEffect, useMemo, useState } from "react";
import { CreditCard, FileText, Loader2, Paperclip, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  SalesDocumentWorkspaceDialog,
  type SalesDocumentWorkspaceTab,
} from "@/components/sales/sales-document-workspace-dialog";
import { PaymentReceiptsPanel } from "@/components/payments/payment-receipts-panel";
import { PaymentMovementsPanel } from "@/components/payments/payment-movements-panel";
import {
  PaymentReceiptPreview,
  type PaymentReceiptPreviewData,
} from "@/components/payments/payment-receipt-preview";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
} from "@/lib/currency";
import { loadInvoicePaymentBalance } from "@/lib/payments/invoice-payment-balance";
import {
  loadPaymentNetBalance,
  type PaymentNetBalance,
} from "@/lib/payments/payment-net-balance";

type PaymentWorkspaceTab = "receipt" | "details" | "movements" | "receipts";

type PaymentRow = {
  id: string;
  company_id: string;
  payment_number: number | string | null;
  invoice_id: string | null;
  client_id: string | null;
  amount: number | null;
  amount_base: number | null;
  currency: string | null;
  base_currency: string | null;
  payment_date: string | null;
  method: string | null;
  status: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string | null;
};

type InvoiceRow = {
  id: string;
  number: string | null;
  total: number | null;
  currency: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  status: string | null;
  invoice_data: Record<string, any> | null;
};

type ClientRow = {
  id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
};

type CompanyRow = {
  company_name: string | null;
  tax_id: string | null;
};

const workspaceTabs: SalesDocumentWorkspaceTab[] = [
  { value: "receipt", label: "Recibo", icon: FileText },
  { value: "details", label: "Detalles", icon: CreditCard },
  { value: "movements", label: "Movimientos", icon: RotateCcw },
  { value: "receipts", label: "Comprobantes", icon: Paperclip },
];

function readText(source: Record<string, any>, key: string) {
  return String(source?.[key] || "").trim() || null;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-normal text-slate-950">
        {value}
      </div>
    </div>
  );
}

export function PaymentWorkspaceDialog({
  paymentId,
  open,
  onOpenChange,
  initialTab = "receipt",
  onOpenInvoice,
}: {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: PaymentWorkspaceTab;
  onOpenInvoice?: (invoiceId: string) => void;
}) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<PaymentWorkspaceTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [financial, setFinancial] = useState<PaymentNetBalance | null>(null);
  const [invoiceBalance, setInvoiceBalance] = useState<number | null>(null);
  const [invoiceFinancialStatus, setInvoiceFinancialStatus] = useState<string | null>(null);
  const [movementRefresh, setMovementRefresh] = useState(0);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [initialTab, open, paymentId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open || !paymentId || !profile?.company_id) return;

      setLoading(true);

      try {
        const db = supabase as any;
        const { data: paymentData, error: paymentError } = await db
          .from("payments")
          .select(
            "id,company_id,payment_number,invoice_id,client_id,amount,amount_base,currency,base_currency,payment_date,method,status,reference,notes,created_at",
          )
          .eq("company_id", profile.company_id)
          .eq("id", paymentId)
          .single();

        if (paymentError) throw paymentError;

        const paymentRow = paymentData as PaymentRow;

        const [financialResult, companyResult, invoiceResult, clientResult] =
          await Promise.all([
            loadPaymentNetBalance(paymentRow, profile.company_id),
            db
              .from("companies")
              .select("company_name,tax_id")
              .eq("id", profile.company_id)
              .maybeSingle(),
            paymentRow.invoice_id
              ? db
                  .from("invoices")
                  .select(
                    "id,number,total,currency,base_currency,exchange_rate,status,invoice_data",
                  )
                  .eq("company_id", profile.company_id)
                  .eq("id", paymentRow.invoice_id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            paymentRow.client_id
              ? db
                  .from("clients")
                  .select(
                    "id,company_name,contact_person,email,phone,address,tax_id",
                  )
                  .eq("company_id", profile.company_id)
                  .eq("id", paymentRow.client_id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

        if (companyResult.error) throw companyResult.error;
        if (invoiceResult.error) throw invoiceResult.error;
        if (clientResult.error) throw clientResult.error;

        const invoiceRow = invoiceResult.data as InvoiceRow | null;
        let nextInvoiceBalance: number | null = null;
        let nextInvoiceStatus: string | null = invoiceRow?.status || null;

        if (invoiceRow) {
          const balance = await loadInvoicePaymentBalance(
            invoiceRow,
            profile.company_id,
          );
          nextInvoiceBalance = balance.outstandingBalance;

          if (balance.outstandingBalance <= 0) {
            nextInvoiceStatus = "Paid";
          } else if (balance.completedAmount > 0 || balance.validCredits > 0) {
            nextInvoiceStatus = "Partially Paid";
          }
        }

        if (cancelled) return;

        setPayment(paymentRow);
        setFinancial(financialResult);
        setCompany(companyResult.data as CompanyRow | null);
        setInvoice(invoiceRow);
        setClient(clientResult.data as ClientRow | null);
        setInvoiceBalance(nextInvoiceBalance);
        setInvoiceFinancialStatus(nextInvoiceStatus);
      } catch (error: any) {
        if (!cancelled) {
          console.error("payment workspace load error:", error);
          toast.error(error?.message || "No se pudo cargar el pago.");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, paymentId, profile?.company_id, onOpenChange, movementRefresh]);

  const receiptData = useMemo<PaymentReceiptPreviewData | null>(() => {
    if (!payment || !financial) return null;

    const invoiceData =
      invoice?.invoice_data && typeof invoice.invoice_data === "object"
        ? invoice.invoice_data
        : {};

    const issuerAddress =
      readText(invoiceData, "issuerAddress") || null;

    return {
      paymentNumber: payment.payment_number,
      paymentDate: payment.payment_date,
      method: payment.method,
      reference: payment.reference,
      currency: payment.currency,
      notes: payment.notes,
      invoiceNumber: invoice?.number,
      invoiceTotal: Number(invoice?.total || 0),
      invoiceBalance,
      invoiceStatus: invoiceFinancialStatus,
      invoiceCurrency: invoice?.currency || null,
      appliedAmount:
        invoice && payment
          ? convertCurrencyAmount(
              financial.netAmountBase,
              payment.base_currency ||
                invoice.base_currency ||
                "DOP",
              invoice.currency || "USD",
              Number(
                payment.exchange_rate ||
                  invoice.exchange_rate ||
                  1,
              ),
            )
          : null,
      financial,
      issuer: {
        name:
          readText(invoiceData, "issuerName") ||
          company?.company_name ||
          "Empresa",
        email: readText(invoiceData, "issuerEmail"),
        phone: readText(invoiceData, "issuerPhone"),
        address: issuerAddress,
        taxId:
          readText(invoiceData, "issuerTaxId") ||
          company?.tax_id,
      },
      client: {
        name:
          readText(invoiceData, "clientName") ||
          client?.contact_person,
        company:
          readText(invoiceData, "clientCompany") ||
          client?.company_name,
        email:
          readText(invoiceData, "clientEmail") ||
          client?.email,
        phone:
          readText(invoiceData, "clientPhone") ||
          client?.phone,
        address:
          readText(invoiceData, "clientAddress") ||
          client?.address,
        taxId:
          readText(invoiceData, "clientTaxId") ||
          client?.tax_id,
      },
    };
  }, [
    client,
    company,
    financial,
    invoice,
    invoiceBalance,
    invoiceFinancialStatus,
    payment,
  ]);

  if (!paymentId) return null;

  return (
    <SalesDocumentWorkspaceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        payment
          ? `Pago #${payment.payment_number || "—"}`
          : "Pago"
      }
      srTitle="Detalle del pago"
      status={
        financial ? (
          <StatusBadge status={financial.displayStatus} />
        ) : null
      }
      meta={
        financial && payment ? (
          <>
            <span>
              {formatCurrencyAmount(
                financial.netAmount,
                payment.currency || "USD",
              )}{" "}
              netos
            </span>
            {invoice?.number ? <span>{invoice.number}</span> : null}
          </>
        ) : null
      }
      actions={
        invoice?.id ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenInvoice?.(invoice.id)}
          >
            Abrir factura
          </Button>
        ) : null
      }
      tabs={workspaceTabs}
      activeTab={activeTab}
      onActiveTabChange={(value) =>
        setActiveTab(value as PaymentWorkspaceTab)
      }
    >
      {loading || !payment || !financial ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-normal text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando pago...
        </div>
      ) : (
        <>
          <TabsContent value="receipt" className="mt-0">
            {receiptData ? (
              <PaymentReceiptPreview data={receiptData} />
            ) : null}
          </TabsContent>

          <TabsContent value="details" className="mt-0">
            <div className="min-w-0 space-y-5">
              <section className="grid gap-4 border-b border-slate-100 pb-5 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    Monto original
                  </div>
                  <div className="mt-1 text-lg font-normal text-slate-950">
                    {formatCurrencyAmount(
                      financial.originalAmount,
                      payment.currency || "USD",
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    Reembolsado
                  </div>
                  <div className="mt-1 text-lg font-normal text-slate-950">
                    {formatCurrencyAmount(
                      financial.movementAmount,
                      payment.currency || "USD",
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    Cobrado neto
                  </div>
                  <div className="mt-1 text-2xl font-normal text-slate-950">
                    {formatCurrencyAmount(
                      financial.netAmount,
                      payment.currency || "USD",
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-5 border-b border-slate-100 pb-5 sm:grid-cols-2">
                <DetailField
                  label="Número"
                  value={String(payment.payment_number || "—")}
                />
                <DetailField
                  label="Fecha"
                  value={formatDate(payment.payment_date)}
                />
                <DetailField
                  label="Método"
                  value={payment.method}
                />
                <DetailField
                  label="Referencia"
                  value={payment.reference}
                />
                <DetailField
                  label="Factura"
                  value={invoice?.number}
                />
                <DetailField
                  label="Estado factura"
                  value={invoiceFinancialStatus}
                />
                <DetailField
                  label="Saldo factura"
                  value={
                    invoice && invoiceBalance !== null
                      ? formatCurrencyAmount(
                          invoiceBalance,
                          invoice.currency || payment.currency || "USD",
                        )
                      : null
                  }
                />
                <DetailField
                  label="Cliente"
                  value={
                    client?.company_name ||
                    client?.contact_person ||
                    readText(invoice?.invoice_data || {}, "clientCompany") ||
                    readText(invoice?.invoice_data || {}, "clientName")
                  }
                />
              </section>

              {payment.notes ? (
                <section className="border-b border-slate-100 pb-5">
                  <DetailField
                    label="Notas"
                    value={payment.notes}
                  />
                </section>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="movements" className="mt-0">
            <PaymentMovementsPanel
              paymentId={payment.id}
              paymentStatus={payment.status}
              invoiceId={payment.invoice_id}
              currency={payment.currency || "USD"}
              availableAmount={financial.netAmount}
              onChanged={() => setMovementRefresh((value) => value + 1)}
            />
          </TabsContent>

          <TabsContent value="receipts" className="mt-0">
            <PaymentReceiptsPanel
              paymentId={payment.id}
              invoiceId={payment.invoice_id}
              canUpload
              compact
              title="Comprobantes adjuntos"
            />
          </TabsContent>
        </>
      )}
    </SalesDocumentWorkspaceDialog>
  );
}
