import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  Star,
  Archive,
  Trash2,
  Reply,
  Mail,
  Filter,
  ChevronDown,
  X,
  Send,
  RefreshCw,
  Inbox,
  Clock,
  Wifi,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/crm/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { EmailHtmlViewer } from "@/components/email/email-html-viewer";
import { toast } from "sonner";

export const Route = createFileRoute("/email")({
  component: EmailPage,
  head: () => ({ meta: [{ title: "Email Inbox — Corevix CRM" }] }),
});

interface EmailConversation {
  id: string;
  subject: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
  snippet?: string | null;
  provider?: string | null;
  tags?: string[] | null;
}

interface EmailMessage {
  id: string;
  sender?: string | null;
  recipient?: string | null;
  subject: string | null;
  body?: string | null;
  body_html: string | null;
  direction: string;
  is_read: boolean;
  sent_at?: string | null;
  created_at: string;
  from_email?: string | null;
  to_email?: string | null;
  snippet?: string | null;
  label_ids?: string[] | null;
}

type EmailAccount = {
  id: string;
  email_address: string;
  last_synced_at: string | null;
};

type ProviderKey = "gmail" | "outlook";
type InboxTab = "all" | "unread" | "starred";
type SyncStatus = "idle" | "syncing" | "success" | "error" | "not_connected";

const AUTO_SYNC_STALE_MS = 2 * 60 * 1000;
const POLL_SYNC_MS = 60 * 1000;

function formatRelativeDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

function formatFullDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function extractDisplayName(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown sender";
  const match = raw.match(/^\s*"?([^"<]+)"?\s*</);
  if (match?.[1]) return match[1].trim();
  return raw.replace(/<.*?>/g, "").trim() || raw;
}

function getInitials(value?: string | null) {
  const name = extractDisplayName(value);
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return initials || "@";
}

function syncStatusCopy(status: SyncStatus, account: EmailAccount | null, provider: ProviderKey) {
  if (provider !== "gmail") return "Outlook pendiente de integración";
  if (status === "syncing") return "Actualizando correos…";
  if (status === "error") return "No se pudo sincronizar";
  if (status === "not_connected") return "Gmail no conectado";
  if (account?.last_synced_at) return `Actualizado ${formatRelativeDate(account.last_synced_at)}`;
  if (account?.id) return "Gmail conectado";
  return "Revisando conexión…";
}

function EmailPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<EmailConversation[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<EmailConversation | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderKey>("gmail");
  const [tab, setTab] = useState<InboxTab>("all");
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerTo, setComposerTo] = useState("");
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);
  const didAutoSyncRef = useRef<string | null>(null);

  const db = supabase as any;

  const fetchConversations = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const q = db
      .from("email_conversations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false });
    const { data, error } = await q.eq("provider", provider);
    if (
      error &&
      String(error.message || "")
        .toLowerCase()
        .includes("column") &&
      String(error.message || "").includes("provider")
    ) {
      const r2 = await db
        .from("email_conversations")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("last_message_at", { ascending: false });
      setConversations(r2.data || []);
      setLoading(false);
      return;
    }
    setConversations(data || []);
    setLoading(false);
  }, [db, profile?.company_id, provider]);

  const loadEmailAccount = useCallback(async () => {
    if (provider !== "gmail") {
      setEmailAccount(null);
      setSyncStatus("idle");
      return null;
    }
    const profileId = profile?.id || null;
    const authUserId = profile?.user_id || null;
    if (!profileId && !authUserId) return null;

    const tryLoad = async (userId: string) =>
      db
        .from("email_accounts")
        .select("id,email_address,last_synced_at,is_active,provider,updated_at")
        .eq("provider", "gmail")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    let data: any = null;
    if (profileId) {
      const result = await tryLoad(profileId);
      data = result.data;
    }
    if (!data && authUserId) {
      const result = await tryLoad(authUserId);
      data = result.data;
    }

    const account = data
      ? {
          id: String(data.id),
          email_address: String(data.email_address || ""),
          last_synced_at: data.last_synced_at ? String(data.last_synced_at) : null,
        }
      : null;
    setEmailAccount(account);
    if (!account) setSyncStatus("not_connected");
    return account;
  }, [db, profile?.id, profile?.user_id, provider]);

  const loadMessagesForSelected = useCallback(async () => {
    if (!selectedConvo?.id) return;
    setMessagesLoading(true);
    setMessagesError(null);
    const { data, error } = await db
      .from("email_messages")
      .select("*")
      .eq("conversation_id", selectedConvo.id)
      .order("created_at");
    if (error) {
      setMessagesError(error.message || "Could not load messages");
      setMessages([]);
      setMessagesLoading(false);
      return;
    }
    setMessages(data || []);
    setMessagesLoading(false);
  }, [db, selectedConvo?.id]);

  const syncGmail = useCallback(
    async ({ force = false, silent = true }: { force?: boolean; silent?: boolean } = {}) => {
      if (provider !== "gmail") return;
      if (syncInFlightRef.current) return;

      let account = emailAccount;
      if (!account?.id) account = await loadEmailAccount();
      if (!account?.id) {
        setSyncStatus("not_connected");
        return;
      }

      const lastSyncedAt = account.last_synced_at ? new Date(account.last_synced_at).getTime() : 0;
      const isFresh = lastSyncedAt && Date.now() - lastSyncedAt < AUTO_SYNC_STALE_MS;
      if (!force && isFresh) return;

      syncInFlightRef.current = true;
      setSyncStatus("syncing");
      setSyncError(null);
      const { data, error } = await supabase.functions.invoke("sync-gmail", { body: { limit: 25 } });
      syncInFlightRef.current = false;

      if (error || (data as any)?.error) {
        const message = error?.message || String((data as any)?.error || "No se pudo sincronizar Gmail");
        setSyncStatus("error");
        setSyncError(message);
        if (!silent) toast.error(message);
        return;
      }

      setSyncStatus("success");
      const freshAccount = await loadEmailAccount();
      if (freshAccount?.id) setEmailAccount(freshAccount);
      await fetchConversations();
      if (selectedConvo?.id) await loadMessagesForSelected();
      if (!silent) toast.success("Gmail sincronizado.");
    },
    [emailAccount, fetchConversations, loadEmailAccount, loadMessagesForSelected, provider, selectedConvo?.id],
  );

  useEffect(() => {
    void fetchConversations();
    void loadEmailAccount();
    setTab("all");
    setSelectedConvo(null);
    setMessages([]);
    didAutoSyncRef.current = null;
  }, [fetchConversations, loadEmailAccount]);

  useEffect(() => {
    if (provider !== "gmail" || !emailAccount?.id) return;
    const key = `${provider}:${emailAccount.id}`;
    if (didAutoSyncRef.current === key) return;
    didAutoSyncRef.current = key;
    void syncGmail({ silent: true });
  }, [emailAccount?.id, provider, syncGmail]);

  useEffect(() => {
    if (provider !== "gmail") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncGmail({ silent: true });
    }, POLL_SYNC_MS);
    return () => window.clearInterval(interval);
  }, [provider, syncGmail]);

  useEffect(() => {
    if (provider !== "gmail") return;
    const onFocus = () => void syncGmail({ silent: true });
    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncGmail({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [provider, syncGmail]);

  useRealtimeTable({
    table: "email_conversations",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void fetchConversations();
    },
  });

  useRealtimeTable({
    table: "email_messages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: (payload) => {
      void fetchConversations();
      const changedConversationId = String(
        (payload.new as any)?.conversation_id || (payload.old as any)?.conversation_id || "",
      ).trim();
      if (
        selectedConvo?.id &&
        (!changedConversationId || changedConversationId === selectedConvo.id)
      ) {
        void loadMessagesForSelected();
      }
    },
  });

  const selectConvo = async (convo: EmailConversation) => {
    setSelectedConvo(convo);
    setMessages([]);
    setMessagesError(null);
    setMessagesLoading(true);
    const { data, error } = await db
      .from("email_messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at");
    if (error) {
      setMessagesError(error.message || "Could not load messages");
      setMessagesLoading(false);
      return;
    }
    setMessages(data || []);
    setMessagesLoading(false);
  };

  const tabCounts = useMemo(() => {
    const all = conversations.length;
    const unread = conversations.filter((c) => (c.unread_count || 0) > 0).length;
    const starred = conversations.filter((c) =>
      (c.tags || []).map((t) => String(t).toLowerCase()).includes("starred"),
    ).length;
    return { all, unread, starred };
  }, [conversations]);

  const filtered = useMemo(() => {
    const q = searchEmail.trim().toLowerCase();
    let list = conversations;
    if (tab === "unread") list = list.filter((c) => (c.unread_count || 0) > 0);
    if (tab === "starred")
      list = list.filter((c) =>
        (c.tags || []).map((t) => String(t).toLowerCase()).includes("starred"),
      );
    if (!q) return list;
    return list.filter((c) => `${c.subject || ""} ${c.snippet || ""}`.toLowerCase().includes(q));
  }, [conversations, searchEmail, tab]);

  const selectedLastMessage = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    return messages[messages.length - 1] || null;
  }, [messages]);

  const syncLabel = syncStatusCopy(syncStatus, emailAccount, provider);
  const selectedSender = selectedLastMessage?.from_email || selectedLastMessage?.sender || "—";

  const openReplyComposer = () => {
    if (!selectedConvo) return;
    const from = String(selectedLastMessage?.from_email || selectedLastMessage?.sender || "").trim();
    setComposerTo(from);
    setComposerSubject(`Re: ${selectedConvo.subject || ""}`.trim());
    setComposerBody("");
    setComposerOpen(true);
    setComposerExpanded(false);
  };

  const openNewComposer = () => {
    setComposerTo("");
    setComposerSubject("");
    setComposerBody("");
    setComposerOpen(true);
    setComposerExpanded(false);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setComposerExpanded(false);
  };

  const sendComposer = () => {
    toast.message("Send email is not implemented yet.");
  };

  return (
    <div
      className="h-[calc(100vh-3.5rem)] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100"
      style={
        {
          ["--app-pad" as any]: "clamp(10px, 1.3vw, 18px)",
          ["--gap" as any]: "clamp(10px, 1vw, 14px)",
          ["--inbox" as any]: "clamp(340px, 31vw, 470px)",
          ["--control-h" as any]: "clamp(36px, 3.5vh, 42px)",
        } as any
      }
    >
      <div className="h-full p-[var(--app-pad)] flex flex-col gap-[var(--gap)]">
        <div className="rounded-2xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-950">Email Inbox</h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase text-slate-600">
                  {provider}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Bandeja viva con auto-sync y actualizaciones en tiempo real.
              </p>
            </div>
          </div>
          <div
            className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${
              syncStatus === "error"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : syncStatus === "syncing"
                  ? "border-primary/20 bg-primary/5 text-primary"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
            title={syncError || syncLabel}
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : syncStatus === "error" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Wifi className="h-3.5 w-3.5" />
            )}
            <span>{syncLabel}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 grid grid-cols-1 gap-[var(--gap)] md:grid-cols-[var(--inbox)_minmax(0,1fr)]">
          <div className="min-h-0 rounded-2xl border bg-white/95 shadow-sm overflow-hidden flex flex-col backdrop-blur">
            <div
              className={`grid gap-2 border-b bg-white p-3 transition-[grid-template-columns] duration-200 ${
                searching
                  ? "grid-cols-1"
                  : "grid-cols-[clamp(104px,9vw,132px)_1fr_clamp(82px,7vw,104px)]"
              }`}
            >
              {!searching && (
                <Button
                  variant="outline"
                  className="h-[var(--control-h)] justify-between rounded-xl"
                  onClick={() => setProvider((p) => (p === "gmail" ? "outlook" : "gmail"))}
                >
                  <span className="font-semibold capitalize">{provider}</span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              )}
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 h-[var(--control-h)] ${
                  searching ? "ring-4 ring-primary/10 border-primary/30" : ""
                }`}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onFocus={() => setSearching(true)}
                  onBlur={() => {
                    if (searchEmail.trim() === "") setSearching(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchEmail("");
                      setSearching(false);
                      searchInputRef.current?.blur();
                    }
                  }}
                  placeholder="Buscar correos…"
                  className="w-full bg-transparent outline-none text-sm"
                />
                {searchEmail && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSearchEmail("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!searching && (
                <Button variant="outline" className="h-[var(--control-h)] rounded-xl justify-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              )}
            </div>

            <div className="border-b bg-white px-3 py-2 sm:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                {syncStatus === "syncing" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                {syncLabel}
              </div>
            </div>

            <div className="grid grid-cols-3 border-b bg-white px-3">
              {(
                [
                  { key: "all" as const, label: "Todos", count: tabCounts.all },
                  { key: "unread" as const, label: "No leídos", count: tabCounts.unread },
                  { key: "starred" as const, label: "Marcados", count: tabCounts.starred },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`relative h-11 flex items-center justify-center gap-2 text-sm font-extrabold transition-colors ${
                    tab === t.key ? "text-primary" : "text-slate-700 hover:text-primary"
                  }`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  <span className="min-w-6 h-[22px] rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-black px-2">
                    {t.count}
                  </span>
                  {tab === t.key && (
                    <span className="absolute left-[10%] right-[10%] bottom-0 h-[3px] rounded-t-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 bg-slate-50/70">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon={<Mail className="h-6 w-6" />}
                      title={provider === "gmail" && syncStatus === "not_connected" ? "Conecta Gmail" : "No hay correos todavía"}
                      description={
                        provider === "gmail" && syncStatus === "not_connected"
                          ? "Conecta tu cuenta desde Settings. Luego el inbox se sincronizará solo."
                          : "Cuando entren nuevos correos, Corevix los sincronizará automáticamente."
                      }
                    />
                  </div>
                ) : (
                  filtered.map((convo) => {
                    const isActive = selectedConvo?.id === convo.id;
                    const unread = (convo.unread_count || 0) > 0;
                    const time = formatRelativeDate(convo.last_message_at);
                    const subject = convo.subject || "(No Subject)";
                    return (
                      <button
                        type="button"
                        key={convo.id}
                        onClick={() => selectConvo(convo)}
                        className={`relative w-full border-b px-4 py-3 text-left transition-all hover:bg-white ${
                          isActive
                            ? "bg-white shadow-[inset_4px_0_0_theme(colors.primary.DEFAULT)]"
                            : "bg-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xs font-black ${unread ? "bg-primary text-white" : "bg-slate-200 text-slate-700"}`}>
                            {getInitials(subject)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className={`truncate text-sm ${unread ? "font-black" : "font-bold"} text-slate-950`}>
                                {subject}
                              </div>
                              <div className="shrink-0 text-[12px] font-bold text-slate-500">{time}</div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {convo.snippet || "Sin vista previa"}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                                {convo.provider || provider}
                              </span>
                              {unread && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                                  Nuevo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="min-h-0 rounded-2xl border bg-white/95 shadow-sm overflow-hidden flex flex-col backdrop-blur">
            {selectedConvo ? (
              <>
                <div className="border-b bg-white px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xs font-black text-primary">
                      {getInitials(selectedSender)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold tracking-tight truncate">
                        {selectedConvo.subject || "(No Subject)"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {extractDisplayName(selectedSender)}
                        {selectedLastMessage?.sent_at ? ` • ${formatFullDate(selectedLastMessage.sent_at)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={openReplyComposer}>
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 bg-slate-50/70">
                  <ScrollArea className="h-full p-4">
                    {messagesLoading ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
                        ))}
                      </div>
                    ) : messagesError ? (
                      <div className="p-4 text-center text-sm text-destructive">{messagesError}</div>
                    ) : messages.length === 0 ? (
                      <div className="p-8">
                        <EmptyState
                          icon={<Mail className="h-6 w-6" />}
                          title="Sin mensajes en esta conversación"
                          description="Corevix volverá a sincronizar Gmail automáticamente. No necesitas ir a Settings para refrescar."
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => {
                          const fromLabel = extractDisplayName(msg.from_email || msg.sender);
                          const fromAddr = String(msg.from_email || msg.sender || "").trim();
                          const when = msg.sent_at || msg.created_at;
                          const outbound = msg.direction === "outbound";
                          return (
                            <div key={msg.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${outbound ? "ml-auto max-w-[92%] border-primary/20" : "max-w-[96%]"}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-[11px] font-black text-slate-700">
                                    {getInitials(fromLabel)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm truncate">{fromLabel}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {fromAddr ? `<${fromAddr}>` : "—"}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground shrink-0">{formatFullDate(when)}</div>
                              </div>
                              <div className="mt-4 overflow-hidden rounded-xl border bg-white">
                                {msg.body_html ? (
                                  <EmailHtmlViewer html={msg.body_html} />
                                ) : (
                                  <div className="whitespace-pre-wrap p-4 text-sm text-slate-800">
                                    {msg.body || msg.snippet || "(No content)"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground bg-slate-50/70">
                <div className="text-center max-w-sm px-6">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold text-slate-800">Selecciona una conversación</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    El inbox se actualiza automáticamente mientras trabajas.
                  </p>
                </div>
              </div>
            )}

            {!composerOpen && (
              <button
                type="button"
                onClick={openNewComposer}
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-white shadow-lg grid place-items-center hover:bg-primary/90"
                aria-label="Compose"
              >
                <Send className="h-5 w-5" />
              </button>
            )}

            {composerOpen && (
              <div
                className={`fixed z-50 ${
                  composerExpanded
                    ? "bottom-6 right-6 left-[calc(var(--app-pad)+var(--inbox)+var(--gap))] top-[calc(3.5rem+var(--app-pad))]"
                    : "bottom-6 right-6 w-[min(520px,calc(100vw-48px))]"
                }`}
              >
                <div className="h-full rounded-2xl border bg-white shadow-2xl overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                    <div className="font-extrabold text-sm">{composerSubject ? "Responder" : "Nuevo mensaje"}</div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setComposerExpanded((v) => !v)}>
                        <span className="text-xs font-black">{composerExpanded ? "▢" : "▣"}</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeComposer}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-muted-foreground">Para</label>
                      <Input value={composerTo} onChange={(e) => setComposerTo(e.target.value)} placeholder="destinatario@correo.com" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-bold text-muted-foreground">Asunto</label>
                      <Input value={composerSubject} onChange={(e) => setComposerSubject(e.target.value)} placeholder="Asunto" />
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 px-4 pb-4">
                    <textarea
                      value={composerBody}
                      onChange={(e) => setComposerBody(e.target.value)}
                      className="h-full w-full resize-none rounded-xl border p-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                      placeholder="Escribe tu mensaje…"
                    />
                  </div>
                  <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
                    <Button onClick={sendComposer} className="rounded-xl">
                      Enviar
                    </Button>
                    <div className="text-xs text-muted-foreground">Adjuntar / formato / IA próximamente</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
