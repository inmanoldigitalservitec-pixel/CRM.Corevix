import { createFileRoute } from "@tanstack/react-router";
import { SalesBasicPage } from "@/components/sales/sales-basic-page";

export const Route = createFileRoute("/estimates")({
  component: EstimatesPage,
  head: () => ({ meta: [{ title: "Estimates — Corevix CRM" }] }),
});

const STATUSES = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Converted"];

function EstimatesPage() {
  return (
    <SalesBasicPage
      config={{
        routeTitle: "Estimates",
        subtitle: "Cotizaciones previas a factura, relacionadas a clientes, proyectos o deals.",
        table: "estimates",
        module: "estimates",
        numberKey: "number",
        titleKey: "title",
        amountKey: "total",
        dateKey: "date_issued",
        statusKey: "status",
        statuses: STATUSES,
        primaryLabel: "Estimate",
        defaultValues: { title: "", client_id: "none", project_id: "none", deal_id: "none", subtotal: "0", tax: "0", total: "0", status: "Draft", date_issued: new Date().toISOString().slice(0, 10), expiry_date: "", notes: "" },
        fields: [
          { key: "title", label: "Title", type: "text", required: true, span: 2 },
          { key: "client_id", label: "Client", type: "select" },
          { key: "project_id", label: "Project", type: "select" },
          { key: "subtotal", label: "Subtotal", type: "number" },
          { key: "tax", label: "Tax", type: "number" },
          { key: "total", label: "Total", type: "number" },
          { key: "status", label: "Status", type: "select", options: STATUSES.map((value) => ({ label: value, value })) },
          { key: "date_issued", label: "Date Issued", type: "date" },
          { key: "expiry_date", label: "Expiry Date", type: "date" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      }}
    />
  );
}
