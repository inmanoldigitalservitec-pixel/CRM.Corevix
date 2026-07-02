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
        .proposal-builder-route main{padding:12px 0 28px!important;background:#eef2f7!important;overflow:auto!important}
        .proposal-builder-route main>.proposal-tinymce-shell{width:816px!important;max-width:calc(100vw - 190px)!important;margin:0 auto!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
        .proposal-builder-route .proposal-tinymce-shell .tox{width:816px!important;max-width:100%!important;margin:0 auto!important;border:0!important;background:transparent!important;box-shadow:none!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-editor-container{width:816px!important;max-width:100%!important;margin:0 auto!important;background:transparent!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-editor-header{width:816px!important;max-width:100%!important;margin:0 auto!important;border:1px solid #d8dee8!important;border-bottom:0!important;border-radius:12px 12px 0 0!important;box-shadow:0 8px 24px rgba(15,23,42,.08)!important;overflow:hidden!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-edit-area{width:816px!important;max-width:100%!important;margin:0 auto!important;background:#fff!important;border:1px solid #d8dee8!important;border-top:0!important;box-shadow:0 18px 45px rgba(15,23,42,.16)!important;overflow:hidden!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-edit-area iframe{display:block!important;width:100%!important;max-width:100%!important;height:1056px!important;min-height:1056px!important;margin:0!important;background:#fff!important;border:0!important;box-shadow:none!important}
        .proposal-builder-route .proposal-tinymce-shell .tox-statusbar{width:816px!important;max-width:100%!important;margin:0 auto!important;background:#fff!important;border:1px solid #d8dee8!important;border-top:0!important;border-radius:0 0 12px 12px!important}
      `}</style>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando editor...</div>}>
        <ProposalDocumentBuilder proposalId={proposalId} />
      </Suspense>
    </div>
  );
}
