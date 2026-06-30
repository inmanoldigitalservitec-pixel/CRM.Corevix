import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SpreadsheetBuilderTest = lazy(() =>
  import.meta.env.SSR
    ? Promise.resolve({
        default: () => (
          <div className="p-6 text-sm text-muted-foreground">
            Cargando editor de hojas...
          </div>
        ),
      })
    : import("@/components/spreadsheet-builder/spreadsheet-builder-test").then((mod) => ({
        default: mod.SpreadsheetBuilderTest,
      }))
);

export const Route = createFileRoute("/spreadsheet-builder-test")({
  component: SpreadsheetBuilderTestRoute,
});

function SpreadsheetBuilderTestRoute() {
  return (
    <Suspense fallback={<div className="p-6">Cargando editor de hojas...</div>}>
      <SpreadsheetBuilderTest />
    </Suspense>
  );
}
