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

type ProviderKey = "gmail" | "outlook";
type InboxTab = "all" | "unread" | "starred";

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

  const db = supabase as any;

  const fetchConversations = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    // Prefer server-side provider filter, but gracefully fallback if column doesn't exist.
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
  }, [profile?.company_id, provider]);

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

  useEffect(() => {
    void fetchConversations();
    setTab("all");
    setSelectedConvo(null);
    setMessages([]);
  }, [fetchConversations]);

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

  const openReplyComposer = () => {
    if (!selectedConvo) return;
    const from = String(
      selectedLastMessage?.from_email || selectedLastMessage?.sender || "",
    ).trim();
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
      className="h-[calc(100vh-3.5rem)] bg-background"
      style={
        {
          ["--app-pad" as any]: "clamp(8px, 1.2vw, 18px)",
          ["--gap" as any]: "clamp(8px, 1vw, 14px)",
          ["--inbox" as any]: "clamp(330px, 32vw, 490px)",
          ["--control-h" as any]: "clamp(34px, 3.5vh, 42px)",
        } as any
      }
    >
      <div className="h-full grid grid-cols-1 p-[var(--app-pad)] gap-[var(--gap)] md:grid-cols-[var(--inbox)_minmax(0,1fr)]">
        {/* Inbox panel */}
        <div className="min-h-0 rounded-[clamp(12px,1vw,18px)] border bg-white/90 shadow-sm overflow-hidden flex flex-col">
          {/* Controls */}
          <div
            className={`grid gap-2 border-b bg-white p-3 transition-[grid-template-columns] duration-200 ${
              searching
                ? "grid-cols-1"
                : "grid-cols-[clamp(104px,9vw,132px)_1fr_clamp(82px,7vw,104px)]"
            }`}
            style={{ minHeight: "clamp(52px, 6vh, 70px)" }}
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
                placeholder="Buscar en esta bandeja..."
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

          {/* Tabs */}
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
                className={`relative h-10 flex items-center justify-center gap-2 text-sm font-extrabold transition-colors ${
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

          {/* List */}
          <div className="min-h-0 flex-1 bg-slate-50">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<Mail className="h-6 w-6" />}
                    title="No emails yet"
                    description="Email conversations will appear here when you connect your email account."
                  />
                </div>
              ) : (
                filtered.map((convo) => {
                  const isActive = selectedConvo?.id === convo.id;
                  const unread = (convo.unread_count || 0) > 0;
                  const time = convo.last_message_at
                    ? new Date(convo.last_message_at).toLocaleDateString()
                    : "";
                  return (
                    <div
                      key={convo.id}
                      onClick={() => selectConvo(convo)}
                      className={`relative cursor-pointer border-b bg-white px-4 py-3 transition-colors hover:bg-slate-50 ${
                        isActive
                          ? "bg-primary/5 shadow-[inset_3px_0_0_theme(colors.primary.DEFAULT)]"
                          : ""
                      }`}
                      style={{ minHeight: "clamp(78px, 9vh, 96px)" }}
                    >
                      {unread && (
                        <div className="absolute left-3 top-6 h-2 w-2 rounded-full bg-primary" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={`truncate text-sm ${unread ? "font-extrabold" : "font-bold"} text-slate-900`}
                          >
                            {convo.subject || "(No Subject)"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {convo.snippet || "—"}
                          </div>
                        </div>
                        <div className="shrink-0 text-[12px] font-semibold text-slate-500">
                          {time}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Reader panel */}
        <div className="min-h-0 rounded-[clamp(12px,1vw,18px)] border bg-white/90 shadow-sm overflow-hidden flex flex-col">
          {selectedConvo ? (
            <>
              <div className="border-b bg-white px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-extrabold tracking-tight truncate">
                    {selectedConvo.subject || "(No Subject)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLastMessage?.from_email || selectedLastMessage?.sender || "—"}
                    {selectedLastMessage?.sent_at
                      ? ` • ${new Date(selectedLastMessage.sent_at).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={openReplyComposer}
                  >
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

              <div className="min-h-0 flex-1">
                <ScrollArea className="h-full p-4">
                  {messagesLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Loading messages...
                    </div>
                  ) : messagesError ? (
                    <div className="p-4 text-center text-sm text-destructive">{messagesError}</div>
                  ) : messages.length === 0 ? (
                    <div className="p-8">
                      <EmptyState
                        icon={<Mail className="h-6 w-6" />}
                        title="No messages in this conversation"
                        description="Run Sync Gmail from Settings and try again."
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const fromLabel = String(
                          msg.from_email || msg.sender || "Unknown sender",
                        ).trim();
                        const fromAddr = String(msg.from_email || msg.sender || "").trim();
                        const when = msg.sent_at || msg.created_at;
                        return (
                          <div key={msg.id} className="rounded-xl border bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-bold text-sm truncate">{fromLabel}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {fromAddr ? `<${fromAddr}>` : "—"}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground shrink-0">
                                {when ? new Date(when).toLocaleString() : ""}
                              </div>
                            </div>
                            <div className="mt-3">
                              {msg.body_html ? (
                                <EmailHtmlViewer html={msg.body_html} />
                              ) : (
                                <div className="whitespace-pre-wrap text-sm text-slate-800">
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          )}

          {/* Floating compose button */}
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

          {/* Composer */}
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
                  <div className="font-extrabold text-sm">
                    {composerSubject ? "Responder" : "Nuevo mensaje"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setComposerExpanded((v) => !v)}
                    >
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
                    <Input
                      value={composerTo}
                      onChange={(e) => setComposerTo(e.target.value)}
                      placeholder="destinatario@correo.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-bold text-muted-foreground">Asunto</label>
                    <Input
                      value={composerSubject}
                      onChange={(e) => setComposerSubject(e.target.value)}
                      placeholder="Asunto"
                    />
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
                  <div className="text-xs text-muted-foreground">
                    Adjuntar / formato / IA (próximamente)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
