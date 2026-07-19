import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/page-header";
import { SalesReportCenter } from "@/components/reports/sales-report-center";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Corevix CRM" }] }),
});

function ReportsPage() {
  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <PageHeader
        title="Reportes"
        subtitle="Tablas generadas, filtros y datos financieros exportables."
      />
      <SalesReportCenter />
    </div>
  );
}
