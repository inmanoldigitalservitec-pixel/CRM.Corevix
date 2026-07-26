import fs from "node:fs";

const file = "src/routes/estimates.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  `import { Badge } from "@/components/ui/badge";`,
  `import { StatusBadge } from "@/components/ui/status-badge";`,
  "importación StatusBadge",
);

replaceOnce(
  `<div className="overflow-hidden border border-slate-200 bg-white">\n          <Table>\n            <TableHeader>`,
  `<section className="border-y border-slate-100 bg-white">\n          <div className="overflow-x-auto">\n          <Table>\n            <TableHeader className="bg-white">`,
  "contenedor de tabla",
);

replaceOnce(
  `<TableHead>Número</TableHead>\n                <TableHead>Título</TableHead>\n                <TableHead>Cliente</TableHead>\n                <TableHead>Estado</TableHead>\n                <TableHead>Monto</TableHead>\n                <TableHead>Vence</TableHead>\n                <TableHead className="text-right">Acciones</TableHead>`,
  `<TableHead className="pl-4 sm:pl-5">Número</TableHead>\n                <TableHead>Título</TableHead>\n                <TableHead>Cliente</TableHead>\n                <TableHead>Estado</TableHead>\n                <TableHead className="hidden md:table-cell">Monto</TableHead>\n                <TableHead className="hidden lg:table-cell">Vence</TableHead>\n                <TableHead className="pr-4 text-right sm:pr-5">Acciones</TableHead>`,
  "encabezados",
);

replaceOnce(
  `className="cursor-pointer transition-colors hover:bg-slate-50"`,
  `className="cursor-pointer transition-colors hover:bg-slate-50/70"`,
  "hover de fila",
);

replaceOnce(
  `<TableCell className="font-semibold text-slate-600">\n                    EST-{estimate.number || "—"}\n                  </TableCell>`,
  `<TableCell className="pl-4 font-normal text-slate-500 sm:pl-5">\n                    EST-{estimate.number || "—"}\n                  </TableCell>`,
  "número",
);

replaceOnce(
  `<TableCell className="font-bold text-slate-950">{estimate.title}</TableCell>`,
  `<TableCell>\n                    <div className="font-normal text-slate-900">{estimate.title}</div>\n                    <div className="text-xs text-slate-500">\n                      {estimate.reference || "Sin referencia"}\n                    </div>\n                  </TableCell>`,
  "título",
);

replaceOnce(
  `<TableCell>{estimate.client_id ? clientById.get(estimate.client_id)?.company_name || "—" : "—"}</TableCell>`,
  `<TableCell className="text-slate-600">\n                    {estimate.client_id ? clientById.get(estimate.client_id)?.company_name || "—" : "—"}\n                  </TableCell>`,
  "cliente",
);

replaceOnce(
  `<Badge variant="secondary">{displayLabel(estimate.status)}</Badge>`,
  `<StatusBadge status={estimate.status} />`,
  "estado",
);

replaceOnce(
  `<TableCell className="font-semibold">\n                    {formatCurrencyAmount(estimate.total || 0, estimate.currency || currencySettings.baseCurrency)}\n                  </TableCell>`,
  `<TableCell className="hidden font-normal md:table-cell">\n                    {formatCurrencyAmount(estimate.total || 0, estimate.currency || currencySettings.baseCurrency)}\n                  </TableCell>`,
  "monto",
);

replaceOnce(
  `<TableCell>{estimate.expiry_date || "—"}</TableCell>`,
  `<TableCell className="hidden text-sm text-slate-500 lg:table-cell">\n                    {estimate.expiry_date || "—"}\n                  </TableCell>`,
  "vencimiento",
);

replaceOnce(
  `<TableCell className="text-right">\n                    <div\n                        className="flex justify-end gap-2"`,
  `<TableCell className="pr-4 text-right sm:pr-5">\n                    <div\n                        className="flex justify-end gap-1.5"`,
  "celda acciones",
);

source = source.replaceAll(
  `className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"`,
  `className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent px-0 text-slate-600 shadow-none hover:bg-transparent hover:text-slate-950"`,
);

// El botón Editar puede variar levemente según parches anteriores. Lo transformamos
// con una expresión regular flexible y no detenemos el resto del parche si ya cambió.
source = source.replace(
  /<Button\s+type="button"\s+variant="(?:ghost|outline)"\s+size="(?:icon|sm)"\s+className="[^"]*"\s+onClick=\{\(\) => openEditBuilder\(estimate\)\}\s+title="Editar cotización"\s+aria-label="Editar cotización"\s*>\s*<Pencil className="h-4 w-4" \/>\s*<\/Button>/m,
  `<Button\n                         type="button"\n                         variant="outline"\n                         size="sm"\n                         className="h-8 rounded-full bg-blue-600 px-3 text-xs font-normal text-white shadow-none hover:bg-blue-700"\n                         onClick={() => openEditBuilder(estimate)}\n                         title="Editar cotización"\n                         aria-label="Editar cotización"\n                       >\n                         <Pencil className="h-3.5 w-3.5" />\n                         Editar\n                       </Button>`,
);

replaceOnce(
  `          </Table>\n        </div>\n      </div>`,
  `          </Table>\n          </div>\n        </section>\n      </div>`,
  "cierre tabla",
);

fs.writeFileSync(file, source);
console.log("✓ Tabla de cotizaciones alineada con el estilo visual de propuestas.");
