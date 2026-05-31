import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function WhatsappAvatar({
  name,
  imageUrl,
  size = 38,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const cleanUrl = useMemo(() => {
    const s = (imageUrl || "").trim();
    return s.length ? s : null;
  }, [imageUrl]);
  const initials = getInitials(name);
  const showImage = Boolean(cleanUrl) && !imageFailed;

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
      {showImage ? (
        <img
          src={cleanUrl!}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
