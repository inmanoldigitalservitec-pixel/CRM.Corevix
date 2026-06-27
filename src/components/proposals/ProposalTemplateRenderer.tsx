import { SocialMediaProposalTemplate } from "@/components/proposals/templates/SocialMediaProposalTemplate";

export function ProposalTemplateRenderer({
  proposal,
  mode,
  onApprove,
}: {
  proposal: any;
  mode: "preview" | "public" | "admin";
  onApprove?: () => Promise<void>;
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
