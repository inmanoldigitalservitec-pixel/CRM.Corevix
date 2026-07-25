import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
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
  convertCurrencyAmount,
  formatCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyInput,
} from "@/lib/currency";
import {
  formatPaymentReceiptFileSize,
  PAYMENT_RECEIPT_ACCEPT,
  uploadPaymentReceipt,
} from "@/lib/payments/payment-receipts";
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
}: PaymentFormDialogProps) {
  const { profile } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialKey = JSON.stringify(initialValues || {});
  const [form, setForm] = useState(() => defaultForm(initialValues, currencySettings.baseCurrency));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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
    select: "id,number,total,client_id,status,currency,invoice_data",
    orderBy: "updated_at",
    ascending: false,
    limit: 1000,
    enabled: open,
  });

  const invoiceById = useMemo(() => new Map(invoices.map((item) => [item.id, item])), [invoices]);

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(initialValues, currencySettings.baseCurrency));
    setReceiptFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [currencySettings.baseCurrency, open, initialKey]);

  const patchForm = (patch: Partial<ReturnType<typeof defaultForm>>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const selectInvoice = async (invoiceId: string) => {
    if (invoiceId === NONE) {
      patchForm({ invoice_id: NONE });
      return;
    }
    const invoice = invoiceById.get(invoiceId);
    patchForm({ invoice_id: invoiceId });
    if (!invoice) return;
    try {
      if (!profile?.company_id) throw new Error("No hay contexto de compañía.");
      const balance = await loadInvoicePaymentBalance(invoice, profile.company_id);
      patchForm({
        invoice_id: invoice.id,
        client_id: invoice.client_id || NONE,
        reference: form.reference || `Pago ${invoice.number}`,
        amount: String(balance.outstandingBalance || Number(invoice.total || 0) || 0),
        currency: getInvoiceCurrency(invoice),
      });
    } catch (error: any) {
      toast.error(error?.message || "No se pudo calcular el saldo pendiente.");
    }
  };

  const handleReceiptFile = (file: File | null) => {
    if (!file) return;
    setReceiptFile(file);
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
        const balance = await loadInvoicePaymentBalance(selectedInvoice, profile.company_id);
        if (amount > balance.outstandingBalance)
          throw new Error("El pago supera el saldo pendiente.");
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
        const amountBase = convertCurrencyAmount(
          amount,
          currency,
          baseCurrency,
          currencySettings.usdToDopRate,
        );
        const { data: createdPayment, error } = await db
          .from("payments")
          .insert({
            company_id: profile.company_id,
            invoice_id: null,
            client_id: normalizeOptionalId(form.client_id),
            amount,
            currency,
            base_currency: baseCurrency,
            exchange_rate: currency === baseCurrency ? 1 : currencySettings.usdToDopRate,
            exchange_rate_source: currencySettings.rateSource,
            exchange_rate_updated_at: currencySettings.rateUpdatedAt,
            amount_base: amountBase,
            payment_date: form.payment_date || todayIso(),
            method: form.method || "Manual",
            status: form.status || "Completed",
            reference: form.reference.trim() || null,
            notes: form.notes.trim() || null,
          })
          .select("*")
          .single();
        if (error) throw error;
        payment = createdPayment as PaymentRow;
      }
      if (!payment?.id) throw new Error("No se pudo confirmar el pago creado.");

      let receiptUploaded = false;
      if (receiptFile) {
        try {
          await uploadPaymentReceipt(receiptFile, {
            companyId: profile.company_id,
            paymentId: String(payment.id),
            invoiceId: payment.invoice_id ? String(payment.invoice_id) : null,
            uploadedBy: profile.id || null,
            originalName: receiptFile.name,
          });
          receiptUploaded = true;
        } catch (receiptError: any) {
          toast.error(
            receiptError?.message || "El pago se creó, pero no se pudo subir el comprobante.",
          );
        }
      }

      toast.success(
        receiptUploaded ? "Pago y comprobante guardados." : "Pago creado correctamente.",
      );
      await onCreated?.({
        payment,
        receiptUploaded,
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
      title="Nuevo pago"
      description="Registra el pago y adjunta el comprobante en el mismo paso."
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

          <Field label="Factura">
            <Select value={form.invoice_id} onValueChange={(value) => void selectInvoice(value)}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ninguna</SelectItem>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.number} ·{" "}
                    {formatCurrencyAmount(invoice.total || 0, getInvoiceCurrency(invoice))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Cliente">
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

          <Field label="Comprobante" className="sm:col-span-2">
            <input
              ref={inputRef}
              type="file"
              accept={PAYMENT_RECEIPT_ACCEPT}
              className="hidden"
              onChange={(event) => handleReceiptFile(event.target.files?.[0] || null)}
            />
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
              {receiptFile ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{receiptFile.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatPaymentReceiptFileSize(receiptFile.size)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReceiptFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    PDF, JPG, PNG o WebP. Máximo 3 MB por archivo.
                  </div>
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    <Paperclip className="mr-2 h-4 w-4" />
                    Adjuntar archivo
                  </Button>
                </div>
              )}
            </div>
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
              <Upload className="mr-2 h-4 w-4" />
            )}
            {saving ? "Guardando..." : "Crear"}
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
