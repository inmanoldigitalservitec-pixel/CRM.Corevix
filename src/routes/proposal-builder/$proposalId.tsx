import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ProposalDocumentBuilder = lazy(() =>
  import("@/components/document-builder/proposal-document-builder").then((mod) => ({
    default: mod.ProposalDocumentBuilder,
  })),
);

export const Route = createFileRoute("/proposal-builder/$proposalId")({
  component: ProposalBuilderRoute,
  head: () => ({ meta: [{ title: "Proposal Builder — Corevix CRM" }] }),
});

function ProposalBuilderRoute() {
  const { proposalId } = Route.useParams();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando editor...</div>}>
      <ProposalDocumentBuilder proposalId={proposalId} />
    </Suspense>
  );
}
