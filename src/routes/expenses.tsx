import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage, head: () => ({ meta: [{ title: "Expenses — Corevix CRM" }] }) });
const STATUSES = ["Pending", "Approved", "Paid", "Rejected"];
function ExpensesPage() {
  return <SalesBasicPage config={{ routeTitle: "Expenses", subtitle: "Gastos operativos o relacionados a clientes y proyectos.", table: "expenses", module: "expenses", titleKey: "title", amountKey: "amount", dateKey: "expense_date", statusKey: "status", statuses: STATUSES, primaryLabel: "Expense", defaultValues: { title: "", vendor: "", category: "General", amount: "0", status: "Pending", expense_date: new Date().toISOString().slice(0, 10), project_id: "none", client_id: "none", receipt_url: "", notes: "" }, fields: [{ key: "title", label: "Title", type: "text", required: true, span: 2 }, { key: "vendor", label: "Vendor", type: "text" }, { key: "category", label: "Category", type: "text" }, { key: "amount", label: "Amount", type: "number", required: true }, { key: "status", label: "Status", type: "select", options: STATUSES.map((value) => ({ label: value, value })) }, { key: "expense_date", label: "Expense Date", type: "date" }, { key: "project_id", label: "Project", type: "select" }, { key: "client_id", label: "Client", type: "select" }, { key: "receipt_url", label: "Receipt URL", type: "text", span: 2 }, { key: "notes", label: "Notes", type: "textarea" }] }} />;
}
