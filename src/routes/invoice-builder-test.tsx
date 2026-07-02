import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/invoice-builder-test")({
  component: InvoiceBuilderDisabledRoute,
});

function InvoiceBuilderDisabledRoute() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Invoice Builder test desactivado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta ruta de laboratorio está desactivada en este branch para evitar chunks pesados durante la prueba de Cloudflare.
      </p>
    </div>
  );
}
