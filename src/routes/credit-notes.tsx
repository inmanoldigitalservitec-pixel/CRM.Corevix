import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/credit-notes")({ component: CreditNotesPage });
const STATUSES = ["Draft", "Issued", "Applied", "Cancelled"];
function CreditNotesPage() {
  return <SalesBasicPage config={{ routeTitle: "Credit Notes", subtitle: "Ajustes y balances a favor del cliente.", table: "credit_notes", module: "credit_notes", numberKey: "credit_note_number", titleKey: "reason", amountKey: "amount", dateKey: "date_issued", statusKey: "status", statuses: STATUSES, primaryLabel: "Credit Note", defaultValues: { reason: "", invoice_id: "none", client_id: "none", amount: "0", status: "Draft", date_issued: new Date().toISOString().slice(0, 10), notes: "" }, fields: [{ key: "reason", label: "Reason", type: "text", required: true, span: 2 }, { key: "invoice_id", label: "Invoice", type: "select" }, { key: "client_id", label: "Client", type: "select" }, { key: "amount", label: "Amount", type: "number", required: true }, { key: "date_issued", label: "Date", type: "date" }, { key: "status", label: "Status", type: "select", options: STATUSES.map((value) => ({ label: value, value })) }, { key: "notes", label: "Notes", type: "textarea" }] }} />;
}
