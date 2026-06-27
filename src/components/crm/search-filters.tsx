import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  return (
    <div
      className={["flex flex-col sm:flex-row flex-wrap gap-3", className].filter(Boolean).join(" ")}
    >
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder === "Search..." ? t("common.search") : searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-muted/30 border-border/50 focus-visible:ring-1"
        />
      </div>
      {filters.map((filter) => (
        <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className={`h-9 ${filter.width || "w-40"} bg-muted/30 border-border/50`}>
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
      ))}
    </div>
  );
}
