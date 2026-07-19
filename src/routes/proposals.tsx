import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeDollarSign,
  Clipboard,
  Eye,
  ExternalLink,
  FileText,
  Layers,
  Link as LinkIcon,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { crmFormStyles } from "@/components/crm/crm-form-shell";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { useCrud } from "@/hooks/use-crud";
import { supabase } from "@/integrations/supabase/client";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";
import {
  isApprovedProposalStatus,
  isPendingProposalStatus,
  isSentOrViewedProposalStatus,
  normalizeStatus,
} from "@/lib/crm/status";

type ProposalsSearch = {
  leadId?: string;
  dealId?: string;
  conversationId?: string;
  productId?: string;
  clientId?: string;
  proposalId?: string;
};

export const Route = createFileRoute("/proposals")({
  validateSearch: (search: Record<string, unknown>): ProposalsSearch => ({
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    dealId: typeof search.dealId === "string" ? search.dealId : undefined,
    conversationId: typeof search.conversationId === "string" ? search.conversationId : undefined,
    productId: typeof search.productId === "string" ? search.productId : undefined,
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
    proposalId: typeof search.proposalId === "string" ? search.proposalId : undefined,
  }),
  component: ProposalsPage,
  head: () => ({ meta: [{ title: "Propuestas — Corevix CRM" }] }),
});

const PROPOSAL_STATUSES = [
  "Draft",
  "Sent",
  "Viewed",
  "Approved",
  "Accepted",
  "Rejected",
  "Expired",
];
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

function textToEditableItems(value: string) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function editableItemsToText(items: string[]) {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function NumberStepperField({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  const parsed = Number(String(value ?? "").trim());
  const safeValue = Number.isFinite(parsed) ? parsed : 0;

  const clampValue = (n: number) => Math.max(min, Math.min(max, n));

  const setValue = (n: number) => {
    onChange(String(clampValue(n)));
  };

  const decrease = () => setValue(safeValue - 1);
  const increase = () => setValue(safeValue + 1);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>

      <div className="flex items-stretch gap-2">
        <div className="flex h-11 w-[170px] overflow-hidden rounded-none border-y border-slate-200 bg-white">
          <button
            type="button"
            onClick={decrease}
            className="grid w-11 place-items-center border-r text-[18px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            disabled={safeValue <= min}
            title="Disminuir"
          >
            −
          </button>

          <input
            type="number"
            min={min}
            max={max}
            value={safeValue}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(String(min));
                return;
              }
              const next = Number(raw);
              if (Number.isFinite(next)) {
                onChange(String(clampValue(next)));
              }
            }}
            className="w-full border-0 bg-transparent text-center text-[15px] font-semibold outline-none focus:ring-0"
          />

          <button
            type="button"
            onClick={increase}
            className="grid w-11 place-items-center border-l text-[18px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            disabled={safeValue >= max}
            title="Aumentar"
          >
            +
          </button>
        </div>

        <div className="flex items-center text-[12px] text-muted-foreground">
          {safeValue === 1 ? "1 ronda" : `${safeValue} rondas`}
        </div>
      </div>
    </div>
  );
}

function EditableListField({
  label,
  value,
  onChange,
  placeholder = "Escribe un ítem...",
  addLabel = "Agregar ítem",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const items = textToEditableItems(value);
  const visibleItems = items.length ? items : [""];

  const updateItem = (index: number, nextValue: string) => {
    const next = [...visibleItems];
    next[index] = nextValue;
    onChange(editableItemsToText(next));
  };

  const addItem = () => {
    onChange(editableItemsToText([...items, "Nuevo ítem"]));
  };

  const removeItem = (index: number) => {
    const next = visibleItems.filter((_, i) => i !== index);
    onChange(editableItemsToText(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={addItem}
        >
          + {addLabel}
        </Button>
      </div>

      <div className="space-y-2 border-y border-slate-100 py-2">
        {visibleItems.map((item, index) => (
          <div
            key={`${label}-${index}`}
            className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-b-0"
          >
            <div className="grid h-7 w-7 shrink-0 place-items-center border-b border-blue-200 text-[12px] font-bold text-[#1d62f9]">
              {index + 1}
            </div>

            <Input
              value={item}
              placeholder={placeholder}
              onChange={(e) => updateItem(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onChange(editableItemsToText([...visibleItems, "Nuevo ítem"]));
                }
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-destructive"
              onClick={() => removeItem(index)}
              disabled={visibleItems.length === 1 && !item.trim()}
              title="Quitar"
            >
              −
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
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
  const rnd = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PROP-${yyyy}${mm}${dd}-${rnd}`;
}

function formatMoney(amount: number, currency: string | null | undefined) {
  const c = (currency || "USD").toUpperCase();
  return `${c} ${Number(amount || 0).toLocaleString()}`;
}

function proposalRiskValueClass(tone: "neutral" | "green" | "orange" | "red") {
  if (tone === "green") return "text-emerald-600";
  if (tone === "orange") return "text-orange-600";
  if (tone === "red") return "text-rose-600";
  return "text-slate-950";
}

function ProposalKpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "green" | "orange" | "red";
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${proposalRiskValueClass(tone)}`}>{value}</div>
    </div>
  );
}

function generatePublicToken() {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
  }
}

function dateAfterDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  const [proposalEditorTab, setProposalEditorTab] = useState("general");
  const [demoPublicProposalUrl, setDemoPublicProposalUrl] = useState<string | null>(null);
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
  const sendProposalNotification = async (title: string, message: string) => {
    if (!profile?.company_id || !user?.id) return;
    await createAttentionNotification(
      supabase,
      { companyId: profile.company_id, userId: user.id },
      { title, message, type: "attention:proposals", link: "/proposals" },
    ).catch(() => {});
  };

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
    [
      routeSearch.clientId,
      routeSearch.conversationId,
      routeSearch.dealId,
      routeSearch.leadId,
      routeSearch.productId,
    ],
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
    const active = data.filter((p) => isPendingProposalStatus(p.status)).length;
    const sent = data.filter((p) => isSentOrViewedProposalStatus(p.status)).length;
    const drafts = data.filter((p) => normalizeStatus(p.status) === "draft").length;
    const expired = data.filter(
      (p) =>
        isProposalExpired(p.valid_until) &&
        !isApprovedProposalStatus(p.status) &&
        normalizeStatus(p.status) !== "rejected",
    ).length;
    const pipelineAmount = data
      .filter(
        (p) =>
          isPendingProposalStatus(p.status) ||
          isSentOrViewedProposalStatus(p.status) ||
          normalizeStatus(p.status) === "draft",
      )
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalAmount = data.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { total, active, sent, drafts, expired, pipelineAmount, totalAmount };
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      const matchSearch = !q || `${p.number} ${p.title} ${p.notes || ""}`.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || normalizeStatus(p.status) === normalizeStatus(statusFilter);
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
        product?.proposal_defaults && typeof product.proposal_defaults === "object"
          ? (product.proposal_defaults as any)
          : {};
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
      if (force || descriptionEmpty)
        next.description = String(defaults.serviceDescription || product.description || "").trim();
      if (force || deliverablesEmpty)
        next.deliverablesText = String(
          defaults.deliverablesText || product.deliverables || "",
        ).trim();
      if (force || estimatedTimeEmpty)
        next.estimatedTime = String(
          defaults.estimatedTime ||
            (product.duration_days ? `${product.duration_days} días` : "") ||
            "",
        ).trim();
      if (force || nextStepEmpty)
        next.nextStep = String(
          defaults.nextStep || "Si estás de acuerdo, podemos coordinar los detalles para iniciar.",
        ).trim();
      if (force || paymentFrequencyEmpty)
        next.paymentFrequency = String(
          defaults.paymentFrequency || product.billing_type || "",
        ).trim();

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
    const pd =
      item.proposal_data && typeof item.proposal_data === "object" ? item.proposal_data : {};
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
    const onDemoOpenProposalEditor = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean; tab?: string }>).detail;

      if (detail?.open === false) {
        setDrawerOpen(false);
        return;
      }

      setProposalEditorTab(detail?.tab || "general");
      openNew(openNewContext);
    };

    window.addEventListener("crm-demo-open-proposal-editor", onDemoOpenProposalEditor);
    return () =>
      window.removeEventListener("crm-demo-open-proposal-editor", onDemoOpenProposalEditor);
  }, [openNew, openNewContext]);

  useEffect(() => {
    if (!isAdminLike) return;
    const hasContext = Boolean(
      routeSearch.leadId ||
      routeSearch.dealId ||
      routeSearch.conversationId ||
      routeSearch.productId,
    );
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

  useEffect(() => {
    const proposalId = routeSearch.proposalId;
    if (!proposalId) return;
    if (!data.length) return;
    if (autoOpenSearchKeyRef.current === `proposal:${proposalId}`) return;
    const proposal = data.find((item) => item.id === proposalId);
    autoOpenSearchKeyRef.current = `proposal:${proposalId}`;
    if (proposal) {
      setSelected(proposal);
      setEditItem(null);
      setDrawerMode("view");
      setDrawerOpen(true);
    }
  }, [data, routeSearch.proposalId]);

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
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : generatePublicToken());

    const baseProposalData =
      editItem?.proposal_data && typeof editItem.proposal_data === "object"
        ? { ...(editItem.proposal_data as any) }
        : {};

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
        void sendProposalNotification("Propuesta actualizada", `${title} fue actualizada.`);
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
        void sendProposalNotification("Propuesta creada", `${title} fue creada.`);
        toast.success("Propuesta creada correctamente.");
      }
      setDrawerOpen(false);
      setDrawerMode("view");
      setEditItem(null);
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar la propuesta.");
    }
  };

  useEffect(() => {
    const onDemoShowPublicProposal = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;

      if (detail?.open === false) {
        setDemoPublicProposalUrl(null);
        return;
      }

      const demoProposal =
        filtered.find((p) => String(p.number || "").includes("DEMO-CRM-001")) ||
        filtered.find((p) =>
          String(p.title || "")
            .toLowerCase()
            .includes("demo"),
        ) ||
        filtered.find((p) => Boolean((p as any).public_token));

      const token = String((demoProposal as any)?.public_token || "").trim();

      if (!token) {
        setDemoPublicProposalUrl(null);
        return;
      }

      setDemoPublicProposalUrl(`/proposal/public/${token}`);
    };

    window.addEventListener("crm-demo-show-public-proposal", onDemoShowPublicProposal);
    return () =>
      window.removeEventListener("crm-demo-show-public-proposal", onDemoShowPublicProposal);
  }, [filtered]);

  if (loading) return <LoadingState />;

  const mobileStatusFilters = [
    { value: "all", label: "Todos los estados" },
    ...PROPOSAL_STATUSES.map((status) => ({ value: status, label: status })),
  ];
  const mobileValidityFilters = [
    { value: "all", label: "Toda validez" },
    { value: "valid", label: "Vigentes" },
    { value: "expired", label: "Vencidas" },
  ];

  function copyPublicLink(publicToken: string | null | undefined) {
    const token = String(publicToken || "").trim();
    if (!token) {
      toast.error("Esta propuesta no tiene enlace público.");
      return;
    }
    const publicUrl = `${window.location.origin}/proposal/public/${token}`;
    void navigator.clipboard.writeText(publicUrl);
    toast.success("Enlace público copiado.");
  }

  function openPublicLink(publicToken: string | null | undefined) {
    const token = String(publicToken || "").trim();
    if (!token) {
      toast.error("Esta propuesta no tiene enlace público.");
      return;
    }
    const publicUrl = `${window.location.origin}/proposal/public/${token}`;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <div data-demo="proposals-main">
        <div className="hidden md:block">
          <PageHeader
            title="Propuestas"
            subtitle="Administra propuestas comerciales cargadas y compartidas como PDF."
          />
        </div>
      </div>

      <GlobalKpiStrip
        title="Propuestas"
        subtitle="Cotizaciones, envíos y cierres comerciales"
        actionLabel={isAdminLike ? "Nueva propuesta" : undefined}
        onAction={isAdminLike ? () => openNew(openNewContext) : undefined}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
        items={[
          {
            key: "proposals-summary",
            label: "Pipeline",
            value: `USD ${Math.round(stats.pipelineAmount).toLocaleString()}`,
            helper: `${filtered.length} visibles de ${stats.total} propuestas`,
            icon: BadgeDollarSign,
            tone: stats.expired > 0 ? "orange" : "blue",
            meta: [
              { label: "Activas", value: stats.active, tone: "blue" },
              { label: "Enviadas", value: stats.sent, tone: "green" },
              { label: "Vencidas", value: stats.expired, tone: "orange" },
            ],
          },
        ]}
      >
        <div className="mt-2 grid w-full grid-cols-2 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mobileStatusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={validityFilter}
            onValueChange={(value) => setValidityFilter(value as typeof validityFilter)}
          >
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mobileValidityFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div className="hidden border-y border-slate-100 bg-white sm:grid sm:grid-cols-4">
        <ProposalKpi label="Propuestas" value={stats.total} />
        <ProposalKpi label="Activas" value={stats.active} tone="green" />
        <ProposalKpi
          label="Vencidas"
          value={stats.expired}
          tone={stats.expired > 0 ? "orange" : "green"}
        />
        <ProposalKpi
          label="Pipeline"
          value={`USD ${Math.round(stats.pipelineAmount).toLocaleString()}`}
          tone={stats.expired > 0 ? "orange" : "green"}
        />
      </div>

      <section className="border-y border-slate-100 bg-white max-sm:border-0">
        <div className="border-b border-slate-100 px-4 py-3 max-md:hidden sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              {isAdminLike ? (
                <Button
                  className="hidden h-9 rounded-md bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700 sm:inline-flex"
                  onClick={() => openNew(openNewContext)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva propuesta
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por título o número..."
                className="h-9 w-[240px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0"
              />
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="h-9 w-[180px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los productos</SelectItem>
                  {productOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {PROPOSAL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={validityFilter}
                onValueChange={(value) => setValidityFilter(value as typeof validityFilter)}
              >
                <SelectTrigger className="h-9 w-[150px] rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Validez" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda validez</SelectItem>
                  <SelectItem value="valid">Vigentes</SelectItem>
                  <SelectItem value="expired">Vencidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-4 md:mt-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Todavía no hay propuestas"
              description="Crea una propuesta para enviarla luego a prospectos, clientes u oportunidades."
              actionLabel={isAdminLike ? "Nueva propuesta" : undefined}
              onAction={isAdminLike ? () => openNew(openNewContext) : undefined}
            />
          ) : (
            <>
              <div className="grid gap-2.5 md:hidden">
                {filtered.map((p, index) => {
                  const productName = p.product_id
                    ? productById.get(p.product_id)?.name || "Sin producto"
                    : "Sin producto";
                  const clientName = p.client_id
                    ? clientById.get(p.client_id)?.company_name || "Sin cliente"
                    : "Sin cliente";
                  const expired =
                    isProposalExpired(p.valid_until) &&
                    !isApprovedProposalStatus(p.status) &&
                    normalizeStatus(p.status) !== "rejected";

                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-demo={index === 0 ? "proposals-first-mobile-card" : undefined}
                      onClick={() => {
                        setSelected(p);
                        setEditItem(null);
                        setDrawerMode("view");
                        setDrawerOpen(true);
                      }}
                      className="w-full rounded-[18px] border border-slate-200 bg-white p-3.5 text-left transition-colors active:scale-[0.992] hover:border-slate-300"
                    >
                      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-blue-100 bg-blue-50 text-blue-700">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-slate-950">
                            {p.title}
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] font-medium leading-4 text-slate-500">
                            {p.number} · {productName}
                          </div>
                        </div>
                        <StatusBadge
                          status={p.status}
                          className="min-h-6 max-w-[92px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 pl-[50px] max-[360px]:grid-cols-1 max-[360px]:pl-0">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                            Monto
                          </div>
                          <div className="mt-1 truncate text-[13px] font-extrabold text-slate-900">
                            {formatMoney(Number(p.amount || 0), p.currency)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                            Validez
                          </div>
                          <div className="mt-1 truncate text-[12.5px] font-semibold text-slate-600">
                            {p.valid_until || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-[12.5px] font-semibold text-slate-500">
                        <span className="min-w-0 truncate">{clientName}</span>
                        {expired ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <TriangleAlert className="h-3 w-3" />
                            Vencida
                          </span>
                        ) : (
                          <span className="shrink-0 text-slate-400">
                            {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-white">
                      <TableRow>
                        <TableHead className="pl-4 sm:pl-5">Número</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="hidden md:table-cell">Monto</TableHead>
                        <TableHead className="hidden lg:table-cell">Vence</TableHead>
                        <TableHead className="text-right pr-4 sm:pr-5">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p, index) => (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer transition-colors hover:bg-slate-50/70"
                          onClick={() => {
                            setSelected(p);
                            setEditItem(null);
                            setDrawerMode("view");
                            setDrawerOpen(true);
                          }}
                        >
                          <TableCell className="pl-4 font-normal text-slate-500 sm:pl-5">
                            {p.number}
                          </TableCell>
                          <TableCell>
                            <div className="font-normal text-slate-900">{p.title}</div>
                            {p.product_id ? (
                              <div className="text-xs text-slate-500">
                                {productById.get(p.product_id)?.name || "Sin producto"}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">Sin producto</div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {p.client_id ? clientById.get(p.client_id)?.company_name || "—" : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={p.status} />
                              {isProposalExpired(p.valid_until) &&
                              !isApprovedProposalStatus(p.status) &&
                              normalizeStatus(p.status) !== "rejected" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border-amber-200">
                                  <TriangleAlert className="h-3 w-3" /> Vencida
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="hidden font-normal md:table-cell">
                            {formatMoney(Number(p.amount || 0), p.currency)}
                          </TableCell>
                          <TableCell className="hidden text-sm text-slate-500 lg:table-cell">
                            {p.valid_until || "—"}
                          </TableCell>
                          <TableCell className="text-right pr-4 sm:pr-5">
                            <div
                              data-demo={index === 0 ? "proposal-row-actions" : undefined}
                              className="flex justify-end gap-1.5"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
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
                                className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
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
                                className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
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
                                className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
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
                                  className="h-8 rounded-full bg-blue-600 px-3 text-xs font-normal text-white shadow-none hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEdit(p);
                                  }}
                                  title="Editar"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

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
          data-demo="proposal-editor"
          className="flex h-dvh w-screen max-w-none flex-col overflow-hidden border-l border-slate-200 bg-white p-0 shadow-none sm:max-w-[860px]"
        >
          <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <SheetHeader className="space-y-1 text-left">
              <SheetTitle className="text-xl font-normal tracking-normal text-slate-950">
                {drawerMode === "create"
                  ? "Nueva propuesta"
                  : drawerMode === "edit"
                    ? `Editar propuesta ${editItem?.number || ""}`.trim()
                    : selected
                      ? `${selected.number} — ${selected.title}`
                      : "Propuesta"}
              </SheetTitle>
              {drawerMode === "view" && selected ? (
                <div className="text-sm font-normal text-slate-500">
                  Estado:{" "}
                  <span className="font-medium text-slate-900">{selected.status || "—"}</span>
                </div>
              ) : null}
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4 px-4 py-5 sm:px-6">
              {drawerMode === "view" && selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
                      onClick={() => copyPublicLink((selected as any).public_token ?? null)}
                    >
                      <LinkIcon className="h-4 w-4" />
                      Copiar enlace público
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
                      onClick={() => openPublicLink((selected as any).public_token ?? null)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver propuesta
                    </Button>
                    {isAdminLike ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700"
                        onClick={() => openEdit(selected)}
                      >
                        Editar
                      </Button>
                    ) : null}
                    {isAdminLike ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-none border-0 border-b border-rose-200 bg-transparent px-0 text-destructive shadow-none hover:bg-transparent hover:text-destructive"
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

                  <div className="grid grid-cols-2 border-y border-slate-100 text-sm">
                    <div className="border-b border-r border-slate-100 py-3 pr-3">
                      <div className="text-xs text-slate-500">Estado</div>
                      <div className="mt-1 font-medium">
                        <StatusBadge status={selected.status} />
                      </div>
                    </div>
                    <div className="border-b border-slate-100 py-3 pl-3">
                      <div className="text-xs text-slate-500">Producto</div>
                      <div className="mt-1 font-medium">
                        {selected.product_id
                          ? productById.get(selected.product_id)?.name || "—"
                          : "—"}
                      </div>
                    </div>
                    <div className="border-b border-r border-slate-100 py-3 pr-3">
                      <div className="text-xs text-slate-500">Monto</div>
                      <div className="mt-1 font-medium">
                        {formatMoney(Number(selected.amount || 0), selected.currency)}
                      </div>
                    </div>
                    <div className="border-b border-slate-100 py-3 pl-3">
                      <div className="text-xs text-slate-500">Válida hasta</div>
                      <div className="mt-1 font-medium">{selected.valid_until || "—"}</div>
                    </div>
                    <div className="border-r border-slate-100 py-3 pr-3">
                      <div className="text-xs text-slate-500">Cliente</div>
                      <div className="mt-1 font-medium">
                        {selected.client_id
                          ? clientById.get(selected.client_id)?.company_name || "—"
                          : "—"}
                      </div>
                    </div>
                    <div className="py-3 pl-3">
                      <div className="text-xs text-slate-500">Oportunidad</div>
                      <div className="mt-1 font-medium">
                        {selected.deal_id ? String(selected.deal_id).slice(0, 8) + "…" : "—"}
                      </div>
                    </div>
                  </div>

                  {selected.description ? (
                    <div className="border-b border-slate-100 pb-4">
                      <div className="text-xs text-slate-500">Descripción</div>
                      <div className="whitespace-pre-wrap">{selected.description}</div>
                    </div>
                  ) : null}

                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>Contenido</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
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
                    <div className="mt-2 whitespace-pre-wrap text-[12.5px] leading-5 text-slate-700">
                      {selected.content || "—"}
                    </div>
                  </div>

                  {selected.notes ? (
                    <div className="border-b border-slate-100 pb-4">
                      <div className="text-xs text-slate-500">Notas</div>
                      <div className="whitespace-pre-wrap">{selected.notes}</div>
                    </div>
                  ) : null}

                  <div className="text-xs text-muted-foreground">
                    Actualizado{" "}
                    {selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : "—"}
                  </div>
                </>
              ) : null}

              {drawerMode === "create" || drawerMode === "edit" ? (
                <form id="proposal-editor-form" onSubmit={handleSubmit} className="space-y-4">
                  <Tabs value={proposalEditorTab} onValueChange={setProposalEditorTab}>
                    <TabsList
                      data-demo="proposal-editor-tabs"
                      className="grid h-auto w-full grid-cols-3 rounded-none border-b border-slate-100 bg-transparent p-0"
                    >
                      <TabsTrigger
                        value="general"
                        className="rounded-none border-b-2 border-transparent py-3 text-sm font-normal data-[state=active]:border-slate-950 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Datos principales
                      </TabsTrigger>
                      <TabsTrigger
                        value="content"
                        className="rounded-none border-b-2 border-transparent py-3 text-sm font-normal data-[state=active]:border-slate-950 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        PDF / contenido
                      </TabsTrigger>
                      <TabsTrigger
                        value="advanced"
                        className="rounded-none border-b-2 border-transparent py-3 text-sm font-normal data-[state=active]:border-slate-950 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Avanzado
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-4 space-y-4">
                      <div
                        data-demo="proposal-main-fields"
                        className="space-y-5 border-0 bg-white p-0"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Título</Label>
                            <Input
                              className={crmFormStyles.input}
                              value={form.title}
                              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Estado</Label>
                            <Select
                              value={form.status}
                              onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                            >
                              <SelectTrigger className={crmFormStyles.select}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROPOSAL_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Prospecto / Cliente</Label>
                            <Select
                              value={form.client_id || "none"}
                              onValueChange={(v) =>
                                setForm((p) => ({ ...p, client_id: v === "none" ? null : v }))
                              }
                            >
                              <SelectTrigger className={crmFormStyles.select}>
                                <SelectValue placeholder="Selecciona un destinatario" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin destinatario</SelectItem>
                                {clientOptions.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div data-demo="proposal-product-selector" className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Producto</Label>
                            <Select
                              value={form.product_id || "none"}
                              onValueChange={(v) => {
                                const nextProductId = v === "none" ? null : v;
                                const product = nextProductId
                                  ? productById.get(nextProductId)
                                  : null;
                                setForm((prev) => ({ ...prev, product_id: nextProductId }));
                                if (product) applyProductData(product);
                              }}
                            >
                              <SelectTrigger className={crmFormStyles.select}>
                                <SelectValue placeholder="Selecciona un producto" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin producto</SelectItem>
                                {productOptions.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {form.product_id ? (
                          <div className="flex justify-end">
                            <Button
                              data-demo="proposal-use-product-data"
                              type="button"
                              variant="outline"
                              className="gap-2 rounded-none border-0 border-b border-slate-200 bg-transparent shadow-none hover:bg-transparent"
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
                                  Boolean(form.paymentFrequency.trim()) ||
                                  Boolean(form.paymentTermsText.trim()) ||
                                  Boolean(form.content.trim());
                                if (hasAny) {
                                  const ok = window.confirm(
                                    "¿Quieres usar los datos del producto? Esto puede sobrescribir campos existentes.",
                                  );
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

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Monto</Label>
                            <Input
                              className={crmFormStyles.input}
                              type="number"
                              step="0.01"
                              value={form.amount}
                              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Moneda</Label>
                            <Select
                              value={form.currency || "USD"}
                              onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
                            >
                              <SelectTrigger className={crmFormStyles.select}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="DOP">DOP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Válida hasta</Label>
                            <Input
                              className={crmFormStyles.input}
                              type="date"
                              value={form.valid_until}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, valid_until: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div data-demo="proposal-validity" className="space-y-2">
                          <Label className={crmFormStyles.label}>Validez rápida</Label>
                          <div className="flex flex-wrap gap-2">
                            {[7, 15, 30].map((days) => (
                              <Button
                                key={days}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
                                onClick={() =>
                                  setForm((p) => ({ ...p, valid_until: dateAfterDays(days) }))
                                }
                              >
                                {days} días
                              </Button>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
                              onClick={() => setForm((p) => ({ ...p, valid_until: "" }))}
                            >
                              Personalizado
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="content"
                      data-demo="proposal-content-section"
                      className="mt-4 space-y-4"
                    >
                      <div className="space-y-4 border-y border-slate-100 py-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Resumen ejecutivo</Label>
                            <Textarea
                              className={crmFormStyles.textarea}
                              value={form.introductionText}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, introductionText: e.target.value }))
                              }
                              rows={3}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Objetivo principal</Label>
                            <Textarea
                              className={crmFormStyles.textarea}
                              value={form.objectiveText}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, objectiveText: e.target.value }))
                              }
                              rows={2}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Descripción del servicio</Label>
                            <Textarea
                              className={crmFormStyles.textarea}
                              value={form.description}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, description: e.target.value }))
                              }
                              rows={3}
                            />
                          </div>

                          <EditableListField
                            label="Entregables incluidos"
                            value={form.deliverablesText}
                            onChange={(value) =>
                              setForm((p) => ({ ...p, deliverablesText: value }))
                            }
                            placeholder="Ej: Configuración de CRM"
                            addLabel="Agregar entregable"
                          />

                          <EditableListField
                            label="Características / funcionalidades"
                            value={form.featuresText}
                            onChange={(value) => setForm((p) => ({ ...p, featuresText: value }))}
                            placeholder="Ej: Automatización de seguimiento"
                            addLabel="Agregar funcionalidad"
                          />

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Requisitos del cliente</Label>
                            <Textarea
                              className={crmFormStyles.textarea}
                              value={form.clientRequirementsText}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, clientRequirementsText: e.target.value }))
                              }
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className={crmFormStyles.label}>Tiempo estimado</Label>
                              <Select
                                value={form.estimatedTime || "custom"}
                                onValueChange={(v) =>
                                  setForm((p) => ({ ...p, estimatedTime: v === "custom" ? "" : v }))
                                }
                              >
                                <SelectTrigger className={crmFormStyles.select}>
                                  <SelectValue placeholder="Selecciona tiempo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3 días">3 días</SelectItem>
                                  <SelectItem value="7 días">7 días</SelectItem>
                                  <SelectItem value="15 días">15 días</SelectItem>
                                  <SelectItem value="30 días">30 días</SelectItem>
                                  <SelectItem value="Plan mensual">Plan mensual</SelectItem>
                                  <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                              </Select>
                              {!["3 días", "7 días", "15 días", "30 días", "Plan mensual"].includes(
                                form.estimatedTime,
                              ) ? (
                                <Input
                                  className={`${crmFormStyles.input} mt-2`}
                                  value={form.estimatedTime}
                                  onChange={(e) =>
                                    setForm((p) => ({ ...p, estimatedTime: e.target.value }))
                                  }
                                  placeholder="Ej: 45 días / A coordinar"
                                />
                              ) : null}
                            </div>

                            <div className="space-y-1.5">
                              <Label className={crmFormStyles.label}>Frecuencia de pago</Label>
                              <Select
                                value={form.paymentFrequency || "custom"}
                                onValueChange={(v) =>
                                  setForm((p) => ({
                                    ...p,
                                    paymentFrequency: v === "custom" ? "" : v,
                                  }))
                                }
                              >
                                <SelectTrigger className={crmFormStyles.select}>
                                  <SelectValue placeholder="Selecciona pago" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pago único">Pago único</SelectItem>
                                  <SelectItem value="Inicial + final">Inicial + final</SelectItem>
                                  <SelectItem value="Mensual">Mensual</SelectItem>
                                  <SelectItem value="Por fases">Por fases</SelectItem>
                                  <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                              </Select>
                              {!["Pago único", "Inicial + final", "Mensual", "Por fases"].includes(
                                form.paymentFrequency,
                              ) ? (
                                <Input
                                  className={`${crmFormStyles.input} mt-2`}
                                  value={form.paymentFrequency}
                                  onChange={(e) =>
                                    setForm((p) => ({ ...p, paymentFrequency: e.target.value }))
                                  }
                                  placeholder="Ej: 50% inicial / 50% final"
                                />
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>
                              Mensaje adicional para el cliente
                            </Label>
                            <Textarea
                              className={crmFormStyles.textarea}
                              value={form.content}
                              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                              rows={3}
                              placeholder="Notas para el cliente, detalles extra, aclaraciones…"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="advanced"
                      data-demo="proposal-advanced-section"
                      className="mt-4 space-y-4"
                    >
                      <div className="space-y-4 border-y border-slate-100 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Número interno</Label>
                            <Input
                              className={crmFormStyles.input}
                              value={form.number}
                              onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                              placeholder={generateProposalNumber()}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Rondas de cambios</Label>
                            <Input
                              className={crmFormStyles.input}
                              value={form.revisionRoundsText}
                              onChange={(e) =>
                                setForm((p) => ({ ...p, revisionRoundsText: e.target.value }))
                              }
                              placeholder="Ej: 2 rondas"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>Enlace público</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
                              onClick={() => copyPublicLink(form.public_token)}
                              title="Copiar enlace público"
                            >
                              <LinkIcon className="h-4 w-4" />
                              Copiar enlace
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 shadow-none hover:bg-transparent"
                              onClick={() => openPublicLink(form.public_token)}
                              title="Ver propuesta"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ver
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>
                            Proceso manual / notas de proceso
                          </Label>
                          <Textarea
                            className={crmFormStyles.textarea}
                            value={form.processText}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, processText: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>

                        {form.processSteps.length > 0 ? (
                          <div className="space-y-2 border-y border-slate-100 py-3">
                            <div className="text-xs font-medium text-slate-500">
                              Pasos del flujo de trabajo del producto
                            </div>
                            <div className="space-y-2">
                              {form.processSteps.map((step, index) => (
                                <div
                                  key={`${step.order}-${index}`}
                                  className="border-b border-slate-100 py-2 last:border-b-0"
                                >
                                  <div className="text-sm font-medium">
                                    {step.order || index + 1}. {step.title || `Paso ${index + 1}`}
                                  </div>
                                  {step.description ? (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {step.description}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>
                            Servicios adicionales opcionales
                          </Label>
                          <Textarea
                            className={crmFormStyles.textarea}
                            value={form.optionalServicesText}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, optionalServicesText: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>
                            Fuera de alcance / no incluido
                          </Label>
                          <Textarea
                            className={crmFormStyles.textarea}
                            value={form.outOfScopeText}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, outOfScopeText: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>Condiciones importantes</Label>
                          <Textarea
                            className={crmFormStyles.textarea}
                            value={form.termsText}
                            onChange={(e) => setForm((p) => ({ ...p, termsText: e.target.value }))}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>
                            Forma de pago / condiciones de pago
                          </Label>
                          <Textarea
                            className={crmFormStyles.textarea}
                            value={form.paymentTermsText}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, paymentTermsText: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>Notas internas</Label>
                          <Textarea
                            className={crmFormStyles.textarea}
                            value={form.notes}
                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                            rows={3}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </form>
              ) : null}
            </div>
          </ScrollArea>

          {drawerMode === "create" || drawerMode === "edit" ? (
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-0 border-b border-slate-200 bg-transparent shadow-none hover:bg-transparent"
                onClick={() => {
                  setDrawerOpen(false);
                  setDrawerMode("view");
                  setEditItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="proposal-editor-form"
                disabled={!isAdminLike}
                className="rounded-full bg-blue-600 px-4 font-normal text-white shadow-none hover:bg-blue-700"
              >
                {drawerMode === "edit" ? "Guardar" : "Crear propuesta"}
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
      {demoPublicProposalUrl ? (
        <div
          data-demo="proposal-public-preview"
          className="fixed left-1/2 top-1/2 z-[1050] hidden h-[86vh] w-[430px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border bg-white shadow-[0_30px_90px_rgba(2,6,23,0.45)] xl:block"
        >
          <div className="flex h-12 items-center justify-between border-b bg-white px-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">Vista pública de la propuesta</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {demoPublicProposalUrl}
              </div>
            </div>
          </div>
          <iframe
            title="Vista pública de propuesta demo"
            src={demoPublicProposalUrl}
            className="h-[calc(100%-48px)] w-full border-0 bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}
