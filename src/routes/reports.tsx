import { createFileRoute } from "@tanstack/react-router";
import { SalesReportCenter } from "@/components/reports/sales-report-center";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Corevix CRM" }] }),
});

function ReportsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sales reports, generated tables, filters and exportable financial data.
        </p>
      </div>
      <SalesReportCenter />
    </div>
  );
}
