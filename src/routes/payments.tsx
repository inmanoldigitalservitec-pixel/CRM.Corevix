import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { PaymentWorkspaceDialog } from "@/components/payments/payment-workspace-dialog";
import { deletePaymentReceiptsForPayment } from "@/lib/payments/payment-receipts";
import { loadInvoicePaymentBalance } from "@/lib/payments/invoice-payment-balance";
import {
  loadPaymentNetBalance,
  type PaymentMovementSummary,
} from "@/lib/payments/payment-net-balance";
import { normalizeCurrency } from "@/lib/currency";

const DISPLAY_LABELS: Record<string, string> = {
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  Completed: "Completado",
  Cancelled: "Cancelado",
  "To Do": "Por hacer",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  Draft: "Borrador",
  Sent: "Enviado",
  Accepted: "Aceptado",
  Declined: "Rechazado",
  Expired: "Expirado",
  Converted: "Convertido",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  "Partially Refunded": "Parcialmente reembolsado",
  Reversed: "Revertido",
  "Review Required": "Revisar movimiento",
  Issued: "Emitida",
  Applied: "Aplicada",
  Active: "Activo",
  Signed: "Firmado",
  "Not Signed": "Sin firmar",
  "Pending Signature": "Pendiente de firma",
  Linked: "Vinculada",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

export const Route = createFileRoute("/payments")({
  validateSearch: (search: Record<string, unknown>): { invoiceId?: string } => ({
    invoiceId: typeof search.invoiceId === "string" ? search.invoiceId : undefined,
  }),
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Pagos — Corevix CRM" }] }),
});
const STATUSES = ["Pending", "Completed", "Failed"];
const METHODS = ["Manual", "Cash", "Card", "Bank Transfer", "Check", "Other"];

function PaymentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { invoiceId } = Route.useSearch();
  const [invoiceDefaults, setInvoiceDefaults] = useState<Record<string, string> | undefined>();
  const [invoiceParamError, setInvoiceParamError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentWorkspaceOpen, setPaymentWorkspaceOpen] = useState(false);

  const enrichPaymentRows = useCallback(
    async (rows: Record<string, any>[]) => {
      const paymentIds = rows.map((payment) => String(payment.id)).filter(Boolean);
      const movementSummaryByPayment = new Map<string, PaymentMovementSummary>();

      if (paymentIds.length) {
        const { data: movements, error } = await (supabase as any)
          .from("payment_movements")
          .select("original_payment_id,movement_type,amount,amount_base")
          .eq("company_id", profile?.company_id)
          .in("original_payment_id", paymentIds);
        if (error) throw error;

        for (const movement of movements || []) {
          const paymentId = String(movement.original_payment_id);
          const summary = movementSummaryByPayment.get(paymentId) || {
            refundAmount: 0,
            refundAmountBase: 0,
            reversalAmount: 0,
            reversalAmountBase: 0,
            refundMovementCount: 0,
            reversalMovementCount: 0,
          };
          if (movement.movement_type === "Refund") {
            summary.refundAmount += Number(movement.amount || 0);
            summary.refundAmountBase += Number(movement.amount_base || 0);
            summary.refundMovementCount += 1;
          } else if (movement.movement_type === "Reversal") {
            summary.reversalAmount += Number(movement.amount || 0);
            summary.reversalAmountBase += Number(movement.amount_base || 0);
            summary.reversalMovementCount += 1;
          }
          movementSummaryByPayment.set(paymentId, summary);
        }
      }

      const enriched = await Promise.all(
        rows.map(async (payment) => {
          const movementSummary = movementSummaryByPayment.get(String(payment.id)) || {
            refundAmount: 0,
            refundAmountBase: 0,
            reversalAmount: 0,
            reversalAmountBase: 0,
            refundMovementCount: 0,
            reversalMovementCount: 0,
          };
          const balance = await loadPaymentNetBalance(
            payment,
            profile?.company_id,
            movementSummary,
          );

          return {
            ...payment,
            original_amount: balance.originalAmount,
            original_amount_base: balance.originalAmountBase,
            movement_amount: balance.movementAmount,
            movement_amount_base: balance.movementAmountBase,
            net_amount: balance.netAmount,
            net_amount_base: balance.netAmountBase,
            display_status: balance.displayStatus,
            refundMovementCount: balance.refundMovementCount,
          };
        }),
      );

      return enriched.sort(
        (left, right) => Number(right.payment_number || 0) - Number(left.payment_number || 0),
      );
    },
    [profile?.company_id],
  );

  useEffect(() => {
    let cancelled = false;
    const loadInvoiceDefaults = async () => {
      setInvoiceDefaults(undefined);
      setInvoiceParamError(null);
      if (!invoiceId) return;
      if (!profile?.company_id) return;

      try {
        const db = supabase as any;
        const { data: invoice, error: invoiceError } = await db
          .from("invoices")
          .select("id, number, client_id, total, currency, invoice_data")
          .eq("company_id", profile.company_id)
          .eq("id", invoiceId)
          .maybeSingle();
        if (invoiceError) throw invoiceError;
        if (!invoice) {
          if (!cancelled) setInvoiceParamError("No se encontró la factura indicada.");
          return;
        }

        const balance = await loadInvoicePaymentBalance(invoice, profile.company_id);
        if (!cancelled) {
          setInvoiceDefaults({
            reference: invoice.number ? `Pago ${invoice.number}` : "",
            invoice_id: String(invoice.id),
            client_id: invoice.client_id ? String(invoice.client_id) : "none",
            amount: String(balance.outstandingBalance || Number(invoice.total || 0) || 0),
            currency: normalizeCurrency(invoice.currency || invoice.invoice_data?.currency),
            status: "Completed",
          });
        }
      } catch (error: any) {
        if (!cancelled) setInvoiceParamError(error?.message || "No se pudo cargar la factura.");
      }
    };

    void loadInvoiceDefaults();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, profile?.company_id]);

  const paymentInitialValues = useMemo(() => invoiceDefaults, [invoiceDefaults]);

  return (
    <>
      {invoiceParamError ? (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 sm:mx-6">
          {invoiceParamError}
        </div>
      ) : null}
      <SalesBasicPage
        initialFieldValues={paymentInitialValues}
        autoOpenCreate={Boolean(invoiceId && paymentInitialValues)}
        onCreateAction={() => setPaymentDialogOpen(true)}
        refreshSignal={refreshSignal}
        enrichRows={enrichPaymentRows}
        displayAmountKey="net_amount"
        displayStatusKey="display_status"
        summaryLabel="Cobrado neto"
        enableDelete
        canDeleteRow={(payment) => payment.status === "Pending"}
        onOpenRow={(payment) => {
          setSelectedPaymentId(String(payment.id));
          setPaymentWorkspaceOpen(true);
        }}
        beforeDelete={async (payment) => {
          if (!profile?.company_id) throw new Error("No hay contexto de compañía.");
          await deletePaymentReceiptsForPayment(String(payment.id), profile.company_id);
        }}
        createDialog={
          <PaymentFormDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            initialValues={paymentInitialValues}
            mode={invoiceId ? "invoice" : "unapplied"}
            onCreated={() => {
              setRefreshSignal((current) => current + 1);
              if (invoiceId)
                toast.success("Pago registrado. Puedes volver a Facturas cuando lo necesites.");
            }}
          />
        }
        config={{
          routeTitle: "Pagos",
          subtitle: "Consulta pagos registrados, reembolsos y anticipos recibidos.",
          table: "payments",
          module: "payments",
          numberKey: "payment_number",
          titleKey: "reference",
          amountKey: "amount",
          dateKey: "payment_date",
          statusKey: "status",
          statuses: STATUSES,
          filterStatuses: [
            ...STATUSES,
            "Partially Refunded",
            "Refunded",
            "Reversed",
            "Review Required",
          ],
          primaryLabel: "pago sin aplicar",
          primaryActionLabel: "Nuevo pago",
          defaultValues: {
            reference: "",
            invoice_id: "none",
            client_id: "none",
            amount: "0",
            payment_date: new Date().toISOString().slice(0, 10),
            method: "Manual",
            status: "Completed",
            notes: "",
          },
          fields: [
            { key: "reference", label: "Referencia", type: "text", span: 2 },
            { key: "invoice_id", label: "Factura", type: "select" },
            { key: "client_id", label: "Cliente", type: "select" },
            { key: "amount", label: "Monto", type: "number", required: true },
            { key: "payment_date", label: "Fecha de pago", type: "date" },
            {
              key: "method",
              label: "Método",
              type: "select",
              options: METHODS.map((value) => ({
                label: value,
                value,
                displayLabel: displayLabel(value),
              })),
            },
            {
              key: "status",
              label: "Estado",
              type: "select",
              options: STATUSES.map((value) => ({
                label: value,
                value,
                displayLabel: displayLabel(value),
              })),
            },
            { key: "notes", label: "Notas", type: "textarea" },
          ],
        }}
      />

      <PaymentWorkspaceDialog
        paymentId={selectedPaymentId}
        open={paymentWorkspaceOpen}
        onOpenChange={setPaymentWorkspaceOpen}
        onOpenInvoice={(nextInvoiceId) => {
          setPaymentWorkspaceOpen(false);
          void navigate({
            to: "/invoices",
            search: { invoiceId: nextInvoiceId } as any,
          });
        }}
      />
    </>
  );
}
