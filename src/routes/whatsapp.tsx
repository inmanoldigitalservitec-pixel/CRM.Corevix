import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { CrmWhatsappConversationListRow, CrmWhatsappMessageRow } from "@/lib/whatsapp/view-types";
import { getServiceWindowState } from "@/lib/whatsapp/service-window";
import { WhatsappReadonlyList } from "@/components/whatsapp/whatsapp-readonly-list";
import { WhatsappReadonlyThread } from "@/components/whatsapp/whatsapp-readonly-thread";
import { WhatsappContactPanel } from "@/components/whatsapp/whatsapp-contact-panel";
import { WhatsappEmptyState } from "@/components/whatsapp/whatsapp-empty-state";
import { sendWhatsappMessage } from "@/lib/whatsapp/whatsapp-bot-api";

export const Route = createFileRoute("/whatsapp")({
  component: WhatsAppPage,
  head: () => ({ meta: [{ title: "WhatsApp Inbox — Corevix CRM" }] }),
});

function WhatsAppPage() {
  const { profile, user, roles } = useAuth();

  const [conversations, setConversations] = useState<CrmWhatsappConversationListRow[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const desiredConversationId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("conversationId");
      return v && v.trim().length ? v.trim() : null;
    } catch {
      return null;
    }
  }, []);

  const [messages, setMessages] = useState<CrmWhatsappMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [serviceWindowNow, setServiceWindowNow] = useState(() => Date.now());
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.conversation_id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setServiceWindowNow(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const serviceWindow = useMemo(() => getServiceWindowState(messages, serviceWindowNow), [messages, serviceWindowNow]);

  useEffect(() => {
    setSendError(null);
  }, [selectedConversationId]);

  useEffect(() => {
    if (serviceWindow.isServiceWindowOpen) {
      setSendError(null);
    }
  }, [serviceWindow.isServiceWindowOpen]);

  async function loadConversations() {
    if (!profile?.company_id) {
      setConversations([]);
      setConversationsLoading(false);
      setConversationsError(null);
      return;
    }

    setConversationsLoading(true);
    setConversationsError(null);
    const { data, error } = await supabase
      .from("crm_whatsapp_conversation_list")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("conversation_updated_at", { ascending: false })
      .limit(100);

    if (error) {
      setConversationsError(error.message);
      setConversations([]);
    } else {
      setConversations((data ?? []) as unknown as CrmWhatsappConversationListRow[]);
    }
    setConversationsLoading(false);
  }

  async function loadMessages(conversationId: string) {
    setMessagesLoading(true);
    setMessagesError(null);
    const { data, error } = await supabase
      .from("crm_whatsapp_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessagesError(error.message);
      setMessages([]);
    } else {
      setMessages((data ?? []) as unknown as CrmWhatsappMessageRow[]);
    }
    setMessagesLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    loadConversations().catch((e: any) => {
      if (cancelled) return;
      setConversationsError(e?.message ?? "Error cargando conversaciones");
      setConversations([]);
      setConversationsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  useEffect(() => {
    if (!desiredConversationId) return;
    if (selectedConversationId) return;
    if (conversationsLoading) return;
    if (!conversations.length) return;

    const found = conversations.find((c) => c.conversation_id === desiredConversationId);
    if (found) setSelectedConversationId(found.conversation_id);
  }, [conversations, conversationsLoading, desiredConversationId, selectedConversationId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedConversationId) {
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError(null);
      return;
    }

    loadMessages(selectedConversationId).catch((e: any) => {
      if (cancelled) return;
      setMessagesError(e?.message ?? "Error cargando mensajes");
      setMessages([]);
      setMessagesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  useRealtimeTable({
    table: "whatsapp_conversations",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadConversations();
    },
  });

  useRealtimeTable({
    table: "whatsapp_conversation_messages",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: (payload) => {
      void loadConversations();
      const changedConversationId = String(
        payload.new?.conversation_id || payload.old?.conversation_id || "",
      ).trim();
      if (selectedConversationId && (!changedConversationId || changedConversationId === selectedConversationId)) {
        void loadMessages(selectedConversationId);
      }
    },
  });

  async function handleSendMessage(content: string) {
    if (!selectedConversation) return;
    if (!serviceWindow.isServiceWindowOpen) {
      setSendError("La ventana de WhatsApp está cerrada. Usa una plantilla aprobada para continuar.");
      return;
    }

    setSendingMessage(true);
    setSendError(null);
    try {
      await sendWhatsappMessage(selectedConversation.conversation_id, content);
      await loadMessages(selectedConversation.conversation_id);
      await loadConversations();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
      setSendError(msg);
      throw error;
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] min-h-0 bg-[#f0f2f5] overflow-hidden">
      <div
        data-demo="whatsapp-main"
        className="grid h-full min-h-0 w-full min-w-0 overflow-hidden grid-cols-[350px_minmax(0,1fr)_380px] max-[1500px]:grid-cols-[340px_minmax(0,1fr)_360px] max-[1280px]:grid-cols-[320px_minmax(0,1fr)_330px] max-[1180px]:grid-cols-[300px_minmax(0,1fr)] max-[820px]:grid-cols-[82px_minmax(0,1fr)]"
      >
      <WhatsappReadonlyList
        className="min-h-0"
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversationId={setSelectedConversationId}
        loading={conversationsLoading}
        error={conversationsError}
        currentUserId={user?.id || null}
        canSeeUnassigned={roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false}
      />

      {selectedConversationId && selectedConversation ? (
        <WhatsappReadonlyThread
          className="min-h-0"
          title={
            selectedConversation.display_name ||
            selectedConversation.contact_name ||
            selectedConversation.whatsapp_profile_name ||
            selectedConversation.phone ||
            "Conversación"
          }
          subtitle={selectedConversation.phone || undefined}
          status={selectedConversation.conversation_status}
          botEnabled={selectedConversation.bot_enabled}
          messages={messages}
          loading={messagesLoading}
          error={messagesError}
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

      <WhatsappContactPanel
        conversation={selectedConversation}
        messages={messages}
        className="max-[1180px]:hidden min-h-0 border-l border-black/10"
        onRefreshConversations={() => void loadConversations()}
        isServiceWindowOpen={serviceWindow.isServiceWindowOpen}
        lastInboundAt={serviceWindow.lastInboundAt}
        serviceWindowExpiresAt={serviceWindow.serviceWindowExpiresAt}
        remainingServiceWindowMs={serviceWindow.remainingServiceWindowMs}
      />
      </div>
    </div>
  );
}
