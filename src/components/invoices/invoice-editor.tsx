import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientProspectSearchSelect } from "@/components/crm/client-prospect-search-select";
import { crmFormStyles } from "@/components/crm/crm-form-shell";
import { formatInvoiceMoney } from "@/components/invoices/invoice-utils";
import { InvoiceDocumentPreview } from "@/components/invoices/invoice-document-preview";
import type { InvoiceDetailItem } from "@/components/invoices/invoice-items-view";
import { SalesDocumentLineEditor } from "@/components/sales/sales-document-line-editor";
import type {
  SalesDocumentLineItem,
  SalesDocumentTotals,
} from "@/components/sales/sales-document-line-editor";
import {
  convertCurrencyAmount,
  normalizeCurrency,
  normalizeCurrencyAmount,
} from "@/lib/currency";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { normalizeTaxRate, type CompanyTax } from "@/hooks/use-company-taxes";

export type InvoiceEditorItem = {
  id?: string;
  product_id?: string | null;
  item_name?: string | null;
  description: string;
  quantity: number;
  unit_type?: string | null;
  unit_price: number;
  total: number;
  is_optional?: boolean | null;
  document_currency?: string | null;
  original_currency?: string | null;
  original_unit_price?: number | null;
  converted_unit_price?: number | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  tax_id?: string | null;
  tax_name?: string | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
};

export type InvoiceEditorClient = {
  id: string;
  company_name: string;
  contact_person: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  tax_id?: string | null;
};

export type InvoiceEditorProduct = {
  id: string;
  name: string;
	  base_price?: number | null;
	  currency?: string | null;
	  description?: string | null;
	  default_tax_id?: string | null;
	  default_tax_name?: string | null;
	  default_tax_rate?: number | string | null;
	};

export type InvoiceEditorProposal = {
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

export type InvoiceEditorIssuerDefaults = {
  company_name?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
};

export type InvoiceEditorDraft = {
  number: string;
  status: string;
  client_id: string | null;
  proposal_id: string | null;
  product_id: string | null;
  currency: string;
  date_issued: string;
  due_date: string;
  notes: string | null;
  clientName: string | null;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  clientTaxId: string | null;
  issuerName: string | null;
  issuerTaxId: string | null;
  issuerEmail: string | null;
  issuerPhone: string | null;
  issuerAddress: string | null;
  issuerWebsite: string | null;
  relatedProposalNumber: string | null;
  relatedProposalTitle: string | null;
	  productName: string | null;
	  taxId?: string | null;
	  taxName?: string | null;
	  taxRate?: number | null;
	  tax: number;
  discount: number;
  legacySubtotal?: number;
  items: InvoiceEditorItem[];
};

export type InvoicePaymentFeedback = {
  status: "preparing" | "registered";
  title: string;
  description?: string;
};

export type InvoiceEditorProps = {
  mode: "create" | "edit";
  initialDraft: InvoiceEditorDraft;
  clients: InvoiceEditorClient[];
  products: InvoiceEditorProduct[];
  proposals: InvoiceEditorProposal[];
  taxes?: CompanyTax[];
  livePreview?: boolean;
  issuerDefaults?: InvoiceEditorIssuerDefaults | null;
  saving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSaveDraft: (draft: InvoiceEditorDraft) => Promise<void> | void;
  onConfirmSend: (draft: InvoiceEditorDraft) => Promise<void> | void;
};

const NONE_CLIENT = "__none_client__";
const NONE_PROPOSAL = "__none_proposal__";
const NONE_PRODUCT = "__none_product__";

function cleanText(value: unknown) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function cleanNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mergeAddressParts(...values: unknown[]) {
  const result: string[] = [];
  for (const value of values) {
    const part = cleanText(value);
    if (!part) continue;
    const normalized = part.toLowerCase();
    if (
      result.some(
        (item) =>
          item.toLowerCase().includes(normalized) ||
          normalized.includes(item.toLowerCase()),
      )
    ) {
      continue;
    }
    result.push(part);
  }
  return result.join(", ");
}

function normalizeInvoiceCurrency(currency: string | null | undefined) {
  return normalizeCurrency(currency);
}

function normalizeInvoiceAmount(value: unknown, currency: string | null | undefined) {
  return normalizeCurrencyAmount(cleanNumber(value), currency);
}

function lineTotal(item: Pick<InvoiceEditorItem, "quantity" | "unit_price">) {
  return Math.max(0, cleanNumber(item.quantity)) * Math.max(0, cleanNumber(item.unit_price));
}

function invoiceLineTotal(item: InvoiceEditorItem) {
  return item.is_optional === true ? 0 : lineTotal(item);
}

function emptyLine(): InvoiceEditorItem {
  return {
    product_id: null,
    item_name: "",
    description: "",
    quantity: 1,
    unit_type: "qty",
    unit_price: 0,
    total: 0,
    is_optional: false,
  };
}

function hasLineContent(item: InvoiceEditorItem) {
  return (
    Boolean(String(item.item_name || "").trim()) ||
    Boolean(String(item.description || "").trim()) ||
    cleanNumber(item.unit_price) > 0
  );
}

function getInvoiceSubtotal(draft: InvoiceEditorDraft) {
  const items = draft.items.filter(hasLineContent);
  return items.length
    ? items.reduce((sum, item) => sum + invoiceLineTotal(item), 0)
    : Math.max(0, cleanNumber(draft.legacySubtotal));
}

function getInvoiceDiscountPercentage(draft: InvoiceEditorDraft) {
  const subtotal = getInvoiceSubtotal(draft);
  return subtotal > 0
    ? String(Math.min(100, Math.max(0, (cleanNumber(draft.discount) / subtotal) * 100)))
    : "0";
}

function fillEmpty(current: string | null, next: string | null) {
  return cleanText(current) || cleanText(next);
}

export function InvoiceEditor({
  mode,
  initialDraft,
  clients,
  products,
  proposals,
  taxes = [],
  livePreview = false,
  issuerDefaults,
  saving = false,
  error,
  onCancel,
  onSaveDraft,
  onConfirmSend,
}: InvoiceEditorProps) {
	  const { settings: currencySettings } = useCompanyCurrencySettings();
	  const [draft, setDraft] = useState<InvoiceEditorDraft>(initialDraft);
  const [discountEnabled, setDiscountEnabled] = useState(() => cleanNumber(initialDraft.discount) > 0);
  const [discountPercentage, setDiscountPercentage] = useState(() =>
    getInvoiceDiscountPercentage(initialDraft),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    setDraft(initialDraft);
    setDiscountEnabled(cleanNumber(initialDraft.discount) > 0);
    setDiscountPercentage(getInvoiceDiscountPercentage(initialDraft));
    setValidationError(null);
  }, [initialDraft]);

  useEffect(() => {
    if (!livePreview) return;
    const viewport = previewViewportRef.current;
    const content = previewContentRef.current;
    if (!viewport || !content) return;

    const fitPreview = () => {
      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      if (!availableWidth || !availableHeight || !contentWidth || !contentHeight) return;
      const nextScale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
      setPreviewScale((current) => Math.abs(current - nextScale) < 0.01 ? current : nextScale);
    };

    const observer = new ResizeObserver(fitPreview);
    observer.observe(viewport);
    observer.observe(content);
    fitPreview();
    return () => observer.disconnect();
  }, [livePreview]);

  const totals = useMemo(() => {
    const validItems = draft.items.filter(hasLineContent);
    const hasLineItems = validItems.length > 0;
    const subtotal = hasLineItems
      ? validItems.reduce((sum, item) => sum + invoiceLineTotal(item), 0)
      : Math.max(0, cleanNumber(draft.legacySubtotal));
    const itemTax = validItems.reduce(
      (sum, item) =>
        sum + invoiceLineTotal(item) * (normalizeTaxRate(item.tax_rate) / 100),
      0,
    );
    const tax = Math.max(
      0,
      normalizeInvoiceAmount(hasLineItems ? itemTax : draft.tax, draft.currency),
    );
    const discount = Math.max(0, normalizeInvoiceAmount(draft.discount, draft.currency));
    return {
      subtotal: normalizeInvoiceAmount(subtotal, draft.currency),
      tax,
      discount,
      total: normalizeInvoiceAmount(Math.max(0, subtotal + tax - discount), draft.currency),
    };
  }, [draft.currency, draft.discount, draft.items, draft.legacySubtotal, draft.tax]);

  useEffect(() => {
    if (!discountEnabled) return;
    const percentage = Math.min(100, Math.max(0, cleanNumber(discountPercentage)));
    const discount = normalizeInvoiceAmount(totals.subtotal * (percentage / 100), draft.currency);
    setDraft((current) =>
      current.discount === discount ? current : { ...current, discount },
    );
  }, [discountEnabled, discountPercentage, draft.currency, totals.subtotal]);

	  const taxById = useMemo(() => new Map(taxes.map((tax) => [tax.id, tax])), [taxes]);
	  const defaultTax = useMemo(() => taxes.find((tax) => tax.is_default) || null, [taxes]);

	  const getProductTax = (product?: InvoiceEditorProduct | null) => {
	    if (product?.default_tax_id) {
	      const catalogTax = taxById.get(product.default_tax_id);
	      if (catalogTax) return catalogTax;
	    }
	    if (product?.default_tax_name || product?.default_tax_rate) {
	      return {
	        id: product.default_tax_id || "",
	        company_id: "",
	        name: product.default_tax_name || "Impuesto",
	        rate: normalizeTaxRate(product.default_tax_rate),
	        tax_type: "sales",
	        is_active: true,
	        is_default: false,
	      } satisfies CompanyTax;
	    }
	    return defaultTax;
	  };

  const selectedClient = draft.client_id
    ? clients.find((client) => client.id === draft.client_id)
    : null;
  const patchDraft = (patch: Partial<InvoiceEditorDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const applyCurrency = (currency: string) => {
    const nextCurrency = normalizeInvoiceCurrency(currency);
    setDraft((current) => ({
      ...current,
      currency: nextCurrency,
      tax: normalizeInvoiceAmount(current.tax, nextCurrency),
      discount: normalizeInvoiceAmount(current.discount, nextCurrency),
      items: current.items.map((item) => {
        const originalCurrency = normalizeInvoiceCurrency(
          item.original_currency || current.currency || nextCurrency,
        );
        const originalUnitPrice = normalizeInvoiceAmount(
          item.original_unit_price ?? item.unit_price,
          originalCurrency,
        );
        const unitPrice = convertCurrencyAmount(
          originalUnitPrice,
          originalCurrency,
          nextCurrency,
          currencySettings.usdToDopRate,
        );
        return {
          ...item,
          unit_price: unitPrice,
          document_currency: nextCurrency,
          original_currency: originalCurrency,
          original_unit_price: originalUnitPrice,
          converted_unit_price: unitPrice,
          exchange_rate: originalCurrency === nextCurrency ? 1 : currencySettings.usdToDopRate,
          exchange_rate_source: currencySettings.rateSource,
          exchange_rate_updated_at: currencySettings.rateUpdatedAt,
          total: lineTotal({ ...item, unit_price: unitPrice }),
        };
      }),
    }));
  };

	  const updateLine = (index: number, patch: Partial<InvoiceEditorItem>) => {
	    setDraft((current) => ({
	      ...current,
	      items: current.items.map((item, itemIndex) => {
	        if (itemIndex !== index) return item;
	        const next = { ...item, ...patch };
	        return { ...next, total: lineTotal(next) };
	      }),
	    }));
	  };

  const selectClient = (clientId: string) => {
    const client = clientId === NONE_CLIENT ? null : clients.find((item) => item.id === clientId);
    setDraft((current) => ({
      ...current,
      client_id: client?.id || null,
      clientName: cleanText(client?.contact_person),
      clientCompany: cleanText(client?.company_name),
      clientEmail: cleanText(client?.email),
      clientPhone: cleanText(client?.phone),
      clientAddress: mergeAddressParts(client?.address, client?.city, client?.country),
      clientTaxId: cleanText(client?.tax_id),
    }));
  };

  const applyProduct = (productId: string) => {
    const product =
      productId === NONE_PRODUCT ? null : products.find((item) => item.id === productId);
    setDraft((current) => {
      if (!product) return { ...current, product_id: null };
      if (current.items.some((item) => item.product_id === product.id)) return current;
      const description = cleanText(product.description) || product.name;
      const documentCurrency = normalizeInvoiceCurrency(current.currency);
      const productCurrency = normalizeInvoiceCurrency(
        cleanText(product.currency) || documentCurrency,
      );
      const originalPrice = Math.max(
        0,
        normalizeInvoiceAmount(product.base_price, productCurrency),
      );
	      const price = convertCurrencyAmount(
	        originalPrice,
	        productCurrency,
	        documentCurrency,
	        currencySettings.usdToDopRate,
	      );
	      const productTax = getProductTax(product);
      const productTaxRate = productTax ? normalizeTaxRate(productTax.rate) : 0;
      const nextItem: InvoiceEditorItem = {
        product_id: product.id,
        item_name: product.name,
        description,
        quantity: 1,
        unit_type: "qty",
        unit_price: price,
        total: price,
        is_optional: false,
        tax_id: productTax?.id || null,
        tax_name: productTax?.name || null,
	        tax_rate: productTaxRate,
	        tax_amount: normalizeInvoiceAmount(price * (productTaxRate / 100), documentCurrency),
	        document_currency: documentCurrency,
        original_currency: productCurrency,
        original_unit_price: originalPrice,
        converted_unit_price: price,
        exchange_rate: productCurrency === documentCurrency ? 1 : currencySettings.usdToDopRate,
        exchange_rate_source: currencySettings.rateSource,
        exchange_rate_updated_at: currencySettings.rateUpdatedAt,
      };
      const nextItems = [...current.items];
      const emptyIndex = nextItems.findIndex((item) => !hasLineContent(item));
      if (!nextItems.length) {
        nextItems.push(nextItem);
      } else if (emptyIndex >= 0) {
        nextItems[emptyIndex] = {
          ...nextItems[emptyIndex],
          ...nextItem,
        };
      } else {
        nextItems.push(nextItem);
      }
      return {
        ...current,
	        product_id: product.id,
	        currency: documentCurrency,
	        productName: fillEmpty(current.productName, product.name),
	        taxId: productTax?.id || null,
	        taxName: productTax?.name || null,
	        taxRate: productTaxRate,
	        tax: normalizeInvoiceAmount(price * (productTaxRate / 100), documentCurrency),
	        items: nextItems,
	      };
    });
  };

  const applyProposal = (proposalId: string) => {
    const proposal =
      proposalId === NONE_PROPOSAL ? null : proposals.find((item) => item.id === proposalId);
    setDraft((current) => {
      if (!proposal) return { ...current, proposal_id: null };
      const product = proposal.product_id
        ? products.find((item) => item.id === proposal.product_id)
        : null;
      const description =
        cleanText(proposal.description) ||
        cleanText(product?.description) ||
        cleanText(proposal.title) ||
        cleanText(product?.name) ||
        "Servicio";
      const proposalCurrency =
        cleanText(proposal.currency) || cleanText(product?.currency) || current.currency;
      const documentCurrency = normalizeInvoiceCurrency(current.currency);
      const originalCurrency = normalizeInvoiceCurrency(proposalCurrency);
      const originalPrice = Math.max(
        0,
        normalizeInvoiceAmount(proposal.amount || product?.base_price, originalCurrency),
      );
	      const price = convertCurrencyAmount(
	        originalPrice,
	        originalCurrency,
	        documentCurrency,
	        currencySettings.usdToDopRate,
	      );
	      const productTax = getProductTax(product);
      const productTaxRate = productTax ? normalizeTaxRate(productTax.rate) : 0;
      const nextItem: InvoiceEditorItem = {
        product_id: product?.id || null,
        item_name: cleanText(product?.name) || cleanText(proposal.title) || description,
        description,
        quantity: 1,
        unit_type: "qty",
        unit_price: price,
        total: price,
        is_optional: false,
        tax_id: productTax?.id || null,
        tax_name: productTax?.name || null,
	        tax_rate: productTaxRate,
	        tax_amount: normalizeInvoiceAmount(price * (productTaxRate / 100), documentCurrency),
	        document_currency: documentCurrency,
        original_currency: originalCurrency,
        original_unit_price: originalPrice,
        converted_unit_price: price,
        exchange_rate: originalCurrency === documentCurrency ? 1 : currencySettings.usdToDopRate,
        exchange_rate_source: currencySettings.rateSource,
        exchange_rate_updated_at: currencySettings.rateUpdatedAt,
      };
      const nextItems = [...current.items];
      const emptyIndex = nextItems.findIndex((item) => !hasLineContent(item));
      if (!nextItems.length) {
        nextItems.push(nextItem);
      } else if (emptyIndex >= 0 && price > 0) {
        nextItems[emptyIndex] = {
          ...nextItems[emptyIndex],
          ...nextItem,
        };
      }
      return {
        ...current,
        proposal_id: proposal.id,
        client_id: current.client_id || proposal.client_id || null,
        product_id: current.product_id || proposal.product_id || null,
        currency: documentCurrency,
	        relatedProposalNumber: fillEmpty(current.relatedProposalNumber, proposal.number),
	        relatedProposalTitle: fillEmpty(current.relatedProposalTitle, proposal.title),
	        productName: fillEmpty(current.productName, product?.name || null),
	        taxId: productTax?.id || null,
	        taxName: productTax?.name || null,
	        taxRate: productTaxRate,
	        tax: normalizeInvoiceAmount(price * (productTaxRate / 100), documentCurrency),
	        items: nextItems,
	      };
    });
    if (proposal?.client_id) selectClient(proposal.client_id);
  };

  const validateDraft = () => {
    if (!cleanText(draft.number)) return "El número de factura es obligatorio.";
    if (!cleanText(draft.date_issued)) return "La fecha emitida es obligatoria.";
    if (!cleanText(draft.due_date)) return "La fecha de vencimiento es obligatoria.";
    if (cleanNumber(draft.tax) < 0) return "El impuesto no puede ser negativo.";
    if (cleanNumber(draft.discount) < 0) return "El descuento no puede ser negativo.";
    const rows = draft.items.filter((item) => hasLineContent(item));
    for (const item of rows) {
      if (!cleanText(item.item_name) && !cleanText(item.description))
        return "Cada línea debe tener descripción.";
      if (cleanNumber(item.quantity) <= 0) return "La cantidad debe ser mayor que 0.";
      if (cleanNumber(item.unit_price) < 0) return "El precio unitario no puede ser negativo.";
    }
    if (totals.total < 0) return "El total final no puede ser negativo.";
    return null;
  };

  const normalizedDraft = (status: string): InvoiceEditorDraft => ({
	    ...draft,
	    status,
	    currency: normalizeInvoiceCurrency(draft.currency),
	    clientAddress: mergeAddressParts(
	      draft.clientAddress,
	      selectedClient?.address,
	      selectedClient?.city,
	      selectedClient?.country,
	    ),
	    tax: Math.max(0, normalizeInvoiceAmount(totals.tax, draft.currency)),
	    discount: Math.max(0, normalizeInvoiceAmount(draft.discount, draft.currency)),
	    items: draft.items.map((item) => {
	      const unitPrice = normalizeInvoiceAmount(item.unit_price, draft.currency);
	      const taxRate = normalizeTaxRate(item.tax_rate);
	      const isOptional = item.is_optional === true;
	      const normalizedLineTotal = isOptional
	        ? 0
	        : lineTotal({ ...item, unit_price: unitPrice });
	      const taxAmount = isOptional ? 0 : normalizedLineTotal * (taxRate / 100);
	      return {
        ...item,
        product_id: item.product_id || null,
        item_name: cleanText(item.item_name) || cleanText(item.description) || "",
        unit_type: item.unit_type || "qty",
	        is_optional: isOptional,
        unit_price: unitPrice,
	        tax_rate: taxRate,
	        tax_amount: normalizeInvoiceAmount(taxAmount, draft.currency),
	        document_currency: normalizeInvoiceCurrency(draft.currency),
        original_currency: normalizeInvoiceCurrency(item.original_currency || draft.currency),
        original_unit_price: normalizeInvoiceAmount(
          item.original_unit_price ?? unitPrice,
          item.original_currency || draft.currency,
        ),
        converted_unit_price: unitPrice,
        exchange_rate: item.exchange_rate ?? 1,
        exchange_rate_source: item.exchange_rate_source || currencySettings.rateSource,
        exchange_rate_updated_at:
          item.exchange_rate_updated_at || currencySettings.rateUpdatedAt || null,
	        total: normalizedLineTotal,
      };
    }),
  });

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: product.name })),
    [products],
  );

  const invoiceLineItems = useMemo<SalesDocumentLineItem[]>(
    () =>
      draft.items.map((item, index) => ({
        id: item.id || `invoice-line-${index}`,
        productId: item.product_id || null,
        item: cleanText(item.item_name) || cleanText(item.description) || "",
        description: String(item.description || ""),
        quantity: String(item.quantity ?? 1),
        rate: String(item.unit_price ?? 0),
        tax: String(normalizeTaxRate(item.tax_rate)),
        taxId: item.tax_id || null,
        taxName: item.tax_name || null,
        optional: item.is_optional === true,
        documentCurrency: item.document_currency || draft.currency,
        originalCurrency: item.original_currency || draft.currency,
        originalRate:
          item.original_unit_price === null || item.original_unit_price === undefined
            ? String(item.unit_price || 0)
            : String(item.original_unit_price),
        convertedRate:
          item.converted_unit_price === null || item.converted_unit_price === undefined
            ? String(item.unit_price || 0)
            : String(item.converted_unit_price),
        exchangeRate: item.exchange_rate ?? null,
        exchangeRateSource: item.exchange_rate_source || null,
        exchangeRateUpdatedAt: item.exchange_rate_updated_at || null,
      })),
    [draft.currency, draft.items],
  );

  const invoiceLineTotals = useMemo<SalesDocumentTotals>(
    () => ({
      subtotal: totals.subtotal,
      taxTotal: totals.tax,
      discount: totals.discount,
      adjustment: 0,
      total: totals.total,
    }),
    [totals],
  );

  const previewItems = useMemo<InvoiceDetailItem[]>(
    () =>
      draft.items
        .filter(hasLineContent)
        .map((item, index) => {
          const name = cleanText(item.item_name);
          const description = cleanText(item.description);
          return {
            id: item.id || `invoice-preview-${index}`,
            description:
              name && description && name.toLowerCase() !== description.toLowerCase()
                ? `${name} · ${description}`
                : name || description || "Sin descripción",
            quantity: cleanNumber(item.quantity),
            unit_price: cleanNumber(item.unit_price),
            total: invoiceLineTotal(item),
          };
        }),
    [draft.items],
  );

  const issuerAddress = mergeAddressParts(
    issuerDefaults?.address || null,
    issuerDefaults?.city || null,
    issuerDefaults?.country || null,
  );
  const previewIssuerFields = [
    { label: "Empresa", value: fillEmpty(issuerDefaults?.company_name || null, draft.issuerName) },
    { label: "ID fiscal", value: fillEmpty(issuerDefaults?.tax_id || null, draft.issuerTaxId) },
    { label: "Correo", value: fillEmpty(issuerDefaults?.email || null, draft.issuerEmail) },
    { label: "Teléfono", value: fillEmpty(issuerDefaults?.phone || null, draft.issuerPhone) },
    { label: "Dirección", value: fillEmpty(issuerAddress || null, draft.issuerAddress) },
    { label: "Sitio web", value: fillEmpty(issuerDefaults?.website || null, draft.issuerWebsite) },
  ];
  const previewClientFields = [
    { label: "Nombre", value: fillEmpty(draft.clientName, selectedClient?.contact_person || null) },
    { label: "Empresa", value: fillEmpty(draft.clientCompany, selectedClient?.company_name || null) },
    { label: "Correo", value: fillEmpty(draft.clientEmail, selectedClient?.email || null) },
    { label: "Teléfono", value: fillEmpty(draft.clientPhone, selectedClient?.phone || null) },
    { label: "ID fiscal", value: fillEmpty(draft.clientTaxId, selectedClient?.tax_id || null) },
    {
      label: "Dirección",
      value: fillEmpty(
        draft.clientAddress,
        mergeAddressParts(selectedClient?.address, selectedClient?.city, selectedClient?.country) || null,
      ),
    },
  ];

  const findLineIndex = (lineId: string) =>
    invoiceLineItems.findIndex((line) => line.id === lineId);

  const patchInvoiceLine = (lineId: string, patch: Partial<SalesDocumentLineItem>) => {
    const index = findLineIndex(lineId);
    if (index < 0) return;

    const nextPatch: Partial<InvoiceEditorItem> = {};
    if ("productId" in patch) nextPatch.product_id = patch.productId || null;
    if ("item" in patch) nextPatch.item_name = patch.item ?? "";
    if ("description" in patch) nextPatch.description = patch.description ?? "";
    if ("quantity" in patch) nextPatch.quantity = cleanNumber(patch.quantity);
    if ("rate" in patch) nextPatch.unit_price = cleanNumber(patch.rate);
    if ("tax" in patch) nextPatch.tax_rate = normalizeTaxRate(patch.tax);
    if ("taxId" in patch) nextPatch.tax_id = patch.taxId || null;
    if ("taxName" in patch) nextPatch.tax_name = patch.taxName || null;
    if ("optional" in patch) nextPatch.is_optional = patch.optional === true;
    if ("documentCurrency" in patch) nextPatch.document_currency = patch.documentCurrency || null;
    if ("originalCurrency" in patch) nextPatch.original_currency = patch.originalCurrency || null;
    if ("originalRate" in patch) {
      nextPatch.original_unit_price =
        patch.originalRate === null || patch.originalRate === undefined
          ? null
          : cleanNumber(patch.originalRate);
    }
    if ("convertedRate" in patch) {
      nextPatch.converted_unit_price =
        patch.convertedRate === null || patch.convertedRate === undefined
          ? null
          : cleanNumber(patch.convertedRate);
    }
    if ("exchangeRate" in patch) nextPatch.exchange_rate = patch.exchangeRate ?? null;
    if ("exchangeRateSource" in patch) nextPatch.exchange_rate_source = patch.exchangeRateSource || null;
    if ("exchangeRateUpdatedAt" in patch)
      nextPatch.exchange_rate_updated_at = patch.exchangeRateUpdatedAt || null;

    updateLine(index, nextPatch);
  };

  const removeInvoiceLine = (lineId: string) => {
    const index = findLineIndex(lineId);
    if (index < 0) return;
    const removedItem = draft.items[index];
    const items = draft.items.filter((_, itemIndex) => itemIndex !== index);
    const remainingHasContent = items.some(hasLineContent);
    patchDraft({
      items,
      ...(!remainingHasContent && hasLineContent(removedItem)
        ? { legacySubtotal: 0, tax: 0, discount: 0 }
        : {}),
    });
  };

  const addBlankInvoiceLine = () => patchDraft({ items: [...draft.items, emptyLine()] });

  const normalizeInvoiceMoneyText = (value: string, currency?: string | null) =>
    String(normalizeInvoiceAmount(value, currency || draft.currency));

  const saveDraft = async () => {
    const message = validateDraft();
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    await onSaveDraft(normalizedDraft(mode === "edit" ? draft.status : "Draft"));
  };

  const markAsSent = async () => {
    const message = validateDraft();
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    await onConfirmSend(normalizedDraft("Sent"));
  };

  return (
    <div className="space-y-4">
      {isIssuedStatus(draft.status) ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esta factura ya fue emitida y no se puede editar. Para corregirla, crea una nota de crédito,
          anúlala o emite una nueva factura.
        </div>
      ) : null}
      {error || validationError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error || validationError}
        </div>
      ) : null}

      <div className={livePreview ? "grid min-w-0 gap-6 pb-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)]" : "space-y-6 pb-4"}>
        <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Factura {draft.number || "—"}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {invoiceStatusLabel(draft.status)}
          </span>
        </div>

        <EditorSection title="1. Cliente y fechas" description="Elige a quién se factura y define las fechas del documento.">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <Field label="Cliente" description="La factura se emitirá a nombre de este cliente.">
                <ClientProspectSearchSelect
                  className={crmFormStyles.input}
                  clients={clients.map((client) => ({
                    id: client.id,
                    label: client.contact_person
                      ? `${client.company_name} · ${client.contact_person}`
                      : client.company_name,
                    secondaryLabel: [client.email, client.phone]
                      .filter(Boolean)
                      .join(" · ") || null,
                    searchText: [
                      client.company_name,
                      client.contact_person,
                      client.email,
                      client.phone,
                    ]
                      .filter(Boolean)
                      .join(" "),
                    data: client,
                  }))}
                  value={
                    draft.client_id
                      ? { type: "client", id: draft.client_id }
                      : null
                  }
                  placeholder="Buscar cliente"
                  onChange={(value, option) => {
                    const data = (option?.data || {}) as Record<string, unknown>;
                    setDraft((current) => ({
                      ...current,
                      client_id: value?.id || null,
                      clientName: cleanText(data.contact_person),
                      clientCompany: cleanText(data.company_name),
                      clientEmail: cleanText(data.email),
                      clientPhone: cleanText(data.phone || data.whatsapp),
                      clientAddress: cleanText(
                        [data.address, data.city, data.country].filter(Boolean).join(", "),
                      ),
                      clientTaxId: cleanText(data.tax_id),
                    }));
                  }}
                />
              </Field>
              <Field label="Propuesta vinculada (opcional)" description="Vincúlala si esta factura corresponde a una propuesta; se completarán los datos disponibles.">
                <Select value={draft.proposal_id || NONE_PROPOSAL} onValueChange={applyProposal}>
                  <SelectTrigger className={crmFormStyles.select}>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_PROPOSAL}>Sin propuesta</SelectItem>
                    {proposals.map((proposal) => (
                      <SelectItem key={proposal.id} value={proposal.id}>
                        {proposal.title
                          ? `${proposal.number} · ${proposal.title}`
                          : proposal.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fecha de emisión">
                <Input
                  className={crmFormStyles.input}
                  type="date"
                  value={draft.date_issued}
                  onChange={(event) => patchDraft({ date_issued: event.target.value })}
                />
              </Field>
              <Field label="Fecha de vencimiento">
                <Input
                  className={crmFormStyles.input}
                  type="date"
                  value={draft.due_date}
                  onChange={(event) => patchDraft({ due_date: event.target.value })}
                />
              </Field>
          </div>
        </EditorSection>

        <EditorSection title="2. Conceptos e importes" description="Añade cada producto o servicio y revisa cómo se calcula el total.">
          <SalesDocumentLineEditor
            mode="invoice"
            form={{
              currency: draft.currency,
              discountType: discountEnabled ? "percent" : "none",
              discountValue: discountPercentage,
              adjustmentValue: "0",
              quantityMode: "qty",
            }}
            lineItems={invoiceLineItems}
            totals={invoiceLineTotals}
            productOptions={productOptions}
            taxes={taxes}
            taxById={taxById}
            addItemLabel="Agregar producto del catálogo"
            addItemHelp="Busca en el catálogo o pulsa + para escribir una línea manual."
            currencyControl={
              <Select
                value={normalizeInvoiceCurrency(draft.currency)}
                onValueChange={applyCurrency}
              >
                <SelectTrigger
                  className={crmFormStyles.select}
                  aria-label="Moneda de la factura"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOP">RD$ · Peso dominicano</SelectItem>
                  <SelectItem value="USD">US$ · Dólares</SelectItem>
                </SelectContent>
              </Select>
            }
            rateSource={currencySettings.rateSource}
            rateUpdatedAt={currencySettings.rateUpdatedAt}
            showAdjustment={false}
            allowPercentageDiscount
            showOptional={false}
            useCrmFieldStyles
            showQuantityMode={false}
            emptyMessage="Aún no hay conceptos. Selecciona un producto o pulsa + para agregar una línea manual."
            onAddProductLine={applyProduct}
            onAddBlankLine={addBlankInvoiceLine}
            onLinePatch={patchInvoiceLine}
            onRemoveLine={removeInvoiceLine}
            onFormPatch={(patch) => {
              if (patch.discountType === "percent") {
                setDiscountEnabled(true);
              } else if (patch.discountType === "none") {
                setDiscountEnabled(false);
                setDiscountPercentage("0");
                patchDraft({ discount: 0 });
              }
              if (patch.discountValue !== undefined) {
                setDiscountPercentage(patch.discountValue);
              }
            }}
            normalizeMoneyInput={normalizeInvoiceMoneyText}
          />
        </EditorSection>

        </div>

        {livePreview ? (
          <aside className="flex h-[calc(100dvh-220px)] min-w-0 flex-col self-start overflow-hidden lg:sticky lg:top-0 lg:h-[calc(92vh-190px)]">
            <div ref={previewViewportRef} className="relative min-h-0 flex-1 overflow-hidden">
              <div
                ref={previewContentRef}
                className="absolute left-1/2 top-2 w-full origin-top"
                style={{
                  transform: `translateX(-50%) scale(${previewScale})`,
                }}
              >
                <InvoiceDocumentPreview
                  compact
                  invoice={{ number: draft.number || "Borrador", date_issued: draft.date_issued, due_date: draft.due_date }}
                  issuerFields={previewIssuerFields}
                  clientFields={previewClientFields}
                  items={previewItems}
                  itemsLoading={false}
                  itemsError={null}
                  currency={normalizeInvoiceCurrency(draft.currency)}
                  subtotal={formatInvoiceMoney(totals.subtotal, draft.currency)}
                  tax={formatInvoiceMoney(totals.tax, draft.currency)}
                  discount={formatInvoiceMoney(totals.discount, draft.currency)}
                  total={formatInvoiceMoney(totals.total, draft.currency)}
                  notes={draft.notes}
                  formatMoney={formatInvoiceMoney}
                />
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm md:-mx-5 md:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total de la factura
            </p>
            <p className="text-lg font-semibold text-slate-950">
              {formatInvoiceMoney(totals.total, draft.currency)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-w-0 whitespace-normal px-2 text-xs leading-tight sm:px-4 sm:text-sm"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-w-0 whitespace-normal px-2 text-xs leading-tight sm:px-4 sm:text-sm"
              onClick={saveDraft}
              disabled={saving || isIssuedStatus(draft.status)}
            >
              {mode === "create" ? "Guardar como borrador" : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              className="min-w-0 whitespace-normal px-2 text-xs leading-tight sm:px-4 sm:text-sm"
              onClick={markAsSent}
              disabled={saving || isIssuedStatus(draft.status)}
            >
              <Send className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
              Marcar como enviada
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

function isIssuedStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "sent" || normalized === "overdue" || normalized === "paid";
}

function invoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Draft: "Borrador",
    Sent: "Enviada",
    Paid: "Pagada",
    "Partially Paid": "Pago parcial",
    Overdue: "Vencida",
    Cancelled: "Cancelada",
  };
  return labels[status] || status || "Borrador";
}

function Field({
  label,
  children,
  className,
  description,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <Label className={crmFormStyles.label}>{label}</Label>
      {children}
      {description ? <p className="text-xs leading-relaxed text-slate-500">{description}</p> : null}
    </div>
  );
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 bg-white pb-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
