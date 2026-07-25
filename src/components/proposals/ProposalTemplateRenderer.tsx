import { SocialMediaProposalTemplate } from "@/components/proposals/templates/SocialMediaProposalTemplate";
import { renderProposalTemplateHtml } from "@/components/proposals/proposal-template-rendering";
import { Button } from "@/components/ui/button";
import { Check, Printer } from "lucide-react";

export function ProposalTemplateRenderer({
  proposal,
  mode,
  items = [],
  approved = false,
  approving = false,
  onApprove,
  onPrint,
}: {
  proposal: any;
  mode: "preview" | "public" | "admin";
  items?: any[];
  approved?: boolean;
  approving?: boolean;
  onApprove?: () => void | Promise<void>;
  onPrint?: () => void;
}) {
  const templateKey = String(proposal?.template_key || "");
  const proposalData = (proposal?.proposal_data ?? null) as any;

  if (templateKey === "social_media_mobile") {
    return (
      <SocialMediaProposalTemplate
        proposalData={proposalData}
        proposalId={proposal?.id ?? null}
        publicToken={proposal?.public_token ?? null}
        mode={mode}
        onApprove={onApprove}
      />
    );
  }

  if (templateKey === "custom_html" && proposal?.content) {
    const html = renderProposalTemplateHtml(proposal, items);

    return (
      <main className="min-h-screen bg-[#eef1f6] px-4 py-6 text-slate-950 print:bg-white print:p-0">
        <style>{`
          @page { size: A4; margin: 0.48in; }
          @media print {
            html, body { background: #fff !important; }
            .proposal-print-toolbar { display: none !important; }
            .proposal-template-page { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
          }
          .proposal-template-page h1 { font-size: 30px; line-height: 1.1; margin: 0 0 16px; }
          .proposal-template-page h2 { font-size: 22px; line-height: 1.18; margin: 24px 0 10px; }
          .proposal-template-page h3 { font-size: 17px; line-height: 1.2; margin: 18px 0 8px; }
          .proposal-template-page p { margin: 0 0 12px; line-height: 1.65; }
          .proposal-template-page ul, .proposal-template-page ol { margin: 0 0 14px 22px; padding: 0; }
          .proposal-template-page img { max-width: 100%; height: auto; }
        `}</style>

        {mode === "public" ? (
          <div className="proposal-print-toolbar sticky top-3 z-20 mx-auto mb-4 flex max-w-[8.27in] flex-wrap items-center justify-end gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full border-slate-200 bg-white shadow-none"
              onClick={onPrint}
            >
              <Printer className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button
              type="button"
              className="h-9 rounded-full bg-slate-950 px-4 text-white shadow-none hover:bg-slate-800"
              onClick={onApprove}
              disabled={approved || approving}
            >
              <Check className="h-4 w-4" />
              {approved ? "Aprobada" : approving ? "Aprobando..." : "Aprobar"}
            </Button>
          </div>
        ) : null}

        <article
          className="proposal-template-page mx-auto w-full max-w-[8.27in] bg-white px-[0.45in] py-[0.42in] text-[14px] leading-6 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    );
  }

  return (
    <div className="p-5">
      <div className="text-lg font-semibold">Plantilla no disponible</div>
      <div className="mt-2 text-sm text-muted-foreground">
        Esta propuesta no tiene un template compatible. `template_key`:{" "}
        <span className="font-mono">{templateKey || "—"}</span>
      </div>
      <div className="mt-4 rounded-md border bg-background p-4 text-sm whitespace-pre-wrap">
        {proposal?.content || "—"}
      </div>
    </div>
  );
}
