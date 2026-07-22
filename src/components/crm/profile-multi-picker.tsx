import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ProfilePickerOption = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

function displayName(profile: ProfilePickerOption) {
  return String(profile.full_name || profile.email || "Usuario").trim();
}

function profileInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export function normalizeProfilePickerIds(value: string[] | string | null | undefined) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(raw.map((item) => String(item || "").trim()).filter(Boolean)));
}

export function ProfileMultiPicker({
  value,
  profiles,
  onChange,
  placeholder = "Seleccionar responsables",
  searchPlaceholder = "Buscar responsable...",
  emptyText = "No hay usuarios disponibles.",
}: {
  value: string[];
  profiles: ProfilePickerOption[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedIds = normalizeProfilePickerIds(value);
  const profileById = useMemo(() => {
    const map = new Map<string, ProfilePickerOption>();
    for (const profile of profiles) {
      if (profile.id) map.set(profile.id, profile);
      if (profile.user_id) map.set(profile.user_id, profile);
    }
    return map;
  }, [profiles]);
  const selectedProfiles = selectedIds
    .map((id) => profileById.get(id) || null)
    .filter((profile): profile is ProfilePickerOption => Boolean(profile));
  const triggerLabel =
    selectedProfiles.length > 0
      ? selectedProfiles.map((profile) => displayName(profile)).join(", ")
      : placeholder;

  const toggleProfile = (id: string) => {
    const checked = selectedIds.includes(id);
    const next = checked
      ? selectedIds.filter((current) => current !== id)
      : normalizeProfilePickerIds([...selectedIds, id]);
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-normal shadow-sm shadow-slate-200/60 transition focus:outline-none focus:ring-2 focus:ring-blue-500/30",
            selectedProfiles.length ? "text-slate-950" : "text-slate-400",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[min(360px,calc(100dvh-2rem))] w-[--radix-popover-trigger-width] overflow-hidden p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[min(260px,45dvh)]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {profiles.map((profile) => {
                const id = String(profile.user_id || profile.id);
                const name = displayName(profile);
                const checked = selectedIds.includes(id);
                return (
                  <CommandItem
                    key={profile.id}
                    value={`${name} ${profile.email || ""}`}
                    onSelect={() => toggleProfile(id)}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                  >
                    <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        profileInitials(name)
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">
                      {name}
                    </span>
                    {checked ? <Check className="h-4 w-4 shrink-0 text-slate-700" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ProfileAvatarStack({
  profiles,
  label,
  maxVisible = 5,
}: {
  profiles: ProfilePickerOption[];
  label: string;
  maxVisible?: number;
}) {
  if (!profiles.length) {
    return (
      <div className="flex items-center" title="Sin asignar" aria-label="Sin asignar">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-slate-200 bg-slate-50 text-[11px] font-normal text-slate-400">
          —
        </span>
      </div>
    );
  }

  const visible = profiles.slice(0, maxVisible);
  const hiddenCount = Math.max(0, profiles.length - visible.length);

  return (
    <div className="flex min-w-[96px] items-center pl-2" title={label} aria-label={label}>
      {visible.map((profile, index) => {
        const name = displayName(profile);
        return (
          <Avatar
            key={`${profile.id}-${profile.user_id || index}`}
            className="-ml-2 h-8 w-8 border-2 border-white bg-white shadow-sm ring-1 ring-slate-100"
            title={name}
          >
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-slate-50 text-[11px] font-normal text-slate-600">
              {profileInitials(name)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {hiddenCount > 0 ? (
        <span
          className="-ml-2 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-normal text-slate-600 shadow-sm ring-1 ring-slate-100"
          title={label}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}
