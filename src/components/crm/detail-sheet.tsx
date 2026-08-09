import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X } from "lucide-react";
import { useT } from "@/i18n";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

interface DetailField {
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "badge" | "tags" | "currency";
}

type DetailSheetSize = "md" | "lg";

interface DetailSheetProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  status?: string;
  badges?: ReactNode;
  icon?: ReactNode;
  accent?: "blue" | "green" | "violet" | "orange" | "amber" | "slate";
  size?: DetailSheetSize;
  presentation?: "sheet" | "modal";
  fields?: DetailField[];
  fieldGroupDataDemo?: string;
  notes?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

function getSheetWidth(size: DetailSheetSize | undefined) {
  if (size === "lg") return "w-full sm:max-w-[640px]";
  return "w-full sm:max-w-[520px]";
}

export function DetailSheet({
  open,
  onClose,
  onOpenChange,
  title,
  subtitle,
  status,
  badges,
  icon,
  accent: _accent = "slate",
  size = "md",
  presentation = "sheet",
  fields = [],
  fieldGroupDataDemo,
  notes,
  onEdit,
  onDelete,
  actions,
  children,
}: DetailSheetProps) {
  const { t } = useT();
  const hasHeaderContent = Boolean(
    title || subtitle || status || badges || icon || actions || onEdit || onDelete,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen) onClose?.();
  };

  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  if (!hasHeaderContent && fields.length === 0 && children) {
    return (
      <TaskDetailDialog open={open} onOpenChange={handleOpenChange}>
        {children}
      </TaskDetailDialog>
    );
  }

  if (presentation === "modal") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[94dvh] w-[calc(100vw-24px)] max-w-[1050px] flex-col gap-0 overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-xl [&>button.absolute.right-4.top-4]:hidden">
          <DialogTitle className="sr-only">{title || "Detalle"}</DialogTitle>
          <DialogDescription className="sr-only">{subtitle || "Panel de detalles"}</DialogDescription>
          {hasHeaderContent ? (
            <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 text-left sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  {icon ? (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-600">
                      {icon}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    {title ? (
                      <h2 className="truncate text-xl font-normal tracking-normal text-slate-950">{title}</h2>
                    ) : null}
                    {subtitle ? (
                      <p className="mt-1 truncate text-sm font-normal text-slate-500">{subtitle}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {status ? <StatusBadge status={status} /> : null}
                      {badges || null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="grid h-9 w-9 place-items-center rounded-none border-b border-slate-200 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-950"
                  aria-label={t("common.close")}
                  title={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {actions ? actions : (
                  <>
                    {onEdit ? (
                      <Button variant="outline" size="sm" onClick={onEdit} className="h-8 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-normal shadow-none">
                        <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button variant="outline" size="sm" onClick={onDelete} className="h-8 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-normal text-destructive shadow-none hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </DialogHeader>
          ) : null}

          <ScrollArea className="min-h-0 flex-1 bg-white">
            <div className="mx-auto w-full max-w-5xl space-y-4 bg-white px-4 py-5 sm:px-6">
              {fields.length > 0 ? (
                <div data-demo={fieldGroupDataDemo} className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100 pb-5">
                  {fields.map((field) => (
                    <div key={field.label} className={field.type === "tags" ? "col-span-2" : ""}>
                      <span className="text-[11px] font-normal uppercase tracking-wide text-slate-500">{field.label}</span>
                      <p className="mt-1 text-sm font-normal text-slate-950">{field.value || t("common.none")}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {notes ? (
                <>
                  <Separator />
                  <div>
                    <span className="text-[11px] font-normal uppercase tracking-wide text-slate-500">{t("common.notes")}</span>
                    <p className="mt-1 whitespace-pre-wrap text-sm font-normal text-slate-600">{notes}</p>
                  </div>
                </>
              ) : null}
              {children ? <>{children}</> : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className={
          getSheetWidth(size) +
          " border-l border-slate-200 bg-white p-0 shadow-none [&>button]:hidden"
        }
      >
        {hasHeaderContent ? (
          <SheetHeader className="border-b border-slate-100 bg-white px-4 py-4 text-left sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {icon ? (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-none">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  {title ? (
                    <SheetTitle className="truncate text-xl font-normal tracking-normal text-slate-950">
                      {title}
                    </SheetTitle>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-1 truncate text-sm font-normal text-slate-500">{subtitle}</p>
                  ) : null}
                  <SheetDescription className="sr-only">
                    {subtitle || title || "Panel de detalles"}
                  </SheetDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {status ? <StatusBadge status={status} /> : null}
                    {badges ? badges : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-none transition hover:bg-slate-50"
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {actions ? (
                actions
              ) : (
                <>
                  {onEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEdit}
                      className="h-8 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-normal shadow-none"
                    >
                      <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDelete}
                      className="h-8 gap-1.5 rounded-full border-slate-200 bg-white text-xs font-normal text-destructive shadow-none hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </SheetHeader>
        ) : null}

        <ScrollArea className={hasHeaderContent ? "h-[calc(100vh-118px)] bg-white" : "h-screen"}>
          <div className="space-y-4 bg-white px-4 py-5">
            {fields.length > 0 ? (
              <div
                data-demo={fieldGroupDataDemo}
                className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-slate-100 pb-5"
              >
                {fields.map((field) => (
                  <div key={field.label} className={field.type === "tags" ? "col-span-2" : ""}>
                    <span className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                      {field.label}
                    </span>
                    {field.type === "badge" && field.value ? (
                      <div className="mt-1">
                        <StatusBadge status={String(field.value)} />
                      </div>
                    ) : field.type === "currency" ? (
                      <p className="mt-1 text-sm font-normal text-slate-950">
                        ${Number(field.value || 0).toLocaleString()}
                      </p>
                    ) : field.type === "tags" && field.value ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {String(field.value)
                          .split(",")
                          .map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-100 bg-white px-2 py-0.5 text-[10px] font-normal text-slate-500"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm font-normal text-slate-950">
                        {field.value || t("common.none")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {notes ? (
              <>
                <Separator />
                <div>
                  <span className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                    {t("common.notes")}
                  </span>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-normal text-slate-600">
                    {notes}
                  </p>
                </div>
              </>
            ) : null}
            {children && <>{children}</>}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
