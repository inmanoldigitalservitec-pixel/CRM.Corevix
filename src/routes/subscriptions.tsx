import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
  head: () => ({ meta: [{ title: "Suscripciones — Corevix CRM" }] }),
});
const STATUSES = ["Trial", "Active", "Paused", "Cancelled", "Expired"];
const CYCLES = ["Weekly", "Monthly", "Quarterly", "Yearly"];
const DISPLAY_LABELS: Record<string, string> = {
  Trial: "Prueba",
  Active: "Activa",
  Paused: "Pausada",
  Cancelled: "Cancelada",
  Expired: "Expirada",
  Weekly: "Semanal",
  Monthly: "Mensual",
  Quarterly: "Trimestral",
  Yearly: "Anual",
};

function SubscriptionsPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <SalesBasicPage
      config={{
        routeTitle: "Suscripciones",
        subtitle: "Ingresos recurrentes, ciclos de cobro y clientes activos.",
        table: "subscriptions",
        module: "subscriptions",
        titleKey: "name",
        amountKey: "amount",
        dateKey: "next_billing_date",
        statusKey: "status",
        statuses: STATUSES,
        primaryLabel: "suscripción",
        primaryActionLabel: "Nueva suscripción",
        defaultValues: {
          name: "",
          client_id: "none",
          product_id: "none",
          amount: "0",
          billing_cycle: "Monthly",
          status: "Active",
          start_date: today,
          next_billing_date: today,
          end_date: "",
          notes: "",
        },
        fields: [
          { key: "name", label: "Nombre", type: "text", required: true, span: 2 },
          { key: "client_id", label: "Cliente", type: "select" },
          { key: "product_id", label: "Producto", type: "select" },
          { key: "amount", label: "Monto", type: "number", required: true },
          {
            key: "billing_cycle",
            label: "Ciclo de cobro",
            type: "select",
            options: CYCLES.map((value) => ({
              label: value,
              value,
              displayLabel: DISPLAY_LABELS[value] ?? value,
            })),
          },
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
          { key: "start_date", label: "Fecha de inicio", type: "date" },
          { key: "next_billing_date", label: "Próximo cobro", type: "date" },
          { key: "end_date", label: "Fecha de cierre", type: "date" },
          { key: "notes", label: "Notas", type: "textarea" },
        ],
      }}
    />
  );
}
