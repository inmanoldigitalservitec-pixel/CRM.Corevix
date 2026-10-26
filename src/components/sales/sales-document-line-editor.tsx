import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
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
import { crmFormStyles } from "@/components/crm/crm-form-shell";
import { cn } from "@/lib/utils";
import {
  formatCurrencyAmount,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
} from "@/lib/currency";
import { dedupeEquivalentTaxOptions } from "@/lib/company-tax-options";
import { formatTaxOptionLabel, normalizeTaxRate, type CompanyTax } from "@/hooks/use-company-taxes";

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
  addItemHelp?: string;
  currencyControl?: ReactNode;
  allowPercentageDiscount?: boolean;
  rateSource?: string | null;
  rateUpdatedAt?: string | null;
  showAdjustment?: boolean;
  showOptional?: boolean;
  showQuantityMode?: boolean;
  useCrmFieldStyles?: boolean;
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
  addItemHelp,
  currencyControl,
  allowPercentageDiscount = false,
  rateSource,
  rateUpdatedAt,
  showAdjustment = true,
  showOptional = true,
  showQuantityMode = true,
  useCrmFieldStyles = false,
  emptyMessage = "Agrega productos o líneas manuales para construir el documento.",
  onAddProductLine,
  onAddBlankLine,
  onLinePatch,
  onRemoveLine,
  onFormPatch,
  normalizeMoneyInput,
}: SalesDocumentLineEditorProps) {
  const compactInvoiceLayout = useCrmFieldStyles && mode === "invoice";
  const moneyStep = getCurrencyStep(form.currency);
  const moneyMode = getCurrencyInputMode(form.currency);
  const moneyUnitLabel = normalizeCurrency(form.currency) === "DOP" ? "RD$" : "US$";
  const selectedProductIds = new Set(
    lineItems
      .map((line) => line.productId)
      .filter((productId): productId is string => Boolean(productId)),
  );
  const [adjustmentOpen, setAdjustmentOpen] = useState(
    () => Math.abs(Number(form.adjustmentValue) || 0) > 0,
  );
  const [pendingDiscountType, setPendingDiscountType] = useState<"fixed" | "percent" | null>(null);
  const { options: taxOptions, canonicalIdByTaxId } = useMemo(
    () => dedupeEquivalentTaxOptions(taxes),
    [taxes],
  );

  useEffect(() => {
    setAdjustmentOpen(Math.abs(Number(form.adjustmentValue) || 0) > 0);
  }, [form.adjustmentValue]);

  const requestDiscountTypeChange = (nextType: "none" | "fixed" | "percent") => {
    if (nextType === "none") {
      onFormPatch({ discountType: "none", discountValue: "" });
      return;
    }
    if (
      form.discountType !== "none" &&
      form.discountType !== nextType &&
      Number(form.discountValue) > 0
    ) {
      setPendingDiscountType(nextType);
      return;
    }
    onFormPatch({ discountType: nextType, discountValue: "" });
  };

  const applyPendingDiscountType = () => {
    if (pendingDiscountType) {
      onFormPatch({ discountType: pendingDiscountType, discountValue: "" });
    }
    setPendingDiscountType(null);
  };

  return (
    <div
      className={
        useCrmFieldStyles
          ? "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          : "space-y-5"
      }
    >
      <div
        className={cn(
          "border-b border-slate-200 bg-slate-50 p-3 sm:p-4",
          useCrmFieldStyles
            ? "grid gap-3 sm:grid-cols-1 sm:items-start"
            : "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
        )}
      >
        <div className={useCrmFieldStyles ? "min-w-0 space-y-1.5" : "min-w-0 flex-1"}>
          {useCrmFieldStyles ? (
            <p className="text-xs font-medium text-slate-600">Producto o servicio</p>
          ) : null}
          <div className="flex min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                {productOptions.map((option) => {
                  const alreadyAdded = selectedProductIds.has(option.value);
                  return (
                    <SelectItem key={option.value} value={option.value} disabled={alreadyAdded}>
                      <span className="flex w-full items-center justify-between gap-3">
                        <span>{option.label}</span>
                        {alreadyAdded ? (
                          <Check className="h-4 w-4 text-emerald-600" aria-label="Ya agregado" />
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-12 shrink-0 rounded-none border-0 border-l border-slate-200 bg-white px-0 shadow-none"
              onClick={onAddBlankLine}
              title="Agregar línea manual"
              aria-label="Agregar línea manual"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {useCrmFieldStyles && addItemHelp ? (
            <p className="text-xs leading-relaxed text-slate-500">{addItemHelp}</p>
          ) : null}
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

      <div
        className={
          compactInvoiceLayout
            ? "min-w-0 overflow-hidden"
            : useCrmFieldStyles
              ? "min-w-0 overflow-hidden"
              : "overflow-x-auto"
        }
      >
        <Table
          className={
            compactInvoiceLayout
              ? "w-full table-fixed"
              : useCrmFieldStyles
                ? "w-full table-fixed"
                : undefined
          }
        >
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead
                className={cn(
                  compactInvoiceLayout
                    ? "w-[22%] min-w-0 px-1.5 text-sm whitespace-nowrap"
                    : useCrmFieldStyles
                      ? "w-[20%] min-w-0"
                      : "min-w-[260px]",
                  "text-left",
                )}
              >
                Concepto
              </TableHead>
              <TableHead
                className={
                  compactInvoiceLayout
                    ? "w-[19%] min-w-0 px-1.5 text-sm whitespace-nowrap"
                    : useCrmFieldStyles
                      ? "w-[21%] min-w-0"
                      : "min-w-[320px]"
                }
              >
                Descripción
              </TableHead>
              <TableHead
                className={cn(
                  compactInvoiceLayout
                    ? "w-[9%] min-w-0 px-1 text-center text-sm whitespace-nowrap"
                    : useCrmFieldStyles
                      ? "w-[11%] min-w-0"
                      : "w-[140px]",
                  compactInvoiceLayout ? "" : "text-right",
                )}
              >
                Cant.
              </TableHead>
              <TableHead
                className={cn(
                  compactInvoiceLayout
                    ? "w-[12%] min-w-0 px-1 text-right text-sm whitespace-nowrap"
                    : useCrmFieldStyles
                      ? "w-[13%] min-w-0"
                      : "w-[180px]",
                  "text-right",
                )}
              >
                Precio
              </TableHead>
              <TableHead
                className={
                  compactInvoiceLayout
                    ? "w-[15%] min-w-0 px-1 text-sm whitespace-nowrap"
                    : useCrmFieldStyles
                      ? "w-[16%] min-w-0"
                      : "w-[220px]"
                }
              >
                Impuesto
              </TableHead>
              <TableHead
                className={cn(
                  compactInvoiceLayout
                    ? "w-[17%] min-w-0 px-1 text-right text-sm whitespace-nowrap"
                    : useCrmFieldStyles
                      ? "w-[11%] min-w-0"
                      : "w-[160px]",
                  "text-right",
                )}
              >
                Total
              </TableHead>
              <TableHead
                className={
                  compactInvoiceLayout
                    ? "w-[6%] min-w-0 px-0.5"
                    : useCrmFieldStyles
                      ? "w-[8%] min-w-0"
                      : "w-[72px]"
                }
              />
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
                  <TableRow
                    key={line.id}
                    className={cn("align-top", compactInvoiceLayout && "text-sm")}
                  >
                    <TableCell
                      className={cn("min-w-0 align-top", compactInvoiceLayout && "px-2 py-2")}
                    >
                      <Textarea
                        rows={compactInvoiceLayout ? 3 : undefined}
                        className={cn(
                          useCrmFieldStyles ? crmFormStyles.textarea : "rounded-lg shadow-none",
                          compactInvoiceLayout
                            ? "min-h-[64px] rounded-lg px-1 py-1 text-[11px] leading-4 [overflow-wrap:break-word]"
                            : "min-h-[92px] min-w-0 align-top",
                        )}
                        value={line.item}
                        aria-label="Nombre del artículo o servicio"
                        onChange={(event) => onLinePatch(line.id, { item: event.target.value })}
                        placeholder="Ej. Diseño de identidad"
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
                    <TableCell
                      className={cn("min-w-0 align-top", compactInvoiceLayout && "px-2 py-2")}
                    >
                      <Textarea
                        rows={compactInvoiceLayout ? 4 : undefined}
                        className={cn(
                          useCrmFieldStyles ? crmFormStyles.textarea : "rounded-lg shadow-none",
                          compactInvoiceLayout
                            ? "min-h-[72px] rounded-lg px-1 py-1 text-[11px] leading-4 [overflow-wrap:break-word]"
                            : "min-h-[92px] min-w-0 align-top",
                        )}
                        value={line.description}
                        aria-label="Detalle que aparecerá en la factura"
                        onChange={(event) =>
                          onLinePatch(line.id, { description: event.target.value })
                        }
                        placeholder="Describe brevemente el producto o servicio"
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 align-top text-right",
                        compactInvoiceLayout && "px-1 py-2 text-center",
                      )}
                    >
                      <div
                        className={
                          compactInvoiceLayout
                            ? "relative h-9 border-b border-slate-200 focus-within:border-blue-500"
                            : "relative"
                        }
                      >
                        <Input
                          className={cn(
                            compactInvoiceLayout
                              ? "invoice-quantity-input h-9 w-full min-w-0 border-0 bg-transparent px-1 pr-5 text-center text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              : `${crmFormStyles.input} invoice-quantity-input min-w-0 pl-3 pr-7 text-left`,
                          )}
                          type="number"
                          min="1"
                          step="0.01"
                          value={line.quantity}
                          aria-label="Cantidad del artículo o servicio"
                          onChange={(event) =>
                            onLinePatch(line.id, { quantity: event.target.value })
                          }
                        />
                        <div
                          className={cn(
                            "absolute right-1 top-1/2 flex -translate-y-1/2 flex-col",
                            compactInvoiceLayout && "right-0.5",
                          )}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-4 w-5 p-0 text-slate-500 hover:text-slate-900",
                              compactInvoiceLayout && "h-3 w-4",
                            )}
                            aria-label="Aumentar cantidad"
                            title="Aumentar cantidad"
                            onClick={() =>
                              onLinePatch(line.id, {
                                quantity: String(Math.max(0, Number(line.quantity) || 0) + 1),
                              })
                            }
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                              "h-4 w-5 p-0 text-slate-500 hover:text-slate-900 disabled:opacity-40",
                              compactInvoiceLayout && "h-3 w-4",
                            )}
                            aria-label="Disminuir cantidad"
                            title="Disminuir cantidad"
                            disabled={Number(line.quantity) <= 1}
                            onClick={() =>
                              onLinePatch(line.id, {
                                quantity: String(Math.max(1, (Number(line.quantity) || 1) - 1)),
                              })
                            }
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "mt-2 text-xs text-slate-400",
                          compactInvoiceLayout && "mt-1 text-[10px]",
                        )}
                      >
                        {form.quantityMode === "hours"
                          ? "Horas"
                          : form.quantityMode === "qty_hours"
                            ? "Cant./Horas"
                            : "Unidad"}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 align-top text-right",
                        compactInvoiceLayout && "px-1 py-2",
                      )}
                    >
                      <Input
                        className={
                          compactInvoiceLayout
                            ? "h-9 min-w-0 rounded-lg border border-slate-200 px-1.5 text-right text-sm shadow-none focus-visible:ring-2"
                            : `${crmFormStyles.input} text-right`
                        }
                        type="number"
                        step={moneyStep}
                        inputMode={moneyMode}
                        value={line.rate}
                        aria-label="Precio por unidad"
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
                          const normalizedRate = normalizeMoneyInput(
                            event.target.value,
                            form.currency,
                          );
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
                        placeholder="Precio unitario"
                      />
                    </TableCell>
                    <TableCell
                      className={cn("min-w-0 align-top", compactInvoiceLayout && "px-1 py-2")}
                    >
                      <Select
                        value={
                          line.taxId
                            ? canonicalIdByTaxId.get(line.taxId) || line.taxId
                            : NO_TAX_VALUE
                        }
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
                        <SelectTrigger
                          className={
                            compactInvoiceLayout
                              ? "h-9 min-w-0 rounded-lg border border-slate-200 px-1 text-[11px] shadow-none focus:ring-2"
                              : cn(
                                  crmFormStyles.select,
                                  useCrmFieldStyles && "min-w-0 px-1 text-xs",
                                )
                          }
                          aria-label="Impuesto aplicado a este artículo"
                        >
                          <SelectValue placeholder="Sin impuesto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_TAX_VALUE}>Sin impuesto</SelectItem>
                          {taxOptions.map((tax) => (
                            <SelectItem key={tax.id} value={tax.id}>
                              {formatTaxOptionLabel(tax)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 align-top whitespace-nowrap pt-9 text-right font-semibold text-slate-900",
                        compactInvoiceLayout && "px-1 pt-5 text-[13px] tabular-nums",
                      )}
                    >
                      {formatCurrencyAmount(amount, form.currency)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "min-w-0 align-top pt-6",
                        compactInvoiceLayout && "px-0.5 pt-5",
                      )}
                    >
                      <Button
                        type="button"
                        variant={compactInvoiceLayout ? "ghost" : "outline"}
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-lg border-slate-200 bg-white text-slate-500 shadow-none hover:text-rose-600",
                          compactInvoiceLayout && "h-7 w-7 rounded-md bg-transparent",
                        )}
                        onClick={() => onRemoveLine(line.id)}
                        title="Quitar ítem"
                      >
                        <Trash2 className={cn("h-4 w-4", compactInvoiceLayout && "h-3.5 w-3.5")} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 whitespace-normal break-words text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="w-full space-y-0 border-t border-slate-200 p-3 text-sm sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(108px,150px)] items-center gap-4 border-b border-slate-200 py-3">
          <div className="text-right font-semibold text-slate-700">Subtotal:</div>
          <div className="text-right text-slate-700">
            {formatCurrencyAmount(totals.subtotal, form.currency)}
          </div>
        </div>

        {totals.taxTotal > 0 ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(108px,150px)] items-center gap-4 border-b border-slate-200 py-3">
            <div className="text-right font-semibold text-slate-700">ITBIS:</div>
            <div className="text-right text-slate-700">
              {formatCurrencyAmount(totals.taxTotal, form.currency)}
            </div>
          </div>
        ) : null}

        {allowPercentageDiscount && form.discountType === "none" ? (
          <div className="flex justify-end border-b border-slate-200 py-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-sm font-medium text-blue-700 hover:text-blue-800"
              onClick={() => onFormPatch({ discountType: "percent", discountValue: "0" })}
            >
              <Plus className="h-4 w-4" />
              Aplicar descuento
            </Button>
          </div>
        ) : null}

        {allowPercentageDiscount && form.discountType !== "none" ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(108px,150px)] items-center gap-4 border-b border-slate-200 py-3">
            <div className="text-right font-semibold text-slate-700">
              {allowPercentageDiscount || form.discountType === "percent"
                ? "Descuento porcentual"
                : "Descuento fijo"}
              <p className="mt-1 text-xs font-normal text-slate-500">
                {allowPercentageDiscount || form.discountType === "percent"
                  ? "Porcentaje que se resta del subtotal."
                  : "Importe que se resta del total."}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Input
                className="h-10 max-w-[120px] text-right"
                type="number"
                step={
                  allowPercentageDiscount || form.discountType === "percent" ? "0.01" : moneyStep
                }
                min="0"
                max={allowPercentageDiscount || form.discountType === "percent" ? "100" : undefined}
                inputMode={
                  allowPercentageDiscount || form.discountType === "percent" ? "decimal" : moneyMode
                }
                value={form.discountValue}
                aria-label={
                  allowPercentageDiscount || form.discountType === "percent"
                    ? "Porcentaje de descuento"
                    : "Importe fijo del descuento"
                }
                onChange={(event) => {
                  const value = event.target.value;
                  onFormPatch({
                    discountValue: allowPercentageDiscount
                      ? value === "" || Number(value) <= 100
                        ? value
                        : "100"
                      : value,
                  });
                }}
                onBlur={(event) => {
                  if (form.discountType === "percent") {
                    onFormPatch({
                      discountValue: String(
                        Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                      ),
                    });
                    return;
                  }
                  if (form.discountType === "none") return;
                  onFormPatch({
                    discountValue: normalizeMoneyInput(
                      String(
                        Math.min(
                          Math.max(0, totals.subtotal + totals.taxTotal),
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      ),
                      form.currency,
                    ),
                  });
                }}
              />
              <span className="w-10 text-right text-slate-500">
                {allowPercentageDiscount || form.discountType === "percent" ? "%" : moneyUnitLabel}
              </span>
              {allowPercentageDiscount ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500"
                  aria-label="Quitar descuento"
                  title="Quitar descuento"
                  onClick={() => onFormPatch({ discountType: "none", discountValue: "0" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!allowPercentageDiscount ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-3">
            <div className="flex min-w-36 justify-start">
              {showAdjustment ? (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "gap-2 text-sm font-semibold",
                    adjustmentOpen ? "text-rose-600" : "text-blue-700",
                  )}
                  onClick={() => {
                    if (adjustmentOpen) onFormPatch({ adjustmentValue: "" });
                    setAdjustmentOpen((open) => !open);
                  }}
                >
                  {adjustmentOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {adjustmentOpen ? "Quitar ajuste" : "Agregar ajuste"}
                </Button>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              {form.discountType === "none" ? (
                <Select
                  value="none"
                  onValueChange={(value) =>
                    requestDiscountTypeChange(value as "none" | "fixed" | "percent")
                  }
                >
                  <SelectTrigger className="h-9 w-44" aria-label="Tipo de descuento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin descuento</SelectItem>
                    <SelectItem value="fixed">Descuento fijo</SelectItem>
                    <SelectItem value="percent">Descuento porcentual</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <span className="text-sm font-semibold text-slate-700">Descuento</span>
                  <Input
                    className="h-9 w-28 text-right"
                    type="number"
                    min="0"
                    max={form.discountType === "percent" ? "100" : undefined}
                    step={form.discountType === "percent" ? "0.01" : moneyStep}
                    inputMode={form.discountType === "percent" ? "decimal" : moneyMode}
                    value={form.discountValue}
                    aria-label={
                      form.discountType === "percent"
                        ? "Porcentaje de descuento"
                        : "Importe fijo del descuento"
                    }
                    onChange={(event) => onFormPatch({ discountValue: event.target.value })}
                    onBlur={(event) => {
                      if (form.discountType === "percent") {
                        onFormPatch({
                          discountValue: String(
                            Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                          ),
                        });
                        return;
                      }
                      const capped = Math.min(
                        Math.max(0, totals.subtotal + totals.taxTotal),
                        Math.max(0, Number(event.target.value) || 0),
                      );
                      onFormPatch({
                        discountValue: normalizeMoneyInput(String(capped), form.currency),
                      });
                    }}
                  />
                  <span className="w-10 text-right text-xs text-slate-500">
                    {form.discountType === "percent" ? "%" : moneyUnitLabel}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-2 text-xs"
                    onClick={() =>
                      requestDiscountTypeChange(
                        form.discountType === "percent" ? "fixed" : "percent",
                      )
                    }
                  >
                    Cambiar a {form.discountType === "percent" ? moneyUnitLabel : "%"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-500"
                    aria-label="Quitar descuento"
                    title="Quitar descuento"
                    onClick={() => requestDiscountTypeChange("none")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {showAdjustment && adjustmentOpen ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(108px,150px)] items-center gap-4 border-b border-slate-200 py-3">
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
          <div>
            {currencyControl ? <div className="w-full max-w-48">{currencyControl}</div> : null}
          </div>
          <div className="text-right text-base font-bold text-slate-800">Total:</div>
          <div className="text-right text-base font-bold text-slate-950">
            {formatCurrencyAmount(totals.total, form.currency)}
          </div>
        </div>
      </div>
      <AlertDialog
        open={pendingDiscountType !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDiscountType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar el tipo de descuento</AlertDialogTitle>
            <AlertDialogDescription>
              El valor actual representa{" "}
              {form.discountType === "percent" ? "un porcentaje" : "un monto"}. Para evitar cambiar
              su significado, se limpiará al cambiar el tipo. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDiscountType(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={applyPendingDiscountType}>
              Cambiar y limpiar valor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
