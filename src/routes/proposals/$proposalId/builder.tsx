import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";

const ProposalDocumentBuilder = lazy(() =>
  import.meta.env.SSR
    ? Promise.resolve({
        default: () => (
          <div className="p-6 text-sm text-muted-foreground">
            Cargando editor de propuesta...
          </div>
        ),
      })
    : import("@/components/document-builder/proposal-document-builder").then((mod) => ({
        default: mod.ProposalDocumentBuilder,
      })),
);

export const Route = createFileRoute("/proposals/$proposalId/builder")({
  component: ProposalBuilderRoute,
  head: () => ({ meta: [{ title: "Proposal Builder — Corevix CRM" }] }),
});

function ProposalBuilderRoute() {
  const { proposalId } = Route.useParams();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur">
        <div>
          <div className="text-sm font-extrabold text-slate-950">Proposal Builder</div>
          <div className="text-xs font-medium text-slate-500">Editor visual client-only</div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/proposals">Volver a propuestas</Link>
        </Button>
      </div>

      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando editor de propuesta...</div>}>
        <ProposalDocumentBuilder proposalId={proposalId} />
      </Suspense>
    </div>
  );
}
