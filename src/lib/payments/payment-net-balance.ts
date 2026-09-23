import { supabase } from "@/integrations/supabase/client";

export type PaymentNetBalance = {
  paymentId: string;
  originalAmount: number;
  originalAmountBase: number;
  movementAmount: number;
  movementAmountBase: number;
  netAmount: number;
  netAmountBase: number;
  displayStatus: string;
  refundAmount: number;
  reversalAmount: number;
  refundMovementCount: number;
  reversalMovementCount: number;
};

export type PaymentMovementSummary = {
  refundAmount: number;
  reversalAmount: number;
  refundMovementCount: number;
  reversalMovementCount: number;
};

const emptyMovementSummary: PaymentMovementSummary = {
  refundAmount: 0,
  reversalAmount: 0,
  refundMovementCount: 0,
  reversalMovementCount: 0,
};

export async function loadPaymentMovementSummary(
  paymentId: string,
  companyId?: string | null,
): Promise<PaymentMovementSummary> {
  const db = supabase as any;
  let query = db
    .from("payment_movements")
    .select("movement_type,amount")
    .eq("original_payment_id", paymentId);

  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce(
    (summary: PaymentMovementSummary, movement: { movement_type: string; amount: number }) => {
      if (movement.movement_type === "Refund") {
        summary.refundAmount += Number(movement.amount || 0);
        summary.refundMovementCount += 1;
      } else if (movement.movement_type === "Reversal") {
        summary.reversalAmount += Number(movement.amount || 0);
        summary.reversalMovementCount += 1;
      }
      return summary;
    },
    { ...emptyMovementSummary },
  );
}

export function derivePaymentDisplayStatus(
  status: string | null | undefined,
  netAmount: number,
  movements: PaymentMovementSummary,
) {
  if (movements.reversalMovementCount > 0 && netAmount <= 0.000001) {
    return "Reversed";
  }

  if (movements.refundMovementCount > 0) {
    return netAmount <= 0.000001 ? "Refunded" : "Partially Refunded";
  }

  if (["Refunded", "Partially Refunded", "Reversed"].includes(String(status || ""))) {
    return "Review Required";
  }

  return String(status || "Pending");
}

export async function loadPaymentNetBalance(
  payment: {
    id: string;
    company_id?: string | null;
    amount?: number | null;
    amount_base?: number | null;
    status?: string | null;
  },
  companyId?: string | null,
  providedMovementSummary?: PaymentMovementSummary,
): Promise<PaymentNetBalance> {
  if (!payment?.id) {
    throw new Error("No se encontró el pago.");
  }

  const db = supabase as any;
  const [rpcResult, movementSummary] = await Promise.all([
    db.rpc("get_payment_net_balance", { p_payment_id: payment.id }),
    providedMovementSummary
      ? Promise.resolve(providedMovementSummary)
      : loadPaymentMovementSummary(payment.id, companyId || payment.company_id),
  ]);
  const { data, error } = rpcResult;

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    const originalAmount = Number(payment.amount || 0) || 0;
    const originalAmountBase = Number(payment.amount_base ?? payment.amount ?? 0) || 0;
    const isCompleted =
      String(payment.status || "")
        .trim()
        .toLowerCase() === "completed";

    return {
      paymentId: String(payment.id),
      originalAmount,
      originalAmountBase,
      movementAmount: 0,
      movementAmountBase: 0,
      netAmount: isCompleted ? originalAmount : 0,
      netAmountBase: isCompleted ? originalAmountBase : 0,
      displayStatus: derivePaymentDisplayStatus(
        payment.status,
        isCompleted ? originalAmount : 0,
        movementSummary,
      ),
      ...movementSummary,
    };
  }

  if (companyId && row.company_id && String(row.company_id) !== String(companyId)) {
    throw new Error("El pago no pertenece a la compañía actual.");
  }

  const originalAmount = Number(row.original_amount || 0) || 0;
  const originalAmountBase = Number(row.original_amount_base || 0) || 0;
  const movementAmount = Number(row.movement_amount || 0) || 0;
  const movementAmountBase = Number(row.movement_amount_base || 0) || 0;
  const netAmount = Number(row.net_amount || 0) || 0;
  const netAmountBase = Number(row.net_amount_base || 0) || 0;

  const displayStatus = derivePaymentDisplayStatus(payment.status, netAmount, movementSummary);

  return {
    paymentId: String(payment.id),
    originalAmount,
    originalAmountBase,
    movementAmount,
    movementAmountBase,
    netAmount,
    netAmountBase,
    displayStatus,
    ...movementSummary,
  };
}
