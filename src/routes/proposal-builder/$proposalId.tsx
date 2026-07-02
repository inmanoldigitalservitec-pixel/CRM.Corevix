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
        .proposal-builder-route .proposal-tinymce-shell{max-width:1120px!important;background:#eef2f7!important;border-color:#dbe3ee!important}
        .proposal-builder-route .proposal-tinymce-shell .tox{border:0!important;background:#eef2f7!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-edit-area{background:#e8edf3!important;padding:28px 0!important;overflow:auto!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-edit-area iframe{display:block!important;width:816px!important;max-width:calc(100vw - 170px)!important;height:1056px!important;min-height:1056px!important;margin:0 auto!important;background:#fff!important;border:1px solid #d8dee8!important;box-shadow:0 18px 45px rgba(15,23,42,.16)!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-statusbar{background:#fff!important;border-top:1px solid #e2e8f0!important}
      `}</style>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando editor...</div>}>
        <ProposalDocumentBuilder proposalId={proposalId} />
      </Suspense>
    </div>
  );
}
