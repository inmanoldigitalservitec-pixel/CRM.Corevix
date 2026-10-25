import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommercialEntityRef } from "@/lib/commercial-follow-ups";
import {
  ENTITY_LABELS,
  searchCommercialEntities,
  type CommercialEntityOption,
} from "./commercial-follow-up-ui";

export function CommercialEntityPicker({
  companyId,
  value,
  selectedLabel,
  onChange,
  disabled = false,
}: {
  companyId: string;
  value: CommercialEntityRef | null;
  selectedLabel?: string;
  onChange: (entity: CommercialEntityRef | null, label?: string) => void;
  disabled?: boolean;
}) {
  const [type, setType] = useState<CommercialEntityRef["type"]>(value?.type || "lead");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CommercialEntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (disabled || query.trim().length < 2) {
      setOptions([]);
      setError("");
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await searchCommercialEntities(companyId, type, query);
        if (!cancelled) setOptions(result);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo buscar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companyId, disabled, query, type]);

  if (disabled && value) {
    return (
      <div className="border-b border-slate-200 px-1 py-2">
        <span className="block text-xs font-medium text-blue-700">{ENTITY_LABELS[value.type]}</span>
        <span className="block font-semibold text-slate-950">
          {selectedLabel || `${ENTITY_LABELS[value.type]} vinculado`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="commercial-entity-search">Registro comercial</Label>
      <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
        <Select
          value={type}
          onValueChange={(next) => {
            setType(next as CommercialEntityRef["type"]);
            onChange(null);
            setQuery("");
          }}
        >
          <SelectTrigger aria-label="Tipo de registro" className="shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Prospecto</SelectItem>
            <SelectItem value="deal">Oportunidad</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="commercial-entity-search"
            className="pl-9 shadow-none"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(null);
            }}
            placeholder="Buscar por nombre (mín. 2 caracteres)"
            autoComplete="off"
          />
        </div>
      </div>
      {value ? (
        <div className="border-l-2 border-blue-500 px-3 py-2 text-sm text-slate-700">
          Seleccionado: <strong>{selectedLabel || ENTITY_LABELS[value.type]}</strong>
        </div>
      ) : null}
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {!loading && query.trim().length >= 2 && !error ? (
        <div
          className="max-h-44 overflow-y-auto rounded-lg border"
          role="listbox"
          aria-label="Registros encontrados"
        >
          {options.length ? (
            options.map((option) => (
              <button
                key={option.entity.id}
                type="button"
                role="option"
                aria-selected={value?.id === option.entity.id}
                onClick={() => {
                  onChange(option.entity, option.label);
                  setOptions([]);
                  setQuery("");
                }}
                className="block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="block font-medium">{option.label}</span>
                {option.detail ? (
                  <span className="text-xs text-slate-500">{option.detail}</span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">Sin resultados visibles.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
