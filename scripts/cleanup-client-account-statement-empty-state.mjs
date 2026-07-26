import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

// Remove an older duplicate placeholder tab, while preserving the real statement tab.
const placeholderPattern = /\s*<TabsContent(?![^>]*data-demo="client-360-statement")[^>]*value="statement"[^>]*>[\s\S]*?Preparado para mostrar balances, facturas pendientes,[\s\S]*?<\/TabsContent>/m;
source = source.replace(placeholderPattern, "");

if (!source.includes('title="Aún no hay movimientos"')) {
  const statementMarker = 'data-demo="client-360-statement"';
  const markerIndex = source.indexOf(statementMarker);
  if (markerIndex < 0) {
    throw new Error("No se encontró la pestaña funcional del estado de cuenta.");
  }

  const statementStart = source.lastIndexOf("<TabsContent", markerIndex);
  const statementEnd = source.indexOf("</TabsContent>", markerIndex);
  if (statementStart < 0 || statementEnd < 0) {
    throw new Error("No se pudo delimitar la pestaña del estado de cuenta.");
  }

  const block = source.slice(statementStart, statementEnd + "</TabsContent>".length);
  const contentStartPattern = /\n\s*<CrmDetailSummaryGrid\s+columns=\{4\}\s+items=\{\[/;
  const contentStartMatch = contentStartPattern.exec(block);
  const footerText = "El saldo se calcula con facturas no canceladas menos pagos completados y notas de crédito emitidas o aplicadas.";
  const footerIndex = block.indexOf(footerText);

  if (!contentStartMatch || footerIndex < 0) {
    throw new Error("No se encontró el contenido principal del estado de cuenta.");
  }

  const contentStart = contentStartMatch.index + 1;
  const footerTagStart = block.lastIndexOf("<p", footerIndex);
  const footerTagEnd = block.indexOf("</p>", footerIndex);
  if (footerTagStart < 0 || footerTagEnd < 0) {
    throw new Error("No se encontró el pie del estado de cuenta.");
  }

  const contentEnd = footerTagEnd + "</p>".length;
  const existing = block.slice(contentStart, contentEnd);
  const indentationMatch = existing.match(/^(\s*)/);
  const indent = indentationMatch?.[1] || "                      ";

  const replacement = [
    `${indent}{accountStatement.movements.length === 0 && accountStatement.openingBalance === 0 ? (`,
    `${indent}  <EmptyState`,
    `${indent}    icon={<Receipt className="h-6 w-6" />}`,
    `${indent}    title="Aún no hay movimientos"`,
    `${indent}    description="Este cliente todavía no tiene facturas, pagos ni notas de crédito registradas. Cuando se cree el primer movimiento, aparecerá aquí automáticamente."`,
    `${indent}    actionLabel={can("invoices.create") ? "Crear primera factura" : undefined}`,
    `${indent}    onAction={can("invoices.create") ? () => openInvoiceCreator(selectedClient) : undefined}`,
    `${indent}  />`,
    `${indent}) : (`,
    `${indent}  <>`,
    existing,
    `${indent}  </>`,
    `${indent})}`,
  ].join("\n");

  const updatedBlock = block.slice(0, contentStart) + replacement + block.slice(contentEnd);
  source = source.slice(0, statementStart) + updatedBlock + source.slice(statementEnd + "</TabsContent>".length);
}

fs.writeFileSync(file, source);
console.log("✓ Placeholder duplicado eliminado y estado vacío real agregado.");
