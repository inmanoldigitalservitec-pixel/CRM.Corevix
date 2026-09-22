Warning: truncated output (original token count: 44818)
Total output lines: 4152

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  X,
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
import { InlineStatusSelect } from "@/components/crm/inline-status-select";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { crmFormStyles } from "@/components/crm/crm-form-shell";
import { ClientProspectSearchSelect } from "@/components/crm/client-prospect-search-select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { ProposalWorkspaceDialog } from "@/components/proposals/proposal-workspace-dialog";
import { useCrud } from "@/hooks/use-crud";
import { supabase } from "@/integrations/supabase/client";
import { createAttentionNotification } from "@/lib/crm/attention-notifications";
import {
  isApprovedProposalStatus,
  isPendingProposalStatus,
  isSentOrViewedProposalStatus,
  normalizeStatus,
} from "@/lib/crm/status";
import {
  formatCurrencyAmount,
  convertCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyAmount as normalizeCrmCurrencyAmount,
  normalizeCurrencyInput as normalizeCrmCurrencyInput,
  type CurrencyCode,
} from "@/lib/currency";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import {
  formatTaxOptionLabel,
  normalizeTaxRate,
  useCompanyTaxes,
  type CompanyTax,
} from "@/hooks/use-company-taxes";

type ProposalsSearch = {
  new?: string;
  leadId?: string;
  dealId?: string;
  conversationId?: string;
  productId?: string;
  clientId?: string;
  proposalId?: string;
  title?: string;
  amount?: string;
  currency?: string;
  description?: string;
  valid_until?: string;
};

export const Route = createFileRoute("/proposals")({
  validateSearch: (search: Record<string, unknown>): ProposalsSearch => ({
    new: typeof search.new === "string" ? search.new : undefined,
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    dealId: typeof search.dealId === "string" ? search.dealId : undefined,
    conversationId: typeof search.conversationId === "string" ? search.conversationId : undefined,
    productId: typeof search.productId === "string" ? search.productId : undefined,
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
    proposalId: typeof search.proposalId === "string" ? search.proposalId : undefined,
    title: typeof search.title === "string" ? search.title : undefined,
    amount: typeof search.amount === "string" ? search.amount : undefined,
    currency: typeof search.currency === "string" ? search.currency : undefined,
    description: typeof search.description === "string" ? search.description : undefined,
    valid_until: typeof search.valid_until === "string" ? search.valid_until : undefined,
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

const PROPOSAL_CURRENCIES = {
  USD: { label: "Dólares", shortLabel: "US$", decimals: 2, step: "0.01" },
  DOP: { label: "Peso dominicano", shortLabel: "RD$", decimals: 0, step: "1" },
} as const;
const NO_TAX_VALUE = "__no_tax__";

type ProposalCurrency = CurrencyCode;

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
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  amount_base?: number | null;
  status: string;
  proposal_date?: string | null;
  assigned_to?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  adjustment_value?: number | null;
  subtotal?: number | null;
  tax_total?: number | null;
  total?: number | null;
  quantity_mode?: string | null;
  tags?: string[] | null;
  allow_comments?: boolean | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  recipient_city?: string | null;
  recipient_state?: string | null;
  recipient_country?: string | null;
  recipient_zip_code?: string | null;
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
  default_tax_id?: string | null;
  default_tax_name?: string | null;
  default_tax_rate?: number | string | null;
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

interface ProposalLead {
  id: string;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface ProposalProcessStep {
  title: string;
  description: string;
  order: number;
  durationDays: number | null;
}

interface ProposalLineItem {
  id: string;
  productId: string | null;
  item: string;
  description: string;
  quantity: string;
  rate: string;
  tax: string;
  taxId?: string | null;
  taxName?: string | null;
  optional: boolean;
  documentCurrency?: string | null;
  originalCurrency?: string | null;
  originalRate?: string | null;
  convertedRate?: string | null;
  exchangeRate?: number | null;
  exchangeRateSource?: string | null;
  exchangeRateUpdatedAt?: string | null;
}

interface ProposalItemRecord {
  id: string;
  company_id: string;
  proposal_id: string;
  product_id: string | null;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_type: string;
  rate: number;
  tax_rate: number;
  tax_id?: string | null;
  tax_name?: string | null;
  tax_amount?: number | null;
  is_optional: boolean;
  sort_order: number;
  amount: number;
  document_currency?: string | null;
  original_currency?: string | null;
  original_rate?: number | null;
  converted_rate?: number | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  created_at: string;
  updated_at: string;
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
    title: context?.title ?? "",
    proposalDate: dateAfterDays(0),
    product_id: context?.productId ?? null,
    client_id: context?.clientId ?? null,
    lead_id: context?.leadId ?? null,
    deal_id: context?.dealId ?? null,
    whatsapp_conversation_id: context?.conversationId ?? null,
    amount: context?.amount ?? "",
    currency: normalizeProposalCurrency(context?.currency || "USD"),
    status: "Draft",
    assignedTo: "",
    discountType: "none",
    discountValue: "",
    adjustmentValue: "",
    quantityMode: "qty",
    tags: "",
    allowComments: true,
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientState: "",
    recipientCountry: "",
    recipientZipCode: "",
    recipientEmail: "",
    recipientPhone: "",
    valid_until: context?.valid_until || dateAfterDays(7),
    description: context?.description ?? "",
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
    proposalItems: [
      {
        id: generatePublicToken(),
        productId: null,
        item: "",
        description: "",
        quantity: "1",
        rate: "",
        tax: "0",
        taxId: null,
        taxName: null,
        optional: false,
      },
    ] as ProposalLineItem[],
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

function normalizeProposalCurrency(currency: string | null | undefined): ProposalCurrency {
  return normalizeCurrency(currency);
}

function normalizeCurrencyAmount(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
) {
  return normalizeCrmCurrencyAmount(amount, currency);
}

function normalizeCurrencyInput(value: string, currency: string | null | undefined) {
  return normalizeCrmCurrencyInput(value, currency);
}

function formatMoney(amount: number, currency: string | null | undefined) {
  return formatCurrencyAmount(amount, currency);
}

function readProposalBaseAmount(
  proposal: Proposal,
  baseCurrency: CurrencyCode,
  usdToDopRate: number,
) {
  const storedBaseAmount = Number(proposal.amount_base);
  const storedBaseCurrency = normalizeProposalCurrency(proposal.base_currency || baseCurrency);
  const rate = Number(proposal.exchange_rate || usdToDopRate);

  if (proposal.amount_base != null && Number.isFinite(storedBaseAmount)) {
    return convertCurrencyAmount(storedBaseAmount, storedBaseCurrency, baseCurrency, rate);
  }

  return convertCurrencyAmount(
    Number(proposal.amount || 0),
    normalizeProposalCurrency(proposal.currency || baseCurrency),
    baseCurrency,
    rate,
  );
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

function parseDateOnlyLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(value);
}

function isProposalExpired(validUntil: string | null | undefined) {
  if (!validUntil) return false;
  const d = parseDateOnlyLocal(validUntil);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return endOfDay.getTime() < today.getTime();
}

function ProposalEditorDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string | null;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-none [&>button]:hidden">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-left sm:px-6 lg:px-10">
          <DialogDescription className="sr-only">
            Completa o edita la informacion comercial de la propuesta.
          </DialogDescription>
          <div className="mx-auto flex w-full max-w-[1440px] items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-semibold tracking-normal text-slate-950">
                {title}
              </DialogTitle>
              {subtitle ? (
                <p className="mt-1 text-sm font-normal text-slate-500">{subtitle}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar propuesta"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-10">{children}</div>
        </ScrollArea>

        {footer ? (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-10">
            <div className="mx-auto flex w-full max-w-[1440px] justify-end gap-2">{footer}</div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
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
  const navigate = useNavigate();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { taxes: salesTaxes, taxById: salesTaxById, defaultTax } = useCompanyTaxes("sales");
  const isAdminLike = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const routeSearch = Route.useSearch();
  const autoOpenSearchKeyRef = useRef<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [validityFilter, setValidityFilter] = useState<"all" | "valid" | "expired">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("view");
  const [demoPublicProposalUrl, setDemoPublicProposalUrl] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const closeProposalWorkspace = useCallback(() => {
    setDrawerOpen(false);
    setDrawerMode("view");
    setEditItem(null);
    setSelected(null);
    autoOpenSearchKeyRef.current = null;

    if (
      routeSearch.proposalId ||
      routeSearch.new ||
      routeSearch.leadId ||
      routeSearch.dealId ||
      routeSearch.conversationId ||
      routeSearch.productId ||
      routeSearch.clientId
    ) {
      void navigate({
        to: "/proposals",
        search: {},
        replace: true,
      });
    }
  }, [navigate, routeSearch]);
  const [form, setForm] = useState<{
    number: string;
    title: string;
    proposalDate: string;
    product_id: string | null;
    client_id: string | null;
    lead_id: string | null;
    deal_id: string | null;
    whatsapp_conversation_id: string | null;
    amount: string;
    currency: string;
    status: string;
    assignedTo: string;
    discountType: string;
    discountValue: string;
    adjustmentValue: string;
    quantityMode: string;
    tags: string;
    allowComments: boolean;
    recipientName: string;
    recipientAddress: string;
    recipientCity: string;
    recipientState: string;
    recipientCountry: string;
    recipientZipCode: string;
    recipientEmail: string;
    recipientPhone: string;
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
    proposalItems: ProposalLineItem[];
  }>(createEmptyProposalForm());

  const { data, loading, create, update, remove } = useCrud<Proposal>({
    table: "proposals",
    orderBy: "updated_at",
    ascending: false,
  });

  const updateProposalStatus = async (proposal: Proposal, nextStatus: string) => {
    if (!proposal.id || !nextStatus || proposal.status === nextStatus) return;
    try {
      const statusPatch = {
        status: nextStatus,
        ...(nextStatus === "Sent" && !proposal.sent_at
          ? { sent_at: new Date().toISOString() }
          : {}),
      };
      const saved = await update(proposal.id, statusPatch);
      setSelected((current) =>
        current?.id === proposal.id
          ? { ...current, ...(saved || statusPatch) }
          : current,
      );
      toast.success("Estado de la propuesta actualizado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar el estado de la propuesta.");
    }
  };

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

  const { data: leads } = useCrud<ProposalLead>({
    table: "leads",
    orderBy: "created_at",
    ascending: false,
  });

  const { data: proposalItemRows, fetch: fetchProposalItems } = useCrud<ProposalItemRecord>({
    table: "proposal_items",
    orderBy: "sort_order",
    ascending: true,
    limit: 1000,
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

  const getDefaultTaxForProduct = (product?: Product | null): CompanyTax | null => {
    if (product?.default_tax_id) {
      const catalogTax = salesTaxById.get(product.default_tax_id);
      if (catalogTax) return catalogTax;
    }
    if (product?.default_tax_name || product?.default_tax_rate) {
      return {
        id: product.default_tax_id || "",
        company_id: profile?.company_id || "",
        name: product.default_tax_name || "Impuesto",
        rate: normalizeTaxRate(product.default_tax_rate),
        tax_type: "sales",
        is_active: true,
        is_default: false,
      };
    }
    return defaultTax;
  };

  const proposalItemsByProposalId = useMemo(() => {
    const m = new Map<string, ProposalItemRecord[]>();
    for (const item of proposalItemRows) {
      const rows = m.get(item.proposal_id) || [];
      rows.push(item);
      m.set(item.proposal_id, rows);
    }
    return m;
  }, [proposalItemRows]);

  const openNewContext = useMemo(
    () => ({
      ...(routeSearch.new ? { new: routeSearch.new } : {}),
      ...(routeSearch.leadId ? { leadId: routeSearch.leadId } : {}),
      ...(routeSearch.dealId ? { dealId: routeSearch.dealId } : {}),
      ...(routeSearch.conversationId ? { conversationId: routeSearch.conversationId } : {}),
      ...(routeSearch.productId ? { productId: routeSearch.productId } : {}),
      ...(routeSearch.clientId ? { clientId: routeSearch.clientId } : {}),
      ...(routeSearch.title ? { title: routeSearch.title } : {}),
      ...(routeSearch.amount ? { amount: routeSearch.amount } : {}),
      ...(routeSearch.currency ? { currency: routeSearch.currency } : {}),
      ...(routeSearch.description ? { description: routeSearch.description } : {}),
      ...(routeSearch.valid_until ? { valid_until: routeSearch.valid_until } : {}),
    }),
    [
      routeSearch.clientId,
      routeSearch.conversationId,
      routeSearch.dealId,
      routeSearch.description,
      routeSearch.leadId,
      routeSearch.new,
      routeSearch.productId,
      routeSearch.title,
      routeSearch.amount,
      routeSearch.currency,
      routeSearch.valid_until,
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

  const leadById = useMemo(() => {
    const m = new Map<string, ProposalLead>();
    for (const lead of leads) m.set(lead.id, lead);
    return m;
  }, [leads]);

  const getProposalRelatedLabel = (proposal: Proposal) => {
    if (proposal.client_id) {
      return clientById.get(proposal.client_id)?.company_name || "Cliente";
    }

    if (proposal.lead_id) {
      const lead = leadById.get(proposal.lead_id);
      if (lead) {
        const contactName = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();
        return (
          lead.company_name ||
          lead.display_name ||
          lead.full_name ||
          contactName ||
          lead.email ||
          "Prospecto"
        );
      }
      return proposal.recipient_name || "Prospecto";
    }

    return "—";
  };

  const selectedProposalClient = useMemo(
    () => (form.client_id ? clientById.get(form.client_id) || null : null),
    [clientById, form.client_id],
  );

  const selectedProposalProduct = useMemo(
    () => (form.product_id ? productById.get(form.product_id) || null : null),
    [form.product_id, productById],
  );

  const currentAssigneeName = useMemo(() => {
    const name = String((profile as any)?.full_name || (profile as any)?.name || "").trim();
    return name || user?.email || "Usuario actual";
  }, [profile, user?.email]);

  const parseMoneyValue = (value: unknown) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? amount : 0;
  };

  const moneyStep = getCurrencyStep(form.currency);
  const moneyMode = getCurrencyInputMode(form.currency);
  const moneyUnitLabel = PROPOSAL_CURRENCIES[normalizeProposalCurrency(form.currency)].shortLabel;

  const getLineAmount = (line: ProposalLineItem) => {
    if (line.optional) return 0;
    const quantity = parseMoneyValue(line.quantity);
    const rate = normalizeCurrencyAmount(line.rate, form.currency);
    const tax = parseMoneyValue(line.tax);
    const base = quantity * rate;
    return normalizeCurrencyAmount(base + base * (tax / 100), form.currency);
  };

  const normalizeProposalLineItems = (items: ProposalLineItem[]) =>
    items
      .map((line) => {
        const catalogTax = line.taxId ? salesTaxById.get(line.taxId) : null;
        const taxRate = catalogTax ? normalizeTaxRate(catalogTax.rate) : normalizeTaxRate(line.tax);
        return {
          id: line.id || generatePublicToken(),
          productId: line.productId || null,
          item: line.item?.trim() || "",
          description: line.description?.trim() || "",
          quantity: line.quantity?.trim() || "1",
          rate: normalizeCurrencyInput(line.rate, form.currency) || "0",
          tax: String(taxRate),
          taxId: catalogTax?.id || line.taxId || null,
          taxName: catalogTax?.name || line.taxName || null,
          optional: Boolean(line.optional),
          documentCurrency: line.documentCurrency || form.currency,
          originalCurrency: line.originalCurrency || form.currency,
          originalRate:
            line.originalRate || normalizeCurrencyInput(line.rate, form.currency) || "0",
          convertedRate:
            line.convertedRate || normalizeCurrencyInput(line.rate, form.currency) || "0",
          exchangeRate: line.exchangeRate ?? 1,
          exchangeRateSource: line.exchangeRateSource || currencySettings.rateSource,
          exchangeRateUpdatedAt: line.exchangeRateUpdatedAt || currencySettings.rateUpdatedAt,
        };
      })
      .filter((line) => line.item || line.description || parseMoneyValue(line.rate) > 0);

  const proposalTotals = useMemo(() => {
    let taxTotal = 0;
    const subtotal = form.proposalItems.reduce((sum, item) => {
      if (item.optional) return sum;
      const quantity = Number(item.quantity || 0);
      const rate = normalizeCurrencyAmount(item.rate, form.currency);
      const tax = Number(item.tax || 0);
      const base = Number.isFinite(quantity * rate) ? quantity * rate : 0;
      const lineTax = base * ((Number.isFinite(tax) ? tax : 0) / 100);
      taxTotal += lineTax;
      return sum + base;
    }, 0);
    const discountValue = normalizeCurrencyAmount(form.discountValue, form.currency);
    const adjustmentValue = normalizeCurrencyAmount(form.adjustmentValue, form.currency);
    const safeDiscount = Number.isFinite(discountValue) ? discountValue : 0;
    const discount =
      form.discountType === "percent" ? subtotal * (safeDiscount / 100) : safeDiscount;
    const adjustment = Number.isFinite(adjustmentValue) ? adjustmentValue : 0;
    const total = Math.max(0, subtotal + taxTotal - discount + adjustment);
    return {
      subtotal: normalizeCurrencyAmount(subtotal, form.currency),
      taxTotal: normalizeCurrencyAmount(taxTotal, form.currency),
      discount: normalizeCurrencyAmount(discount, form.currency),
      adjustment: normalizeCurrencyAmount(adjustment, form.currency),
      total: normalizeCurrencyAmount(total, form.currency),
    };
  }, [
    form.adjustmentValue,
    form.currency,
    form.discountType,
    form.discountValue,
    form.proposalItems,
  ]);

  useEffect(() => {
    if (!selectedProposalClient) return;
    setForm((prev) => {
      const next = { ...prev };
      if (!next.recipientName.trim()) {
        next.recipientName =
          selectedProposalClient.contact_person || selectedProposalClient.company_name || "";
      }
      if (!next.recipientEmail.trim()) next.recipientEmail = selectedProposalClient.email || "";
      if (!next.recipientPhone.trim()) {
        next.recipientPhone = selectedProposalClient.phone || selectedProposalClient.whatsapp || "";
      }
      if (!next.recipientCity.trim()) next.recipientCity = selectedProposalClient.city || "";
      return next;
    });
  }, [selectedProposalClient]);

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
      .reduce(
        (s, p) =>
          s +
          readProposalBaseAmount(p, currencySettings.baseCurrency, currencySettings.usdToDopRate),
        0,
      );
    const totalAmount = data.reduce(
      (s, p) =>
        s + readProposalBaseAmount(p, currencySettings.baseCurrency, currencySettings.usdToDopRate),
      0,
    );
    return { total, active, sent, drafts, expired, pipelineAmount, totalAmount };
  }, [currencySettings.baseCurrency, currencySettings.usdToDopRate, data]);

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

  function applyProposalCurrency(currency: string) {
    const nextCurrency = normalizeProposalCurrency(currency);
    setForm((prev) => {
      const currentCurrency = normalizeProposalCurrency(prev.currency);
      const convertedAmount = convertCurrencyAmount(
        prev.amount,
        currentCurrency,
        nextCurrency,
        currencySettings.usdToDopRate,
      );
      const convertedDiscount =
        prev.discountType === "percent"
          ? prev.discountValue
          : normalizeCurrencyInput(
              String(
                convertCurrencyAmount(
                  prev.discountValue,
                  currentCurrency,
                  nextCurrency,
                  currencySettings.usdToDopRate,
                ),
              ),
              nextCurrency,
            );
      const convertedAdjustment = convertCurrencyAmount(
        prev.adjustmentValue,
        currentCurrency,
        nextCurrency,
        currencySettings.usdToDopRate,
      );

      return {
        ...prev,
        currency: nextCurrency,
        amount: normalizeCurrencyInput(String(convertedAmount), nextCurrency),
        discountValue: convertedDiscount,
        adjustmentValue: normalizeCurrencyInput(String(convertedAdjustment), nextCurrency),
        proposalItems: prev.proposalItems.map((line) => {
          const originalCurrency = normalizeProposalCurrency(
            line.originalCurrency || currentCurrency,
          );
          const originalRate =
            line.originalRate || normalizeCurrencyInput(line.rate, originalCurrency);
          const convertedRate = normalizeCurrencyInput(
            String(
              convertCurrencyAmount(
                originalRate || line.rate,
                originalCurrency,
                nextCurrency,
                currencySettings.usdToDopRate,
              ),
            ),
            nextCurrency,
          );

          return {
            ...line,
            documentCurrency: nextCurrency,
            originalCurrency,
            originalRate,
            convertedRate,
            rate: convertedRate,
            exchangeRate: originalCurrency === nextCurrency ? 1 : currencySettings.usdToDopRate,
            exchangeRateSource: currencySettings.rateSource,
            exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
          };
        }),
      };
    });
  }

  function applyProductData(product: Product, opts?: { force?: boolean }) {
    const force = Boolean(opts?.force);
    setForm((prev) => {
      const next = { ...prev };
      const productCurrency = normalizeProposalCurrency(product.currency);
      const documentCurrency = normalizeProposalCurrency(prev.currency);
      const originalPrice = normalizeCurrencyAmount(product.base_price ?? 0, productCurrency);
      const convertedPrice = convertCurrencyAmount(
        originalPrice,
        productCurrency,
        documentCurrency,
        currencySettings.usdToDopRate,
      );
      const convertedPriceInput = normalizeCurrencyInput(String(convertedPrice), documentCurrency);
      const defaults =
        product?.proposal_defaults && typeof product.proposal_defaults === "object"
          ? (product.proposal_defaults as any)
          : {};
      const workflowSteps = workflowStepsByProductId.get(product.id) || [];
      const productTax = getDefaultTaxForProduct(product);
      const productTaxRate = productTax ? normalizeTaxRate(productTax.rate) : 0;

      const currentAmount = Number(prev.amount || 0);
      const amountEmpty = !Number.isFinite(currentAmount) || currentAmount === 0;
      const currencyEmpty = !prev.currency?.trim();
      const itemsEmpty = !next.proposalItems.some((item) => item.item.trim() || item.rate.trim());
      const descriptionEmpty = !prev.description?.trim();
      const deliverablesEmpty = !prev.deliverablesText?.trim();
      const estimatedTimeEmpty = !prev.estimatedTime?.trim();
      const nextStepEmpty = !prev.nextStep?.trim();
      const paymentFrequencyEmpty = !prev.paymentFrequency?.trim();
      const contentEmpty = !prev.content?.trim();
      const processStepsEmpty = !Array.isArray(prev.processSteps) || prev.processSteps.length === 0;

      if (force || amountEmpty) next.amount = convertedPriceInput;
      if (force && currencyEmpty) next.currency = documentCurrency;
      if (force || itemsEmpty) {
        next.proposalItems = [
          {
            id: generatePublicToken(),
            productId: product.id,
            item: product.name,
            description: String(product.description || "").trim(),
            quantity: "1",
            rate: convertedPriceInput,
            tax: String(productTaxRate),
            taxId: productTax?.id || null,
            taxName: productTax?.name || null,
            optional: false,
            documentCurrency,
            originalCurrency: productCurrency,
            originalRate: normalizeCurrencyInput(String(originalPrice), productCurrency),
            convertedRate: convertedPriceInput,
            exchangeRate: productCurrency === documentCurrency ? 1 : currencySettings.usdToDopRate,
            exchangeRateSource: currencySettings.rateSource,
            exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
          },
        ];
      }
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

  function addProductAsProposalItem(product: Product) {
    setForm((prev) => {
      const existingLines = prev.proposalItems.filter(
        (line) => line.item.trim() || line.description.trim() || line.rate.trim(),
      );
      const currency = normalizeProposalCurrency(prev.currency);
      const productCurrency = normalizeProposalCurrency(product.currency);
      const originalPrice = normalizeCurrencyAmount(product.base_price ?? 0, productCurrency);
      const convertedPrice = convertCurrencyAmount(
        originalPrice,
        productCurrency,
        currency,
        currencySettings.usdToDopRate,
      );
      const convertedRate = normalizeCurrencyInput(String(convertedPrice), currency);
      const productTax = getDefaultTaxForProduct(product);
      const productTaxRate = productTax ? normalizeTaxRate(productTax.rate) : 0;
      return {
        ...prev,
        product_id: prev.product_id || product.id,
        currency,
        proposalItems: [
          ...existingLines,
          {
            id: generatePublicToken(),
            productId: product.id,
            item: product.name,
            description: String(product.description || "").trim(),
            quantity: "1",
            rate: convertedRate,
            tax: String(productTaxRate),
            taxId: productTax?.id || null,
            taxName: productTax?.name || null,
            optional: false,
            documentCurrency: currency,
            originalCurrency: productCurrency,
            originalRate: normalizeCurrencyInput(String(originalPrice), productCurrency),
            convertedRate,
            exchangeRate: productCurrency === currency ? 1 : currencySettings.usdToDopRate,
            exchangeRateSource: currencySettings.rateSource,
            exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
          },
        ],
      };
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
    const storedItems = proposalItemsByProposalId.get(item.id) || [];
    const dbProposalItems =
      storedItems.length > 0
        ? storedItems.map((line) => ({
            id: line.id,
            productId: line.product_id || null,
            item: line.item_name || "",
            description: line.description || "",
            quantity: String(line.quantity ?? "1"),
            rate: String(line.rate ?? ""),
            tax: String(line.tax_rate ?? "0"),
            taxId: line.tax_id || null,
            taxName: line.tax_name || null,
            optional: Boolean(line.is_optional),
            documentCurrency: line.document_currency || item.currency || "USD",
            originalCurrency:
              line.original_currency || line.document_currency || item.currency || "USD",
            originalRate:
              line.original_rate === null || line.original_rate === undefined
                ? String(line.rate ?? "")
                : String(line.original_rate),
            convertedRate:
              line.converted_rate === null || line.converted_rate === undefined
                ? String(line.rate ?? "")
                : String(line.converted_rate),
            exchangeRate:
              line.exchange_rate === null || line.exchange_rate === undefined
                ? null
                : Number(line.exchange_rate),
            exchangeRateSource: line.exchange_rate_source || null,
            exchangeRateUpdatedAt: line.exchange_rate_updated_at || null,
          }))
        : null;
    const jsonProposalItems = Array.isArray((pd as any)?.proposalItems)
      ? (pd as any).proposalItems.map((line: any) => ({
          id: String(line?.id || generatePublicToken()),
          productId: String(line?.productId || line?.product_id || "") || null,
          item: String(line?.item || line?.item_name || ""),
          description: String(line?.description || ""),
          quantity: String(line?.quantity ?? "1"),
          rate: String(line?.rate ?? ""),
          tax: String(line?.tax ?? line?.tax_rate ?? "0"),
          taxId: String(line?.taxId || line?.tax_id || "") || null,
          taxName: String(line?.taxName || line?.tax_name || "") || null,
          optional: Boolean(line?.optional ?? line?.is_optional),
          documentCurrency: String(line?.documentCurrency || line?.document_currency || "") || null,
          originalCurrency: String(line?.originalCurrency || line?.original_currency || "") || null,
          originalRate:
            String(line?.originalRate ?? line?.original_rate ?? line?.rate ?? "") || null,
          convertedRate:
            String(line?.convertedRate ?? line?.converted_rate ?? line?.rate ?? "") || null,
          exchangeRate: (() => {
            const rawExchangeRate = line?.exchangeRate ?? line?.exchange_rate;
            return rawExchangeRate === null ||
              rawExchangeRate === undefined ||
              rawExchangeRate === ""
              ? null
              : Number(rawExchangeRate);
          })(),
          exchangeRateSource:
            String(line?.exchangeRateSource || line?.exchange_rate_source || "") || null,
          exchangeRateUpdatedAt:
            String(line?.exchangeRateUpdatedAt || line?.exchange_rate_updated_at || "") || null,
        }))
      : null;
    setEditItem(item);
    setForm({
      number: item.number || generateProposalNumber(),
      title: item.title || "",
      proposalDate: String(
        item.proposal_date ??
          (pd as any)?.proposalDate ??
          item.created_at?.slice(0, 10) ??
          dateAfterDays(0),
      ),
      product_id: item.product_id || null,
      client_id: item.client_id || null,
      lead_id: item.lead_id || null,
      deal_id: item.deal_id || null,
      whatsapp_conversation_id: item.whatsapp_conversation_id || null,
      amount: String(item.amount ?? ""),
      currency: item.currency || "USD",
      status: item.status || "Draft",
      assignedTo: String((pd as any)?.assignedTo ?? ""),
      discountType: String(item.discount_type ?? (pd as any)?.discountType ?? "none"),
      discountValue: String(item.discount_value ?? (pd as any)?.discountValue ?? ""),
      adjustmentValue: String(item.adjustment_value ?? (pd as any)?.adjustmentValue ?? ""),
      quantityMode: String(item.quantity_mode ?? (pd as any)?.quantityMode ?? "qty"),
      tags: Array.isArray(item.tags)
        ? item.tags.join(", ")
        : Array.isArray((pd as any)?.tags)
          ? (pd as any).tags.join(", ")
          : String((pd as any)?.tags ?? ""),
      allowComments: Boolean(item.allow_comments ?? (pd as any)?.allowComments ?? true),
      recipientName: String(item.recipient_name ?? (pd as any)?.recipientName ?? ""),
      recipientAddress: String(item.recipient_address ?? (pd as any)?.recipientAddress ?? ""),
      recipientCity: String(item.recipient_city ?? (pd as any)?.recipientCity ?? ""),
      recipientState: String(item.recipient_state ?? (pd as any)?.recipientState ?? ""),
      recipientCountry: String(item.recipient_country ?? (pd as any)?.recipientCountry ?? ""),
      recipientZipCode: String(item.recipient_zip_code ?? (pd as any)?.recipientZipCode ?? ""),
      recipientEmail: String(item.recipient_email ?? (pd as any)?.recipientEmail ?? ""),
      recipientPhone: String(item.recipient_phone ?? (pd as any)?.recipientPhone ?? ""),
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
      proposalItems: dbProposalItems ||
        jsonProposalItems || [
          {
            id: generatePublicToken(),
            productId: item.product_id || null,
            item: item.title || "",
            description: item.description || "",
            quantity: "1",
            rate: String(item.amount ?? ""),
            tax: "0",
            taxId: null,
            taxName: null,
            optional: false,
            documentCurrency: normalizeProposalCurrency(item.currency),
            originalCurrency: normalizeProposalCurrency(item.currency),
            originalRate: normalizeCurrencyInput(String(item.amount ?? ""), item.currency),
            convertedRate: normalizeCurrencyInput(String(item.amount ?? ""), item.currency),
            exchangeRate: 1,
            exchangeRateSource: currencySettings.rateSource,
            exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
          },
        ],
    });
    setSelected(null);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  useEffect(() => {
    const onDemoOpenProposalEditor = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;

      if (detail?.open === false) {
        closeProposalWorkspace();
        return;
      }

      openNew(openNewContext);
    };

    window.addEventListener("crm-demo-open-proposal-editor", onDemoOpenProposalEditor);
    return () =>
      window.removeEventListener("crm-demo-open-proposal-editor", onDemoOpenProposalEditor);
  }, [closeProposalWorkspace, openNew, openNewContext]);

  useEffect(() => {
    if (!isAdminLike) return;
    const hasContext = Boolean(
      routeSearch.new ||
      routeSearch.leadId ||
      routeSearch.dealId ||
      routeSearch.conversationId ||
      routeSearch.productId ||
      routeSearch.clientId,
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
      routeSearch.clientId || "",
      routeSearch.title || "",
      routeSearch.amount || "",
      routeSearch.currency || "",
      routeSearch.description || "",
      routeSearch.valid_until || "",
      routeSearch.new || "",
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

  const handleSubmit = async (e: R…14818 tokens truncated…      <SelectContent>
                            <SelectItem value="none">Sin descuento</SelectItem>
                            <SelectItem value="fixed">Monto fijo</SelectItem>
                            <SelectItem value="percent">Porcentaje</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div data-demo="proposal-product-selector" className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Producto / servicio</Label>
                      <Select
                        value={form.product_id || "none"}
                        onValueChange={(v) => {
                          const nextProductId = v === "none" ? null : v;
                          const product = nextProductId ? productById.get(nextProductId) : null;
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

                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Etiquetas</Label>
                      <Input
                        className={crmFormStyles.input}
                        value={form.tags}
                        onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                        placeholder="web, mantenimiento, mensual"
                      />
                    </div>

                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <Checkbox
                        checked={form.allowComments}
                        onCheckedChange={(checked) =>
                          setForm((p) => ({ ...p, allowComments: checked === true }))
                        }
                      />
                      Permitir comentarios
                    </label>
                  </div>

                  <div className="space-y-5 p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>Responsable</Label>
                        <Select
                          value={form.assignedTo || currentAssigneeName}
                          onValueChange={(v) => setForm((p) => ({ ...p, assignedTo: v }))}
                        >
                          <SelectTrigger className={crmFormStyles.select}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={currentAssigneeName}>
                              {currentAssigneeName}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>
                        <span className="text-rose-500">*</span> Para
                      </Label>
                      <Input
                        className={crmFormStyles.input}
                        value={form.recipientName}
                        onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className={crmFormStyles.label}>Dirección</Label>
                      <Textarea
                        className={crmFormStyles.textarea}
                        value={form.recipientAddress}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, recipientAddress: e.target.value }))
                        }
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>Ciudad</Label>
                        <Input
                          className={crmFormStyles.input}
                          value={form.recipientCity}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, recipientCity: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>Provincia / estado</Label>
                        <Input
                          className={crmFormStyles.input}
                          value={form.recipientState}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, recipientState: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>País</Label>
                        <Select
                          value={form.recipientCountry || "none"}
                          onValueChange={(v) =>
                            setForm((p) => ({ ...p, recipientCountry: v === "none" ? "" : v }))
                          }
                        >
                          <SelectTrigger className={crmFormStyles.select}>
                            <SelectValue placeholder="Nada seleccionado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nada seleccionado</SelectItem>
                            <SelectItem value="República Dominicana">
                              República Dominicana
                            </SelectItem>
                            <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                            <SelectItem value="Puerto Rico">Puerto Rico</SelectItem>
                            <SelectItem value="España">España</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>Código postal</Label>
                        <Input
                          className={crmFormStyles.input}
                          value={form.recipientZipCode}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, recipientZipCode: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>
                          <span className="text-rose-500">*</span> Correo
                        </Label>
                        <Input
                          className={crmFormStyles.input}
                          type="email"
                          value={form.recipientEmail}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, recipientEmail: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={crmFormStyles.label}>Teléfono</Label>
                        <Input
                          className={crmFormStyles.input}
                          value={form.recipientPhone}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, recipientPhone: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-4 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex w-full max-w-[460px] overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <Select
                        value="none"
                        onValueChange={(v) => {
                          const nextProductId = v === "none" ? null : v;
                          const product = nextProductId ? productById.get(nextProductId) : null;
                          if (product) addProductAsProposalItem(product);
                        }}
                      >
                        <SelectTrigger className="h-10 flex-1 rounded-none border-0 px-3 shadow-none focus:ring-0">
                          <SelectValue placeholder="Agregar ítem" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Agregar ítem</SelectItem>
                          {productOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-12 rounded-none border-0 border-l border-slate-200 bg-white px-0 shadow-none"
                        onClick={addProposalItem}
                        title="Agregar ítem"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
                      <span>Mostrar cantidad como:</span>
                      {[
                        ["qty", "Cantidad"],
                        ["hours", "Horas"],
                        ["qty_hours", "Cantidad/Horas"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="proposal-quantity-mode"
                            className="h-4 w-4 accent-blue-600"
                            checked={form.quantityMode === value}
                            onChange={() => setForm((p) => ({ ...p, quantityMode: value }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="min-w-[260px]">Ítem</TableHead>
                          <TableHead className="min-w-[320px]">Descripción</TableHead>
                          <TableHead className="w-[140px] text-right">Cant.</TableHead>
                          <TableHead className="w-[180px] text-right">Tarifa</TableHead>
                          <TableHead className="w-[220px]">Impuesto</TableHead>
                          <TableHead className="w-[160px] text-right">Importe</TableHead>
                          <TableHead className="w-[72px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.proposalItems.map((line) => {
                          const quantity = Number(line.quantity || 0);
                          const rate = normalizeCurrencyAmount(line.rate, form.currency);
                          const tax = Number(line.tax || 0);
                          const base = Number.isFinite(quantity * rate) ? quantity * rate : 0;
                          const amount = line.optional
                            ? 0
                            : normalizeCurrencyAmount(
                                base + base * ((Number.isFinite(tax) ? tax : 0) / 100),
                                form.currency,
                              );
                          return (
                            <TableRow key={line.id} className="align-top">
                              <TableCell className="align-top">
                                <Textarea
                                  className="min-h-[92px] rounded-lg align-top"
                                  value={line.item}
                                  onChange={(e) =>
                                    updateProposalItem(line.id, { item: e.target.value })
                                  }
                                  placeholder="Descripción"
                                />
                                <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                                  <Checkbox
                                    checked={line.optional}
                                    onCheckedChange={(checked) =>
                                      updateProposalItem(line.id, { optional: checked === true })
                                    }
                                  />
                                  Este ítem es opcional
                                </label>
                              </TableCell>
                              <TableCell className="align-top">
                                <Textarea
                                  className="min-h-[92px] rounded-lg align-top"
                                  value={line.description}
                                  onChange={(e) =>
                                    updateProposalItem(line.id, { description: e.target.value })
                                  }
                                  placeholder="Descripción larga"
                                />
                              </TableCell>
                              <TableCell className="align-top text-right">
                                <Input
                                  className={`${crmFormStyles.input} text-right`}
                                  type="number"
                                  step="0.01"
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateProposalItem(line.id, { quantity: e.target.value })
                                  }
                                />
                                <div className="mt-2 text-xs text-slate-400">
                                  {form.quantityMode === "hours"
                                    ? "Horas"
                                    : form.quantityMode === "qty_hours"
                                      ? "Cant./Horas"
                                      : "Unidad"}
                                </div>
                              </TableCell>
                              <TableCell className="align-top text-right">
                                <Input
                                  className={`${crmFormStyles.input} text-right`}
                                  type="number"
                                  step={moneyStep}
                                  inputMode={moneyMode}
                                  value={line.rate}
                                  onChange={(e) =>
                                    updateProposalItem(line.id, {
                                      rate: e.target.value,
                                      documentCurrency: normalizeProposalCurrency(form.currency),
                                      originalCurrency: normalizeProposalCurrency(form.currency),
                                      originalRate: e.target.value,
                                      convertedRate: e.target.value,
                                      exchangeRate: 1,
                                      exchangeRateSource: currencySettings.rateSource,
                                      exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
                                    })
                                  }
                                  onBlur={(e) => {
                                    const normalizedRate = normalizeCurrencyInput(
                                      e.target.value,
                                      form.currency,
                                    );
                                    updateProposalItem(line.id, {
                                      rate: normalizedRate,
                                      documentCurrency: normalizeProposalCurrency(form.currency),
                                      originalCurrency: normalizeProposalCurrency(form.currency),
                                      originalRate: normalizedRate,
                                      convertedRate: normalizedRate,
                                      exchangeRate: 1,
                                      exchangeRateSource: currencySettings.rateSource,
                                      exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
                                    });
                                  }}
                                  placeholder="Tarifa"
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <Select
                                  value={line.taxId || NO_TAX_VALUE}
                                  onValueChange={(v) => {
                                    const selectedTax =
                                      v === NO_TAX_VALUE ? null : salesTaxById.get(v) || null;
                                    updateProposalItem(line.id, {
                                      tax: selectedTax
                                        ? String(normalizeTaxRate(selectedTax.rate))
                                        : "0",
                                      taxId: selectedTax?.id || null,
                                      taxName: selectedTax?.name || null,
                                    });
                                  }}
                                >
                                  <SelectTrigger className={crmFormStyles.select}>
                                    <SelectValue placeholder="Sin impuesto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_TAX_VALUE}>Sin impuesto</SelectItem>
                                    {salesTaxes.map((tax) => (
                                      <SelectItem key={tax.id} value={tax.id}>
                                        {formatTaxOptionLabel(tax)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="align-top pt-9 text-right font-semibold text-slate-900">
                                {formatMoney(amount, form.currency)}
                              </TableCell>
                              <TableCell className="align-top pt-6">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-rose-600"
                                  onClick={() => removeProposalItem(line.id)}
                                  title="Quitar ítem"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="ml-auto w-full max-w-[720px] space-y-0 border-t border-slate-200 text-sm">
                    <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 border-b border-slate-200 py-3">
                      <div />
                      <div className="text-right font-semibold text-slate-700">Subtotal:</div>
                      <div className="text-right text-slate-700">
                        {formatMoney(proposalTotals.subtotal, form.currency)}
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 border-b border-slate-200 py-3">
                      <div />
                      <div className="text-right font-semibold text-slate-700">Descuento</div>
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          className="h-10 max-w-[120px] text-right"
                          type="number"
                          step={form.discountType === "percent" ? "0.01" : moneyStep}
                          inputMode={form.discountType === "percent" ? "decimal" : moneyMode}
                          value={form.discountValue}
                          disabled={form.discountType === "none"}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, discountValue: e.target.value }))
                          }
                          onBlur={(e) => {
                            if (form.discountType === "percent") return;
                            setForm((p) => ({
                              ...p,
                              discountValue: normalizeCurrencyInput(e.target.value, p.currency),
                            }));
                          }}
                        />
                        <span className="w-10 text-right text-slate-500">
                          {form.discountType === "percent" ? "%" : moneyUnitLabel}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 border-b border-slate-200 py-3">
                      <div />
                      <div className="text-right font-semibold text-slate-700">Ajuste</div>
                      <Input
                        className="ml-auto h-10 max-w-[150px] text-right"
                        type="number"
                        step={moneyStep}
                        inputMode={moneyMode}
                        value={form.adjustmentValue}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, adjustmentValue: e.target.value }))
                        }
                        onBlur={(e) =>
                          setForm((p) => ({
                            ...p,
                            adjustmentValue: normalizeCurrencyInput(e.target.value, p.currency),
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 py-4">
                      <div />
                      <div className="text-right text-base font-bold text-slate-800">Total:</div>
                      <div className="text-right text-base font-bold text-slate-950">
                        {formatMoney(proposalTotals.total, form.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs value="hidden" className="hidden">
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

                <TabsContent value="general" className="mt-5">
                  <div
                    data-demo="proposal-main-fields"
                    className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]"
                  >
                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="mb-5">
                        <h3 className="text-base font-semibold tracking-normal text-slate-950">
                          Datos de la propuesta
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Define el destinatario, producto, estado y validez.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="space-y-1.5 lg:col-span-2">
                          <Label className={crmFormStyles.label}>Título</Label>
                          <Input
                            className={crmFormStyles.input}
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            required
                          />
                        </div>

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
                              const product = nextProductId ? productById.get(nextProductId) : null;
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

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Monto</Label>
                            <Input
                              className={crmFormStyles.input}
                              type="number"
                              step={moneyStep}
                              inputMode={moneyMode}
                              value={form.amount}
                              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                              onBlur={(e) =>
                                setForm((p) => ({
                                  ...p,
                                  amount: normalizeCurrencyInput(e.target.value, p.currency),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className={crmFormStyles.label}>Moneda</Label>
                            <Select
                              value={form.currency || "USD"}
                              onValueChange={applyProposalCurrency}
                            >
                              <SelectTrigger className={crmFormStyles.select}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">US$ · Dólares</SelectItem>
                                <SelectItem value="DOP">RD$ · Peso dominicano</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className={crmFormStyles.label}>Válida hasta</Label>
                          <Input
                            name="valid_until"
                            className={crmFormStyles.input}
                            type="date"
                            value={form.valid_until}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, valid_until: e.target.value }))
                            }
                            onInput={(e) =>
                              setForm((p) => ({
                                ...p,
                                valid_until: (e.currentTarget as HTMLInputElement).value,
                              }))
                            }
                          />
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
                                className="h-9 rounded-full border-slate-200 bg-white px-3 text-sm font-normal shadow-none hover:bg-slate-50"
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
                              className="h-9 rounded-full border-slate-200 bg-white px-3 text-sm font-normal shadow-none hover:bg-slate-50"
                              onClick={() => setForm((p) => ({ ...p, valid_until: "" }))}
                            >
                              Personalizado
                            </Button>
                          </div>
                        </div>
                      </div>
                    </section>

                    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div>
                        <h3 className="text-base font-semibold tracking-normal text-slate-950">
                          Resumen del destinatario
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Se completa con el cliente seleccionado.
                        </p>
                      </div>

                      {selectedProposalClient ? (
                        <div className="space-y-3 text-sm">
                          <div className="rounded-lg bg-slate-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Empresa
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">
                              {selectedProposalClient.company_name}
                            </p>
                            <p className="mt-1 text-slate-500">
                              {selectedProposalClient.industry || "Sin industria registrada"}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                            <div className="border-b border-slate-100 pb-3">
                              <p className="text-xs text-slate-500">Contacto</p>
                              <p className="mt-1 font-medium text-slate-900">
                                {selectedProposalClient.contact_person || "—"}
                              </p>
                            </div>
                            <div className="border-b border-slate-100 pb-3">
                              <p className="text-xs text-slate-500">Estado</p>
                              <p className="mt-1 font-medium text-slate-900">
                                {selectedProposalClient.status || "—"}
                              </p>
                            </div>
                            <div className="border-b border-slate-100 pb-3">
                              <p className="text-xs text-slate-500">Correo</p>
                              <p className="mt-1 break-words font-medium text-slate-900">
                                {selectedProposalClient.email || "—"}
                              </p>
                            </div>
                            <div className="border-b border-slate-100 pb-3">
                              <p className="text-xs text-slate-500">Teléfono</p>
                              <p className="mt-1 font-medium text-slate-900">
                                {selectedProposalClient.phone ||
                                  selectedProposalClient.whatsapp ||
                                  "—"}
                              </p>
                            </div>
                            <div className="border-b border-slate-100 pb-3">
                              <p className="text-xs text-slate-500">Ciudad</p>
                              <p className="mt-1 font-medium text-slate-900">
                                {selectedProposalClient.city || "—"}
                              </p>
                            </div>
                            <div className="border-b border-slate-100 pb-3">
                              <p className="text-xs text-slate-500">Sitio web</p>
                              <p className="mt-1 break-words font-medium text-slate-900">
                                {selectedProposalClient.website || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                          Selecciona un cliente para ver sus datos de contacto antes de preparar la
                          propuesta.
                        </div>
                      )}

                      {selectedProposalProduct ? (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                                Producto seleccionado
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {selectedProposalProduct.name}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {selectedProposalProduct.category || "Sin categoría"}
                              </p>
                            </div>
                            <Button
                              data-demo="proposal-use-product-data"
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-2 rounded-full border-blue-200 bg-white text-blue-700 shadow-none hover:bg-blue-50"
                              onClick={() => {
                                const product = selectedProposalProduct;
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
                              Usar datos
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </aside>
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
                          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <EditableListField
                        label="Entregables incluidos"
                        value={form.deliverablesText}
                        onChange={(value) => setForm((p) => ({ ...p, deliverablesText: value }))}
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
                        onChange={(e) => setForm((p) => ({ ...p, processText: e.target.value }))}
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
                      <Label className={crmFormStyles.label}>Fuera de alcance / no incluido</Label>
                      <Textarea
                        className={crmFormStyles.textarea}
                        value={form.outOfScopeText}
                        onChange={(e) => setForm((p) => ({ ...p, outOfScopeText: e.target.value }))}
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
      </ProposalEditorDialog>
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
