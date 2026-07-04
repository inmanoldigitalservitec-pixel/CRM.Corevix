import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

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
  component: PaymentsPage,
  head: () => ({ meta: [{ title: "Pagos — Corevix CRM" }] }),
});
const STATUSES = ["Pending", "Completed", "Failed", "Refunded"];
const METHODS = ["Manual", "Cash", "Card", "Bank Transfer", "Check", "Other"];

function PaymentsPage() {
  return (
    <SalesBasicPage
      config={{
        routeTitle: "Pagos",
        subtitle: "Registro de pagos recibidos y relacionados a facturas o clientes.",
        table: "payments",
        module: "payments",
        numberKey: "payment_number",
        titleKey: "reference",
        amountKey: "amount",
        dateKey: "payment_date",
        statusKey: "status",
        statuses: STATUSES,
        primaryLabel: "pago",
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
  );
}
