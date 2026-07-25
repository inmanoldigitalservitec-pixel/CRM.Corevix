import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/expenses")({
  component: ExpensesPage,
  head: () => ({ meta: [{ title: "Gastos — Corevix CRM" }] }),
});
const STATUSES = ["Pending", "Approved", "Paid", "Rejected"];
const DISPLAY_LABELS: Record<string, string> = {
  Pending: "Pendiente",
  Approved: "Aprobado",
  Paid: "Pagado",
  Rejected: "Rechazado",
};

function ExpensesPage() {
  return (
    <SalesBasicPage
      config={{
        routeTitle: "Gastos",
        subtitle: "Gastos operativos o relacionados a clientes y proyectos.",
        table: "expenses",
        module: "expenses",
        titleKey: "title",
        amountKey: "amount",
        dateKey: "expense_date",
        statusKey: "status",
        statuses: STATUSES,
        primaryLabel: "gasto",
        primaryActionLabel: "Nuevo gasto",
        defaultValues: {
          title: "",
          vendor: "",
          category: "General",
          amount: "0",
          status: "Pending",
          expense_date: new Date().toISOString().slice(0, 10),
          project_id: "none",
          client_id: "none",
          receipt_url: "",
          notes: "",
        },
        fields: [
          { key: "title", label: "Nombre", type: "text", required: true, span: 2 },
          { key: "vendor", label: "Proveedor", type: "text" },
          { key: "category", label: "Categoría", type: "text" },
          { key: "amount", label: "Monto", type: "number", required: true },
          {
            key: "status",
            label: "Estado",
            type: "select",
            options: STATUSES.map((value) => ({
              label: value,
              value,
              displayLabel: DISPLAY_LABELS[value] ?? value,
            })),
          },
          { key: "expense_date", label: "Fecha del gasto", type: "date" },
          { key: "project_id", label: "Proyecto", type: "select" },
          { key: "client_id", label: "Cliente", type: "select" },
          { key: "receipt_url", label: "URL del comprobante", type: "text", span: 2 },
          { key: "notes", label: "Notas", type: "textarea" },
        ],
      }}
    />
  );
}
