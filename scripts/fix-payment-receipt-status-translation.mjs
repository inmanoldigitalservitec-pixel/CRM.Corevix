import fs from "node:fs";

const file = "src/components/payments/payment-receipt-preview.tsx";
let source = fs.readFileSync(file, "utf8");

const helper = `\nfunction translateInvoiceStatus(value?: string | null) {\n  const normalized = clean(value).toLowerCase();\n\n  const labels: Record<string, string> = {\n    paid: "Pagada",\n    sent: "Enviada",\n    draft: "Borrador",\n    overdue: "Vencida",\n    cancelled: "Cancelada",\n    canceled: "Cancelada",\n    \"partially paid\": "Parcialmente pagada",\n    partial: "Parcialmente pagada",\n  };\n\n  return labels[normalized] || clean(value) || "—";\n}\n`;

if (!source.includes("function translateInvoiceStatus")) {
  const anchor = `function joinAddress(company: CompanyRow | null) {`;
  if (!source.includes(anchor)) {
    throw new Error("No se encontró el punto para insertar translateInvoiceStatus.");
  }
  source = source.replace(anchor, helper + "\n" + anchor);
}

const oldRender = `{data.invoiceStatus || "—"}`;
const newRender = `{translateInvoiceStatus(data.invoiceStatus)}`;

if (!source.includes(newRender)) {
  if (!source.includes(oldRender)) {
    throw new Error("No se encontró la salida del estado de factura.");
  }
  source = source.replace(oldRender, newRender);
}

fs.writeFileSync(file, source);
console.log("✓ Estado de factura traducido en el recibo de pago.");
