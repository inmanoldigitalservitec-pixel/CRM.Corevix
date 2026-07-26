import fs from "node:fs";

function patchSalesBasicPage() {
  const file = "src/components/sales/sales-basic-page.tsx";
  let source = fs.readFileSync(file, "utf8");

  const replaceOnce = (search, replacement, label) => {
    if (source.includes(replacement)) return;
    if (!source.includes(search)) throw new Error(`No se encontró en SalesBasicPage: ${label}`);
    source = source.replace(search, replacement);
  };

  replaceOnce(
    `  onOpenRow?: (row: GenericRow) => void;\n};`,
    `  onOpenRow?: (row: GenericRow) => void;\n  renderRowActions?: (row: GenericRow) => ReactNode;\n};`,
    "tipo renderRowActions",
  );

  replaceOnce(
    `  canDeleteRow,\n  onOpenRow,\n}: SalesBasicPageProps) {`,
    `  canDeleteRow,\n  onOpenRow,\n  renderRowActions,\n}: SalesBasicPageProps) {`,
    "prop renderRowActions",
  );

  replaceOnce(
    `                onOpen={() => openRecordDetail(row)}\n                onDelete={() => setDeleteRow(row)}\n              />`,
    `                onOpen={() => openRecordDetail(row)}\n                onDelete={() => setDeleteRow(row)}\n                rowActions={renderRowActions?.(row)}\n              />`,
    "acciones móviles",
  );

  replaceOnce(
    `{canDelete ? <TableHead className="w-[72px] text-right">Acción</TableHead> : null}`,
    `{canDelete || renderRowActions ? (\n                    <TableHead className="w-[160px] text-right">Acciones</TableHead>\n                  ) : null}`,
    "encabezado acciones",
  );

  replaceOnce(
    `                        {canDelete ? (\n                          <TableCell className="text-right">\n                            {!canDeleteRow || canDeleteRow(row) ? (\n                            <Button`,
    `                        {canDelete || renderRowActions ? (\n                          <TableCell className="text-right">\n                            <div\n                              className="flex justify-end gap-1"\n                              onClick={(event) => event.stopPropagation()}\n                            >\n                              {renderRowActions?.(row)}\n                              {canDelete && (!canDeleteRow || canDeleteRow(row)) ? (\n                            <Button`,
    "celda acciones inicio",
  );

  replaceOnce(
    `                            ) : null}\n                          </TableCell>\n                        ) : null}`,
    `                              ) : null}\n                            </div>\n                          </TableCell>\n                        ) : null}`,
    "celda acciones cierre",
  );

  replaceOnce(
    `                      colSpan={canDelete ? 8 : 7}`,
    `                      colSpan={canDelete || renderRowActions ? 8 : 7}`,
    "colspan acciones",
  );

  replaceOnce(
    `  onOpen,\n  onDelete,\n}: {`,
    `  onOpen,\n  onDelete,\n  rowActions,\n}: {`,
    "prop móvil inicio",
  );

  replaceOnce(
    `  onDelete: () => void;\n}) {`,
    `  onDelete: () => void;\n  rowActions?: ReactNode;\n}) {`,
    "prop móvil tipo",
  );

  replaceOnce(
    `          {canDelete ? (\n            <Button`,
    `          <div\n            className="flex shrink-0 items-center gap-1"\n            onClick={(event) => event.stopPropagation()}\n          >\n            {rowActions}\n          {canDelete ? (\n            <Button`,
    "acciones móviles inicio",
  );

  replaceOnce(
    `          ) : null}\n        </div>\n      </div>\n    </article>`,
    `          ) : null}\n          </div>\n        </div>\n      </div>\n    </article>`,
    "acciones móviles cierre",
  );

  fs.writeFileSync(file, source);
}

function replaceCreditNotesRoute() {
  const file = "src/routes/credit-notes.tsx";
  const content = `import { createFileRoute } from "@tanstack/react-router";\nimport { useState } from "react";\nimport { Copy, ExternalLink, Eye } from "lucide-react";\nimport { SalesBasicPage } from "@/components/sales/sales-basic-page";\nimport { Button } from "@/components/ui/button";\nimport {\n  Dialog,\n  DialogContent,\n  DialogHeader,\n  DialogTitle,\n} from "@/components/ui/dialog";\nimport { toast } from "sonner";\n\nconst DISPLAY_LABELS: Record<string, string> = {\n  Draft: "Borrador",\n  Issued: "Emitida",\n  Applied: "Aplicada",\n  Cancelled: "Cancelada",\n};\n\nfunction displayLabel(value: string) {\n  return DISPLAY_LABELS[value] ?? value;\n}\n\nexport const Route = createFileRoute("/credit-notes")({\n  component: CreditNotesPage,\n  head: () => ({ meta: [{ title: "Notas de crédito — Corevix CRM" }] }),\n});\n\nconst STATUSES = ["Draft", "Issued", "Applied", "Cancelled"];\nconst CREATE_STATUSES = ["Draft"];\n\ntype CreditNoteRow = Record<string, any>;\n\nfunction getPublicUrl(row: CreditNoteRow) {\n  const token = String(row.public_token || "").trim();\n  if (!token || typeof window === "undefined") return null;\n  return \\`\\${window.location.origin}/credit-note/public/\\${token}\\`;\n}\n\nfunction CreditNotesPage() {\n  const [previewNote, setPreviewNote] = useState<CreditNoteRow | null>(null);\n\n  const openPublicCreditNote = (row: CreditNoteRow) => {\n    const url = getPublicUrl(row);\n    if (!url) {\n      toast.error("Esta nota de crédito todavía no tiene un enlace público.");\n      return;\n    }\n    window.open(url, "_blank", "noopener,noreferrer");\n  };\n\n  const copyPublicCreditNoteLink = async (row: CreditNoteRow) => {\n    const url = getPublicUrl(row);\n    if (!url) {\n      toast.error("Esta nota de crédito todavía no tiene un enlace público.");\n      return;\n    }\n\n    try {\n      await navigator.clipboard.writeText(url);\n      toast.success("Enlace de la nota de crédito copiado.");\n    } catch {\n      toast.error("No se pudo copiar el enlace.");\n    }\n  };\n\n  const openPreview = (row: CreditNoteRow) => {\n    if (!String(row.public_token || "").trim()) {\n      toast.error("Esta nota de crédito todavía no tiene una vista previa disponible.");\n      return;\n    }\n    setPreviewNote(row);\n  };\n\n  return (\n    <>\n      <SalesBasicPage\n        onOpenRow={openPreview}\n        renderRowActions={(row) => (\n          <>\n            <Button\n              type="button"\n              variant="ghost"\n              size="icon"\n              className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"\n              onClick={() => openPreview(row)}\n              disabled={!row.public_token}\n              title="Vista previa"\n              aria-label="Vista previa de nota de crédito"\n            >\n              <Eye className="h-4 w-4" />\n            </Button>\n            <Button\n              type="button"\n              variant="ghost"\n              size="icon"\n              className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"\n              onClick={() => openPublicCreditNote(row)}\n              disabled={!row.public_token}\n              title="Abrir en otra pestaña"\n              aria-label="Abrir nota de crédito en otra pestaña"\n            >\n              <ExternalLink className="h-4 w-4" />\n            </Button>\n            <Button\n              type="button"\n              variant="ghost"\n              size="icon"\n              className="h-8 w-8 rounded-none border-0 bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-950"\n              onClick={() => void copyPublicCreditNoteLink(row)}\n              disabled={!row.public_token}\n              title="Copiar enlace"\n              aria-label="Copiar enlace de nota de crédito"\n            >\n              <Copy className="h-4 w-4" />\n            </Button>\n          </>\n        )}\n        config={{\n          routeTitle: "Notas de crédito",\n          subtitle: "Ajustes a favor del cliente con documento fiscal imprimible.",\n          table: "credit_notes",\n          module: "credit_notes",\n          createPermission: "credit_notes.issue",\n          numberKey: "credit_note_number",\n          titleKey: "reason",\n          amountKey: "amount",\n          dateKey: "date_issued",\n          statusKey: "status",\n          statuses: STATUSES,\n          primaryLabel: "nota de crédito",\n          defaultValues: {\n            reason: "",\n            invoice_id: "none",\n            client_id: "none",\n            amount: "0",\n            status: "Draft",\n            date_issued: new Date().toISOString().slice(0, 10),\n            notes: "",\n          },\n          fields: [\n            { key: "reason", label: "Razón", type: "text", required: true, span: 2 },\n            { key: "invoice_id", label: "Factura", type: "select" },\n            { key: "client_id", label: "Cliente", type: "select" },\n            { key: "amount", label: "Monto", type: "number", required: true },\n            { key: "date_issued", label: "Fecha", type: "date" },\n            {\n              key: "status",\n              label: "Estado",\n              type: "select",\n              options: CREATE_STATUSES.map((value) => ({\n                label: value,\n                value,\n                displayLabel: displayLabel(value),\n              })),\n            },\n            { key: "notes", label: "Notas", type: "textarea" },\n          ],\n        }}\n      />\n\n      <Dialog\n        open={Boolean(previewNote)}\n        onOpenChange={(open) => {\n          if (!open) setPreviewNote(null);\n        }}\n      >\n        <DialogContent className="flex h-[94dvh] w-[96vw] max-w-[1180px] flex-col overflow-hidden p-0">\n          <DialogHeader className="border-b border-slate-200 px-5 py-4">\n            <div className="flex items-center justify-between gap-4 pr-8">\n              <div className="min-w-0">\n                <DialogTitle className="truncate text-xl font-semibold text-slate-950">\n                  {previewNote?.reason || "Vista previa de nota de crédito"}\n                </DialogTitle>\n                <p className="mt-1 text-sm text-slate-500">\n                  {previewNote?.credit_note_number || "—"} · {displayLabel(previewNote?.status || "Draft")}\n                </p>\n              </div>\n              {previewNote ? (\n                <Button\n                  type="button"\n                  variant="outline"\n                  size="sm"\n                  onClick={() => openPublicCreditNote(previewNote)}\n                >\n                  <ExternalLink className="mr-2 h-4 w-4" />\n                  Abrir en otra pestaña\n                </Button>\n              ) : null}\n            </div>\n          </DialogHeader>\n\n          <div className="min-h-0 flex-1 bg-slate-100">\n            {previewNote?.public_token ? (\n              <iframe\n                title={\\`Vista previa de la nota de crédito \\${previewNote.credit_note_number || "—"}\\`}\n                src={\\`/credit-note/public/\\${previewNote.public_token}\\`}\n                className="h-full w-full border-0 bg-white"\n              />\n            ) : (\n              <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">\n                Esta nota de crédito todavía no tiene una vista previa disponible.\n              </div>\n            )}\n          </div>\n        </DialogContent>\n      </Dialog>\n    </>\n  );\n}\n`;

  fs.writeFileSync(file, content);
}

patchSalesBasicPage();
replaceCreditNotesRoute();
console.log("✓ Vista previa y acciones de notas de crédito instaladas.");
