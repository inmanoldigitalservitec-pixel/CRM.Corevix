import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ExternalLink, RefreshCw, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ProjectSalesDocuments } from "@/components/projects/project-sales-documents";
import { ProjectSalesSummaryView } from "@/components/projects/project-sales-summary";
import {
  buildSalesDocuments,
  buildSalesSummary,
  dedupeById,
  type ProjectContractRow,
  type ProjectExpenseRow,
  type ProjectInvoiceRow,
  type ProjectPaymentRow,
  type ProjectProposalRow,
  type ProjectSalesData,
  type ProjectSalesProject,
  type ProjectTimeEntryRow,
} from "@/components/projects/project-sales-utils";
import {
  compactIds,
  getInvoiceIdsFromContracts,
  getProposalIdsFromContracts,
  getRelatedPaymentInvoiceIds,
} from "@/lib/projects/project-relations";
import { cn } from "@/lib/utils";

type SalesErrorKey =
  | "contracts"
  | "expenses"
  | "timeEntries"
  | "proposals"
  | "invoices"
  | "payments";
type SalesErrors = Partial<Record<SalesErrorKey, string>>;

const emptySalesData: ProjectSalesData = {
  contracts: [],
  proposals: [],
  invoices: [],
  payments: [],
  expenses: [],
  timeEntries: [],
};

const proposalSelect =
  "id,number,title,product_id,client_id,lead_id,deal_id,amount,currency,status,valid_until,description,notes,sent_at,created_at,updated_at,public_token,viewed_at,approved_at";

const invoiceSelect =
  "id,number,client_id,proposal_id,product_id,subtotal,tax,discount,total,status,notes,date_issued,due_date,created_at,updated_at,public_token,payment_link,paid_at,sent_at,viewed_at";

export function ProjectSalesPanel({ project }: { project: ProjectSalesProject }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [data, setData] = useState<ProjectSalesData>(emptySalesData);
  const [errors, setErrors] = useState<SalesErrors>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadSalesData = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!profile?.company_id) {
      setData(emptySalesData);
      setErrors({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const isInitialLoad = !hasLoadedRef.current;
    setLoading(isInitialLoad);
    setRefreshing(!isInitialLoad);

    const nextErrors: SalesErrors = {};
    const companyId = profile.company_id;
    const db = supabase as any;

    const contractsQuery = db
      .from("contracts")
      .select(
        "id,contract_number,subject,status,contract_type,contract_value,start_date,end_date,client_id,project_id,proposal_id,deal_id,signed_at,signature_status,invoice_id,created_at,updated_at",
      )
      .eq("company_id", companyId)
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    const expensesQuery = db
      .from("expenses")
      .select(
        "id,title,vendor,category,amount,status,expense_date,project_id,client_id,receipt_url,notes,created_at,updated_at",
      )
      .eq("company_id", companyId)
      .eq("project_id", project.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    const timeEntriesQuery = db
      .from("project_time_entries")
      .select(
        "id,task_id,profile_id,entry_date,duration_minutes,description,is_billable,created_at,updated_at",
      )
      .eq("company_id", companyId)
      .eq("project_id", project.id)
      .is("archived_at", null)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    const [contractsRes, expensesRes, timeEntriesRes] = await Promise.all([
      contractsQuery,
      expensesQuery,
      timeEntriesQuery,
    ]);

    const contracts = readRows<ProjectContractRow>(contractsRes, "contracts", nextErrors);
    const expenses = readRows<ProjectExpenseRow>(expensesRes, "expenses", nextErrors);
    const timeEntries = readRows<ProjectTimeEntryRow>(timeEntriesRes, "timeEntries", nextErrors);

    const proposalIdsFromContracts = getProposalIdsFromContracts(contracts);
    const proposalRequests: Promise<{ data: unknown; error: { message?: string } | null }>[] = [];

    if (proposalIdsFromContracts.length) {
      proposalRequests.push(
        db
          .from("proposals")
          .select(proposalSelect)
          .eq("company_id", companyId)
          .in("id", proposalIdsFromContracts),
      );
    }

    if (project.deal_id) {
      proposalRequests.push(
        db
          .from("proposals")
          .select(proposalSelect)
          .eq("company_id", companyId)
          .eq("deal_id", project.deal_id),
      );
    }

    const proposalResponses = await Promise.all(proposalRequests);
    const proposals = dedupeById(
      proposalResponses.flatMap((response) =>
        readRows<ProjectProposalRow>(response, "proposals", nextErrors),
      ),
    );

    const invoiceIdsFromContracts = getInvoiceIdsFromContracts(contracts);
    const relatedProposalIds = compactIds(proposals.map((proposal) => proposal.id));
    const invoiceRequests: Promise<{ data: unknown; error: { message?: string } | null }>[] = [];

    if (invoiceIdsFromContracts.length) {
      invoiceRequests.push(
        db
          .from("invoices")
          .select(invoiceSelect)
          .eq("company_id", companyId)
          .in("id", invoiceIdsFromContracts),
      );
    }

    if (relatedProposalIds.length) {
      invoiceRequests.push(
        db
          .from("invoices")
          .select(invoiceSelect)
          .eq("company_id", companyId)
          .in("proposal_id", relatedProposalIds),
      );
    }

    const invoiceResponses = await Promise.all(invoiceRequests);
    const invoices = dedupeById(
      invoiceResponses.flatMap((response) =>
        readRows<ProjectInvoiceRow>(response, "invoices", nextErrors),
      ),
    );

    const relatedInvoiceIds = getRelatedPaymentInvoiceIds(invoices);
    let payments: ProjectPaymentRow[] = [];

    if (relatedInvoiceIds.length) {
      const paymentsRes = await db
        .from("payments")
        .select(
          "id,payment_number,reference,invoice_id,client_id,amount,payment_date,method,status,notes,created_at,updated_at",
        )
        .eq("company_id", companyId)
        .in("invoice_id", relatedInvoiceIds)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(300);
      payments = readRows<ProjectPaymentRow>(paymentsRes, "payments", nextErrors);
    }

    if (requestIdRef.current !== requestId) return;

    setData({ contracts, proposals, invoices, payments, expenses, timeEntries });
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
    hasLoadedRef.current = true;

    const errorMessages = Object.values(nextErrors);
    if (errorMessages.length) {
      toast.error("Algunas secciones financieras no pudieron cargarse.");
    }
  }, [profile?.company_id, project.deal_id, project.id]);

  useEffect(() => {
    setData(emptySalesData);
    setErrors({});
    setLoading(true);
    setRefreshing(false);
    hasLoadedRef.current = false;
  }, [project.id]);

  useEffect(() => {
    void loadSalesData();
  }, [loadSalesData]);

  const summary = useMemo(() => buildSalesSummary(data, todayIso), [data, todayIso]);
  const documents = useMemo(() => buildSalesDocuments(data, todayIso), [data, todayIso]);
  const proposalSearch = useMemo(
    () => ({
      leadId: project.lead_id || undefined,
      dealId: project.deal_id || undefined,
      conversationId: undefined,
      productId: project.product_id || undefined,
      clientId: project.client_id || undefined,
    }),
    [project.client_id, project.deal_id, project.lead_id, project.product_id],
  );
  const hasAnyData =
    documents.length > 0 ||
    data.timeEntries.length > 0 ||
    data.expenses.length > 0 ||
    data.contracts.length > 0;

  const openDocument = (document: { link: string }) => {
    if (document.link === "/proposals") {
      void navigate({ to: "/proposals", search: proposalSearch });
      return;
    }
    if (document.link === "/contracts") void navigate({ to: "/contracts" });
    if (document.link === "/invoices") void navigate({ to: "/invoices" });
    if (document.link === "/payments") void navigate({ to: "/payments" });
    if (document.link === "/expenses") void navigate({ to: "/expenses" });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
            Ventas y finanzas
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Resumen comercial y financiero relacionado con este proyecto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadSalesData()}
            disabled={loading || refreshing}
            className="h-9 rounded-full border-slate-200 px-3 text-xs font-semibold shadow-none"
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Actualizar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-full px-3 text-xs font-semibold"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Abrir módulo financiero
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => void navigate({ to: "/invoices" })}>
                Facturas
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void navigate({ to: "/proposals", search: proposalSearch })}
              >
                Propuestas
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void navigate({ to: "/payments" })}>
                Pagos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void navigate({ to: "/expenses" })}>
                Gastos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <SalesLoadingState />
      ) : (
        <>
          <PartialErrors errors={errors} />
          {!hasAnyData ? (
            <EmptyState
              icon={<ReceiptText className="h-5 w-5" />}
              title="Este proyecto todavía no tiene movimientos financieros relacionados."
              description="Las propuestas, contratos, facturas, pagos y gastos vinculados aparecerán aquí."
            />
          ) : (
            <>
              <ProjectSalesSummaryView summary={summary} />
              <ProjectSalesDocuments
                documents={documents}
                currency={summary.contextualCurrency}
                onOpenDocument={openDocument}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function readRows<T>(
  response: { data: unknown; error: { message?: string } | null },
  key: SalesErrorKey,
  errors: SalesErrors,
) {
  if (response.error) {
    errors[key] = response.error.message || "No se pudo cargar esta sección.";
    return [];
  }
  return ((response.data || []) as T[]) ?? [];
}

function PartialErrors({ errors }: { errors: SalesErrors }) {
  const items = Object.entries(errors);
  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p>No se pudieron cargar algunas secciones.</p>
          <p className="mt-1 text-xs font-medium text-amber-700">
            Puedes actualizar para reintentar sin perder los datos ya visibles.
          </p>
        </div>
      </div>
    </div>
  );
}

function SalesLoadingState() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="h-4 w-32 rounded-full bg-slate-100" />
        <div className="mt-4 h-8 w-48 rounded-full bg-slate-100" />
        <div className="mt-4 h-2 rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-xl border border-slate-200 bg-white" />
        <div className="h-40 rounded-xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
