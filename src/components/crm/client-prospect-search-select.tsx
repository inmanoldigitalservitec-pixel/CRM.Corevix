import { useMemo, useState } from "react";
import { Check, Plus, Search, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QuickCreateDialog } from "@/components/crm/quick-create-dialog";
import { cn } from "@/lib/utils";

export type ClientProspectOption = {
  id: string;
  label: string;
  secondaryLabel?: string | null;
  searchText?: string | null;
};

export type ClientProspectValue = {
  id: string;
  type: "client" | "lead";
};

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesQuery(option: ClientProspectOption, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchText(
    [option.label, option.secondaryLabel, option.searchText].filter(Boolean).join(" "),
  );

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function ClientProspectSearchSelect({
  clients,
  prospects = [],
  value,
  onChange,
  placeholder = "Buscar cliente o prospecto",
  disabled = false,
  className,
}: {
  clients: ClientProspectOption[];
  prospects?: ClientProspectOption[];
  value?: ClientProspectValue | null;
  onChange: (value: ClientProspectValue | null, option?: ClientProspectOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [createdClients, setCreatedClients] = useState<ClientProspectOption[]>([]);

  const allClients = useMemo(
    () => [...clients, ...createdClients.filter((created) => !clients.some((client) => client.id === created.id))],
    [clients, createdClients],
  );

  const selectedOption = useMemo(() => {
    const source = value?.type === "lead" ? prospects : allClients;
    return source.find((option) => option.id === value.id) || null;
  }, [allClients, prospects, value]);

  const filteredClients = useMemo(
    () => allClients.filter((option) => matchesQuery(option, query)),
    [allClients, query],
  );

  const filteredProspects = useMemo(
    () => prospects.filter((option) => matchesQuery(option, query)),
    [prospects, query],
  );

  const hasResults = filteredClients.length > 0 || filteredProspects.length > 0;
  const normalizedQuery = normalizeSearchText(query);

  const selectOption = (type: "client" | "lead", option: ClientProspectOption) => {
    onChange({ type, id: option.id }, option);
    setQuery("");
    setOpen(false);
  };

  const handleCreatedClient = ({ record }: { record: any }) => {
    const option: ClientProspectOption = {
      id: String(record.id),
      label: String(record.company_name || record.contact_person || "Cliente"),
      secondaryLabel: record.contact_person || record.email || null,
      searchText: [record.company_name, record.contact_person, record.email, record.phone]
        .filter(Boolean)
        .join(" "),
    };

    setCreatedClients((current) => [...current, option]);
    onChange({ type: "client", id: option.id }, option);
    setQuery("");
    setQuickCreateOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!disabled) setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between rounded-md border-slate-200 bg-white px-3 text-left font-normal shadow-none hover:bg-white",
              !selectedOption && "text-slate-400",
              className,
            )}
          >
            <span className="min-w-0 truncate">
              {selectedOption?.label || placeholder}
            </span>
            <Search className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0"
        >
          <Command shouldFilter={false}>
            <CommandInput
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Escribe para buscar..."
            />
            <CommandList>
              {!hasResults && normalizedQuery ? (
                <CommandEmpty className="px-3 py-5">
                  <div className="text-sm text-slate-500">
                    No encontramos coincidencias para “{query}”.
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setQuickCreateOpen(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Crear nuevo cliente
                  </Button>
                </CommandEmpty>
              ) : null}

              {filteredClients.length ? (
                <CommandGroup heading="Clientes">
                  {filteredClients.map((option) => (
                    <CommandItem
                      key={`client-${option.id}`}
                      value={option.id}
                      onSelect={() => selectOption("client", option)}
                    >
                      <UserRound className="h-4 w-4 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.secondaryLabel ? (
                          <span className="block truncate text-xs text-slate-500">
                            {option.secondaryLabel}
                          </span>
                        ) : null}
                      </span>
                      {value?.type === "client" && value.id === option.id ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {filteredProspects.length ? (
                <CommandGroup heading="Prospectos">
                  {filteredProspects.map((option) => (
                    <CommandItem
                      key={`lead-${option.id}`}
                      value={option.id}
                      onSelect={() => selectOption("lead", option)}
                    >
                      <UsersRound className="h-4 w-4 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.secondaryLabel ? (
                          <span className="block truncate text-xs text-slate-500">
                            {option.secondaryLabel}
                          </span>
                        ) : null}
                      </span>
                      {value?.type === "lead" && value.id === option.id ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickCreateDialog
        type="client"
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        context={{ prefill: { company_name: query } }}
        onCreated={handleCreatedClient}
      />
    </>
  );
}
