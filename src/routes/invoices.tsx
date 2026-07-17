import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isPaidInvoiceStatus, normalizeStatus } from "@/lib/crm/status";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";
import { resolveInvoiceProjectRelations } from "@/lib/projects/project-relations";
import { InvoiceActionsMenu } from "@/components/invoices/invoice-actions-menu";
import { InvoiceDetailsPanel } from "@/components/invoices/invoice-details-panel";
import {
  InvoiceEditor,
  type InvoiceEditorDraft,
  type InvoicePaymentFeedback,
} from "@/components/invoices/invoice-editor";
import { InvoiceMobileCard } from "@/components/invoices/invoice-mobile-card";
import { InvoiceSummaryMetrics } from "@/components/invoices/invoice-summary-metrics";
import { PaymentReceiptsPanel } from "@/components/payments/payment-receipts-panel";
import {
  PaymentFormDialog,
  type PaymentFormCreatedResult,
  type PaymentFormInitialValues,
} from "@/components/payments/payment-form-dialog";
import { loadInvoicePaymentBalance } from "@/lib/payments/invoice-payment-balance";
import type { InvoiceActivityEvent } from "@/components/invoices/invoice-activity";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";
import {
  formatInvoiceDate,
  formatInvoiceDueDate,
  formatInvoiceMoney,
  getInvoiceBalance,
  getInvoiceCurrency,
  getInvoiceOperationalStatus,
  getInvoicePrimaryAction,
  isInvoiceCancelled,
  isInvoiceDraft,
  isInvoiceOverdue,
  isInvoicePaid,
  isInvoicePending,
  isoToday,
  matchesAmountFilter,
  matchesDueFilter,
  matchesOperationalFilter,
  type InvoiceAmountFilter,
  type InvoiceDueFilter,
  type InvoiceOperationalFilter,
} from "@/components/invoices/invoice-utils";

export const Route = createFileRoute("/invoices")({
  component: InvoicesPage,
  head: () => ({ meta: [{ title: "Facturas — Corevix CRM" }] }),
});

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];
const INVOICE_STATUS_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Sent: "Enviada",
  Paid: "Pagada",
  Overdue: "Vencida",
  Cancelled: "Cancelada",
};
type DrawerMode = "view" | "create" | "edit";

interface Invoice {
  id: string;
  company_id: string;
  number: string;
  client_id: string | null;
  proposal_id?: string | null;
  product_id?: string | null;
  subtotal: number;
  tax: number | null;
  discount: number | null;
  total: number;
  status: string;
  notes: string | null;
  date_issued: string;
  due_date: string;
  created_at: string;
  updated_at?: string | null;

  public_token?: string | null;
  payment_link?: string | null;
  paid_at?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  created_by?: string | null;

  invoice_data?: any | null;
}

type ProposalLite = {
  id: string;
  number: string | null;
  title: string | null;
  currency?: string | null;
};

type ProductLite = { id: string; name: string | null; currency?: string | null };
type ClientLite = {
  id: string;
  company_name: string;
  contact_person: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && String(v).trim()))));
}

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function readTextValue(value: unknown) {
  return String(value || "").trim();
}

function formatInvoiceDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-DO", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type InvoiceItemDraft = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type ProductOption = {
  id: string;
  name: string;
  base_price?: number | null;
  currency?: string | null;
  description?: string | null;
};
type ClientOption = {
  id: string;
  company_name: string;
  contact_person: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
};
type ProposalOption = {
  id: string;
  number: string;
  title: string | null;
  client_id?: string | null;
  product_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  description?: string | null;
  notes?: string | null;
};

function InvoicesPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [operationalFilter, setOperationalFilter] = useState<InvoiceOperationalFilter>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<InvoiceDueFilter>("all");
  const [amountFilter, setAmountFilter] = useState<InvoiceAmountFilter>("all");
  const [editItem, setEditItem] = useState<Invoice | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<InvoiceDetailItem[]>([]);
  const [detailItemsLoading, setDetailItemsLoading] = useState(false);
  const [detailItemsError, setDetailItemsError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInitialValues, setPaymentInitialValues] = useState<PaymentFormInitialValues>();
  const [paymentReceiptsRefreshKey, setPaymentReceiptsRefreshKey] = useState(0);
  const [editorPaymentFeedback, setEditorPaymentFeedback] = useState<InvoicePaymentFeedback | null>(
    null,
  );
  const paymentCreatedRef = useRef(false);
  const { data, loading, error, fetch, update, remove } = useCrud<Invoice>({
    table: "invoices",
    select: "*",
    orderBy: "updated_at",
    ascending: false,
  });

  const { data: products } = useCrud<ProductOption>({
    table: "products",
    select: "id, name, base_price, currency, description",
    orderBy: "name",
    ascending: true,
  });

  const { data: clients } = useCrud<ClientOption>({
    table: "clients",
    select: "id, company_name, contact_person, email, phone, address, tax_id",
    orderBy: "company_name",
    ascending: true,
  });

  const { data: proposals } = useCrud<ProposalOption>({
    table: "proposals",
    select: "id, number, title, client_id, product_id, amount, currency, description, notes",
    orderBy: "updated_at",
    ascending: false,
    limit: 200,
  });

  const canCreatePayment = can("payments.create");
  const canCreateProjectRecord = can("projects.create");
  const canViewClients = can("clients.view_all") || can("clients.view_assigned");
  const canViewProjects = can("projects.view_all") || can("projects.view_assigned");

  const displayInvoiceStatus = (status: string) => INVOICE_STATUS_LABELS[status] || status || "—";
  const sendInvoiceNotification = async (title: string, message: string) => {
    if (!profile?.company_id || !user?.id) return;
    await createAttentionNotification(
      supabase,
      { companyId: profile.company_id, userId: user.id },
      { title, message, type: "attention:invoices", link: "/invoices" },
    ).catch(() => {});
  };

  const [proposalsById, setProposalsById] = useState<Record<string, ProposalLite>>({});
  const [productsById, setProductsById] = useState<Record<string, ProductLite>>({});
  const [clientsById, setClientsById] = useState<Record<string, ClientLite>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const proposalIds = uniqueStrings(data.map((i) => i.proposal_id));
      const productIds = uniqueStrings(data.map((i) => i.product_id));
      const clientIds = uniqueStrings(data.map((i) => i.client_id));
      if (!profile?.company_id) return;

      try {
        const db = supabase as any;

        if (proposalIds.length) {
          const { data: rows, error } = await db
            .from("proposals")
            .select("id, number, title, currency")
            .eq("company_id", profile.company_id)
            .in("id", proposalIds);
          if (error) throw error;
          const map: Record<string, ProposalLite> = {};
          for (const r of rows || []) map[String(r.id)] = r;
          if (!cancelled) setProposalsById(map);
        } else if (!cancelled) {
          setProposalsById({});
        }

        if (productIds.length) {
          const { data: rows, error } = await db
            .from("products")
            .select("id, name, currency")
            .eq("company_id", profile.company_id)
            .in("id", productIds);
          if (error) throw error;
          const map: Record<string, ProductLite> = {};
          for (const r of rows || []) map[String(r.id)] = r;
          if (!cancelled) setProductsById(map);
        } else if (!cancelled) {
          setProductsById({});
        }

        if (clientIds.length) {
          const { data: rows, error } = await db
            .from("clients")
            .select("id, company_name, contact_person, email, phone, address, tax_id")
            .eq("company_id", profile.company_id)
            .in("id", clientIds);
          if (error) throw error;
          const map: Record<string, ClientLite> = {};
          for (const r of rows || []) map[String(r.id)] = r;
          if (!cancelled) setClientsById(map);
        } else if (!cancelled) {
          setClientsById({});
        }
      } catch (e) {
        // Keep list usable even if joins fail.
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [data, profile?.company_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = isoToday();
    return data.filter((i) => {
      const p = i.proposal_id ? proposalsById[i.proposal_id] : null;
      const prod = i.product_id ? productsById[i.product_id] : null;
      const client = i.client_id ? clientsById[i.client_id] : null;
      const invoiceData =
        i.invoice_data && typeof i.invoice_data === "object" ? i.invoice_data : {};

      const haystack =
        `${i.number} ${i.notes || ""} ${p?.number || ""} ${p?.title || ""} ${prod?.name || ""} ${client?.company_name || ""} ${client?.contact_person || ""} ${client?.email || ""} ${(invoiceData as any).clientEmail || ""} ${(invoiceData as any).clientName || ""} ${(invoiceData as any).clientCompany || ""} ${(invoiceData as any).productName || ""} ${(invoiceData as any).relatedProposalNumber || ""} ${(invoiceData as any).relatedProposalTitle || ""}`.toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchStatus =
        statusFilter === "all" || normalizeStatus(i.status) === normalizeStatus(statusFilter);
      const matchClient = clientFilter === "all" || i.client_id === clientFilter;
      return (
        matchSearch &&
        matchStatus &&
        matchClient &&
        matchesOperationalFilter(i, operationalFilter, today) &&
        matchesDueFilter(i, dueFilter, today) &&
        matchesAmountFilter(i, amountFilter)
      );
    });
  }, [
    amountFilter,
    clientFilter,
    data,
    dueFilter,
    operationalFilter,
    search,
    statusFilter,
    proposalsById,
    productsById,
    clientsById,
  ]);

  const getClientLabel = (inv: Invoice) => {
    const client = inv.client_id ? clientsById[inv.client_id] : null;
    const invoiceData =
      inv.invoice_data && typeof inv.invoice_data === "object" ? inv.invoice_data : {};
    return (
      client?.company_name ||
      String((invoiceData as any)?.clientCompany || "").trim() ||
      String((invoiceData as any)?.clientName || "").trim() ||
      client?.contact_person ||
      "Cliente sin nombre"
    );
  };

  const getProposalNumber = (inv: Invoice) => {
    const p = inv.proposal_id ? proposalsById[inv.proposal_id] : null;
    return String(p?.number || "").trim() || "—";
  };

  const getProposalTitle = (inv: Invoice) => {
    const p = inv.proposal_id ? proposalsById[inv.proposal_id] : null;
    return String(p?.title || "").trim() || "—";
  };

  const getProductName = (inv: Invoice) => {
    const prod = inv.product_id ? productsById[inv.product_id] : null;
    const invoiceData =
      inv.invoice_data && typeof inv.invoice_data === "object" ? inv.invoice_data : {};
    return String(prod?.name || (invoiceData as any).productName || "").trim() || "—";
  };

  const getInvoiceDisplayCurrency = (inv: Invoice) => {
    const product = inv.product_id ? productsById[inv.product_id] : null;
    const proposal = inv.proposal_id ? proposalsById[inv.proposal_id] : null;
    return getInvoiceCurrency(inv, {
      productCurrency: product?.currency,
      proposalCurrency: proposal?.currency,
    });
  };

  const openInvoiceDetail = (invoice: Invoice) => {
    setSelected(invoice);
    setEditItem(null);
    setEditorPaymentFeedback(null);
    setDrawerMode("view");
    setDrawerOpen(true);
  };

  const openInvoiceEditor = (invoice: Invoice) => {
    setSelected(invoice);
    setEditItem(invoice);
    setEditorPaymentFeedback(null);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const registerPayment = async (invoice: Invoice) => {
    if (!invoice?.id) return;
    if (!canCreatePayment) {
      toast.error("No tienes permiso para registrar pagos.");
      return;
    }
    try {
      if (!profile?.company_id) throw new Error("Contexto de compañía no disponible.");
      const balance = await loadInvoicePaymentBalance(invoice, profile.company_id);
      if (isInvoicePaid(invoice) || balance.outstandingBalance <= 0) {
        toast.error("Esta factura ya está pagada.");
        return;
      }
      if (isInvoiceCancelled(invoice)) {
        toast.error("Esta factura está cancelada.");
        return;
      }
      setPaymentInitialValues({
        reference: invoice.number ? `Pago ${invoice.number}` : "",
        invoice_id: invoice.id,
        client_id: invoice.client_id || null,
        amount: String(balance.outstandingBalance),
        status: "Completed",
      });
      paymentCreatedRef.current = false;
      setPaymentDialogOpen(true);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo calcular el saldo pendiente.");
    }
  };

  const viewClient = (invoice: Invoice) => {
    if (!invoice.client_id) return;
    if (!canViewClients) {
      toast.error("No tienes permiso para abrir clientes.");
      return;
    }
    void navigate({ to: "/clients", search: { clientId: invoice.client_id } });
  };

  const viewProposal = (invoice: Invoice) => {
    if (!invoice.proposal_id) return;
    void navigate({ to: "/proposals", search: { proposalId: invoice.proposal_id } });
  };

  const viewProject = (projectId?: string | null) => {
    if (!projectId) {
      toast.error("Esta factura todavía no tiene un proyecto enlazado.");
      return;
    }
    if (!canViewProjects) {
      toast.error("No tienes permiso para abrir proyectos.");
      return;
    }
    void navigate({ to: "/projects", search: { projectId } });
  };

  const getPublicInvoiceUrl = (inv: Invoice) => {
    const token = String(inv.public_token || "").trim();
    return token ? `${window.location.origin}/invoice/public/${token}` : null;
  };

  const createProjectForInvoice = async (invoice: Invoice) => {
    if (!canCreateProjectRecord) {
      toast.error("No tienes permiso para crear proyectos.");
      return;
    }
    if (
      !window.confirm(
        "Esto verificará si ya existe un proyecto para esta factura y lo creará si hace falta. ¿Continuar?",
      )
    ) {
      return;
    }
    try {
      const result = await ensureProjectFromPaidInvoice(invoice.id);
      if (result.projectId) {
        setProjectByInvoiceId((prev) => ({
          ...prev,
          [invoice.id]: result.projectId!,
        }));
      }
      toast.success(result.created ? "Proyecto creado." : "Proyecto ya existente.");
    } catch (e: any) {
      console.error("create project quick action error:", e);
      toast.error("No se pudo crear el proyecto.");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOperationalFilter("all");
    setClientFilter("all");
    setDueFilter("all");
    setAmountFilter("all");
  };

  const invoiceMetrics = useMemo(() => {
    const today = isoToday();
    const pending = data.filter((invoice) => isInvoicePending(invoice));
    const overdue = data.filter((invoice) => isInvoiceOverdue(invoice, today));
    const paid = data.filter((invoice) => isInvoicePaid(invoice));
    const draft = data.filter((invoice) => isInvoiceDraft(invoice));
    const formatTotal = (rows: Invoice[]) => {
      const currency = rows.length === 1 ? getInvoiceDisplayCurrency(rows[0]) : "USD";
      return formatInvoiceMoney(
        rows.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
        currency,
      );
    };

    return [
      {
        key: "pending",
        label: "Pendiente por cobrar",
        value: formatTotal(pending),
        hint: `${pending.length} factura${pending.length === 1 ? "" : "s"}`,
        active: operationalFilter === "pending",
      },
      {
        key: "overdue",
        label: "Vencido",
        value: formatTotal(overdue),
        hint: `${overdue.length} vencida${overdue.length === 1 ? "" : "s"}`,
        active: operationalFilter === "overdue",
        tone: "danger" as const,
      },
      {
        key: "paid",
        label: "Cobrado",
        value: formatTotal(paid),
        hint: `${paid.length} pagada${paid.length === 1 ? "" : "s"}`,
        active: operationalFilter === "paid",
        tone: "success" as const,
      },
      {
        key: "draft",
        label: "Borradores",
        value: String(draft.length),
        hint: "Facturas por revisar",
        active: operationalFilter === "draft",
        tone: "muted" as const,
      },
    ];
  }, [data, operationalFilter, productsById, proposalsById]);

  const activeFilterCount = [
    search.trim() ? "search" : null,
    statusFilter !== "all" ? "status" : null,
    operationalFilter !== "all" ? "operational" : null,
    clientFilter !== "all" ? "client" : null,
    dueFilter !== "all" ? "due" : null,
    amountFilter !== "all" ? "amount" : null,
  ].filter(Boolean).length;

  const runPrimaryInvoiceAction = (invoice: Invoice) => {
    if (isInvoicePaid(invoice) && projectByInvoiceId[invoice.id]) {
      viewProject(projectByInvoiceId[invoice.id]);
      return;
    }
    openInvoiceDetail(invoice);
  };

  const markInvoicePaidWithConfirmation = (invoice: Invoice) => {
    void registerPayment(invoice);
  };

  const collectionLabel = (invoice: Invoice) => {
    const status = getInvoiceOperationalStatus(invoice);
    if (status === "paid") return "Cobrado";
    if (status === "overdue") return "Vencido";
    if (status === "draft") return "Borrador";
    if (status === "cancelled") return "Cancelada";
    return "Pendiente";
  };

  const renderActionsMenu = (invoice: Invoice) => (
    <InvoiceActionsMenu
      canOpenPublic={Boolean(invoice.public_token)}
      canMarkPaid={false}
      canRegisterPayment={
        canCreatePayment && !isInvoicePaid(invoice) && !isInvoiceCancelled(invoice)
      }
      canCreateProject={
        canCreateProjectRecord && isInvoicePaid(invoice) && !projectByInvoiceId[invoice.id]
      }
      canViewProject={
        canViewProjects && isInvoicePaid(invoice) && Boolean(projectByInvoiceId[invoice.id])
      }
      canViewClient={canViewClients && Boolean(invoice.client_id)}
      canViewProposal={Boolean(invoice.proposal_id)}
      canDeleteDraft={isInvoiceDraft(invoice)}
      onView={() => openInvoiceDetail(invoice)}
      onOpenPublic={() => openPublicInvoice(invoice)}
      onCopyPublic={() => void copyPublicInvoiceLink(invoice)}
      onEdit={() => openInvoiceEditor(invoice)}
      onMarkPaid={() => void registerPayment(invoice)}
      onRegisterPayment={() => registerPayment(invoice)}
      onCreateProject={() => void createProjectForInvoice(invoice)}
      onViewProject={() => viewProject(projectByInvoiceId[invoice.id])}
      onViewClient={() => viewClient(invoice)}
      onViewProposal={() => viewProposal(invoice)}
      onDeleteDraft={() => setDeleteId(invoice.id)}
    />
  );

  const [itemsDraft, setItemsDraft] = useState<InvoiceItemDraft[]>([]);
  const [loadedInvoiceItemCount, setLoadedInvoiceItemCount] = useState(0);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    const editorOpen = drawerOpen && (drawerMode === "create" || drawerMode === "edit");
    if (!editorOpen) return;
    setEditorError(null);
  }, [drawerOpen, drawerMode, editItem?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadItems = async () => {
      const editorOpen = drawerOpen && (drawerMode === "create" || drawerMode === "edit");
      if (!editorOpen || !editItem?.id) {
        if (editorOpen && !editItem) {
          setItemsDraft([]);
          setLoadedInvoiceItemCount(0);
        }
        return;
      }
      const companyId = profile?.company_id;
      if (!companyId) {
        setItemsDraft([]);
        setLoadedInvoiceItemCount(0);
        setEditorError("Contexto de compañía no disponible.");
        return;
      }
      try {
        const db = supabase as any;
        const { data: rows, error } = await db
          .from("invoice_items")
          .select("id, description, quantity, unit_price, total")
          .eq("company_id", companyId)
          .eq("invoice_id", editItem.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });
        if (error) throw error;
        const next: InvoiceItemDraft[] = (rows || []).map((r: any) => ({
          id: r.id,
          description: String(r.description || ""),
          quantity: Number(r.quantity || 0) || 0,
          unit_price: Number(r.unit_price || 0) || 0,
          total: Number(r.total || 0) || 0,
        }));
        if (!cancelled) {
          setItemsDraft(next);
          setLoadedInvoiceItemCount(next.length);
        }
      } catch (e: any) {
        console.error("invoice editor items load error:", e);
        if (!cancelled) {
          setItemsDraft([]);
          setLoadedInvoiceItemCount(0);
          setEditorError(e?.message || "No se pudieron cargar los artículos.");
        }
      }
    };
    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, drawerMode, editItem?.id, profile?.company_id]);

  useEffect(() => {
    let cancelled = false;
    const invoiceId = selected?.id || "";
    const companyId = profile?.company_id || "";
    const detailOpen = drawerOpen && drawerMode === "view" && Boolean(invoiceId);

    if (!detailOpen) {
      setDetailItems([]);
      setDetailItemsLoading(false);
      setDetailItemsError(null);
      return;
    }

    setDetailItems([]);
    setDetailItemsError(null);

    const loadDetailItems = async () => {
      if (!companyId) {
        setDetailItemsError("Contexto de compañía no disponible.");
        setDetailItemsLoading(false);
        return;
      }
      setDetailItemsLoading(true);
      try {
        const db = supabase as any;
        const { data: rows, error } = await db
          .from("invoice_items")
          .select("id, description, quantity, unit_price, total, created_at")
          .eq("company_id", companyId)
          .eq("invoice_id", invoiceId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        setDetailItems(
          (rows || []).map((row: any) => ({
            id: String(row.id),
            description: String(row.description || ""),
            quantity: Number(row.quantity || 0) || 0,
            unit_price: Number(row.unit_price || 0) || 0,
            total: Number(row.total || 0) || 0,
            created_at: row.created_at || null,
          })),
        );
      } catch (e: any) {
        if (!cancelled) {
          console.error("invoice detail items load error:", e);
          setDetailItemsError(e?.message || "No se pudieron cargar los artículos.");
        }
      } finally {
        if (!cancelled) setDetailItemsLoading(false);
      }
    };

    void loadDetailItems();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, drawerMode, selected?.id, profile?.company_id]);

  const openPublicInvoice = (inv: Invoice) => {
    const url = getPublicInvoiceUrl(inv);
    if (!url) {
      toast.error("Esta factura no tiene enlace público");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectByInvoiceId, setProjectByInvoiceId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!drawerOpen || drawerMode !== "view" || !selected) {
      setLinkedProjectId(null);
      return;
    }

    setLinkedProjectId(projectByInvoiceId[selected.id] || null);
  }, [drawerOpen, drawerMode, projectByInvoiceId, selected]);

  const createProjectFromInvoice = async (invoiceId: string) => {
    if (!invoiceId) return;
    if (!canCreateProjectRecord) {
      toast.error("No tienes permiso para crear proyectos.");
      return;
    }
    if (
      !window.confirm(
        "Esto verificará si ya existe un proyecto para esta factura y lo creará si hace falta. ¿Continuar?",
      )
    ) {
      return;
    }
    setCreatingProject(true);
    try {
      const result = await ensureProjectFromPaidInvoice(invoiceId);
      if (result.projectId) {
        setLinkedProjectId(result.projectId);
        setProjectByInvoiceId((prev) => ({ ...prev, [invoiceId]: result.projectId! }));
      }
      toast.success(result?.created ? "Proyecto creado correctamente." : "Proyecto ya existía.");
    } catch (e: any) {
      console.error("create_project_from_paid_invoice error:", e);
      toast.error("No se pudo crear el proyecto.");
    } finally {
      setCreatingProject(false);
    }
  };

  const ensureProjectFromPaidInvoice = async (invoiceId: string) => {
    const db = supabase as any;
    const { data, error } = await db.rpc("create_project_from_paid_invoice", {
      p_invoice_id: invoiceId,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    const projectId = result?.project_id ? String(result.project_id) : null;
    return { created: Boolean(result?.created), projectId };
  };

  const applyStatusQuick = async (inv: Invoice, nextStatus: string) => {
    if (!inv?.id) return;
    if (isPaidInvoiceStatus(nextStatus)) {
      await registerPayment(inv);
      return;
    }
    try {
      await update(inv.id, { status: nextStatus } as Partial<Invoice>);
      toast.success("Estado actualizado");

      if (isPaidInvoiceStatus(nextStatus)) {
        const projectResult = await ensureProjectFromPaidInvoice(inv.id);
        if (projectResult.projectId) {
          setProjectByInvoiceId((prev) => ({ ...prev, [inv.id]: projectResult.projectId! }));
        }
        void sendInvoiceNotification(
          "Factura pagada",
          `${inv.number || "Factura"} cambió a pagada${projectResult.created ? " y generó un proyecto." : "."}`,
        );
        toast.success(
          projectResult.created
            ? "Factura marcada como pagada. Proyecto creado."
            : "Factura marcada como pagada. Proyecto ya existente.",
        );
      } else {
        void sendInvoiceNotification(
          "Factura actualizada",
          `${inv.number || "Factura"} pasó a ${nextStatus}.`,
        );
      }
    } catch (e: any) {
      console.error("quick invoice status update error:", e);
      toast.error(e?.message || "No se pudo actualizar el estado");
    }
  };

  const copyPublicInvoiceLink = async (inv: Invoice) => {
    const url = getPublicInvoiceUrl(inv);
    if (!url) {
      toast.error("Esta factura no tiene enlace público");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de factura copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  useEffect(() => {
    setProjectByInvoiceId((current) => {
      const invoiceIds = new Set(data.map((invoice) => invoice.id));
      const next = Object.fromEntries(
        Object.entries(current).filter(([invoiceId]) => invoiceIds.has(invoiceId)),
      );
      return next;
    });
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    const companyId = profile?.company_id;
    if (!companyId || !data.length) return;

    const loadProjectRelations = async () => {
      try {
        const result = await resolveInvoiceProjectRelations({
          companyId,
          invoices: data.map((invoice) => ({
            id: invoice.id,
            proposal_id: invoice.proposal_id,
          })),
          knownProjectByInvoiceId: projectByInvoiceId,
        });
        if (result.ambiguities.length) {
          console.warn("invoice project relation ambiguity:", result.ambiguities);
        }
        if (cancelled) return;
        const next = Object.fromEntries(
          Object.entries(result.relationByInvoiceId).map(([invoiceId, relation]) => [
            invoiceId,
            relation.projectId,
          ]),
        );
        setProjectByInvoiceId((current) => {
          const merged = { ...current, ...next };
          const unchanged =
            Object.keys(merged).length === Object.keys(current).length &&
            Object.entries(merged).every(([invoiceId, projectId]) => current[invoiceId] === projectId);
          return unchanged ? current : merged;
        });
      } catch (e) {
        console.error("invoice project relation load error:", e);
      }
    };

    void loadProjectRelations();
    return () => {
      cancelled = true;
    };
  }, [data, profile?.company_id, projectByInvoiceId]);

  const saveEditorDraft = async (
    draft: InvoiceEditorDraft,
    nextStatus: "Draft" | "Sent",
    options: { closeAfterSave?: boolean; silent?: boolean } = {},
  ) => {
    const closeAfterSave = options.closeAfterSave ?? true;
    const silent = Boolean(options.silent);
    const companyId = profile?.company_id;
    const failBeforeSave = (message: string) => {
      setEditorError(message);
      toast.error(message);
      return null;
    };
    if (!companyId) return failBeforeSave("Contexto de compañía no disponible.");
    const clean = (value: unknown) => {
      const text = String(value || "").trim();
      return text ? text : null;
    };
    const rows = draft.items
      .map((item, index) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_price);
        return {
          description: String(item.description || "").trim(),
          quantity: Number.isFinite(quantity) ? quantity : Number.NaN,
          unit_price: Number.isFinite(unitPrice) ? unitPrice : Number.NaN,
          sort_order: index,
        };
      })
      .filter((item) => item.description || item.unit_price > 0);

    for (const row of rows) {
      if (!row.description) return failBeforeSave("Cada línea debe tener descripción.");
      if (!Number.isFinite(row.quantity)) return failBeforeSave("La cantidad no es válida.");
      if (row.quantity <= 0) return failBeforeSave("La cantidad debe ser mayor que 0.");
      if (!Number.isFinite(row.unit_price))
        return failBeforeSave("El precio unitario no es válido.");
      if (row.unit_price < 0) return failBeforeSave("El precio unitario no puede ser negativo.");
      const totalValue = row.quantity * row.unit_price;
      if (!Number.isFinite(totalValue))
        return failBeforeSave("El total de una línea no es válido.");
    }

    const tax = Math.max(0, Number(draft.tax || 0) || 0);
    const discount = Math.max(0, Number(draft.discount || 0) || 0);
    const previousInvoiceData = readObject(editItem?.invoice_data);
    const {
      paymentMethod: _legacyPaymentMethod,
      paymentInstructions: _legacyPaymentInstructions,
      ...invoiceDataWithoutLegacyPayment
    } = previousInvoiceData;
    const record = {
      number: clean(draft.number) || `INV-${Date.now().toString().slice(-6)}`,
      client_id: draft.client_id || null,
      proposal_id: draft.proposal_id || null,
      product_id: draft.product_id || null,
      tax,
      discount,
      status: nextStatus,
      date_issued: clean(draft.date_issued) || new Date().toISOString().split("T")[0],
      due_date:
        clean(draft.due_date) || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      notes: clean(draft.notes),
      payment_link: null,
      ...(nextStatus === "Sent" ? { sent_at: new Date().toISOString() } : {}),
      invoice_data: {
        ...invoiceDataWithoutLegacyPayment,
        clientName: clean(draft.clientName),
        clientCompany: clean(draft.clientCompany),
        clientEmail: clean(draft.clientEmail),
        clientPhone: clean(draft.clientPhone),
        clientAddress: clean(draft.clientAddress),
        clientTaxId: clean(draft.clientTaxId),
        issuerName: clean(draft.issuerName),
        issuerTaxId: clean(draft.issuerTaxId),
        issuerEmail: clean(draft.issuerEmail),
        issuerPhone: clean(draft.issuerPhone),
        issuerAddress: clean(draft.issuerAddress),
        issuerWebsite: clean(draft.issuerWebsite),
        relatedProposalNumber: clean(draft.relatedProposalNumber),
        relatedProposalTitle: clean(draft.relatedProposalTitle),
        productName: clean(draft.productName),
      },
    };

    setEditorSaving(true);
    setEditorError(null);
    try {
      const db = supabase as any;
      const { data: savedResult, error: saveError } = await db.rpc("save_invoice_with_items", {
        p_invoice_id: editItem?.id || null,
        p_invoice: record,
        p_items: rows.map((row) => ({
          description: row.description,
          quantity: row.quantity,
          unit_price: row.unit_price,
        })),
      });
      if (saveError) throw saveError;
      const rpcRow = Array.isArray(savedResult) ? savedResult[0] : savedResult;
      const invoiceId = String(rpcRow?.invoice_id || "");
      if (!invoiceId) throw new Error("No se pudo confirmar el ID de la factura guardada.");

      const { data: saved, error: invoiceLoadError } = await db
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", invoiceId)
        .single();
      if (invoiceLoadError) throw invoiceLoadError;

      const { data: savedItems, error: itemsLoadError } = await db
        .from("invoice_items")
        .select("id, description, quantity, unit_price, total")
        .eq("company_id", companyId)
        .eq("invoice_id", invoiceId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (itemsLoadError) throw itemsLoadError;

      setItemsDraft(
        (savedItems || []).length
          ? (savedItems || []).map((row: any) => ({
              id: row.id,
              description: String(row.description || ""),
              quantity: Number(row.quantity || 0) || 0,
              unit_price: Number(row.unit_price || 0) || 0,
              total: Number(row.total || 0) || 0,
            }))
          : [],
      );
      setLoadedInvoiceItemCount((savedItems || []).length);
      setSelected(saved as Invoice);
      await fetch();
      if (closeAfterSave) {
        setDrawerOpen(false);
        setDrawerMode("view");
        setEditItem(null);
      } else {
        setEditItem(saved as Invoice);
        setDrawerMode("edit");
      }
      if (!silent) {
        void sendInvoiceNotification(
          nextStatus === "Sent"
            ? "Factura enviada"
            : editItem
              ? "Factura actualizada"
              : "Factura creada",
          nextStatus === "Sent"
            ? `${record.number} fue marcada como enviada.`
            : `${record.number} fue guardada como borrador.`,
        );
        toast.success(
          nextStatus === "Sent" ? "Factura marcada como enviada." : "Borrador guardado.",
        );
      }
      return saved;
    } catch (err: any) {
      const message = err?.message || "No se pudo guardar la factura.";
      setEditorError(message);
      toast.error(message);
      return null;
    } finally {
      setEditorSaving(false);
    }
  };

  const editorInitialDraft = useMemo<InvoiceEditorDraft>(() => {
    const sourceData = readObject(editItem?.invoice_data);
    const today = new Date().toISOString().split("T")[0];
    const dueDefault = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const product = editItem?.product_id
      ? products.find((item) => item.id === editItem.product_id)
      : null;
    const proposal = editItem?.proposal_id
      ? proposals.find((item) => item.id === editItem.proposal_id)
      : null;
    const currency =
      getInvoiceDisplayCurrency(
        editItem ||
          ({
            product_id: product?.id || null,
            proposal_id: proposal?.id || null,
            invoice_data: sourceData,
          } as Invoice),
      ) ||
      product?.currency ||
      proposal?.currency ||
      "USD";
    return {
      number: editItem?.number || `INV-${Date.now().toString().slice(-6)}`,
      status: editItem?.status || "Draft",
      client_id: editItem?.client_id || null,
      proposal_id: editItem?.proposal_id || null,
      product_id: editItem?.product_id || null,
      currency,
      date_issued: editItem?.date_issued || today,
      due_date: editItem?.due_date || dueDefault,
      notes: editItem?.notes || null,
      clientName: readTextValue(sourceData.clientName) || null,
      clientCompany: readTextValue(sourceData.clientCompany) || null,
      clientEmail: readTextValue(sourceData.clientEmail) || null,
      clientPhone: readTextValue(sourceData.clientPhone) || null,
      clientAddress: readTextValue(sourceData.clientAddress) || null,
      clientTaxId: readTextValue(sourceData.clientTaxId) || null,
      issuerName: readTextValue(sourceData.issuerName) || null,
      issuerTaxId: readTextValue(sourceData.issuerTaxId) || null,
      issuerEmail: readTextValue(sourceData.issuerEmail) || null,
      issuerPhone: readTextValue(sourceData.issuerPhone) || null,
      issuerAddress: readTextValue(sourceData.issuerAddress) || null,
      issuerWebsite: readTextValue(sourceData.issuerWebsite) || null,
      relatedProposalNumber:
        readTextValue(sourceData.relatedProposalNumber) || proposal?.number || null,
      relatedProposalTitle:
        readTextValue(sourceData.relatedProposalTitle) || proposal?.title || null,
      productName: readTextValue(sourceData.productName) || product?.name || null,
      tax: Number(editItem?.tax || 0) || 0,
      discount: Number(editItem?.discount || 0) || 0,
      legacySubtotal: Number(editItem?.subtotal || 0) || 0,
      items: itemsDraft.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity || 0) || 0,
        unit_price: Number(item.unit_price || 0) || 0,
        total: Number(item.total || 0) || 0,
      })),
    };
  }, [editItem, itemsDraft, products, proposals]);

  if (loading) return <LoadingState />;

  const invData =
    editItem?.invoice_data && typeof editItem.invoice_data === "object"
      ? (editItem.invoice_data as Record<string, any>)
      : {};
  const selectedInvoiceData = readObject(selected?.invoice_data);
  const selectedCurrency = selected ? getInvoiceDisplayCurrency(selected) : "USD";
  const selectedClient = selected?.client_id ? clientsById[selected.client_id] : null;
  const selectedProposal = selected?.proposal_id ? proposalsById[selected.proposal_id] : null;
  const selectedProduct = selected?.product_id ? productsById[selected.product_id] : null;
  const selectedPublicUrl = selected ? getPublicInvoiceUrl(selected) : null;
  const selectedBalance = selected ? getInvoiceBalance(selected) : 0;
  const selectedSummaryFields = selected
    ? [
        { label: "Número", value: selected.number, mono: true },
        { label: "Cliente", value: getClientLabel(selected) },
        {
          label: "Contacto",
          value:
            readTextValue(selectedInvoiceData.clientName) ||
            selectedClient?.contact_person ||
            readTextValue(selectedInvoiceData.clientEmail) ||
            selectedClient?.email ||
            null,
        },
        { label: "Producto / servicio", value: getProductName(selected) },
        {
          label: "Propuesta",
          value:
            getProposalNumber(selected) !== "—"
              ? `${getProposalNumber(selected)}${getProposalTitle(selected) !== "—" ? ` · ${getProposalTitle(selected)}` : ""}`
              : null,
        },
        { label: "Proyecto", value: linkedProjectId ? "Proyecto confirmado" : null },
        { label: "Fecha emitida", value: formatInvoiceDate(selected.date_issued) },
        { label: "Vencimiento", value: formatInvoiceDueDate(selected.due_date) },
        { label: "Enviada", value: formatInvoiceDateTime(selected.sent_at) },
        { label: "Vista", value: formatInvoiceDateTime(selected.viewed_at) },
        { label: "Pagada", value: formatInvoiceDateTime(selected.paid_at) },
        { label: "Token público", value: selected.public_token, mono: true },
      ]
    : [];
  const selectedIssuerFields = [
    { label: "Nombre", value: readTextValue(selectedInvoiceData.issuerName) },
    { label: "ID fiscal", value: readTextValue(selectedInvoiceData.issuerTaxId) },
    { label: "Correo", value: readTextValue(selectedInvoiceData.issuerEmail) },
    { label: "Teléfono", value: readTextValue(selectedInvoiceData.issuerPhone) },
    { label: "Dirección", value: readTextValue(selectedInvoiceData.issuerAddress) },
    { label: "Sitio web", value: readTextValue(selectedInvoiceData.issuerWebsite) },
  ];
  const selectedClientFields = selected
    ? [
        {
          label: "Nombre",
          value: readTextValue(selectedInvoiceData.clientName) || selectedClient?.contact_person,
        },
        {
          label: "Empresa",
          value:
            readTextValue(selectedInvoiceData.clientCompany) ||
            selectedClient?.company_name ||
            readTextValue(selectedInvoiceData.clientName) ||
            selectedClient?.contact_person,
        },
        {
          label: "Correo",
          value: readTextValue(selectedInvoiceData.clientEmail) || selectedClient?.email,
        },
        { label: "Teléfono", value: readTextValue(selectedInvoiceData.clientPhone) },
        { label: "ID fiscal", value: readTextValue(selectedInvoiceData.clientTaxId) },
        { label: "Dirección", value: readTextValue(selectedInvoiceData.clientAddress) },
        {
          label: "Producto / servicio",
          value:
            selectedProduct?.name ||
            readTextValue(selectedInvoiceData.productName) ||
            readTextValue(selectedProposal?.title),
        },
      ]
    : [];
  const selectedActivity = selected
    ? ([
        {
          key: "created",
          title: "Factura creada",
          description: selected.number,
          rawDate: selected.created_at,
        },
        {
          key: "updated",
          title: "Factura actualizada",
          description: selected.number,
          rawDate:
            selected.updated_at && selected.updated_at !== selected.created_at
              ? selected.updated_at
              : null,
        },
        {
          key: "sent",
          title: "Factura enviada",
          description: "La factura tiene fecha de envío registrada.",
          rawDate: selected.sent_at,
        },
        {
          key: "viewed",
          title: "Factura vista",
          description: "La factura tiene fecha de visualización registrada.",
          rawDate: selected.viewed_at,
        },
        {
          key: "paid",
          title: "Factura pagada",
          description: "La factura tiene fecha de pago registrada.",
          rawDate: selected.paid_at,
        },
      ]
        .filter((event) => event.rawDate)
        .sort(
          (a, b) => new Date(String(b.rawDate)).getTime() - new Date(String(a.rawDate)).getTime(),
        )
        .map((event) => ({
          key: event.key,
          title: event.title,
          description: event.description,
          date: formatInvoiceDateTime(event.rawDate),
        })) as InvoiceActivityEvent[])
    : [];
  const selectedDetailActions = selected ? (
    <>
      {isInvoicePaid(selected) ? (
        linkedProjectId ? (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs"
            onClick={() => viewProject(linkedProjectId)}
            disabled={!canViewProjects}
          >
            Ver proyecto
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs"
            onClick={() => void createProjectFromInvoice(selected.id)}
            disabled={creatingProject || !canCreateProjectRecord}
          >
            {creatingProject ? "Creando..." : "Crear proyecto"}
          </Button>
        )
      ) : isInvoiceDraft(selected) ? (
        <Button
          variant="default"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            setEditItem(selected);
            setEditorPaymentFeedback(null);
            setDrawerMode("edit");
          }}
        >
          Editar
        </Button>
      ) : null}
      {canCreatePayment && !isInvoicePaid(selected) && !isInvoiceCancelled(selected) ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => void registerPayment(selected)}
        >
          Registrar pago
        </Button>
      ) : null}
      {renderActionsMenu(selected)}
    </>
  ) : null;

  return (
    <div data-demo="invoices-main" className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Facturas"
        subtitle={`${filtered.length} facturas`}
        actionLabel="Nueva factura"
        onAction={() => {
          setSelected(null);
          setEditItem(null);
          setEditorPaymentFeedback(null);
          setDrawerMode("create");
          setDrawerOpen(true);
        }}
      />
      <InvoiceSummaryMetrics
        metrics={invoiceMetrics}
        onSelect={(key) => {
          const next = key as InvoiceOperationalFilter;
          setOperationalFilter((current) => (current === next ? "all" : next));
          setStatusFilter("all");
        }}
      />

      <DataCard className="max-md:border-0 max-md:bg-transparent max-md:shadow-none" noPadding>
        <div data-demo="invoices-list" className="space-y-4 p-0 md:p-5">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por factura, cliente, email, propuesta o producto..."
            filters={[
              {
                key: "operation",
                placeholder: "Operación",
                value: operationalFilter,
                onChange: (value) => setOperationalFilter(value as InvoiceOperationalFilter),
                width: "w-44",
                options: [
                  { label: "Pendientes", value: "pending" },
                  { label: "Vencidas", value: "overdue" },
                  { label: "Pagadas", value: "paid" },
                  { label: "Borradores", value: "draft" },
                ],
              },
              {
                key: "status",
                placeholder: "Estado",
                value: statusFilter,
                onChange: setStatusFilter,
                options: INVOICE_STATUSES.map((s) => ({
                  label: displayInvoiceStatus(s),
                  value: s,
                })),
              },
              {
                key: "client",
                placeholder: "Cliente",
                value: clientFilter,
                onChange: setClientFilter,
                width: "w-48",
                options: clients.map((client) => ({
                  label: client.contact_person
                    ? `${client.company_name} · ${client.contact_person}`
                    : client.company_name,
                  value: client.id,
                })),
              },
              {
                key: "due",
                placeholder: "Vencimiento",
                value: dueFilter,
                onChange: (value) => setDueFilter(value as InvoiceDueFilter),
                width: "w-44",
                options: [
                  { label: "Hoy", value: "today" },
                  { label: "Próximos 7 días", value: "week" },
                  { label: "Próximos 31 días", value: "month" },
                  { label: "Vencidas", value: "overdue" },
                ],
              },
              {
                key: "amount",
                placeholder: "Monto",
                value: amountFilter,
                onChange: (value) => setAmountFilter(value as InvoiceAmountFilter),
                width: "w-44",
                options: [
                  { label: "Menos de 1K", value: "lt1000" },
                  { label: "1K a 5K", value: "1000_5000" },
                  { label: "5K a 10K", value: "5000_10000" },
                  { label: "10K o más", value: "gte10000" },
                ],
              },
            ]}
          />

          {activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>
                {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} activo
                {activeFilterCount === 1 ? "" : "s"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={resetFilters}
              >
                Restablecer filtros
              </Button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Error al cargar facturas: {error}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No hay facturas"
              description={
                activeFilterCount > 0
                  ? "No hay facturas que coincidan con los filtros activos."
                  : "Crea tu primera factura."
              }
              actionLabel={activeFilterCount > 0 ? "Restablecer filtros" : "Nueva factura"}
              onAction={() => {
                if (activeFilterCount > 0) {
                  resetFilters();
                  return;
                }
                setSelected(null);
                setEditItem(null);
                setEditorPaymentFeedback(null);
                setDrawerMode("create");
                setDrawerOpen(true);
              }}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="min-w-[280px] pl-4">Factura</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="min-w-[120px]">Emitida</TableHead>
                      <TableHead className="min-w-[140px]">Vencimiento</TableHead>
                      <TableHead className="min-w-[140px] text-right">Total</TableHead>
                      <TableHead className="min-w-[120px]">Cobro</TableHead>
                      <TableHead className="min-w-[160px] pr-4 text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((invoice, index) => {
                      const hasProject = Boolean(projectByInvoiceId[invoice.id]);
                      const currency = getInvoiceDisplayCurrency(invoice);
                      return (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => openInvoiceDetail(invoice)}
                        >
                          <TableCell
                            data-demo={index === 0 ? "invoice-first-row" : undefined}
                            className="pl-4"
                          >
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate font-semibold text-slate-950">
                                  {invoice.number}
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                                  {getProposalNumber(invoice)}
                                </span>
                              </div>
                              <div className="mt-1 truncate text-sm text-muted-foreground">
                                {getClientLabel(invoice)}
                              </div>
                              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                {getProductName(invoice)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell data-demo={index === 0 ? "invoice-status" : undefined}>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatInvoiceDate(invoice.date_issued)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatInvoiceDueDate(invoice.due_date)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatInvoiceMoney(invoice.total, currency)}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-muted-foreground">
                            {collectionLabel(invoice)}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <div
                              className="flex items-center justify-end gap-2"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            >
                              <Button
                                type="button"
                                size="sm"
                                className="h-8"
                                onClick={() => runPrimaryInvoiceAction(invoice)}
                              >
                                {getInvoicePrimaryAction(invoice, hasProject)}
                              </Button>
                              {renderActionsMenu(invoice)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {filtered.map((invoice) => {
                  const hasProject = Boolean(projectByInvoiceId[invoice.id]);
                  return (
                    <InvoiceMobileCard
                      key={invoice.id}
                      number={invoice.number}
                      client={getClientLabel(invoice)}
                      service={getProductName(invoice)}
                      proposal={getProposalNumber(invoice)}
                      status={invoice.status}
                      total={formatInvoiceMoney(invoice.total, getInvoiceDisplayCurrency(invoice))}
                      dueLabel={formatInvoiceDueDate(invoice.due_date)}
                      collectionLabel={collectionLabel(invoice)}
                      actionLabel={getInvoicePrimaryAction(invoice, hasProject)}
                      actionMenu={renderActionsMenu(invoice)}
                      onOpen={() => openInvoiceDetail(invoice)}
                      onPrimaryAction={() => runPrimaryInvoiceAction(invoice)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DataCard>

      <Sheet
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) {
            setDrawerMode("view");
            setEditItem(null);
            setSelected(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex h-dvh w-screen max-w-none flex-col p-0 sm:max-w-[860px]"
        >
          <div className="border-b px-5 py-4">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle>
                {drawerMode === "create"
                  ? "Nueva factura"
                  : drawerMode === "edit"
                    ? `Editar factura ${editItem?.number || ""}`.trim()
                    : selected?.number || "Factura"}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {drawerMode === "view" && selected ? (
                  <>
                    Estado:{" "}
                    <span className="font-medium text-foreground">
                      {displayInvoiceStatus(selected.status)}
                    </span>
                  </>
                ) : (
                  "Completa los datos principales, relación comercial, artículos y condiciones de la factura."
                )}
              </SheetDescription>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-4">
              {drawerMode === "view" && selected ? (
                <>
                  <InvoiceDetailsPanel
                    invoice={selected}
                    actions={selectedDetailActions}
                    summaryFields={selectedSummaryFields}
                    issuerFields={selectedIssuerFields}
                    clientFields={selectedClientFields}
                    items={detailItems}
                    itemsLoading={detailItemsLoading}
                    itemsError={detailItemsError}
                    activity={selectedActivity}
                    currency={selectedCurrency}
                    total={formatInvoiceMoney(selected.total, selectedCurrency)}
                    balance={formatInvoiceMoney(selectedBalance, selectedCurrency)}
                    subtotal={formatInvoiceMoney(selected.subtotal, selectedCurrency)}
                    tax={formatInvoiceMoney(selected.tax, selectedCurrency)}
                    discount={formatInvoiceMoney(selected.discount, selectedCurrency)}
                    notes={selected.notes}
                    publicUrl={selectedPublicUrl}
                    formatMoney={formatInvoiceMoney}
                  />
                  <PaymentReceiptsPanel
                    invoiceId={selected.id}
                    compact
                    refreshKey={paymentReceiptsRefreshKey}
                  />
                </>
              ) : null}

              {drawerMode === "create" || drawerMode === "edit" ? (
                <InvoiceEditor
                  mode={drawerMode}
                  initialDraft={editorInitialDraft}
                  clients={clients}
                  products={products}
                  proposals={proposals}
                  statusOptions={INVOICE_STATUSES}
                  publicToken={editItem?.public_token}
                  publicUrl={editItem ? getPublicInvoiceUrl(editItem) : null}
                  saving={editorSaving}
                  error={editorError}
                  onCancel={() => {
                    setDrawerOpen(false);
                    setDrawerMode("view");
                    setEditItem(null);
                  }}
                  onCopyPublic={() =>
                    editItem
                      ? void copyPublicInvoiceLink(editItem)
                      : toast.error("Guarda la factura para generar el enlace")
                  }
                  onOpenPublic={() =>
                    editItem
                      ? openPublicInvoice(editItem)
                      : toast.error("Guarda la factura para ver el enlace")
                  }
                  onRegisterPayment={async (draft) => {
                    if (!canCreatePayment) {
                      toast.error("No tienes permiso para registrar pagos.");
                      return;
                    }
                    paymentCreatedRef.current = false;
                    setEditorPaymentFeedback({
                      status: "preparing",
                      title: "Preparando pago...",
                      description: editItem?.id
                        ? "Guardando los últimos cambios antes de abrir el registro de pago."
                        : "Guardando la factura como borrador para enlazar el pago.",
                    });
                    const saved = await saveEditorDraft(draft, "Draft", {
                      closeAfterSave: false,
                      silent: true,
                    });
                    if (saved) {
                      void registerPayment(saved);
                    } else {
                      setEditorPaymentFeedback(null);
                    }
                  }}
                  canRegisterPayment={
                    editItem
                      ? canCreatePayment &&
                        !isInvoicePaid(editItem) &&
                        !isInvoiceCancelled(editItem)
                      : canCreatePayment
                  }
                  registerPaymentHint={
                    editItem?.id
                      ? undefined
                      : "Al registrar el pago, la factura se guardará automáticamente como borrador."
                  }
                  paymentFeedback={editorPaymentFeedback}
                  onSaveDraft={async (draft) => {
                    await saveEditorDraft(draft, "Draft");
                  }}
                  onConfirmSend={async (draft) => {
                    await saveEditorDraft(draft, "Sent");
                  }}
                />
              ) : null}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (
            !open &&
            !paymentCreatedRef.current &&
            editorPaymentFeedback?.status === "preparing"
          ) {
            setEditorPaymentFeedback(null);
          }
        }}
        initialValues={paymentInitialValues}
        onCreated={(result: PaymentFormCreatedResult) => {
          paymentCreatedRef.current = true;
          setPaymentReceiptsRefreshKey((current) => current + 1);
          const amount = Number(result.payment.amount || 0) || 0;
          const reference = String(result.payment.reference || "").trim();
          if (result.projectId && result.payment.invoice_id) {
            const invoiceId = String(result.payment.invoice_id);
            setLinkedProjectId(result.projectId);
            setProjectByInvoiceId((prev) => ({ ...prev, [invoiceId]: result.projectId! }));
          }
          void fetch();
          setEditorPaymentFeedback({
            status: "registered",
            title: "Pago registrado",
            description: [
              reference ? reference : null,
              amount > 0 ? formatInvoiceMoney(amount, selectedCurrency) : null,
              result.becamePaid ? "Factura pagada." : null,
              result.remainingBalance != null && result.remainingBalance > 0
                ? `Saldo pendiente: ${formatInvoiceMoney(result.remainingBalance, selectedCurrency)}`
                : null,
              result.projectCreated ? "Proyecto creado." : null,
              result.receiptUploaded ? "Comprobante adjunto." : "Sin comprobante adjunto.",
            ]
              .filter(Boolean)
              .join(" · "),
          });
          toast.success("Pago registrado en la factura.");
        }}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar factura</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await remove(deleteId!);
                  toast.success("Factura eliminada");
                  setDeleteId(null);
                  setSelected(null);
                  setEditItem(null);
                  setDrawerOpen(false);
                  setDrawerMode("view");
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drawer handles view/create/edit */}
    </div>
  );
}
