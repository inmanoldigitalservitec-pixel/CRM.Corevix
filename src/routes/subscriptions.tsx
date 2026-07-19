import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
  head: () => ({ meta: [{ title: "Subscriptions — Corevix CRM" }] }),
});
const STATUSES = ["Trial", "Active", "Paused", "Cancelled", "Expired"];
const CYCLES = ["Weekly", "Monthly", "Quarterly", "Yearly"];
function SubscriptionsPage() {
  return (
    <SalesBasicPage
      config={{
        routeTitle: "Subscriptions",
        subtitle: "Ingresos recurrentes, ciclos de cobro y clientes activos.",
        table: "subscriptions",
        module: "subscriptions",
        titleKey: "name",
        amountKey: "amount",
        dateKey: "next_billing_date",
        statusKey: "status",
        statuses: STATUSES,
        primaryLabel: "Subscription",
        defaultValues: {
          name: "",
          client_id: "none",
          product_id: "none",
          amount: "0",
          billing_cycle: "Monthly",
          status: "Active",
          start_date: new Date().toISOString().slice(0, 10),
          next_billing_date: "",
          end_date: "",
          notes: "",
        },
        fields: [
          { key: "name", label: "Name", type: "text", required: true, span: 2 },
          { key: "client_id", label: "Client", type: "select" },
          { key: "product_id", label: "Product", type: "select" },
          { key: "amount", label: "Amount", type: "number", required: true },
          {
            key: "billing_cycle",
            label: "Billing Cycle",
            type: "select",
            options: CYCLES.map((value) => ({ label: value, value })),
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: STATUSES.map((value) => ({ label: value, value })),
          },
          { key: "start_date", label: "Start Date", type: "date" },
          { key: "next_billing_date", label: "Next Billing", type: "date" },
          { key: "end_date", label: "End Date", type: "date" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      }}
    />
  );
}
