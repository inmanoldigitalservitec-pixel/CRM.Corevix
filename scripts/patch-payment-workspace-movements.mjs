import fs from "node:fs";

const file = "src/components/payments/payment-workspace-dialog.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(oldText, newText, label) {
  if (source.includes(newText)) return;
  if (!source.includes(oldText)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(oldText, newText);
}

replaceOnce(
  'import { PaymentReceiptsPanel } from "@/components/payments/payment-receipts-panel";',
  'import { PaymentReceiptsPanel } from "@/components/payments/payment-receipts-panel";\nimport { PaymentMovementsPanel } from "@/components/payments/payment-movements-panel";',
  "import de movimientos",
);

replaceOnce(
  'type PaymentWorkspaceTab = "receipt" | "details" | "receipts";',
  'type PaymentWorkspaceTab = "receipt" | "details" | "movements" | "receipts";',
  "tipo de pestaña",
);

replaceOnce(
  '  { value: "details", label: "Detalles", icon: CreditCard },\n  { value: "receipts", label: "Comprobantes", icon: Paperclip },',
  '  { value: "details", label: "Detalles", icon: CreditCard },\n  { value: "movements", label: "Movimientos", icon: RotateCcw },\n  { value: "receipts", label: "Comprobantes", icon: Paperclip },',
  "pestaña movimientos",
);

replaceOnce(
  'import { CreditCard, FileText, Loader2, Paperclip } from "lucide-react";',
  'import { CreditCard, FileText, Loader2, Paperclip, RotateCcw } from "lucide-react";',
  "icono movimientos",
);

replaceOnce(
  '  const [invoiceFinancialStatus, setInvoiceFinancialStatus] = useState<string | null>(null);',
  '  const [invoiceFinancialStatus, setInvoiceFinancialStatus] = useState<string | null>(null);\n  const [movementRefresh, setMovementRefresh] = useState(0);',
  "estado refresh",
);

replaceOnce(
  '  }, [open, paymentId, profile?.company_id, onOpenChange]);',
  '  }, [open, paymentId, profile?.company_id, onOpenChange, movementRefresh]);',
  "dependencia refresh",
);

replaceOnce(
  '          <TabsContent value="receipts" className="mt-0">',
  '          <TabsContent value="movements" className="mt-0">\n            <PaymentMovementsPanel\n              paymentId={payment.id}\n              paymentStatus={payment.status}\n              invoiceId={payment.invoice_id}\n              currency={payment.currency || "USD"}\n              availableAmount={financial.netAmount}\n              onChanged={() => setMovementRefresh((value) => value + 1)}\n            />\n          </TabsContent>\n\n          <TabsContent value="receipts" className="mt-0">',
  "contenido movimientos",
);

fs.writeFileSync(file, source);
console.log("✓ Workspace de pagos conectado a reembolsos, reversos e historial.");
