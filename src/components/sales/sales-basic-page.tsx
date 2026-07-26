import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  FileText,
  FolderOpen,
  Hash,
  Loader2,
  Package,
  Plus,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/crm/page-header";
import { LoadingTable } from "@/components/crm/loading-state";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import {
  formatTaxOptionLabel,
  normalizeTaxRate,
  useCompanyTaxes,
} from "@/hooks/use-company-taxes";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import {
  CURRENCY_OPTIONS,
  convertCurrencyAmount,
  convertToBaseCurrency,
  formatCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyInput,
  type CompanyCurrencySettings,
  type CurrencyCode,
} from "@/lib/currency";
import { supabase as db } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DISPLAY_LABELS: Record<string, string> = {
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  Completed: "Completado",
  Cancelled: "Cancelado",
  "To Do": "Por hacer",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  Draft: "Borrador",
  Sent: "Enviado",
  Accepted: "Aceptado",
  Declined: "Rechazado",
  Expired: "Expirado",
  Converted: "Convertido",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Issued: "Emitida",
  Applied: "Aplicada",
  Active: "Activo",
  Signed: "Firmado",
  "Not Signed": "Sin firmar",
  "Pending Signature": "Pendiente de firma",
  Linked: "Vinculada",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

const NONE = "none";

type Option = { label: string; value: string; displayLabel?: string };
type FieldType = "text" | "number" | "date" | "textarea" | "select" | "tax-select";

type SalesField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  placeholder?: string;
  span?: 1 | 2;
};

type SalesConfig = {
  routeTitle: string;
  subtitle: string;
  table: string;
  module: string;
  createPermission?: string;
  numberKey?: string;
  titleKey: string;
  amountKey: string;
  dateKey: string;
  statusKey: string;
  defaultValues: Record<string, string>;
  fields: SalesField[];
  statuses: string[];
  primaryLabel: string;
  primaryActionLabel?: string;
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type ProjectRow = { id: string; name: string };
type InvoiceRow = {
  id: string;
  number: string;
  total: number | null;
  currency?: string | null;
  invoice_data?: Record<string, unknown> | null;
};
type ProductRow = {
  id: string;
  name: string;
  base_price: number | null;
  currency?: string | null;
  default_tax_id?: string | null;
  default_tax_name?: string | null;
  default_tax_rate?: number | string | null;
};

type GenericRow = Record<string, any>;
type SalesBasicPageProps = {
  config: SalesConfig;
  initialFieldValues?: Record<string, string>;
  autoOpenCreate?: boolean;
  onCreated?: (row: GenericRow | null) => void | Promise<void>;
  onCreateAction?: () => void;
  createDialog?: ReactNode;
  refreshSignal?: number | string;
  enableDelete?: boolean;
  beforeDelete?: (row: GenericRow) => Promise<void> | void;
  enrichRows?: (rows: GenericRow[]) => Promise<GenericRow[]>;
  displayAmountKey?: string;
  displayStatusKey?: string;
  summaryLabel?: string;
  canDeleteRow?: (row: GenericRow) => boolean;
  onOpenRow?: (row: GenericRow) => void;
};

function formatMoney(value: number | string | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, normalizeCurrency(currency || "USD"));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

const CURRENCY_AWARE_TABLES = new Set([
  "estimates",
  "payments",
  "credit_notes",
  "expenses",
  "subscriptions",
]);
const MONEY_KEYS = new Set(["amount", "subtotal", "tax", "total", "discount"]);

function getInvoiceCurrency(invoice: InvoiceRow | null | undefined) {
  const invoiceData =
    invoice?.invoice_data && typeof invoice.invoice_data === "object" ? invoice.invoice_data : {};
  return normalizeCurrency(invoice?.currency || String(invoiceData.currency || ""));
}

function normalizePayload(
  form: Record<string, string>,
  settings: {
    baseCurrency: CurrencyCode;
    usdToDopRate: number;
    rateSource: string;
    rateUpdatedAt: string | null;
  },
  currencyAware: boolean,
  taxById?: Map<string, { id: string; name: string; rate: number | string }>,
) {
  const payload: Record<string, any> = {};
  const currency = normalizeCurrency(form.currency || settings.baseCurrency);
  const baseCurrency = normalizeCurrency(settings.baseCurrency);
  Object.entries(form).forEach(([key, value]) => {
    if (value === NONE) payload[key] = null;
    else if (MONEY_KEYS.has(key)) payload[key] = value ? Number(value) : 0;
    else payload[key] = value || null;
  });

  if (currencyAware) {
    payload.currency = currency;
    payload.base_currency = baseCurrency;
    payload.exchange_rate = currency === baseCurrency ? 1 : settings.usdToDopRate;
    payload.exchange_rate_source = settings.rateSource;
    payload.exchange_rate_updated_at = settings.rateUpdatedAt;

    Object.entries(form).forEach(([key, value]) => {
      if (!MONEY_KEYS.has(key)) return;
      const amount = value ? Number(value) : 0;
      const baseAmount = convertCurrencyAmount(
        amount,
        currency,
        baseCurrency,
        settings.usdToDopRate,
      );
      if (key === "amount") payload.amount_base = baseAmount;
      else payload[`${key}_base`] = baseAmount;
    });

    const selectedTax = form.tax_id && form.tax_id !== NONE ? taxById?.get(form.tax_id) : null;
    if (selectedTax) {
      const taxRate = normalizeTaxRate(selectedTax.rate);
      const taxableBase = Number(payload.subtotal ?? payload.amount ?? 0) || 0;
      const taxAmount = taxableBase * (taxRate / 100);
      payload.tax_id = selectedTax.id;
      payload.tax_name = selectedTax.name;
      payload.tax_rate = taxRate;
      payload.tax_amount = taxAmount;
      payload.tax = taxAmount;
      if ("total" in payload) {
        const discount = Number(payload.discount || 0) || 0;
        payload.total = Math.max(0, taxableBase + taxAmount - discount);
      }
      payload.tax_base = convertCurrencyAmount(taxAmount, currency, baseCurrency, settings.usdToDopRate);
      if ("total" in payload) {
        payload.total_base = convertCurrencyAmount(
          payload.total,
          currency,
          baseCurrency,
          settings.usdToDopRate,
        );
      }
    } else if ("tax_id" in payload) {
      payload.tax_id = null;
      payload.tax_name = null;
      payload.tax_rate = 0;
      payload.tax_amount = 0;
      payload.tax = 0;
      payload.tax_base = 0;
    }
  }

  return payload;
}

function currencyAwareFields(config: SalesConfig): SalesField[] {
  if (!CURRENCY_AWARE_TABLES.has(config.table)) return config.fields;
  if (config.fields.some((field) => field.key === "currency")) return config.fields;
  const firstMoneyIndex = config.fields.findIndex((field) => MONEY_KEYS.has(field.key));
  const currencyField: SalesField = { key: "currency", label: "Moneda", type: "select" };
  if (firstMoneyIndex < 0) return [...config.fields, currencyField];
  return [
    ...config.fields.slice(0, firstMoneyIndex),
    currencyField,
    ...config.fields.slice(firstMoneyIndex),
  ];
}

function normalizeFormValue(key: string, value: string, currency: string) {
  if (MONEY_KEYS.has(key)) return normalizeCurrencyInput(value, currency);
  return value;
}

function readRowCurrency(
  row: GenericRow,
  fallback: CurrencyCode,
  productById?: Map<string, ProductRow>,
) {
  const productCurrency = row.product_id ? productById?.get(row.product_id)?.currency : null;
  return normalizeCurrency(row.currency || row.base_currency || productCurrency || fallback);
}

function readBaseMoney(
  row: GenericRow,
  amountKey: string,
  settings: CompanyCurrencySettings,
  sourceCurrency: string | null | undefined,
) {
  const storedBaseAmount = Number(row[`${amountKey}_base`]);
  const storedBaseCurrency = row.base_currency ? normalizeCurrency(row.base_currency) : null;

  if (Number.isFinite(storedBaseAmount) && row[`${amountKey}_base`] != null) {
    return storedBaseCurrency && storedBaseCurrency !== settings.baseCurrency
      ? convertCurrencyAmount(
          storedBaseAmount,
          storedBaseCurrency,
          settings.baseCurrency,
          settings.usdToDopRate,
        )
      : storedBaseAmount;
  }

  return convertToBaseCurrency(row[amountKey], sourceCurrency || settings.baseCurrency, {
    baseCurrency: settings.baseCurrency,
    usdToDopRate: Number(row.exchange_rate || settings.usdToDopRate),
    rateSource: settings.rateSource,
    rateUpdatedAt: settings.rateUpdatedAt,
  });
}

function getMoneyDisplay(
  row: GenericRow,
  amountKey: string,
  settings: CompanyCurrencySettings,
  productById?: Map<string, ProductRow>,
  currencyAware = false,
) {
  const sourceCurrency = readRowCurrency(row, settings.baseCurrency, productById);
  const originalLabel = formatMoney(row[amountKey], sourceCurrency);
  if (!currencyAware) return { originalLabel, baseLabel: null };

  const baseAmount = readBaseMoney(row, amountKey, settings, sourceCurrency);
  const hasStoredBase = row[`${amountKey}_base`] != null;
  const shouldShowBase = sourceCurrency !== settings.baseCurrency || hasStoredBase;

  return {
    originalLabel,
    baseLabel: shouldShowBase ? formatMoney(baseAmount, settings.baseCurrency) : null,
  };
}

export function SalesBasicPage({
  config,
  initialFieldValues,
  autoOpenCreate = false,
  onCreated,
  onCreateAction,
  createDialog,
  refreshSignal,
  enableDelete = false,
  beforeDelete,
  enrichRows,
  displayAmountKey,
  displayStatusKey,
  summaryLabel,
  canDeleteRow,
  onOpenRow,
}: SalesBasicPageProps) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { taxes: salesTaxes, taxById: salesTaxById, defaultTax } = useCompanyTaxes("sales");
  const canDelete = enableDelete && can(`${config.module}.delete` as any);
  const currencyAware = CURRENCY_AWARE_TABLES.has(config.table);
  const fields = useMemo(() => currencyAwareFields(config), [config]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<GenericRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [enrichedRows, setEnrichedRows] = useState<GenericRow[]>([]);
  const [enrichingRows, setEnrichingRows] = useState(false);
  const autoOpenKeyRef = useRef<string | null>(null);
  const defaultValuesKey = JSON.stringify(config.defaultValues);
  const initialFieldValuesKey = JSON.stringify(initialFieldValues || {});
  const initialForm = useMemo(
    () => ({
	      ...config.defaultValues,
	      ...(currencyAware ? { currency: currencySettings.baseCurrency } : {}),
	      ...(currencyAware && config.fields.some((field) => field.type === "tax-select")
	        ? { tax_id: defaultTax?.id || NONE }
	        : {}),
	      ...(initialFieldValues || {}),
	    }),
	    [
	      currencyAware,
	      currencySettings.baseCurrency,
	      defaultTax?.id,
	      defaultValuesKey,
	      initialFieldValuesKey,
	      config.fields,
	    ],
	  );
  const [form, setForm] = useState<Record<string, string>>(initialForm);

  const { data, loading, error, fetch, create, remove } = useCrud<GenericRow>({
    table: config.table,
    orderBy: "updated_at",
    ascending: false,
    limit: 500,
  });
  const { data: clients } = useCrud<ClientRow>({
    table: "clients",
    select: "id,company_name,contact_person",
    orderBy: "company_name",
    ascending: true,
    limit: 1000,
  });
  const { data: projects } = useCrud<ProjectRow>({
    table: "projects",
    select: "id,name",
    orderBy: "updated_at",
    ascending: false,
    limit: 1000,
  });
  const { data: invoices } = useCrud<InvoiceRow>({
    table: "invoices",
    select: "id,number,total,currency,invoice_data",
    orderBy: "updated_at",
    ascending: false,
    limit: 1000,
  });
	  const { data: products } = useCrud<ProductRow>({
	    table: "products",
	    select: "id,name,base_price,currency,default_tax_id,default_tax_name,default_tax_rate",
	    orderBy: "name",
	    ascending: true,
	    limit: 1000,
	  });

  useEffect(() => {
    if (!enrichRows) {
      setEnrichedRows(data);
      setEnrichingRows(false);
      return;
    }

    let active = true;
    setEnrichingRows(true);

    void enrichRows(data)
      .then((rows) => {
        if (active) setEnrichedRows(rows);
      })
      .catch((error) => {
        console.error("No se pudieron enriquecer los registros:", error);
        if (active) setEnrichedRows(data);
      })
      .finally(() => {
        if (active) setEnrichingRows(false);
      });

    return () => {
      active = false;
    };
  }, [data, enrichRows]);

  const displayData = enrichRows ? enrichedRows : data;
  const effectiveAmountKey = displayAmountKey || config.amountKey;
  const effectiveStatusKey = displayStatusKey || config.statusKey;

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const projectById = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const invoiceById = useMemo(() => new Map(invoices.map((item) => [item.id, item])), [invoices]);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

  const fieldOptions = (field: SalesField): Option[] => {
    if (field.options) return field.options;
	    if (field.key === "currency")
	      return CURRENCY_OPTIONS.map((option) => ({
	        label: `${option.symbol} · ${option.label}`,
	        value: option.value,
	      }));
	    if (field.type === "tax-select")
	      return salesTaxes.map((tax) => ({
	        label: formatTaxOptionLabel(tax),
	        value: tax.id,
	      }));
    if (field.key === "client_id")
      return clients.map((item) => ({ label: item.company_name, value: item.id }));
    if (field.key === "project_id")
      return projects.map((item) => ({ label: item.name, value: item.id }));
    if (field.key === "invoice_id")
      return invoices.map((item) => ({
        label: `${item.number} · ${formatMoney(item.total, getInvoiceCurrency(item))}`,
        value: item.id,
      }));
    if (field.key === "product_id")
      return products.map((item) => ({ label: item.name, value: item.id }));
    return [];
  };

  const kpis = useMemo(
    () => ({
      total: displayData.length,
      totalAmount: displayData.reduce((sum, row) => {
        const sourceCurrency = readRowCurrency(row, currencySettings.baseCurrency, productById);
        return (
          sum +
          (currencyAware
            ? readBaseMoney(row, effectiveAmountKey, currencySettings, sourceCurrency)
            : Number(row[effectiveAmountKey] || 0))
        );
      }, 0),
      active: displayData.filter((row) =>
        ["Active", "Completed", "Paid", "Accepted", "Issued", "Approved"].includes(
          row[effectiveStatusKey],
        ),
      ).length,
      pending: displayData.filter((row) =>
        ["Draft", "Pending", "Sent", "Trial"].includes(row[effectiveStatusKey]),
      ).length,
      refunded: displayData.filter((row) =>
        ["Refunded", "Partially Refunded"].includes(row[effectiveStatusKey]),
      ).length,
    }),
    [
      currencyAware,
      currencySettings,
      displayData,
      effectiveAmountKey,
      effectiveStatusKey,
      productById,
    ],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayData.filter((row) => {
      const client = row.client_id ? clientById.get(row.client_id) : null;
      const project = row.project_id ? projectById.get(row.project_id) : null;
      const invoice = row.invoice_id ? invoiceById.get(row.invoice_id) : null;
      const product = row.product_id ? productById.get(row.product_id) : null;
      const haystack =
        `${row[config.numberKey || ""] || ""} ${row[config.titleKey] || ""} ${row.notes || ""} ${row.reason || ""} ${row.vendor || ""} ${row.category || ""} ${client?.company_name || ""} ${project?.name || ""} ${invoice?.number || ""} ${product?.name || ""}`.toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (statusFilter === "all" || row[effectiveStatusKey] === statusFilter)
      );
    });
  }, [
    clientById,
    config.numberKey,
    config.titleKey,
    displayData,
    effectiveStatusKey,
    invoiceById,
    productById,
    projectById,
    search,
    statusFilter,
  ]);

  const createPermission =
    config.createPermission ||
    `${config.module}.create`;

  const openCreate = () => {
    if (onCreateAction) {
      onCreateAction();
      return;
    }
    setForm(initialForm);
    setDialogOpen(true);
  };

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    if (!autoOpenCreate) {
      autoOpenKeyRef.current = null;
      return;
    }
    if (!can(createPermission as any)) return;
    if (autoOpenKeyRef.current === initialFieldValuesKey) return;

    autoOpenKeyRef.current = initialFieldValuesKey;
    if (onCreateAction) {
      onCreateAction();
      return;
    }
    setForm(initialForm);
    setDialogOpen(true);
  }, [autoOpenCreate, can, config.module, initialFieldValuesKey, initialForm, onCreateAction]);

  useEffect(() => {
    if (refreshSignal === undefined) return;
    void fetch();
  }, [fetch, refreshSignal]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No hay contexto de compañía.");
    const requiredMissing = fields.find((field) => field.required && !form[field.key]?.trim());
    if (requiredMissing) return toast.error(`${requiredMissing.label} es obligatorio.`);
    setSaving(true);
    try {
      const normalizedPayload = normalizePayload(
        form,
        currencySettings,
        currencyAware,
        salesTaxById,
      );

      let created: GenericRow;

      if (config.module === "credit_notes") {
        const { data: result, error: rpcError } =
          await db.rpc("save_credit_note", {
            p_credit_note_id: null,
            p_invoice_id:
              normalizedPayload.invoice_id || null,
            p_client_id:
              normalizedPayload.client_id || null,
            p_amount:
              Number(normalizedPayload.amount || 0),
            p_date_issued:
              normalizedPayload.date_issued ||
              new Date().toISOString().slice(0, 10),
            p_reason:
              normalizedPayload.reason || null,
            p_notes:
              normalizedPayload.notes || null,
          });

        if (rpcError) throw rpcError;

        const saved = Array.isArray(result)
          ? result[0]
          : result;

        if (!saved?.credit_note_id) {
          throw new Error(
            "No se pudo confirmar la nota de crédito.",
          );
        }

        created = {
          ...normalizedPayload,
          id: saved.credit_note_id,
          credit_note_number:
            saved.credit_note_number,
          status: saved.status,
        };
      } else {
        created = await create(normalizedPayload);
      }

      toast.success(`${config.primaryLabel} creado correctamente.`);
      setDialogOpen(false);
      await fetch();
      await onCreated?.(created);
    } catch (e: any) {
      toast.error(e.message || `No se pudo crear ${config.primaryLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow?.id) return;
    setDeleting(true);
    try {
      await beforeDelete?.(deleteRow);
      await remove(String(deleteRow.id));
      toast.success(`${config.primaryLabel} eliminado correctamente.`);
      setDeleteRow(null);
      await fetch();
    } catch (e: any) {
      toast.error(e?.message || `No se pudo eliminar ${config.primaryLabel.toLowerCase()}.`);
    } finally {
      setDeleting(false);
    }
  };

  const mobileKpiLabel =
    summaryLabel ||
    (config.module === "payments"
      ? "Cobrado"
      : config.module === "credit_notes"
        ? "Crédito"
        : config.module === "expenses"
          ? "Gastos"
          : config.module === "subscriptions"
            ? "Recurrente"
            : config.module === "estimates"
              ? "Cotizado"
              : "Monto total");
  const mobileKpiTone =
    config.module === "expenses" || config.module === "credit_notes" ? "orange" : "green";

  const openRecordDetail = (row: GenericRow) => {
    if (!row.id) return;

    if (onOpenRow) {
      onOpenRow(row);
      return;
    }

    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("corevix:open-global-detail", {
        detail: {
          group: config.table,
          id: String(row.id),
          href: `/${config.table.replace(/_/g, "-")}`,
        },
      }),
    );
  };

  if (loading || enrichingRows) return <LoadingTable />;

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <div className="hidden sm:block">
        <PageHeader title={config.routeTitle} subtitle={config.subtitle} />
      </div>
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <GlobalKpiStrip
        title={config.routeTitle}
        subtitle={config.subtitle}
        actionLabel={
          can(createPermission as any)
            ? (config.primaryActionLabel ?? `Nuevo ${config.primaryLabel}`)
            : undefined
        }
        onAction={can(createPermission as any) ? openCreate : undefined}
        items={[
          {
            key: "summary",
            label: mobileKpiLabel,
            value: formatMoney(kpis.totalAmount, currencySettings.baseCurrency),
            helper: `${filtered.length} visibles de ${kpis.total} registros`,
            icon: WalletCards,
            tone: mobileKpiTone,
            meta:
              config.module === "payments"
                ? [
                    { label: "Registros", value: kpis.total, tone: "blue" },
                    { label: "Completados", value: kpis.active, tone: "green" },
                    { label: "Con reembolsos", value: kpis.refunded, tone: "orange" },
                    { label: "Pendientes", value: kpis.pending, tone: "orange" },
                  ]
                : [
                    { label: "Registros", value: kpis.total, tone: "blue" },
                    { label: "Activos", value: kpis.active, tone: "green" },
                    { label: "Pendientes", value: kpis.pending, tone: "orange" },
                  ],
          },
        ]}
      >
        <div className="mt-2 w-full">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {config.statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {displayLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div
        className={
          config.module === "payments"
            ? "hidden gap-3 sm:grid sm:grid-cols-5"
            : "hidden gap-3 sm:grid sm:grid-cols-4"
        }
      >
        <Kpi label="Registros" value={String(kpis.total)} tone="neutral" />
        <Kpi
          label={summaryLabel || "Monto total"}
          value={formatMoney(kpis.totalAmount, currencySettings.baseCurrency)}
          tone={
            config.module === "expenses" || config.module === "credit_notes"
              ? riskTone(kpis.totalAmount, 1000, 5000)
              : "success"
          }
        />
        <Kpi
          label={config.module === "payments" ? "Pagos completados" : "Activos/cerrados"}
          value={String(kpis.active)}
          tone="success"
        />
        {config.module === "payments" ? (
          <Kpi
            label="Con reembolsos"
            value={String(kpis.refunded)}
            tone={riskTone(kpis.refunded, 1, 6)}
          />
        ) : null}
        <Kpi
          label="Pendientes"
          value={String(kpis.pending)}
          tone={riskTone(kpis.pending, 1, 6)}
        />
      </div>

      <section className="border-y border-slate-100 bg-white max-sm:border-0 max-sm:bg-transparent">
        <div className="border-b border-slate-100 px-4 py-3 max-md:hidden sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              {can(createPermission as any) && (
                <Button
                  className="hidden h-9 rounded-md bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700 sm:inline-flex"
                  onClick={openCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {config.primaryActionLabel ?? `Nuevo ${config.primaryLabel}`}
                </Button>
              )}
            </div>
            <div className="hidden gap-2 sm:grid sm:grid-cols-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {config.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {displayLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="grid gap-2.5 md:hidden">
          {filtered.length ? (
            filtered.map((row) => (
              <SalesMobileCard
                key={row.id}
                row={row}
                config={config}
                currencySettings={currencySettings}
                currencyAware={currencyAware}
                clientById={clientById}
                projectById={projectById}
                invoiceById={invoiceById}
                productById={productById}
                canDelete={
                  canDelete && (!canDeleteRow || canDeleteRow(row))
                }
                displayAmountKey={effectiveAmountKey}
                displayStatusKey={effectiveStatusKey}
                onOpen={() => openRecordDetail(row)}
                onDelete={() => setDeleteRow(row)}
              />
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">
              No se encontraron registros.
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Relacionado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  {canDelete ? <TableHead className="w-[72px] text-right">Acción</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((row) => {
                    const money = getMoneyDisplay(
                      row,
                      effectiveAmountKey,
                      currencySettings,
                      productById,
                      currencyAware,
                    );

                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => openRecordDetail(row)}
                      >
                        <TableCell className="font-normal text-slate-500">
                          {row[config.numberKey || ""] || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="font-normal text-slate-900">
                            {row[config.titleKey] || "—"}
                          </div>
                          <div className="line-clamp-1 text-xs text-slate-500">
                            {row.notes || row.reason || row.vendor || "Sin notas"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.client_id ? clientById.get(row.client_id)?.company_name || "—" : "—"}
                        </TableCell>
                        <TableCell>
                          {row.project_id
                            ? projectById.get(row.project_id)?.name
                            : row.invoice_id
                              ? invoiceById.get(row.invoice_id)?.number
                              : row.product_id
                                ? productById.get(row.product_id)?.name
                                : "—"}
                        </TableCell>
                        <TableCell>{formatDate(row[config.dateKey])}</TableCell>
                        <TableCell className="font-normal">
                          <div>{money.originalLabel}</div>
                          {money.baseLabel ? (
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              Base: {money.baseLabel}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row[effectiveStatusKey] || "—"} />
                        </TableCell>
                        {canDelete ? (
                          <TableCell className="text-right">
                            {!canDeleteRow || canDeleteRow(row) ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent shadow-none hover:bg-transparent"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteRow(row);
                              }}
                              aria-label={`Eliminar ${config.primaryLabel.toLowerCase()}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canDelete ? 8 : 7}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      No se encontraron registros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {onCreateAction ? (
        createDialog
      ) : (
        <CrmCreationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={config.primaryActionLabel ?? `Nuevo ${config.primaryLabel}`}
          description="Completa los datos del registro. Los campos preseleccionados se pueden editar antes de guardar."
          size="md"
        >
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={form[field.key] || ""}
                  options={fieldOptions(field)}
                  currency={form.currency || currencySettings.baseCurrency}
                  onChange={(value) => {
                    setForm((current) => {
                      const patch: Record<string, string> = {
                        [field.key]: normalizeFormValue(field.key, value, current.currency),
                      };
                      if (field.key === "currency") {
                        const nextCurrency = normalizeCurrency(value);
                        const currentCurrency = normalizeCurrency(
                          current.currency || currencySettings.baseCurrency,
                        );
                        patch.currency = nextCurrency;
                        MONEY_KEYS.forEach((moneyKey) => {
                          if (current[moneyKey] === undefined) return;
                          patch[moneyKey] = normalizeCurrencyInput(
                            String(
                              convertCurrencyAmount(
                                current[moneyKey],
                                currentCurrency,
                                nextCurrency,
                                currencySettings.usdToDopRate,
                              ),
                            ),
                            nextCurrency,
                          );
                        });
                      }
	                      if (field.key === "invoice_id") {
	                        const invoice = invoiceById.get(value);
	                        if (invoice) patch.currency = getInvoiceCurrency(invoice);
	                      }
	                      if (field.key === "product_id") {
	                        const product = productById.get(value);
	                        if (product?.default_tax_id) {
	                          patch.tax_id = product.default_tax_id;
	                        } else if (product?.default_tax_name || product?.default_tax_rate) {
	                          patch.tax_id = NONE;
	                          patch.tax_name = product.default_tax_name || "";
	                          patch.tax_rate = String(normalizeTaxRate(product.default_tax_rate));
	                        } else if (defaultTax?.id) {
	                          patch.tax_id = defaultTax.id;
	                        }
	                      }
	                      return { ...current, ...patch };
                    });
                  }}
                />
              ))}
            </div>
            <div className={crmFormStyles.footer}>
              <Button
                type="button"
                variant="ghost"
                className={crmFormStyles.cancelButton}
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className={crmFormStyles.primaryButton} disabled={saving}>
                {saving ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </form>
        </CrmCreationDialog>
      )}
      {canDelete ? (
        <AlertDialog open={Boolean(deleteRow)} onOpenChange={(open) => !open && setDeleteRow(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {config.primaryLabel.toLowerCase()}</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el registro y sus archivos asociados cuando existan. No se
                puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

type KpiTone = "neutral" | "success" | "warning" | "danger";

function riskTone(value: number, warningAt: number, dangerAt: number): KpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: KpiTone }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-500"
        : tone === "danger"
          ? "text-rose-600"
          : "text-slate-950";

  return (
    <div className="border-b border-slate-100 bg-white pb-4">
      <div className="text-xs font-normal uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-normal ${valueClass}`}>{value}</div>
    </div>
  );
}

function SalesMobileCard({
  row,
  config,
  currencySettings,
  currencyAware,
  clientById,
  projectById,
  invoiceById,
  productById,
  canDelete,
  displayAmountKey,
  displayStatusKey,
  onOpen,
  onDelete,
}: {
  row: GenericRow;
  config: SalesConfig;
  currencySettings: CompanyCurrencySettings;
  currencyAware: boolean;
  clientById: Map<string, ClientRow>;
  projectById: Map<string, ProjectRow>;
  invoiceById: Map<string, InvoiceRow>;
  productById: Map<string, ProductRow>;
  canDelete: boolean;
  displayAmountKey: string;
  displayStatusKey: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const title = row[config.titleKey] || "Sin nombre";
  const numberValue = config.numberKey ? row[config.numberKey] : null;
  const clientLabel = row.client_id
    ? clientById.get(row.client_id)?.company_name || "Sin cliente"
    : "Sin cliente";
  const related =
    row.project_id && projectById.get(row.project_id)
      ? { icon: FolderOpen, label: projectById.get(row.project_id)?.name || "Proyecto" }
      : row.invoice_id && invoiceById.get(row.invoice_id)
        ? { icon: FileText, label: invoiceById.get(row.invoice_id)?.number || "Factura" }
        : row.product_id && productById.get(row.product_id)
          ? { icon: Package, label: productById.get(row.product_id)?.name || "Producto" }
          : null;
  const detail = row.notes || row.reason || row.vendor || row.category || "Sin notas";
  const money = getMoneyDisplay(
    row,
    displayAmountKey,
    currencySettings,
    productById,
    currencyAware,
  );

  return (
    <article
      className="cursor-pointer rounded-[18px] border border-slate-200 bg-white p-3.5 text-left transition-colors active:scale-[0.992]"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-blue-100 bg-blue-50 text-blue-700">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 pt-0.5">
          <div className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-slate-950">
            {title}
          </div>
          <div className="mt-0.5 line-clamp-1 text-[12.5px] font-medium leading-4 text-slate-500">
            {detail}
          </div>
        </div>

        <StatusBadge
          status={row[displayStatusKey] || "—"}
          className="min-h-6 max-w-[92px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 pl-[50px] max-[360px]:grid-cols-1 max-[360px]:pl-0">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
            Monto
          </div>
          <div className="mt-1 truncate text-[13px] font-extrabold text-slate-900">
            {money.originalLabel}
          </div>
          {money.baseLabel ? (
            <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
              Base: {money.baseLabel}
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
            Fecha
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{formatDate(row[config.dateKey])}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2 text-[12.5px] font-semibold text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">{clientLabel}</span>
        </div>
        {related ? (
          <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2 text-[12.5px] font-semibold text-slate-600">
            <related.icon className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{related.label}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-slate-400">
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{numberValue || "Sin número"}</span>
          </div>
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              aria-label={`Eliminar ${config.primaryLabel.toLowerCase()}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Field({
  field,
  value,
  options,
  currency,
  onChange,
}: {
  field: SalesField;
  value: string;
  options: Option[];
  currency: string;
  onChange: (value: string) => void;
}) {
  const cls =
    field.span === 2 || field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5";
  if (field.type === "textarea")
    return (
      <div className={cls}>
        <Label className={crmFormStyles.label}>{field.label}</Label>
        <Textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={crmFormStyles.textarea}
        />
      </div>
    );
	  if (field.type === "select" || field.type === "tax-select")
	    return (
	      <div className={cls}>
	        <Label className={crmFormStyles.label}>{field.label}</Label>
	        <Select value={value || NONE} onValueChange={onChange}>
	          <SelectTrigger className={crmFormStyles.select}>
	            <SelectValue placeholder={field.type === "tax-select" ? "Sin impuesto" : undefined} />
	          </SelectTrigger>
	          <SelectContent>
	            <SelectItem value={NONE}>
	              {field.type === "tax-select" ? "Sin impuesto" : "Ninguno"}
	            </SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.displayLabel ?? displayLabel(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  return (
    <div className={cls}>
      <Label className={crmFormStyles.label}>{field.label}</Label>
      <Input
        type={field.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeFormValue(field.key, e.target.value, currency))}
        step={
          field.type === "number" && MONEY_KEYS.has(field.key)
            ? getCurrencyStep(currency)
            : undefined
        }
        inputMode={
          field.type === "number" && MONEY_KEYS.has(field.key)
            ? getCurrencyInputMode(currency)
            : undefined
        }
        placeholder={field.placeholder}
        required={field.required}
        className={crmFormStyles.input}
      />
    </div>
  );
}
