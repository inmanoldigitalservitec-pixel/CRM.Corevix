import { createFileRoute } from "@tanstack/react-router";
import { InvoiceBuilderTest } from "@/components/invoice-builder/invoice-builder-test";

export const Route = createFileRoute("/invoice-builder-test")({
  component: InvoiceBuilderTest,
  head: () => ({
    meta: [{ title: "Invoice Builder Test — Corevix CRM" }],
  }),
});
