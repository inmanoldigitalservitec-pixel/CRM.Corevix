import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  Bot,
  CheckCheck,
  Clock3,
  Facebook,
  FileText,
  Filter,
  Inbox,
  Instagram,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Receipt,
  Search,
  Send,
  Settings,
  Smile,
  StickyNote,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type {
  CrmWhatsappConversationListRow,
  CrmWhatsappMessageRow,
} from "@/lib/whatsapp/view-types";
import type { MetaConversationListRow, MetaMessageRow } from "@/lib/meta/view-types";
import { getServiceWindowState } from "@/lib/whatsapp/service-window";
import { sendWhatsappMessage } from "@/lib/whatsapp/whatsapp-bot-api";

export const Route = createFileRoute("/whatsapp-web")({
  component: WhatsAppWebPage,
  head: () => ({ meta: [{ title: "Meta Inbox — Corevix CRM" }] }),
});

type InboxChannel = "all" | "whatsapp" | "messenger" | "instagram";
type ConversationChannel = "whatsapp" | "messenger" | "instagram";
type SelectedConversation = { channel: ConversationChannel; id: string } | null;

type UnifiedConversation = {
  key: string;
  channel: ConversationChannel;
  id: string;
  displayName: string;
  subtitle: string | null;
  avatarUrl: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: string | null;
  raw: CrmWhatsappConversationListRow | MetaConversationListRow;
};

type UnifiedMessage = {
  id: string;
  direction: "inbound" | "outbound" | string;
  text: string | null;
  at: string | null;
  status?: string | null;
  type?: string | null;
};

type RelatedProposal = {
  id: string;
  number: string | null;
  title: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  public_token: string | null;
  valid_until: string | null;
};

type RelatedInvoice = {
  id: string;
  number: string | null;
  total: number | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  public_token: string | null;
  due_date: string | null;
};

const CHANNELS: Array<{ value: InboxChannel; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
  { value: "instagram", label: "Instagram" },
];

function WhatsAppWebPage() {
  const { profile, roles } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<InboxChannel>("all");
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation>(null);
  const [search, setSearch] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [relatedProposals, setRelatedProposals] = useState<RelatedProposal[]>([]);
  const [relatedInvoices, setRelatedInvoices] = useState<RelatedInvoice[]>([]);
  const [relatedDocsLoading, setRelatedDocsLoading] = useState(false);

  const [whatsappConversations, setWhatsappConversations] = useState<
    CrmWhatsappConversationListRow[]
  >([]);
  const [whatsappMessages, setWhatsappMessages] = useState<CrmWhatsappMessageRow[]>([]);
  const [whatsappConversationsLoading, setWhatsappConversationsLoading] = useState(true);
  const [whatsappMessagesLoading, setWhatsappMessagesLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const [messengerConversations, setMessengerConversations] = useState<MetaConversationListRow[]>(
    [],
  );
  const [messengerMessages, setMessengerMessages] = useState<MetaMessageRow[]>([]);
  const [messengerConversationsLoading, setMessengerConversationsLoading] = useState(true);
  const [messengerMessagesLoading, setMessengerMessagesLoading] = useState(false);
  const [messengerError, setMessengerError] = useState<string | null>(null);

  const [instagramConversations, setInstagramConversations] = useState<MetaConversationListRow[]>(
    [],
  );
  const [instagramMessages, setInstagramMessages] = useState<MetaMessageRow[]>([]);
  const [instagramConversationsLoading, setInstagramConversationsLoading] = useState(true);
  const [instagramMessagesLoading, setInstagramMessagesLoading] = useState(false);
  const [instagramError, setInstagramError] = useState<string | null>(null);

  const canSeeUnassigned =
    roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const serviceWindow = useMemo(
    () => getServiceWindowState(whatsappMessages, now),
    [now, whatsappMessages],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const unifiedConversations = useMemo<UnifiedConversation[]>(() => {
    const rows: UnifiedConversation[] = [];

    for (const row of whatsappConversations) {
      const id = String(row.conversation_id);
      rows.push({
        key: `whatsapp:${id}`,
        channel: "whatsapp",
        id,
        displayName:
          row.display_name ||
          row.contact_name ||
          row.whatsapp_profile_name ||
          row.phone ||
          "Sin nombre",
        subtitle: row.phone || row.lead_stage || row.selected_service || null,
        avatarUrl: null,
        lastMessageText: row.last_message,
        lastMessageAt: row.last_message_at || row.conversation_updated_at,
        unreadCount: Number(row.unread_count || 0),
        status: row.conversation_status,
        raw: row,
      });
    }

    for (const row of messengerConversations) {
      const id = String(row.id);
      rows.push({
        key: `messenger:${id}`,
        channel: "messenger",
        id,
        displayName: row.sender_name || "Usuario de Messenger",
        subtitle: row.external_user_id || null,
        avatarUrl: row.sender_profile_pic,
        lastMessageText: row.last_message_text,
        lastMessageAt: row.last_message_at || row.created_at,
        unreadCount: Number(row.unread_count || 0),
        status: row.status,
        raw: row,
      });
    }

    for (const row of instagramConversations) {
      const id = String(row.id);
      rows.push({
        key: `instagram:${id}`,
        channel: "instagram",
        id,
        displayName: row.sender_name || "Usuario de Instagram",
        subtitle: row.external_user_id || null,
        avatarUrl: row.sender_profile_pic,
        lastMessageText: row.last_message_text,
        lastMessageAt: row.last_message_at || row.created_at,
        unreadCount: Number(row.unread_count || 0),
        status: row.status,
        raw: row,
      });
    }

    rows.sort((a, b) => dateValue(b.lastMessageAt) - dateValue(a.lastMessageAt));
    return rows;
  }, [instagramConversations, messengerConversations, whatsappConversations]);

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return unifiedConversations.filter((conversation) => {
      if (selectedChannel !== "all" && conversation.channel !== selectedChannel) return false;
      if (!term) return true;
      return [conversation.displayName, conversation.subtitle, conversation.lastMessageText]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, selectedChannel, unifiedConversations]);

  const selectedUnifiedConversation = useMemo(() => {
    if (!selectedConversation) return null;
    return (
      unifiedConversations.find(
        (conversation) =>
          conversation.channel === selectedConversation.channel &&
          conversation.id === selectedConversation.id,
      ) ?? null
    );
  }, [selectedConversation, unifiedConversations]);

  const selectedWhatsappConversation = useMemo(() => {
    if (selectedConversation?.channel !== "whatsapp") return null;
    return (
      whatsappConversations.find(
        (conversation) => conversation.conversation_id === selectedConversation.id,
      ) ?? null
    );
  }, [selectedConversation, whatsappConversations]);

  const selectedMessages = useMemo<UnifiedMessage[]>(() => {
    if (!selectedConversation) return [];
    if (selectedConversation.channel === "messenger") {
      return messengerMessages.map((message) => ({
        id: String(message.id),
        direction: message.direction,
        text: message.text,
        at: message.sent_at || message.created_at,
        type: message.message_type,
      }));
    }
    if (selectedConversation.channel === "instagram") {
      return instagramMessages.map((message) => ({
        id: String(message.id),
        direction: message.direction,
        text: message.text,
        at: message.sent_at || message.created_at,
        type: message.message_type,
      }));
    }
    return whatsappMessages.map((message) => ({
      id: String(message.message_id || message.whatsapp_message_id || message.created_at),
      direction: message.direction || "inbound",
      text: message.content || message.button_title || "",
      at: message.created_at,
      status: message.delivery_status,
      type: message.message_type,
    }));
  }, [instagramMessages, messengerMessages, selectedConversation, whatsappMessages]);

  const messagesLoading =
    selectedConversation?.channel === "messenger"
      ? messengerMessagesLoading
      : selectedConversation?.channel === "instagram"
        ? instagramMessagesLoading
        : whatsappMessagesLoading;

  const listLoading =
    selectedChannel === "all"
      ? whatsappConversationsLoading ||
        messengerConversationsLoading ||
        instagramConversationsLoading
      : selectedChannel === "whatsapp"
        ? whatsappConversationsLoading
        : selectedChannel === "messenger"
          ? messengerConversationsLoading
          : instagramConversationsLoading;

  async function loadWhatsappConversations() {
    if (!profile?.company_id) {
      setWhatsappConversations([]);
      setWhatsappConversationsLoading(false);
      return;
    }
    setWhatsappConversationsLoading(true);
    setWhatsappError(null);
    const { data, error } = await supabase
      .from("crm_whatsapp_conversation_list")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("conversation_updated_at", { ascending: false })
      .limit(100);

    if (error) {
      setWhatsappError(error.message);
      setWhatsappConversations([]);
    } else {
      setWhatsappConversations((data ?? []) as unknown as CrmWhatsappConversationListRow[]);
    }
    setWhatsappConversationsLoading(false);
  }

  async function loadWhatsappMessages(conversationId: string) {
    setWhatsappMessagesLoading(true);
    const { data, error } = await supabase
      .from("crm_whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setWhatsappMessages([]);
    } else {
      setWhatsappMessages((data ?? []) as unknown as CrmWhatsappMessageRow[]);
    }
    setWhatsappMessagesLoading(false);
  }

  async function loadRelatedDocuments(
    conversation: UnifiedConversation | null,
    whatsapp: CrmWhatsappConversationListRow | null,
  ) {
    if (!profile?.company_id || !conversation) {
      setRelatedProposals([]);
      setRelatedInvoices([]);
      return;
    }

    const leadId = whatsapp?.lead_id || whatsapp?.whatsapp_lead_id || null;
    const clientId = whatsapp?.contact_id || null;
    const conversationId = conversation.id;
    const db = supabase as any;

    setRelatedDocsLoading(true);
    try {
      const proposalFilters: string[] = [`whatsapp_conversation_id.eq.${conversationId}`];
      if (leadId) proposalFilters.push(`lead_id.eq.${leadId}`);
      if (clientId) proposalFilters.push(`client_id.eq.${clientId}`);

      const invoiceFilters: string[] = [`whatsapp_conversation_id.eq.${conversationId}`];
      if (leadId) invoiceFilters.push(`lead_id.eq.${leadId}`);
      if (clientId) invoiceFilters.push(`client_id.eq.${clientId}`);

      const [proposalResult, invoiceResult] = await Promise.all([
        db
          .from("proposals")
          .select(
            "id, number, title, amount, currency, status, public_token, valid_until, created_at",
          )
          .eq("company_id", profile.company_id)
          .or(proposalFilters.join(","))
          .order("created_at", { ascending: false })
          .limit(3),
        db
          .from("invoices")
          .select("id, number, total, amount, currency, status, public_token, due_date, created_at")
          .eq("company_id", profile.company_id)
          .or(invoiceFilters.join(","))
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (proposalResult.error) {
        console.warn("No se pudieron cargar propuestas relacionadas", proposalResult.error);
        setRelatedProposals([]);
      } else {
        setRelatedProposals((proposalResult.data ?? []) as RelatedProposal[]);
      }

      if (invoiceResult.error) {
        console.warn("No se pudieron cargar facturas relacionadas", invoiceResult.error);
        setRelatedInvoices([]);
      } else {
        setRelatedInvoices((invoiceResult.data ?? []) as RelatedInvoice[]);
      }
    } finally {
      setRelatedDocsLoading(false);
    }
  }

  async function loadMessengerConversations() {
    if (!profile?.company_id) {
      setMessengerConversations([]);
      setMessengerConversationsLoading(false);
      return;
    }
    setMessengerConversationsLoading(true);
    setMessengerError(null);
    const db = supabase as any;
    const { data, error } = await db
      .from("meta_conversations")
      .select(
        "id, company_id, account_id, platform, sender_name, external_user_id, sender_profile_pic, last_message_text, last_message_at, unread_count, status, bot_status, linked_lead_id, linked_client_id, linked_deal_id, assigned_to, created_at",
      )
      .eq("company_id", profile.company_id)
      .eq("platform", "messenger")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(70);

    if (error) {
      setMessengerError(error.message);
      setMessengerConversations([]);
    } else {
      setMessengerConversations((Array.isArray(data) ? data : []) as MetaConversationListRow[]);
    }
    setMessengerConversationsLoading(false);
  }

  async function loadMessengerMessages(conversationId: string) {
    setMessengerMessagesLoading(true);
    const db = supabase as any;
    const { data, error } = await db
      .from("meta_messages")
      .select(
        "id, company_id, account_id, conversation_id, platform, external_message_id, direction, message_type, text, attachments, raw_payload, sent_at, created_at",
      )
      .eq("conversation_id", conversationId)
      .eq("company_id", profile?.company_id || "")
      .eq("platform", "messenger")
      .neq("message_type", "bot_state")
      .order("sent_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setMessengerMessages([]);
    } else {
      setMessengerMessages((Array.isArray(data) ? data : []) as MetaMessageRow[]);
    }
    setMessengerMessagesLoading(false);
  }

  async function loadInstagramConversations() {
    if (!profile?.company_id) {
      setInstagramConversations([]);
      setInstagramConversationsLoading(false);
      return;
    }
    setInstagramConversationsLoading(true);
    setInstagramError(null);
    const db = supabase as any;
    const { data, error } = await db
      .from("meta_conversations")
      .select(
        "id, company_id, account_id, platform, sender_name, external_user_id, sender_profile_pic, last_message_text, last_message_at, unread_count, status, bot_status, linked_lead_id, linked_client_id, linked_deal_id, assigned_to, created_at",
      )
      .eq("company_id", profile.company_id)
      .eq("platform", "instagram")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(70);

    if (error) {
      setInstagramError(error.message);
      setInstagramConversations([]);
    } else {
      setInstagramConversations((Array.isArray(data) ? data : []) as MetaConversationListRow[]);
    }
    setInstagramConversationsLoading(false);
  }

  async function loadInstagramMessages(conversationId: string) {
    setInstagramMessagesLoading(true);
    const db = supabase as any;
    const { data, error } = await db
      .from("meta_messages")
      .select(
        "id, company_id, account_id, conversation_id, platform, external_message_id, direction, message_type, text, attachments, raw_payload, sent_at, created_at",
      )
      .eq("conversation_id", conversationId)
      .eq("company_id", profile?.company_id || "")
      .eq("platform", "instagram")
      .order("sent_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setInstagramMessages([]);
    } else {
      setInstagramMessages((Array.isArray(data) ? data : []) as MetaMessageRow[]);
    }
    setInstagramMessagesLoading(false);
  }

  useEffect(() => {
    if (!profile?.company_id) return;
    void Promise.all([
      loadWhatsappConversations(),
      loadMessengerConversations(),
      loadInstagramConversations(),
    ]);
  }, [profile?.company_id]);

  useEffect(() => {
    if (selectedConversation) return;
    if (visibleConversations.length === 0) return;
    const first = visibleConversations[0];
    setSelectedConversation({ channel: first.channel, id: first.id });
  }, [selectedConversation, visibleConversations]);

  useEffect(() => {
    setSendError(null);
    setComposerValue("");
    if (!selectedConversation) {
      setWhatsappMessages([]);
      setMessengerMessages([]);
      setInstagramMessages([]);
      setRelatedProposals([]);
      setRelatedInvoices([]);
      return;
    }
    if (selectedConversation.channel === "whatsapp")
      void loadWhatsappMessages(selectedConversation.id);
    if (selectedConversation.channel === "messenger")
      void loadMessengerMessages(selectedConversation.id);
    if (selectedConversation.channel === "instagram")
      void loadInstagramMessages(selectedConversation.id);
  }, [selectedConversation?.channel, selectedConversation?.id]);

  useEffect(() => {
    void loadRelatedDocuments(selectedUnifiedConversation, selectedWhatsappConversation);
  }, [
    selectedUnifiedConversation?.key,
    selectedWhatsappConversation?.lead_id,
    selectedWhatsappConversation?.contact_id,
  ]);

  useRealtimeTable({
    table: "whatsapp_conversations",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => void loadWhatsappConversations(),
  });

  useRealtimeTable({
    table: "whatsapp_conversation_messages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: (payload) => {
      void loadWhatsappConversations();
      const changedConversationId = String(
        (payload.new as any)?.conversation_id || (payload.old as any)?.conversation_id || "",
      ).trim();
      if (
        selectedConversation?.channel === "whatsapp" &&
        (!changedConversationId || changedConversationId === selectedConversation.id)
      ) {
        void loadWhatsappMessages(selectedConversation.id);
      }
    },
  });

  useRealtimeTable({
    table: "meta_conversations",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadMessengerConversations();
      void loadInstagramConversations();
    },
  });

  useRealtimeTable({
    table: "meta_messages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: (payload) => {
      void loadMessengerConversations();
      void loadInstagramConversations();
      const changedConversationId = String(
        (payload.new as any)?.conversation_id || (payload.old as any)?.conversation_id || "",
      ).trim();
      if (
        selectedConversation?.channel === "messenger" &&
        (!changedConversationId || changedConversationId === selectedConversation.id)
      ) {
        void loadMessengerMessages(selectedConversation.id);
      }
      if (
        selectedConversation?.channel === "instagram" &&
        (!changedConversationId || changedConversationId === selectedConversation.id)
      ) {
        void loadInstagramMessages(selectedConversation.id);
      }
    },
  });

  async function handleSend() {
    const text = composerValue.trim();
    if (!text || !selectedConversation) return;

    if (selectedConversation.channel === "instagram") {
      toast.info("Instagram está en modo lectura por ahora.");
      return;
    }

    if (selectedConversation.channel === "whatsapp") {
      if (!selectedWhatsappConversation) return;
      if (!serviceWindow.isServiceWindowOpen) {
        setSendError(
          "La ventana de 24h de WhatsApp está cerrada. Usa una plantilla aprobada para continuar.",
        );
        return;
      }
      setSending(true);
      setSendError(null);
      try {
        await sendWhatsappMessage(selectedWhatsappConversation.conversation_id, text);
        setComposerValue("");
        await Promise.all([
          loadWhatsappMessages(selectedWhatsappConversation.conversation_id),
          loadWhatsappConversations(),
        ]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
        setSendError(msg);
        toast.error(msg);
      } finally {
        setSending(false);
      }
      return;
    }

    const conversation = selectedUnifiedConversation?.raw as MetaConversationListRow | undefined;
    const accountId = conversation?.account_id;
    if (!profile?.company_id || !conversation || !accountId) {
      toast.error("No se encontró la cuenta conectada para enviar este mensaje.");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-send-message", {
        body: {
          company_id: profile.company_id,
          account_id: accountId,
          conversation_id: selectedConversation.id,
          text,
        },
      });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in (data as any) && (data as any).error) {
        throw new Error(String((data as any).error));
      }
      setComposerValue("");
      await Promise.all([
        loadMessengerMessages(selectedConversation.id),
        loadMessengerConversations(),
      ]);
      toast.success("Mensaje enviado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  function insertMessageDraft(text: string) {
    setComposerValue(text);
    toast.success("Mensaje preparado en el chat.");
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden bg-white text-slate-950">
      <div className="grid h-full min-h-0 grid-cols-[76px_390px_minmax(0,1fr)_300px] max-[1460px]:grid-cols-[70px_360px_minmax(0,1fr)] max-[980px]:grid-cols-[62px_minmax(280px,360px)_minmax(0,1fr)] max-[760px]:grid-cols-[1fr]">
        <aside className="flex min-h-0 flex-col items-center border-r border-slate-200 bg-white py-4 max-[760px]:hidden">
          <div className="mb-7 grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
            <MessageCircle className="h-6 w-6" />
          </div>
          <RailIcon active icon={<Inbox className="h-5 w-5" />} label="Inbox" />
          <RailIcon icon={<Clock3 className="h-5 w-5" />} label="Pendientes" />
          <RailIcon icon={<Users className="h-5 w-5" />} label="Contactos" />
          <RailIcon icon={<Archive className="h-5 w-5" />} label="Archivo" />
          <div className="mt-auto flex flex-col gap-3">
            <RailIcon icon={<Settings className="h-5 w-5" />} label="Ajustes" />
            <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-sm font-bold text-blue-700">
              C
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col border-r border-slate-200 bg-white max-[760px]:hidden">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">Meta Inbox</h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  CRM
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <button
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
                  type="button"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
                  type="button"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {CHANNELS.map((channel) => (
                <button
                  key={channel.value}
                  type="button"
                  onClick={() => {
                    setSelectedChannel(channel.value);
                    setSelectedConversation(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedChannel === channel.value
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {channel.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <div className="mb-2 flex items-center gap-3 border-b border-slate-100 px-3 py-3 text-sm text-slate-500">
              <Archive className="h-4 w-4" />
              <span>Archivados</span>
            </div>
            {listLoading ? (
              <ConversationSkeleton />
            ) : visibleConversations.length === 0 ? (
              <div className="border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No hay conversaciones para mostrar.
              </div>
            ) : (
              visibleConversations.map((conversation) => (
                <button
                  key={conversation.key}
                  type="button"
                  onClick={() =>
                    setSelectedConversation({ channel: conversation.channel, id: conversation.id })
                  }
                  className={`group flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition ${
                    selectedConversation?.channel === conversation.channel &&
                    selectedConversation?.id === conversation.id
                      ? "bg-blue-50/70"
                      : "bg-transparent hover:bg-slate-50"
                  }`}
                >
                  <Avatar conversation={conversation} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[15px] font-semibold text-slate-950">
                        {conversation.displayName}
                      </p>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-slate-500">
                        <ChannelMiniLabel channel={conversation.channel} />{" "}
                        {conversation.lastMessageText ||
                          conversation.subtitle ||
                          "Sin mensajes todavía"}
                      </p>
                      {conversation.unreadCount > 0 ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <main className="flex min-h-0 flex-col bg-white">
          {selectedUnifiedConversation ? (
            <>
              <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar conversation={selectedUnifiedConversation} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-slate-950">
                        {selectedUnifiedConversation.displayName}
                      </h2>
                    </div>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {selectedUnifiedConversation.subtitle ||
                        selectedUnifiedConversation.status ||
                        "Conversación"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <HeaderIcon icon={<Search className="h-5 w-5" />} />
                  <HeaderIcon icon={<Phone className="h-5 w-5" />} />
                  <HeaderIcon icon={<Video className="h-5 w-5" />} />
                  <HeaderIcon icon={<MoreVertical className="h-5 w-5" />} />
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto border-b border-slate-100 px-6 py-6">
                <div className="mx-auto max-w-[980px] space-y-2">
                  <DatePill label="Hoy" />
                  {messagesLoading ? (
                    <MessageSkeleton />
                  ) : selectedMessages.length === 0 ? (
                    <div className="mx-auto mt-14 max-w-sm border border-slate-200 bg-white p-6 text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-950">No hay mensajes todavía</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Cuando llegue una conversación, aparecerá aquí.
                      </p>
                    </div>
                  ) : (
                    selectedMessages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  )}
                </div>
              </div>

              <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
                {sendError ? (
                  <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {sendError}
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <button
                    className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                    type="button"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                    type="button"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-5 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                    placeholder={
                      selectedConversation?.channel === "instagram"
                        ? "Instagram está en modo lectura"
                        : "Escribe un mensaje"
                    }
                    value={composerValue}
                    disabled={selectedConversation?.channel === "instagram" || sending}
                    onChange={(event) => setComposerValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <button
                    className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60"
                    type="button"
                    disabled={
                      sending ||
                      !composerValue.trim() ||
                      selectedConversation?.channel === "instagram"
                    }
                    onClick={() => void handleSend()}
                  >
                    {composerValue.trim() ? (
                      <Send className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500">
                  <Bot className="h-3.5 w-3.5" />
                  <span>
                    {selectedConversation?.channel === "whatsapp" &&
                    !serviceWindow.isServiceWindowOpen
                      ? "Ventana de WhatsApp cerrada: usa plantilla aprobada para continuar."
                      : "Corevix CRM mantiene el contexto del cliente mientras respondes."}
                  </span>
                </div>
              </footer>
            </>
          ) : (
            <div className="grid h-full place-items-center p-10">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-950">Meta Inbox</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Selecciona una conversación para responder, ver contexto del cliente y mantener el
                  flujo comercial dentro del CRM.
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className="min-h-0 border-l border-slate-200 bg-white px-3 py-3 max-[1460px]:hidden">
          <ContextPanel
            conversation={selectedUnifiedConversation}
            selectedWhatsappConversation={selectedWhatsappConversation}
            canSeeUnassigned={canSeeUnassigned}
            isServiceWindowOpen={serviceWindow.isServiceWindowOpen}
            remainingServiceWindowMs={serviceWindow.remainingServiceWindowMs}
            relatedProposals={relatedProposals}
            relatedInvoices={relatedInvoices}
            relatedDocsLoading={relatedDocsLoading}
            onInsertMessage={insertMessageDraft}
            errors={[whatsappError, messengerError, instagramError].filter(Boolean) as string[]}
          />
        </aside>
      </div>
    </div>
  );
}

function RailIcon({ icon, active, label }: { icon: ReactNode; active?: boolean; label: string }) {
  return (
    <button
      type="button"
      title={label}
      className={`mb-3 grid h-11 w-11 place-items-center rounded-xl transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-blue-700"
      }`}
    >
      {icon}
    </button>
  );
}

function HeaderIcon({ icon }: { icon: ReactNode }) {
  return (
    <button
      type="button"
      className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
    >
      {icon}
    </button>
  );
}

function Avatar({
  conversation,
  size = "md",
}: {
  conversation: UnifiedConversation;
  size?: "md" | "lg";
}) {
  const initials =
    conversation.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C";
  const box = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-blue-50 ${box}`}
    >
      {conversation.avatarUrl ? (
        <img src={conversation.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-blue-50 text-sm font-bold text-blue-700">
          {initials}
        </div>
      )}
    </div>
  );
}

function ChannelMiniLabel({ channel }: { channel: ConversationChannel }) {
  if (channel === "messenger")
    return <Facebook className="mr-1 inline h-3.5 w-3.5 text-[#2b6bed]" />;
  if (channel === "instagram")
    return <Instagram className="mr-1 inline h-3.5 w-3.5 text-[#d53f8c]" />;
  return <MessageCircle className="mr-1 inline h-3.5 w-3.5 text-blue-600" />;
}

function MessageBubble({ message }: { message: UnifiedMessage }) {
  const outbound = message.direction === "outbound";
  const text =
    message.text?.trim() || (message.type ? `[${message.type}]` : "Mensaje sin contenido");
  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[68%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-5 ${
          outbound
            ? "rounded-br-md border border-blue-100 bg-blue-50 text-slate-950"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-950"
        }`}
      >
        <div>{text}</div>
        <div className="mt-1 flex justify-end gap-1 text-[11px] text-slate-500">
          <span>{formatTime(message.at)}</span>
          {outbound ? <CheckCheck className="h-3.5 w-3.5 text-blue-600" /> : null}
        </div>
      </div>
    </div>
  );
}

function ContextPanel({
  conversation,
  selectedWhatsappConversation,
  canSeeUnassigned,
  isServiceWindowOpen,
  remainingServiceWindowMs,
  relatedProposals,
  relatedInvoices,
  relatedDocsLoading,
  onInsertMessage,
  errors,
}: {
  conversation: UnifiedConversation | null;
  selectedWhatsappConversation: CrmWhatsappConversationListRow | null;
  canSeeUnassigned: boolean;
  isServiceWindowOpen: boolean;
  remainingServiceWindowMs: number | null;
  relatedProposals: RelatedProposal[];
  relatedInvoices: RelatedInvoice[];
  relatedDocsLoading: boolean;
  onInsertMessage: (message: string) => void;
  errors: string[];
}) {
  if (!conversation) {
    return (
      <div className="grid h-full place-items-center text-center text-sm text-slate-500">
        <div>
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-blue-600" />
          Selecciona una conversación para ver el contexto CRM.
        </div>
      </div>
    );
  }

  const contactState = getContactState(conversation, selectedWhatsappConversation);
  const nextAction = getNextAction(conversation, selectedWhatsappConversation, isServiceWindowOpen);
  const activity = getLatestActivity(conversation, selectedWhatsappConversation);
  const conversationId = encodeURIComponent(conversation.id);
  const latestProposal = relatedProposals[0] ?? null;
  const latestInvoice = relatedInvoices[0] ?? null;
  const proposalUrl = latestProposal?.public_token
    ? `/public/proposal/${latestProposal.public_token}`
    : `/proposals?conversationId=${conversationId}`;
  const invoiceUrl = latestInvoice?.public_token
    ? `/invoice/public/${latestInvoice.public_token}`
    : `/invoices?conversationId=${conversationId}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden">
      <section className="border-b border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2.5">
          <Avatar conversation={conversation} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-black text-slate-950">
              {conversation.displayName}
            </h3>
            <p className="truncate text-[11px] text-slate-500">
              {conversation.subtitle || conversation.channel}
            </p>
          </div>
          <a
            href="/clients"
            title="Ver perfil"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-hidden">
          <span className="truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
            {conversation.channel}
          </span>
          <span className="truncate rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
            {contactState}
          </span>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
              Siguiente
            </p>
            <h4 className="truncate text-base font-black text-slate-950">{nextAction.label}</h4>
          </div>
          <a
            href={nextAction.href}
            title={nextAction.cta}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            {nextAction.icon}
          </a>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
          {nextAction.description}
        </p>
      </section>

      <section className="border-b border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black text-slate-950">Envío rápido</p>
          {relatedDocsLoading ? (
            <span className="text-[10px] font-bold text-slate-400">...</span>
          ) : null}
        </div>
        {latestInvoice ? (
          <SmartDocumentCard
            icon={<Receipt className="h-4 w-4" />}
            title="Factura"
            name={latestInvoice.number ? `Factura ${latestInvoice.number}` : "Factura"}
            meta={`${latestInvoice.status || "sin estado"} · ${formatMoney(latestInvoice.total ?? latestInvoice.amount, latestInvoice.currency)}`}
            href={invoiceUrl}
            onPrepare={() =>
              onInsertMessage(
                `Hola ${conversation.displayName}, te comparto la factura ${latestInvoice.number || ""}: ${invoiceUrl}`.trim(),
              )
            }
          />
        ) : latestProposal ? (
          <SmartDocumentCard
            icon={<FileText className="h-4 w-4" />}
            title="Propuesta"
            name={latestProposal.title || latestProposal.number || "Propuesta"}
            meta={`${latestProposal.status || "sin estado"} · ${formatMoney(latestProposal.amount, latestProposal.currency)}`}
            href={proposalUrl}
            onPrepare={() =>
              onInsertMessage(
                `Hola ${conversation.displayName}, te comparto la propuesta ${latestProposal.number || ""}: ${proposalUrl}`.trim(),
              )
            }
          />
        ) : (
          <div className="border-t border-dashed border-slate-200 pt-3">
            <p className="text-xs font-bold text-slate-950">No hay docs listos</p>
            <div className="mt-2 flex gap-2">
              <IconOnlyAction
                href={`/proposals?conversationId=${conversationId}`}
                label="Crear propuesta"
                icon={<FileText className="h-4 w-4" />}
              />
              <IconOnlyAction
                href={`/invoices?conversationId=${conversationId}`}
                label="Crear factura"
                icon={<Receipt className="h-4 w-4" />}
              />
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        <IconPanelButton
          href={`/tasks?conversationId=${conversationId}`}
          label="Tarea"
          icon={<Clock3 className="h-4 w-4" />}
        />
        <button
          type="button"
          title="Nota"
          onClick={() => toast.info("Notas rápidas: pendiente conectar modal interno.")}
          className="grid h-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <StickyNote className="h-4 w-4" />
        </button>
      </section>

      <section className="border-b border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-950">Actividad</p>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black ${isServiceWindowOpen ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}
          >
            {isServiceWindowOpen ? "Abierta" : "Cerrada"}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{activity}</p>
        <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span>Restante: {formatDuration(remainingServiceWindowMs)}</span>
          {canSeeUnassigned ? <span>Admin</span> : null}
        </div>
      </section>

      {errors.length ? (
        <section className="border-b border-red-100 bg-red-50 p-3">
          <p className="line-clamp-2 text-[11px] text-red-700">{errors[0]}</p>
        </section>
      ) : null}
    </div>
  );
}

function SmartDocumentCard({
  icon,
  title,
  name,
  meta,
  href,
  onPrepare,
}: {
  icon: ReactNode;
  title: string;
  name: string;
  meta: string;
  href: string;
  onPrepare: () => void;
}) {
  return (
    <div className="border-t border-slate-200 pt-2.5">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-blue-700">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black text-slate-950">
            {title}: {name}
          </p>
          <p className="truncate text-[11px] text-slate-500">{meta}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          title="Preparar mensaje"
          onClick={onPrepare}
          className="grid h-9 flex-1 place-items-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
        </button>
        <a
          href={href}
          title="Abrir documento"
          className="grid h-9 flex-1 place-items-center rounded-xl border border-slate-200 bg-white text-blue-700 hover:bg-slate-50"
        >
          <FileText className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function IconOnlyAction({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      title={label}
      className="grid h-10 flex-1 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    >
      {icon}
    </a>
  );
}

function IconPanelButton({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      title={label}
      className="grid h-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    >
      {icon}
    </a>
  );
}

function getContactState(
  conversation: UnifiedConversation,
  whatsapp: CrmWhatsappConversationListRow | null,
) {
  if (whatsapp?.is_hot_lead) return "Lead caliente";
  if (whatsapp?.lead_stage) return whatsapp.lead_stage;
  if (whatsapp?.lead_id || whatsapp?.whatsapp_lead_id) return "Lead";
  if (whatsapp?.contact_id) return "Contacto";
  if (conversation.status) return conversation.status;
  return "Sin registrar";
}

function getNextAction(
  conversation: UnifiedConversation,
  whatsapp: CrmWhatsappConversationListRow | null,
  serviceWindowOpen: boolean,
) {
  const conversationId = encodeURIComponent(conversation.id);
  const leadId = encodeURIComponent(whatsapp?.lead_id || whatsapp?.whatsapp_lead_id || "");
  const clientId = encodeURIComponent(whatsapp?.contact_id || "");
  const stage = String(whatsapp?.lead_stage || conversation.status || "").toLowerCase();

  if (conversation.channel === "instagram") {
    return {
      label: "Revisar",
      description: "Instagram está en modo lectura.",
      cta: "Ver",
      icon: <Search className="h-4 w-4" />,
      href: `/whatsapp-web?conversationId=${conversationId}`,
    };
  }

  if (!whatsapp?.lead_id && !whatsapp?.whatsapp_lead_id && !whatsapp?.contact_id) {
    return {
      label: "Crear lead",
      description: "Registra este contacto antes de cotizar.",
      cta: "Crear lead",
      icon: <Users className="h-4 w-4" />,
      href: `/leads?conversationId=${conversationId}`,
    };
  }

  if (stage.includes("proposal") || stage.includes("propuesta") || stage.includes("cotiz")) {
    return {
      label: "Facturar",
      description: "Ya está en etapa de propuesta.",
      cta: "Crear factura",
      icon: <Receipt className="h-4 w-4" />,
      href: `/invoices?conversationId=${conversationId}${clientId ? `&clientId=${clientId}` : ""}`,
    };
  }

  if (!serviceWindowOpen && conversation.channel === "whatsapp") {
    return {
      label: "Plantilla",
      description: "Ventana de WhatsApp cerrada.",
      cta: "Preparar",
      icon: <MessageCircle className="h-4 w-4" />,
      href: `/automations?conversationId=${conversationId}`,
    };
  }

  return {
    label: "Propuesta",
    description: "Convierte esta conversación en cotización.",
    cta: "Crear propuesta",
    icon: <FileText className="h-4 w-4" />,
    href: `/proposals?conversationId=${conversationId}${leadId ? `&leadId=${leadId}` : ""}`,
  };
}

function getLatestActivity(
  conversation: UnifiedConversation,
  whatsapp: CrmWhatsappConversationListRow | null,
) {
  if (whatsapp?.lead_summary) return whatsapp.lead_summary;
  if (conversation.lastMessageText) return `Último mensaje: ${conversation.lastMessageText}`;
  if (conversation.lastMessageAt)
    return `Última interacción: ${formatTime(conversation.lastMessageAt)}`;
  return "Aún no hay actividad registrada.";
}

function DatePill({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-500">
        {label}
      </span>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-slate-100 p-3">
          <div className="h-11 w-11 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-14 w-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="ml-auto h-16 w-72 animate-pulse rounded-2xl border border-blue-100 bg-blue-50" />
      <div className="h-28 w-[420px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(value: number | null | undefined) {
  if (!value || value <= 0) return "—";
  const minutes = Math.floor(value / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} min`;
  return `${hours}h ${rest}m`;
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  const amount = Number(value || 0);
  const safeCurrency = currency || "RD$";
  if (!amount) return safeCurrency;
  return `${safeCurrency} ${amount.toLocaleString()}`;
}
