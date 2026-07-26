import fs from "node:fs";

const file = "src/routes/estimates.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  `  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);`,
  `  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);\n  const [previewEstimate, setPreviewEstimate] = useState<Estimate | null>(null);`,
  "estado de vista previa",
);

replaceOnce(
  `  const openPublicEstimate = (estimate: Estimate) => {`,
  `  const openEstimatePreview = (estimate: Estimate) => {\n    if (!estimate.public_token) {\n      toast.error("Esta cotización todavía no tiene una vista previa disponible.");\n      return;\n    }\n\n    setPreviewEstimate(estimate);\n  };\n\n  const openPublicEstimate = (estimate: Estimate) => {`,
  "función de vista previa",
);

replaceOnce(
  `<TableRow key={estimate.id}>`,
  `<TableRow\n                  key={estimate.id}\n                  className="cursor-pointer transition-colors hover:bg-slate-50"\n                  onClick={() => openEstimatePreview(estimate)}\n                >`,
  "fila interactiva",
);

replaceOnce(
  `<div className="flex justify-end gap-2">`,
  `<div\n                        className="flex justify-end gap-2"\n                        onClick={(event) => event.stopPropagation()}\n                      >`,
  "acciones sin propagación",
);

replaceOnce(
  `      <Dialog\n        open={builderOpen}`,
  `      <Dialog\n        open={Boolean(previewEstimate)}\n        onOpenChange={(open) => {\n          if (!open) setPreviewEstimate(null);\n        }}\n      >\n        <DialogContent className="flex h-[94dvh] w-[96vw] max-w-[1180px] flex-col overflow-hidden p-0">\n          <DialogHeader className="border-b border-slate-200 px-5 py-4">\n            <div className="flex items-center justify-between gap-4 pr-8">\n              <div className="min-w-0">\n                <DialogTitle className="truncate text-xl font-semibold text-slate-950">\n                  {previewEstimate?.title || "Vista previa de cotización"}\n                </DialogTitle>\n                <p className="mt-1 text-sm text-slate-500">\n                  EST-{previewEstimate?.number || "—"} · {displayLabel(previewEstimate?.status || "Draft")}\n                </p>\n              </div>\n              {previewEstimate ? (\n                <Button\n                  type="button"\n                  variant="outline"\n                  size="sm"\n                  onClick={() => openPublicEstimate(previewEstimate)}\n                >\n                  <ExternalLink className="mr-2 h-4 w-4" />\n                  Abrir en otra pestaña\n                </Button>\n              ) : null}\n            </div>\n          </DialogHeader>\n\n          <div className="min-h-0 flex-1 bg-slate-100">\n            {previewEstimate?.public_token ? (\n              <iframe\n                title={\`Vista previa de la cotización EST-\${previewEstimate.number || "—"}\`}\n                src={\`/estimate/public/\${previewEstimate.public_token}\`}\n                className="h-full w-full border-0 bg-white"\n              />\n            ) : (\n              <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">\n                Esta cotización todavía no tiene una vista previa disponible.\n              </div>\n            )}\n          </div>\n        </DialogContent>\n      </Dialog>\n\n      <Dialog\n        open={builderOpen}`,
  "diálogo de vista previa",
);

fs.writeFileSync(file, source);
console.log("✓ Vista previa de cotizaciones activada al pulsar una fila.");
