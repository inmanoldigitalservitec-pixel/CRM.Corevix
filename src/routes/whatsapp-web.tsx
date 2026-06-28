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
  head: () => ({ meta: [{ title: "WhatsApp Web CRM — Corevix" }] }),
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
  title: string | null;
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

  const [whatsappConversations, setWhatsappConversations] = useState<CrmWhatsappConversationListRow[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<CrmWhatsappMessageRow[]>([]);
  const [whatsappConversationsLoading, setWhatsappConversationsLoading] = useState(true);
  const [whatsappMessagesLoading, setWhatsappMessagesLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const [messengerConversations, setMessengerConversations] = useState<MetaConversationListRow[]>([]);
  const [messengerMessages, setMessengerMessages] = useState<MetaMessageRow[]>([]);
  const [messengerConversationsLoading, setMessengerConversationsLoading] = useState(true);
  const [messengerMessagesLoading, setMessengerMessagesLoading] = useState(false);
  const [messengerError, setMessengerError] = useState<string | null>(null);

  const [instagramConversations, setInstagramConversations] = useState<MetaConversationListRow[]>([]);
  const [instagramMessages, setInstagramMessages] = useState<MetaMessageRow[]>([]);
  const [instagramConversationsLoading, setInstagramConversationsLoading] = useState(true);
  const [instagramMessagesLoading, setInstagramMessagesLoading] = useState(false);
  const [instagramError, setInstagramError] = useState<string | null>(null);

  const canSeeUnassigned = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const serviceWindow = useMemo(() => getServiceWindowState(whatsappMessages, now), [now, whatsappMessages]);

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
        displayName: row.display_name || row.contact_name || row.whatsapp_profile_name || row.phone || "Sin nombre",
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
          conversation.channel === selectedConversation.channel && conversation.id === selectedConversation.id,
      ) ?? null
    );
  }, [selectedConversation, unifiedConversations]);

  const selectedWhatsappConversation = useMemo(() => {
    if (selectedConversation?.channel !== "whatsapp") return null;
    return whatsappConversations.find((conversation) => conversation.conversation_id === selectedConversation.id) ?? null;
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
      ? whatsappConversationsLoading || messengerConversationsLoading || instagramConversationsLoading
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

  async function loadRelatedDocuments(conversation: UnifiedConversation | null, whatsapp: CrmWhatsappConversationListRow | null) {
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
          .select("id, number, title, amount, currency, status, public_token, valid_until, created_at")
          .eq("company_id", profile.company_id)
          .or(proposalFilters.join(","))
          .order("created_at", { ascending: false })
          .limit(3),
        db
          .from("invoices")
          .select("id, number, title, total, amount, currency, status, public_token, due_date, created_at")
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
    void Promise.all([loadWhatsappConversations(), loadMessengerConversations(), loadInstagramConversations()]);
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
    if (selectedConversation.channel === "whatsapp") void loadWhatsappMessages(selectedConversation.id);
    if (selectedConversation.channel === "messenger") void loadMessengerMessages(selectedConversation.id);
    if (selectedConversation.channel === "instagram") void loadInstagramMessages(selectedConversation.id);
  }, [selectedConversation?.channel, selectedConversation?.id]);

  useEffect(() => {
    void loadRelatedDocuments(selectedUnifiedConversation, selectedWhatsappConversation);
  }, [selectedUnifiedConversation?.key, selectedWhatsappConversation?.lead_id, selectedWhatsappConversation?.contact_id]);

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
        setSendError("La ventana de 24h de WhatsApp está cerrada. Usa una plantilla aprobada para continuar.");
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
      await Promise.all([loadMessengerMessages(selectedConversation.id), loadMessengerConversations()]);
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
    <div className="h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden bg-[#e9f3ef] text-[#111b21]">
      <div className="grid h-full min-h-0 grid-cols-[76px_390px_minmax(0,1fr)_330px] max-[1460px]:grid-cols-[70px_360px_minmax(0,1fr)] max-[980px]:grid-cols-[62px_minmax(280px,360px)_minmax(0,1fr)] max-[760px]:grid-cols-[1fr]">
        <aside className="flex min-h-0 flex-col items-center border-r border-[#d9e5df] bg-[#f4faf7] py-4 max-[760px]:hidden">
          <div className="mb-7 grid h-11 w-11 place-items-center rounded-2xl bg-[#25d366] text-white shadow-[0_12px_30px_rgba(0,168,132,.25)]">
            <MessageCircle className="h-6 w-6" />
          </div>
          <RailIcon active icon={<Inbox className="h-5 w-5" />} label="Inbox" />
          <RailIcon icon={<Clock3 className="h-5 w-5" />} label="Pendientes" />
          <RailIcon icon={<Users className="h-5 w-5" />} label="Contactos" />
          <RailIcon icon={<Archive className="h-5 w-5" />} label="Archivo" />
          <div className="mt-auto flex flex-col gap-3">
            <RailIcon icon={<Settings className="h-5 w-5" />} label="Ajustes" />
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#c9dad2] bg-white text-sm font-bold text-[#00a884] shadow-sm">
              C
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col border-r border-[#d9e5df] bg-[#fbfdfc] shadow-[16px_0_35px_rgba(18,35,29,.05)] max-[760px]:hidden">
          <div className="border-b border-[#e0ebe6] bg-[#fbfdfc] px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#12231d]">WhatsApp</h1>
                <span className="rounded-full bg-[#d9fdd3] px-2.5 py-1 text-xs font-bold text-[#008069]">CRM</span>
              </div>
              <div className="flex items-center gap-1 text-[#54645d]">
                <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#edf6f2]" type="button">
                  <Plus className="h-5 w-5" />
                </button>
                <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#edf6f2]" type="button">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex h-11 items-center gap-3 rounded-2xl border border-[#e2ece7] bg-[#f1f7f4] px-4 text-[#667a72] shadow-inner">
              <Search className="h-4 w-4" />
              <input
                className="h-full flex-1 bg-transparent text-sm text-[#12231d] outline-none placeholder:text-[#7b8d86]"
                placeholder="Buscar o iniciar un chat"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Filter className="h-4 w-4" />
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
                      ? "border-[#a8e8c3] bg-[#d9fdd3] text-[#007a5d] shadow-sm"
                      : "border-[#dde8e3] bg-white text-[#52645d] hover:border-[#bddfd0] hover:bg-[#f4faf7]"
                  }`}
                >
                  {channel.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            <div className="mb-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#60736b]">
              <Archive className="h-4 w-4" />
              <span>Archivados</span>
            </div>
            {listLoading ? (
              <ConversationSkeleton />
            ) : visibleConversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cadbd3] bg-[#f7fbf9] p-6 text-center text-sm text-[#6c7f77]">
                No hay conversaciones para mostrar.
              </div>
            ) : (
              visibleConversations.map((conversation) => (
                <button
                  key={conversation.key}
                  type="button"
                  onClick={() => setSelectedConversation({ channel: conversation.channel, id: conversation.id })}
                  className={`group mb-1 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selectedConversation?.channel === conversation.channel && selectedConversation?.id === conversation.id
                      ? "border-[#bcebd0] bg-[#e6fbef] shadow-[0_10px_26px_rgba(0,168,132,.10)]"
                      : "border-transparent bg-transparent hover:bg-[#f2f8f5]"
                  }`}
                >
                  <Avatar conversation={conversation} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[15px] font-semibold text-[#12231d]">{conversation.displayName}</p>
                      <span className="shrink-0 text-xs text-[#667a72]">{formatTime(conversation.lastMessageAt)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-[#667a72]">
                        <ChannelMiniLabel channel={conversation.channel} /> {conversation.lastMessageText || conversation.subtitle || "Sin mensajes todavía"}
                      </p>
                      {conversation.unreadCount > 0 ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#25d366] px-1.5 text-xs font-bold text-white">
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

        <main className="flex min-h-0 flex-col bg-[#edf5f1]">
          {selectedUnifiedConversation ? (
            <>
              <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#d9e5df] bg-[#f9fcfa]/95 px-5 backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar conversation={selectedUnifiedConversation} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-[#12231d]">{selectedUnifiedConversation.displayName}</h2>
                    </div>
                    <p className="truncate text-xs font-medium text-[#6b7e76]">
                      {selectedUnifiedConversation.subtitle || selectedUnifiedConversation.status || "Conversación"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#1f2f29]">
                  <HeaderIcon icon={<Search className="h-5 w-5" />} />
                  <HeaderIcon icon={<Phone className="h-5 w-5" />} />
                  <HeaderIcon icon={<Video className="h-5 w-5" />} />
                  <HeaderIcon icon={<MoreVertical className="h-5 w-5" />} />
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <div className="mx-auto max-w-[980px] space-y-2">
                  <DatePill label="Hoy" />
                  {messagesLoading ? (
                    <MessageSkeleton />
                  ) : selectedMessages.length === 0 ? (
                    <div className="mx-auto mt-14 max-w-sm rounded-3xl border border-[#dce9e3] bg-[#f9fcfa] p-6 text-center shadow-sm">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#d9fdd3] text-[#008069]">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-[#12231d]">No hay mensajes todavía</p>
                      <p className="mt-1 text-sm text-[#6c7f77]">Cuando llegue una conversación, aparecerá aquí.</p>
                    </div>
                  ) : (
                    selectedMessages.map((message) => <MessageBubble key={message.id} message={message} />)
                  )}
                </div>
              </div>

              <footer className="shrink-0 border-t border-[#d9e5df] bg-[#f7fbf9] px-5 py-3">
                {sendError ? <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</div> : null}
                <div className="flex items-center gap-3">
                  <button className="grid h-11 w-11 place-items-center rounded-full text-[#60736b] hover:bg-[#edf6f2]" type="button">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button className="grid h-11 w-11 place-items-center rounded-full text-[#60736b] hover:bg-[#edf6f2]" type="button">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    className="h-12 min-w-0 flex-1 rounded-2xl border border-[#dce8e2] bg-white px-5 text-sm text-[#12231d] shadow-sm outline-none placeholder:text-[#81918a] focus:border-[#9edebc] focus:ring-4 focus:ring-[#25d366]/10"
                    placeholder={selectedConversation?.channel === "instagram" ? "Instagram está en modo lectura" : "Escribe un mensaje"}
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
                    className="grid h-12 w-12 place-items-center rounded-full bg-[#00a884] text-white shadow-[0_10px_22px_rgba(0,168,132,.22)] transition hover:bg-[#008f72] disabled:opacity-60"
                    type="button"
                    disabled={sending || !composerValue.trim() || selectedConversation?.channel === "instagram"}
                    onClick={() => void handleSend()}
                  >
                    {composerValue.trim() ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-[#6b7e76]">
                  <Bot className="h-3.5 w-3.5" />
                  <span>
                    {selectedConversation?.channel === "whatsapp" && !serviceWindow.isServiceWindowOpen
                      ? "Ventana de WhatsApp cerrada: usa plantilla aprobada para continuar."
                      : "Corevix CRM mantiene el contexto del cliente mientras respondes."}
                  </span>
                </div>
              </footer>
            </>
          ) : (
            <div className="grid h-full place-items-center p-10">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[28px] bg-[#d9fdd3] text-[#008069] shadow-sm">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-[#12231d]">WhatsApp CRM</h2>
                <p className="mt-2 text-sm leading-6 text-[#6c7f77]">
                  Selecciona una conversación para responder, ver contexto del cliente y mantener el flujo comercial dentro del CRM.
                </p>
              </div>
            </div>
          )}
        </main>

        <aside className="min-h-0 border-l border-[#d9e5df] bg-[#f9fcfa] px-4 py-4 max-[1460px]:hidden">
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
      className={`mb-3 grid h-11 w-11 place-items-center rounded-2xl transition ${
        active ? "bg-[#d9fdd3] text-[#008069]" : "text-[#52645d] hover:bg-[#e8f3ee] hover:text-[#008069]"
      }`}
    >
      {icon}
    </button>
  );
}

function HeaderIcon({ icon }: { icon: ReactNode }) {
  return (
    <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[#edf6f2]">
      {icon}
    </button>
  );
}

function Avatar({ conversation, size = "md" }: { conversation: UnifiedConversation; size?: "md" | "lg" }) {
  const initials =
    conversation.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C";
  const box = size === "lg" ? "h-12 w-12" : "h-11 w-11";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full border border-white bg-[#d9fdd3] shadow-sm ${box}`}>
      {conversation.avatarUrl ? (
        <img src={conversation.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#d9fdd3] to-[#b7f3cf] text-sm font-bold text-[#007a5d]">
          {initials}
        </div>
      )}
    </div>
  );
}

function ChannelMiniLabel({ channel }: { channel: ConversationChannel }) {
  if (channel === "messenger") return <Facebook className="mr-1 inline h-3.5 w-3.5 text-[#2b6bed]" />;
  if (channel === "instagram") return <Instagram className="mr-1 inline h-3.5 w-3.5 text-[#d53f8c]" />;
  return <MessageCircle className="mr-1 inline h-3.5 w-3.5 text-[#00a884]" />;
}

function MessageBubble({ message }: { message: UnifiedMessage }) {
  const outbound = message.direction === "outbound";
  const text = message.text?.trim() || (message.type ? `[${message.type}]` : "Mensaje sin contenido");
  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[68%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-5 shadow-sm ${
          outbound
            ? "rounded-br-md bg-[#d9fdd3] text-[#12231d]"
            : "rounded-bl-md border border-[#e1ebe6] bg-white text-[#12231d]"
        }`}
      >
        <div>{text}</div>
        <div className="mt-1 flex justify-end gap-1 text-[11px] text-[#6d7f77]">
          <span>{formatTime(message.at)}</span>
          {outbound ? <CheckCheck className="h-3.5 w-3.5 text-[#00a884]" /> : null}
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
      <div className="grid h-full place-items-center text-center text-sm text-[#6c7f77]">
        <div>
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-[#00a884]" />
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
  const proposalUrl = latestProposal?.public_token ? `/public/proposal/${latestProposal.public_token}` : `/proposals?conversationId=${conversationId}`;
  const invoiceUrl = latestInvoice?.public_token ? `/public/invoice/${latestInvoice.public_token}` : `/invoices?conversationId=${conversationId}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <section className="rounded-3xl border border-[#dce8e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar conversation={conversation} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-[#12231d]">{conversation.displayName}</h3>
            <p className="truncate text-xs text-[#6c7f77]">{conversation.subtitle || conversation.channel}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#edf6f2] px-2.5 py-1 text-[11px] font-bold text-[#52645d]">
                {conversation.channel}
              </span>
              <span className="rounded-full bg-[#d9fdd3] px-2.5 py-1 text-[11px] font-bold text-[#008069]">
                {contactState}
              </span>
            </div>
          </div>
        </div>
        <a
          href="/clients"
          className="mt-3 block rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] px-3 py-2 text-center text-xs font-bold text-[#52645d] transition hover:bg-[#edf6f2]"
        >
          Ver perfil
        </a>
      </section>

      <section className="rounded-3xl border border-[#bcebd0] bg-[#e9fff1] p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[#008069]">Siguiente acción</p>
        <h4 className="mt-1 text-lg font-black text-[#12231d]">{nextAction.label}</h4>
        <p className="mt-1 text-xs leading-5 text-[#52645d]">{nextAction.description}</p>
        <a
          href={nextAction.href}
          className="mt-3 block rounded-2xl bg-[#00a884] px-4 py-3 text-center text-sm font-black text-white shadow-[0_10px_22px_rgba(0,168,132,.18)] transition hover:bg-[#008f72]"
        >
          {nextAction.cta}
        </a>
      </section>

      <section className="rounded-3xl border border-[#dce8e2] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-[#12231d]">Envío rápido</p>
          {relatedDocsLoading ? <span className="text-xs font-bold text-[#7b8d86]">Buscando…</span> : null}
        </div>

        {latestInvoice ? (
          <SmartDocumentCard
            icon={<Receipt className="h-5 w-5" />}
            title="Enviar factura"
            name={latestInvoice.title || latestInvoice.number || "Factura"}
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
            icon={<FileText className="h-5 w-5" />}
            title="Enviar propuesta"
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
          <div className="rounded-2xl border border-dashed border-[#cfe2d9] bg-[#f7fbf9] p-4 text-center">
            <p className="text-sm font-bold text-[#12231d]">No hay documentos listos</p>
            <p className="mt-1 text-xs leading-5 text-[#6c7f77]">Crea una propuesta o factura para poder enviarla desde aquí.</p>
            <div className="mt-3 flex justify-center gap-2">
              <IconQuickAction href={`/proposals?conversationId=${conversationId}`} label="Crear propuesta" icon={<FileText className="h-4 w-4" />} />
              <IconQuickAction href={`/invoices?conversationId=${conversationId}`} label="Crear factura" icon={<Receipt className="h-4 w-4" />} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[#dce8e2] bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-black text-[#12231d]">Acciones</p>
        <div className="grid grid-cols-2 gap-2">
          <IconQuickAction href={`/tasks?conversationId=${conversationId}`} label="Tarea" icon={<Clock3 className="h-4 w-4" />} />
          <button
            type="button"
            onClick={() => toast.info("Notas rápidas: pendiente conectar modal interno.")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] px-3 py-3 text-sm font-bold text-[#52645d] transition hover:bg-[#edf6f2]"
          >
            <StickyNote className="h-4 w-4" />
            Nota
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#dce8e2] bg-white p-4 shadow-sm">
        <p className="text-sm font-black text-[#12231d]">Último movimiento</p>
        <p className="mt-2 rounded-2xl bg-[#f1f7f4] p-3 text-xs leading-5 text-[#60736b]">{activity}</p>
      </section>

      <section className="rounded-3xl border border-[#dce8e2] bg-white p-4 shadow-sm">
        <p className="text-sm font-black text-[#12231d]">Atención</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-[#f7fbf9] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#7b8d86]">Ventana</p>
            <p className="mt-1 text-sm font-black text-[#12231d]">{isServiceWindowOpen ? "Abierta" : "Cerrada"}</p>
          </div>
          <div className="rounded-2xl bg-[#f7fbf9] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#7b8d86]">Restante</p>
            <p className="mt-1 text-sm font-black text-[#12231d]">{formatDuration(remainingServiceWindowMs)}</p>
          </div>
        </div>
        {canSeeUnassigned ? (
          <p className="mt-3 text-xs text-[#7b8d86]">Puedes ver conversaciones sin asignar por tu rol.</p>
        ) : null}
      </section>

      {errors.length ? (
        <section className="rounded-3xl border border-red-100 bg-red-50 p-4 shadow-sm">
          <p className="mb-2 text-sm font-black text-red-800">Avisos</p>
          <div className="space-y-2">
            {errors.map((error) => (
              <p key={error} className="rounded-xl bg-white px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ))}
          </div>
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
    <div className="rounded-2xl border border-[#bcebd0] bg-[#f0fff6] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#d9fdd3] text-[#008069]">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#12231d]">{title}</p>
          <p className="mt-0.5 truncate text-sm font-bold text-[#52645d]">{name}</p>
          <p className="mt-0.5 truncate text-xs text-[#7b8d86]">{meta}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPrepare}
          className="rounded-2xl bg-[#00a884] px-3 py-2.5 text-xs font-black text-white transition hover:bg-[#008f72]"
        >
          Preparar mensaje
        </button>
        <a
          href={href}
          className="rounded-2xl border border-[#bcebd0] bg-white px-3 py-2.5 text-center text-xs font-black text-[#008069] transition hover:bg-[#f7fbf9]"
        >
          Abrir
        </a>
      </div>
    </div>
  );
}

function IconQuickAction({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      className="flex items-center justify-center gap-2 rounded-2xl border border-[#dce8e2] bg-[#f7fbf9] px-3 py-3 text-sm font-bold text-[#52645d] transition hover:bg-[#edf6f2]"
    >
      {icon}
      {label}
    </a>
  );
}

function getContactState(conversation: UnifiedConversation, whatsapp: CrmWhatsappConversationListRow | null) {
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
      label: "Revisar conversación",
      description: "Instagram está en modo lectura. Usa el contexto para decidir el próximo paso.",
      cta: "Ver detalles",
      href: `/whatsapp-web?conversationId=${conversationId}`,
    };
  }

  if (!whatsapp?.lead_id && !whatsapp?.whatsapp_lead_id && !whatsapp?.contact_id) {
    return {
      label: "Crear lead",
      description: "Registra este contacto antes de cotizar, facturar o crear tareas.",
      cta: "Crear lead",
      href: `/leads?conversationId=${conversationId}`,
    };
  }

  if (stage.includes("proposal") || stage.includes("propuesta") || stage.includes("cotiz")) {
    return {
      label: "Enviar factura",
      description: "La conversación ya está en etapa de propuesta. El siguiente paso natural es facturar o cobrar.",
      cta: "Crear factura",
      href: `/invoices?conversationId=${conversationId}${clientId ? `&clientId=${clientId}` : ""}`,
    };
  }

  if (!serviceWindowOpen && conversation.channel === "whatsapp") {
    return {
      label: "Usar plantilla",
      description: "La ventana de WhatsApp está cerrada. Usa una plantilla aprobada para continuar.",
      cta: "Preparar seguimiento",
      href: `/automations?conversationId=${conversationId}`,
    };
  }

  return {
    label: "Crear propuesta",
    description: "Convierte esta conversación en una propuesta sin salir del flujo comercial.",
    cta: "Crear propuesta",
    href: `/proposals?conversationId=${conversationId}${leadId ? `&leadId=${leadId}` : ""}`,
  };
}

function getLatestActivity(conversation: UnifiedConversation, whatsapp: CrmWhatsappConversationListRow | null) {
  if (whatsapp?.lead_summary) return whatsapp.lead_summary;
  if (conversation.lastMessageText) return `Último mensaje: ${conversation.lastMessageText}`;
  if (conversation.lastMessageAt) return `Última interacción: ${formatTime(conversation.lastMessageAt)}`;
  return "Aún no hay actividad registrada para este contacto.";
}

function DatePill({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-[#52645d] shadow-sm">{label}</span>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl p-3">
          <div className="h-11 w-11 animate-pulse rounded-full bg-[#e4eee9]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#e4eee9]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[#edf4f1]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-14 w-80 animate-pulse rounded-2xl bg-white" />
      <div className="ml-auto h-16 w-72 animate-pulse rounded-2xl bg-[#d9fdd3]" />
      <div className="h-28 w-[420px] animate-pulse rounded-2xl bg-white" />
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
