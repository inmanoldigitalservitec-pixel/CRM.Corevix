import { supabase } from "@/integrations/supabase/client";

export type InvoicePaymentBalance = {
  invoiceId: string;
  total: number;
  completedAmount: number;
  outstandingBalance: number;
};

function isCompletedPaymentStatus(status?: string | null) {
  return (
    String(status || "")
      .trim()
      .toLowerCase() === "completed"
  );
}

export async function loadInvoicePaymentBalance(
  invoice: {
    id: string;
    total?: number | null;
  },
  companyId: string,
): Promise<InvoicePaymentBalance> {
  const db = supabase as any;
  const { data, error } = await db
    .from("payments")
    .select("amount,status")
    .eq("company_id", companyId)
    .eq("invoice_id", invoice.id);

  if (error) throw error;

  const completedAmount = (data || [])
    .filter((payment: any) => isCompletedPaymentStatus(payment.status))
    .reduce((sum: number, payment: any) => sum + (Number(payment.amount || 0) || 0), 0);
  const total = Number(invoice.total || 0) || 0;

  return {
    invoiceId: invoice.id,
    total,
    completedAmount,
    outstandingBalance: Math.max(total - completedAmount, 0),
  };
}
