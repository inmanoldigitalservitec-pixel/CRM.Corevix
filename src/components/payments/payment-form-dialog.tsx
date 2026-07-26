import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { useCrud } from "@/hooks/use-crud";
import { supabase } from "@/integrations/supabase/client";
import {
  CURRENCY_OPTIONS,
  formatCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyInput,
} from "@/lib/currency";
import { loadInvoicePaymentBalance } from "@/lib/payments/invoice-payment-balance";

const NONE = "none";
const METHODS = ["Manual", "Cash", "Card", "Bank Transfer", "Check", "Other"];
const STATUSES = ["Pending", "Completed", "Failed", "Refunded"];

const DISPLAY_LABELS: Record<string, string> = {
  Completed: "Completado",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type InvoiceRow = {
  id: string;
  number: string;
  total: number | null;
  client_id: string | null;
  status?: string | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  invoice_data?: Record<string, unknown> | null;
};
type PaymentRow = {
  id: string;
  invoice_id: string | null;
  client_id: string | null;
  amount: number;
  reference: string | null;
  payment_date: string;
  method: string;
  status: string;
  notes: string | null;
};

export type PaymentFormInitialValues = {
  reference?: string;
  invoice_id?: string | null;
  client_id?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  payment_date?: string;
  method?: string;
  status?: string;
  notes?: string;
};

export type PaymentFormCreatedResult = {
  payment: PaymentRow;
  receiptUploaded: boolean;
  becamePaid?: boolean;
  remainingBalance?: number;
  projectId?: string | null;
  projectCreated?: boolean;
  projectError?: string | null;
};

type PaymentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: PaymentFormInitialValues;
  onCreated?: (result: PaymentFormCreatedResult) => void | Promise<void>;
  mode?: "invoice" | "unapplied";
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm(initial: PaymentFormInitialValues | undefined, fallbackCurrency = "USD") {
  return {
    reference: initial?.reference || "",
    invoice_id: initial?.invoice_id || NONE,
    client_id: initial?.client_id || NONE,
    amount: String(initial?.amount ?? "0"),
    currency: normalizeCurrency(initial?.currency || fallbackCurrency),
    payment_date: initial?.payment_date || todayIso(),
    method: initial?.method || "Manual",
    status: initial?.status || "Completed",
    notes: initial?.notes || "",
  };
}

function normalizeOptionalId(value: string) {
  return value && value !== NONE ? value : null;
}

function getInvoiceCurrency(invoice: InvoiceRow | null | undefined) {
  const invoiceData =
    invoice?.invoice_data && typeof invoice.invoice_data === "object" ? invoice.invoice_data : {};
  return normalizeCurrency(invoice?.currency || String(invoiceData.currency || ""));
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  initialValues,
  onCreated,
  mode = "unapplied",
}: PaymentFormDialogProps) {
  const { profile } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const initialKey = JSON.stringify(initialValues || {});
  const [form, setForm] = useState(() => defaultForm(initialValues, currencySettings.baseCurrency));
  const [saving, setSaving] = useState(false);
  const paymentRequestKeyRef = useRef<string | null>(null);
  const isInvoiceMode = mode === "invoice";

  const { data: clients } = useCrud<ClientRow>({
    table: "clients",
    select: "id,company_name,contact_person",
    orderBy: "company_name",
    ascending: true,
    limit: 1000,
    enabled: open,
  });
  const { data: invoices } = useCrud<InvoiceRow>({
    table: "invoices",
    select: "id,number,total,client_id,status,currency,base_currency,exchange_rate,exchange_rate_source,exchange_rate_updated_at,invoice_data",
    orderBy: "updated_at",
    ascending: false,
    limit: 1000,
    enabled: open,
  });

  const invoiceById = useMemo(() => new Map(invoices.map((item) => [item.id, item])), [invoices]);
  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);

  const selectedInvoice =
    form.invoice_id && form.invoice_id !== NONE ? invoiceById.get(form.invoice_id) : null;
  const selectedClient =
    form.client_id && form.client_id !== NONE ? clientById.get(form.client_id) : null;

  useEffect(() => {
    if (!open) {
      paymentRequestKeyRef.current = null;
      return;
    }

    paymentRequestKeyRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setForm(defaultForm(initialValues, currencySettings.baseCurrency));
  }, [currencySettings.baseCurrency, open, initialKey]);

  const patchForm = (patch: Partial<ReturnType<typeof defaultForm>>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) {
      toast.error("No hay contexto de compañía.");
      return;
    }
    const amount = Number(form.amount || 0);
    const currency = normalizeCurrency(form.currency || currencySettings.baseCurrency);
    const baseCurrency = normalizeCurrency(currencySettings.baseCurrency);
    if (!Number.isFinite(amount)) {
      toast.error("El monto no es válido.");
      return;
    }
    if (amount <= 0) {
      toast.error("El monto debe ser mayor que cero.");
      return;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const invoiceId = normalizeOptionalId(form.invoice_id);
      const selectedInvoice = invoiceId ? invoiceById.get(invoiceId) : null;
      let becamePaid = false;
      let remainingBalance: number | undefined;
      let projectId: string | null = null;
      let projectCreated = false;
      let projectError: string | null = null;
      let payment: PaymentRow | null = null;

      if (invoiceId) {
        if (!selectedInvoice)
          throw new Error("No se encontró la factura dentro de la compañía actual.");
        const normalizedInvoiceStatus = String(selectedInvoice.status || "")
          .trim()
          .toLowerCase();
        if (normalizedInvoiceStatus === "cancelled" || normalizedInvoiceStatus === "canceled") {
          throw new Error("Esta factura está cancelada.");
        }
        const balance = await loadInvoicePaymentBalance(
          selectedInvoice,
          profile.company_id,
        );

        const invoiceBaseCurrency = normalizeCurrency(
          selectedInvoice.base_currency ||
            balance.baseCurrency ||
            currencySettings.baseCurrency,
        );

        const effectiveRate = Number(
          selectedInvoice.exchange_rate ||
            currencySettings.usdToDopRate ||
            1,
        );

        const paymentAmountBase =
          currency === invoiceBaseCurrency
            ? amount
            : currency === "USD" && invoiceBaseCurrency === "DOP"
              ? amount * effectiveRate
              : currency === "DOP" && invoiceBaseCurrency === "USD"
                ? amount / effectiveRate
                : amount;

        if (
          String(form.status || "") === "Completed" &&
          paymentAmountBase > balance.outstandingBalanceBase + 0.000001
        ) {
          throw new Error("El pago supera el saldo pendiente.");
        }
        if (String(form.status || "") === "Completed") {
          if (balance.outstandingBalance <= 0) throw new Error("Esta factura ya está pagada.");
        }

        const { data: rpcResult, error } = await db.rpc("register_invoice_payment", {
          p_invoice_id: invoiceId,
          p_amount: amount,
          p_payment_date: form.payment_date || todayIso(),
          p_method: form.method || "Manual",
          p_status: form.status || "Completed",
          p_reference: form.reference.trim() || null,
          p_notes: form.notes.trim() || null,
          p_client_id: normalizeOptionalId(form.client_id),
          p_idempotency_key: paymentRequestKeyRef.current,
          p_currency: currency,
          p_exchange_rate: Number(
            selectedInvoice.exchange_rate ||
              currencySettings.usdToDopRate ||
              1,
          ),
          p_exchange_rate_source:
            selectedInvoice.exchange_rate_source ||
            currencySettings.rateSource,
          p_exchange_rate_updated_at:
            selectedInvoice.exchange_rate_updated_at ||
            currencySettings.rateUpdatedAt,
        });
        if (error) throw error;
        const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
        if (!result?.payment_id) throw new Error("No se pudo confirmar el pago creado.");
        becamePaid = Boolean(result.became_paid);
        remainingBalance = Number(result.remaining_balance || 0) || 0;
        projectId = result.project_id ? String(result.project_id) : null;
        projectCreated = Boolean(result.project_created);
        const rawProjectError =
          typeof result.project_error === "string" ? result.project_error.trim() : "";
        projectError = rawProjectError || null;
        if (projectError) {
          console.error("register_invoice_payment project creation error:", projectError);
          toast.error("El pago se registró, pero no se pudo crear el proyecto automáticamente.");
        }

        const { data: createdPayment, error: paymentLoadError } = await db
          .from("payments")
          .select("*")
          .eq("company_id", profile.company_id)
          .eq("id", result.payment_id)
          .single();
        if (paymentLoadError) throw paymentLoadError;
        payment = createdPayment as PaymentRow;
      } else {
        const { data: rpcResult, error: rpcError } = await db.rpc(
          "register_unapplied_payment",
          {
            p_amount: amount,
            p_payment_date: form.payment_date || todayIso(),
            p_method: form.method || "Manual",
            p_status: form.status || "Completed",
            p_reference: form.reference.trim() || null,
            p_notes: form.notes.trim() || null,
            p_client_id: normalizeOptionalId(form.client_id),
            p_currency: currency,
            p_base_currency: baseCurrency,
            p_exchange_rate:
              currency === baseCurrency
                ? 1
                : currencySettings.usdToDopRate,
            p_exchange_rate_source: currencySettings.rateSource,
            p_exchange_rate_updated_at:
              currencySettings.rateUpdatedAt,
          },
        );

        if (rpcError) throw rpcError;

        const result = Array.isArray(rpcResult)
          ? rpcResult[0]
          : rpcResult;

        if (!result?.payment_id) {
          throw new Error(
            "No se pudo confirmar el pago creado.",
          );
        }

        const {
          data: createdPayment,
          error: paymentLoadError,
        } = await db
          .from("payments")
          .select("*")
          .eq("company_id", profile.company_id)
          .eq("id", result.payment_id)
          .single();

        if (paymentLoadError) throw paymentLoadError;

        payment = createdPayment as PaymentRow;
      }
      if (!payment?.id) throw new Error("No se pudo confirmar el pago creado.");

      toast.success("Pago creado correctamente.");
      paymentRequestKeyRef.current = null;
      await onCreated?.({
        payment,
        receiptUploaded: false,
        becamePaid,
        remainingBalance,
        projectId,
        projectCreated,
        projectError,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear el pago.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrmCreationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isInvoiceMode ? "Registrar pago" : "Registrar pago sin aplicar"}
      description={
        isInvoiceMode
          ? "Registra un pago para la factura seleccionada."
          : "Registra un anticipo o pago que todavía no está vinculado a una factura."
      }
      size="md"
    >
      <form className="space-y-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Referencia" className="sm:col-span-2">
            <Input
              value={form.reference}
              onChange={(event) => patchForm({ reference: event.target.value })}
              className={crmFormStyles.input}
            />
          </Field>

          {isInvoiceMode ? (
            <>
              <Field label="Factura">
                <div className="flex min-h-12 items-center border-b border-slate-200 py-2 text-sm font-normal text-slate-950 sm:rounded-xl sm:border sm:px-3">
                  {selectedInvoice ? (
                    <span>
                      {selectedInvoice.number} ·{" "}
                      {formatCurrencyAmount(
                        selectedInvoice.total || 0,
                        getInvoiceCurrency(selectedInvoice),
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-500">Factura seleccionada</span>
                  )}
                </div>
              </Field>

              <Field label="Cliente">
                <div className="flex min-h-12 items-center border-b border-slate-200 py-2 text-sm font-normal text-slate-950 sm:rounded-xl sm:border sm:px-3">
                  {selectedClient ? (
                    selectedClient.contact_person ? (
                      `${selectedClient.company_name} · ${selectedClient.contact_person}`
                    ) : (
                      selectedClient.company_name
                    )
                  ) : (
                    <span className="text-slate-500">Cliente de la factura</span>
                  )}
                </div>
              </Field>
            </>
          ) : (
            <Field label="Cliente" className="sm:col-span-2">
              <Select value={form.client_id} onValueChange={(client_id) => patchForm({ client_id })}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguno</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.contact_person
                        ? `${client.company_name} · ${client.contact_person}`
                        : client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Monto">
            <Input
              type="number"
              min="0"
              step={getCurrencyStep(form.currency)}
              inputMode={getCurrencyInputMode(form.currency)}
              value={form.amount}
              onChange={(event) => patchForm({ amount: event.target.value })}
              onBlur={(event) =>
                patchForm({ amount: normalizeCurrencyInput(event.target.value, form.currency) })
              }
              className={crmFormStyles.input}
            />
          </Field>

          <Field label="Moneda">
            <Select
              value={normalizeCurrency(form.currency)}
              onValueChange={(currency) => patchForm({ currency: normalizeCurrency(currency) })}
              disabled={form.invoice_id !== NONE}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.symbol} · {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isInvoiceMode && selectedInvoice ? (
            <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              {normalizeCurrency(form.currency) ===
              getInvoiceCurrency(selectedInvoice) ? (
                <span>
                  El pago se aplicará directamente en la moneda de la factura.
                </span>
              ) : (
                <span>
                  Pago recibido en {normalizeCurrency(form.currency)}. Se
                  convertirá a {getInvoiceCurrency(selectedInvoice)} usando una
                  tasa de{" "}
                  {Number(
                    selectedInvoice.exchange_rate ||
                      currencySettings.usdToDopRate ||
                      1,
                  ).toLocaleString("es-DO")}.
                </span>
              )}
            </div>
          ) : null}

          <Field label="Fecha de pago">
            <Input
              type="date"
              value={form.payment_date}
              onChange={(event) => patchForm({ payment_date: event.target.value })}
              className={crmFormStyles.input}
            />
          </Field>

          <Field label="Método">
            <Select value={form.method} onValueChange={(method) => patchForm({ method })}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {displayLabel(method)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={form.status} onValueChange={(status) => patchForm({ status })}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {displayLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notas" className="sm:col-span-2">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(event) => patchForm({ notes: event.target.value })}
              className={crmFormStyles.textarea}
            />
          </Field>
        </div>

        <div className={crmFormStyles.footer}>
          <Button
            type="button"
            variant="ghost"
            className={crmFormStyles.cancelButton}
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" className={crmFormStyles.primaryButton} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {saving ? "Registrando..." : "Registrar pago"}
          </Button>
        </div>
      </form>
    </CrmCreationDialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `space-y-1.5 ${className}` : "space-y-1.5"}>
      <Label className={crmFormStyles.label}>{label}</Label>
      {children}
    </div>
  );
}
