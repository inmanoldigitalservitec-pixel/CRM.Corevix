import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { crmFormStyles } from "@/components/crm/crm-form-shell";
import { formatCurrencyAmount, getCurrencyInputMode, getCurrencyStep, normalizeCurrency } from "@/lib/currency";
import {
  formatTaxOptionLabel,
  normalizeTaxRate,
  type CompanyTax,
} from "@/hooks/use-company-taxes";

const NO_TAX_VALUE = "__no_tax__";

export type SalesDocumentLineItem = {
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
};

export type SalesDocumentTotals = {
  subtotal: number;
  taxTotal: number;
  discount: number;
  adjustment: number;
  total: number;
};

type SelectOption = {
  label: string;
  value: string;
};

type LineEditorForm = {
  currency: string;
  discountType: string;
  discountValue: string;
  adjustmentValue: string;
  quantityMode: string;
};

type SalesDocumentLineEditorProps = {
  mode: string;
  form: LineEditorForm;
  lineItems: SalesDocumentLineItem[];
  totals: SalesDocumentTotals;
  productOptions: SelectOption[];
  taxes: CompanyTax[];
  taxById: Map<string, CompanyTax>;
  addItemLabel: string;
  rateSource?: string | null;
  rateUpdatedAt?: string | null;
  showAdjustment?: boolean;
  showOptional?: boolean;
  showQuantityMode?: boolean;
  emptyMessage?: string;
  onAddProductLine: (productId: string) => void;
  onAddBlankLine: () => void;
  onLinePatch: (lineId: string, patch: Partial<SalesDocumentLineItem>) => void;
  onRemoveLine: (lineId: string) => void;
  onFormPatch: (patch: Partial<LineEditorForm>) => void;
  normalizeMoneyInput: (value: string, currency?: string | null) => string;
};

export function SalesDocumentLineEditor({
  mode,
  form,
  lineItems,
  totals,
  productOptions,
  taxes,
  taxById,
  addItemLabel,
  rateSource,
  rateUpdatedAt,
  showAdjustment = true,
  showOptional = true,
  showQuantityMode = true,
  emptyMessage = "Agrega productos o líneas manuales para construir el documento.",
  onAddProductLine,
  onAddBlankLine,
  onLinePatch,
  onRemoveLine,
  onFormPatch,
  normalizeMoneyInput,
}: SalesDocumentLineEditorProps) {
  const moneyStep = getCurrencyStep(form.currency);
  const moneyMode = getCurrencyInputMode(form.currency);
  const moneyUnitLabel = normalizeCurrency(form.currency) === "DOP" ? "RD$" : "US$";
  const [adjustmentOpen, setAdjustmentOpen] = useState(
    () => Math.abs(Number(form.adjustmentValue) || 0) > 0,
  );

  useEffect(() => {
    setAdjustmentOpen(Math.abs(Number(form.adjustmentValue) || 0) > 0);
  }, [form.adjustmentValue]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full max-w-[460px] overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Select
            value="none"
            onValueChange={(value) => {
              if (value !== "none") onAddProductLine(value);
            }}
          >
            <SelectTrigger className="h-10 flex-1 rounded-none border-0 px-3 shadow-none focus:ring-0">
              <SelectValue placeholder={addItemLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{addItemLabel}</SelectItem>
              {productOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-12 rounded-none border-0 border-l border-slate-200 bg-white px-0 shadow-none"
            onClick={onAddBlankLine}
            title={addItemLabel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showQuantityMode ? (
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
                  name={`${mode}-quantity-mode`}
                  className="h-4 w-4 accent-blue-600"
                  checked={form.quantityMode === value}
                  onChange={() => onFormPatch({ quantityMode: value })}
                />
                {label}
              </label>
            ))}
          </div>
        ) : null}
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
            {lineItems.length ? (
              lineItems.map((line) => {
                const quantity = Number(line.quantity || 0);
                const rate = Number(line.rate || 0);
                const tax = Number(line.tax || 0);
                const base = Number.isFinite(quantity * rate) ? quantity * rate : 0;
                const amount = line.optional
                  ? 0
                  : base + base * ((Number.isFinite(tax) ? tax : 0) / 100);

                return (
                  <TableRow key={line.id} className="align-top">
                    <TableCell className="align-top">
                      <Textarea
                        className="min-h-[92px] rounded-lg align-top"
                        value={line.item}
                        onChange={(event) => onLinePatch(line.id, { item: event.target.value })}
                        placeholder="Descripción"
                      />
                      {showOptional ? (
                        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                          <Checkbox
                            checked={line.optional}
                            onCheckedChange={(checked) =>
                              onLinePatch(line.id, { optional: checked === true })
                            }
                          />
                          Este ítem es opcional
                        </label>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        className="min-h-[92px] rounded-lg align-top"
                        value={line.description}
                        onChange={(event) =>
                          onLinePatch(line.id, { description: event.target.value })
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
                        onChange={(event) => onLinePatch(line.id, { quantity: event.target.value })}
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
                        onChange={(event) =>
                          onLinePatch(line.id, {
                            rate: event.target.value,
                            documentCurrency: normalizeCurrency(form.currency),
                            originalCurrency: normalizeCurrency(form.currency),
                            originalRate: event.target.value,
                            convertedRate: event.target.value,
                            exchangeRate: 1,
                            exchangeRateSource: rateSource,
                            exchangeRateUpdatedAt: rateUpdatedAt,
                          })
                        }
                        onBlur={(event) => {
                          const normalizedRate = normalizeMoneyInput(event.target.value, form.currency);
                          onLinePatch(line.id, {
                            rate: normalizedRate,
                            documentCurrency: normalizeCurrency(form.currency),
                            originalCurrency: normalizeCurrency(form.currency),
                            originalRate: normalizedRate,
                            convertedRate: normalizedRate,
                            exchangeRate: 1,
                            exchangeRateSource: rateSource,
                            exchangeRateUpdatedAt: rateUpdatedAt,
                          });
                        }}
                        placeholder="Tarifa"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Select
                        value={line.taxId || NO_TAX_VALUE}
                        onValueChange={(value) => {
                          const selectedTax =
                            value === NO_TAX_VALUE ? null : taxById.get(value) || null;
                          onLinePatch(line.id, {
                            tax: selectedTax ? String(normalizeTaxRate(selectedTax.rate)) : "0",
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
                          {taxes.map((tax) => (
                            <SelectItem key={tax.id} value={tax.id}>
                              {formatTaxOptionLabel(tax)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top pt-9 text-right font-semibold text-slate-900">
                      {formatCurrencyAmount(amount, form.currency)}
                    </TableCell>
                    <TableCell className="align-top pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-rose-600"
                        onClick={() => onRemoveLine(line.id)}
                        title="Quitar ítem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-sm text-slate-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="ml-auto w-full max-w-[720px] space-y-0 border-t border-slate-200 text-sm">
        <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 border-b border-slate-200 py-3">
          <div />
          <div className="text-right font-semibold text-slate-700">Subtotal:</div>
          <div className="text-right text-slate-700">
            {formatCurrencyAmount(totals.subtotal, form.currency)}
          </div>
        </div>

        {totals.taxTotal > 0 ? (
          <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 border-b border-slate-200 py-3">
            <div />
            <div className="text-right font-semibold text-slate-700">ITBIS:</div>
            <div className="text-right text-slate-700">
              {formatCurrencyAmount(totals.taxTotal, form.currency)}
            </div>
          </div>
        ) : null}

        {form.discountType !== "none" ? (
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
                onChange={(event) => onFormPatch({ discountValue: event.target.value })}
                onBlur={(event) => {
                  if (form.discountType === "percent") return;
                  onFormPatch({
                    discountValue: normalizeMoneyInput(event.target.value, form.currency),
                  });
                }}
              />
              <span className="w-10 text-right text-slate-500">
                {form.discountType === "percent" ? "%" : moneyUnitLabel}
              </span>
            </div>
          </div>
        ) : null}

        {showAdjustment && !adjustmentOpen ? (
          <div className="flex justify-end border-b border-slate-200 py-3">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-sm font-semibold text-slate-600"
              onClick={() => setAdjustmentOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Agregar ajuste
            </Button>
          </div>
        ) : null}

        {showAdjustment && adjustmentOpen ? (
          <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 border-b border-slate-200 py-3">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-rose-600"
                onClick={() => {
                  onFormPatch({ adjustmentValue: "" });
                  setAdjustmentOpen(false);
                }}
              >
                Quitar ajuste
              </Button>
            </div>

            <div className="text-right font-semibold text-slate-700">Ajuste</div>

            <Input
              className="ml-auto h-10 max-w-[150px] text-right"
              type="number"
              step={moneyStep}
              inputMode={moneyMode}
              value={form.adjustmentValue}
              onChange={(event) => onFormPatch({ adjustmentValue: event.target.value })}
              onBlur={(event) =>
                onFormPatch({
                  adjustmentValue: normalizeMoneyInput(event.target.value, form.currency),
                })
              }
            />
          </div>
        ) : null}

        <div className="grid grid-cols-[1fr_220px_150px] items-center gap-4 py-4">
          <div />
          <div className="text-right text-base font-bold text-slate-800">Total:</div>
          <div className="text-right text-base font-bold text-slate-950">
            {formatCurrencyAmount(totals.total, form.currency)}
          </div>
        </div>
      </div>
    </div>
  );
}
