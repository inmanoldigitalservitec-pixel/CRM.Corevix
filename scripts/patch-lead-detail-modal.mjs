import fs from "node:fs";

function patchDetailSheet() {
  const file = "src/components/crm/detail-sheet.tsx";
  let source = fs.readFileSync(file, "utf8");

  if (!source.includes('from "@/components/ui/dialog"')) {
    source = source.replace(
      `import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";`,
      `import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";\nimport { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";`,
    );
  }

  if (!source.includes('presentation?: "sheet" | "modal";')) {
    source = source.replace(
      `  size?: DetailSheetSize;`,
      `  size?: DetailSheetSize;\n  presentation?: "sheet" | "modal";`,
    );
  }

  if (!source.includes('presentation = "sheet"')) {
    source = source.replace(
      `  size = "md",`,
      `  size = "md",\n  presentation = "sheet",`,
    );
  }

  if (!source.includes("if (presentation === \"modal\")")) {
    const anchor = `  return (\n    <Sheet open={open} onOpenChange={handleOpenChange}>`;
    if (!source.includes(anchor)) throw new Error("No se encontró el retorno principal de DetailSheet.");

    const modalBlock = `  if (presentation === "modal") {\n    return (\n      <Dialog open={open} onOpenChange={handleOpenChange}>\n        <DialogContent className="flex h-[94dvh] w-[calc(100vw-24px)] max-w-[1050px] flex-col gap-0 overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-xl [&>button.absolute.right-4.top-4]:hidden">\n          <DialogTitle className="sr-only">{title || "Detalle"}</DialogTitle>\n          <DialogDescription className="sr-only">{subtitle || "Panel de detalles"}</DialogDescription>\n          {hasHeaderContent ? (\n            <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 text-left sm:px-5">\n              <div className="flex items-start justify-between gap-4">\n                <div className="flex min-w-0 items-start gap-3">\n                  {icon ? (\n                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-600">\n                      {icon}\n                    </div>\n                  ) : null}\n                  <div className="min-w-0">\n                    {title ? (\n                      <h2 className="truncate text-xl font-normal tracking-normal text-slate-950">{title}</h2>\n                    ) : null}\n                    {subtitle ? (\n                      <p className="mt-1 truncate text-sm font-normal text-slate-500">{subtitle}</p>\n                    ) : null}\n                    <div className="mt-2 flex flex-wrap items-center gap-2">\n                      {status ? <StatusBadge status={status} /> : null}\n                      {badges || null}\n                    </div>\n                  </div>\n                </div>\n                <button\n                  type="button"\n                  onClick={handleClose}\n                  className="grid h-9 w-9 place-items-center rounded-none border-b border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-950"\n                  aria-label={t("common.close")}\n                  title={t("common.close")}\n                >\n                  <X className="h-4 w-4" />\n                </button>\n              </div>\n              <div className="mt-3 flex flex-wrap items-center gap-2">\n                {actions ? actions : (\n                  <>\n                    {onEdit ? (\n                      <Button variant="outline" size="sm" onClick={onEdit} className="h-8 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-normal shadow-none">\n                        <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}\n                      </Button>\n                    ) : null}\n                    {onDelete ? (\n                      <Button variant="outline" size="sm" onClick={onDelete} className="h-8 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-normal text-destructive shadow-none hover:text-destructive">\n                        <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}\n                      </Button>\n                    ) : null}\n                  </>\n                )}\n              </div>\n            </DialogHeader>\n          ) : null}\n\n          <ScrollArea className="min-h-0 flex-1 bg-white">\n            <div className="mx-auto w-full max-w-5xl space-y-4 bg-white px-4 py-5 sm:px-6">\n              {fields.length > 0 ? (\n                <div data-demo={fieldGroupDataDemo} className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100 pb-5">\n                  {fields.map((field) => (\n                    <div key={field.label} className={field.type === "tags" ? "col-span-2" : ""}>\n                      <span className="text-[11px] font-normal uppercase tracking-wide text-slate-500">{field.label}</span>\n                      <p className="mt-1 text-sm font-normal text-slate-950">{field.value || t("common.none")}</p>\n                    </div>\n                  ))}\n                </div>\n              ) : null}\n              {notes ? (\n                <>\n                  <Separator />\n                  <div>\n                    <span className="text-[11px] font-normal uppercase tracking-wide text-slate-500">{t("common.notes")}</span>\n                    <p className="mt-1 whitespace-pre-wrap text-sm font-normal text-slate-600">{notes}</p>\n                  </div>\n                </>\n              ) : null}\n              {children ? <>{children}</> : null}\n            </div>\n          </ScrollArea>\n        </DialogContent>\n      </Dialog>\n    );\n  }\n\n`;

    source = source.replace(anchor, modalBlock + anchor);
  }

  fs.writeFileSync(file, source);
}

function patchLeads() {
  const file = "src/routes/leads.tsx";
  let source = fs.readFileSync(file, "utf8");

  if (!source.includes('presentation="modal"')) {
    const anchor = `          size="lg"\n          icon={<Users className="h-5 w-5 text-blue-600" />}`;
    if (!source.includes(anchor)) throw new Error("No se encontró el DetailSheet del prospecto.");
    source = source.replace(
      anchor,
      `          size="lg"\n          presentation="modal"\n          icon={<Users className="h-5 w-5 text-blue-600" />}`,
    );
  }

  fs.writeFileSync(file, source);
}

patchDetailSheet();
patchLeads();
console.log("✓ Detalle de prospectos convertido en ventana modal centrada.");
