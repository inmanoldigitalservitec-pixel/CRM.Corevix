import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "  Plus,\n  Receipt,",
  "  Plus,\n  Printer,\n  Receipt,",
  "icono imprimir",
);

replaceOnce(
  "interface ActivityItem {",
  [
    "type AccountStatementMovement = {",
    "  id: string;",
    "  date: string;",
    '  type: "invoice" | "payment" | "credit_note";',
    "  reference: string;",
    "  description: string;",
    "  debit: number;",
    "  credit: number;",
    "  balance: number;",
    "  currency: string;",
    "  status: string;",
    "};",
    "",
    "interface ActivityItem {",
  ].join("\n"),
  "tipo de movimiento",
);

replaceOnce(
  "  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);",
  [
    "  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);",
    "  const [statementFrom, setStatementFrom] = useState(() => isoDate(-90));",
    "  const [statementTo, setStatementTo] = useState(() => isoDate());",
    '  const [statementCurrency, setStatementCurrency] = useState("all");',
  ].join("\n"),
  "filtros de estado de cuenta",
);

const selectedAnchor = "  const projectDialogClient = useMemo(";
if (!source.includes("const accountStatement = useMemo")) {
  const calculationBlock = [
    "  const accountStatement = useMemo(() => {",
    "    if (!selectedClient) {",
    "      return { currencies: [] as string[], movements: [] as AccountStatementMovement[], openingBalance: 0, invoiced: 0, paid: 0, credited: 0, closingBalance: 0, overdueBalance: 0, displayCurrency: currencySettings.baseCurrency };",
    "    }",
    "",
    "    const useBase = statementCurrency === \"all\";",
    "    const displayCurrency = useBase ? currencySettings.baseCurrency : normalizeCurrency(statementCurrency);",
    "    const currencyOf = (row: any) => normalizeCurrency(row.currency || String(row.invoice_data?.currency || \"\") || currencySettings.baseCurrency);",
    "    const currencies = Array.from(new Set([",
    "      ...selectedClient.invoices.map(currencyOf),",
    "      ...selectedClient.payments.map(currencyOf),",
    "      ...selectedClient.creditNotes.map(currencyOf),",
    "    ])).sort();",
    "    const amount = (row: any, raw: number) => {",
    "      const rowCurrencyValue = currencyOf(row);",
    "      if (!useBase && rowCurrencyValue !== displayCurrency) return null;",
    "      return useBase",
    "        ? storedOrConvertedBaseMoney(row.total_base ?? row.amount_base, row.base_currency, raw, rowCurrencyValue, currencySettings)",
    "        : Number(raw || 0);",
    "    };",
    "",
    "    const raw = [",
    "      ...selectedClient.invoices.filter((row) => normalizeStatus(row.status) !== \"cancelled\").map((row) => {",
    "        const value = amount(row, row.total);",
    "        return value == null ? null : { id: \"invoice-\" + row.id, date: String(row.updated_at || row.due_date || \"\").slice(0, 10), type: \"invoice\" as const, reference: row.number || \"Factura\", description: \"Factura emitida\", debit: value, credit: 0, currency: displayCurrency, status: row.status };",
    "      }),",
    "      ...selectedClient.completedPayments.map((row) => {",
    "        const value = amount(row, row.amount);",
    "        return value == null ? null : { id: \"payment-\" + row.id, date: String(row.payment_date || row.created_at || \"\").slice(0, 10), type: \"payment\" as const, reference: row.payment_number || row.reference || \"Pago\", description: \"Pago recibido · \" + paymentLabel(row.method), debit: 0, credit: value, currency: displayCurrency, status: row.status };",
    "      }),",
    "      ...selectedClient.appliedCreditNotes.map((row) => {",
    "        const value = amount(row, row.amount);",
    "        return value == null ? null : { id: \"credit-\" + row.id, date: String(row.date_issued || row.created_at || \"\").slice(0, 10), type: \"credit_note\" as const, reference: row.credit_note_number ? \"NC-\" + row.credit_note_number : \"Nota de crédito\", description: row.reason || \"Nota de crédito aplicada\", debit: 0, credit: value, currency: displayCurrency, status: row.status };",
    "      }),",
    "    ].filter(Boolean) as Array<Omit<AccountStatementMovement, \"balance\">>;",
    "",
    "    raw.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));",
    "    const openingBalance = raw.filter((row) => statementFrom && row.date < statementFrom).reduce((sum, row) => sum + row.debit - row.credit, 0);",
    "    const period = raw.filter((row) => (!statementFrom || row.date >= statementFrom) && (!statementTo || row.date <= statementTo));",
    "    let running = openingBalance;",
    "    const movements = period.map((row) => ({ ...row, balance: (running += row.debit - row.credit) }));",
    "    const invoiced = period.reduce((sum, row) => sum + row.debit, 0);",
    "    const paid = period.filter((row) => row.type === \"payment\").reduce((sum, row) => sum + row.credit, 0);",
    "    const credited = period.filter((row) => row.type === \"credit_note\").reduce((sum, row) => sum + row.credit, 0);",
    "    const overdueBalance = selectedClient.overdueInvoices.reduce((sum, invoice) => sum + Number(amount(invoice, invoice.total) || 0), 0);",
    "    return { currencies, movements, openingBalance, invoiced, paid, credited, closingBalance: openingBalance + invoiced - paid - credited, overdueBalance, displayCurrency };",
    "  }, [currencySettings, selectedClient, statementCurrency, statementFrom, statementTo]);",
    "",
    "  const exportAccountStatement = () => {",
    "    if (!selectedClient) return;",
    "    const rows = [[\"Fecha\", \"Tipo\", \"Referencia\", \"Descripción\", \"Débito\", \"Crédito\", \"Saldo\", \"Moneda\", \"Estado\"], ...accountStatement.movements.map((row) => [row.date, row.type, row.reference, row.description, row.debit, row.credit, row.balance, row.currency, row.status])];",
    "    const csv = rows.map((row) => row.map((value) => '\"' + String(value ?? \"\").replaceAll('\"', '\"\"') + '\"').join(\",\")).join(\"\\n\");",
    "    const blob = new Blob([csv], { type: \"text/csv;charset=utf-8;\" });",
    "    const url = URL.createObjectURL(blob);",
    "    const link = document.createElement(\"a\");",
    "    link.href = url;",
    "    link.download = \"estado-cuenta-\" + selectedClient.company_name.replace(/[^a-z0-9]+/gi, \"-\").toLowerCase() + \".csv\";",
    "    link.click();",
    "    URL.revokeObjectURL(url);",
    "  };",
    "",
    "  const printAccountStatement = () => {",
    "    window.print();",
    "  };",
    "",
    selectedAnchor,
  ].join("\n");

  replaceOnce(selectedAnchor, calculationBlock, "cálculo del estado de cuenta");
}

const contactsAnchor = '                    <TabsContent\n                      data-demo="client-360-contacts-section"';
if (!source.includes('data-demo="client-360-statement"')) {
  const statementBlock = [
    '                    <TabsContent data-demo="client-360-statement" value="statement" className="space-y-5">',
    '                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 xl:flex-row xl:items-end xl:justify-between">',
    '                        <div><h3 className="text-base font-semibold text-slate-950">Estado de cuenta</h3><p className="mt-1 text-sm text-slate-500">Facturas, pagos y notas de crédito con saldo acumulado.</p></div>',
    '                        <div className="flex flex-wrap items-end gap-2">',
    '                          <div className="space-y-1"><Label className="text-xs text-slate-500">Desde</Label><Input type="date" value={statementFrom} onChange={(event) => setStatementFrom(event.target.value)} className="h-9 w-[150px]" /></div>',
    '                          <div className="space-y-1"><Label className="text-xs text-slate-500">Hasta</Label><Input type="date" value={statementTo} onChange={(event) => setStatementTo(event.target.value)} className="h-9 w-[150px]" /></div>',
    '                          <div className="space-y-1"><Label className="text-xs text-slate-500">Moneda</Label><Select value={statementCurrency} onValueChange={setStatementCurrency}><SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Moneda base</SelectItem>{accountStatement.currencies.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select></div>',
    '                          <Button type="button" variant="outline" size="sm" className="h-9" onClick={exportAccountStatement}><Download className="mr-2 h-4 w-4" />CSV</Button>',
    '                          <Button type="button" variant="outline" size="sm" className="h-9" onClick={printAccountStatement}><Printer className="mr-2 h-4 w-4" />Imprimir / PDF</Button>',
    '                        </div>',
    '                      </div>',
    '                      <CrmDetailSummaryGrid columns={4} items={[',
    '                        { key: "opening", label: "Saldo inicial", value: money(accountStatement.openingBalance, accountStatement.displayCurrency) },',
    '                        { key: "invoiced", label: "Facturado", value: money(accountStatement.invoiced, accountStatement.displayCurrency) },',
    '                        { key: "paid", label: "Pagos recibidos", value: money(accountStatement.paid, accountStatement.displayCurrency) },',
    '                        { key: "credits", label: "Notas de crédito", value: money(accountStatement.credited, accountStatement.displayCurrency) },',
    '                        { key: "overdue", label: "Monto vencido", value: money(accountStatement.overdueBalance, accountStatement.displayCurrency) },',
    '                        { key: "closing", label: "Saldo pendiente", value: money(accountStatement.closingBalance, accountStatement.displayCurrency) },',
    '                      ]} />',
    '                      <div className="overflow-x-auto border-y border-slate-100">',
    '                        <Table className="min-w-[860px]">',
    '                          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Movimiento</TableHead><TableHead>Referencia</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Débito</TableHead><TableHead className="text-right">Crédito</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>',
    '                          <TableBody>{accountStatement.movements.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">No hay movimientos en el período seleccionado.</TableCell></TableRow> : accountStatement.movements.map((row) => <TableRow key={row.id}><TableCell>{formatDate(row.date)}</TableCell><TableCell>{row.type === "invoice" ? "Factura" : row.type === "payment" ? "Pago" : "Nota de crédito"}</TableCell><TableCell className="font-medium text-slate-950">{row.reference}</TableCell><TableCell className="max-w-[260px] truncate text-slate-500">{row.description}</TableCell><TableCell className="text-right">{row.debit ? money(row.debit, row.currency) : "—"}</TableCell><TableCell className="text-right text-emerald-700">{row.credit ? money(row.credit, row.currency) : "—"}</TableCell><TableCell className="text-right font-semibold text-slate-950">{money(row.balance, row.currency)}</TableCell></TableRow>)}</TableBody>',
    '                        </Table>',
    '                      </div>',
    '                      <p className="text-xs text-slate-500">El saldo se calcula con facturas no canceladas menos pagos completados y notas de crédito emitidas o aplicadas.</p>',
    '                    </TabsContent>',
    '',
    contactsAnchor,
  ].join("\n");

  replaceOnce(contactsAnchor, statementBlock, "contenido estado de cuenta");
}

fs.writeFileSync(file, source);
console.log("✓ Estado de cuenta completo implementado en Cliente 360.");
