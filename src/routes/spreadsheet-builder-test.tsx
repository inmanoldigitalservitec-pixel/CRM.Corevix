import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/spreadsheet-builder-test")({
  component: SpreadsheetBuilderDisabledRoute,
});

function SpreadsheetBuilderDisabledRoute() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Spreadsheet Builder desactivado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta ruta de laboratorio está desactivada en este branch para mantener el build liviano en
        Cloudflare.
      </p>
    </div>
  );
}
