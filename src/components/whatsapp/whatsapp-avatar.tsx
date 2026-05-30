import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function WhatsappAvatar({
  name,
  size = 38,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = getInitials(name);
  return (
    <div
      className={cn(
        "rounded-full grid place-items-center bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 font-semibold overflow-hidden shrink-0",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.32)) }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}
