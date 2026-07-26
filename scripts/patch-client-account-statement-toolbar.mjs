import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

const startMarker = '<TabsContent data-demo="client-360-statement" value="statement" className="space-y-5">';
const endMarker = '<CrmDetailSummaryGrid columns={4} items={[';

const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error("No se encontró el encabezado funcional del estado de cuenta.");
}

const currentHeader = source.slice(start + startMarker.length, end);

const replacementHeader = `
                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-[220px]">
                          <h3 className="text-base font-semibold text-slate-950">Estado de cuenta</h3>
                          <p className="mt-1 text-sm text-slate-500">Facturas, pagos y notas de crédito con saldo acumulado.</p>
                        </div>

                        <div className="flex min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-1">
                          <div className="shrink-0 space-y-1">
                            <Label className="text-xs text-slate-500">Desde</Label>
                            <Input
                              type="date"
                              value={statementFrom}
                              onChange={(event) => setStatementFrom(event.target.value)}
                              className="h-9 w-[142px]"
                            />
                          </div>

                          <div className="shrink-0 space-y-1">
                            <Label className="text-xs text-slate-500">Hasta</Label>
                            <Input
                              type="date"
                              value={statementTo}
                              onChange={(event) => setStatementTo(event.target.value)}
                              className="h-9 w-[142px]"
                            />
                          </div>

                          <div className="shrink-0 space-y-1">
                            <Label className="text-xs text-slate-500">Moneda</Label>
                            <Select value={statementCurrency} onValueChange={setStatementCurrency}>
                              <SelectTrigger className="h-9 w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Moneda base</SelectItem>
                                {accountStatement.currencies.map((currency) => (
                                  <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={exportAccountStatement}
                            aria-label="Exportar estado de cuenta en CSV"
                            title="Exportar CSV"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={printAccountStatement}
                            aria-label="Imprimir o guardar estado de cuenta en PDF"
                            title="Imprimir / PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      `;

source =
  source.slice(0, start + startMarker.length) +
  replacementHeader +
  source.slice(end);

fs.writeFileSync(file, source);
console.log("✓ Filtros y acciones del estado de cuenta alineados en una sola fila.");
