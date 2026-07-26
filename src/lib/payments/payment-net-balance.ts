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
};

export async function loadPaymentNetBalance(
  payment: {
    id: string;
    company_id?: string | null;
    amount?: number | null;
    amount_base?: number | null;
    status?: string | null;
  },
  companyId?: string | null,
): Promise<PaymentNetBalance> {
  if (!payment?.id) {
    throw new Error("No se encontró el pago.");
  }

  const db = supabase as any;
  const { data, error } = await db.rpc("get_payment_net_balance", {
    p_payment_id: payment.id,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    const originalAmount = Number(payment.amount || 0) || 0;
    const originalAmountBase =
      Number(payment.amount_base ?? payment.amount ?? 0) || 0;

    return {
      paymentId: String(payment.id),
      originalAmount,
      originalAmountBase,
      movementAmount: 0,
      movementAmountBase: 0,
      netAmount: originalAmount,
      netAmountBase: originalAmountBase,
      displayStatus: String(payment.status || "Pending"),
    };
  }

  if (
    companyId &&
    row.company_id &&
    String(row.company_id) !== String(companyId)
  ) {
    throw new Error("El pago no pertenece a la compañía actual.");
  }

  const originalAmount = Number(row.original_amount || 0) || 0;
  const originalAmountBase = Number(row.original_amount_base || 0) || 0;
  const movementAmount = Number(row.movement_amount || 0) || 0;
  const movementAmountBase = Number(row.movement_amount_base || 0) || 0;
  const netAmount = Number(row.net_amount || 0) || 0;
  const netAmountBase = Number(row.net_amount_base || 0) || 0;

  let displayStatus = String(payment.status || "Pending");

  if (displayStatus === "Completed" && movementAmount > 0) {
    displayStatus = netAmount <= 0 ? "Refunded" : "Partially Refunded";
  }

  return {
    paymentId: String(payment.id),
    originalAmount,
    originalAmountBase,
    movementAmount,
    movementAmountBase,
    netAmount,
    netAmountBase,
    displayStatus,
  };
}
