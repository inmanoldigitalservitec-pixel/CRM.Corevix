import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/document-builder-test")({
  component: DocumentBuilderDisabledRoute,
});

function DocumentBuilderDisabledRoute() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Document Builder test desactivado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta ruta de laboratorio está desactivada en este branch. El builder real de propuestas está
        en /proposal-builder/:id.
      </p>
    </div>
  );
}
