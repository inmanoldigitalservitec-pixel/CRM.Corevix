import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";

export type InlineStatusOption = {
  value: string;
  label: string;
};

export function InlineStatusSelect({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: InlineStatusOption[];
  onChange: (value: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (nextValue: string) => {
    if (!nextValue || nextValue === value || saving) return;

    setSaving(true);
    try {
      await onChange(nextValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Select value={value} onValueChange={(nextValue) => void handleChange(nextValue)} disabled={disabled || saving}>
        <SelectTrigger
          aria-label="Cambiar estado"
          className="h-auto min-h-7 w-auto min-w-[112px] rounded-full border-0 bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <StatusBadge status={value || "—"} />}
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
