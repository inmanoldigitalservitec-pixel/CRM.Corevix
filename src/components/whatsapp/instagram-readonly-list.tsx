import { useMemo, useState } from "react";
import { Search, ChevronDown, SlidersHorizontal, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetaConversationListRow } from "@/lib/meta/view-types";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";

function formatMetaTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function InstagramReadonlyList({
  conversations,
  selectedConversationId,
  onSelectConversationId,
  selectedChannel,
  onSelectChannel,
  loading,
  error,
  className,
}: {
  conversations: MetaConversationListRow[];
  selectedConversationId: string | null;
  onSelectConversationId: (id: string) => void;
  selectedChannel: "all" | "whatsapp" | "messenger" | "instagram";
  onSelectChannel: (channel: "all" | "whatsapp" | "messenger" | "instagram") => void;
  loading: boolean;
  error: string | null;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (!q) return true;
      const hay = [c.sender_name, c.external_user_id, c.last_message_text, c.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, search]);

  return (
    <aside
      data-demo="instagram-conversation-list"
      className={cn(
        "h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col",
        className,
      )}
    >
      <div className="px-3.5 py-3 border-b border-black/10 bg-[#f0f2f5] space-y-2.5">
        <div className="flex items-center justify-between max-[820px]:hidden">
          <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-900">
            Conversaciones
          </h2>
          <span className="min-w-6 h-5 px-2 rounded-full bg-white/80 text-slate-600 text-[11px] grid place-items-center font-semibold border border-black/5">
            {filtered.length}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 max-[820px]:hidden">
          {[
            { key: "all", label: "Todos" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "messenger", label: "Messenger" },
            { key: "instagram", label: "Instagram" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                onSelectChannel(item.key as "all" | "whatsapp" | "messenger" | "instagram")
              }
              className={cn(
                "h-8 rounded-full border text-[11px] font-medium transition-colors",
                selectedChannel === item.key
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative max-[820px]:hidden">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="h-[34px] w-full rounded-full bg-white px-3.5 text-[12px] font-medium text-slate-700 shadow-sm border border-black/5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400">Filtro:</span>
              <span className="truncate">Todos</span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                filterOpen && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground max-[820px]:hidden">
            Cargando conversaciones de Instagram…
          </div>
        ) : error ? (
          <div className="p-3 text-sm text-destructive max-[820px]:hidden">
            No se pudieron cargar las conversaciones de Instagram.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground max-[820px]:hidden space-y-1.5">
            <p className="font-medium text-slate-700">
              Todavía no hay conversaciones de Instagram.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((c) => {
              const name = c.sender_name || "Usuario de Instagram";
              const unread = Number(c.unread_count ?? 0);
              const active = selectedConversationId === c.id;
              const statusLabel = String(c.status || "open");
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectConversationId(c.id)}
                  className={cn(
                    "relative block w-full text-left rounded-none px-3.5 py-3.5 transition-colors hover:bg-[#f5f6f6] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 border-b border-black/[0.06]",
                    active ? "bg-[#f0f2f5]" : "bg-transparent",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors",
                      active ? "bg-emerald-500" : "bg-transparent",
                    )}
                  />
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0 pt-0.5">
                      <WhatsappAvatar name={name} imageUrl={c.sender_profile_pic} size={44} />
                      {unread > 0 ? (
                        <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full border-2 border-card bg-emerald-500 text-white text-[10px] font-semibold grid place-items-center max-[820px]:hidden">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 max-[820px]:hidden">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-slate-900 leading-tight">
                            {name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Instagram className="h-3 w-3" />
                            <span className="truncate">Instagram</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-400 pt-0.5">
                          {formatMetaTime(c.last_message_at || c.created_at)}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-[12px] text-slate-500 leading-tight">
                        {c.last_message_text || "Sin mensajes todavía"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap bg-pink-50 text-pink-700 border-pink-200">
                          Instagram
                        </span>
                        {statusLabel ? (
                          <span className="inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap bg-muted/40 text-foreground/80 border-border/50">
                            {statusLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
