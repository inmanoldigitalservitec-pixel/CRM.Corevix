import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyAmount } from "@/lib/currency";

type MovementRow = {
  id: string;
  movement_type: "Refund" | "Reversal" | string;
  amount: number;
  currency: string;
  reason: string;
  external_reference: string | null;
  created_at: string;
};

type Props = {
  paymentId: string;
  paymentStatus: string | null;
  invoiceId: string | null;
  currency: string;
  availableAmount: number;
  onChanged: () => void;
};

type ActionMode = "refund" | "reverse" | null;

function movementLabel(type: string) {
  return type === "Reversal" ? "Reverso" : "Reembolso";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function PaymentMovementsPanel({
  paymentId,
  paymentStatus,
  invoiceId,
  currency,
  availableAmount,
  onChanged,
}: Props) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const canRefund = can("payments.refund" as any);
  const canReverse = can("payments.reverse" as any);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ActionMode>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  const actionable = paymentStatus === "Completed" && Boolean(invoiceId) && availableAmount > 0;
  const normalizedCurrency = String(currency || "USD").toUpperCase();

  const loadMovements = async () => {
    if (!profile?.company_id || !paymentId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("payment_movements")
        .select("id,movement_type,amount,currency,reason,external_reference,created_at")
        .eq("company_id", profile.company_id)
        .eq("original_payment_id", paymentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMovements((data || []) as MovementRow[]);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cargar el historial de movimientos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMovements();
  }, [paymentId, profile?.company_id]);

  const parsedAmount = Number(amount || 0);
  const amountError = useMemo(() => {
    if (mode !== "refund") return null;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return "Indica un monto mayor que cero.";
    if (parsedAmount > availableAmount)
      return "El reembolso no puede superar el monto neto disponible.";
    return null;
  }, [availableAmount, mode, parsedAmount]);

  const openAction = (nextMode: Exclude<ActionMode, null>) => {
    setMode(nextMode);
    setAmount(nextMode === "refund" ? String(availableAmount) : "");
    setReason("");
    setReference("");
  };

  const closeAction = () => {
    if (saving) return;
    setMode(null);
  };

  const submit = async () => {
    if (!mode) return;
    if (!reason.trim()) {
      toast.error("Debes indicar el motivo del movimiento.");
      return;
    }
    if (amountError) {
      toast.error(amountError);
      return;
    }

    setSaving(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const db = supabase as any;
      const rpcName = mode === "refund" ? "refund_invoice_payment" : "reverse_invoice_payment";
      const args =
        mode === "refund"
          ? {
              p_original_payment_id: paymentId,
              p_amount: parsedAmount,
              p_reason: reason.trim(),
              p_external_reference: reference.trim() || null,
              p_idempotency_key: idempotencyKey,
            }
          : {
              p_original_payment_id: paymentId,
              p_reason: reason.trim(),
              p_external_reference: reference.trim() || null,
              p_idempotency_key: idempotencyKey,
            };

      const { error } = await db.rpc(rpcName, args);
      if (error) throw error;

      toast.success(mode === "refund" ? "Reembolso registrado." : "Pago revertido.");
      setMode(null);
      await loadMovements();
      onChanged();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-slate-950">Monto neto disponible</div>
            <div className="mt-1 text-2xl text-slate-950">
              {formatCurrencyAmount(availableAmount, normalizedCurrency)}
            </div>
            {!actionable ? (
              <p className="mt-2 text-xs text-slate-500">
                Solo los pagos completados, asociados a una factura y con saldo neto disponible admiten movimientos.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {canRefund ? (
              <Button type="button" variant="outline" disabled={!actionable} onClick={() => openAction("refund")}>
                <Undo2 className="mr-2 h-4 w-4" />
                Reembolsar
              </Button>
            ) : null}
            {canReverse ? (
              <Button type="button" variant="destructive" disabled={!actionable} onClick={() => openAction("reverse")}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Revertir pago
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-950">Historial de movimientos</h3>
        </div>

        {loading ? (
          <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando movimientos...
          </div>
        ) : movements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Este pago todavía no tiene reembolsos ni reversos.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {movements.map((movement) => (
              <div key={movement.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="text-sm font-medium text-slate-950">
                    {movementLabel(movement.movement_type)}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{movement.reason}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDateTime(movement.created_at)}
                    {movement.external_reference ? ` · ${movement.external_reference}` : ""}
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-950">
                  -{formatCurrencyAmount(movement.amount, movement.currency || normalizedCurrency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(mode)} onOpenChange={(next) => !next && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "refund" ? "Confirmar reembolso" : "Confirmar reverso del pago"}</DialogTitle>
            <DialogDescription>
              {mode === "refund"
                ? "El monto se descontará del pago y volverá a aumentar el saldo pendiente de la factura."
                : `Se revertirá el neto disponible completo: ${formatCurrencyAmount(availableAmount, normalizedCurrency)}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {mode === "refund" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="refund-amount">Monto a reembolsar</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAmount(String(availableAmount))}>
                    Usar disponible completo
                  </Button>
                </div>
                <Input
                  id="refund-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={availableAmount}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <p className={amountError ? "text-xs text-red-600" : "text-xs text-slate-500"}>
                  {amountError || `Disponible: ${formatCurrencyAmount(availableAmount, normalizedCurrency)}`}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="movement-reason">Motivo *</Label>
              <Textarea
                id="movement-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Describe por qué se realiza este movimiento."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement-reference">Referencia o nota</Label>
              <Input
                id="movement-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Ej. transferencia de devolución, autorización..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAction} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={mode === "reverse" ? "destructive" : "default"}
              onClick={submit}
              disabled={saving || !reason.trim() || Boolean(amountError)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "refund" ? "Confirmar reembolso" : "Confirmar reverso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
