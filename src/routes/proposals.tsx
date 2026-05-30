import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeDollarSign, Clipboard, Eye, ExternalLink, FileText, Layers, Link as LinkIcon, Pencil, Send, Trash2, TriangleAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { useCrud } from "@/hooks/use-crud";
import { MetricCard } from "@/components/crm/metric-card";

export const Route = createFileRoute("/proposals")({
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    dealId: typeof search.dealId === "string" ? search.dealId : undefined,
    conversationId: typeof search.conversationId === "string" ? search.conversationId : undefined,
    productId: typeof search.productId === "string" ? search.productId : undefined,
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
  }),
  component: ProposalsPage,
  head: () => ({ meta: [{ title: "Proposals — Corevix CRM" }] }),
});

type ProposalsSearch = {
  leadId?: string;
  dealId?: string;
  conversationId?: string;
  productId?: string;
  clientId?: string;
};

const PROPOSAL_STATUSES = ["Draft", "Sent", "Viewed", "Approved", "Accepted", "Rejected", "Expired"];
type DrawerMode = "view" | "create" | "edit";

interface Proposal {
  id: string;
  company_id: string;
  number: string;
  title: string;
  product_id: string | null;
  client_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  whatsapp_conversation_id: string | null;
  amount: number;
  currency: string | null;
  status: string;
  valid_until: string | null;
  description: string | null;
  content: string | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;

  template_id?: string | null;
  template_key?: string | null;
  proposal_data?: any | null;
  public_token?: string | null;
  viewed_at?: string | null;
  approved_at?: string | null;
}

interface Product {
  id: string;
  name: string;
  category: string | null;
  type: string | null;
  base_price: number;
  currency: string | null;
  billing_type: string | null;
  description: string | null;
  deliverables?: string | null;
  duration_days?: number | null;
  is_active: boolean;
  slug?: string | null;
  proposal_defaults?: any | null;
}

interface ProductWorkflowStep {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  step_order: number | null;
  default_duration_days: number | null;
  is_active: boolean;
}

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  industry: string | null;
  website: string | null;
  status: string;
}

interface ProposalProcessStep {
  title: string;
  description: string;
  order: number;
  durationDays: number | null;
}

function createEmptyProposalForm(context?: ProposalsSearch) {
  return {
    number: generateProposalNumber(),
    title: "",
    product_id: context?.productId ?? null,
    client_id: context?.clientId ?? null,
    lead_id: context?.leadId ?? null,
    deal_id: context?.dealId ?? null,
    whatsapp_conversation_id: context?.conversationId ?? null,
    amount: "",
    currency: "USD",
    status: "Draft",
    valid_until: "",
    description: "",
    deliverablesText: "",
    estimatedTime: "",
    nextStep: "",
    introductionText: "",
    objectiveText: "",
    featuresText: "",
    optionalServicesText: "",
    outOfScopeText: "",
    processText: "",
    processSteps: [],
    initialStageText: "",
    productionStageText: "",
    revisionStageText: "",
    finalStageText: "",
    clientRequirementsText: "",
    requiredMaterialsText: "",
    requiredAccessText: "",
    clientResponseTimeText: "",
    revisionRoundsText: "",
    termsText: "",
    paymentFrequency: "",
    investmentDetailsText: "",
    additionalCostsText: "",
    paymentTermsText: "",
    content: "",
    notes: "",
    sent_at: "",
    public_token: generatePublicToken(),
  };
}

function generateProposalNumber() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `PROP-${yyyy}${mm}${dd}-${rnd}`;
}

function formatMoney(amount: number, currency: string | null | undefined) {
  const c = (currency || "USD").toUpperCase();
  return `${c} ${Number(amount || 0).toLocaleString()}`;
}

function generatePublicToken() {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }
}

function isProposalExpired(validUntil: string | null | undefined) {
  if (!validUntil) return false;
  const d = new Date(validUntil);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return endOfDay.getTime() < today.getTime();
}

function buildSuggestedContentFromProduct(params: {
  product: Product;
  amount: number;
  currency: string;
}) {
  const { product, amount, currency } = params;
  const lines: string[] = [];
  lines.push(`Hola, te comparto la propuesta para **${product.name}**.`);
  lines.push("");
  if (product.description) {
    lines.push("Descripción:");
    lines.push(product.description.trim());
    lines.push("");
  }
  if (product.deliverables) {
    lines.push("Entregables:");
    lines.push(product.deliverables.trim());
    lines.push("");
  }
  lines.push("Inversión:");
  lines.push(`${formatMoney(amount, currency)}`);
  lines.push("");
  if (product.duration_days) {
    lines.push("Tiempo estimado:");
    lines.push(`${product.duration_days} días`);
    lines.push("");
  }
  lines.push("Próximo paso:");
  lines.push("Si estás de acuerdo, podemos coordinar los detalles para iniciar.");
  return lines.join("\n").trim() + "\n";
}

function ProposalsPage() {
  const { roles, profile, user } = useAuth();
  const isAdminLike = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const routeSearch = Route.useSearch();
  const autoOpenSearchKeyRef = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [validityFilter, setValidityFilter] = useState<"all" | "valid" | "expired">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [editItem, setEditItem] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [form, setForm] = useState<{
    number: string;
    title: string;
    product_id: string | null;
    client_id: string | null;
    lead_id: string | null;
    deal_id: string | null;
    whatsapp_conversation_id: string | null;
    amount: string;
    currency: string;
    status: string;
    valid_until: string;
    description: string;
    deliverablesText: string;
    estimatedTime: string;
    nextStep: string;
    introductionText: string;
    objectiveText: string;
    featuresText: string;
    optionalServicesText: string;
    outOfScopeText: string;
    processText: string;
    processSteps: ProposalProcessStep[];
    initialStageText: string;
    productionStageText: string;
    revisionStageText: string;
    finalStageText: string;
    clientRequirementsText: string;
    requiredMaterialsText: string;
    requiredAccessText: string;
    clientResponseTimeText: string;
    revisionRoundsText: string;
    termsText: string;
    paymentFrequency: string;
    investmentDetailsText: string;
    additionalCostsText: string;
    paymentTermsText: string;
    content: string;
    notes: string;
    sent_at: string;
    public_token: string;
  }>(createEmptyProposalForm());

  const { data, loading, create, update, remove } = useCrud<Proposal>({
    table: "proposals",
    orderBy: "updated_at",
    ascending: false,
  });

  const { data: products } = useCrud<Product>({
    table: "products",
    orderBy: "name",
    ascending: true,
  });

  const { data: clients } = useCrud<Client>({
    table: "clients",
    orderBy: "company_name",
    ascending: true,
  });

  const { data: productWorkflowSteps } = useCrud<ProductWorkflowStep>({
    table: "product_workflow_steps",
    orderBy: "step_order",
    ascending: true,
    filters: [{ column: "is_active", op: "eq", value: true }],
  });

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const openNewContext = useMemo(
    () => ({
      ...(routeSearch.leadId ? { leadId: routeSearch.leadId } : {}),
      ...(routeSearch.dealId ? { dealId: routeSearch.dealId } : {}),
      ...(routeSearch.conversationId ? { conversationId: routeSearch.conversationId } : {}),
      ...(routeSearch.productId ? { productId: routeSearch.productId } : {}),
      ...(routeSearch.clientId ? { clientId: routeSearch.clientId } : {}),
    }),
    [routeSearch.clientId, routeSearch.conversationId, routeSearch.dealId, routeSearch.leadId, routeSearch.productId],
  );

  const productOptions = useMemo(() => {
    const base = products.filter((p) => isAdminLike || p.is_active);
    return base.map((p) => ({
      label: p.category ? `${p.name} · ${p.category}` : p.name,
      value: p.id,
    }));
  }, [isAdminLike, products]);

  const clientOptions = useMemo(() => {
    return clients.map((c) => ({
      label: c.contact_person ? `${c.company_name} · ${c.contact_person}` : c.company_name,
      value: c.id,
    }));
  }, [clients]);

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const workflowStepsByProductId = useMemo(() => {
    const map = new Map<string, ProposalProcessStep[]>();
    for (const step of productWorkflowSteps) {
      if (!step.product_id) continue;
      const list = map.get(step.product_id) || [];
      list.push({
        title: String(step.title || "").trim(),
        description: String(step.description || "").trim(),
        order: Number(step.step_order || 0),
        durationDays: step.default_duration_days ?? null,
      });
      map.set(step.product_id, list);
    }
    for (const [productId, list] of map.entries()) {
      list.sort((a, b) => a.order - b.order);
      map.set(productId, list);
    }
    return map;
  }, [productWorkflowSteps]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((p) => !["Accepted", "Rejected", "Expired"].includes(p.status)).length;
    const sent = data.filter((p) => ["Sent", "Viewed"].includes(p.status)).length;
    const drafts = data.filter((p) => p.status === "Draft").length;
    const totalAmount = data.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { total, active, sent, drafts, totalAmount };
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      const matchSearch = !q || `${p.number} ${p.title} ${p.notes || ""}`.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchProduct = productFilter === "all" || p.product_id === productFilter;
      const expired = isProposalExpired(p.valid_until);
      const matchValidity =
        validityFilter === "all" ||
        (validityFilter === "valid" && !expired) ||
        (validityFilter === "expired" && expired);
      return matchSearch && matchStatus && matchProduct && matchValidity;
    });
  }, [data, productFilter, search, statusFilter, validityFilter]);

  function applyProductData(product: Product, opts?: { force?: boolean }) {
    const force = Boolean(opts?.force);
    setForm((prev) => {
      const next = { ...prev };
      const defaults =
        product?.proposal_defaults && typeof product.proposal_defaults === "object" ? (product.proposal_defaults as any) : {};
      const workflowSteps = workflowStepsByProductId.get(product.id) || [];

      const currentAmount = Number(prev.amount || 0);
      const amountEmpty = !Number.isFinite(currentAmount) || currentAmount === 0;
      const currencyEmpty = !prev.currency?.trim();
      const descriptionEmpty = !prev.description?.trim();
      const deliverablesEmpty = !prev.deliverablesText?.trim();
      const estimatedTimeEmpty = !prev.estimatedTime?.trim();
      const nextStepEmpty = !prev.nextStep?.trim();
      const paymentFrequencyEmpty = !prev.paymentFrequency?.trim();
      const contentEmpty = !prev.content?.trim();
      const processStepsEmpty = !Array.isArray(prev.processSteps) || prev.processSteps.length === 0;

      if (force || amountEmpty) next.amount = String(product.base_price ?? 0);
      if (force || currencyEmpty) next.currency = (product.currency || "USD").toUpperCase();
      if (force || descriptionEmpty) next.description = String(defaults.serviceDescription || product.description || "").trim();
      if (force || deliverablesEmpty) next.deliverablesText = String(defaults.deliverablesText || product.deliverables || "").trim();
      if (force || estimatedTimeEmpty) next.estimatedTime = String(defaults.estimatedTime || (product.duration_days ? `${product.duration_days} días` : "") || "").trim();
      if (force || nextStepEmpty) next.nextStep = String(defaults.nextStep || "Si estás de acuerdo, podemos coordinar los detalles para iniciar.").trim();
      if (force || paymentFrequencyEmpty) next.paymentFrequency = String(defaults.paymentFrequency || product.billing_type || "").trim();

      const mapTextField = (key: keyof typeof prev, value: any) => {
        const v = String(value || "").trim();
        if (!v) return;
        const empty = !String((prev as any)[key] || "").trim();
        if (force || empty) (next as any)[key] = v;
      };

      mapTextField("introductionText", defaults.introductionText);
      mapTextField("objectiveText", defaults.objectiveText);
      mapTextField("featuresText", defaults.featuresText);
      mapTextField("optionalServicesText", defaults.optionalServicesText);
      mapTextField("outOfScopeText", defaults.outOfScopeText);
      mapTextField("clientRequirementsText", defaults.clientRequirementsText);
      mapTextField("requiredMaterialsText", defaults.requiredMaterialsText);
      mapTextField("requiredAccessText", defaults.requiredAccessText);
      mapTextField("clientResponseTimeText", defaults.clientResponseTimeText);
      mapTextField("revisionRoundsText", defaults.revisionRoundsText);
      mapTextField("termsText", defaults.termsText);
      mapTextField("investmentDetailsText", defaults.investmentDetailsText);
      mapTextField("additionalCostsText", defaults.additionalCostsText);
      mapTextField("paymentTermsText", defaults.paymentTermsText);

      if (force || processStepsEmpty) {
        next.processSteps = workflowSteps;
      }

      if (force || contentEmpty) {
        // Keep content optional; provide a short suggested message if empty.
        next.content = "";
      }
      return next;
    });
  }

  const openNew = useCallback(
    (context?: ProposalsSearch) => {
      if (!isAdminLike) return;
      setEditItem(null);
      setForm(createEmptyProposalForm(context));
      setSelected(null);
      setDrawerMode("create");
      setDrawerOpen(true);
    },
    [isAdminLike],
  );

  function openEdit(item: Proposal) {
    if (!isAdminLike) return;
    const pd = item.proposal_data && typeof item.proposal_data === "object" ? item.proposal_data : {};
    setEditItem(item);
    setForm({
      number: item.number || generateProposalNumber(),
      title: item.title || "",
      product_id: item.product_id || null,
      client_id: item.client_id || null,
      lead_id: item.lead_id || null,
      deal_id: item.deal_id || null,
      whatsapp_conversation_id: item.whatsapp_conversation_id || null,
      amount: String(item.amount ?? ""),
      currency: item.currency || "USD",
      status: item.status || "Draft",
      valid_until: item.valid_until || "",
      description: item.description || "",
      deliverablesText: String((pd as any)?.deliverablesText ?? ""),
      estimatedTime: String((pd as any)?.estimatedTime ?? ""),
      nextStep: String((pd as any)?.nextStep ?? ""),
      introductionText: String((pd as any)?.introductionText ?? ""),
      objectiveText: String((pd as any)?.objectiveText ?? ""),
      featuresText: String((pd as any)?.featuresText ?? ""),
      optionalServicesText: String((pd as any)?.optionalServicesText ?? ""),
      outOfScopeText: String((pd as any)?.outOfScopeText ?? ""),
      processText: String((pd as any)?.processText ?? ""),
      processSteps: Array.isArray((pd as any)?.processSteps)
        ? (pd as any).processSteps
            .map((step: any, index: number) => ({
              title: String(step?.title || "").trim(),
              description: String(step?.description || "").trim(),
              order: Number(step?.order || index + 1),
              durationDays: step?.durationDays != null ? Number(step.durationDays) : null,
            }))
            .filter((step: ProposalProcessStep) => step.title || step.description)
        : [],
      initialStageText: String((pd as any)?.initialStageText ?? ""),
      productionStageText: String((pd as any)?.productionStageText ?? ""),
      revisionStageText: String((pd as any)?.revisionStageText ?? ""),
      finalStageText: String((pd as any)?.finalStageText ?? ""),
      clientRequirementsText: String((pd as any)?.clientRequirementsText ?? ""),
      requiredMaterialsText: String((pd as any)?.requiredMaterialsText ?? ""),
      requiredAccessText: String((pd as any)?.requiredAccessText ?? ""),
      clientResponseTimeText: String((pd as any)?.clientResponseTimeText ?? ""),
      revisionRoundsText: String((pd as any)?.revisionRoundsText ?? ""),
      termsText: String((pd as any)?.termsText ?? ""),
      paymentFrequency: String((pd as any)?.paymentFrequency ?? ""),
      investmentDetailsText: String((pd as any)?.investmentDetailsText ?? ""),
      additionalCostsText: String((pd as any)?.additionalCostsText ?? ""),
      paymentTermsText: String((pd as any)?.paymentTermsText ?? ""),
      content: item.content || "",
      notes: item.notes || "",
      sent_at: item.sent_at || "",
      public_token: String(item.public_token || generatePublicToken()),
    });
    setSelected(null);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  useEffect(() => {
    if (!isAdminLike) return;
    const hasContext = Boolean(routeSearch.leadId || routeSearch.dealId || routeSearch.conversationId || routeSearch.productId);
    if (!hasContext) {
      autoOpenSearchKeyRef.current = null;
      return;
    }

    const searchKey = [
      routeSearch.leadId || "",
      routeSearch.dealId || "",
      routeSearch.conversationId || "",
      routeSearch.productId || "",
    ].join("|");

    if (autoOpenSearchKeyRef.current === searchKey) return;
    autoOpenSearchKeyRef.current = searchKey;
    openNew(openNewContext);
  }, [isAdminLike, openNew, openNewContext, routeSearch]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdminLike) {
      toast.error("No tienes permiso para crear/editar propuestas.");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No se pudo detectar la empresa (company_id).");
      return;
    }
    if (!user?.id) {
      toast.error("No se pudo detectar tu sesión (user.id). Vuelve a iniciar sesión.");
      return;
    }

    const uuidOrNull = (value: unknown) => {
      const v = String(value ?? "").trim();
      return v ? v : null;
    };

    const number = form.number.trim() || generateProposalNumber();
    const title = form.title.trim();
    if (!title) {
      toast.error("El título es requerido");
      return;
    }

    const amount = Number(form.amount);
    const publicToken =
      String(form.public_token || "").trim() ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto ? (crypto as any).randomUUID() : generatePublicToken());

    const baseProposalData =
      editItem?.proposal_data && typeof editItem.proposal_data === "object" ? { ...(editItem.proposal_data as any) } : {};

    const proposalData = {
      ...baseProposalData,
      serviceDescription: form.description?.trim() || null,
      deliverablesText: form.deliverablesText?.trim() || null,
      estimatedTime: form.estimatedTime?.trim() || null,
      nextStep: form.nextStep?.trim() || null,
      introductionText: form.introductionText?.trim() || null,
      objectiveText: form.objectiveText?.trim() || null,
      featuresText: form.featuresText?.trim() || null,
      optionalServicesText: form.optionalServicesText?.trim() || null,
      outOfScopeText: form.outOfScopeText?.trim() || null,
      processText: form.processText?.trim() || null,
      processSteps:
        Array.isArray(form.processSteps) && form.processSteps.length
          ? form.processSteps.map((step, index) => ({
              title: step.title?.trim() || `Paso ${index + 1}`,
              description: step.description?.trim() || "",
              order: Number(step.order || index + 1),
              durationDays: step.durationDays ?? null,
            }))
          : null,
      initialStageText: form.initialStageText?.trim() || null,
      productionStageText: form.productionStageText?.trim() || null,
      revisionStageText: form.revisionStageText?.trim() || null,
      finalStageText: form.finalStageText?.trim() || null,
      clientRequirementsText: form.clientRequirementsText?.trim() || null,
      requiredMaterialsText: form.requiredMaterialsText?.trim() || null,
      requiredAccessText: form.requiredAccessText?.trim() || null,
      clientResponseTimeText: form.clientResponseTimeText?.trim() || null,
      revisionRoundsText: form.revisionRoundsText?.trim() || null,
      termsText: form.termsText?.trim() || null,
      paymentFrequency: form.paymentFrequency?.trim() || null,
      investmentDetailsText: form.investmentDetailsText?.trim() || null,
      additionalCostsText: form.additionalCostsText?.trim() || null,
      paymentTermsText: form.paymentTermsText?.trim() || null,
    };

    const record: Record<string, any> = {
      company_id: profile.company_id,
      number,
      title,
      product_id: uuidOrNull(form.product_id),
      client_id: uuidOrNull(form.client_id),
      lead_id: uuidOrNull(form.lead_id),
      deal_id: uuidOrNull(form.deal_id),
      whatsapp_conversation_id: uuidOrNull(form.whatsapp_conversation_id),
      amount: Number.isFinite(amount) ? amount : 0,
      currency: (form.currency || "USD").toUpperCase(),
      status: form.status || "Draft",
      valid_until: form.valid_until || null,
      description: form.description.trim() || null,
      content: form.content.trim() || null,
      proposal_data: proposalData,
      notes: form.notes.trim() || null,
      sent_at: form.sent_at || null,
      public_token: publicToken,
    };
    try {
      if (editItem) {
        await update(editItem.id, record as any);
        toast.success("Propuesta actualizada correctamente.");
        setSelected(null);
      } else {
        const payload = { ...record, created_by: user.id };
        console.log("Creating proposal payload", {
          userId: user?.id,
          profileId: profile?.id,
          profileUserId: (profile as any)?.user_id,
          companyId: profile?.company_id,
          payload,
        });
        await create(payload as any);
        toast.success("Propuesta creada correctamente.");
      }
      setDrawerOpen(false);
      setDrawerMode("view");
      setEditItem(null);
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la propuesta.");
    }
  };

  if (loading) return <LoadingState />;

  function copyPublicLink(publicToken: string | null | undefined) {
    const token = String(publicToken || "").trim();
    if (!token) {
      toast.error("Esta propuesta no tiene public_token.");
      return;
    }
    const publicUrl = `${window.location.origin}/proposal/public/${token}`;
    void navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace público copiado.");
  }

  function openPublicLink(publicToken: string | null | undefined) {
    const token = String(publicToken || "").trim();
    if (!token) {
      toast.error("Esta propuesta no tiene public_token.");
      return;
    }
    const publicUrl = `${window.location.origin}/proposal/public/${token}`;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div data-demo="proposals-main">
      <PageHeader
        title="Propuestas"
        subtitle="Crea y administra propuestas comerciales conectadas a productos, clientes y oportunidades."
        actionLabel={isAdminLike ? "Nueva propuesta" : undefined}
        onAction={isAdminLike ? () => openNew(openNewContext) : undefined}
      />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          variant="reference"
          size="compact"
          label="Total propuestas"
          value={stats.total}
          icon={Layers}
          iconClassName="text-[#1d62f9]"
          iconChipClassName="bg-[#eaf1ff]"
        />
        <MetricCard
          variant="reference"
          size="compact"
          label="Activas"
          value={stats.active}
          icon={FileText}
          iconClassName="text-slate-700"
          iconChipClassName="bg-slate-100"
        />
        <MetricCard
          variant="reference"
          size="compact"
          label="Enviadas"
          value={stats.sent}
          icon={Send}
          iconClassName="text-emerald-700"
          iconChipClassName="bg-emerald-50"
        />
        <MetricCard
          variant="reference"
          size="compact"
          label="Monto total"
          value={`USD ${Math.round(stats.totalAmount).toLocaleString()}`}
          icon={BadgeDollarSign}
          iconClassName="text-amber-700"
          iconChipClassName="bg-amber-50"
        />
      </div>

      <DataCard>
        <div className="space-y-4">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por título o número..."
            filters={[
              {
                key: "product",
                placeholder: "Producto",
                value: productFilter,
                onChange: setProductFilter,
                options: productOptions,
              },
              {
                key: "status",
                placeholder: "Estado",
                value: statusFilter,
                onChange: setStatusFilter,
                options: PROPOSAL_STATUSES.map((s) => ({ label: s, value: s })),
              },
              {
                key: "validity",
                placeholder: "Validez",
                value: validityFilter,
                onChange: setValidityFilter as any,
                options: [
                  { label: "Todas", value: "all" },
                  { label: "Vigentes", value: "valid" },
                  { label: "Vencidas", value: "expired" },
                ],
              },
            ]}
          />
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Todavía no hay propuestas"
              description="Crea una propuesta para enviarla luego a prospectos, clientes u oportunidades."
              actionLabel={isAdminLike ? "Nueva propuesta" : undefined}
              onAction={isAdminLike ? openNew : undefined}
            />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="pl-4 sm:pl-5">Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Producto</TableHead>
                    <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Valid Until</TableHead>
                    <TableHead className="hidden lg:table-cell">Updated</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-5">Acciones</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                  {filtered.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => {
                          setSelected(p);
                          setEditItem(null);
                          setDrawerMode("view");
                          setDrawerOpen(true);
                        }}
                      >
                        <TableCell className="font-medium pl-4 sm:pl-5">{p.number}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="font-medium text-foreground">{p.title}</div>
                          {p.product_id ? (
                            <div className="text-xs text-muted-foreground md:hidden">
                              {productById.get(p.product_id)?.name || "Sin producto"}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground md:hidden">Sin producto</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.product_id ? productById.get(p.product_id)?.name || "—" : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {p.client_id ? String(p.client_id).slice(0, 8) + "…" : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={p.status} />
                            {isProposalExpired(p.valid_until) && !["Accepted", "Rejected"].includes(p.status) ? (
                              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border-amber-200">
                                <TriangleAlert className="h-3 w-3" /> Vencida
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium hidden md:table-cell">{formatMoney(Number(p.amount || 0), p.currency)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{p.valid_until || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right pr-4 sm:pr-5">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelected(p);
                                setEditItem(null);
                                setDrawerMode("view");
                                setDrawerOpen(true);
                              }}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                copyPublicLink((p as any).public_token ?? null);
                              }}
                              title="Copiar enlace público"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openPublicLink((p as any).public_token ?? null);
                              }}
                              title="Ver propuesta"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void navigator.clipboard.writeText(p.content || "");
                                toast.success("Contenido copiado.");
                              }}
                              title="Copiar contenido"
                            >
                              <Clipboard className="h-4 w-4" />
                            </Button>
                            {isAdminLike ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEdit(p);
                                }}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
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
                  ? "Nueva propuesta"
                  : drawerMode === "edit"
                    ? `Editar propuesta ${editItem?.number || ""}`.trim()
                    : selected
                      ? `${selected.number} — ${selected.title}`
                      : "Propuesta"}
              </SheetTitle>
              {drawerMode === "view" && selected ? (
                <div className="text-sm text-muted-foreground">
                  Estado: <span className="font-medium text-foreground">{selected.status || "—"}</span>
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
                      className="h-8"
                      onClick={() => copyPublicLink((selected as any).public_token ?? null)}
                    >
                      <LinkIcon className="h-4 w-4" />
                      Copiar enlace público
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => openPublicLink((selected as any).public_token ?? null)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver propuesta
                    </Button>
                    {isAdminLike ? (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(selected)}>
                        Editar
                      </Button>
                    ) : null}
                    {isAdminLike ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={async () => {
                          const ok = window.confirm("¿Seguro que deseas eliminar esta propuesta?");
                          if (!ok) return;
                          try {
                            await remove(selected.id);
                            toast.success("Propuesta eliminada.");
                            setDrawerOpen(false);
                            setDrawerMode("view");
                            setEditItem(null);
                            setSelected(null);
                          } catch (err: any) {
                            toast.error(err?.message || "No se pudo eliminar la propuesta.");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Estado</div>
                      <div className="font-medium"><StatusBadge status={selected.status} /></div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Producto</div>
                      <div className="font-medium">{selected.product_id ? productById.get(selected.product_id)?.name || "—" : "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Monto</div>
                      <div className="font-medium">{formatMoney(Number(selected.amount || 0), selected.currency)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Válida hasta</div>
                      <div className="font-medium">{selected.valid_until || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Cliente</div>
                      <div className="font-medium">{selected.client_id ? String(selected.client_id).slice(0, 8) + "…" : "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Deal</div>
                      <div className="font-medium">{selected.deal_id ? String(selected.deal_id).slice(0, 8) + "…" : "—"}</div>
                    </div>
                  </div>

                  {selected.description ? (
                    <div>
                      <div className="text-xs text-muted-foreground">Descripción</div>
                      <div className="whitespace-pre-wrap">{selected.description}</div>
                    </div>
                  ) : null}

                  <div>
                    <div className="text-xs text-muted-foreground flex items-center justify-between gap-3">
                      <span>Contenido</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          const fallback =
                            selected.content ||
                            `Propuesta: ${selected.title}\n\n${selected.description || ""}\n\nInversión: ${formatMoney(Number(selected.amount || 0), selected.currency)}`.trim();
                          void navigator.clipboard.writeText(fallback);
                          toast.success("Contenido copiado.");
                        }}
                      >
                        <Clipboard className="h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                    <div className="mt-2 rounded-[12px] border bg-muted/10 px-3 py-2 whitespace-pre-wrap text-[12.5px]">
                      {selected.content || "—"}
                    </div>
                  </div>

                  {selected.notes ? (
                    <div>
                      <div className="text-xs text-muted-foreground">Notas</div>
                      <div className="whitespace-pre-wrap">{selected.notes}</div>
                    </div>
                  ) : null}

                  <div className="text-xs text-muted-foreground">
                    Actualizado {selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : "—"}
                  </div>
                </>
              ) : null}

              {(drawerMode === "create" || drawerMode === "edit") ? (
                <form id="proposal-editor-form" onSubmit={handleSubmit} className="space-y-3">
                  <Tabs defaultValue="general">
                    <TabsList className="flex flex-wrap h-auto">
                      <TabsTrigger value="general">Datos generales</TabsTrigger>
                      <TabsTrigger value="summary">Resumen</TabsTrigger>
                      <TabsTrigger value="scope">Alcance</TabsTrigger>
                      <TabsTrigger value="process">Proceso</TabsTrigger>
                      <TabsTrigger value="requirements">Requisitos</TabsTrigger>
                      <TabsTrigger value="time">Tiempo</TabsTrigger>
                      <TabsTrigger value="investment">Inversión</TabsTrigger>
                      <TabsTrigger value="message">Mensaje</TabsTrigger>
                      <TabsTrigger value="notes">Notas</TabsTrigger>
                    </TabsList>

            <TabsContent value="general" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Número (opcional)</Label>
                        <Input value={form.number} onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))} placeholder={generateProposalNumber()} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Estado</Label>
                        <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PROPOSAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Título</Label>
                      <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Prospecto / Cliente (opcional)</Label>
                        <Select value={form.client_id || "none"} onValueChange={(v) => setForm((p) => ({ ...p, client_id: v === "none" ? null : v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecciona un destinatario" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin destinatario</SelectItem>
                            {clientOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Producto</Label>
                        <Select
                          value={form.product_id || "none"}
                          onValueChange={(v) => {
                            const nextProductId = v === "none" ? null : v;
                            const product = nextProductId ? productById.get(nextProductId) : null;
                            setForm((prev) => ({ ...prev, product_id: nextProductId }));
                            if (product) applyProductData(product);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin producto</SelectItem>
                            {productOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Válida hasta</Label>
                        <Input type="date" value={form.valid_until} onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Token público</Label>
                      <div className="flex gap-2">
                        <Input value={form.public_token} readOnly />
                        <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => copyPublicLink(form.public_token)} title="Copiar enlace público">
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => openPublicLink(form.public_token)} title="Ver propuesta">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Ruta pública: <span className="font-mono">{`/proposal/public/${form.public_token || ""}`}</span>
                      </div>
                    </div>

                    {form.product_id ? (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            const product = productById.get(form.product_id || "");
                            if (!product) return;
                            const hasAny =
                              Boolean(form.amount.trim()) ||
                              Boolean(form.currency.trim()) ||
                              Boolean(form.description.trim()) ||
                              Boolean(form.deliverablesText.trim()) ||
                              Boolean(form.estimatedTime.trim()) ||
                              Boolean(form.nextStep.trim()) ||
                              Boolean(form.introductionText.trim()) ||
                              Boolean(form.objectiveText.trim()) ||
                              Boolean(form.featuresText.trim()) ||
                              Boolean(form.optionalServicesText.trim()) ||
                              Boolean(form.outOfScopeText.trim()) ||
                              form.processSteps.length > 0 ||
                              Boolean(form.initialStageText.trim()) ||
                              Boolean(form.productionStageText.trim()) ||
                              Boolean(form.revisionStageText.trim()) ||
                              Boolean(form.finalStageText.trim()) ||
                              Boolean(form.clientRequirementsText.trim()) ||
                              Boolean(form.requiredMaterialsText.trim()) ||
                              Boolean(form.requiredAccessText.trim()) ||
                              Boolean(form.clientResponseTimeText.trim()) ||
                              Boolean(form.revisionRoundsText.trim()) ||
                              Boolean(form.termsText.trim()) ||
                              Boolean(form.paymentFrequency.trim()) ||
                              Boolean(form.investmentDetailsText.trim()) ||
                              Boolean(form.additionalCostsText.trim()) ||
                              Boolean(form.paymentTermsText.trim()) ||
                              Boolean(form.content.trim());
                            if (hasAny) {
                              const ok = window.confirm("¿Quieres usar los datos del producto? Esto puede sobrescribir campos existentes.");
                              if (!ok) return;
                              applyProductData(product, { force: true });
                              return;
                            }
                            applyProductData(product, { force: false });
                          }}
                        >
                          <Layers className="h-4 w-4" />
                          Usar datos del producto
                        </Button>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label>Monto</Label>
                        <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Moneda</Label>
                        <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="summary" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Introducción / resumen ejecutivo</Label>
                      <Textarea value={form.introductionText} onChange={(e) => setForm((p) => ({ ...p, introductionText: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Objetivo principal</Label>
                      <Textarea value={form.objectiveText} onChange={(e) => setForm((p) => ({ ...p, objectiveText: e.target.value }))} rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Descripción del servicio</Label>
                      <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={4} />
                    </div>
                  </TabsContent>

                  <TabsContent value="scope" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Entregables incluidos</Label>
                      <Textarea value={form.deliverablesText} onChange={(e) => setForm((p) => ({ ...p, deliverablesText: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Características / funcionalidades</Label>
                      <Textarea value={form.featuresText} onChange={(e) => setForm((p) => ({ ...p, featuresText: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Servicios adicionales opcionales</Label>
                      <Textarea value={form.optionalServicesText} onChange={(e) => setForm((p) => ({ ...p, optionalServicesText: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fuera de alcance / no incluido</Label>
                      <Textarea value={form.outOfScopeText} onChange={(e) => setForm((p) => ({ ...p, outOfScopeText: e.target.value }))} rows={4} />
                    </div>
                  </TabsContent>

                  <TabsContent value="process" className="mt-4 space-y-4">
                    {form.processSteps.length > 0 ? (
                      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                        <div className="text-xs font-medium text-muted-foreground">
                          Pasos del workflow del producto (copiados en la propuesta)
                        </div>
                        <div className="space-y-2">
                          {form.processSteps.map((step, index) => (
                            <div key={`${step.order}-${index}`} className="rounded border bg-background p-2">
                              <div className="text-sm font-medium">
                                {step.order || index + 1}. {step.title || `Paso ${index + 1}`}
                              </div>
                              {step.description ? (
                                <div className="mt-1 text-xs text-muted-foreground">{step.description}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="text-xs text-muted-foreground">
                      El proceso se toma automáticamente del workflow activo del producto.
                    </div>
                  </TabsContent>

                  <TabsContent value="requirements" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Información que debe entregar el cliente</Label>
                      <Textarea value={form.clientRequirementsText} onChange={(e) => setForm((p) => ({ ...p, clientRequirementsText: e.target.value }))} rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Materiales necesarios</Label>
                      <Textarea value={form.requiredMaterialsText} onChange={(e) => setForm((p) => ({ ...p, requiredMaterialsText: e.target.value }))} rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Accesos requeridos</Label>
                      <Textarea value={form.requiredAccessText} onChange={(e) => setForm((p) => ({ ...p, requiredAccessText: e.target.value }))} rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tiempo de respuesta esperado</Label>
                      <Textarea value={form.clientResponseTimeText} onChange={(e) => setForm((p) => ({ ...p, clientResponseTimeText: e.target.value }))} rows={2} />
                    </div>
                  </TabsContent>

                  <TabsContent value="time" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Tiempo estimado</Label>
                      <Input value={form.estimatedTime} onChange={(e) => setForm((p) => ({ ...p, estimatedTime: e.target.value }))} placeholder="Ej: 30 días / Plan mensual / A coordinar" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Rondas de cambios incluidas</Label>
                      <Input value={form.revisionRoundsText} onChange={(e) => setForm((p) => ({ ...p, revisionRoundsText: e.target.value }))} placeholder="Ej: 2 rondas" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Condiciones importantes</Label>
                      <Textarea value={form.termsText} onChange={(e) => setForm((p) => ({ ...p, termsText: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Próximo paso</Label>
                      <Textarea value={form.nextStep} onChange={(e) => setForm((p) => ({ ...p, nextStep: e.target.value }))} rows={2} />
                    </div>
                  </TabsContent>

                  <TabsContent value="investment" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Frecuencia de pago</Label>
                      <Input value={form.paymentFrequency} onChange={(e) => setForm((p) => ({ ...p, paymentFrequency: e.target.value }))} placeholder="Ej: mensual / one-time" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Detalle de inversión</Label>
                      <Textarea value={form.investmentDetailsText} onChange={(e) => setForm((p) => ({ ...p, investmentDetailsText: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Costos adicionales</Label>
                      <Textarea value={form.additionalCostsText} onChange={(e) => setForm((p) => ({ ...p, additionalCostsText: e.target.value }))} rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Forma de pago / condiciones de pago</Label>
                      <Textarea value={form.paymentTermsText} onChange={(e) => setForm((p) => ({ ...p, paymentTermsText: e.target.value }))} rows={3} />
                    </div>
                  </TabsContent>

                  <TabsContent value="message" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Mensaje adicional (opcional)</Label>
                      <Textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={5} placeholder="Notas para el cliente, detalles extra, aclaraciones…" />
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Notas internas</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={4} />
                    </div>
                  </TabsContent>
                </Tabs>
              </form>
              ) : null}
            </div>
          </ScrollArea>

          {(drawerMode === "create" || drawerMode === "edit") ? (
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
              <Button type="submit" form="proposal-editor-form" disabled={!isAdminLike}>
                {drawerMode === "edit" ? "Guardar" : "Crear propuesta"}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
