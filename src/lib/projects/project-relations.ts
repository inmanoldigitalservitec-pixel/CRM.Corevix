import { supabase } from "@/integrations/supabase/client";

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

export type InvoiceProjectRelationSource =
  | "rpc_result"
  | "project_invoice"
  | "project_proposal"
  | "contract_invoice"
  | "contract_proposal";

export type InvoiceProjectRelation = {
  invoiceId: string;
  projectId: string;
  source: InvoiceProjectRelationSource;
};

export type InvoiceProjectRelationAmbiguity = {
  invoiceId: string;
  source: InvoiceProjectRelationSource;
  projectIds: string[];
};

export type ResolveInvoiceProjectRelationsInput = {
  companyId: string | null | undefined;
  invoices: InvoiceRelationSnapshot[];
  knownProjectByInvoiceId?: Record<string, string | null | undefined>;
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

function addUniqueProject(
  target: Record<string, InvoiceProjectRelation>,
  ambiguities: InvoiceProjectRelationAmbiguity[],
  invoiceId: string,
  projectIds: string[],
  source: InvoiceProjectRelationSource,
) {
  if (!invoiceId || target[invoiceId]) return;
  const uniqueProjectIds = compactIds(projectIds);
  if (!uniqueProjectIds.length) return;
  if (uniqueProjectIds.length > 1) {
    ambiguities.push({ invoiceId, source, projectIds: uniqueProjectIds });
    return;
  }
  target[invoiceId] = { invoiceId, projectId: uniqueProjectIds[0], source };
}

export async function resolveInvoiceProjectRelations({
  companyId,
  invoices,
  knownProjectByInvoiceId = {},
}: ResolveInvoiceProjectRelationsInput) {
  const relationByInvoiceId: Record<string, InvoiceProjectRelation> = {};
  const ambiguities: InvoiceProjectRelationAmbiguity[] = [];
  const invoiceIds = compactIds(invoices.map((invoice) => invoice.id));
  const proposalIds = compactIds(invoices.map((invoice) => invoice.proposal_id));
  const invoiceByProposalId = new Map<string, string[]>();

  invoices.forEach((invoice) => {
    if (!invoice.proposal_id) return;
    const current = invoiceByProposalId.get(invoice.proposal_id) || [];
    current.push(invoice.id);
    invoiceByProposalId.set(invoice.proposal_id, current);
  });

  Object.entries(knownProjectByInvoiceId).forEach(([invoiceId, projectId]) => {
    if (!invoiceIds.includes(invoiceId) || !projectId) return;
    relationByInvoiceId[invoiceId] = {
      invoiceId,
      projectId,
      source: "rpc_result",
    };
  });

  if (!companyId || !invoiceIds.length) {
    return { relationByInvoiceId, ambiguities };
  }

  const db = supabase as any;

  const { data: projectsByInvoice, error: projectsByInvoiceError } = await db
    .from("projects")
    .select("id,invoice_id")
    .eq("company_id", companyId)
    .in("invoice_id", invoiceIds)
    .limit(500);
  if (projectsByInvoiceError) throw projectsByInvoiceError;

  const projectIdsByInvoice = new Map<string, string[]>();
  (projectsByInvoice || []).forEach((row: any) => {
    const invoiceId = String(row.invoice_id || "");
    if (!invoiceId) return;
    const current = projectIdsByInvoice.get(invoiceId) || [];
    current.push(String(row.id || ""));
    projectIdsByInvoice.set(invoiceId, current);
  });
  invoiceIds.forEach((invoiceId) => {
    addUniqueProject(
      relationByInvoiceId,
      ambiguities,
      invoiceId,
      projectIdsByInvoice.get(invoiceId) || [],
      "project_invoice",
    );
  });

  if (proposalIds.length) {
    const { data: projectsByProposal, error: projectsByProposalError } = await db
      .from("projects")
      .select("id,proposal_id")
      .eq("company_id", companyId)
      .in("proposal_id", proposalIds)
      .limit(500);
    if (projectsByProposalError) throw projectsByProposalError;

    const projectIdsByProposal = new Map<string, string[]>();
    (projectsByProposal || []).forEach((row: any) => {
      const proposalId = String(row.proposal_id || "");
      if (!proposalId) return;
      const current = projectIdsByProposal.get(proposalId) || [];
      current.push(String(row.id || ""));
      projectIdsByProposal.set(proposalId, current);
    });
    invoiceByProposalId.forEach((relatedInvoiceIds, proposalId) => {
      relatedInvoiceIds.forEach((invoiceId) => {
        addUniqueProject(
          relationByInvoiceId,
          ambiguities,
          invoiceId,
          projectIdsByProposal.get(proposalId) || [],
          "project_proposal",
        );
      });
    });
  }

  const { data: contractsByInvoice, error: contractsByInvoiceError } = await db
    .from("contracts")
    .select("invoice_id,project_id")
    .eq("company_id", companyId)
    .in("invoice_id", invoiceIds)
    .not("project_id", "is", null)
    .limit(500);
  if (contractsByInvoiceError) throw contractsByInvoiceError;

  const contractProjectIdsByInvoice = new Map<string, string[]>();
  (contractsByInvoice || []).forEach((row: any) => {
    const invoiceId = String(row.invoice_id || "");
    if (!invoiceId) return;
    const current = contractProjectIdsByInvoice.get(invoiceId) || [];
    current.push(String(row.project_id || ""));
    contractProjectIdsByInvoice.set(invoiceId, current);
  });
  invoiceIds.forEach((invoiceId) => {
    addUniqueProject(
      relationByInvoiceId,
      ambiguities,
      invoiceId,
      contractProjectIdsByInvoice.get(invoiceId) || [],
      "contract_invoice",
    );
  });

  if (proposalIds.length) {
    const { data: contractsByProposal, error: contractsByProposalError } = await db
      .from("contracts")
      .select("proposal_id,project_id")
      .eq("company_id", companyId)
      .in("proposal_id", proposalIds)
      .not("project_id", "is", null)
      .limit(500);
    if (contractsByProposalError) throw contractsByProposalError;

    const contractProjectIdsByProposal = new Map<string, string[]>();
    (contractsByProposal || []).forEach((row: any) => {
      const proposalId = String(row.proposal_id || "");
      if (!proposalId) return;
      const current = contractProjectIdsByProposal.get(proposalId) || [];
      current.push(String(row.project_id || ""));
      contractProjectIdsByProposal.set(proposalId, current);
    });
    invoiceByProposalId.forEach((relatedInvoiceIds, proposalId) => {
      relatedInvoiceIds.forEach((invoiceId) => {
        addUniqueProject(
          relationByInvoiceId,
          ambiguities,
          invoiceId,
          contractProjectIdsByProposal.get(proposalId) || [],
          "contract_proposal",
        );
      });
    });
  }

  return { relationByInvoiceId, ambiguities };
}
