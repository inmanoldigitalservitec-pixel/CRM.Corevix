export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Sent: "Enviada",
  Viewed: "Vista",
  Approved: "Aprobada",
  Accepted: "Aceptada",
  Rejected: "Rechazada",
  Expired: "Vencida",
};

export function getProposalStatusLabel(status: string) {
  return PROPOSAL_STATUS_LABELS[status] || status;
}

export function hasEffectiveProposalApproval(status?: string | null, approvedAt?: string | null) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalizedStatus === "approved" || normalizedStatus === "accepted" || Boolean(approvedAt);
}

export function canTransitionProposalStatus(
  currentStatus: string,
  nextStatus: string,
  approvedAt?: string | null,
) {
  if (currentStatus === nextStatus) return true;
  if (!hasEffectiveProposalApproval(currentStatus, approvedAt)) return true;
  const normalizedNextStatus = String(nextStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalizedNextStatus === "approved" || normalizedNextStatus === "accepted";
}
