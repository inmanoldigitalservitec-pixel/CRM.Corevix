export type ClientLinkedEstimate = {
  id: string;
  client_id: string | null;
};

export function groupEstimatesByClient<T extends ClientLinkedEstimate>(estimates: T[]) {
  const grouped = new Map<string, T[]>();

  for (const estimate of estimates) {
    if (!estimate.client_id) continue;
    const clientEstimates = grouped.get(estimate.client_id) || [];
    clientEstimates.push(estimate);
    grouped.set(estimate.client_id, clientEstimates);
  }

  return grouped;
}
