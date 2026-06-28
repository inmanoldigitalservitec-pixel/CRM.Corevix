import { createFileRoute } from "@tanstack/react-router";
import { SpreadsheetBuilderTest } from "@/components/spreadsheet-builder/spreadsheet-builder-test";

export const Route = createFileRoute("/spreadsheet-builder-test")({
  component: SpreadsheetBuilderTest,
  head: () => ({
    meta: [{ title: "Spreadsheet Builder Test — Corevix CRM" }],
  }),
});
