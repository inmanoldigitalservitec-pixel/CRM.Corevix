import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/payments")({ component: PaymentsPage, head: () => ({ meta: [{ title: "Payments — Corevix CRM" }] }) });
const STATUSES = ["Pending", "Completed", "Failed", "Refunded"];
const METHODS = ["Manual", "Cash", "Card", "Bank Transfer", "Check", "Other"];

function PaymentsPage() {
  return <SalesBasicPage config={{
    routeTitle: "Payments",
    subtitle: "Registro de pagos recibidos y relacionados a facturas o clientes.",
    table: "payments",
    module: "payments",
    numberKey: "payment_number",
    titleKey: "reference",
    amountKey: "amount",
    dateKey: "payment_date",
    statusKey: "status",
    statuses: STATUSES,
    primaryLabel: "Payment",
    defaultValues: { reference: "", invoice_id: "none", client_id: "none", amount: "0", payment_date: new Date().toISOString().slice(0, 10), method: "Manual", status: "Completed", notes: "" },
    fields: [
      { key: "reference", label: "Reference", type: "text", span: 2 },
      { key: "invoice_id", label: "Invoice", type: "select" },
      { key: "client_id", label: "Client", type: "select" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "payment_date", label: "Payment Date", type: "date" },
      { key: "method", label: "Method", type: "select", options: METHODS.map((value) => ({ label: value, value })) },
      { key: "status", label: "Status", type: "select", options: STATUSES.map((value) => ({ label: value, value })) },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  }} />;
}
