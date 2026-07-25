import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BadgeDollarSign, CalendarClock, FileText, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import {
  normalizeTaxRate,
  useCompanyTaxes,
  type CompanyTax,
} from "@/hooks/use-company-taxes";
import {
  CURRENCY_OPTIONS,
  convertCurrencyAmount,
  convertToBaseCurrency,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyAmount,
  normalizeCurrencyInput,
} from "@/lib/currency";

export type QuickCreateType = "lead" | "client" | "task" | "proposal";

export type QuickCreateSourceType =
  | "lead"
  | "client"
  | "deal"
  | "proposal"
  | "invoice"
  | "project"
  | "product"
  | "whatsapp"
  | "manual";

export type QuickCreateContext = {
  sourceType?: QuickCreateSourceType;
  sourceId?: string | null;
  prefill?: Record<string, unknown>;
};

type QuickCreateDialogProps = {
  type: QuickCreateType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: QuickCreateContext;
  onCreated?: (args: { type: QuickCreateType; record: any }) => void;
};

type QuickCreateForm = {
  name: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  whatsapp: string;
  service: string;
  title: string;
  description: string;
  notes: string;
  due_date: string;
  priority: string;
  client_id: string;
  lead_id: string;
  deal_id: string;
  product_id: string;
  amount: string;
  currency: string;
  valid_until: string;
};

type QuickProductOption = {
  id: string;
  name: string;
  category: string | null;
  base_price: number | null;
  currency: string | null;
  description: string | null;
  deliverables?: string | null;
  duration_days?: number | null;
  proposal_defaults?: Record<string, unknown> | null;
  default_tax_id?: string | null;
  default_tax_name?: string | null;
  default_tax_rate?: number | string | null;
  is_active?: boolean | null;
};

type QuickClientOption = {
  id: string;
  company_name: string;
  contact_person: string | null;
};

function tomorrowDateKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateAfterDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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

function text(value: unknown) {
  return String(value ?? "").trim();
}

function nullableText(value: unknown) {
  const v = text(value);
  return v ? v : null;
}

function splitPersonName(raw: string) {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1).join(" "),
  };
}

function resolveRelatedPayload(context?: QuickCreateContext) {
  const sourceType = context?.sourceType;
  const sourceId = context?.sourceId ? String(context.sourceId) : null;
  const prefill = context?.prefill || {};

  return {
    related_client_id:
      text(prefill.related_client_id) || (sourceType === "client" ? sourceId : null),
    related_lead_id: text(prefill.related_lead_id) || (sourceType === "lead" ? sourceId : null),
    related_deal_id: text(prefill.related_deal_id) || (sourceType === "deal" ? sourceId : null),
    related_project_id:
      text(prefill.related_project_id) || (sourceType === "project" ? sourceId : null),
  };
}

export function QuickCreateDialog({
  type,
  open,
  onOpenChange,
  context,
  onCreated,
}: QuickCreateDialogProps) {
  const { profile, user } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { taxById: salesTaxById, defaultTax } = useCompanyTaxes("sales");
  const prefill = context?.prefill || {};

  const [saving, setSaving] = useState(false);
  const [proposalOptionsLoading, setProposalOptionsLoading] = useState(false);
  const [products, setProducts] = useState<QuickProductOption[]>([]);
  const [clients, setClients] = useState<QuickClientOption[]>([]);
  const [form, setForm] = useState<QuickCreateForm>({
    name: "",
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    whatsapp: "",
    service: "",
    title: "",
    description: "",
    notes: "",
    due_date: tomorrowDateKey(),
    priority: "Medium",
    client_id: "",
    lead_id: "",
    deal_id: "",
    product_id: "",
    amount: "",
    currency: currencySettings.baseCurrency,
    valid_until: dateAfterDays(15),
  });

  useEffect(() => {
    if (!open) return;

    const nextName = text(prefill.name || prefill.full_name || prefill.company_name);
    const nextCompany = text(prefill.company_name);
    const nextContact = text(prefill.contact_person);
    const nextPhone = text(prefill.phone);
    const nextWhatsapp = text(prefill.whatsapp || prefill.phone);
    const nextService = text(prefill.service || prefill.selected_service || prefill.product_name);
    const nextTitle =
      text(prefill.title) || (type === "task" && nextName ? `Dar seguimiento a ${nextName}` : "");

    setForm({
      name: nextName,
      company_name: nextCompany,
      contact_person: nextContact,
      email: text(prefill.email),
      phone: nextPhone,
      whatsapp: nextWhatsapp,
      service: nextService,
      title: nextTitle,
      description: text(prefill.description),
      notes: text(prefill.notes),
      due_date: text(prefill.due_date) || tomorrowDateKey(),
      priority: text(prefill.priority) || "Medium",
      client_id:
        text(prefill.client_id || prefill.related_client_id) ||
        (context?.sourceType === "client" && context?.sourceId ? String(context.sourceId) : ""),
      lead_id:
        text(prefill.lead_id || prefill.related_lead_id) ||
        (context?.sourceType === "lead" && context?.sourceId ? String(context.sourceId) : ""),
      deal_id:
        text(prefill.deal_id || prefill.related_deal_id) ||
        (context?.sourceType === "deal" && context?.sourceId ? String(context.sourceId) : ""),
      product_id:
        text(prefill.product_id || prefill.related_product_id) ||
        (context?.sourceType === "product" && context?.sourceId ? String(context.sourceId) : ""),
      amount: text(prefill.amount || prefill.value),
      currency: normalizeCurrency(text(prefill.currency) || currencySettings.baseCurrency),
      valid_until: text(prefill.valid_until) || dateAfterDays(15),
    });
  }, [open, type, context?.sourceType, context?.sourceId, currencySettings.baseCurrency]);

  useEffect(() => {
    if (!open || type !== "proposal" || !profile?.company_id) return;

    let cancelled = false;

    const loadProposalOptions = async () => {
      setProposalOptionsLoading(true);
      try {
        const db = supabase as any;
        const [productsRes, clientsRes] = await Promise.all([
          db
            .from("products")
            .select(
              "id,name,category,base_price,currency,description,deliverables,duration_days,proposal_defaults,default_tax_id,default_tax_name,default_tax_rate,is_active",
            )
            .eq("company_id", profile.company_id)
            .order("name", { ascending: true })
            .limit(500),
          db
            .from("clients")
            .select("id,company_name,contact_person")
            .eq("company_id", profile.company_id)
            .order("company_name", { ascending: true })
            .limit(500),
        ]);

        if (productsRes.error) throw productsRes.error;
        if (clientsRes.error) throw clientsRes.error;

        if (!cancelled) {
          setProducts(
            (productsRes.data || []).filter((p: QuickProductOption) => p.is_active !== false),
          );
          setClients(clientsRes.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setClients([]);
        }
      } finally {
        if (!cancelled) setProposalOptionsLoading(false);
      }
    };

    void loadProposalOptions();

    return () => {
      cancelled = true;
    };
  }, [open, type, profile?.company_id]);

  const applyProductToProposal = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setForm((prev) => {
      const defaults =
        product.proposal_defaults && typeof product.proposal_defaults === "object"
          ? product.proposal_defaults
          : {};

      const productCurrency = normalizeCurrency(product.currency || currencySettings.baseCurrency);
      const currentCurrency = normalizeCurrency(prev.currency || currencySettings.baseCurrency);
      const price = normalizeCurrencyAmount(product.base_price || 0, productCurrency);
      const hasManualAmount = Boolean(prev.amount.trim());
      const titleBase = prev.title.trim() || `Propuesta — ${product.name}`;
      const descriptionBase =
        prev.description.trim() ||
        text((defaults as any).serviceDescription) ||
        text(product.description);

      return {
        ...prev,
        product_id: productId,
        title: titleBase,
        amount:
          hasManualAmount || !Number.isFinite(price) || price <= 0
            ? prev.amount
            : normalizeCurrencyInput(String(price), productCurrency),
        currency: hasManualAmount ? currentCurrency : productCurrency,
        description: descriptionBase,
        service: prev.service.trim() || product.name,
      };
    });
  };

  const getDefaultTaxForProduct = (product?: QuickProductOption | null): CompanyTax | null => {
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

  const title = useMemo(() => {
    if (type === "lead") return "Nuevo prospecto rápido";
    if (type === "client") return "Nuevo cliente rápido";
    if (type === "proposal") return "Nueva propuesta rápida";
    return "Nueva tarea rápida";
  }, [type]);

  const description = useMemo(() => {
    if (type === "lead") return "Captura lo mínimo y deja que el CRM complete el flujo después.";
    if (type === "client") return "Crea la cuenta con los datos esenciales.";
    if (type === "proposal") return "Elige cliente y producto; el CRM rellena lo importante.";
    return "Crea una tarea conectada al contexto actual.";
  }, [type]);

  const Icon =
    type === "lead"
      ? UserPlus
      : type === "client"
        ? Users
        : type === "proposal"
          ? BadgeDollarSign
          : CalendarClock;

  const updateField = (key: keyof QuickCreateForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) {
      toast.error("No se pudo detectar la empresa.");
      return;
    }

    setSaving(true);

    try {
      let table = "";
      let payload: Record<string, unknown> = {};

      if (type === "lead") {
        const name = form.name.trim() || form.company_name.trim();
        if (!name && !form.phone.trim() && !form.whatsapp.trim() && !form.email.trim()) {
          toast.error("Agrega al menos nombre, teléfono, WhatsApp o email.");
          return;
        }

        const person = splitPersonName(name || "Prospecto");
        const service = form.service.trim();

        table = "leads";
        payload = {
          company_id: profile.company_id,
          first_name: person.first_name || "Prospecto",
          last_name: person.last_name || "",
          company_name: nullableText(form.company_name),
          email: nullableText(form.email),
          phone: nullableText(form.phone || form.whatsapp),
          whatsapp: nullableText(form.whatsapp || form.phone),
          source: text(prefill.source) || "Website",
          status: text(prefill.status) || "New",
          assigned_to: text(prefill.assigned_to) || profile.user_id || user?.id || null,
          estimated_value: Number(prefill.estimated_value || 0) || 0,
          notes: nullableText(form.notes),
          metadata: service ? { selected_service: service } : null,
          source_channel: context?.sourceType === "whatsapp" ? "whatsapp" : null,
          first_touch_channel: context?.sourceType === "whatsapp" ? "whatsapp" : null,
          last_touch_channel: context?.sourceType === "whatsapp" ? "whatsapp" : null,
        };
      }

      if (type === "client") {
        const companyName = form.company_name.trim() || form.name.trim();
        if (!companyName) {
          toast.error("El nombre o empresa es requerido.");
          return;
        }

        table = "clients";
        payload = {
          company_id: profile.company_id,
          company_name: companyName,
          contact_person: nullableText(form.contact_person || form.name),
          email: nullableText(form.email),
          phone: nullableText(form.phone || form.whatsapp),
          whatsapp: nullableText(form.whatsapp || form.phone),
          status: "Active",
          account_manager: text(prefill.account_manager) || profile.id || null,
          notes: nullableText(form.notes),
        };
      }

      if (type === "task") {
        if (!form.title.trim()) {
          toast.error("El título de la tarea es requerido.");
          return;
        }

        const related = resolveRelatedPayload(context);

        table = "tasks";
        payload = {
          company_id: profile.company_id,
          title: form.title.trim(),
          description: nullableText(form.description || form.notes),
          status: "To Do",
          priority: form.priority || "Medium",
          due_date: form.due_date || null,
          assigned_to: text(prefill.assigned_to) || profile.user_id || user?.id || null,
          related_client_id: related.related_client_id || null,
          related_lead_id: related.related_lead_id || null,
          related_deal_id: related.related_deal_id || null,
          related_project_id: related.related_project_id || null,
        };
      }

      if (type === "proposal") {
        if (!user?.id) {
          toast.error("No se pudo detectar tu usuario.");
          return;
        }

        if (!form.title.trim()) {
          toast.error("El título de la propuesta es requerido.");
          return;
        }

        const product = products.find((p) => p.id === form.product_id);
        const proposalCurrency = normalizeCurrency(
          form.currency || product?.currency || currencySettings.baseCurrency,
        );
        const amount = normalizeCurrencyAmount(form.amount || 0, proposalCurrency);
        const amountBase = convertToBaseCurrency(amount, proposalCurrency, currencySettings);
        const exchangeRate =
          proposalCurrency === currencySettings.baseCurrency ? 1 : currencySettings.usdToDopRate;
        const selectedTax = getDefaultTaxForProduct(product);
        const taxRate = selectedTax ? normalizeTaxRate(selectedTax.rate) : 0;
        const taxAmount = normalizeCurrencyAmount(amount * (taxRate / 100), proposalCurrency);

        table = "proposals";
        payload = {
          company_id: profile.company_id,
          number: text(prefill.number) || generateProposalNumber(),
          title: form.title.trim(),
          product_id: nullableText(form.product_id),
          client_id: nullableText(form.client_id),
          lead_id: nullableText(form.lead_id),
          deal_id: nullableText(form.deal_id),
          whatsapp_conversation_id:
            context?.sourceType === "whatsapp" && context?.sourceId
              ? String(context.sourceId)
              : null,
          amount,
          currency: proposalCurrency,
          base_currency: currencySettings.baseCurrency,
          exchange_rate: exchangeRate,
          exchange_rate_source: currencySettings.rateSource,
          exchange_rate_updated_at: currencySettings.rateUpdatedAt,
          amount_base: amountBase,
          status: text(prefill.status) || "Draft",
          valid_until: form.valid_until || null,
          description: nullableText(form.description || product?.description),
          content: null,
          notes: nullableText(form.notes),
          sent_at: null,
          public_token: generatePublicToken(),
          created_by: user.id,
          proposal_data: {
            serviceDescription: nullableText(form.description || product?.description),
            deliverablesText: nullableText(product?.deliverables),
            estimatedTime: product?.duration_days ? `${product.duration_days} días` : null,
            nextStep: "Si estás de acuerdo, podemos coordinar los detalles para iniciar.",
            sourceType: context?.sourceType || "manual",
            sourceId: context?.sourceId || null,
            taxSnapshot: selectedTax
              ? {
                  taxId: selectedTax.id || null,
                  taxName: selectedTax.name,
                  taxRate,
                  taxAmount,
                }
              : null,
          },
        };
      }

      const { data, error } = await (supabase as any)
        .from(table)
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      toast.success(
        type === "lead"
          ? "Prospecto creado"
          : type === "client"
            ? "Cliente creado"
            : type === "proposal"
              ? "Propuesta creada"
              : "Tarea creada",
      );

      onCreated?.({ type, record: data });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el registro.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "text-xs font-normal uppercase tracking-wide text-slate-500";
  const inputClass =
    "h-12 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-base font-normal shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:rounded-xl sm:border sm:px-3 sm:text-sm";
  const selectClass =
    "h-12 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-base font-normal shadow-none focus:ring-0 focus:ring-offset-0 sm:rounded-xl sm:border sm:px-3 sm:text-sm";
  const textareaClass =
    "min-h-24 resize-none rounded-none border-0 border-b border-slate-200 bg-white px-0 py-3 text-base font-normal shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:rounded-xl sm:border sm:px-3 sm:text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-none max-sm:!left-0 max-sm:!top-0 max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:rounded-none sm:h-[min(720px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-200">
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 pr-14 text-left sm:px-6 lg:px-7">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#1d62f9]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-normal tracking-normal text-slate-950">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-normal text-slate-500">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-7">
            <div className="mx-auto w-full max-w-2xl space-y-4">
              {type === "lead" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Nombre o empresa</Label>
                    <Input
                      className={inputClass}
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Ej: Juan Pérez / Diseño y Muebles S.A."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={labelClass}>WhatsApp</Label>
                      <Input
                        className={inputClass}
                        value={form.whatsapp}
                        onChange={(e) => updateField("whatsapp", e.target.value)}
                        placeholder="+1 809 555 0000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelClass}>Email</Label>
                      <Input
                        className={inputClass}
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="cliente@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Servicio de interés</Label>
                    <Input
                      className={inputClass}
                      value={form.service}
                      onChange={(e) => updateField("service", e.target.value)}
                      placeholder="Ej: CRM, página web, automatización..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Nota rápida</Label>
                    <Textarea
                      className={textareaClass}
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={3}
                      placeholder="Qué necesita, de dónde vino, urgencia..."
                    />
                  </div>
                </>
              ) : null}

              {type === "client" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Empresa o nombre</Label>
                    <Input
                      className={inputClass}
                      value={form.company_name}
                      onChange={(e) => updateField("company_name", e.target.value)}
                      placeholder="Ej: Diseño y Muebles S.A."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Contacto principal</Label>
                    <Input
                      className={inputClass}
                      value={form.contact_person}
                      onChange={(e) => updateField("contact_person", e.target.value)}
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={labelClass}>WhatsApp / teléfono</Label>
                      <Input
                        className={inputClass}
                        value={form.whatsapp}
                        onChange={(e) => updateField("whatsapp", e.target.value)}
                        placeholder="+1 809 555 0000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelClass}>Email</Label>
                      <Input
                        className={inputClass}
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder="cliente@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Notas</Label>
                    <Textarea
                      className={textareaClass}
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : null}

              {type === "proposal" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Título</Label>
                    <Input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="Ej: Propuesta — Implementación CRM"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={labelClass}>Cliente</Label>
                      <Select
                        value={form.client_id || "none"}
                        onValueChange={(value) =>
                          updateField("client_id", value === "none" ? "" : value)
                        }
                        disabled={proposalOptionsLoading}
                      >
                        <SelectTrigger className={selectClass}>
                          <SelectValue placeholder="Selecciona cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin cliente</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.contact_person
                                ? `${client.company_name} · ${client.contact_person}`
                                : client.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className={labelClass}>Producto</Label>
                      <Select
                        value={form.product_id || "none"}
                        onValueChange={(value) => {
                          if (value === "none") {
                            updateField("product_id", "");
                            return;
                          }
                          applyProductToProposal(value);
                        }}
                        disabled={proposalOptionsLoading}
                      >
                        <SelectTrigger className={selectClass}>
                          <SelectValue placeholder="Selecciona producto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin producto</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.category
                                ? `${product.name} · ${product.category}`
                                : product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className={labelClass}>Monto</Label>
                      <Input
                        className={inputClass}
                        type="number"
                        step={getCurrencyStep(form.currency)}
                        inputMode={getCurrencyInputMode(form.currency)}
                        value={form.amount}
                        onChange={(e) => updateField("amount", e.target.value)}
                        onBlur={(e) =>
                          updateField(
                            "amount",
                            normalizeCurrencyInput(e.target.value, form.currency),
                          )
                        }
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className={labelClass}>Moneda</Label>
                      <Select
                        value={normalizeCurrency(form.currency)}
                        onValueChange={(value) => {
                          const nextCurrency = normalizeCurrency(value);
                          setForm((prev) => {
                            const currentCurrency = normalizeCurrency(prev.currency);
                            const convertedAmount = prev.amount.trim()
                              ? convertCurrencyAmount(
                                  prev.amount,
                                  currentCurrency,
                                  nextCurrency,
                                  currencySettings.usdToDopRate,
                                )
                              : "";

                            return {
                              ...prev,
                              currency: nextCurrency,
                              amount:
                                convertedAmount === ""
                                  ? ""
                                  : normalizeCurrencyInput(String(convertedAmount), nextCurrency),
                            };
                          });
                        }}
                      >
                        <SelectTrigger className={selectClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.symbol} · {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className={labelClass}>Válida hasta</Label>
                      <Input
                        className={inputClass}
                        type="date"
                        value={form.valid_until}
                        onChange={(e) => updateField("valid_until", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Descripción rápida</Label>
                    <Textarea
                      className={textareaClass}
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={3}
                      placeholder="Resumen corto del servicio o solución..."
                    />
                  </div>

                  {context?.sourceType ? (
                    <div className="border-t border-slate-100 px-0 py-3 text-xs font-normal text-slate-500">
                      <FileText className="mr-1 inline h-3.5 w-3.5" />
                      Se creará vinculada a: {context.sourceType}
                    </div>
                  ) : null}
                </>
              ) : null}

              {type === "task" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Título</Label>
                    <Input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="Ej: Dar seguimiento al cliente"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={labelClass}>Vence</Label>
                      <Input
                        className={inputClass}
                        type="date"
                        value={form.due_date}
                        onChange={(e) => updateField("due_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={labelClass}>Prioridad</Label>
                      <Select
                        value={form.priority}
                        onValueChange={(value) => updateField("priority", value)}
                      >
                        <SelectTrigger className={selectClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className={labelClass}>Descripción</Label>
                    <Textarea
                      className={textareaClass}
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      rows={3}
                      placeholder="Detalles del seguimiento..."
                    />
                  </div>

                  {context?.sourceType ? (
                    <div className="border-t border-slate-100 px-0 py-3 text-xs font-normal text-slate-500">
                      <FileText className="mr-1 inline h-3.5 w-3.5" />
                      Se creará vinculada a: {context.sourceType}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 lg:px-7">
            <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-slate-200 bg-white font-normal shadow-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-950 font-normal shadow-none"
              >
                {saving ? "Creando..." : "Crear rápido"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
