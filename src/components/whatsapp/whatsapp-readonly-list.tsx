import { useMemo, useState, type ReactNode } from "react";
import { Search, Bot, UserRound, ChevronDown, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmWhatsappConversationListRow } from "@/lib/whatsapp/view-types";
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

type InboxFilter = "all" | "unread" | "needs_human" | "bot_off" | "hot" | "ready_sales";

type ExtendedInboxFilter = InboxFilter | "unassigned" | "mine";

function TinyTag({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warn";
  className?: string;
}) {
  const toneClass =
    tone === "info"
      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/15 dark:text-blue-200 dark:border-blue-800/40"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/15 dark:text-emerald-200 dark:border-emerald-800/40"
        : tone === "warn"
          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/15 dark:text-amber-200 dark:border-amber-800/40"
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

function matchesFilter(row: CrmWhatsappConversationListRow, filter: ExtendedInboxFilter, currentUserId: string | null) {
  const unread = Number(row.unread_count ?? 0);
  const needsHuman = Boolean(row.needs_human) || Boolean(row.lead_wants_human);
  const botOff = row.bot_enabled === false;
  const hot = Boolean(row.is_hot_lead);
  const ready = Boolean(row.ready_for_sales);
  const unassigned = !row.assigned_to;
  const mine = Boolean(currentUserId) && row.assigned_to === currentUserId;

  if (filter === "unread") return unread > 0;
  if (filter === "needs_human") return needsHuman;
  if (filter === "bot_off") return botOff;
  if (filter === "hot") return hot;
  if (filter === "ready_sales") return ready;
  if (filter === "unassigned") return unassigned;
  if (filter === "mine") return mine;
  return true;
}

export function WhatsappReadonlyList({
  conversations,
  selectedConversationId,
  onSelectConversationId,
  loading,
  error,
  currentUserId,
  canSeeUnassigned,
  className,
}: {
  conversations: CrmWhatsappConversationListRow[];
  selectedConversationId: string | null;
  onSelectConversationId: (id: string) => void;
  loading: boolean;
  error: string | null;
  currentUserId: string | null;
  canSeeUnassigned: boolean;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExtendedInboxFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtersToShow = useMemo(() => {
    const base: Array<{ key: ExtendedInboxFilter; label: string }> = [
      { key: "all", label: "Todos" },
      { key: "mine", label: "Mis conv." },
      { key: "unread", label: "No leídos" },
      { key: "needs_human", label: "Necesitan humano" },
      { key: "bot_off", label: "Bot apagado" },
      { key: "hot", label: "Leads calientes" },
      { key: "ready_sales", label: "Listos venta" },
    ];
    if (canSeeUnassigned) base.splice(2, 0, { key: "unassigned", label: "Sin asignar" });
    return base;
  }, [canSeeUnassigned]);

  const selectedFilterLabel = useMemo(() => {
    return filtersToShow.find((f) => f.key === filter)?.label || "Todos";
  }, [filtersToShow, filter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => matchesFilter(c, filter, currentUserId))
      .filter((c) => {
      if (!q) return true;
      const hay = [
        c.display_name,
        c.contact_name,
        c.whatsapp_profile_name,
        c.phone,
        c.selected_service,
        c.business_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, search, filter]);

  return (
    <aside data-demo="whatsapp-conversation-list" className={cn("h-full min-h-0 w-[350px] max-[1450px]:w-[340px] max-[1180px]:w-[300px] max-[820px]:w-[82px] border-r border-black/10 bg-white min-w-0 overflow-hidden flex flex-col", className)}>
      <div className="px-3.5 py-3 border-b border-black/10 bg-[#f0f2f5] space-y-2.5">
        <div className="flex items-center justify-between max-[820px]:hidden">
          <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-slate-900">Conversaciones</h2>
          <span className="min-w-6 h-5 px-2 rounded-full bg-white/80 text-slate-600 text-[11px] grid place-items-center font-semibold border border-black/5">
            {filtered.length}
          </span>
        </div>
        <div className="relative max-[820px]:hidden">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-[38px] rounded-full border-0 bg-white pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm placeholder:text-slate-400"
            placeholder="Buscar por nombre, teléfono, servicio..."
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
              <span className="truncate">{selectedFilterLabel}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", filterOpen && "rotate-180")} />
          </button>

          {filterOpen ? (
            <div className="absolute left-0 right-0 top-[40px] z-30 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
              <div className="p-1.5">
                {filtersToShow.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setFilter(f.key);
                      setFilterOpen(false);
                    }}
                    className={cn(
                      "w-full h-9 rounded-xl px-3 text-left text-[12px] font-medium transition-colors flex items-center justify-between",
                      filter === f.key
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <span>{f.label}</span>
                    {filter === f.key ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-0 bg-white">
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground max-[820px]:hidden">Cargando conversaciones…</div>
        ) : error ? (
          <div className="p-3 text-sm text-destructive max-[820px]:hidden">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground max-[820px]:hidden">No hay conversaciones.</div>
        ) : (
          <div className="space-y-0">
            {filtered.map((c) => {
              const name = c.display_name || c.contact_name || c.whatsapp_profile_name || c.phone || "Sin nombre";
              const unread = Number(c.unread_count ?? 0);
              const active = selectedConversationId === c.conversation_id;
              const needsHuman = Boolean(c.needs_human) || Boolean(c.lead_wants_human);
              const botOff = c.bot_enabled === false;
              const unassigned = !c.assigned_to;
              const leadConnected = Boolean(c.lead_id);
              return (
                <button
                  key={c.conversation_id}
                  type="button"
                  onClick={() => {
                    onSelectConversationId(c.conversation_id);
                  }}
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
                      <WhatsappAvatar name={name} size={44} />
                      {needsHuman ? (
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-amber-500 grid place-items-center">
                          <UserRound className="h-2.5 w-2.5 text-white" />
                        </span>
                      ) : null}
                      {botOff ? (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-slate-500 grid place-items-center">
                          <Bot className="h-2.5 w-2.5 text-white" />
                        </span>
                      ) : null}
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
                          <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-slate-900 leading-tight">{name}</div>
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-400 pt-0.5">
                          {formatMetaTime(c.last_message_at || c.conversation_updated_at)}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-[12px] text-slate-500 leading-tight">
                        {c.last_message || "—"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <TinyTag tone="info">WhatsApp</TinyTag>
                        {leadConnected ? <TinyTag tone="success">Prospecto</TinyTag> : null}
                        {unassigned ? <TinyTag tone="neutral">Sin asignar</TinyTag> : null}
                        {botOff ? <TinyTag tone="warn">Bot OFF</TinyTag> : null}
                        {c.lead_stage ? <TinyTag>{c.lead_stage}</TinyTag> : null}
                        {c.selected_service ? <TinyTag tone="info">{c.selected_service}</TinyTag> : null}
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
