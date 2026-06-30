import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const InvoiceBuilderTest = lazy(() =>
  import.meta.env.SSR
    ? Promise.resolve({
        default: () => (
          <div className="p-6 text-sm text-muted-foreground">
            Cargando editor de facturas...
          </div>
        ),
      })
    : import("@/components/invoice-builder/invoice-builder-test").then((mod) => ({
        default: mod.InvoiceBuilderTest,
      }))
);

export const Route = createFileRoute("/invoice-builder-test")({
  component: InvoiceBuilderTestRoute,
});

function InvoiceBuilderTestRoute() {
  return (
    <Suspense fallback={<div className="p-6">Cargando editor de facturas...</div>}>
      <InvoiceBuilderTest />
    </Suspense>
  );
}
