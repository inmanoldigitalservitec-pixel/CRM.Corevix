import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ListFilter, MoreHorizontal, RefreshCw, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  placeholder: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  width?: string;
  allLabel?: string;
  includeAllOption?: boolean;
}

interface SearchFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  className?: string;
  mobileCollapsible?: boolean;
  mobileFiltersLabel?: string;
}

type TaskToolbarButtons = {
  exportButton?: HTMLButtonElement;
  refreshButton?: HTMLButtonElement;
  clearButton?: HTMLButtonElement;
};

function getButtonByText(root: HTMLElement, text: string) {
  return Array.from(root.querySelectorAll("button")).find((button) =>
    (button.textContent || "").toLowerCase().includes(text.toLowerCase()),
  ) as HTMLButtonElement | undefined;
}

export function SearchFilters({
  searchValue: _searchValue,
  onSearchChange: _onSearchChange,
  searchPlaceholder: _searchPlaceholder = "Search...",
  filters = [],
  className,
  mobileCollapsible = false,
  mobileFiltersLabel = "Filtros",
}: SearchFiltersProps) {
  const { t } = useT();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taskActionMenuOpen, setTaskActionMenuOpen] = useState(false);
  const [taskActionsHost, setTaskActionsHost] = useState<HTMLDivElement | null>(null);
  const [taskToolbarButtons, setTaskToolbarButtons] = useState<TaskToolbarButtons>({});
  const activeFiltersCount = useMemo(
    () => filters.filter((filter) => filter.value && filter.value !== "all").length,
    [filters],
  );

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/tasks") return;
    const root = rootRef.current;
    const toolbar = root?.previousElementSibling as HTMLElement | null;
    const actionRow = toolbar?.querySelector(
      "div.flex.flex-wrap.items-center.gap-2",
    ) as HTMLElement | null;
    if (!root || !toolbar || !actionRow) return;

    const exportButton = getButtonByText(actionRow, "Exportar");
    const refreshButton = getButtonByText(actionRow, "Actualizar");
    const clearButton = getButtonByText(actionRow, "Limpiar filtros");
    const secondaryButtons = [exportButton, refreshButton, clearButton].filter(
      Boolean,
    ) as HTMLButtonElement[];
    if (!secondaryButtons.length) return;

    const previousDisplays = new Map<HTMLButtonElement, string>();
    secondaryButtons.forEach((button) => {
      previousDisplays.set(button, button.style.display);
      button.style.display = "none";
    });

    const host = document.createElement("div");
    host.className = "flex shrink-0 items-center";
    actionRow.classList.remove("flex-wrap");
    actionRow.classList.add("justify-between", "w-full", "flex-nowrap");
    actionRow.appendChild(host);

    setTaskToolbarButtons({ exportButton, refreshButton, clearButton });
    setTaskActionsHost(host);

    return () => {
      secondaryButtons.forEach((button) => {
        button.style.display = previousDisplays.get(button) || "";
      });
      actionRow.classList.add("flex-wrap");
      actionRow.classList.remove("justify-between", "w-full", "flex-nowrap");
      host.remove();
      setTaskActionsHost(null);
      setTaskToolbarButtons({});
      setTaskActionMenuOpen(false);
    };
  }, []);

  useEffect(() => {
    if (!taskActionMenuOpen) return;
    const close = () => setTaskActionMenuOpen(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [taskActionMenuOpen]);

  const runToolbarAction = (button?: HTMLButtonElement) => {
    setTaskActionMenuOpen(false);
    button?.click();
  };

  const renderTaskToolbarMenu = () => {
    if (!taskActionsHost) return null;

    return createPortal(
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border-border/60 bg-white shadow-sm"
          onClick={() => setTaskActionMenuOpen((open) => !open)}
          aria-label="Más acciones de tareas"
          aria-expanded={taskActionMenuOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {taskActionMenuOpen ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => runToolbarAction(taskToolbarButtons.exportButton)}
              disabled={taskToolbarButtons.exportButton?.disabled}
            >
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => runToolbarAction(taskToolbarButtons.refreshButton)}
            >
              <RefreshCw className="h-4 w-4" /> Actualizar
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => runToolbarAction(taskToolbarButtons.clearButton)}
            >
              <X className="h-4 w-4" /> Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>,
      taskActionsHost,
    );
  };

  const renderSelect = (filter: FilterConfig, mode: "desktop" | "mobile") => (
    <Select key={`${mode}-${filter.key}`} value={filter.value} onValueChange={filter.onChange}>
      <SelectTrigger
        className={
          mode === "mobile"
            ? "h-11 w-full justify-between border-border/60 bg-white text-sm font-semibold"
            : `h-9 ${filter.width || "w-40"} bg-muted/30 border-border/50`
        }
      >
        <SelectValue placeholder={filter.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filter.includeAllOption === false ? null : (
          <SelectItem value="all">
            {filter.allLabel || `${t("common.allPrefix")} ${filter.placeholder}`}
          </SelectItem>
        )}
        {filter.options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const clearAdvancedFilters = () => {
    filters.forEach((filter) => {
      if (filter.includeAllOption === false) return;
      filter.onChange("all");
    });
  };

  if (!filters.length) {
    return <>{renderTaskToolbarMenu()}</>;
  }

  return (
    <>
      {renderTaskToolbarMenu()}

      <div
        ref={rootRef}
        className={["flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex min-w-0 items-center gap-2 sm:hidden">
          <Button
            type="button"
            variant="outline"
            className="relative h-10 shrink-0 gap-2 border-border/60 bg-white px-3 font-semibold"
            onClick={() => setFiltersOpen(true)}
            aria-label="Abrir filtros"
          >
            <ListFilter className="h-4 w-4" />
            Filtros
            {activeFiltersCount ? (
              <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-slate-900 px-1.5 text-[11px] font-bold text-white">
                {activeFiltersCount}
              </span>
            ) : null}
          </Button>
        </div>

        <div className="hidden flex-wrap gap-3 sm:flex">
          {filters.map((filter) => renderSelect(filter, "desktop"))}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Cerrar filtros"
            onClick={() => setFiltersOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[26px] border border-slate-200 bg-white shadow-2xl">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">
                  Filtros
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Refina la lista sin ocupar espacio en la pantalla.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={() => setFiltersOpen(false)}
                aria-label="Cerrar filtros"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="max-h-[calc(82dvh-150px)] space-y-4 overflow-y-auto px-5 py-5">
              {filters.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    {filter.placeholder}
                  </label>
                  {renderSelect(filter, "mobile")}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={clearAdvancedFilters}
                disabled={!activeFiltersCount}
              >
                Limpiar
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setFiltersOpen(false)}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
