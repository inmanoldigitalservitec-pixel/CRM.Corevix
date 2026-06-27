import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type {
  CrmWhatsappConversationListRow,
  CrmWhatsappMessageRow,
} from "@/lib/whatsapp/view-types";
import { getServiceWindowState } from "@/lib/whatsapp/service-window";
import { WhatsappReadonlyList } from "@/components/whatsapp/whatsapp-readonly-list";
import { WhatsappReadonlyThread } from "@/components/whatsapp/whatsapp-readonly-thread";
import { WhatsappContactPanel } from "@/components/whatsapp/whatsapp-contact-panel";
import { WhatsappEmptyState } from "@/components/whatsapp/whatsapp-empty-state";
import { sendWhatsappMessage } from "@/lib/whatsapp/whatsapp-bot-api";
import { MessengerReadonlyList } from "@/components/whatsapp/messenger-readonly-list";
import { MessengerReadonlyThread } from "@/components/whatsapp/messenger-readonly-thread";
import { MessengerContextPanel } from "@/components/whatsapp/messenger-context-panel";
import { InstagramReadonlyList } from "@/components/whatsapp/instagram-readonly-list";
import { InstagramReadonlyThread } from "@/components/whatsapp/instagram-readonly-thread";
import { InstagramContextPanel } from "@/components/whatsapp/instagram-context-panel";
import type { MetaConversationListRow, MetaMessageRow } from "@/lib/meta/view-types";
import {
  InboxUnifiedList,
  type UnifiedInboxConversation,
} from "@/components/whatsapp/inbox-unified-list";
import { toast } from "sonner";

export const Route = createFileRoute("/whatsapp")({
  component: WhatsAppPage,
  head: () => ({ meta: [{ title: "Bandeja de entrada — Corevix CRM" }] }),
});

type InboxChannel = "all" | "whatsapp" | "messenger" | "instagram";
type ConversationChannel = "whatsapp" | "messenger" | "instagram";
type SelectedConversation = { channel: ConversationChannel; id: string } | null;

function WhatsAppPage() {
  const { profile, user, roles } = useAuth();

  const [whatsappConversations, setWhatsappConversations] = useState<
    CrmWhatsappConversationListRow[]
  >([]);
  const [whatsappConversationsLoading, setWhatsappConversationsLoading] = useState(true);
  const [whatsappConversationsError, setWhatsappConversationsError] = useState<string | null>(null);
  const [whatsappMessages, setWhatsappMessages] = useState<CrmWhatsappMessageRow[]>([]);
  const [whatsappMessagesLoading, setWhatsappMessagesLoading] = useState(false);
  const [whatsappMessagesError, setWhatsappMessagesError] = useState<string | null>(null);
  const [serviceWindowNow, setServiceWindowNow] = useState(() => Date.now());
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendingMessengerMessage, setSendingMessengerMessage] = useState(false);

  const [messengerConversations, setMessengerConversations] = useState<MetaConversationListRow[]>(
    [],
  );
  const [messengerConversationsLoading, setMessengerConversationsLoading] = useState(true);
  const [messengerConversationsError, setMessengerConversationsError] = useState<string | null>(
    null,
  );
  const [messengerMessages, setMessengerMessages] = useState<MetaMessageRow[]>([]);
  const [messengerMessagesLoading, setMessengerMessagesLoading] = useState(false);
  const [messengerMessagesError, setMessengerMessagesError] = useState<string | null>(null);

  const [instagramConversations, setInstagramConversations] = useState<MetaConversationListRow[]>(
    [],
  );
  const [instagramConversationsLoading, setInstagramConversationsLoading] = useState(true);
  const [instagramConversationsError, setInstagramConversationsError] = useState<string | null>(
    null,
  );
  const [instagramMessages, setInstagramMessages] = useState<MetaMessageRow[]>([]);
  const [instagramMessagesLoading, setInstagramMessagesLoading] = useState(false);
  const [instagramMessagesError, setInstagramMessagesError] = useState<string | null>(null);

  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation>(null);
  const [selectedChannel, setSelectedChannel] = useState<InboxChannel>("all");

  const desiredConversationId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("conversationId");
      return v && v.trim().length ? v.trim() : null;
    } catch {
      return null;
    }
  }, []);

  const activeChannel: InboxChannel = selectedChannel;
  const canSeeUnassigned =
    roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;

  const selectedMessengerConversation = useMemo(() => {
    if (!selectedConversation || selectedConversation.channel !== "messenger") return null;
    return messengerConversations.find((c) => c.id === selectedConversation.id) ?? null;
  }, [messengerConversations, selectedConversation]);

  const selectedInstagramConversation = useMemo(() => {
    if (!selectedConversation || selectedConversation.channel !== "instagram") return null;
    return instagramConversations.find((c) => c.id === selectedConversation.id) ?? null;
  }, [instagramConversations, selectedConversation]);

  const selectedWhatsappConversation = useMemo(() => {
    if (!selectedConversation || selectedConversation.channel !== "whatsapp") return null;
    return whatsappConversations.find((c) => c.conversation_id === selectedConversation.id) ?? null;
  }, [selectedConversation, whatsappConversations]);

  const unifiedConversations = useMemo<UnifiedInboxConversation[]>(() => {
    const out: UnifiedInboxConversation[] = [];

    for (const row of whatsappConversations) {
      const id = String(row.conversation_id);
      const displayName =
        row.display_name ||
        row.contact_name ||
        row.whatsapp_profile_name ||
        row.phone ||
        "Sin nombre";
      const lastMessageText = (row as any).last_message ?? null;
      const lastMessageAt = row.last_message_at || (row as any).conversation_updated_at || null;
      const createdAt = (row as any).conversation_updated_at || row.last_message_at || null;
      const unreadCount = Number(row.unread_count ?? 0);
      const status = (row as any).conversation_status ?? null;
      out.push({
        key: `whatsapp:${id}`,
        channel: "whatsapp",
        id,
        displayName,
        avatarUrl: null,
        lastMessageText,
        lastMessageAt,
        createdAt,
        unreadCount,
        status,
        raw: row,
      });
    }

    for (const row of messengerConversations) {
      const id = String(row.id);
      const displayName = row.sender_name || "Usuario de Messenger";
      const lastMessageText = row.last_message_text ?? null;
      const lastMessageAt = row.last_message_at || row.created_at || null;
      const createdAt = row.created_at || null;
      const unreadCount = Number(row.unread_count ?? 0);
      const status = row.status ?? null;
      out.push({
        key: `messenger:${id}`,
        channel: "messenger",
        id,
        displayName,
        avatarUrl: row.sender_profile_pic ?? null,
        lastMessageText,
        lastMessageAt,
        createdAt,
        unreadCount,
        status,
        raw: row,
      });
    }

    out.sort((a, b) => {
      const at = a.lastMessageAt ? Date.parse(String(a.lastMessageAt)) : NaN;
      const bt = b.lastMessageAt ? Date.parse(String(b.lastMessageAt)) : NaN;
      if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
      if (Number.isFinite(at) && !Number.isFinite(bt)) return -1;
      if (!Number.isFinite(at) && Number.isFinite(bt)) return 1;
      const ac = a.createdAt ? Date.parse(String(a.createdAt)) : 0;
      const bc = b.createdAt ? Date.parse(String(b.createdAt)) : 0;
      return bc - ac;
    });

    return out;
  }, [messengerConversations, whatsappConversations]);

  const listLoading =
    activeChannel === "all"
      ? whatsappConversationsLoading || messengerConversationsLoading
      : activeChannel === "messenger"
        ? messengerConversationsLoading
        : activeChannel === "instagram"
          ? instagramConversationsLoading
          : whatsappConversationsLoading;
  const channelNotice =
    selectedChannel === "all"
      ? "Mostrando WhatsApp y Messenger."
      : selectedChannel === "instagram"
        ? "Mostrando Instagram DM (solo lectura por ahora)."
        : null;

  useEffect(() => {
    setSelectedConversation(null);
    setSendError(null);
    setWhatsappMessages([]);
    setWhatsappMessagesError(null);
    setWhatsappMessagesLoading(false);
    setMessengerMessages([]);
    setMessengerMessagesError(null);
    setMessengerMessagesLoading(false);
    setInstagramMessages([]);
    setInstagramMessagesError(null);
    setInstagramMessagesLoading(false);
  }, [selectedChannel]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setServiceWindowNow(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const serviceWindow = useMemo(
    () => getServiceWindowState(whatsappMessages, serviceWindowNow),
    [whatsappMessages, serviceWindowNow],
  );

  useEffect(() => {
    setSendError(null);
  }, [selectedConversation?.id, selectedConversation?.channel]);

  useEffect(() => {
    if (serviceWindow.isServiceWindowOpen) {
      setSendError(null);
    }
  }, [serviceWindow.isServiceWindowOpen]);

  async function loadWhatsappConversations() {
    if (!profile?.company_id) {
      setWhatsappConversations([]);
      setWhatsappConversationsLoading(false);
      setWhatsappConversationsError(null);
      return;
    }

    setWhatsappConversationsLoading(true);
    setWhatsappConversationsError(null);
    const { data, error } = await supabase
      .from("crm_whatsapp_conversation_list")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("conversation_updated_at", { ascending: false })
      .limit(100);

    if (error) {
      setWhatsappConversationsError(error.message);
      setWhatsappConversations([]);
    } else {
      setWhatsappConversations((data ?? []) as unknown as CrmWhatsappConversationListRow[]);
    }
    setWhatsappConversationsLoading(false);
  }

  async function loadWhatsappMessages(conversationId: string) {
    setWhatsappMessagesLoading(true);
    setWhatsappMessagesError(null);
    const { data, error } = await supabase
      .from("crm_whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      setWhatsappMessagesError(error.message);
      setWhatsappMessages([]);
    } else {
      setWhatsappMessages((data ?? []) as unknown as CrmWhatsappMessageRow[]);
    }
    setWhatsappMessagesLoading(false);
  }

  async function loadMessengerConversations() {
    if (!profile?.company_id) {
      setMessengerConversations([]);
      setMessengerConversationsLoading(false);
      setMessengerConversationsError(null);
      return;
    }

    setMessengerConversationsLoading(true);
    setMessengerConversationsError(null);
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
      .limit(50);

    if (error) {
      console.warn("No se pudieron cargar las conversaciones de Messenger.", {
        companyId: profile.company_id,
        error,
      });
      setMessengerConversationsError(error.message);
      setMessengerConversations([]);
    } else {
      const rows = (Array.isArray(data) ? data : []) as MetaConversationListRow[];
      console.info("Conversaciones de Messenger cargadas", {
        companyId: profile.company_id,
        count: rows.length,
      });
      setMessengerConversations(rows);
    }
    setMessengerConversationsLoading(false);
  }

  async function loadMessengerMessages(conversationId: string) {
    setMessengerMessagesLoading(true);
    setMessengerMessagesError(null);
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
      console.warn("No se pudieron cargar los mensajes de Messenger.", {
        companyId: profile?.company_id,
        conversationId,
        error,
      });
      setMessengerMessagesError(error.message);
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
      setInstagramConversationsError(null);
      return;
    }

    setInstagramConversationsLoading(true);
    setInstagramConversationsError(null);
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
      .limit(50);

    if (error) {
      console.warn("No se pudieron cargar las conversaciones de Instagram.", {
        companyId: profile.company_id,
        error,
      });
      setInstagramConversationsError(error.message);
      setInstagramConversations([]);
    } else {
      setInstagramConversations((Array.isArray(data) ? data : []) as MetaConversationListRow[]);
    }
    setInstagramConversationsLoading(false);
  }

  async function loadInstagramMessages(conversationId: string) {
    setInstagramMessagesLoading(true);
    setInstagramMessagesError(null);
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
      console.warn("No se pudieron cargar los mensajes de Instagram.", {
        companyId: profile?.company_id,
        conversationId,
        error,
      });
      setInstagramMessagesError(error.message);
      setInstagramMessages([]);
    } else {
      setInstagramMessages((Array.isArray(data) ? data : []) as MetaMessageRow[]);
    }
    setInstagramMessagesLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.company_id) {
        setWhatsappConversations([]);
        setWhatsappMessages([]);
        setMessengerConversations([]);
        setMessengerMessages([]);
        setInstagramConversations([]);
        setInstagramMessages([]);
        return;
      }

      if (activeChannel === "messenger") {
        await loadMessengerConversations();
      } else if (activeChannel === "all") {
        await Promise.all([loadWhatsappConversations(), loadMessengerConversations()]);
      } else if (activeChannel === "instagram") {
        await loadInstagramConversations();
      } else {
        await loadWhatsappConversations();
      }

      if (cancelled) return;
    };

    void load().catch((e: any) => {
      if (cancelled) return;
      if (activeChannel === "messenger") {
        setMessengerConversationsError(e?.message ?? "Error cargando conversaciones de Messenger");
        setMessengerConversations([]);
        setMessengerConversationsLoading(false);
      } else if (activeChannel === "instagram") {
        setInstagramConversationsError(e?.message ?? "Error cargando conversaciones de Instagram");
        setInstagramConversations([]);
        setInstagramConversationsLoading(false);
      } else if (activeChannel === "whatsapp") {
        setWhatsappConversationsError(e?.message ?? "Error cargando conversaciones");
        setWhatsappConversations([]);
        setWhatsappConversationsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeChannel, profile?.company_id]);

  useEffect(() => {
    if (!desiredConversationId) return;
    if (selectedConversation) return;
    if (listLoading) return;
    if (activeChannel === "all" ? unifiedConversations.length === 0 : false) return;
    if (activeChannel === "whatsapp" && whatsappConversations.length === 0) return;
    if (activeChannel === "messenger" && messengerConversations.length === 0) return;
    if (activeChannel === "instagram" && instagramConversations.length === 0) return;

    if (activeChannel === "messenger") {
      const found = messengerConversations.find((c) => c.id === desiredConversationId);
      if (found) setSelectedConversation({ channel: "messenger", id: found.id });
      return;
    }
    if (activeChannel === "instagram") {
      const found = instagramConversations.find((c) => c.id === desiredConversationId);
      if (found) setSelectedConversation({ channel: "instagram", id: found.id });
      return;
    }
    if (activeChannel === "whatsapp") {
      const found = whatsappConversations.find((c) => c.conversation_id === desiredConversationId);
      if (found) setSelectedConversation({ channel: "whatsapp", id: found.conversation_id });
      return;
    }
  }, [
    activeChannel,
    desiredConversationId,
    listLoading,
    instagramConversations,
    messengerConversations,
    selectedConversation,
    unifiedConversations.length,
    whatsappConversations,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedConversation) {
      setWhatsappMessages([]);
      setWhatsappMessagesLoading(false);
      setWhatsappMessagesError(null);
      setMessengerMessages([]);
      setMessengerMessagesLoading(false);
      setMessengerMessagesError(null);
      setInstagramMessages([]);
      setInstagramMessagesLoading(false);
      setInstagramMessagesError(null);
      return;
    }

    const load = async () => {
      if (selectedConversation.channel === "messenger") {
        await loadMessengerMessages(selectedConversation.id);
        return;
      }
      if (selectedConversation.channel === "instagram") {
        await loadInstagramMessages(selectedConversation.id);
        return;
      }
      await loadWhatsappMessages(selectedConversation.id);
    };

    void load().catch((e: any) => {
      if (cancelled) return;
      if (activeChannel === "messenger") {
        setMessengerMessagesError(e?.message ?? "Error cargando mensajes de Messenger");
        setMessengerMessages([]);
        setMessengerMessagesLoading(false);
      } else if (activeChannel === "instagram") {
        setInstagramMessagesError(e?.message ?? "Error cargando mensajes de Instagram");
        setInstagramMessages([]);
        setInstagramMessagesLoading(false);
      } else {
        setWhatsappMessagesError(e?.message ?? "Error cargando mensajes");
        setWhatsappMessages([]);
        setWhatsappMessagesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedConversation]);

  useRealtimeTable({
    table: "whatsapp_conversations",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      if (activeChannel === "messenger" || activeChannel === "instagram") return;
      void loadWhatsappConversations();
    },
  });

  useRealtimeTable({
    table: "whatsapp_conversation_messages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: (payload) => {
      if (activeChannel === "messenger" || activeChannel === "instagram") return;
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
      if (activeChannel === "messenger" || activeChannel === "all") {
        void loadMessengerConversations();
      }
      if (activeChannel === "instagram") {
        void loadInstagramConversations();
      }
    },
  });

  useRealtimeTable({
    table: "meta_messages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: (payload) => {
      if (activeChannel === "messenger" || activeChannel === "all") {
        void loadMessengerConversations();
      }
      if (activeChannel === "instagram") {
        void loadInstagramConversations();
      }
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

  async function handleSendMessage(content: string) {
    if (
      !selectedWhatsappConversation ||
      activeChannel === "messenger" ||
      activeChannel === "instagram"
    )
      return;
    if (!serviceWindow.isServiceWindowOpen) {
      setSendError(
        "La ventana de WhatsApp está cerrada. Usa una plantilla aprobada para continuar.",
      );
      return;
    }

    setSendingMessage(true);
    setSendError(null);
    try {
      await sendWhatsappMessage(selectedWhatsappConversation.conversation_id, content);
      await loadWhatsappMessages(selectedWhatsappConversation.conversation_id);
      await loadWhatsappConversations();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
      setSendError(msg);
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleSendMessengerMessage(content: string) {
    if (!selectedMessengerConversation) return;
    const companyId = profile?.company_id || null;
    if (!companyId) {
      toast.error("No se pudo detectar la empresa (company_id).");
      return;
    }
    const conversationId = String(selectedMessengerConversation.id || "").trim();
    if (!conversationId) {
      toast.error("No se encontró la conversación de Messenger.");
      return;
    }
    const accountId = String(selectedMessengerConversation.account_id || "").trim();
    if (!accountId) {
      toast.error("No se encontró la cuenta de Messenger conectada.");
      return;
    }
    const text = content.trim();
    if (!text) {
      toast.error("Escribe un mensaje antes de enviar.");
      return;
    }

    setSendingMessengerMessage(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-send-message", {
        body: {
          company_id: companyId,
          account_id: accountId,
          conversation_id: conversationId,
          text,
        },
      });
      if (error) throw error;
      if (data && typeof data === "object" && "error" in (data as any) && (data as any).error) {
        throw new Error(String((data as any).error));
      }

      // Refresh UI from DB so we stay consistent with the message ingestion flow.
      await Promise.all([loadMessengerMessages(conversationId), loadMessengerConversations()]);
      toast.success("Mensaje enviado por Messenger.");

      return data;
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string" ? e : null) ||
        "No se pudo enviar el mensaje por Messenger.";
      toast.error(msg);
      throw e;
    } finally {
      setSendingMessengerMessage(false);
    }
  }

  async function handleToggleMessengerBotStatus() {
    if (!selectedMessengerConversation || !profile?.company_id) return;

    const currentBotStatus = String(
      (selectedMessengerConversation as any).bot_status || "active",
    ).toLowerCase();
    const willPause = currentBotStatus !== "paused";

    const nextBotStatus = willPause ? "paused" : "active";
    const nextConversationStatus = willPause ? "human_mode" : "open";

    const db = supabase as any;
    const { error } = await db
      .from("meta_conversations")
      .update({
        bot_status: nextBotStatus,
        status: nextConversationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedMessengerConversation.id)
      .eq("company_id", profile.company_id)
      .eq("platform", "messenger");

    if (error) {
      console.warn("No se pudo cambiar el estado de Clara.", {
        conversationId: selectedMessengerConversation.id,
        error,
      });
      return;
    }

    await loadMessengerConversations();

    if (selectedConversation?.id) {
      await loadMessengerMessages(selectedConversation.id);
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] min-h-0 bg-[#f0f2f5] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/10 bg-white flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold text-slate-900 mr-2">Bandeja de entrada</div>
        <button
          type="button"
          onClick={() => setSelectedChannel("all")}
          className={`h-8 px-3 rounded-full text-xs font-medium border ${selectedChannel === "all" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("whatsapp")}
          className={`h-8 px-3 rounded-full text-xs font-medium border ${selectedChannel === "whatsapp" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("messenger")}
          className={`h-8 px-3 rounded-full text-xs font-medium border ${selectedChannel === "messenger" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          Messenger
        </button>
        <button
          type="button"
          onClick={() => setSelectedChannel("instagram")}
          className={`h-8 px-3 rounded-full text-xs font-medium border ${selectedChannel === "instagram" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
        >
          Instagram
        </button>
        <div className="text-xs text-muted-foreground ml-auto">
          {channelNotice || "Configura tus canales de Meta en Configuración → Meta."}
        </div>
      </div>

      <div
        data-demo="whatsapp-main"
        className="grid h-full min-h-0 w-full min-w-0 overflow-hidden grid-cols-[350px_minmax(0,1fr)_380px] max-[1500px]:grid-cols-[340px_minmax(0,1fr)_360px] max-[1280px]:grid-cols-[320px_minmax(0,1fr)_330px] max-[1180px]:grid-cols-[300px_minmax(0,1fr)] max-[820px]:grid-cols-[82px_minmax(0,1fr)]"
      >
        {activeChannel === "all" ? (
          <InboxUnifiedList
            className="min-h-0"
            items={unifiedConversations}
            selectedKey={
              selectedConversation
                ? `${selectedConversation.channel}:${selectedConversation.id}`
                : null
            }
            onSelectKey={(key) => {
              const [channel, id] = String(key).split(":");
              if (channel !== "whatsapp" && channel !== "messenger") return;
              setSelectedConversation({ channel: channel as ConversationChannel, id: String(id) });
            }}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            loading={whatsappConversationsLoading || messengerConversationsLoading}
            warning={
              messengerConversationsError
                ? "No se pudieron cargar las conversaciones de Messenger."
                : null
            }
          />
        ) : activeChannel === "messenger" ? (
          <MessengerReadonlyList
            className="min-h-0"
            conversations={messengerConversations}
            selectedConversationId={
              selectedConversation?.channel === "messenger" ? selectedConversation.id : null
            }
            onSelectConversationId={(id) => setSelectedConversation({ channel: "messenger", id })}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            loading={messengerConversationsLoading}
            error={messengerConversationsError}
            companyId={profile?.company_id || null}
          />
        ) : activeChannel === "instagram" ? (
          <InstagramReadonlyList
            className="min-h-0"
            conversations={instagramConversations}
            selectedConversationId={
              selectedConversation?.channel === "instagram" ? selectedConversation.id : null
            }
            onSelectConversationId={(id) => setSelectedConversation({ channel: "instagram", id })}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            loading={instagramConversationsLoading}
            error={instagramConversationsError}
          />
        ) : (
          <WhatsappReadonlyList
            className="min-h-0"
            conversations={whatsappConversations}
            selectedConversationId={
              selectedConversation?.channel === "whatsapp" ? selectedConversation.id : null
            }
            onSelectConversationId={(id) => setSelectedConversation({ channel: "whatsapp", id })}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            loading={whatsappConversationsLoading}
            error={whatsappConversationsError}
            currentUserId={user?.id || null}
            canSeeUnassigned={canSeeUnassigned}
          />
        )}

        {selectedConversation?.channel === "instagram" ? (
          selectedInstagramConversation ? (
            <InstagramReadonlyThread
              className="min-h-0"
              title={selectedInstagramConversation.sender_name || "Usuario de Instagram"}
              subtitle={selectedInstagramConversation.external_user_id}
              status={selectedInstagramConversation.status}
              avatarUrl={selectedInstagramConversation.sender_profile_pic}
              messages={instagramMessages}
              loading={instagramMessagesLoading}
              error={instagramMessagesError}
              emptyHint="Cuando recibas mensajes de Instagram, aparecerán aquí."
            />
          ) : (
            <WhatsappEmptyState
              title="Selecciona una conversación"
              subtitle="Elige una conversación de Instagram a la izquierda para ver los mensajes"
            />
          )
        ) : selectedConversation?.channel === "messenger" ? (
          selectedMessengerConversation ? (
            <MessengerReadonlyThread
              className="min-h-0"
              title={selectedMessengerConversation.sender_name || "Usuario de Messenger"}
              subtitle={selectedMessengerConversation.external_user_id}
              status={selectedMessengerConversation.status}
              avatarUrl={selectedMessengerConversation.sender_profile_pic}
              messages={messengerMessages}
              loading={messengerMessagesLoading}
              error={messengerMessagesError}
              emptyHint="Cuando recibas mensajes de Messenger, aparecerán aquí."
              onSendMessage={handleSendMessengerMessage}
              sending={sendingMessengerMessage}
            />
          ) : (
            <WhatsappEmptyState
              title="Selecciona una conversación"
              subtitle="Elige una conversación de Messenger a la izquierda para ver los mensajes"
            />
          )
        ) : selectedWhatsappConversation ? (
          <WhatsappReadonlyThread
            className="min-h-0"
            title={
              selectedWhatsappConversation.display_name ||
              selectedWhatsappConversation.contact_name ||
              selectedWhatsappConversation.whatsapp_profile_name ||
              selectedWhatsappConversation.phone ||
              "Conversación"
            }
            subtitle={selectedWhatsappConversation.phone || undefined}
            status={selectedWhatsappConversation.conversation_status}
            botEnabled={selectedWhatsappConversation.bot_enabled}
            messages={whatsappMessages}
            loading={whatsappMessagesLoading}
            error={whatsappMessagesError}
            onSendMessage={handleSendMessage}
            sending={sendingMessage}
            sendError={sendError}
            isServiceWindowOpen={serviceWindow.isServiceWindowOpen}
            lastInboundAt={serviceWindow.lastInboundAt}
            serviceWindowExpiresAt={serviceWindow.serviceWindowExpiresAt}
            remainingServiceWindowMs={serviceWindow.remainingServiceWindowMs}
          />
        ) : (
          <WhatsappEmptyState />
        )}

        {selectedConversation?.channel === "messenger" ? (
          <MessengerContextPanel
            conversation={selectedMessengerConversation}
            onRefreshConversations={() => void loadMessengerConversations()}
            onToggleBotStatus={handleToggleMessengerBotStatus}
            className="max-[1180px]:hidden min-h-0"
          />
        ) : selectedConversation?.channel === "instagram" ? (
          <InstagramContextPanel
            conversation={selectedInstagramConversation}
            className="max-[1180px]:hidden min-h-0"
          />
        ) : selectedChannel !== "instagram" ? (
          <WhatsappContactPanel
            conversation={selectedWhatsappConversation}
            messages={whatsappMessages}
            className="max-[1180px]:hidden min-h-0 border-l border-black/10"
            onRefreshConversations={() => void loadWhatsappConversations()}
            isServiceWindowOpen={serviceWindow.isServiceWindowOpen}
            lastInboundAt={serviceWindow.lastInboundAt}
            serviceWindowExpiresAt={serviceWindow.serviceWindowExpiresAt}
            remainingServiceWindowMs={serviceWindow.remainingServiceWindowMs}
          />
        ) : null}
      </div>
    </div>
  );
}
