import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

const placeholderPattern = /\s*<TabsContent[^>]*value="statement"[^>]*>[\s\S]*?Preparado para mostrar balances, facturas pendientes,[\s\S]*?<\/TabsContent>/m;
if (placeholderPattern.test(source)) {
  source = source.replace(placeholderPattern, "");
}

const summaryStart = '                      <CrmDetailSummaryGrid columns={4} items={[';
const tableEnd = '                      <p className="text-xs text-slate-500">El saldo se calcula con facturas no canceladas menos pagos completados y notas de crédito emitidas o aplicadas.</p>';

if (!source.includes('title="Aún no hay movimientos"')) {
  const start = source.indexOf(summaryStart);
  const end = source.indexOf(tableEnd, start);
  if (start < 0 || end < 0) {
    throw new Error("No se encontró el bloque principal del estado de cuenta.");
  }

  const existing = source.slice(start, end + tableEnd.length);
  const replacement = [
    '                      {accountStatement.movements.length === 0 && accountStatement.openingBalance === 0 ? (',
    '                        <EmptyState',
    '                          icon={<Receipt className="h-6 w-6" />}',
    '                          title="Aún no hay movimientos"',
    '                          description="Este cliente todavía no tiene facturas, pagos ni notas de crédito registradas. Cuando se cree el primer movimiento, aparecerá aquí automáticamente."',
    '                          actionLabel={can("invoices.create") ? "Crear primera factura" : undefined}',
    '                          onAction={can("invoices.create") ? () => openInvoiceCreator(selectedClient) : undefined}',
    '                        />',
    '                      ) : (',
    '                        <>',
    existing,
    '                        </>',
    '                      )}',
  ].join("\n");

  source = source.slice(0, start) + replacement + source.slice(end + tableEnd.length);
}

fs.writeFileSync(file, source);
console.log("✓ Placeholder duplicado eliminado y estado vacío real agregado.");
