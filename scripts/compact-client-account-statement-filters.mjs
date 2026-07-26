import fs from "node:fs";

const file = "src/routes/clients.tsx";
let source = fs.readFileSync(file, "utf8");

const replacements = [
  [
    'className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between"',
    'className="flex flex-col gap-3 border-b border-slate-100 pb-4 xl:flex-row xl:items-end xl:justify-between"',
  ],
  ['className="min-w-[220px]"', 'className="min-w-[180px] max-w-[220px]"'],
  [
    'className="flex min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-1"',
    'className="flex min-w-0 flex-wrap items-end justify-end gap-1.5"',
  ],
  ['className="text-xs text-slate-500">Desde', 'className="text-[11px] text-slate-500">Desde'],
  ['className="text-xs text-slate-500">Hasta', 'className="text-[11px] text-slate-500">Hasta'],
  ['className="text-xs text-slate-500">Moneda', 'className="text-[11px] text-slate-500">Moneda'],
  ['className="h-9 w-[142px]"', 'className="h-8 w-[124px] px-2 text-xs"'],
  ['className="h-9 w-[142px]"', 'className="h-8 w-[124px] px-2 text-xs"'],
  ['className="h-9 w-[150px]"', 'className="h-8 w-[128px] px-2 text-xs"'],
  ['className="h-9 w-9 shrink-0"', 'className="h-8 w-8 shrink-0"'],
  ['className="h-9 w-9 shrink-0"', 'className="h-8 w-8 shrink-0"'],
];

for (const [search, replacement] of replacements) {
  if (!source.includes(search)) {
    throw new Error(`No se encontró el bloque esperado: ${search}`);
  }
  source = source.replace(search, replacement);
}

fs.writeFileSync(file, source);
console.log("✓ Filtros del estado de cuenta compactados sin scroll horizontal.");
