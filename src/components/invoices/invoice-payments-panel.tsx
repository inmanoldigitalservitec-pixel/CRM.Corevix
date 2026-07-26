import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Loader2,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crm/empty-state";
import { PaymentReceiptsPanel } from "@/components/payments/payment-receipts-panel";
import { PaymentWorkspaceDialog } from "@/components/payments/payment-workspace-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyAmount } from "@/lib/currency";
import {
  loadPaymentNetBalance,
  type PaymentNetBalance,
} from "@/lib/payments/payment-net-balance";

type InvoicePaymentRow = {
  id: string;
  company_id: string;
  invoice_id: string | null;
  client_id: string | null;
  payment_number: number | string | null;
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

type EnrichedInvoicePayment = InvoicePaymentRow & {
  financial: PaymentNetBalance;
};

const METHOD_LABELS: Record<string, string> = {
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

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

export function InvoicePaymentsPanel({
  invoiceId,
  refreshKey,
}: {
  invoiceId: string;
  refreshKey?: number | string;
}) {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<EnrichedInvoicePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!invoiceId || !profile?.company_id) {
        setPayments([]);
        return;
      }

      setLoading(true);

      try {
        const db = supabase as any;
        const { data, error } = await db
          .from("payments")
          .select(
            "id,company_id,invoice_id,client_id,payment_number,amount,amount_base,currency,base_currency,payment_date,method,status,reference,notes,created_at",
          )
          .eq("company_id", profile.company_id)
          .eq("invoice_id", invoiceId)
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rows = (data || []) as InvoicePaymentRow[];

        const enriched = await Promise.all(
          rows.map(async (payment) => ({
            ...payment,
            financial: await loadPaymentNetBalance(
              payment,
              profile.company_id,
            ),
          })),
        );

        if (!cancelled) {
          setPayments(enriched);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("invoice payments load error:", error);
          toast.error(
            error?.message || "No se pudieron cargar los pagos de la factura.",
          );
          setPayments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [invoiceId, profile?.company_id, refreshKey]);

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-normal text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando pagos...
      </div>
    );
  }

  if (!payments.length) {
    return (
      <EmptyState
        icon={<CreditCard className="h-6 w-6" />}
        title="Sin pagos registrados"
        description="Esta factura todavía no tiene pagos asociados."
      />
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <div className="text-sm font-normal text-slate-950">
          Pagos asociados
        </div>
        <div className="mt-1 text-xs font-normal text-slate-500">
          Cada comprobante queda vinculado al pago correspondiente.
        </div>
      </div>

      <div className="divide-y divide-slate-100 border-y border-slate-100">
        {payments.map((payment) => {
          const currency =
            String(payment.currency || "").trim().toUpperCase() || "USD";
          const isExpanded = expandedPaymentId === payment.id;
          const financial = payment.financial;

          return (
            <article key={payment.id} className="py-4">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-normal text-slate-950">
                      Pago #{payment.payment_number || "—"}
                    </div>
                    <StatusBadge status={financial.displayStatus} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal text-slate-500">
                    <span>{formatDate(payment.payment_date)}</span>
                    <span>·</span>
                    <span>
                      {METHOD_LABELS[String(payment.method || "")] ||
                        payment.method ||
                        "Sin método"}
                    </span>
                    {payment.reference ? (
                      <>
                        <span>·</span>
                        <span className="break-all">{payment.reference}</span>
                      </>
                    ) : null}
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                        Monto original
                      </dt>
                      <dd className="mt-1 text-sm font-normal text-slate-950">
                        {formatCurrencyAmount(financial.originalAmount, currency)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                        Reembolsado
                      </dt>
                      <dd className="mt-1 text-sm font-normal text-slate-950">
                        {formatCurrencyAmount(financial.movementAmount, currency)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                        Cobrado neto
                      </dt>
                      <dd className="mt-1 text-base font-normal text-slate-950">
                        {formatCurrencyAmount(financial.netAmount, currency)}
                      </dd>
                    </div>
                  </dl>

                  {payment.notes ? (
                    <div className="mt-3 text-sm font-normal text-slate-600">
                      {payment.notes}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedPaymentId((current) =>
                        current === payment.id ? null : payment.id,
                      )
                    }
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Comprobantes
                    {isExpanded ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPaymentId(payment.id);
                      setWorkspaceOpen(true);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Recibo
                  </Button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <PaymentReceiptsPanel
                    paymentId={payment.id}
                    invoiceId={invoiceId}
                    canUpload
                    compact
                    title="Comprobantes adjuntos"
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <PaymentWorkspaceDialog
        paymentId={selectedPaymentId}
        open={workspaceOpen}
        onOpenChange={setWorkspaceOpen}
        initialTab="receipt"
        onOpenInvoice={() => setWorkspaceOpen(false)}
      />
    </div>
  );
}
