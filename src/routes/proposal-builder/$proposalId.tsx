import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

type BuilderProps = { proposalId: string };

const ProposalDocumentBuilder = lazy(() =>
  import.meta.env.SSR
    ? Promise.resolve({
        default: ({ proposalId }: BuilderProps) => (
          <div className="p-6 text-sm text-muted-foreground">
            Cargando editor de propuesta {proposalId}...
          </div>
        ),
      })
    : import("@/components/document-builder/proposal-document-builder").then((mod) => ({
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
    <div className="proposal-builder-route -mt-14">
      <style>{`
        .proposal-builder-route [class*="top-14"]{top:0!important}
        .proposal-builder-route main{padding-top:12px!important}
      `}</style>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando editor...</div>}>
        <ProposalDocumentBuilder proposalId={proposalId} />
      </Suspense>
    </div>
  );
}
