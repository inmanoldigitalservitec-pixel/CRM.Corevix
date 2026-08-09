import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
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
  Menu,
  Paperclip,
  Link2,
  Smile,
  Image,
  LockKeyhole,
  PenLine,
  MoreVertical,
  Triangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/crm/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { EmailHtmlViewer } from "@/components/email/email-html-viewer";
import { toast } from "sonner";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

export const Route = createFileRoute("/email")({
  validateSearch: (search: Record<string, unknown>): { conversationId?: string } => ({
    conversationId: typeof search.conversationId === "string" ? search.conversationId : undefined,
  }),
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
  account_type: "official" | "personal" | "shared";
  shared_name?: string | null;
  can_send: boolean;
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

type ComposerAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data: string;
};

const MAX_COMPOSER_ATTACHMENTS = 10;
const MAX_COMPOSER_ATTACHMENT_BYTES = 20 * 1024 * 1024;

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
        (row as any).updated_at || "",
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsAttachment(file: File): Promise<ComposerAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        id: crypto.randomUUID(),
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data: result.includes(",") ? result.split(",").pop() || "" : result,
      });
    };
    reader.readAsDataURL(file);
  });
}

function EmailPage() {
  const { profile } = useAuth();
  const routeSearch = Route.useSearch();
  const [conversations, setConversations] = useState<EmailConversation[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [conversationCategories, setConversationCategories] = useState<ConversationCategoryMap>({});
  const [conversationLabels, setConversationLabels] = useState<ConversationLabelMap>({});
  const [selectedConvo, setSelectedConvo] = useState<EmailConversation | null>(null);
  const [searchEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const conversationsSignatureRef = useRef("");
  const didLoadConversationsRef = useRef(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderKey>("gmail");
  const [tab, setTab] = useState<InboxTab>("all");
  const [mailboxView, setMailboxView] = useState<MailboxView>("inbox");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerTo, setComposerTo] = useState("");
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerSending, setComposerSending] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [composerConfidential, setComposerConfidential] = useState(false);
  const [driveUploading, setDriveUploading] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const driveInputRef = useRef<HTMLInputElement | null>(null);
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
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

  const loadEmailAccounts = useCallback(async () => {
    if (provider !== "gmail") {
      setEmailAccounts([]);
      setEmailAccount(null);
      setSyncStatus("idle");
      return [] as EmailAccount[];
    }
    const { data, error } = await db.rpc("list_accessible_email_accounts");
    if (error) {
      setEmailAccounts([]);
      setEmailAccount(null);
      setSyncStatus("error");
      return [] as EmailAccount[];
    }
    const accounts = ((data || []) as any[]).map((row) => ({
      id: String(row.id),
      email_address: String(row.email_address || ""),
      last_synced_at: row.last_synced_at ? String(row.last_synced_at) : null,
      account_type: row.account_type as EmailAccount["account_type"],
      shared_name: row.shared_name ? String(row.shared_name) : null,
      can_send: row.can_send !== false,
    }));
    setEmailAccounts(accounts);
    const selected = accounts.find((account) => account.id === emailAccount?.id) || accounts.find((account) => account.can_send) || null;
    setEmailAccount(selected);
    if (!selected) setSyncStatus("not_connected");
    return accounts;
  }, [db, emailAccount?.id, provider]);

  const loadEmailAccount = useCallback(async () => {
    const accounts = await loadEmailAccounts();
    return accounts.find((account) => account.can_send) || null;
  }, [loadEmailAccounts]);

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
    const conversationId = routeSearch.conversationId;
    if (!conversationId) return;
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation || selectedConvo?.id === conversation.id) return;
    setSelectedConvo(conversation);
    setMessages([]);
    setMessagesError(null);
  }, [conversations, routeSearch.conversationId, selectedConvo?.id]);

  useEffect(() => {
    if (!routeSearch.conversationId || !selectedConvo?.id) return;
    void loadMessagesForSelected();
  }, [loadMessagesForSelected, routeSearch.conversationId, selectedConvo?.id]);

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
        body: { limit: 25, email_account_id: account.id },
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
    `grid h-9 grid-cols-[40px_1fr_auto] items-center rounded-lg pr-3 transition ${
      mailboxView === view
        ? "bg-blue-50 font-semibold text-blue-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
    }`;

  const openReplyComposer = () => {
    if (!selectedConvo) return;
    const from = String(
      selectedLastMessage?.from_email || selectedLastMessage?.sender || "",
    ).trim();
    setComposerTo(from);
    setComposerSubject(`Re: ${selectedConvo.subject || ""}`.trim());
    setComposerBody("");
    setComposerAttachments([]);
    setEmojiPickerOpen(false);
    setComposerConfidential(false);
    setComposerOpen(true);
    setComposerExpanded(false);
  };

  const openNewComposer = () => {
    setComposerTo("");
    setComposerSubject("");
    setComposerBody("");
    setComposerAttachments([]);
    setEmojiPickerOpen(false);
    setComposerConfidential(false);
    setComposerOpen(true);
    setComposerExpanded(false);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setComposerExpanded(false);
    setEmojiPickerOpen(false);
  };

  const addComposerFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const currentBytes = composerAttachments.reduce((total, file) => total + file.size, 0);
    const nextBytes = files.reduce((total, file) => total + file.size, currentBytes);
    if (composerAttachments.length + files.length > MAX_COMPOSER_ATTACHMENTS) {
      toast.error(`Máximo ${MAX_COMPOSER_ATTACHMENTS} adjuntos por email.`);
      return;
    }
    if (nextBytes > MAX_COMPOSER_ATTACHMENT_BYTES) {
      toast.error("Los adjuntos no pueden superar 20 MB en total.");
      return;
    }

    try {
      const attachments = await Promise.all(files.map(readFileAsAttachment));
      setComposerAttachments((current) => [...current, ...attachments]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los archivos.");
    } finally {
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const removeComposerAttachment = (id: string) => {
    setComposerAttachments((current) => current.filter((file) => file.id !== id));
  };

  const insertEmoji = (emoji: EmojiClickData) => {
    setComposerBody((body) => `${body}${emoji.emoji}`);
  };

  const insertIntoComposerBody = (text: string) => {
    setComposerBody((body) => {
      const prefix = body && !body.endsWith("\n") ? "\n" : "";
      return `${body}${prefix}${text}`;
    });
  };

  const insertLink = () => {
    const url = window.prompt("Pega el enlace");
    if (!url?.trim()) return;
    insertIntoComposerBody(url.trim());
  };

  const insertSignature = () => {
    const signatureName = (profile as any)?.full_name || (profile as any)?.email || "Corevix CRM";
    insertIntoComposerBody(`--\n${signatureName}`);
  };

  const uploadDriveFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setDriveUploading(true);
    try {
      const links: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const { data, error } = await supabase.functions.invoke("gmail-drive-upload", {
          body: formData,
        });
        if (error || (data as any)?.error) {
          const message = await getEdgeFunctionErrorMessage(
            error,
            data,
            "No se pudo subir el archivo a Google Drive",
          );
          throw new Error(message);
        }
        const link = String((data as any)?.file?.web_view_link || "").trim();
        if (link) links.push(`${file.name}: ${link}`);
      }

      if (links.length) {
        insertIntoComposerBody(`Google Drive:\n${links.join("\n")}`);
        toast.success("Archivo de Drive insertado en el mensaje.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir a Google Drive.");
    } finally {
      setDriveUploading(false);
      if (driveInputRef.current) driveInputRef.current.value = "";
    }
  };

  const sendComposer = async () => {
    if (composerSending) return;
    if (provider !== "gmail") {
      toast.message("Outlook pendiente de integración.");
      return;
    }

    const to = composerTo.trim();
    const body = composerBody.trim();
    if (!to) {
      toast.error("Agrega al menos un destinatario.");
      return;
    }
    if (!body) {
      toast.error("El mensaje no puede estar vacío.");
      return;
    }

    let account = emailAccount;
    if (!account?.id) account = await loadEmailAccount();
    if (!account?.id) {
      toast.error("Conecta Gmail antes de enviar.");
      return;
    }

    setComposerSending(true);
    const { data, error } = await supabase.functions.invoke("gmail-send-message", {
      body: {
        to,
        subject: composerSubject.trim(),
        body,
        email_account_id: account.id,
        attachments: composerAttachments.map((attachment) => ({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          data: attachment.data,
        })),
        conversation_id: selectedConvo?.id || null,
      },
    });
    setComposerSending(false);

    if (error || (data as any)?.error) {
      const message = await getEdgeFunctionErrorMessage(error, data, "No se pudo enviar el email");
      toast.error(message);
      return;
    }

    toast.success("Email enviado.");
    setComposerOpen(false);
    setComposerExpanded(false);
    setComposerTo("");
    setComposerSubject("");
    setComposerBody("");
    setComposerAttachments([]);
    setEmojiPickerOpen(false);
    setComposerConfidential(false);
    await fetchConversations();
    if (selectedConvo?.id) await loadMessagesForSelected();
  };

  return (
    <div
      className="relative h-[calc(100vh-3.5rem)] overflow-hidden bg-white"
      style={
        {
          ["--app-pad" as any]: "clamp(10px, 1.3vw, 18px)",
          ["--gap" as any]: "clamp(10px, 1vw, 14px)",
          ["--inbox" as any]: "clamp(340px, 31vw, 470px)",
          ["--control-h" as any]: "clamp(36px, 3.5vh, 42px)",
        } as any
      }
    >
      <aside className="absolute left-0 top-0 bottom-0 hidden w-[248px] flex-col border-r border-slate-200 bg-white px-3 py-4 text-slate-900 lg:flex">
        <button
          type="button"
          onClick={openNewComposer}
          className="mb-4 flex h-10 w-full items-center gap-3 rounded-lg border border-blue-200 bg-white px-3 text-[13px] font-semibold text-blue-700 shadow-none transition hover:border-blue-300 hover:bg-blue-50"
        >
          <PencilLine className="h-5 w-5" />
          Compose
        </button>

        <nav className="grid gap-1 text-[14px]">
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
            className="grid h-9 grid-cols-[40px_1fr_auto] items-center rounded-lg pr-3 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <span className="grid place-items-center">
              <ChevronDown className="h-4 w-4" />
            </span>
            <span className="text-left">More</span>
          </button>
        </nav>
      </aside>
      <div className="h-full p-[var(--app-pad)] lg:pl-[calc(248px+var(--app-pad))] flex flex-col gap-[var(--gap)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-1 pb-3">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-blue-600">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950">
                  Email Inbox
                </h1>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-500">
                  {provider}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Bandeja viva con auto-sync y actualizaciones en tiempo real.
              </p>
            </div>
          </div>
          <div
            className={`hidden sm:flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold ${
              syncStatus === "error"
                ? "border-destructive/30 text-destructive"
                : syncStatus === "syncing"
                  ? "border-blue-200 text-blue-700"
                  : "border-emerald-200 text-emerald-700"
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
            className={`${selectedConvo ? "hidden" : "flex"} min-h-0 overflow-hidden border border-slate-200 bg-white shadow-none flex-col`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-2.5">
              <Button
                variant="outline"
                className="h-[var(--control-h)] justify-between rounded-lg border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
                onClick={() => setProvider((p) => (p === "gmail" ? "outlook" : "gmail"))}
              >
                <span className="font-semibold capitalize">{provider}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
              <Button
                variant="outline"
                className="h-[var(--control-h)] justify-center rounded-lg border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            <div className="border-b border-slate-200 bg-white px-3 py-2 sm:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                {syncStatus === "syncing" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {syncLabel}
              </div>
            </div>

            <div className="hidden grid-cols-5 border-b border-slate-200 bg-white px-3 sm:grid">
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
                  className={`relative h-10 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                    tab === t.key ? "text-blue-700" : "text-slate-600 hover:text-slate-950"
                  }`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  <span className="grid h-[22px] min-w-6 place-items-center rounded-full border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-500">
                    {t.count}
                  </span>
                  {tab === t.key && (
                    <span className="absolute bottom-0 left-[18%] right-[18%] h-0.5 rounded-t-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 bg-white">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse border-b border-slate-100 bg-slate-50"
                      />
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
                        className={`group grid w-full min-w-0 grid-cols-[32px_32px_minmax(0,1fr)_76px] items-center gap-2 border-b border-slate-100 px-3 py-0 text-left transition hover:bg-slate-50 sm:grid-cols-[32px_32px_minmax(150px,220px)_minmax(0,1fr)_76px] ${
                          isActive ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <span
                          className="flex h-10 items-center justify-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="grid h-4 w-4 place-items-center rounded-[3px] border border-slate-300 bg-white transition group-hover:border-slate-500">
                            <span className="sr-only">Seleccionar</span>
                          </span>
                        </span>

                        <span
                          className="flex h-10 items-center justify-center text-slate-300 transition hover:text-slate-600"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Star className="h-4 w-4" />
                        </span>

                        <span
                          className={`hidden truncate text-[13px] sm:block ${
                            unread ? "font-semibold text-slate-950" : "font-medium text-slate-700"
                          }`}
                        >
                          {senderLabel}
                        </span>

                        <span className="min-w-0 truncate text-[13px] text-slate-500">
                          <span
                            className={
                              unread ? "font-semibold text-slate-950" : "font-medium text-slate-800"
                            }
                          >
                            {subject}
                          </span>
                          <span className="mx-1 text-slate-400">-</span>
                          <span>{convo.snippet || "Sin vista previa"}</span>
                        </span>

                        <span
                          className={`justify-self-end text-[12px] ${
                            unread ? "font-semibold text-slate-950" : "font-medium text-slate-500"
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
            className={`${selectedConvo ? "flex" : "hidden"} min-h-0 overflow-hidden border border-slate-200 bg-white shadow-none flex-col`}
          >
            {selectedConvo ? (
              <>
                <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedConvo(null);
                        setMessages([]);
                        setMessagesError(null);
                      }}
                    >
                      ← Volver
                    </Button>

                    <div className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-blue-700 sm:grid">
                      {getInitials(selectedSender)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-semibold tracking-tight truncate">
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
                      className="h-9 w-9 rounded-lg hover:bg-slate-50"
                      onClick={openReplyComposer}
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-slate-50"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-slate-50"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-lg hover:bg-slate-50"
                    >
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
                            className="h-24 animate-pulse border-b border-slate-100 bg-slate-50"
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
                      <div>
                        {messages.map((msg) => {
                          const fromLabel = extractDisplayName(msg.from_email || msg.sender);
                          const fromAddr = String(msg.from_email || msg.sender || "").trim();
                          const when = msg.sent_at || msg.created_at;
                          const outbound = msg.direction === "outbound";
                          return (
                            <div
                              key={msg.id}
                              className="min-w-0 max-w-full overflow-x-hidden border-b border-slate-100 bg-white px-5 py-4 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700">
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
                              <div className="mt-4 min-w-0 max-w-full overflow-hidden bg-white">
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
              <div className="flex-1 flex items-center justify-center text-muted-foreground bg-white">
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
            <div className="flex h-full flex-col overflow-hidden border border-slate-200 bg-white shadow-none">
              <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-white px-4 text-slate-900">
                <div className="text-[14px] font-semibold">
                  {composerSubject ? "Reply" : "New Message"}
                </div>

                <div className="flex items-center gap-1 text-slate-500">
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setComposerExpanded(false)}
                    aria-label="Minimize"
                  >
                    <span className="text-lg leading-none">−</span>
                  </button>

                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setComposerExpanded((v) => !v)}
                    aria-label={composerExpanded ? "Restore" : "Expand"}
                  >
                    <span className="text-[15px] leading-none">{composerExpanded ? "▣" : "↗"}</span>
                  </button>

                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-50 hover:text-slate-900"
                    onClick={closeComposer}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-100 px-4 py-2">
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="shrink-0">Enviar desde</span>
                  <select
                    value={emailAccount?.id || ""}
                    onChange={(event) => {
                      const account = emailAccounts.find((item) => item.id === event.target.value);
                      if (account?.can_send) setEmailAccount(account);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none"
                  >
                    {emailAccounts
                      .filter((account) => account.can_send)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.shared_name ||
                            (account.account_type === "official" ? "Correo oficial" : "Cuenta personal")}{" "}
                          · {account.email_address}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="border-b border-slate-100 px-4">
                <div className="flex h-10 items-center gap-2 text-[14px]">
                  <span className="shrink-0 text-slate-500">To</span>
                  <input
                    value={composerTo}
                    onChange={(e) => setComposerTo(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    placeholder=""
                  />
                  <button type="button" className="text-[13px] text-slate-500 hover:text-blue-700">
                    Cc
                  </button>
                  <button type="button" className="text-[13px] text-slate-500 hover:text-blue-700">
                    Bcc
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-100 px-4">
                <input
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  className="h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-slate-400"
                  placeholder="Subject"
                />
              </div>

              <textarea
                value={composerBody}
                onChange={(e) => setComposerBody(e.target.value)}
                className="min-h-0 flex-1 resize-none bg-white px-4 py-3 text-[14px] leading-6 text-slate-900 outline-none"
                placeholder=""
              />

              {composerAttachments.length > 0 && (
                <div className="border-t border-slate-100 px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {composerAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-[12px] text-slate-700"
                      >
                        <span className="max-w-[220px] truncate font-medium">
                          {attachment.filename}
                        </span>
                        <span className="shrink-0 text-slate-500">
                          {formatFileSize(attachment.size)}
                        </span>
                        <button
                          type="button"
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-md hover:bg-slate-50"
                          onClick={() => removeComposerAttachment(attachment.id)}
                          aria-label={`Remove ${attachment.filename}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      onChange={(event) => void addComposerFiles(event.target.files)}
                    />
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => void addComposerFiles(event.target.files)}
                    />
                    <input
                      ref={driveInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => void uploadDriveFiles(event.target.files)}
                    />
                    <button
                      type="button"
                      onClick={sendComposer}
                      disabled={composerSending}
                      className="flex h-9 overflow-hidden rounded-lg bg-blue-600 text-sm font-medium text-white shadow-none transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex items-center px-5">
                        {composerSending ? "Enviando..." : "Enviar"}
                      </span>
                      <span className="grid w-8 place-items-center border-l border-white/25">
                        ▾
                      </span>
                    </button>

                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-[24px] font-medium leading-none text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() =>
                        toast.message(
                          "Formato de texto enriquecido pendiente para el editor de email.",
                        )
                      }
                      aria-label="Formatting options"
                      title="Formato"
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => attachmentInputRef.current?.click()}
                      aria-label="Attach files"
                      title="Adjuntar archivo"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      onClick={insertLink}
                      aria-label="Insert link"
                      title="Insertar enlace"
                    >
                      <Link2 className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        onClick={() => setEmojiPickerOpen((open) => !open)}
                        aria-label="Insert emoji"
                        title="Insertar emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      {emojiPickerOpen && (
                        <div
                          className="absolute bottom-10 left-0 z-[60] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <EmojiPicker
                            height={360}
                            width={320}
                            previewConfig={{ showPreview: false }}
                            onEmojiClick={insertEmoji}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => driveInputRef.current?.click()}
                      disabled={driveUploading}
                      aria-label="Insert from Google Drive"
                      title="Subir a Google Drive e insertar enlace"
                    >
                      {driveUploading ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                      ) : (
                        <Triangle className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => imageInputRef.current?.click()}
                      aria-label="Insert image"
                      title="Adjuntar imagen"
                    >
                      <Image className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className={`grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${
                        composerConfidential ? "bg-blue-50 text-blue-700" : ""
                      }`}
                      onClick={() => {
                        setComposerConfidential((value) => !value);
                        toast.message(
                          composerConfidential
                            ? "Modo confidencial desactivado."
                            : "Modo confidencial marcado visualmente. Gmail API no permite aplicar expiración desde este composer todavía.",
                        );
                      }}
                      aria-label="Confidential mode"
                      title="Modo confidencial"
                    >
                      <LockKeyhole className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      onClick={insertSignature}
                      aria-label="Insert signature"
                      title="Insertar firma"
                    >
                      <PenLine className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => toast.message("Más opciones del composer en preparación.")}
                      aria-label="More options"
                      title="Más opciones"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={closeComposer}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
