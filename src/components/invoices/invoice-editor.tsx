import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, Plus, Receipt, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CrmDetailLineButton } from "@/components/crm/crm-detail-layout";
import { formatInvoiceMoney } from "@/components/invoices/invoice-utils";

export type InvoiceEditorItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type InvoiceEditorClient = {
  id: string;
  company_name: string;
  contact_person: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
};

export type InvoiceEditorProduct = {
  id: string;
  name: string;
  base_price?: number | null;
  currency?: string | null;
  description?: string | null;
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

type InvoiceEditorProps = {
  mode: "create" | "edit";
  initialDraft: InvoiceEditorDraft;
  clients: InvoiceEditorClient[];
  products: InvoiceEditorProduct[];
  proposals: InvoiceEditorProposal[];
  statusOptions: string[];
  publicToken?: string | null;
  publicUrl?: string | null;
  saving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onCopyPublic?: () => void;
  onOpenPublic?: () => void;
  onRegisterPayment?: (draft: InvoiceEditorDraft) => Promise<void> | void;
  canRegisterPayment?: boolean;
  registerPaymentHint?: string;
  paymentFeedback?: InvoicePaymentFeedback | null;
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

function lineTotal(item: Pick<InvoiceEditorItem, "quantity" | "unit_price">) {
  return Math.max(0, cleanNumber(item.quantity)) * Math.max(0, cleanNumber(item.unit_price));
}

function emptyLine(): InvoiceEditorItem {
  return { description: "", quantity: 1, unit_price: 0, total: 0 };
}

function hasLineContent(item: InvoiceEditorItem) {
  return Boolean(String(item.description || "").trim()) || cleanNumber(item.unit_price) > 0;
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
  statusOptions,
  publicToken,
  publicUrl,
  saving = false,
  error,
  onCancel,
  onCopyPublic,
  onOpenPublic,
  onRegisterPayment,
  canRegisterPayment = false,
  registerPaymentHint,
  paymentFeedback,
  onSaveDraft,
  onConfirmSend,
}: InvoiceEditorProps) {
  const [draft, setDraft] = useState<InvoiceEditorDraft>(initialDraft);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
    setValidationError(null);
    setReviewOpen(false);
  }, [initialDraft]);

  const totals = useMemo(() => {
    const validItems = draft.items.filter((item) => String(item.description || "").trim());
    const subtotal =
      validItems.length > 0
        ? validItems.reduce((sum, item) => sum + lineTotal(item), 0)
        : Math.max(0, cleanNumber(draft.legacySubtotal));
    const tax = Math.max(0, cleanNumber(draft.tax));
    const discount = Math.max(0, cleanNumber(draft.discount));
    return { subtotal, tax, discount, total: Math.max(0, subtotal + tax - discount) };
  }, [draft.discount, draft.items, draft.tax, initialDraft.items.length]);

  const selectedClient = draft.client_id
    ? clients.find((client) => client.id === draft.client_id)
    : null;
  const selectedProduct = draft.product_id
    ? products.find((product) => product.id === draft.product_id)
    : null;
  const selectedProposal = draft.proposal_id
    ? proposals.find((proposal) => proposal.id === draft.proposal_id)
    : null;

  const patchDraft = (patch: Partial<InvoiceEditorDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
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
      clientAddress: cleanText(client?.address),
      clientTaxId: cleanText(client?.tax_id),
    }));
  };

  const applyProduct = (productId: string) => {
    const product =
      productId === NONE_PRODUCT ? null : products.find((item) => item.id === productId);
    setDraft((current) => {
      if (!product) return { ...current, product_id: null };
      const description = cleanText(product.description) || product.name;
      const price = Math.max(0, cleanNumber(product.base_price));
      const nextItems = [...current.items];
      const emptyIndex = nextItems.findIndex((item) => !hasLineContent(item));
      if (!nextItems.length) {
        nextItems.push({ description, quantity: 1, unit_price: price, total: price });
      } else if (emptyIndex >= 0) {
        nextItems[emptyIndex] = {
          ...nextItems[emptyIndex],
          description,
          quantity: 1,
          unit_price: price,
          total: price,
        };
      }
      return {
        ...current,
        product_id: product.id,
        currency: cleanText(product.currency) || current.currency,
        productName: fillEmpty(current.productName, product.name),
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
      const price = Math.max(0, cleanNumber(proposal.amount || product?.base_price));
      const nextItems = [...current.items];
      const emptyIndex = nextItems.findIndex((item) => !hasLineContent(item));
      if (!nextItems.length) {
        nextItems.push({ description, quantity: 1, unit_price: price, total: price });
      } else if (emptyIndex >= 0 && price > 0) {
        nextItems[emptyIndex] = {
          ...nextItems[emptyIndex],
          description,
          quantity: 1,
          unit_price: price,
          total: price,
        };
      }
      return {
        ...current,
        proposal_id: proposal.id,
        client_id: current.client_id || proposal.client_id || null,
        product_id: current.product_id || proposal.product_id || null,
        currency: cleanText(proposal.currency) || cleanText(product?.currency) || current.currency,
        relatedProposalNumber: fillEmpty(current.relatedProposalNumber, proposal.number),
        relatedProposalTitle: fillEmpty(current.relatedProposalTitle, proposal.title),
        productName: fillEmpty(current.productName, product?.name || null),
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
      if (!cleanText(item.description)) return "Cada línea debe tener descripción.";
      if (cleanNumber(item.quantity) <= 0) return "La cantidad debe ser mayor que 0.";
      if (cleanNumber(item.unit_price) < 0) return "El precio unitario no puede ser negativo.";
    }
    if (totals.total < 0) return "El total final no puede ser negativo.";
    return null;
  };

  const normalizedDraft = (status: string): InvoiceEditorDraft => ({
    ...draft,
    status,
    tax: Math.max(0, cleanNumber(draft.tax)),
    discount: Math.max(0, cleanNumber(draft.discount)),
    items: draft.items.map((item) => ({ ...item, total: lineTotal(item) })),
  });

  const saveDraft = async () => {
    const message = validateDraft();
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    await onSaveDraft(normalizedDraft("Draft"));
  };

  const registerPayment = async () => {
    const message = validateDraft();
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    await onRegisterPayment?.(normalizedDraft("Draft"));
  };

  const openReview = () => {
    const message = validateDraft();
    if (message) {
      setValidationError(message);
      return;
    }
    setValidationError(null);
    setReviewOpen(true);
  };

  const confirmSend = async () => {
    await onConfirmSend(normalizedDraft("Sent"));
    setReviewOpen(false);
  };

  return (
    <div className="space-y-4">
      {isIssuedStatus(draft.status) ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Esta factura ya fue emitida. Puedes editarla, pero revisa los cambios financieros antes de
          guardar.
        </div>
      ) : null}
      {error || validationError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error || validationError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <EditorSection title="Cliente y origen">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Número">
                <Input
                  value={draft.number}
                  onChange={(event) => patchDraft({ number: event.target.value })}
                />
              </Field>
              <Field label="Estado">
                <Select value={draft.status} onValueChange={(status) => patchDraft({ status })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Cliente">
                <Select value={draft.client_id || NONE_CLIENT} onValueChange={selectClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_CLIENT}>Sin cliente</SelectItem>
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
              <Field label="Propuesta">
                <Select value={draft.proposal_id || NONE_PROPOSAL} onValueChange={applyProposal}>
                  <SelectTrigger>
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
              <Field label="Producto / servicio">
                <Select value={draft.product_id || NONE_PRODUCT} onValueChange={applyProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_PRODUCT}>Sin producto</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Moneda">
                <Input
                  value={draft.currency}
                  onChange={(event) => patchDraft({ currency: event.target.value.toUpperCase() })}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Fechas">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha emitida">
                <Input
                  type="date"
                  value={draft.date_issued}
                  onChange={(event) => patchDraft({ date_issued: event.target.value })}
                />
              </Field>
              <Field label="Vence">
                <Input
                  type="date"
                  value={draft.due_date}
                  onChange={(event) => patchDraft({ due_date: event.target.value })}
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Artículos">
            <InvoiceLineItemsEditor
              items={draft.items}
              onChange={(items) => patchDraft({ items })}
              onUpdate={updateLine}
              products={products}
              onSelectProduct={applyProduct}
            />
          </EditorSection>

          <EditorSection title="Pagos">
            {paymentFeedback ? (
              <div
                className={
                  paymentFeedback.status === "registered"
                    ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-950"
                    : "rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-blue-950"
                }
              >
                <div className="flex items-start gap-3">
                  {paymentFeedback.status === "registered" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold">{paymentFeedback.title}</div>
                    {paymentFeedback.description ? (
                      <div className="mt-1 text-sm opacity-80">{paymentFeedback.description}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {paymentFeedback?.status === "registered"
                  ? "Puedes registrar otro pago para esta factura si hace falta."
                  : "Registra pagos y adjunta comprobantes directamente al CRM."}
              </p>
              <Button
                type="button"
                variant={paymentFeedback?.status === "registered" ? "secondary" : "outline"}
                onClick={registerPayment}
                disabled={
                  !canRegisterPayment ||
                  !onRegisterPayment ||
                  saving ||
                  paymentFeedback?.status === "preparing"
                }
              >
                {paymentFeedback?.status === "preparing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                {paymentFeedback?.status === "registered"
                  ? "Registrar otro pago"
                  : "Registrar pago"}
              </Button>
            </div>
            {registerPaymentHint && !paymentFeedback ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {registerPaymentHint}
              </div>
            ) : null}
          </EditorSection>

          <EditorSection title="Notas">
            <Field label="Notas internas">
              <Textarea
                value={draft.notes || ""}
                onChange={(event) => patchDraft({ notes: event.target.value })}
                rows={3}
              />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Propuesta #">
                <Input
                  value={draft.relatedProposalNumber || ""}
                  onChange={(event) => patchDraft({ relatedProposalNumber: event.target.value })}
                />
              </Field>
              <Field label="Título propuesta">
                <Input
                  value={draft.relatedProposalTitle || ""}
                  onChange={(event) => patchDraft({ relatedProposalTitle: event.target.value })}
                />
              </Field>
              <Field label="Emisor">
                <Input
                  value={draft.issuerName || ""}
                  onChange={(event) => patchDraft({ issuerName: event.target.value })}
                />
              </Field>
              <Field label="Correo emisor">
                <Input
                  value={draft.issuerEmail || ""}
                  onChange={(event) => patchDraft({ issuerEmail: event.target.value })}
                />
              </Field>
              <Field label="ID fiscal emisor">
                <Input
                  value={draft.issuerTaxId || ""}
                  onChange={(event) => patchDraft({ issuerTaxId: event.target.value })}
                />
              </Field>
              <Field label="Teléfono emisor">
                <Input
                  value={draft.issuerPhone || ""}
                  onChange={(event) => patchDraft({ issuerPhone: event.target.value })}
                />
              </Field>
              <Field label="Sitio web">
                <Input
                  value={draft.issuerWebsite || ""}
                  onChange={(event) => patchDraft({ issuerWebsite: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Dirección emisor" className="mt-4">
              <Textarea
                value={draft.issuerAddress || ""}
                onChange={(event) => patchDraft({ issuerAddress: event.target.value })}
                rows={2}
              />
            </Field>
          </EditorSection>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <InvoiceEditorSummary
            draft={draft}
            client={selectedClient}
            currency={draft.currency}
            subtotal={totals.subtotal}
            tax={draft.tax}
            discount={draft.discount}
            total={totals.total}
            onTaxChange={(tax) => patchDraft({ tax })}
            onDiscountChange={(discount) => patchDraft({ discount })}
          />
          <EditorSection title="Acciones">
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
              <CrmDetailLineButton type="button" onClick={saveDraft} disabled={saving}>
                Guardar borrador
              </CrmDetailLineButton>
              <CrmDetailLineButton type="button" onClick={openReview} disabled={saving}>
                <Send className="mr-2 h-4 w-4" /> Revisar y enviar
              </CrmDetailLineButton>
              <CrmDetailLineButton type="button" onClick={onCancel} disabled={saving}>
                Cancelar
              </CrmDetailLineButton>
            </div>
            {mode === "edit" ? (
              <div className="mt-3 border-b border-slate-100 pb-3 text-xs font-normal text-slate-500">
                {publicUrl
                  ? "Enlace público disponible."
                  : "Guarda la factura para generar o conservar su enlace público."}
              </div>
            ) : null}
            {publicToken ? (
              <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-1">
                <CrmDetailLineButton type="button" onClick={onCopyPublic}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Copiar enlace
                </CrmDetailLineButton>
                <CrmDetailLineButton type="button" onClick={onOpenPublic}>
                  Abrir pública
                </CrmDetailLineButton>
              </div>
            ) : null}
          </EditorSection>
        </div>
      </div>

      <InvoiceReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        draft={draft}
        client={selectedClient}
        items={draft.items.filter(hasLineContent)}
        totals={totals}
        saving={saving}
        onConfirm={confirmSend}
      />
    </div>
  );
}

function isIssuedStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === "sent" || normalized === "overdue" || normalized === "paid";
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
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-100 bg-white pb-5">
      <div className="mb-4 text-sm font-normal text-slate-900">{title}</div>
      {children}
    </section>
  );
}

function InvoiceLineItemsEditor({
  items,
  products,
  onChange,
  onUpdate,
  onSelectProduct,
}: {
  items: InvoiceEditorItem[];
  products: InvoiceEditorProduct[];
  onChange: (items: InvoiceEditorItem[]) => void;
  onUpdate: (index: number, patch: Partial<InvoiceEditorItem>) => void;
  onSelectProduct: (productId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select onValueChange={onSelectProduct}>
          <SelectTrigger className="w-full sm:w-[260px]">
            <SelectValue placeholder="Crear línea desde producto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => onChange([...items, emptyLine()])}>
          <Plus className="mr-2 h-4 w-4" /> Agregar artículo
        </Button>
      </div>

      {!items.length ? (
        <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
          Esta factura no tiene artículos. Agrega uno cuando quieras detallar el cobro.
        </div>
      ) : null}

      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="grid gap-3 rounded-lg border bg-muted/10 p-3 sm:grid-cols-12"
        >
          <Field label="Descripción" className="sm:col-span-5">
            <Input
              value={item.description}
              onChange={(event) => onUpdate(index, { description: event.target.value })}
            />
          </Field>
          <Field label="Cantidad" className="sm:col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={String(item.quantity)}
              onChange={(event) => onUpdate(index, { quantity: cleanNumber(event.target.value) })}
            />
          </Field>
          <Field label="Precio" className="sm:col-span-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={String(item.unit_price)}
              onChange={(event) => onUpdate(index, { unit_price: cleanNumber(event.target.value) })}
            />
          </Field>
          <Field label="Total" className="sm:col-span-2">
            <Input value={String(lineTotal(item))} readOnly />
          </Field>
          <div className="flex items-end justify-end sm:col-span-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvoiceEditorSummary({
  draft,
  client,
  currency,
  subtotal,
  tax,
  discount,
  total,
  onTaxChange,
  onDiscountChange,
}: {
  draft: InvoiceEditorDraft;
  client: InvoiceEditorClient | null | undefined;
  currency: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  onTaxChange: (value: number) => void;
  onDiscountChange: (value: number) => void;
}) {
  const clientSummary = {
    name: draft.clientName || client?.contact_person || "—",
    company: draft.clientCompany || client?.company_name || "—",
    email: draft.clientEmail || client?.email || "—",
    phone: draft.clientPhone || client?.phone || "—",
    taxId: draft.clientTaxId || client?.tax_id || "—",
    address: draft.clientAddress || client?.address || "—",
    product: draft.productName || "—",
  };

  return (
    <EditorSection title="Resumen">
      <div className="space-y-5">
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Cliente
            </p>
            <p className="mt-1 text-sm font-semibold leading-5 text-slate-950">
              {clientSummary.company}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{clientSummary.name}</p>
          </div>
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <SummaryDetail label="Correo" value={clientSummary.email} />
            <SummaryDetail label="Teléfono" value={clientSummary.phone} />
            <SummaryDetail label="ID fiscal / RNC" value={clientSummary.taxId} />
            <SummaryDetail label="Producto visible" value={clientSummary.product} />
            <SummaryDetail label="Dirección" value={clientSummary.address} multiline />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Totales
          </p>
          <SummaryRow label="Subtotal" value={formatInvoiceMoney(subtotal, currency)} />
          <Field label="Impuesto">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={String(tax)}
              onChange={(event) => onTaxChange(cleanNumber(event.target.value))}
            />
          </Field>
          <Field label="Descuento">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={String(discount)}
              onChange={(event) => onDiscountChange(cleanNumber(event.target.value))}
            />
          </Field>
          <div className="border-t pt-3">
            <SummaryRow label="Total" value={formatInvoiceMoney(total, currency)} strong />
          </div>
        </div>
      </div>
    </EditorSection>
  );
}

function SummaryDetail({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "space-y-0.5" : "flex items-start justify-between gap-3"}>
      <span className="shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span
        className={
          multiline
            ? "block break-words text-xs leading-5 text-slate-800"
            : "min-w-0 break-words text-right text-xs leading-5 text-slate-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={strong ? "text-base font-bold text-slate-950" : "font-semibold text-slate-900"}
      >
        {value}
      </span>
    </div>
  );
}

function InvoiceReviewDialog({
  open,
  onOpenChange,
  draft,
  client,
  items,
  totals,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: InvoiceEditorDraft;
  client: InvoiceEditorClient | null | undefined;
  items: InvoiceEditorItem[];
  totals: { subtotal: number; tax: number; discount: number; total: number };
  saving: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar factura antes de enviar</DialogTitle>
          <DialogDescription>
            Confirma los datos. Esta acción marcará la factura como enviada, sin enviar email
            externo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
            <ReviewField label="Número" value={draft.number} />
            <ReviewField
              label="Destinatario"
              value={draft.clientEmail || client?.email || "Sin correo"}
            />
            <ReviewField
              label="Cliente"
              value={
                draft.clientCompany || client?.company_name || draft.clientName || "Sin cliente"
              }
            />
            <ReviewField label="Fecha emitida" value={draft.date_issued} />
            <ReviewField label="Vencimiento" value={draft.due_date} />
          </div>
          <div className="min-w-0 rounded-lg border">
            {items.map((item, index) => (
              <div
                key={`${item.id || index}`}
                className="flex min-w-0 items-start justify-between gap-3 border-b px-3 py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="break-words font-medium leading-snug">{item.description}</div>
                  <div className="text-xs text-muted-foreground">
                    x{item.quantity} · {formatInvoiceMoney(item.unit_price, draft.currency)}
                  </div>
                </div>
                <div className="shrink-0 whitespace-nowrap text-right font-semibold">
                  {formatInvoiceMoney(lineTotal(item), draft.currency)}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-lg bg-muted/40 p-3">
            <SummaryRow
              label="Subtotal"
              value={formatInvoiceMoney(totals.subtotal, draft.currency)}
            />
            <SummaryRow label="Impuestos" value={formatInvoiceMoney(totals.tax, draft.currency)} />
            <SummaryRow
              label="Descuento"
              value={formatInvoiceMoney(totals.discount, draft.currency)}
            />
            <SummaryRow
              label="Total"
              value={formatInvoiceMoney(totals.total, draft.currency)}
              strong
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Volver a editar
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={onConfirm} disabled={saving}>
            Confirmar como enviada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words font-medium text-slate-950">{value}</div>
    </div>
  );
}
