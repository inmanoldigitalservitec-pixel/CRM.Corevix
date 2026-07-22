import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";
import { Check, CheckCheck, MessageCircle, Search, Send, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useInternalChat } from "@/hooks/use-internal-chat";
import { useInternalChatPresence } from "@/hooks/use-internal-chat-presence";
import type {
  InternalChatChannel,
  InternalChatMessage,
  InternalChatMessageReceipt,
  InternalChatProfile,
  InternalChatUser,
} from "@/lib/internalChat";

type MiniMode = "closed" | "launcher" | "compose" | "chat";

export function TeamChatMini() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<MiniMode>("closed");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const lastAutoOpenedMessageId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    channels,
    messages,
    messageReceipts,
    users,
    activeChannel,
    unreadTotal,
    channelsLoading,
    usersLoading,
    messagesLoading,
    sendMessage,
    openDirectChat,
  } = useInternalChat({ activeChannelId: selectedChannelId, messageLimit: 40 });
  const { getProfileLastSeenAt, isProfileOnline } = useInternalChatPresence(selectedChannelId);

  const directChannels = useMemo(
    () => channels.filter((channel) => channel.type === "direct"),
    [channels],
  );

  const usersByProfileId = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const existingDirectProfileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const channel of directChannels) {
      const other = getOtherMember(channel, profile?.id || null)?.profile;
      if (other?.id) ids.add(other.id);
    }
    return ids;
  }, [directChannels, profile?.id]);

  const visibleUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (user.id === profile?.id) return false;
      if (!term) return true;
      return [user.full_name, user.email, user.department, user.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [profile?.id, userSearch, users]);

  const recentDirectChannels = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return directChannels.filter((channel) => {
      if (!term) return true;
      const other = getOtherMember(channel, profile?.id || null)?.profile;
      return [other?.full_name, other?.email, channel.latest_message?.body]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [directChannels, profile?.id, userSearch]);

  useEffect(() => {
    const incoming = directChannels.find((channel) => {
      const latest = channel.latest_message;
      return (
        channel.unread_count > 0 &&
        latest?.id &&
        latest.sender_profile_id &&
        latest.sender_profile_id !== profile?.id &&
        latest.id !== lastAutoOpenedMessageId.current
      );
    });

    if (!incoming?.latest_message?.id) return;
    lastAutoOpenedMessageId.current = incoming.latest_message.id;
    setSelectedChannelId(incoming.id);
    setMode("chat");
  }, [directChannels, profile?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedChannelId, mode]);

  async function handleOpenUser(user: InternalChatUser) {
    setOpeningUserId(user.id);
    try {
      const channelId = await openDirectChat(user.id);
      setSelectedChannelId(channelId);
      setUserSearch("");
      setMode("chat");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo abrir el chat.");
    } finally {
      setOpeningUserId(null);
    }
  }

  function handleOpenChannel(channel: InternalChatChannel) {
    setSelectedChannelId(channel.id);
    setUserSearch("");
    setMode("chat");
  }

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeChannel) return;

    setSending(true);
    try {
      await sendMessage(text);
      setDraft("");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  function closePanel() {
    setMode("closed");
    setUserSearch("");
  }

  if (mode === "closed") {
    return (
      <button
        type="button"
        title="TeamChat"
        onClick={() => setMode("launcher")}
        className="team-chat-mini-button fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white shadow-[0_18px_45px_rgba(29,98,249,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_22px_55px_rgba(29,98,249,0.42)] active:translate-y-0 active:scale-95 max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadTotal > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white ring-2 ring-white">
            {unreadTotal > 99 ? "99+" : unreadTotal}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <section className="team-chat-mini-panel fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]">
      {mode === "chat" && activeChannel ? (
        <MiniChatWindow
          key={`chat-${activeChannel.id}`}
          channel={activeChannel}
          currentProfileId={profile?.id || null}
          messages={messages}
          receipts={messageReceipts}
          loading={messagesLoading}
          draft={draft}
          sending={sending}
          isProfileOnline={isProfileOnline}
          getProfileLastSeenAt={getProfileLastSeenAt}
          usersByProfileId={usersByProfileId}
          messagesEndRef={messagesEndRef}
          onDraftChange={setDraft}
          onSubmit={handleSend}
          onBack={() => setMode("launcher")}
          onClose={closePanel}
        />
      ) : (
        <MiniLauncher
          key={mode}
          mode={mode}
          search={userSearch}
          channels={recentDirectChannels}
          users={visibleUsers}
          currentProfileId={profile?.id || null}
          existingDirectProfileIds={existingDirectProfileIds}
          loading={channelsLoading || usersLoading}
          openingUserId={openingUserId}
          unreadTotal={unreadTotal}
          isProfileOnline={isProfileOnline}
          getProfileLastSeenAt={getProfileLastSeenAt}
          onSearchChange={setUserSearch}
          onOpenChannel={handleOpenChannel}
          onOpenUser={(user) => void handleOpenUser(user)}
          onCompose={() => setMode("compose")}
          onClose={closePanel}
        />
      )}
    </section>
  );
}

function MiniLauncher({
  mode,
  search,
  channels,
  users,
  currentProfileId,
  existingDirectProfileIds,
  loading,
  openingUserId,
  unreadTotal,
  isProfileOnline,
  getProfileLastSeenAt,
  onSearchChange,
  onOpenChannel,
  onOpenUser,
  onCompose,
  onClose,
}: {
  mode: MiniMode;
  search: string;
  channels: InternalChatChannel[];
  users: InternalChatUser[];
  currentProfileId: string | null;
  existingDirectProfileIds: Set<string>;
  loading: boolean;
  openingUserId: string | null;
  unreadTotal: number;
  isProfileOnline: (profileId?: string | null) => boolean;
  getProfileLastSeenAt: (profileId?: string | null) => string | null;
  onSearchChange: (value: string) => void;
  onOpenChannel: (channel: InternalChatChannel) => void;
  onOpenUser: (user: InternalChatUser) => void;
  onCompose: () => void;
  onClose: () => void;
}) {
  const composing = mode === "compose";
  const availableUsers = composing
    ? users
    : users.filter((user) => !existingDirectProfileIds.has(user.id));
  const hasContent = composing
    ? availableUsers.length > 0
    : channels.length > 0 || availableUsers.length > 0;

  return (
    <div className="team-chat-mini-content">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-slate-950">
            {composing ? "Nuevo mensaje" : "TeamChat"}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {unreadTotal > 0 ? `${unreadTotal} sin leer` : "Mensajes internos"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!composing ? (
            <button
              type="button"
              title="Nuevo mensaje"
              onClick={onCompose}
              className="grid h-9 w-9 place-items-center rounded-full text-blue-600 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            title="Cerrar"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition duration-200 hover:rotate-6 hover:bg-slate-100 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={composing ? "Buscar usuario" : "Buscar chats o usuarios"}
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>
      <div className="max-h-[430px] min-h-[260px] overflow-y-auto px-2 py-2">
        {loading ? (
          <MiniListSkeleton />
        ) : !hasContent ? (
          <div className="grid min-h-[240px] place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-700">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-950">No hay resultados</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Busca un usuario del CRM para iniciar una conversación.
              </p>
            </div>
          </div>
        ) : (
          <>
            {!composing
              ? channels.map((channel, index) => (
                  <MiniChannelRow
                    key={channel.id}
                    index={index}
                    channel={channel}
                    currentProfileId={currentProfileId}
                    isProfileOnline={isProfileOnline}
                    getProfileLastSeenAt={getProfileLastSeenAt}
                    onClick={() => onOpenChannel(channel)}
                  />
                ))
              : null}
            {availableUsers.map((user, index) => (
              <MiniUserRow
                key={user.id}
                index={index + (composing ? 0 : channels.length)}
                user={user}
                online={isProfileOnline(user.id)}
                lastSeenAt={getProfileLastSeenAt(user.id)}
                opening={openingUserId === user.id}
                onClick={() => onOpenUser(user)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MiniChatWindow({
  channel,
  currentProfileId,
  messages,
  receipts,
  loading,
  draft,
  sending,
  isProfileOnline,
  getProfileLastSeenAt,
  usersByProfileId,
  messagesEndRef,
  onDraftChange,
  onSubmit,
  onBack,
  onClose,
}: {
  channel: InternalChatChannel;
  currentProfileId: string | null;
  messages: InternalChatMessage[];
  receipts: InternalChatMessageReceipt[];
  loading: boolean;
  draft: string;
  sending: boolean;
  isProfileOnline: (profileId?: string | null) => boolean;
  getProfileLastSeenAt: (profileId?: string | null) => string | null;
  usersByProfileId: Map<string, InternalChatUser>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onSubmit: (event?: FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const otherProfile = getOtherMember(channel, currentProfileId)?.profile || null;
  const directoryProfile = otherProfile ? usersByProfileId.get(otherProfile.id) : null;
  const online = isProfileOnline(otherProfile?.id);
  const subtitle = online
    ? "En linea"
    : formatPresenceLabel(
        directoryProfile?.last_activity_at || getProfileLastSeenAt(otherProfile?.id),
      );

  return (
    <div className="team-chat-mini-content">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition duration-200 hover:bg-slate-50 active:scale-[0.99]"
        >
          <ProfileAvatar profile={otherProfile} online={online} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-slate-950">
              {otherProfile?.full_name || otherProfile?.email || "Chat directo"}
            </span>
            <span className="block truncate text-xs font-medium text-slate-500">{subtitle}</span>
          </span>
        </button>
        <button
          type="button"
          title="Cerrar"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition duration-200 hover:rotate-6 hover:bg-slate-100 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="h-[340px] overflow-y-auto bg-white px-3 py-3">
        {loading ? (
          <MiniMessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-950">Empieza la conversación</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Escribe un mensaje para hablar con este usuario.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <MiniMessageBubble
                key={message.id}
                index={index}
                message={message}
                receipts={receipts}
                currentProfileId={currentProfileId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <input
          value={draft}
          disabled={sending}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Escribe un mensaje"
          className="h-10 min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          title="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:bg-slate-300"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function MiniChannelRow({
  channel,
  index,
  currentProfileId,
  isProfileOnline,
  getProfileLastSeenAt,
  onClick,
}: {
  channel: InternalChatChannel;
  index: number;
  currentProfileId: string | null;
  isProfileOnline: (profileId?: string | null) => boolean;
  getProfileLastSeenAt: (profileId?: string | null) => string | null;
  onClick: () => void;
}) {
  const otherProfile = getOtherMember(channel, currentProfileId)?.profile || null;
  const online = isProfileOnline(otherProfile?.id);
  return (
    <button
      type="button"
      onClick={onClick}
      className="team-chat-mini-row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 active:scale-[0.99]"
      style={{ animationDelay: `${Math.min(index, 8) * 18}ms` }}
    >
      <ProfileAvatar profile={otherProfile} online={online} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-bold text-slate-950">
            {otherProfile?.full_name || otherProfile?.email || "Chat directo"}
          </span>
          <span className="shrink-0 text-[11px] text-slate-400">
            {formatTime(channel.latest_message?.created_at)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-slate-500">
            {channel.latest_message?.body ||
              formatPresenceLabel(getProfileLastSeenAt(otherProfile?.id))}
          </span>
          {channel.unread_count > 0 ? <UnreadBadge count={channel.unread_count} /> : null}
        </span>
      </span>
    </button>
  );
}

function MiniUserRow({
  user,
  index,
  online,
  lastSeenAt,
  opening,
  onClick,
}: {
  user: InternalChatUser;
  index: number;
  online: boolean;
  lastSeenAt: string | null;
  opening: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={opening}
      onClick={onClick}
      className="team-chat-mini-row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70"
      style={{ animationDelay: `${Math.min(index, 8) * 18}ms` }}
    >
      <ProfileAvatar profile={user} online={online} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-950">{user.full_name}</span>
        <span className="block truncate text-xs text-slate-500">
          {online ? "En linea" : formatPresenceLabel(lastSeenAt) || user.department || user.email}
        </span>
      </span>
      <MessageCircle className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}

function MiniMessageBubble({
  message,
  index,
  receipts,
  currentProfileId,
}: {
  message: InternalChatMessage;
  index: number;
  receipts: InternalChatMessageReceipt[];
  currentProfileId: string | null;
}) {
  const outbound = message.sender_profile_id === currentProfileId;
  const receipt = getMessageReceiptSummary(message, receipts, currentProfileId);

  return (
    <div
      className={`team-chat-mini-message flex ${outbound ? "justify-end" : "justify-start"}`}
      style={{ animationDelay: `${Math.min(index, 8) * 12}ms` }}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-5 ${
          outbound
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-slate-100 text-slate-950"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            outbound ? "text-blue-100" : "text-slate-500"
          }`}
        >
          <span>{formatTime(message.created_at)}</span>
          {outbound && receipt ? (
            <span className="inline-flex items-center" aria-hidden="true">
              {receipt.status === "sent" ? (
                <Check className={`h-3 w-3 ${receipt.iconClassName}`} />
              ) : (
                <CheckCheck className={`h-3 w-3 ${receipt.iconClassName}`} />
              )}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProfileAvatar({
  profile,
  online,
}: {
  profile?: InternalChatProfile | null;
  online?: boolean;
}) {
  const label = profile?.full_name || profile?.email || "Usuario";
  return (
    <span className="relative h-10 w-10 shrink-0">
      <span className="grid h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-blue-50 text-xs font-black text-blue-700">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center">{getInitials(label)}</span>
        )}
      </span>
      {online ? (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
      ) : null}
    </span>
  );
}

function MiniListSkeleton() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniMessagesSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-12 w-[68%] rounded-2xl bg-slate-100" />
      <div className="ml-auto h-12 w-[60%] rounded-2xl bg-blue-50" />
      <div className="h-12 w-[72%] rounded-2xl bg-slate-100" />
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-blue-600 px-1.5 text-[11px] font-black text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function getOtherMember(channel: InternalChatChannel, currentProfileId: string | null) {
  return (
    channel.members.find((member) => member.profile_id !== currentProfileId && member.profile) ||
    channel.members.find((member) => member.profile)
  );
}

function getMessageReceiptSummary(
  message: InternalChatMessage,
  receipts: InternalChatMessageReceipt[],
  currentProfileId: string | null,
) {
  if (message.sender_profile_id !== currentProfileId) return null;
  if (message.local_status === "sending") {
    return { status: "sent", iconClassName: "text-blue-100" };
  }
  if (message.local_status === "failed") {
    return { status: "sent", iconClassName: "text-red-200" };
  }

  const messageReceipts = receipts.filter((receipt) => receipt.message_id === message.id);
  if (messageReceipts.some((receipt) => receipt.read_at)) {
    return { status: "read", iconClassName: "text-sky-200" };
  }
  if (messageReceipts.some((receipt) => receipt.delivered_at)) {
    return { status: "delivered", iconClassName: "text-blue-100" };
  }
  return { status: "sent", iconClassName: "text-blue-100" };
}

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
}

function formatPresenceLabel(value?: string | null) {
  if (!value) return "Sin conexion reciente";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime()) || diffMs < 0) return "Sin conexion reciente";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Activo ahora";
  if (diffMs < hour) return `Activo hace ${Math.max(1, Math.floor(diffMs / minute))} min`;
  if (diffMs < day) return `Activo hace ${Math.max(1, Math.floor(diffMs / hour))} h`;
  return `Activo hace ${Math.max(1, Math.floor(diffMs / day))} d`;
}
