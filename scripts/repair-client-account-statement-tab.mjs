import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

const startMarker = '<TabsContent data-demo="client-360-statement" value="statement"';
const nextMarker = '<TabsContent\n                      data-demo="client-360-contacts-section"';

const start = source.indexOf(startMarker);
const next = source.indexOf(nextMarker, start);

if (start < 0 || next < 0) {
  throw new Error("No se pudo delimitar la pestaña Estado de cuenta.");
}

const indent = "                    ";
const block = `${indent}<TabsContent data-demo="client-360-statement" value="statement" className="space-y-5">
${indent}  <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
${indent}    <div className="min-w-[220px]">
${indent}      <h3 className="text-base font-semibold text-slate-950">Estado de cuenta</h3>
${indent}      <p className="mt-1 text-sm text-slate-500">Facturas, pagos y notas de crédito con saldo acumulado.</p>
${indent}    </div>
${indent}    <div className="flex min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-1">
${indent}      <div className="shrink-0 space-y-1">
${indent}        <Label className="text-xs text-slate-500">Desde</Label>
${indent}        <Input type="date" value={statementFrom} onChange={(event) => setStatementFrom(event.target.value)} className="h-9 w-[142px]" />
${indent}      </div>
${indent}      <div className="shrink-0 space-y-1">
${indent}        <Label className="text-xs text-slate-500">Hasta</Label>
${indent}        <Input type="date" value={statementTo} onChange={(event) => setStatementTo(event.target.value)} className="h-9 w-[142px]" />
${indent}      </div>
${indent}      <div className="shrink-0 space-y-1">
${indent}        <Label className="text-xs text-slate-500">Moneda</Label>
${indent}        <Select value={statementCurrency} onValueChange={setStatementCurrency}>
${indent}          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
${indent}          <SelectContent>
${indent}            <SelectItem value="all">Moneda base</SelectItem>
${indent}            {accountStatement.currencies.map((currency) => (
${indent}              <SelectItem key={currency} value={currency}>{currency}</SelectItem>
${indent}            ))}
${indent}          </SelectContent>
${indent}        </Select>
${indent}      </div>
${indent}      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={exportAccountStatement} aria-label="Exportar estado de cuenta en CSV" title="Exportar CSV">
${indent}        <Download className="h-4 w-4" />
${indent}      </Button>
${indent}      <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={printAccountStatement} aria-label="Imprimir o guardar estado de cuenta en PDF" title="Imprimir / PDF">
${indent}        <Printer className="h-4 w-4" />
${indent}      </Button>
${indent}    </div>
${indent}  </div>
${indent}  {accountStatement.movements.length === 0 && accountStatement.openingBalance === 0 ? (
${indent}    <EmptyState
${indent}      icon={<Receipt className="h-6 w-6" />}
${indent}      title="Aún no hay movimientos"
${indent}      description="Este cliente todavía no tiene facturas, pagos ni notas de crédito registradas. Cuando se cree el primer movimiento, aparecerá aquí automáticamente."
${indent}      actionLabel={can("invoices.create") ? "Crear primera factura" : undefined}
${indent}      onAction={can("invoices.create") ? () => openInvoiceCreator(selectedClient) : undefined}
${indent}    />
${indent}  ) : (
${indent}    <>
${indent}      <CrmDetailSummaryGrid columns={4} items={[
${indent}        { key: "opening", label: "Saldo inicial", value: money(accountStatement.openingBalance, accountStatement.displayCurrency) },
${indent}        { key: "invoiced", label: "Facturado", value: money(accountStatement.invoiced, accountStatement.displayCurrency) },
${indent}        { key: "paid", label: "Pagos recibidos", value: money(accountStatement.paid, accountStatement.displayCurrency) },
${indent}        { key: "credits", label: "Notas de crédito", value: money(accountStatement.credited, accountStatement.displayCurrency) },
${indent}        { key: "overdue", label: "Monto vencido", value: money(accountStatement.overdueBalance, accountStatement.displayCurrency) },
${indent}        { key: "closing", label: "Saldo pendiente", value: money(accountStatement.closingBalance, accountStatement.displayCurrency) },
${indent}      ]} />
${indent}      <div className="overflow-x-auto border-y border-slate-100">
${indent}        <Table className="min-w-[860px]">
${indent}          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Movimiento</TableHead><TableHead>Referencia</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Débito</TableHead><TableHead className="text-right">Crédito</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
${indent}          <TableBody>
${indent}            {accountStatement.movements.map((row) => (
${indent}              <TableRow key={row.id}>
${indent}                <TableCell>{formatDate(row.date)}</TableCell>
${indent}                <TableCell>{row.type === "invoice" ? "Factura" : row.type === "payment" ? "Pago" : "Nota de crédito"}</TableCell>
${indent}                <TableCell className="font-medium text-slate-950">{row.reference}</TableCell>
${indent}                <TableCell className="max-w-[260px] truncate text-slate-500">{row.description}</TableCell>
${indent}                <TableCell className="text-right">{row.debit ? money(row.debit, row.currency) : "—"}</TableCell>
${indent}                <TableCell className="text-right text-emerald-700">{row.credit ? money(row.credit, row.currency) : "—"}</TableCell>
${indent}                <TableCell className="text-right font-semibold text-slate-950">{money(row.balance, row.currency)}</TableCell>
${indent}              </TableRow>
${indent}            ))}
${indent}          </TableBody>
${indent}        </Table>
${indent}      </div>
${indent}      <p className="text-xs text-slate-500">El saldo se calcula con facturas no canceladas menos pagos completados y notas de crédito emitidas o aplicadas.</p>
${indent}    </>
${indent}  )}
${indent}</TabsContent>

`;

source = source.slice(0, start) + block + source.slice(next);
fs.writeFileSync(file, source);
console.log("✓ Pestaña Estado de cuenta reconstruida con JSX válido.");
