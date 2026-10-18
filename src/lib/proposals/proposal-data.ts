export function withoutProductWorkflowSteps<T extends Record<string, unknown>>(data: T) {
  const { processSteps: _productWorkflowSteps, ...manualProposalData } = data;
  return manualProposalData;
}
