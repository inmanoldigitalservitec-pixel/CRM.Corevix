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
  PencilLine,
  FileText,
  ShoppingBag,
  Plus,
  Menu,
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
type InboxTab =
  | "primary"
  | "promotions"
  | "social"
  | "updates"
  | "forums"
  | "all"
  | "unread"
  | "starred";
type SyncStatus = "idle" | "syncing" | "success" | "error" | "not_connected";

type GmailCategory = "primary" | "promotions" | "social" | "updates" | "forums";

type ConversationCategoryMap = Record<string, GmailCategory>;
type ConversationLabelMap = Record<string, string[]>;
type MailboxView = "inbox" | "starred" | "snoozed" | "sent" | "drafts" | "purchases";

async function getEdgeFunctionErrorMessage(error: unknown, data: unknown, fallback: string) {
  let message = String(
    (data as any)?.error || (data as any)?.message || (error as any)?.message || fallback,
  );

  const context = (error as any)?.context;
  if (context && typeof context.json === "function") {
    try {
      const body =
        typeof context.clone === "function" ? await context.clone().json() : await context.json();
      message = String(body?.error || body?.message || message);
    } catch {
      // keep fallback
    }
  }

  return message;
}

function categoryFromLabelIds(labelIds?: string[] | null): GmailCategory {
  const labels = (labelIds || []).map((x) => String(x).toUpperCase());

  if (labels.includes("CATEGORY_PROMOTIONS")) return "promotions";
  if (labels.includes("CATEGORY_SOCIAL")) return "social";
  if (labels.includes("CATEGORY_UPDATES")) return "updates";
  if (labels.includes("CATEGORY_FORUMS")) return "forums";

  return "primary";
}

function categoryLabel(category: GmailCategory) {
  if (category === "primary") return "Primary";
  if (category === "promotions") return "Promotions";
  if (category === "social") return "Social";
  if (category === "updates") return "Updates";
  return "Forums";
}

function hasGmailLabel(labelIds: string[] | undefined | null, label: string) {
  return (labelIds || []).map((x) => String(x).toUpperCase()).includes(label.toUpperCase());
}

function looksLikePurchase(convo: EmailConversation, labelIds?: string[] | null) {
  const text = `${convo.subject || ""} ${convo.snippet || ""}`.toLowerCase();

  return (
    hasGmailLabel(labelIds, "CATEGORY_PROMOTIONS") ||
    /receipt|invoice|order|purchase|payment|paid|subscription|renew|temu|amazon|stripe|paypal|openrouter|cloudflare|google one/.test(
      text,
    )
  );
}

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
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return initials || "@";
}

function emailConversationSignature(rows: EmailConversation[]) {
  return rows
    .map((row) =>
      [
        row.id,
        row.last_message_at || "",
        row.updated_at || "",
        row.unread_count ?? 0,
        row.status || "",
        row.snippet || "",
      ].join("|"),
    )
    .join("::");
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
  const [conversationCategories, setConversationCategories] = useState<ConversationCategoryMap>({});
  const [conversationLabels, setConversationLabels] = useState<ConversationLabelMap>({});
  const [selectedConvo, setSelectedConvo] = useState<EmailConversation | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const conversationsSignatureRef = useRef("");
  const didLoadConversationsRef = useRef(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderKey>("gmail");
  const [tab, setTab] = useState<InboxTab>("all");
  const [mailboxView, setMailboxView] = useState<MailboxView>("inbox");
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
    if (!didLoadConversationsRef.current) setLoading(true);
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
      const rows = r2.data || [];
      const nextSignature = emailConversationSignature(rows);
      if (nextSignature !== conversationsSignatureRef.current) {
        conversationsSignatureRef.current = nextSignature;
        setConversations(rows);
      }

      const ids = rows.map((c: EmailConversation) => c.id).filter(Boolean);
      if (ids.length) {
        const { data: messageRows } = await db
          .from("email_messages")
          .select("conversation_id,label_ids,created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false });

        const nextCategories: ConversationCategoryMap = {};
        for (const row of messageRows || []) {
          const conversationId = String((row as any).conversation_id || "");
          if (!conversationId || nextCategories[conversationId]) continue;
          nextCategories[conversationId] = categoryFromLabelIds((row as any).label_ids || []);
        }

        for (const convo of rows) {
          if (!nextCategories[convo.id]) nextCategories[convo.id] = "primary";
        }

        setConversationCategories(nextCategories);
      } else {
        setConversationCategories({});
      }

      didLoadConversationsRef.current = true;
      setLoading(false);
      return;
    }
    const rows = data || [];
    const nextSignature = emailConversationSignature(rows);
    if (nextSignature !== conversationsSignatureRef.current) {
      conversationsSignatureRef.current = nextSignature;
      setConversations(rows);
    }

    const ids = rows.map((c: EmailConversation) => c.id).filter(Boolean);
    if (ids.length) {
      const { data: messageRows } = await db
        .from("email_messages")
        .select("conversation_id,label_ids,created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });

      const nextCategories: ConversationCategoryMap = {};
      const nextLabels: ConversationLabelMap = {};

      for (const row of messageRows || []) {
        const conversationId = String((row as any).conversation_id || "");
        if (!conversationId || nextCategories[conversationId]) continue;

        const labels = ((row as any).label_ids || []).map((x: unknown) => String(x));
        nextLabels[conversationId] = labels;
        nextCategories[conversationId] = categoryFromLabelIds(labels);
      }

      for (const convo of rows) {
        if (!nextCategories[convo.id]) nextCategories[convo.id] = "primary";
        if (!nextLabels[convo.id]) nextLabels[convo.id] = [];
      }

      setConversationCategories(nextCategories);
      setConversationLabels(nextLabels);
    } else {
      setConversationCategories({});
      setConversationLabels({});
    }

    didLoadConversationsRef.current = true;
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
      const { data, error } = await supabase.functions.invoke("sync-gmail", {
        body: { limit: 25 },
      });
      syncInFlightRef.current = false;

      if (error || (data as any)?.error) {
        const message = await getEdgeFunctionErrorMessage(
          error,
          data,
          "No se pudo sincronizar Gmail",
        );
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
    [
      emailAccount,
      fetchConversations,
      loadEmailAccount,
      loadMessagesForSelected,
      provider,
      selectedConvo?.id,
    ],
  );

  useEffect(() => {
    didLoadConversationsRef.current = false;
    conversationsSignatureRef.current = "";
    setLoading(true);
    void fetchConversations();
    void loadEmailAccount();
    setTab("all");
    setMailboxView("inbox");
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
    const primary = conversations.filter(
      (c) => (conversationCategories[c.id] || "primary") === "primary",
    ).length;
    const promotions = conversations.filter(
      (c) => conversationCategories[c.id] === "promotions",
    ).length;
    const social = conversations.filter((c) => conversationCategories[c.id] === "social").length;
    const updates = conversations.filter((c) => conversationCategories[c.id] === "updates").length;
    const forums = conversations.filter((c) => conversationCategories[c.id] === "forums").length;
    const unread = conversations.filter((c) => (c.unread_count || 0) > 0).length;
    const starred = conversations.filter((c) =>
      (c.tags || []).map((t) => String(t).toLowerCase()).includes("starred"),
    ).length;

    const inbox = conversations.filter((c) =>
      hasGmailLabel(conversationLabels[c.id], "INBOX"),
    ).length;
    const snoozed = conversations.filter((c) =>
      hasGmailLabel(conversationLabels[c.id], "SNOOZED"),
    ).length;
    const sent = conversations.filter((c) =>
      hasGmailLabel(conversationLabels[c.id], "SENT"),
    ).length;
    const drafts = conversations.filter((c) =>
      hasGmailLabel(conversationLabels[c.id], "DRAFT"),
    ).length;
    const purchases = conversations.filter((c) =>
      looksLikePurchase(c, conversationLabels[c.id]),
    ).length;

    return {
      all,
      primary,
      promotions,
      social,
      updates,
      forums,
      unread,
      starred,
      inbox,
      snoozed,
      sent,
      drafts,
      purchases,
    };
  }, [conversations, conversationCategories, conversationLabels]);

  const filtered = useMemo(() => {
    const q = searchEmail.trim().toLowerCase();
    let list = conversations;

    const hasLoadedCategories = Object.keys(conversationCategories).length > 0;
    const hasLoadedLabels = Object.keys(conversationLabels).length > 0;

    if (hasLoadedLabels) {
      if (mailboxView === "inbox") {
        list = list.filter((c) => hasGmailLabel(conversationLabels[c.id], "INBOX"));
      }

      if (mailboxView === "starred") {
        list = list.filter(
          (c) =>
            hasGmailLabel(conversationLabels[c.id], "STARRED") ||
            (c.tags || []).map((t) => String(t).toLowerCase()).includes("starred"),
        );
      }

      if (mailboxView === "snoozed") {
        list = list.filter((c) => hasGmailLabel(conversationLabels[c.id], "SNOOZED"));
      }

      if (mailboxView === "sent") {
        list = list.filter((c) => hasGmailLabel(conversationLabels[c.id], "SENT"));
      }

      if (mailboxView === "drafts") {
        list = list.filter((c) => hasGmailLabel(conversationLabels[c.id], "DRAFT"));
      }

      if (mailboxView === "purchases") {
        list = list.filter((c) => looksLikePurchase(c, conversationLabels[c.id]));
      }
    }

    if (tab === "primary" && hasLoadedCategories) {
      list = list.filter((c) => (conversationCategories[c.id] || "primary") === "primary");
    }

    if (
      hasLoadedCategories &&
      (tab === "promotions" || tab === "social" || tab === "updates" || tab === "forums")
    ) {
      list = list.filter((c) => conversationCategories[c.id] === tab);
    }

    if (tab === "unread") list = list.filter((c) => (c.unread_count || 0) > 0);

    if (tab === "starred") {
      list = list.filter(
        (c) =>
          hasGmailLabel(conversationLabels[c.id], "STARRED") ||
          (c.tags || []).map((t) => String(t).toLowerCase()).includes("starred"),
      );
    }

    if (!q) return list;

    return list.filter((c) => `${c.subject || ""} ${c.snippet || ""}`.toLowerCase().includes(q));
  }, [conversations, conversationCategories, conversationLabels, mailboxView, searchEmail, tab]);

  const selectedLastMessage = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    return messages[messages.length - 1] || null;
  }, [messages]);

  const syncLabel = syncStatusCopy(syncStatus, emailAccount, provider);
  const selectedSender = selectedLastMessage?.from_email || selectedLastMessage?.sender || "—";

  const gmailSidebarItemClass = (view: MailboxView) =>
    `grid h-8 grid-cols-[40px_1fr_auto] items-center rounded-r-full pr-3 transition ${
      mailboxView === view
        ? "bg-[#d3e3fd] font-bold text-[#001d35]"
        : "text-[#3c4043] hover:bg-[#e9eef6]"
    }`;

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
      className="relative h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f6f8fc]"
      style={
        {
          ["--app-pad" as any]: "clamp(10px, 1.3vw, 18px)",
          ["--gap" as any]: "clamp(10px, 1vw, 14px)",
          ["--inbox" as any]: "clamp(340px, 31vw, 470px)",
          ["--control-h" as any]: "clamp(36px, 3.5vh, 42px)",
        } as any
      }
    >
      <aside className="hidden lg:flex absolute left-0 top-0 bottom-0 w-[248px] flex-col bg-[#f6f8fc] px-2 py-3 text-[#202124]">
        <button
          type="button"
          onClick={() => {
            setComposerTo("");
            setComposerSubject("");
            setComposerBody("");
            setComposerExpanded(false);
            setComposerOpen(true);
          }}
          className="mb-3 ml-1 flex h-14 w-[142px] items-center gap-4 rounded-[18px] bg-[#c2e7ff] px-5 text-[14px] font-medium text-[#001d35] shadow-sm transition hover:shadow-md"
        >
          <PencilLine className="h-5 w-5" />
          Compose
        </button>

        <nav className="grid gap-0.5 text-[14px]">
          <button
            type="button"
            onClick={() => {
              setSelectedConvo(null);
              setMessages([]);
              setMailboxView("inbox");
              setTab("all");
            }}
            className={gmailSidebarItemClass("inbox")}
          >
            <span className="grid place-items-center">
              <Inbox className="h-4 w-4" />
            </span>
            <span className="text-left">Inbox</span>
            <span className="text-[12px] font-bold">{tabCounts.inbox || tabCounts.all}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedConvo(null);
              setMessages([]);
              setMailboxView("starred");
              setTab("all");
            }}
            className={gmailSidebarItemClass("starred")}
          >
            <span className="grid place-items-center">
              <Star className="h-4 w-4" />
            </span>
            <span className="text-left">Starred</span>
            <span className="text-[12px] font-medium">{tabCounts.starred}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedConvo(null);
              setMessages([]);
              setMailboxView("snoozed");
              setTab("all");
            }}
            className={gmailSidebarItemClass("snoozed")}
          >
            <span className="grid place-items-center">
              <Clock className="h-4 w-4" />
            </span>
            <span className="text-left">Snoozed</span>
            <span className="text-[12px] font-medium">{tabCounts.snoozed}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedConvo(null);
              setMessages([]);
              setMailboxView("sent");
              setTab("all");
            }}
            className={gmailSidebarItemClass("sent")}
          >
            <span className="grid place-items-center">
              <Send className="h-4 w-4" />
            </span>
            <span className="text-left">Sent</span>
            <span className="text-[12px] font-medium">{tabCounts.sent}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedConvo(null);
              setMessages([]);
              setMailboxView("drafts");
              setTab("all");
            }}
            className={gmailSidebarItemClass("drafts")}
          >
            <span className="grid place-items-center">
              <FileText className="h-4 w-4" />
            </span>
            <span className="text-left font-semibold">Drafts</span>
            <span className="text-[12px] font-medium">{tabCounts.drafts}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedConvo(null);
              setMessages([]);
              setMailboxView("purchases");
              setTab("all");
            }}
            className={gmailSidebarItemClass("purchases")}
          >
            <span className="grid place-items-center">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span className="text-left font-semibold">Purchases</span>
            <span className="text-[12px] font-medium">{tabCounts.purchases}</span>
          </button>

          <button
            type="button"
            className="grid h-8 grid-cols-[40px_1fr_auto] items-center rounded-r-full pr-3 text-[#3c4043] transition hover:bg-[#e9eef6]"
          >
            <span className="grid place-items-center">
              <ChevronDown className="h-4 w-4" />
            </span>
            <span className="text-left">More</span>
          </button>
        </nav>

        <div className="mt-8 flex items-center justify-between px-5">
          <span className="text-[16px] font-medium text-[#202124]">Labels</span>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-[#5f6368] transition hover:bg-[#e9eef6]"
            aria-label="Add label"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <div className="h-full p-[var(--app-pad)] lg:pl-[calc(248px+var(--app-pad))] flex flex-col gap-[var(--gap)]">
        <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-none flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full text-[#5f6368] transition hover:bg-[#e9eef6] lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-950">
                  Email Inbox
                </h1>
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

        <div className="min-h-0 flex-1 grid grid-cols-1 gap-[var(--gap)]">
          <div
            className={`${selectedConvo ? "hidden" : "flex"} min-h-0 rounded-2xl border bg-white/95 shadow-sm overflow-hidden flex-col backdrop-blur`}
          >
            <div
              className={`grid gap-2 border-b border-[#e5e7eb] bg-white p-2.5 transition-[grid-template-columns] duration-200 ${
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
                <Button
                  variant="outline"
                  className="h-[var(--control-h)] rounded-xl justify-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              )}
            </div>

            <div className="border-b bg-white px-3 py-2 sm:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                {syncStatus === "syncing" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {syncLabel}
              </div>
            </div>

            <div className="grid grid-cols-5 border-b border-[#e5e7eb] bg-white px-3">
              {(
                [
                  { key: "primary" as const, label: "Primary", count: tabCounts.primary },
                  { key: "promotions" as const, label: "Promotions", count: tabCounts.promotions },
                  { key: "social" as const, label: "Social", count: tabCounts.social },
                  { key: "updates" as const, label: "Updates", count: tabCounts.updates },
                  { key: "all" as const, label: "All", count: tabCounts.all },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`relative h-10 flex items-center justify-center gap-2 text-sm font-bold transition-colors ${
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

            <div className="min-h-0 flex-1 bg-white">
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
                      title={
                        provider === "gmail" && syncStatus === "not_connected"
                          ? "Conecta Gmail"
                          : "No hay correos todavía"
                      }
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
                    const senderLabel =
                      extractDisplayName(
                        (convo as any).from_email ||
                          (convo as any).sender ||
                          (convo as any).from ||
                          (convo as any).sender_name ||
                          "",
                      ) || (convo.provider || provider).toUpperCase();
                    return (
                      <button
                        type="button"
                        key={convo.id}
                        onClick={() => selectConvo(convo)}
                        className={`group grid w-full grid-cols-[32px_32px_minmax(150px,220px)_minmax(0,1fr)_76px] items-center gap-2 border-b border-[#e8eaed] px-3 py-0 text-left transition hover:relative hover:z-10 hover:bg-[#f2f6fc] hover:shadow-[0_1px_2px_rgba(60,64,67,.18),0_1px_3px_1px_rgba(60,64,67,.12)] ${
                          isActive ? "bg-[#eaf1fb]" : unread ? "bg-white" : "bg-[#f8fafc]"
                        }`}
                      >
                        <span
                          className="flex h-10 items-center justify-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="grid h-4 w-4 place-items-center rounded-[3px] border border-[#c4c7c5] bg-white transition group-hover:border-[#5f6368]">
                            <span className="sr-only">Seleccionar</span>
                          </span>
                        </span>

                        <span
                          className="flex h-10 items-center justify-center text-[#bdc1c6] transition hover:text-[#5f6368]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Star className="h-4 w-4" />
                        </span>

                        <span
                          className={`truncate text-[13px] ${
                            unread ? "font-bold text-[#202124]" : "font-medium text-[#3c4043]"
                          }`}
                        >
                          {senderLabel}
                        </span>

                        <span className="min-w-0 truncate text-[13px] text-[#5f6368]">
                          <span
                            className={
                              unread ? "font-bold text-[#202124]" : "font-semibold text-[#202124]"
                            }
                          >
                            {subject}
                          </span>
                          <span className="mx-1 text-[#5f6368]">-</span>
                          <span>{convo.snippet || "Sin vista previa"}</span>
                        </span>

                        <span
                          className={`justify-self-end text-[12px] ${
                            unread ? "font-bold text-[#202124]" : "font-medium text-[#5f6368]"
                          }`}
                          title={categoryLabel(conversationCategories[convo.id] || "primary")}
                        >
                          {time}
                        </span>
                      </button>
                    );
                  })
                )}
              </ScrollArea>
            </div>
          </div>

          <div
            className={`${selectedConvo ? "flex" : "hidden"} min-h-0 rounded-2xl border bg-white/95 shadow-sm overflow-hidden flex-col backdrop-blur`}
          >
            {selectedConvo ? (
              <>
                <div className="border-b bg-white px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0 rounded-xl px-2.5 text-xs font-bold"
                      onClick={() => {
                        setSelectedConvo(null);
                        setMessages([]);
                        setMessagesError(null);
                      }}
                    >
                      ← Volver
                    </Button>

                    <div className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xs font-black text-primary">
                      {getInitials(selectedSender)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold tracking-tight truncate">
                        {selectedConvo.subject || "(No Subject)"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {extractDisplayName(selectedSender)}
                        {selectedLastMessage?.sent_at
                          ? ` • ${formatFullDate(selectedLastMessage.sent_at)}`
                          : ""}
                      </div>
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

                <div className="min-h-0 flex-1 bg-white">
                  <ScrollArea className="h-full px-5 py-4">
                    {messagesLoading ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"
                          />
                        ))}
                      </div>
                    ) : messagesError ? (
                      <div className="p-4 text-center text-sm text-destructive">
                        {messagesError}
                      </div>
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
                            <div
                              key={msg.id}
                              className="border-b border-[#e5e7eb] bg-white px-5 py-4 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-black text-slate-700">
                                    {getInitials(fromLabel)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm truncate">{fromLabel}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {fromAddr ? `<${fromAddr}>` : "—"}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground shrink-0">
                                  {formatFullDate(when)}
                                </div>
                              </div>
                              <div className="mt-4 overflow-hidden bg-white">
                                {msg.body_html ? (
                                  <EmailHtmlViewer html={msg.body_html} />
                                ) : (
                                  <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
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
          </div>
        </div>
        {composerOpen && (
          <div
            className={`fixed z-50 ${
              composerExpanded
                ? "bottom-6 right-6 left-6 top-[calc(3.5rem+var(--app-pad))]"
                : "bottom-6 right-6 h-[min(560px,calc(100vh-96px))] w-[min(600px,calc(100vw-32px))]"
            }`}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-t-[10px] border border-[#dadce0] bg-white shadow-[0_8px_28px_rgba(60,64,67,.28)]">
              <div className="flex h-10 items-center justify-between bg-[#f2f6fc] px-4 text-[#001d35]">
                <div className="text-[14px] font-semibold">
                  {composerSubject ? "Reply" : "New Message"}
                </div>

                <div className="flex items-center gap-1 text-[#444746]">
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded hover:bg-[#e8eaed]"
                    onClick={() => setComposerExpanded(false)}
                    aria-label="Minimize"
                  >
                    <span className="text-lg leading-none">−</span>
                  </button>

                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded hover:bg-[#e8eaed]"
                    onClick={() => setComposerExpanded((v) => !v)}
                    aria-label={composerExpanded ? "Restore" : "Expand"}
                  >
                    <span className="text-[15px] leading-none">{composerExpanded ? "▣" : "↗"}</span>
                  </button>

                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded hover:bg-[#e8eaed]"
                    onClick={closeComposer}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="border-b border-[#e8eaed] px-4">
                <div className="flex h-10 items-center gap-2 text-[14px]">
                  <span className="shrink-0 text-[#3c4043]">To</span>
                  <input
                    value={composerTo}
                    onChange={(e) => setComposerTo(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    placeholder=""
                  />
                  <button type="button" className="text-[13px] text-[#3c4043] hover:underline">
                    Cc
                  </button>
                  <button type="button" className="text-[13px] text-[#3c4043] hover:underline">
                    Bcc
                  </button>
                </div>
              </div>

              <div className="border-b border-[#e8eaed] px-4">
                <input
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  className="h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-[#5f6368]"
                  placeholder="Subject"
                />
              </div>

              <textarea
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                className="min-h-0 flex-1 resize-none bg-white px-4 py-3 text-[14px] leading-6 text-[#202124] outline-none"
                placeholder=""
              />

              <div className="border-t border-[#e8eaed] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={sendComposer}
                      className="flex h-9 overflow-hidden rounded-full bg-[#0b57d0] text-sm font-medium text-white shadow-sm transition hover:bg-[#0842a0]"
                    >
                      <span className="flex items-center px-5">Send</span>
                      <span className="grid w-8 place-items-center border-l border-white/25">
                        ▾
                      </span>
                    </button>

                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[15px] font-semibold text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      📎
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      🔗
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      🙂
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      🖼
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      🔒
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    >
                      ⋮
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={closeComposer}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded text-[#5f6368] hover:bg-[#f1f3f4]"
                    aria-label="Discard draft"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
