export function normalizeStatus(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeStage(value?: string | null) {
  return normalizeStatus(value);
}

export function isPaidInvoiceStatus(status?: string | null) {
  return normalizeStatus(status) === "paid";
}

export function isCancelledInvoiceStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "cancelled" || normalized === "canceled" || normalized === "void";
}

export function isOpenInvoiceStatus(status?: string | null) {
  return !isPaidInvoiceStatus(status) && !isCancelledInvoiceStatus(status);
}

export function isSentInvoiceStatus(status?: string | null) {
  return normalizeStatus(status) === "sent";
}

export function isOverdueInvoiceStatus(status?: string | null) {
  return normalizeStatus(status) === "overdue";
}

export function isCompletedTaskStatusValue(status?: string | null) {
  const normalized = normalizeStatus(status);
  return (
    normalized === "completed" ||
    normalized === "done" ||
    normalized === "cancelled" ||
    normalized === "canceled"
  );
}

export function isActiveProjectStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized !== "completed" && normalized !== "cancelled" && normalized !== "canceled";
}

export function isPendingProposalStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return (
    normalized === "draft" ||
    normalized === "pending" ||
    normalized === "sent" ||
    normalized === "viewed"
  );
}

export function isApprovedProposalStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "accepted" || normalized === "approved";
}

export function isClosedLeadStatusValue(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "won" || normalized === "lost" || normalized === "converted";
}

export function isWonDealStageValue(stage?: string | null) {
  const normalized = normalizeStage(stage);

  return (
    normalized === "won" ||
    normalized === "closed_won" ||
    normalized.includes("closed_won") ||
    normalized.includes("ganad") ||
    normalized.includes("win")
  );
}

export function isLostDealStageValue(stage?: string | null) {
  const normalized = normalizeStage(stage);

  return (
    normalized === "lost" ||
    normalized === "closed_lost" ||
    normalized.includes("closed_lost") ||
    normalized.includes("perdid") ||
    normalized.includes("lost")
  );
}

export function isClosedDealStageValue(stage?: string | null) {
  return isWonDealStageValue(stage) || isLostDealStageValue(stage);
}

export function isOpenConversationStatus(status?: string | null) {
  return normalizeStatus(status) === "open";
}

export function isNewLeadStatus(status?: string | null) {
  return normalizeStatus(status) === "new";
}

export function isViewedProposalStatus(status?: string | null) {
  return normalizeStatus(status) === "viewed";
}

export function isSentOrOverdueInvoiceStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "sent" || normalized === "overdue";
}

export function isSentOrViewedProposalStatus(status?: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === "sent" || normalized === "viewed";
}

export function isInProgressTaskStatusValue(status?: string | null) {
  return normalizeStatus(status) === "in_progress";
}
