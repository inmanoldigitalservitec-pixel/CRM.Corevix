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
  onClose: () => void;
  title: string;
  subtitle?: string;
  status?: string;
  badges?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "blue" | "green" | "violet" | "orange" | "amber" | "slate";
  size?: DetailSheetSize;
  fields: DetailField[];
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

export function DetailSheet({
  open,
  onClose,
  title,
  subtitle,
  status,
  badges,
  icon,
  accent = "slate",
  size = "md",
  fields,
  fieldGroupDataDemo,
  notes,
  onEdit,
  onDelete,
  actions,
  children,
}: DetailSheetProps) {
  const { t } = useT();
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className={getSheetWidth(size) + " p-0"}>
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
                <SheetTitle className="text-[18px] font-semibold tracking-[-0.02em] truncate">
                  {title}
                </SheetTitle>
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
                onClick={onClose}
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

        <ScrollArea className="h-[calc(100vh-118px)]">
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
