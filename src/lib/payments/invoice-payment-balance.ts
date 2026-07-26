import { supabase } from "@/integrations/supabase/client";

export type InvoicePaymentBalance = {
  invoiceId: string;
  currency: string;
  baseCurrency: string;
  total: number;
  totalBase: number;
  completedAmount: number;
  completedAmountBase: number;
  validCredits: number;
  validCreditsBase: number;
  outstandingBalance: number;
  outstandingBalanceBase: number;
};

export async function loadInvoicePaymentBalance(
  invoice: {
    id: string;
    total?: number | null;
    currency?: string | null;
  },
  companyId: string,
): Promise<InvoicePaymentBalance> {
  if (!invoice?.id) {
    throw new Error("No se encontró la factura.");
  }

  const db = supabase as any;

  const { data, error } = await db.rpc("get_invoice_financial_balance", {
    p_invoice_id: invoice.id,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    throw new Error("No se pudo calcular el saldo financiero de la factura.");
  }

  if (String(row.company_id || "") !== companyId) {
    throw new Error("La factura no pertenece a la compañía actual.");
  }

  return {
    invoiceId: String(row.invoice_id),
    currency: String(row.currency || invoice.currency || "USD"),
    baseCurrency: String(row.base_currency || "DOP"),
    total: Number(row.total_amount || 0) || 0,
    totalBase: Number(row.total_base || 0) || 0,
    completedAmount: Number(row.completed_payments || 0) || 0,
    completedAmountBase: Number(row.completed_payments_base || 0) || 0,
    validCredits: Number(row.valid_credits || 0) || 0,
    validCreditsBase: Number(row.valid_credits_base || 0) || 0,
    outstandingBalance: Number(row.balance_due || 0) || 0,
    outstandingBalanceBase: Number(row.balance_due_base || 0) || 0,
  };
}
