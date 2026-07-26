import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { crmFormStyles } from "@/components/crm/crm-form-shell";
import { SalesDocumentLineEditor } from "@/components/sales/sales-document-line-editor";
import type {
  SalesDocumentLineItem,
  SalesDocumentTotals,
} from "@/components/sales/sales-document-line-editor";
import type { CompanyTax } from "@/hooks/use-company-taxes";
import {
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
} from "@/lib/currency";

export type { SalesDocumentLineItem, SalesDocumentTotals } from "@/components/sales/sales-document-line-editor";

export type SalesDocumentMode = "proposal" | "estimate";

export type SalesDocumentBuilderForm = {
  title: string;
  documentDate: string;
  validUntil: string;
  clientId: string | null;
  productId: string | null;
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
  notes?: string;
  terms?: string;
};

type SelectOption = {
  label: string;
  value: string;
};


export function SalesDocumentBuilder({
  mode,
  form,
  setForm,
  lineItems,
  totals,
  statuses,
  currentAssigneeName,
  clientOptions,
  productOptions,
  taxes,
  taxById,
  rateSource,
  rateUpdatedAt,
  onCurrencyChange,
  onClientChange,
  onProductChange,
  onAddProductLine,
  onAddBlankLine,
  onLinePatch,
  onRemoveLine,
  normalizeMoneyInput,
  formatStatusLabel,
}: {
  mode: SalesDocumentMode;
  form: SalesDocumentBuilderForm;
  setForm: Dispatch<SetStateAction<any>>;
  lineItems: SalesDocumentLineItem[];
  totals: SalesDocumentTotals;
  statuses: string[];
  currentAssigneeName: string;
  clientOptions: SelectOption[];
  productOptions: SelectOption[];
  taxes: CompanyTax[];
  taxById: Map<string, CompanyTax>;
  rateSource: string;
  rateUpdatedAt: string | null;
  onCurrencyChange: (currency: string) => void;
  onClientChange: (clientId: string | null) => void;
  onProductChange: (productId: string | null) => void;
  onAddProductLine: (productId: string) => void;
  onAddBlankLine: () => void;
  onLinePatch: (id: string, patch: Partial<SalesDocumentLineItem>) => void;
  onRemoveLine: (id: string) => void;
  normalizeMoneyInput: (value: string, currency: string) => string;
  formatStatusLabel?: (status: string) => string;
}) {
  const isEstimate = mode === "estimate";
  const moneyStep = getCurrencyStep(form.currency);
  const moneyMode = getCurrencyInputMode(form.currency);
  const moneyUnitLabel = normalizeCurrency(form.currency) === "DOP" ? "RD$" : "US$";
  const titleLabel = isEstimate ? "Título de cotización" : "Asunto";
  const relatedLabel = isEstimate ? "Cliente" : "Relacionado";
  const dateLabel = isEstimate ? "Fecha de cotización" : "Fecha";
  const validUntilLabel = isEstimate ? "Vence" : "Abierta hasta";
  const productLabel = isEstimate ? "Producto / servicio base" : "Producto / servicio";
  const addItemLabel = isEstimate ? "Agregar producto o servicio" : "Agregar ítem";

  const patchForm = (patch: Partial<SalesDocumentBuilderForm>) => {
    setForm((current: any) => ({ ...current, ...patch }));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-0 border-b border-slate-200 lg:grid-cols-2">
        <div className="space-y-5 p-4 sm:p-6 lg:border-r lg:border-slate-200">
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>
              <span className="text-rose-500">*</span> {titleLabel}
            </Label>
            <Input
              className={crmFormStyles.input}
              value={form.title}
              onChange={(event) => patchForm({ title: event.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>
              <span className="text-rose-500">*</span> {relatedLabel}
            </Label>
            <Select value={form.clientId || "none"} onValueChange={(value) => onClientChange(value === "none" ? null : value)}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue placeholder="Nada seleccionado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nada seleccionado</SelectItem>
                {clientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>
                <span className="text-rose-500">*</span> {dateLabel}
              </Label>
              <Input
                className={crmFormStyles.input}
                type="date"
                value={form.documentDate}
                onChange={(event) => patchForm({ documentDate: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>{validUntilLabel}</Label>
              <Input
                className={crmFormStyles.input}
                type="date"
                value={form.validUntil}
                onChange={(event) => patchForm({ validUntil: event.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>
                <span className="text-rose-500">*</span> Moneda
              </Label>
              <Select value={form.currency || "USD"} onValueChange={onCurrencyChange}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">US$ · Dólares</SelectItem>
                  <SelectItem value="DOP">RD$ · Peso dominicano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Tipo de descuento</Label>
              <Select
                value={form.discountType || "none"}
                onValueChange={(value) =>
                  patchForm({
                    discountType: value,
                    discountValue: value === "none" ? "" : form.discountValue,
                  })
                }
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin descuento</SelectItem>
                  <SelectItem value="fixed">Monto fijo</SelectItem>
                  <SelectItem value="percent">Porcentaje</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>{productLabel}</Label>
            <Select
              value={form.productId || "none"}
              onValueChange={(value) => onProductChange(value === "none" ? null : value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue placeholder="Selecciona un producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin producto</SelectItem>
                {productOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
              onChange={(event) => patchForm({ tags: event.target.value })}
              placeholder="web, mantenimiento, mensual"
            />
          </div>

          {!isEstimate ? (
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Checkbox
                checked={form.allowComments}
                onCheckedChange={(checked) => patchForm({ allowComments: checked === true })}
              />
              Permitir comentarios
            </label>
          ) : null}
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Estado</Label>
              <Select value={form.status} onValueChange={(value) => patchForm({ status: value })}>
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel ? formatStatusLabel(status) : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Responsable</Label>
              <Select
                value={form.assignedTo || currentAssigneeName}
                onValueChange={(value) => patchForm({ assignedTo: value })}
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentAssigneeName}>{currentAssigneeName}</SelectItem>
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
              onChange={(event) => patchForm({ recipientName: event.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Dirección</Label>
            <Textarea
              className={crmFormStyles.textarea}
              value={form.recipientAddress}
              onChange={(event) => patchForm({ recipientAddress: event.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Ciudad</Label>
              <Input
                className={crmFormStyles.input}
                value={form.recipientCity}
                onChange={(event) => patchForm({ recipientCity: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Provincia / estado</Label>
              <Input
                className={crmFormStyles.input}
                value={form.recipientState}
                onChange={(event) => patchForm({ recipientState: event.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>País</Label>
              <Select
                value={form.recipientCountry || "none"}
                onValueChange={(value) =>
                  patchForm({ recipientCountry: value === "none" ? "" : value })
                }
              >
                <SelectTrigger className={crmFormStyles.select}>
                  <SelectValue placeholder="Nada seleccionado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nada seleccionado</SelectItem>
                  <SelectItem value="República Dominicana">República Dominicana</SelectItem>
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
                onChange={(event) => patchForm({ recipientZipCode: event.target.value })}
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
                onChange={(event) => patchForm({ recipientEmail: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Teléfono</Label>
              <Input
                className={crmFormStyles.input}
                value={form.recipientPhone}
                onChange={(event) => patchForm({ recipientPhone: event.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <SalesDocumentLineEditor
          mode={mode}
          form={{
            currency: form.currency,
            discountType: form.discountType,
            discountValue: form.discountValue,
            adjustmentValue: form.adjustmentValue,
            quantityMode: form.quantityMode,
          }}
          lineItems={lineItems}
          totals={totals}
          productOptions={productOptions}
          taxes={taxes}
          taxById={taxById}
          addItemLabel={addItemLabel}
          rateSource={rateSource}
          rateUpdatedAt={rateUpdatedAt}
          onAddProductLine={onAddProductLine}
          onAddBlankLine={onAddBlankLine}
          onLinePatch={onLinePatch}
          onRemoveLine={onRemoveLine}
          onFormPatch={(patch) => patchForm(patch)}
          normalizeMoneyInput={normalizeMoneyInput}
        />

        <div className="grid grid-cols-1 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>
              {isEstimate ? "Nota para el cliente" : "Nota del cliente"}
            </Label>
            <Textarea
              className={crmFormStyles.textarea}
              value={form.notes || ""}
              onChange={(event) => patchForm({ notes: event.target.value } as any)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Términos y condiciones</Label>
            <Textarea
              className={crmFormStyles.textarea}
              value={form.terms || ""}
              onChange={(event) => patchForm({ terms: event.target.value } as any)}
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
