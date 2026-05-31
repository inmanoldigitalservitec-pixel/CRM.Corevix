import { useMemo, useState, type ReactNode } from "react";
import { Search, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";

export type InboxChannel = "all" | "whatsapp" | "messenger" | "instagram";

export type UnifiedInboxConversation = {
  key: string;
  channel: "whatsapp" | "messenger";
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  unreadCount: number;
  status: string | null;
  raw: unknown;
};

function formatMetaTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function TinyTag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "info";
  className?: string;
}) {
  const toneClass =
    tone === "info"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-muted/40 text-foreground/80 border-border/50";
  return (
    <span
      className={cn(
        "inline-flex items-center h-4.5 px-1.5 rounded-full border text-[9.5px] font-medium whitespace-nowrap",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function InboxUnifiedList({
  items,
  selectedKey,
  onSelectKey,
  selectedChannel,
  onSelectChannel,
  loading,
  warning,
  className,
}: {
  items: UnifiedInboxConversation[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  selectedChannel: InboxChannel;
  onSelectChannel: (channel: InboxChannel) => void;
  loading: boolean;
  warning?: string | null;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const hay = [c.displayName, c.lastMessageText, c.status, c.channel].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  return (
    <aside
      data-demo="inbox-unified-list"
      className={cn(
        "h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col",
        className,
      )}
    >
      <div className="px-3.5 py-3 border-b border-black/10 bg-[#f0f2f5] space-y-2.5">
        <div className="flex items-center justify-between max-[820px]:hidden">
          <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-900">Conversaciones</h2>
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
              onClick={() => onSelectChannel(item.key as InboxChannel)}
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

        {warning ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-sm max-[820px]:hidden">
            {warning}
          </div>
        ) : null}

        <div className="relative max-[820px]:hidden">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-[38px] rounded-full border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm placeholder:text-slate-400"
            placeholder="Buscar por nombre o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", filterOpen && "rotate-180")} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground max-[820px]:hidden">Cargando conversaciones…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground max-[820px]:hidden space-y-1.5">
            <p className="font-medium text-slate-700">Todavía no hay conversaciones en la bandeja.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filtered.map((c) => {
              const unread = Number(c.unreadCount ?? 0);
              const active = selectedKey === c.key;
              const channelLabel = c.channel === "whatsapp" ? "WhatsApp" : "Messenger";
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onSelectKey(c.key)}
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
                      <WhatsappAvatar name={c.displayName} imageUrl={c.avatarUrl || null} size={44} />
                      {unread > 0 ? (
                        <span className="absolute -top-1 -left-1 h-4 min-w-4 px-1 rounded-full border-2 border-card bg-emerald-500 text-white text-[10px] font-semibold grid place-items-center max-[820px]:hidden">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                      {unread > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card hidden max-[820px]:block" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 max-[820px]:hidden">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-slate-900 leading-tight">
                            {c.displayName}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-400 pt-0.5">
                          {formatMetaTime(c.lastMessageAt)}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-[12px] text-slate-500 leading-tight">
                        {c.lastMessageText || "Sin mensajes todavía"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <TinyTag tone="info">{channelLabel}</TinyTag>
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
