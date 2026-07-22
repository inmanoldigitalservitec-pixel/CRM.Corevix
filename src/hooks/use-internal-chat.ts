import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import {
  getOrCreateDirectInternalChat,
  listInternalChatMessageReceipts,
  listInternalChatChannels,
  listInternalChatMessages,
  listInternalChatUsers,
  markInternalChatMessagesDelivered,
  markInternalChatMessagesRead,
  markInternalChatRead,
  sendInternalChatMessage,
  type InternalChatChannel,
  type InternalChatMessage,
  type InternalChatMessageReceipt,
  type InternalChatUser,
} from "@/lib/internalChat";

type UseInternalChatOptions = {
  enabled?: boolean;
  activeChannelId?: string | null;
  messageLimit?: number;
};

export function useInternalChat(options: UseInternalChatOptions = {}) {
  const { profile } = useAuth();
  const enabled = options.enabled ?? true;
  const activeChannelId = options.activeChannelId || null;
  const messageLimit = options.messageLimit ?? 80;

  const [channels, setChannels] = useState<InternalChatChannel[]>([]);
  const [messages, setMessages] = useState<InternalChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<InternalChatMessage[]>([]);
  const [messageReceipts, setMessageReceipts] = useState<InternalChatMessageReceipt[]>([]);
  const [users, setUsers] = useState<InternalChatUser[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = profile?.company_id || null;
  const profileId = profile?.id || null;
  const canLoad = enabled && Boolean(companyId && profileId);

  const unreadTotal = useMemo(
    () => channels.reduce((sum, channel) => sum + Number(channel.unread_count || 0), 0),
    [channels],
  );

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) || null,
    [activeChannelId, channels],
  );

  const visibleMessages = useMemo(() => {
    const localActiveMessages = localMessages.filter(
      (message) => message.channel_id === activeChannelId,
    );
    return [...messages, ...localActiveMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [activeChannelId, localMessages, messages]);

  const loadChannels = useCallback(async () => {
    if (!canLoad) {
      setChannels([]);
      setChannelsLoading(false);
      return;
    }

    setChannelsLoading(true);
    setError(null);
    try {
      setChannels(await listInternalChatChannels());
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los chats internos.");
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  }, [canLoad]);

  const loadMessageReceipts = useCallback(
    async (channelId = activeChannelId) => {
      if (!canLoad || !channelId) {
        setMessageReceipts([]);
        return;
      }

      try {
        setMessageReceipts(await listInternalChatMessageReceipts(channelId));
      } catch {
        setMessageReceipts([]);
      }
    },
    [activeChannelId, canLoad],
  );

  const loadMessages = useCallback(async () => {
    if (!canLoad || !activeChannelId) {
      setMessages([]);
      setLocalMessages([]);
      setMessageReceipts([]);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);
    setError(null);
    try {
      const rows = await listInternalChatMessages(activeChannelId, messageLimit);
      setMessages(rows);
      const lastMessage = rows[rows.length - 1];
      const incomingMessageIds = rows
        .filter((message) => message.sender_profile_id !== profileId)
        .map((message) => message.id);
      if (incomingMessageIds.length) {
        await markInternalChatMessagesDelivered(activeChannelId, incomingMessageIds).catch(
          () => [],
        );
        await markInternalChatMessagesRead(activeChannelId, incomingMessageIds).catch(() => []);
      }
      await loadMessageReceipts(activeChannelId);
      if (lastMessage) {
        await markInternalChatRead(activeChannelId, lastMessage.id);
        void loadChannels();
      }
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los mensajes.");
      setMessages([]);
      setMessageReceipts([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [activeChannelId, canLoad, loadChannels, loadMessageReceipts, messageLimit, profileId]);

  const loadUsers = useCallback(async () => {
    if (!canLoad) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    setUsersLoading(true);
    setError(null);
    try {
      setUsers(await listInternalChatUsers());
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los usuarios del chat.");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [canLoad]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useRealtimeTable({
    table: "internal_chat_channels",
    companyId,
    enabled: canLoad,
    onChange: () => {
      void loadChannels();
    },
  });

  useRealtimeTable({
    table: "internal_chat_members",
    companyId,
    enabled: canLoad,
    onChange: () => {
      void loadChannels();
    },
  });

  useRealtimeTable({
    table: "internal_chat_reads",
    companyId,
    enabled: canLoad,
    onChange: () => {
      void loadChannels();
    },
  });

  useRealtimeTable({
    table: "internal_chat_messages",
    companyId,
    enabled: canLoad,
    onChange: (payload) => {
      const record = payload.new as Partial<InternalChatMessage> | null;
      if (
        record?.id &&
        record.channel_id &&
        record.sender_profile_id &&
        record.sender_profile_id !== profileId
      ) {
        void markInternalChatMessagesDelivered(record.channel_id, [record.id]).then(() => {
          void loadChannels();
        });
      } else {
        void loadChannels();
      }
    },
  });

  useRealtimeTable({
    table: "internal_chat_messages",
    filter: activeChannelId ? `channel_id=eq.${activeChannelId}` : null,
    enabled: canLoad && Boolean(activeChannelId),
    onChange: () => {
      void loadMessages();
      void loadChannels();
    },
  });

  useRealtimeTable({
    table: "internal_chat_message_receipts",
    filter: activeChannelId ? `channel_id=eq.${activeChannelId}` : null,
    enabled: canLoad && Boolean(activeChannelId),
    onChange: () => {
      void loadMessageReceipts();
    },
  });

  const sendMessage = useCallback(
    async (
      body: string,
      input?: { replyToId?: string | null; metadata?: Record<string, unknown> },
    ) => {
      if (!activeChannelId) throw new Error("Selecciona un chat antes de enviar.");
      if (!companyId || !profileId) throw new Error("No hay contexto de compañía.");

      const cleanBody = body.trim();
      const localId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `local-${crypto.randomUUID()}`
          : `local-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticMessage: InternalChatMessage = {
        id: localId,
        company_id: companyId,
        channel_id: activeChannelId,
        sender_profile_id: profileId,
        body: cleanBody,
        message_type: "text",
        metadata: input?.metadata || {},
        reply_to_id: input?.replyToId || null,
        edited_at: null,
        deleted_at: null,
        created_at: now,
        updated_at: now,
        sender: {
          id: profileId,
          user_id: profile?.user_id || "",
          full_name: profile?.full_name || profile?.email || "Usuario",
          avatar_url: profile?.avatar_url || null,
          email: profile?.email || null,
          department: profile?.department || null,
          is_active: profile?.is_active,
        },
        local_status: "sending",
        local_error: null,
      };

      setLocalMessages((current) => [...current, optimisticMessage]);

      try {
        const message = await sendInternalChatMessage(activeChannelId, cleanBody, input);
        setLocalMessages((current) => current.filter((item) => item.id !== localId));
        await loadMessages();
        await loadChannels();
        await loadMessageReceipts();
        return message;
      } catch (e: any) {
        setLocalMessages((current) =>
          current.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  local_status: "failed",
                  local_error: e?.message || "No se pudo enviar el mensaje.",
                }
              : item,
          ),
        );
        throw e;
      }
    },
    [
      activeChannelId,
      companyId,
      loadChannels,
      loadMessageReceipts,
      loadMessages,
      profile?.avatar_url,
      profile?.department,
      profile?.email,
      profile?.full_name,
      profile?.is_active,
      profile?.user_id,
      profileId,
    ],
  );

  const retryMessage = useCallback(
    async (localMessageId: string) => {
      const failedMessage = localMessages.find(
        (message) => message.id === localMessageId && message.local_status === "failed",
      );
      if (!failedMessage) return null;

      setLocalMessages((current) => current.filter((message) => message.id !== localMessageId));
      return sendMessage(failedMessage.body, {
        replyToId: failedMessage.reply_to_id,
        metadata: failedMessage.metadata,
      });
    },
    [localMessages, sendMessage],
  );

  const dismissLocalMessage = useCallback((localMessageId: string) => {
    setLocalMessages((current) => current.filter((message) => message.id !== localMessageId));
  }, []);

  const markRead = useCallback(
    async (channelId = activeChannelId) => {
      if (!channelId) return null;
      const lastMessage =
        channelId === activeChannelId && messages.length ? messages[messages.length - 1] : null;
      const read = await markInternalChatRead(channelId, lastMessage?.id || null);
      await loadChannels();
      return read;
    },
    [activeChannelId, loadChannels, messages],
  );

  const openDirectChat = useCallback(
    async (otherProfileId: string) => {
      const channelId = await getOrCreateDirectInternalChat(otherProfileId);
      await loadChannels();
      return channelId;
    },
    [loadChannels],
  );

  return {
    channels,
    messages: visibleMessages,
    messageReceipts,
    users,
    activeChannel,
    unreadTotal,
    channelsLoading,
    messagesLoading,
    usersLoading,
    error,
    sendMessage,
    retryMessage,
    dismissLocalMessage,
    markRead,
    openDirectChat,
  };
}
