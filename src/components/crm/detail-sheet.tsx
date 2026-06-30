import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, X } from "lucide-react";
import { useT } from "@/i18n";

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
  badges?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "blue" | "green" | "violet" | "orange" | "amber" | "slate";
  size?: DetailSheetSize;
  fields?: DetailField[];
  fieldGroupDataDemo?: string;
  notes?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const ACCENT_CLASS: Record<NonNullable<DetailSheetProps["accent"]>, string> = {
  blue: "from-blue-600/30 via-blue-500/10 to-transparent",
  green: "from-emerald-600/30 via-emerald-500/10 to-transparent",
  violet: "from-violet-600/30 via-violet-500/10 to-transparent",
  orange: "from-orange-600/30 via-orange-500/10 to-transparent",
  amber: "from-amber-600/30 via-amber-500/10 to-transparent",
  slate: "from-slate-600/30 via-slate-500/10 to-transparent",
};

function getSheetWidth(size: DetailSheetSize | undefined) {
  if (size === "lg") return "w-full sm:max-w-[640px]";
  return "w-full sm:max-w-[520px]";
}

function getGoogleDrivePreviewUrl(rawHref: string | null | undefined) {
  if (!rawHref) return null;

  try {
    const url = new URL(rawHref);
    const pathname = url.pathname || "";

    const fileMatch = pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

    const docsMatch = pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
    if (docsMatch?.[1] && docsMatch?.[2]) {
      return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
    }

    const queryId = url.searchParams.get("id");
    if (queryId) return `https://drive.google.com/file/d/${queryId}/preview`;

    return null;
  } catch {
    return null;
  }
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
  accent = "slate",
  size = "md",
  fields = [],
  fieldGroupDataDemo,
  notes,
  onEdit,
  onDelete,
  actions,
  children,
}: DetailSheetProps) {
  const { t } = useT();
  const customDialogContentRef = useRef<HTMLDivElement | null>(null);
  const [drivePreview, setDrivePreview] = useState<{ url: string; title: string } | null>(null);

  const hasHeaderContent = Boolean(title || subtitle || status || badges || icon || actions || onEdit || onDelete);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen) onClose?.();
  };

  const handleClose = () => {
    onOpenChange?.(false);
    onClose?.();
  };

  useEffect(() => {
    if (!open || hasHeaderContent || fields.length > 0) return;

    const timer = window.setTimeout(() => {
      const root = customDialogContentRef.current;
      if (!root) return;

      const anchors = Array.from(
        root.querySelectorAll<HTMLAnchorElement>(
          'a[href*="drive.google.com"], a[href*="docs.google.com"]',
        ),
      );

      for (const anchor of anchors) {
        const previewUrl = getGoogleDrivePreviewUrl(anchor.href);
        if (!previewUrl) continue;

        const actionsContainer = anchor.parentElement;
        if (!actionsContainer || actionsContainer.querySelector("[data-corevix-drive-preview-button]")) {
          continue;
        }

        const fileCard = anchor.closest(".rounded-xl");
        const fileTitle =
          fileCard?.querySelector(".truncate")?.textContent?.trim() ||
          anchor.getAttribute("aria-label") ||
          "Vista previa de Drive";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Preview";
        button.setAttribute("data-corevix-drive-preview-button", "true");
        button.className =
          "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-950";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setDrivePreview({ url: previewUrl, title: fileTitle });
        });

        actionsContainer.insertBefore(button, anchor);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, hasHeaderContent, fields.length, children]);

  if (!hasHeaderContent && fields.length === 0 && children) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 overflow-hidden rounded-none border-0 bg-slate-50 p-0 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-24px)] sm:max-w-[1180px] sm:rounded-3xl sm:border">
            <ScrollArea className="h-full max-h-[100dvh] sm:max-h-[92vh]">
              <div
                ref={customDialogContentRef}
                className="p-3 sm:p-5 [&>div]:grid [&>div]:grid-cols-1 [&>div]:gap-5 [&>div]:space-y-0 lg:[&>div]:grid-cols-[minmax(0,1fr)_390px] lg:[&>div>*:first-child]:col-span-2 [&>div>*:first-child]:sticky [&>div>*:first-child]:top-0 [&>div>*:first-child]:z-20 [&>div>*:first-child]:shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
              >
                {children}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={!!drivePreview} onOpenChange={(nextOpen) => !nextOpen && setDrivePreview(null)}>
          <DialogContent className="h-[92dvh] w-[calc(100vw-20px)] max-w-[1040px] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Preview de Drive
                </div>
                <div className="truncate text-sm font-semibold text-slate-900">
                  {drivePreview?.title || "Archivo"}
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setDrivePreview(null)}>
                Cerrar
              </Button>
            </div>
            {drivePreview?.url ? (
              <iframe
                src={drivePreview.url}
                title={drivePreview.title || "Preview de Drive"}
                className="h-[calc(92dvh-57px)] w-full border-0 bg-slate-100"
                allow="autoplay"
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className={getSheetWidth(size) + " p-0"}>
        {hasHeaderContent ? (
          <SheetHeader className="relative border-b px-5 py-4 text-left">
            <div
              className={
                "pointer-events-none absolute inset-x-0 top-0 h-[84px] bg-gradient-to-b " +
                ACCENT_CLASS[accent]
              }
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {icon ? (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-background/85 shadow-[0_12px_24px_rgba(15,23,42,.06)]">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  {title ? (
                    <SheetTitle className="text-[18px] font-semibold tracking-[-0.02em] truncate">
                      {title}
                    </SheetTitle>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-0.5 text-[13px] text-muted-foreground truncate">{subtitle}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {status ? <StatusBadge status={status} /> : null}
                    {badges ? badges : null}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="grid h-9 w-9 place-items-center rounded-[12px] border bg-background/90 text-muted-foreground shadow-[0_10px_22px_rgba(15,23,42,.06)] transition hover:-translate-y-[1px] hover:bg-background"
                  aria-label={t("common.close")}
                  title={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-3 flex flex-wrap items-center gap-2">
              {actions ? (
                actions
              ) : (
                <>
                  {onEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEdit}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDelete}
                      className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </SheetHeader>
        ) : null}

        <ScrollArea className={hasHeaderContent ? "h-[calc(100vh-118px)]" : "h-screen"}>
          <div className="p-4 space-y-3">
            {fields.length > 0 ? (
              <div data-demo={fieldGroupDataDemo} className="grid grid-cols-2 gap-4">
                {fields.map((f) => (
                  <div key={f.label} className={f.type === "tags" ? "col-span-2" : ""}>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {f.label}
                    </span>
                    {f.type === "badge" && f.value ? (
                      <div className="mt-1">
                        <StatusBadge status={String(f.value)} />
                      </div>
                    ) : f.type === "currency" ? (
                      <p className="text-sm font-semibold mt-0.5">
                        ${Number(f.value || 0).toLocaleString()}
                      </p>
                    ) : f.type === "tags" && f.value ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {String(f.value)
                          .split(",")
                          .map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                            >
                              {t.trim()}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium mt-0.5">{f.value || t("common.none")}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {notes && (
              <>
                <Separator />
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    {t("common.notes")}
                  </span>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">{notes}</p>
                </div>
              </>
            )}
            {children && <>{children}</>}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
