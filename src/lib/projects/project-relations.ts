export type ProjectRelationStrength = "direct" | "inferred" | "contextual";

export type ProjectRelationSource =
  | "project_id"
  | "related_project_id"
  | "contract_proposal"
  | "contract_invoice"
  | "project_deal"
  | "proposal_invoice"
  | "invoice_payment"
  | "client_context"
  | "lead_context"
  | "email_context"
  | "phone_context";

export type ProjectRelationDescriptor = {
  strength: ProjectRelationStrength;
  source: ProjectRelationSource;
  label: string;
};

type Identifiable = {
  id: string;
};

type ContractRelationSnapshot = {
  proposal_id?: string | null;
  invoice_id?: string | null;
};

type ProposalRelationSnapshot = {
  id: string;
  deal_id?: string | null;
};

type InvoiceRelationSnapshot = {
  id: string;
  proposal_id?: string | null;
};

export function compactIds(values: Array<string | number | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

export function dedupeById<T extends Identifiable>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

export function getRelatedProposalIds(
  contracts: ContractRelationSnapshot[],
  proposals: ProposalRelationSnapshot[],
) {
  return compactIds([
    ...contracts.map((contract) => contract.proposal_id),
    ...proposals.map((proposal) => proposal.id),
  ]);
}

export function getProposalIdsFromContracts(contracts: ContractRelationSnapshot[]) {
  return compactIds(contracts.map((contract) => contract.proposal_id));
}

export function getRelatedInvoiceIds(
  contracts: ContractRelationSnapshot[],
  invoices: InvoiceRelationSnapshot[],
) {
  return compactIds([
    ...contracts.map((contract) => contract.invoice_id),
    ...invoices.map((invoice) => invoice.id),
  ]);
}

export function getInvoiceIdsFromContracts(contracts: ContractRelationSnapshot[]) {
  return compactIds(contracts.map((contract) => contract.invoice_id));
}

export function getRelatedPaymentInvoiceIds(invoices: InvoiceRelationSnapshot[]) {
  return compactIds(invoices.map((invoice) => invoice.id));
}

export function isStrongProjectRelation(source: ProjectRelationSource) {
  return source === "project_id" || source === "related_project_id";
}

export function describeProjectRelation(source: ProjectRelationSource): ProjectRelationDescriptor {
  const descriptors: Record<ProjectRelationSource, ProjectRelationDescriptor> = {
    project_id: {
      strength: "direct",
      source,
      label: "Vinculado directamente al proyecto",
    },
    related_project_id: {
      strength: "direct",
      source,
      label: "Relacionado directamente por tarea del proyecto",
    },
    contract_proposal: {
      strength: "inferred",
      source,
      label: "Relacionado por contrato del proyecto",
    },
    contract_invoice: {
      strength: "inferred",
      source,
      label: "Factura relacionada por contrato del proyecto",
    },
    project_deal: {
      strength: "inferred",
      source,
      label: "Relacionado por oportunidad del proyecto",
    },
    proposal_invoice: {
      strength: "inferred",
      source,
      label: "Factura relacionada por propuesta del proyecto",
    },
    invoice_payment: {
      strength: "inferred",
      source,
      label: "Pago relacionado por factura del proyecto",
    },
    client_context: {
      strength: "contextual",
      source,
      label: "Contexto del cliente",
    },
    lead_context: {
      strength: "contextual",
      source,
      label: "Contexto del prospecto",
    },
    email_context: {
      strength: "contextual",
      source,
      label: "Contexto por email",
    },
    phone_context: {
      strength: "contextual",
      source,
      label: "Contexto por teléfono",
    },
  };

  return descriptors[source];
}
