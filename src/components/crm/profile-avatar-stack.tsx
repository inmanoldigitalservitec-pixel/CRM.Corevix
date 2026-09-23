import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type ProfileAvatarStackProfile = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

function displayName(profile: ProfileAvatarStackProfile) {
  return String(profile.full_name || profile.email || "Usuario").trim();
}

function initials(value: string) {
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

export function ProfileAvatarStack({
  profiles,
  label,
  maxVisible = 5,
}: {
  profiles: ProfileAvatarStackProfile[];
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
              {initials(name)}
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
