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

export const Route = createFileRoute("/credit-notes")({ component: CreditNotesPage });
const STATUSES = ["Draft", "Issued", "Applied", "Cancelled"];
function CreditNotesPage() {
  return (
    <SalesBasicPage
      config={{
        routeTitle: "Notas de crédito",
        subtitle: "Ajustes y balances a favor del cliente.",
        table: "credit_notes",
        module: "credit_notes",
        numberKey: "credit_note_number",
        titleKey: "reason",
        amountKey: "amount",
        dateKey: "date_issued",
        statusKey: "status",
        statuses: STATUSES,
        primaryLabel: "nota de crédito",
        defaultValues: {
          reason: "",
          invoice_id: "none",
          client_id: "none",
          amount: "0",
          status: "Draft",
          date_issued: new Date().toISOString().slice(0, 10),
          notes: "",
        },
        fields: [
          { key: "reason", label: "Razón", type: "text", required: true, span: 2 },
          { key: "invoice_id", label: "Factura", type: "select" },
          { key: "client_id", label: "Cliente", type: "select" },
          { key: "amount", label: "Monto", type: "number", required: true },
          { key: "date_issued", label: "Fecha", type: "date" },
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
