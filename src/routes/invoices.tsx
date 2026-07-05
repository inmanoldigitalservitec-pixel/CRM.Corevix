import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Receipt } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isPaidInvoiceStatus, normalizeStatus } from "@/lib/crm/status";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";

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
const NO_CLIENT = "__no_client__";
const NO_PROPOSAL = "__no_proposal__";
const NO_PRODUCT = "__no_product__";

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
  proposal_data?: any | null;
};

type ProductLite = { id: string; name: string | null };
type ClientLite = { id: string; company_name: string; contact_person: string | null };

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && String(v).trim()))));
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
type ClientOption = { id: string; company_name: string; contact_person: string | null };
type ProposalOption = { id: string; number: string; title: string | null };

function InvoicesPage() {
  const { profile, user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editItem, setEditItem] = useState<Invoice | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data, loading, error, create, update, remove } = useCrud<Invoice>({
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
    select: "id, company_name, contact_person",
    orderBy: "company_name",
    ascending: true,
  });

  const { data: proposals } = useCrud<ProposalOption>({
    table: "proposals",
    select: "id, number, title",
    orderBy: "updated_at",
    ascending: false,
    limit: 200,
  });

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

      try {
        const db = supabase as any;

        if (proposalIds.length) {
          const { data: rows, error } = await db
            .from("proposals")
            .select("id, number, title, proposal_data")
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
            .select("id, name")
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
            .select("id, company_name, contact_person")
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
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((i) => {
      const p = i.proposal_id ? proposalsById[i.proposal_id] : null;
      const prod = i.product_id ? productsById[i.product_id] : null;
      const client = i.client_id ? clientsById[i.client_id] : null;
      const proposalCompany =
        p?.proposal_data && typeof p.proposal_data === "object" ? p.proposal_data : {};
      const fallbackClient = String(
        (proposalCompany as any)?.companyName || (proposalCompany as any)?.clientName || "",
      );

      const haystack =
        `${i.number} ${i.notes || ""} ${p?.number || ""} ${p?.title || ""} ${prod?.name || ""} ${client?.company_name || ""} ${fallbackClient}`.toLowerCase();
      const matchSearch = !q || haystack.includes(q);
      const matchStatus =
        statusFilter === "all" || normalizeStatus(i.status) === normalizeStatus(statusFilter);
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter, proposalsById, productsById, clientsById]);

  const getClientLabel = (inv: Invoice) => {
    const client = inv.client_id ? clientsById[inv.client_id] : null;
    const direct = client?.company_name || "";
    if (direct) return direct;
    const p = inv.proposal_id ? proposalsById[inv.proposal_id] : null;
    const pd = p?.proposal_data && typeof p.proposal_data === "object" ? p.proposal_data : {};
    return (
      String((pd as any)?.companyName || "").trim() ||
      String((pd as any)?.clientName || "").trim() ||
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
    return String(prod?.name || "").trim() || "—";
  };

  const [itemsDraft, setItemsDraft] = useState<InvoiceItemDraft[]>([]);
  const [totalsDraft, setTotalsDraft] = useState<{
    subtotal: string;
    tax: string;
    discount: string;
  }>({
    subtotal: "",
    tax: "0",
    discount: "0",
  });
  const [totalsDirty, setTotalsDirty] = useState(false);
  const [editorSelects, setEditorSelects] = useState<{
    status: string;
    client_id: string;
    proposal_id: string;
    product_id: string;
  }>({ status: "Draft", client_id: NO_CLIENT, proposal_id: NO_PROPOSAL, product_id: NO_PRODUCT });

  useEffect(() => {
    const editorOpen = drawerOpen && (drawerMode === "create" || drawerMode === "edit");
    if (!editorOpen) return;
    setTotalsDirty(false);
    setTotalsDraft({
      subtotal: editItem?.subtotal != null ? String(editItem.subtotal) : "",
      tax: editItem?.tax != null ? String(editItem.tax) : "0",
      discount: editItem?.discount != null ? String(editItem.discount) : "0",
    });
    setEditorSelects({
      status: editItem?.status || "Draft",
      client_id: editItem?.client_id || NO_CLIENT,
      proposal_id: String(editItem?.proposal_id || NO_PROPOSAL),
      product_id: String(editItem?.product_id || NO_PRODUCT),
    });
  }, [drawerOpen, drawerMode, editItem?.id]);

  const applyProductDefaults = (
    product: ProductOption | undefined | null,
    opts?: { force?: boolean },
  ) => {
    if (!product) return;
    const force = Boolean(opts?.force);
    const price = Number(product.base_price || 0) || 0;
    if (price <= 0) return;

    if (force || !totalsDirty) {
      setTotalsDraft((prev) => {
        const currentSubtotal = Number(prev.subtotal || 0) || 0;
        if (!force && currentSubtotal > 0) return prev;
        return { ...prev, subtotal: String(price) };
      });
    }

    setItemsDraft((prev) => {
      if (!prev.length) {
        return [{ description: product.name || "", quantity: 1, unit_price: price, total: price }];
      }
      const first = prev[0];
      const firstDesc = String(first?.description || "").trim();
      const firstPrice = Number(first?.unit_price || 0) || 0;
      if (!force && (firstDesc || firstPrice > 0)) return prev;
      const next = [...prev];
      next[0] = {
        ...first,
        description: product.name || firstDesc,
        quantity: 1,
        unit_price: price,
        total: price,
      };
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loadItems = async () => {
      const editorOpen = drawerOpen && (drawerMode === "create" || drawerMode === "edit");
      if (!editorOpen || !editItem?.id) {
        if (editorOpen && !editItem) {
          setItemsDraft([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
        }
        return;
      }
      try {
        const db = supabase as any;
        const { data: rows, error } = await db
          .from("invoice_items")
          .select("id, description, quantity, unit_price, total")
          .eq("invoice_id", editItem.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const next: InvoiceItemDraft[] = (rows || []).map((r: any) => ({
          id: r.id,
          description: String(r.description || ""),
          quantity: Number(r.quantity || 0) || 0,
          unit_price: Number(r.unit_price || 0) || 0,
          total: Number(r.total || 0) || 0,
        }));
        if (!cancelled)
          setItemsDraft(
            next.length ? next : [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
          );
      } catch {
        if (!cancelled) setItemsDraft([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
      }
    };
    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, drawerMode, editItem?.id]);

  const openPublicInvoice = (inv: Invoice) => {
    const token = String(inv.public_token || "").trim();
    if (!token) {
      toast.error("Esta factura no tiene enlace público");
      return;
    }
    const url = `${window.location.origin}/invoice/public/${token}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectByInvoiceId, setProjectByInvoiceId] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!drawerOpen || drawerMode !== "view" || !selected) {
        setLinkedProjectId(null);
        return;
      }
      try {
        const db = supabase as any;
        let q = db.from("projects").select("id").eq("invoice_id", selected.id).limit(1);
        const { data: byInvoice, error: e1 } = await q;
        if (e1) throw e1;
        const first = Array.isArray(byInvoice) && byInvoice.length ? byInvoice[0] : null;
        if (first?.id) {
          if (!cancelled) setLinkedProjectId(String(first.id));
          return;
        }
        if (selected.proposal_id) {
          const { data: byProposal, error: e2 } = await db
            .from("projects")
            .select("id")
            .eq("proposal_id", selected.proposal_id)
            .limit(1);
          if (e2) throw e2;
          const p = Array.isArray(byProposal) && byProposal.length ? byProposal[0] : null;
          if (!cancelled) setLinkedProjectId(p?.id ? String(p.id) : null);
        } else if (!cancelled) {
          setLinkedProjectId(null);
        }
      } catch {
        if (!cancelled) setLinkedProjectId(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, drawerMode, selected?.id, selected?.proposal_id]);

  const createProjectFromInvoice = async (invoiceId: string) => {
    if (!invoiceId) return;
    setCreatingProject(true);
    try {
      const db = supabase as any;
      const { data, error } = await db.rpc("create_project_from_paid_invoice", {
        p_invoice_id: invoiceId,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const projectId = result?.project_id ? String(result.project_id) : null;
      if (projectId) setLinkedProjectId(projectId);
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
    const token = String(inv.public_token || "").trim();
    if (!token) {
      toast.error("Esta factura no tiene enlace público");
      return;
    }
    const url = `${window.location.origin}/invoice/public/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de factura copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const invoiceIds = uniqueStrings(data.map((i) => i.id));
      const proposalIds = uniqueStrings(data.map((i) => i.proposal_id));
      if (!invoiceIds.length && !proposalIds.length) {
        if (!cancelled) setProjectByInvoiceId({});
        return;
      }
      try {
        const db = supabase as any;
        const map: Record<string, string> = {};

        if (invoiceIds.length) {
          const { data: byInvoice, error: e1 } = await db
            .from("projects")
            .select("id, invoice_id")
            .in("invoice_id", invoiceIds);
          if (e1) throw e1;
          for (const row of byInvoice || []) {
            if (row?.invoice_id) map[String(row.invoice_id)] = String(row.id);
          }
        }

        if (proposalIds.length) {
          const { data: byProposal, error: e2 } = await db
            .from("projects")
            .select("id, proposal_id, invoice_id")
            .in("proposal_id", proposalIds);
          if (e2) throw e2;

          const invoiceByProposal = new Map<string, string>();
          for (const inv of data) {
            if (inv.proposal_id) invoiceByProposal.set(String(inv.proposal_id), String(inv.id));
          }
          for (const row of byProposal || []) {
            if (!row?.proposal_id) continue;
            const invoiceId = row.invoice_id
              ? String(row.invoice_id)
              : invoiceByProposal.get(String(row.proposal_id));
            if (invoiceId && !map[invoiceId]) {
              map[invoiceId] = String(row.id);
            }
          }
        }

        if (!cancelled) setProjectByInvoiceId(map);
      } catch {
        if (!cancelled) setProjectByInvoiceId({});
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const asUuidOrNull = (v: FormDataEntryValue | null) => {
      const s = String(v || "").trim();
      if (!s) return null;
      if (s === NO_CLIENT || s === NO_PROPOSAL || s === NO_PRODUCT) return null;
      return s;
    };
    const readText = (name: string) => {
      const v = fd.get(name);
      const s = String(v || "").trim();
      return s ? s : null;
    };

    const subtotal = Number(fd.get("subtotal")) || 0;
    const tax = Number(fd.get("tax")) || 0;
    const discount = Number(fd.get("discount")) || 0;

    const prevInvoiceData =
      editItem?.invoice_data && typeof editItem.invoice_data === "object"
        ? (editItem.invoice_data as Record<string, any>)
        : {};
    const invoice_data = {
      ...prevInvoiceData,
      clientName: readText("clientName"),
      clientCompany: readText("clientCompany"),
      clientEmail: readText("clientEmail"),
      clientPhone: readText("clientPhone"),
      clientAddress: readText("clientAddress"),
      clientTaxId: readText("clientTaxId"),
      issuerName: readText("issuerName"),
      issuerTaxId: readText("issuerTaxId"),
      issuerEmail: readText("issuerEmail"),
      issuerPhone: readText("issuerPhone"),
      issuerAddress: readText("issuerAddress"),
      issuerWebsite: readText("issuerWebsite"),
      paymentMethod: readText("paymentMethod"),
      paymentInstructions: readText("paymentInstructions"),
      relatedProposalNumber: readText("relatedProposalNumber"),
      relatedProposalTitle: readText("relatedProposalTitle"),
      productName: readText("productName"),
    };

    const record = {
      number: fd.get("number") as string,
      client_id: asUuidOrNull(fd.get("client_id")),
      proposal_id: asUuidOrNull(fd.get("proposal_id")),
      product_id: asUuidOrNull(fd.get("product_id")),
      subtotal,
      tax,
      discount,
      total: subtotal + tax - discount,
      status: (fd.get("status") as string) || "Draft",
      date_issued: (fd.get("date_issued") as string) || new Date().toISOString().split("T")[0],
      due_date:
        (fd.get("due_date") as string) ||
        new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      notes: (fd.get("notes") as string) || null,
      payment_link: readText("payment_link"),
      invoice_data,
    };
    try {
      let saved: Invoice | null = null;
      if (editItem) {
        saved = (await update(editItem.id, record)) as Invoice | null;
        void sendInvoiceNotification(
          "Factura actualizada",
          `${record.number || editItem.number || "Factura"} fue actualizada.`,
        );
        toast.success("Factura actualizada");
        setSelected(null);
      } else {
        saved = (await create(record)) as Invoice | null;
        void sendInvoiceNotification("Factura creada", `${record.number || "Factura"} fue creada.`);
        toast.success("Factura creada");
      }

      if (saved?.id) {
        const rows = itemsDraft
          .map((it) => ({
            description: String(it.description || "").trim(),
            quantity: Number(it.quantity || 0) || 0,
            unit_price: Number(it.unit_price || 0) || 0,
          }))
          .filter((it) => it.description && it.quantity > 0);

        const db = supabase as any;
        await db.from("invoice_items").delete().eq("invoice_id", saved.id);
        if (rows.length) {
          await db.from("invoice_items").insert(
            rows.map((it) => ({
              invoice_id: saved!.id,
              description: it.description,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total: Number(it.quantity) * Number(it.unit_price),
            })),
          );
        }

        // If invoice is Paid, create project + workflow tasks (idempotent).
        if (isPaidInvoiceStatus((record as any).status)) {
          await createProjectFromInvoice(saved.id);
        }
      }

      setDrawerOpen(false);
      setDrawerMode("view");
      setEditItem(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingState />;

  const invData =
    editItem?.invoice_data && typeof editItem.invoice_data === "object"
      ? (editItem.invoice_data as Record<string, any>)
      : {};

  return (
    <div data-demo="invoices-main" className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Facturas"
        subtitle={`${filtered.length} facturas`}
        actionLabel="Nueva factura"
        onAction={() => {
          setSelected(null);
          setEditItem(null);
          setDrawerMode("create");
          setDrawerOpen(true);
        }}
      />
      <DataCard>
        <div data-demo="invoices-list">
          <div className="space-y-4">
            <SearchFilters
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar facturas..."
              filters={[
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
              ]}
            />
            {error ? (
              <div className="rounded-lg border bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Error al cargar facturas: {error}
              </div>
            ) : null}
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title="No hay facturas"
                description="Crea tu primera factura."
                actionLabel="Nueva factura"
                onAction={() => {
                  setSelected(null);
                  setEditItem(null);
                  setDrawerMode("create");
                  setDrawerOpen(true);
                }}
              />
            ) : (
              <div className="overflow-x-auto -mx-4 sm:-mx-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4 sm:pl-5">Número</TableHead>
                      <TableHead className="hidden md:table-cell">Cliente</TableHead>
                      <TableHead className="hidden lg:table-cell">Servicio</TableHead>
                      <TableHead className="hidden lg:table-cell">Propuesta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="hidden md:table-cell">Emitida</TableHead>
                      <TableHead className="hidden md:table-cell">Vence</TableHead>
                      <TableHead className="pr-4 sm:pr-5 text-right"> </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i, index) => (
                      <TableRow
                        key={i.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => {
                          setSelected(i);
                          setEditItem(null);
                          setDrawerMode("view");
                          setDrawerOpen(true);
                        }}
                      >
                        <TableCell
                          data-demo={index === 0 ? "invoice-first-row" : undefined}
                          className="font-medium pl-4 sm:pl-5"
                        >
                          {i.number}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {getClientLabel(i)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {getProductName(i)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          <div className="font-mono text-xs">{getProposalNumber(i)}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[360px]">
                            {getProposalTitle(i)}
                          </div>
                        </TableCell>
                        <TableCell data-demo={index === 0 ? "invoice-status" : undefined}>
                          <StatusBadge status={i.status} />
                        </TableCell>
                        <TableCell className="font-medium">
                          USD {Number(i.total || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {i.date_issued}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {i.due_date}
                        </TableCell>
                        <TableCell className="pr-4 sm:pr-5 text-right">
                          <div
                            className="flex flex-wrap justify-end gap-1.5"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Button
                              data-demo={index === 0 ? "invoice-open-public" : undefined}
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => openPublicInvoice(i)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ver pública
                            </Button>
                            <Button
                              data-demo={index === 0 ? "invoice-copy-link" : undefined}
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => void copyPublicInvoiceLink(i)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copiar link
                            </Button>
                            <div data-demo={index === 0 ? "invoice-status-control" : undefined}>
                              <Select
                                value={i.status || "Draft"}
                                onValueChange={(value) => void applyStatusQuick(i, value)}
                              >
                                <SelectTrigger className="h-8 w-[118px] text-xs">
                                  <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INVOICE_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {displayInvoiceStatus(s)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {!isPaidInvoiceStatus(i.status) ? (
                              <Button
                                data-demo={index === 0 ? "invoice-mark-paid" : undefined}
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => void applyStatusQuick(i, "Paid")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Marcar pagada
                              </Button>
                            ) : null}
                            {isPaidInvoiceStatus(i.status) ? (
                              projectByInvoiceId[i.id] ? (
                                <Button
                                  data-demo={index === 0 ? "invoice-view-project" : undefined}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() =>
                                    window.open("/projects", "_blank", "noopener,noreferrer")
                                  }
                                >
                                  Ver proyecto
                                </Button>
                              ) : (
                                <Button
                                  data-demo={index === 0 ? "invoice-create-project" : undefined}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={async () => {
                                    try {
                                      const result = await ensureProjectFromPaidInvoice(i.id);
                                      if (result.projectId) {
                                        setProjectByInvoiceId((prev) => ({
                                          ...prev,
                                          [i.id]: result.projectId!,
                                        }));
                                      }
                                      toast.success(
                                        result.created
                                          ? "Proyecto creado."
                                          : "Proyecto ya existente.",
                                      );
                                    } catch (e: any) {
                                      console.error("create project quick action error:", e);
                                      toast.error("No se pudo crear el proyecto.");
                                    }
                                  }}
                                >
                                  Crear proyecto
                                </Button>
                              )
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
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
        <SheetContent side="right" className="w-full sm:max-w-[860px] p-0 flex flex-col">
          <div className="border-b px-5 py-4">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle>
                {drawerMode === "create"
                  ? "Nueva factura"
                  : drawerMode === "edit"
                    ? `Editar factura ${editItem?.number || ""}`.trim()
                    : selected?.number || "Factura"}
              </SheetTitle>
              {drawerMode === "view" && selected ? (
                <div className="text-sm text-muted-foreground">
                  Estado:{" "}
                  <span className="font-medium text-foreground">
                    {displayInvoiceStatus(selected.status)}
                  </span>
                </div>
              ) : null}
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-4">
              {drawerMode === "view" && selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => openPublicInvoice(selected)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ver factura pública
                    </Button>
                    {isPaidInvoiceStatus(selected.status) ? (
                      linkedProjectId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open("/projects", "_blank", "noopener,noreferrer")}
                        >
                          Ver proyecto
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => void createProjectFromInvoice(selected.id)}
                          disabled={creatingProject}
                        >
                          {creatingProject ? "Creando…" : "Crear proyecto"}
                        </Button>
                      )
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setEditItem(selected);
                        setDrawerMode("edit");
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(selected.id)}
                    >
                      Eliminar
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Cliente
                      </div>
                      <div className="mt-1 text-sm font-medium">{getClientLabel(selected)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Servicio
                      </div>
                      <div className="mt-1 text-sm font-medium">{getProductName(selected)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Propuesta
                      </div>
                      <div className="mt-1 text-sm font-mono">{getProposalNumber(selected)}</div>
                      <div className="text-xs text-muted-foreground">
                        {getProposalTitle(selected)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Total
                      </div>
                      <div className="mt-1 text-sm font-semibold">
                        USD {Number(selected.total || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Subtotal
                      </div>
                      <div className="mt-1 text-sm font-medium">
                        USD {Number(selected.subtotal || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Impuesto / Descuento
                      </div>
                      <div className="mt-1 text-sm font-medium">
                        USD {Number(selected.tax || 0).toLocaleString()} / USD{" "}
                        {Number(selected.discount || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Fecha emitida
                      </div>
                      <div className="mt-1 text-sm font-medium">{selected.date_issued || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Vence
                      </div>
                      <div className="mt-1 text-sm font-medium">{selected.due_date || "—"}</div>
                    </div>
                  </div>

                  {selected.notes ? (
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Notas
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {selected.notes}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {drawerMode === "create" || drawerMode === "edit" ? (
                <form id="invoice-editor-form" onSubmit={handleSubmit} className="space-y-4">
                  <input type="hidden" name="status" value={editorSelects.status} />
                  <input type="hidden" name="client_id" value={editorSelects.client_id} />
                  <input type="hidden" name="proposal_id" value={editorSelects.proposal_id} />
                  <input type="hidden" name="product_id" value={editorSelects.product_id} />

                  <div className="space-y-5">
                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Origen y estado</div>
                        <div className="text-xs text-muted-foreground">
                          Conecta la factura con su cliente, propuesta y producto para mantener el
                          flujo comercial organizado.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Número</Label>
                          <Input
                            name="number"
                            defaultValue={
                              editItem?.number || `INV-${Date.now().toString().slice(-6)}`
                            }
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Estado</Label>
                          <Select
                            value={editorSelects.status}
                            onValueChange={(v) => setEditorSelects((p) => ({ ...p, status: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INVOICE_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label>Cliente</Label>
                          <Select
                            value={editorSelects.client_id}
                            onValueChange={(v) => setEditorSelects((p) => ({ ...p, client_id: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_CLIENT}>Sin cliente</SelectItem>
                              {clients.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.contact_person
                                    ? `${c.company_name} · ${c.contact_person}`
                                    : c.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Propuesta relacionada</Label>
                          <Select
                            value={editorSelects.proposal_id}
                            onValueChange={(v) =>
                              setEditorSelects((p) => ({ ...p, proposal_id: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_PROPOSAL}>Sin propuesta</SelectItem>
                              {proposals.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.title ? `${p.number} · ${p.title}` : p.number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Producto / servicio</Label>
                          <Select
                            value={editorSelects.product_id}
                            onValueChange={(v) => {
                              setEditorSelects((p) => ({ ...p, product_id: v }));
                              if (v && v !== NO_PRODUCT) {
                                const product = products.find((p) => p.id === v);
                                applyProductDefaults(product);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Opcional" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_PRODUCT}>Sin producto</SelectItem>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Fechas y pago</div>
                        <div className="text-xs text-muted-foreground">
                          Define cuándo se emitió, cuándo vence y cómo debe pagar el cliente.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Fecha emitida</Label>
                          <Input
                            name="date_issued"
                            type="date"
                            defaultValue={
                              editItem?.date_issued || new Date().toISOString().split("T")[0]
                            }
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Vence</Label>
                          <Input name="due_date" type="date" defaultValue={editItem?.due_date} />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Link de pago</Label>
                          <Input
                            name="payment_link"
                            defaultValue={editItem?.payment_link || ""}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Método de pago</Label>
                          <Input
                            name="paymentMethod"
                            defaultValue={invData.paymentMethod || ""}
                            placeholder="Ej: transferencia, tarjeta, PayPal"
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5">
                        <Label>Instrucciones de pago</Label>
                        <Textarea
                          name="paymentInstructions"
                          defaultValue={invData.paymentInstructions || ""}
                          rows={3}
                          placeholder="Ej: Cuenta bancaria, instrucciones o condiciones de pago."
                        />
                      </div>
                    </section>

                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Datos del cliente</div>
                        <div className="text-xs text-muted-foreground">
                          Estos datos aparecerán en la factura pública.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Nombre</Label>
                          <Input name="clientName" defaultValue={invData.clientName || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Empresa</Label>
                          <Input name="clientCompany" defaultValue={invData.clientCompany || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Correo electrónico</Label>
                          <Input name="clientEmail" defaultValue={invData.clientEmail || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Teléfono</Label>
                          <Input name="clientPhone" defaultValue={invData.clientPhone || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>ID fiscal / RNC</Label>
                          <Input name="clientTaxId" defaultValue={invData.clientTaxId || ""} />
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5">
                        <Label>Dirección</Label>
                        <Textarea
                          name="clientAddress"
                          defaultValue={invData.clientAddress || ""}
                          rows={2}
                        />
                      </div>
                    </section>

                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Items de la factura</div>
                        <div className="text-xs text-muted-foreground">
                          Agrega los servicios, cantidades y precios que se cobrarán.
                        </div>
                      </div>

                      <div className="space-y-3">
                        {itemsDraft.map((it, idx) => (
                          <div
                            key={it.id || idx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-[16px] border bg-muted/10 p-3"
                          >
                            <div className="sm:col-span-6 space-y-1.5">
                              <Label>Descripción</Label>
                              <Input
                                value={it.description}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setItemsDraft((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, description: v } : p)),
                                  );
                                }}
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                              <Label>Cantidad</Label>
                              <Input
                                type="number"
                                step="1"
                                value={String(it.quantity)}
                                onChange={(e) => {
                                  const q = Number(e.target.value || 0);
                                  setItemsDraft((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            quantity: q,
                                            total: q * Number(p.unit_price || 0),
                                          }
                                        : p,
                                    ),
                                  );
                                }}
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                              <Label>Precio</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={String(it.unit_price)}
                                onChange={(e) => {
                                  const up = Number(e.target.value || 0);
                                  setItemsDraft((prev) =>
                                    prev.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            unit_price: up,
                                            total: Number(p.quantity || 0) * up,
                                          }
                                        : p,
                                    ),
                                  );
                                }}
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                              <Label>Total</Label>
                              <Input value={String(it.total)} readOnly />
                            </div>

                            <div className="sm:col-span-12 flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() =>
                                  setItemsDraft((prev) => prev.filter((_, i) => i !== idx))
                                }
                                disabled={itemsDraft.length <= 1}
                              >
                                Quitar item
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            setItemsDraft((prev) => [
                              ...prev,
                              { description: "", quantity: 1, unit_price: 0, total: 0 },
                            ])
                          }
                        >
                          + Agregar item
                        </Button>
                      </div>
                    </section>

                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Totales</div>
                        <div className="text-xs text-muted-foreground">
                          El total se recalcula al guardar: subtotal + impuesto - descuento.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label>Subtotal</Label>
                          <Input
                            name="subtotal"
                            type="number"
                            step="0.01"
                            value={totalsDraft.subtotal}
                            onChange={(e) => {
                              setTotalsDirty(true);
                              setTotalsDraft((p) => ({ ...p, subtotal: e.target.value }));
                            }}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Impuesto</Label>
                          <Input
                            name="tax"
                            type="number"
                            step="0.01"
                            value={totalsDraft.tax}
                            onChange={(e) => {
                              setTotalsDirty(true);
                              setTotalsDraft((p) => ({ ...p, tax: e.target.value }));
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Descuento</Label>
                          <Input
                            name="discount"
                            type="number"
                            step="0.01"
                            value={totalsDraft.discount}
                            onChange={(e) => {
                              setTotalsDirty(true);
                              setTotalsDraft((p) => ({ ...p, discount: e.target.value }));
                            }}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Enlace público</div>
                        <div className="text-xs text-muted-foreground">
                          Guarda la factura y comparte este enlace para que el cliente pueda verla.
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Token público</Label>
                        <Input
                          name="public_token"
                          defaultValue={editItem?.public_token || ""}
                          readOnly
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            editItem
                              ? void copyPublicInvoiceLink(editItem)
                              : toast.error("Guarda la factura para generar el enlace")
                          }
                          disabled={!editItem?.public_token}
                        >
                          Copiar enlace
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            editItem
                              ? openPublicInvoice(editItem)
                              : toast.error("Guarda la factura para ver el enlace")
                          }
                          disabled={!editItem?.public_token}
                        >
                          Abrir factura pública
                        </Button>
                      </div>
                    </section>

                    <section className="rounded-[18px] border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="mb-4">
                        <div className="text-sm font-bold text-slate-900">Avanzado</div>
                        <div className="text-xs text-muted-foreground">
                          Datos del emisor, referencia de propuesta y notas internas.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Nombre emisor</Label>
                          <Input name="issuerName" defaultValue={invData.issuerName || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>ID fiscal emisor</Label>
                          <Input name="issuerTaxId" defaultValue={invData.issuerTaxId || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Correo electrónico emisor</Label>
                          <Input name="issuerEmail" defaultValue={invData.issuerEmail || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Teléfono emisor</Label>
                          <Input name="issuerPhone" defaultValue={invData.issuerPhone || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Sitio web</Label>
                          <Input name="issuerWebsite" defaultValue={invData.issuerWebsite || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Propuesta #</Label>
                          <Input
                            name="relatedProposalNumber"
                            defaultValue={invData.relatedProposalNumber || ""}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Producto</Label>
                          <Input name="productName" defaultValue={invData.productName || ""} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Título propuesta</Label>
                          <Input
                            name="relatedProposalTitle"
                            defaultValue={invData.relatedProposalTitle || ""}
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5">
                        <Label>Dirección emisor</Label>
                        <Textarea
                          name="issuerAddress"
                          defaultValue={invData.issuerAddress || ""}
                          rows={2}
                        />
                      </div>

                      <div className="mt-4 space-y-1.5">
                        <Label>Notas internas</Label>
                        <Textarea name="notes" defaultValue={editItem?.notes || ""} rows={3} />
                      </div>
                    </section>
                  </div>
                </form>
              ) : null}
            </div>
          </ScrollArea>

          {drawerMode === "create" || drawerMode === "edit" ? (
            <div className="border-t bg-background px-5 py-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDrawerOpen(false);
                  setDrawerMode("view");
                  setEditItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" form="invoice-editor-form">
                {drawerMode === "edit" ? "Guardar cambios" : "Crear factura"}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

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
