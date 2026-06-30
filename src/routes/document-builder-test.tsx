import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const DocumentBuilderTest = lazy(() =>
  import.meta.env.SSR
    ? Promise.resolve({
        default: () => (
          <div className="p-6 text-sm text-muted-foreground">
            Cargando editor de documentos...
          </div>
        ),
      })
    : import("@/components/document-builder/document-builder-test").then((mod) => ({
        default: mod.DocumentBuilderTest,
      }))
);

export const Route = createFileRoute("/document-builder-test")({
  component: DocumentBuilderTestRoute,
});

function DocumentBuilderTestRoute() {
  return (
    <Suspense fallback={<div className="p-6">Cargando editor de documentos...</div>}>
      <DocumentBuilderTest />
    </Suspense>
  );
}
