import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FileText, Pencil, Plus, X } from "lucide-react";
import {
  SalesDocumentBuilder,
  type SalesDocumentBuilderForm,
  type SalesDocumentLineItem,
  type SalesDocumentTotals,
} from "@/components/sales/sales-document-builder";
import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { normalizeTaxRate, useCompanyTaxes } from "@/hooks/use-company-taxes";
import { useCrud } from "@/hooks/use-crud";
import { supabase } from "@/integrations/supabase/client";
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
  normalizeCurrency,
  normalizeCurrencyAmount,
  normalizeCurrencyInput,
  type CurrencyCode,
} from "@/lib/currency";
import { toast } from "sonner";

export const Route = createFileRoute("/estimates")({
  component: EstimatesPage,
  head: () => ({ meta: [{ title: "Cotizaciones — Corevix CRM" }] }),
});

const STATUSES = ["Draft", "Sent", "Accepted", "Declined", "Expired", "Converted"];

const DISPLAY_LABELS: Record<string, string> = {
  Draft: "Borrador",
  Sent: "Enviada",
  Accepted: "Aceptada",
  Declined: "Rechazada",
  Expired: "Expirada",
  Converted: "Convertida",
};

type Client = {
  id: string;
  company_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
  currency?: string | null;
  default_tax_id?: string | null;
  default_tax_name?: string | null;
  default_tax_rate?: number | string | null;
};

type Estimate = {
  id: string;
  company_id: string;
  number: number | null;
  title: string;
  client_id?: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  status: string;
  date_issued: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  subtotal_base?: number | null;
  tax_base?: number | null;
  total_base?: number | null;
  tax_id?: string | null;
  tax_name?: string | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  reference?: string | null;
  tags?: string[] | null;
  discount_type?: string | null;
  discount_value?: number | null;
  adjustment?: number | null;
  quantity_mode?: string | null;
  client_note?: string | null;
  terms?: string | null;
  estimate_data?: Record<string, any> | null;
  public_token?: string | null;
  created_at: string;
  updated_at: string;
};

type EstimateItemRecord = {
  id: string;
  company_id: string;
  estimate_id: string;
  product_id?: string | null;
  item_name: string;
  description?: string | null;
  quantity: number | null;
  unit_type: string | null;
  rate: number | null;
  tax_rate: number | null;
  tax_id?: string | null;
  tax_name?: string | null;
  tax_amount?: number | null;
  is_optional: boolean;
  sort_order: number | null;
  amount: number | null;
  document_currency?: string | null;
  original_currency?: string | null;
  original_rate?: number | null;
  converted_rate?: number | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dateAfter(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function asNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function lineId() {
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyLine(currency: CurrencyCode): SalesDocumentLineItem {
  return {
    id: lineId(),
    productId: null,
    item: "",
    description: "",
    quantity: "1",
    rate: "",
    tax: "0",
    taxId: null,
    taxName: null,
    optional: false,
    documentCurrency: currency,
    originalCurrency: currency,
    originalRate: "",
    convertedRate: "",
    exchangeRate: 1,
  };
}

function createEmptyForm(currency: CurrencyCode): SalesDocumentBuilderForm {
  return {
    title: "",
    documentDate: today(),
    validUntil: dateAfter(7),
    clientId: null,
    productId: null,
    currency,
    status: "Draft",
    assignedTo: "",
    discountType: "none",
    discountValue: "",
    adjustmentValue: "",
    quantityMode: "qty",
    tags: "",
    allowComments: false,
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientState: "",
    recipientCountry: "",
    recipientZipCode: "",
    recipientEmail: "",
    recipientPhone: "",
    notes: "",
    terms: "",
  };
}

function normalizeLine(line: SalesDocumentLineItem, currency: CurrencyCode) {
  const quantity = Math.max(asNumber(line.quantity), 1);
  const rate = normalizeCurrencyAmount(line.rate, currency);
  const taxRate = normalizeTaxRate(line.tax);
  const subtotal = quantity * rate;
  const taxAmount = line.optional ? 0 : normalizeCurrencyAmount(subtotal * (taxRate / 100), currency);
  const amount = line.optional ? 0 : normalizeCurrencyAmount(subtotal + taxAmount, currency);

  return {
    quantity,
    rate,
    taxRate,
    taxAmount,
    amount,
  };
}

function calculateTotals(
  lines: SalesDocumentLineItem[],
  form: SalesDocumentBuilderForm,
): SalesDocumentTotals {
  const currency = normalizeCurrency(form.currency);
  const subtotal = lines.reduce((sum, line) => {
    if (line.optional) return sum;
    const normalized = normalizeLine(line, currency);
    return sum + normalized.quantity * normalized.rate;
  }, 0);
  const taxTotal = lines.reduce((sum, line) => sum + normalizeLine(line, currency).taxAmount, 0);
  const rawDiscount = asNumber(form.discountValue);
  const discount =
    form.discountType === "percent"
      ? subtotal * (Math.min(Math.max(rawDiscount, 0), 100) / 100)
      : form.discountType === "fixed"
        ? rawDiscount
        : 0;
  const adjustment = asNumber(form.adjustmentValue);
  const total = Math.max(0, subtotal + taxTotal - discount + adjustment);

  return {
    subtotal: normalizeCurrencyAmount(subtotal, currency),
    taxTotal: normalizeCurrencyAmount(taxTotal, currency),
    discount: normalizeCurrencyAmount(discount, currency),
    adjustment: normalizeCurrencyAmount(adjustment, currency),
    total: normalizeCurrencyAmount(total, currency),
  };
}

function useEstimateItems(estimateId: string | null) {
  return useCrud<EstimateItemRecord>({
    table: "estimate_items",
    filters: estimateId ? [{ column: "estimate_id", op: "eq", value: estimateId }] : [],
    orderBy: "sort_order",
    ascending: true,
    enabled: Boolean(estimateId),
    limit: 200,
  });
}

function EstimatesPage() {
  const { profile } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { taxes, taxById, defaultTax } = useCompanyTaxes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [previewEstimate, setPreviewEstimate] = useState<Estimate | null>(null);
  const [form, setForm] = useState<SalesDocumentBuilderForm>(() =>
    createEmptyForm(currencySettings.baseCurrency),
  );
  const [lineItems, setLineItems] = useState<SalesDocumentLineItem[]>(() => [
    emptyLine(currencySettings.baseCurrency),
  ]);

  const estimatesCrud = useCrud<Estimate>({
    table: "estimates",
    orderBy: "updated_at",
    ascending: false,
    limit: 250,
  });
  const clientsCrud = useCrud<Client>({
    table: "clients",
    select: "id,company_name,contact_person,email,phone,address,city,country",
    orderBy: "company_name",
    ascending: true,
    limit: 500,
  });
  const productsCrud = useCrud<Product>({
    table: "products",
    select:
      "id,name,description,base_price,currency,default_tax_id,default_tax_name,default_tax_rate",
    orderBy: "name",
    ascending: true,
    limit: 500,
  });
  const estimateItemsCrud = useEstimateItems(editingEstimate?.id || null);

  const clientById = useMemo(
    () => new Map(clientsCrud.data.map((client) => [client.id, client])),
    [clientsCrud.data],
  );
  const productById = useMemo(
    () => new Map(productsCrud.data.map((product) => [product.id, product])),
    [productsCrud.data],
  );

  const filteredEstimates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return estimatesCrud.data.filter((estimate) => {
      const matchesStatus = statusFilter === "all" || estimate.status === statusFilter;
      const clientName = estimate.client_id ? clientById.get(estimate.client_id)?.company_name || "" : "";
      const matchesSearch =
        !needle ||
        estimate.title.toLowerCase().includes(needle) ||
        String(estimate.number || "").includes(needle) ||
        clientName.toLowerCase().includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [clientById, estimatesCrud.data, search, statusFilter]);

  const totals = useMemo(() => calculateTotals(lineItems, form), [lineItems, form]);
  const currentAssigneeName = profile?.full_name || profile?.user_id || "Responsable";

  const baseTotal = useMemo(
    () =>
      filteredEstimates.reduce(
        (sum, estimate) =>
          sum +
          (estimate.total_base != null
            ? asNumber(estimate.total_base)
            : convertCurrencyAmount(
                estimate.total,
                estimate.currency || currencySettings.baseCurrency,
                currencySettings.baseCurrency,
                estimate.exchange_rate || currencySettings.usdToDopRate,
              )),
        0,
      ),
    [currencySettings.baseCurrency, currencySettings.usdToDopRate, filteredEstimates],
  );

  useEffect(() => {
    if (!editingEstimate || estimateItemsCrud.loading) return;
    const rows = estimateItemsCrud.data;
    if (rows.length === 0) {
      setLineItems([emptyLine(normalizeCurrency(editingEstimate.currency || currencySettings.baseCurrency))]);
      return;
    }
    setLineItems(
      rows.map((row) => ({
        id: row.id,
        productId: row.product_id || null,
        item: row.item_name || "",
        description: row.description || "",
        quantity: String(row.quantity || 1),
        rate: String(row.rate || 0),
        tax: String(row.tax_rate || 0),
        taxId: row.tax_id || null,
        taxName: row.tax_name || null,
        optional: row.is_optional,
        documentCurrency: row.document_currency || editingEstimate.currency || currencySettings.baseCurrency,
        originalCurrency: row.original_currency || editingEstimate.currency || currencySettings.baseCurrency,
        originalRate: row.original_rate != null ? String(row.original_rate) : String(row.rate || 0),
        convertedRate: row.converted_rate != null ? String(row.converted_rate) : String(row.rate || 0),
        exchangeRate: row.exchange_rate || editingEstimate.exchange_rate || 1,
        exchangeRateSource: row.exchange_rate_source || editingEstimate.exchange_rate_source || null,
        exchangeRateUpdatedAt:
          row.exchange_rate_updated_at || editingEstimate.exchange_rate_updated_at || null,
      })),
    );
  }, [
    currencySettings.baseCurrency,
    editingEstimate,
    estimateItemsCrud.data,
    estimateItemsCrud.loading,
  ]);

  const fillClient = (clientId: string | null) => {
    const client = clientId ? clientById.get(clientId) : null;
    setForm((current) => ({
      ...current,
      clientId,
      recipientName: client?.company_name || "",
      recipientAddress: client?.address || "",
      recipientCity: client?.city || "",
      recipientCountry: client?.country || "",
      recipientEmail: client?.email || "",
      recipientPhone: client?.phone || "",
    }));
  };

  const productToLine = (product: Product, documentCurrency: CurrencyCode): SalesDocumentLineItem => {
    const originalCurrency = normalizeCurrency(product.currency || documentCurrency);
    const originalRate = normalizeCurrencyAmount(product.base_price, originalCurrency);
    const convertedRate = convertCurrencyAmount(
      originalRate,
      originalCurrency,
      documentCurrency,
      currencySettings.usdToDopRate,
    );
    const productTax =
      product.default_tax_id && product.default_tax_name
        ? {
            id: product.default_tax_id,
            name: product.default_tax_name,
            rate: normalizeTaxRate(product.default_tax_rate),
          }
        : defaultTax
          ? {
              id: defaultTax.id,
              name: defaultTax.name,
              rate: normalizeTaxRate(defaultTax.rate),
            }
          : null;

    return {
      ...emptyLine(documentCurrency),
      productId: product.id,
      item: product.name,
      description: product.description || "",
      rate: String(convertedRate),
      tax: String(productTax?.rate || 0),
      taxId: productTax?.id || null,
      taxName: productTax?.name || null,
      documentCurrency,
      originalCurrency,
      originalRate: String(originalRate),
      convertedRate: String(convertedRate),
      exchangeRate:
        originalCurrency === documentCurrency ? 1 : currencySettings.usdToDopRate,
      exchangeRateSource: currencySettings.rateSource,
      exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
    };
  };

  const closeBuilder = () => {
    setBuilderOpen(false);
    setEditingEstimate(null);
    setLineItems([]);
    setForm(createEmptyForm(currencySettings.baseCurrency));
  };

  const openNewBuilder = () => {
    const baseCurrency = currencySettings.baseCurrency;
    setEditingEstimate(null);
    setForm(createEmptyForm(baseCurrency));
    setLineItems([emptyLine(baseCurrency)]);
    setBuilderOpen(true);
  };

  const openEditBuilder = (estimate: Estimate) => {
    const currency = normalizeCurrency(estimate.currency || currencySettings.baseCurrency);
    const data = estimate.estimate_data || {};
    const client = estimate.client_id ? clientById.get(estimate.client_id) : null;
    setEditingEstimate(estimate);
    setForm({
      ...createEmptyForm(currency),
      title: estimate.title || "",
      documentDate: estimate.date_issued || today(),
      validUntil: estimate.expiry_date || "",
      clientId: estimate.client_id || null,
      productId: data.productId || null,
      currency,
      status: estimate.status || "Draft",
      assignedTo: data.assignedTo || currentAssigneeName,
      discountType: estimate.discount_type || "none",
      discountValue: estimate.discount_value ? String(estimate.discount_value) : "",
      adjustmentValue: estimate.adjustment ? String(estimate.adjustment) : "",
      quantityMode: estimate.quantity_mode || "qty",
      tags: Array.isArray(estimate.tags) ? estimate.tags.join(", ") : "",
      allowComments: false,
      recipientName: data.recipientName || client?.company_name || "",
      recipientAddress: data.recipientAddress || client?.address || "",
      recipientCity: data.recipientCity || client?.city || "",
      recipientState: data.recipientState || "",
      recipientCountry: data.recipientCountry || client?.country || "",
      recipientZipCode: data.recipientZipCode || "",
      recipientEmail: data.recipientEmail || client?.email || "",
      recipientPhone: data.recipientPhone || client?.phone || "",
      notes: estimate.client_note || estimate.notes || "",
      terms: estimate.terms || "",
    });
    setLineItems([emptyLine(currency)]);
    setBuilderOpen(true);
  };

  const changeCurrency = (currencyValue: string) => {
    const nextCurrency = normalizeCurrency(currencyValue);
    const previousCurrency = normalizeCurrency(form.currency);
    setForm((current) => ({ ...current, currency: nextCurrency }));
    setLineItems((current) =>
      current.map((line) => {
        const originalCurrency = normalizeCurrency(line.originalCurrency || previousCurrency);
        const originalRate = normalizeCurrencyAmount(line.originalRate || line.rate, originalCurrency);
        const convertedRate = convertCurrencyAmount(
          originalRate,
          originalCurrency,
          nextCurrency,
          currencySettings.usdToDopRate,
        );
        return {
          ...line,
          rate: String(convertedRate),
          documentCurrency: nextCurrency,
          originalCurrency,
          originalRate: String(originalRate),
          convertedRate: String(convertedRate),
          exchangeRate: originalCurrency === nextCurrency ? 1 : currencySettings.usdToDopRate,
          exchangeRateSource: currencySettings.rateSource,
          exchangeRateUpdatedAt: currencySettings.rateUpdatedAt,
        };
      }),
    );
  };

  const addProductLine = (productId: string) => {
    const product = productById.get(productId);
    if (!product) return;
    setLineItems((current) => [
      ...current.filter((line) => line.item || line.description || asNumber(line.rate) > 0),
      productToLine(product, normalizeCurrency(form.currency)),
    ]);
  };

  const chooseBaseProduct = (productId: string | null) => {
    setForm((current) => ({ ...current, productId }));
    if (productId) addProductLine(productId);
  };

  const patchLine = (id: string, patch: Partial<SalesDocumentLineItem>) => {
    setLineItems((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const saveEstimate = async () => {
    if (!form.title.trim()) {
      toast.error("Agrega un título para la cotización.");
      return;
    }
    if (!profile?.company_id) {
      toast.error("No hay compañía activa.");
      return;
    }

    const currency = normalizeCurrency(form.currency);
    const cleanLines = lineItems
      .filter((line) => line.item.trim() || line.description.trim() || asNumber(line.rate) > 0)
      .map((line) => ({ ...line, rate: normalizeCurrencyInput(line.rate, currency) || "0" }));
    if (cleanLines.length === 0) {
      toast.error("Agrega al menos un producto o línea.");
      return;
    }

    const nextTotals = calculateTotals(cleanLines, form);
    const baseCurrency = currencySettings.baseCurrency;
    const exchangeRate = currency === baseCurrency ? 1 : currencySettings.usdToDopRate;
    const firstTaxedLine = cleanLines.find((line) => line.taxId || asNumber(line.tax) > 0);
    const payload: Partial<Estimate> = {
      title: form.title.trim(),
      client_id: form.clientId,
      subtotal: nextTotals.subtotal,
      tax: nextTotals.taxTotal,
      total: nextTotals.total,
      status: form.status,
      date_issued: form.documentDate,
      expiry_date: form.validUntil || null,
      notes: form.notes || null,
      currency,
      base_currency: baseCurrency,
      exchange_rate: exchangeRate,
      exchange_rate_source: currencySettings.rateSource,
      exchange_rate_updated_at: currencySettings.rateUpdatedAt,
      subtotal_base: convertCurrencyAmount(nextTotals.subtotal, currency, baseCurrency, exchangeRate),
      tax_base: convertCurrencyAmount(nextTotals.taxTotal, currency, baseCurrency, exchangeRate),
      total_base: convertCurrencyAmount(nextTotals.total, currency, baseCurrency, exchangeRate),
      tax_id: firstTaxedLine?.taxId || null,
      tax_name: firstTaxedLine?.taxName || null,
      tax_rate: firstTaxedLine ? asNumber(firstTaxedLine.tax) : 0,
      tax_amount: nextTotals.taxTotal,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      discount_type: form.discountType || "none",
      discount_value: asNumber(form.discountValue),
      adjustment: asNumber(form.adjustmentValue),
      quantity_mode: form.quantityMode || "qty",
      client_note: form.notes || null,
      terms: form.terms || null,
      estimate_data: {
        productId: form.productId,
        assignedTo: form.assignedTo,
        recipientName: form.recipientName,
        recipientAddress: form.recipientAddress,
        recipientCity: form.recipientCity,
        recipientState: form.recipientState,
        recipientCountry: form.recipientCountry,
        recipientZipCode: form.recipientZipCode,
        recipientEmail: form.recipientEmail,
        recipientPhone: form.recipientPhone,
        totals: nextTotals,
        currency,
      },
    };

    try {
      const saved = editingEstimate
        ? await estimatesCrud.update(editingEstimate.id, payload)
        : await estimatesCrud.create(payload);
      if (!saved) throw new Error("No se pudo guardar la cotización.");

      const db = supabase as any;
      if (editingEstimate) {
        const { error: deleteError } = await db
          .from("estimate_items")
          .delete()
          .eq("estimate_id", saved.id)
          .eq("company_id", profile.company_id);
        if (deleteError) throw deleteError;
      }

      const rows = cleanLines.map((line, index) => {
        const normalized = normalizeLine(line, currency);
        return {
          company_id: profile.company_id,
          estimate_id: saved.id,
          product_id: line.productId,
          item_name: line.item.trim() || "Ítem",
          description: line.description || null,
          quantity: normalized.quantity,
          unit_type: form.quantityMode || "qty",
          rate: normalized.rate,
          tax_rate: normalized.taxRate,
          tax_id: line.taxId || null,
          tax_name: line.taxName || null,
          tax_amount: normalized.taxAmount,
          is_optional: line.optional,
          sort_order: index,
          amount: normalized.amount,
          document_currency: currency,
          original_currency: normalizeCurrency(line.originalCurrency || currency),
          original_rate: normalizeCurrencyAmount(line.originalRate || line.rate, line.originalCurrency || currency),
          converted_rate: normalized.rate,
          exchange_rate: line.exchangeRate || exchangeRate,
          exchange_rate_source: line.exchangeRateSource || currencySettings.rateSource,
          exchange_rate_updated_at:
            line.exchangeRateUpdatedAt || currencySettings.rateUpdatedAt,
        };
      });

      const { error: insertError } = await db.from("estimate_items").insert(rows);
      if (insertError) throw insertError;

      toast.success(editingEstimate ? "Cotización actualizada." : "Cotización creada.");
      setBuilderOpen(false);
      setEditingEstimate(null);
      await estimatesCrud.fetch();
    } catch (error: any) {
      toast.error(error.message || "No se pudo guardar la cotización.");
    }
  };

  const getEstimatePublicUrl = (estimate: Estimate) => {
    const token = String(estimate.public_token || "").trim();
    if (!token) return null;

    return `${window.location.origin}/estimate/public/${token}`;
  };

  const openEstimatePreview = (estimate: Estimate) => {
    if (!estimate.public_token) {
      toast.error("Esta cotización todavía no tiene una vista previa disponible.");
      return;
    }

    setPreviewEstimate(estimate);
  };

  const openPublicEstimate = (estimate: Estimate) => {
    const url = getEstimatePublicUrl(estimate);
    if (!url) {
      toast.error("Esta cotización todavía no tiene un enlace público.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyPublicEstimateLink = async (estimate: Estimate) => {
    const url = getEstimatePublicUrl(estimate);
    if (!url) {
      toast.error("Esta cotización todavía no tiene un enlace público.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace de la cotización copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  const convertEstimate = async (estimate: Estimate) => {
    try {
      const { data: result, error } = await (supabase as any).rpc("convert_estimate_to_invoice", {
        p_estimate_id: estimate.id,
      });
      if (error) throw error;
      const first = Array.isArray(result) ? result[0] : result;
      toast.success(
        first?.created
          ? "Cotización convertida en factura."
          : "Ya existe una factura para esta cotización.",
      );
      await estimatesCrud.fetch();
    } catch (error: any) {
      toast.error(error.message || "No se pudo convertir la cotización.");
    }
  };

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <div className="space-y-5">
        <div className="hidden sm:block">
          <PageHeader
            title="Cotizaciones"
            subtitle="Crea cotizaciones con productos, impuestos y moneda documentada."
          />
        </div>

        <div className="grid gap-3 border-y border-slate-100 py-3 sm:grid-cols-4">
          <div className="border-b border-slate-100 pb-3 sm:border-b-0 sm:border-r sm:pb-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Cotizaciones</div>
            <div className="mt-2 text-2xl font-light text-slate-950">{filteredEstimates.length}</div>
          </div>
          <div className="border-b border-slate-100 pb-3 sm:border-b-0 sm:border-r sm:pb-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Activas</div>
            <div className="mt-2 text-2xl font-light text-emerald-600">
              {
                filteredEstimates.filter(
                  (estimate) => !["Declined", "Expired", "Converted"].includes(estimate.status),
                ).length
              }
            </div>
          </div>
          <div className="border-b border-slate-100 pb-3 sm:border-b-0 sm:border-r sm:pb-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Vencidas</div>
            <div className="mt-2 text-2xl font-light text-rose-600">
              {filteredEstimates.filter((estimate) => estimate.status === "Expired").length}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Valor cotizado
            </div>
            <div className="mt-2 text-2xl font-light text-blue-600">
              {formatCurrencyAmount(baseTotal, currencySettings.baseCurrency)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-y border-slate-100 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <Button
            className="h-9 rounded-md bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700"
            onClick={openNewBuilder}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva cotización
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              className="h-9 w-full rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 sm:w-[360px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, número o cliente..."
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0 sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {displayLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEstimates.map((estimate) => (
                <TableRow
                  key={estimate.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => openEstimatePreview(estimate)}
                >
                  <TableCell className="font-semibold text-slate-600">
                    EST-{estimate.number || "—"}
                  </TableCell>
                  <TableCell className="font-bold text-slate-950">{estimate.title}</TableCell>
                  <TableCell>{estimate.client_id ? clientById.get(estimate.client_id)?.company_name || "—" : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{displayLabel(estimate.status)}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrencyAmount(estimate.total || 0, estimate.currency || currencySettings.baseCurrency)}
                  </TableCell>
                  <TableCell>{estimate.expiry_date || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div
                        className="flex justify-end gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => openPublicEstimate(estimate)}
                        disabled={!estimate.public_token}
                        title="Ver cotización"
                        aria-label="Ver cotización"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => void copyPublicEstimateLink(estimate)}
                        disabled={!estimate.public_token}
                        title="Copiar enlace"
                        aria-label="Copiar enlace"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => openEditBuilder(estimate)}
                        title="Editar cotización"
                        aria-label="Editar cotización"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => void convertEstimate(estimate)}
                        title="Convertir en factura"
                        aria-label="Convertir en factura"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEstimates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                    No hay cotizaciones para mostrar.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={Boolean(previewEstimate)}
        onOpenChange={(open) => {
          if (!open) setPreviewEstimate(null);
        }}
      >
        <DialogContent className="flex h-[94dvh] w-[96vw] max-w-[1180px] flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-4 pr-8">
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl font-semibold text-slate-950">
                  {previewEstimate?.title || "Vista previa de cotización"}
                </DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  EST-{previewEstimate?.number || "—"} · {displayLabel(previewEstimate?.status || "Draft")}
                </p>
              </div>
              {previewEstimate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openPublicEstimate(previewEstimate)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir en otra pestaña
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 bg-slate-100">
            {previewEstimate?.public_token ? (
              <iframe
                title={`Vista previa de la cotización EST-${previewEstimate.number || "—"}`}
                src={`/estimate/public/${previewEstimate.public_token}`}
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
                Esta cotización todavía no tiene una vista previa disponible.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={builderOpen}
        onOpenChange={(open) => {
          if (open) {
            setBuilderOpen(true);
          } else {
            closeBuilder();
          }
        }}
      >
        <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-none [&>button]:hidden">
          <DialogHeader className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-extrabold text-slate-950">
                  {editingEstimate ? "Editar cotización" : "Crear nueva cotización"}
                </DialogTitle>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Productos, impuestos y moneda quedan guardados como snapshot del documento.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeBuilder}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto max-w-[1600px] p-4 sm:p-8">
              <SalesDocumentBuilder
                mode="estimate"
                form={form}
                setForm={setForm}
                lineItems={lineItems}
                totals={totals}
                statuses={STATUSES}
                formatStatusLabel={displayLabel}
                currentAssigneeName={currentAssigneeName}
                clientOptions={clientsCrud.data.map((client) => ({
                  value: client.id,
                  label: client.company_name,
                }))}
                productOptions={productsCrud.data.map((product) => ({
                  value: product.id,
                  label: product.name,
                }))}
                taxes={taxes}
                taxById={taxById}
                rateSource={currencySettings.rateSource}
                rateUpdatedAt={currencySettings.rateUpdatedAt}
                onCurrencyChange={changeCurrency}
                onClientChange={fillClient}
                onProductChange={chooseBaseProduct}
                onAddProductLine={addProductLine}
                onAddBlankLine={() =>
                  setLineItems((current) => [...current, emptyLine(normalizeCurrency(form.currency))])
                }
                onLinePatch={patchLine}
                onRemoveLine={(id) =>
                  setLineItems((current) =>
                    current.length <= 1 ? [emptyLine(normalizeCurrency(form.currency))] : current.filter((line) => line.id !== id),
                  )
                }
                normalizeMoneyInput={normalizeCurrencyInput}
              />
            </div>
          </ScrollArea>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:px-8">
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEstimate()}>
              {editingEstimate ? "Guardar cambios" : "Guardar cotización"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
