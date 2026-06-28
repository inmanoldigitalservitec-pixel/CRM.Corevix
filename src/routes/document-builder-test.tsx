import { createFileRoute } from "@tanstack/react-router";
import { DocumentBuilderTinyMCE } from "@/components/document-builder/document-builder-tinymce";

export const Route = createFileRoute("/document-builder-test")({
  component: DocumentBuilderTinyMCE,
  head: () => ({
    meta: [{ title: "Document Builder Test — Corevix CRM" }],
  }),
});
