import { useEffect, useMemo, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
}

export function SearchFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  className,
}: SearchFiltersProps) {
  const { t } = useT();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resolvedSearchPlaceholder = searchPlaceholder === "Search..." ? t("common.search") : searchPlaceholder;
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

  return (
    <>
      <div
        className={[
          "flex flex-col gap-3 sm:flex-row sm:flex-wrap",
          filters.length ? "sm:items-center" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex min-w-0 items-center gap-2 sm:flex-1">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={resolvedSearchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 border-border/50 bg-muted/30 pl-9 focus-visible:ring-1 sm:h-9"
            />
          </div>

          {filters.length ? (
            <Button
              type="button"
              variant="outline"
              className="relative h-10 shrink-0 gap-2 border-border/60 bg-white px-3 font-semibold sm:hidden"
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
          ) : null}
        </div>

        {filters.length ? (
          <div className="hidden flex-wrap gap-3 sm:flex">
            {filters.map((filter) => renderSelect(filter, "desktop"))}
          </div>
        ) : null}
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
                <h2 className="text-lg font-extrabold tracking-[-0.03em] text-slate-950">Filtros</h2>
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
