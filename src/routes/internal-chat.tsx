import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Copy,
  Download,
  FileText,
  Hash,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
  X,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useInternalChat } from "@/hooks/use-internal-chat";
import { useInternalChatPresence } from "@/hooks/use-internal-chat-presence";
import type {
  InternalChatAttachment,
  InternalChatChannel,
  InternalChatMessage,
  InternalChatMessageReceipt,
  InternalChatProfile,
  InternalChatUser,
} from "@/lib/internalChat";
import { createInternalChatAttachmentUrl, uploadInternalChatAttachment } from "@/lib/internalChat";

export const Route = createFileRoute("/internal-chat")({
  component: InternalChatPage,
  head: () => ({ meta: [{ title: "TeamChat — Corevix CRM" }] }),
});

function InternalChatPage() {
  const { profile } = useAuth();
  const isMobile = useMediaQuery("(max-width: 760px)");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingAttachmentFile, setPendingAttachmentFile] = useState<File | null>(null);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const {
    channels,
    messages,
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
  } = useInternalChat({ activeChannelId: selectedChannelId });
  const { getProfileLastSeenAt, isProfileOnline } = useInternalChatPresence(selectedChannelId);

  const generalChannel = useMemo(
    () => channels.find((channel) => channel.type === "general") || null,
    [channels],
  );

  const orderedChannels = useMemo(() => {
    const general = channels.filter((channel) => channel.type === "general");
    const rest = channels.filter((channel) => channel.type !== "general");
    return [...general, ...rest];
  }, [channels]);

  const visibleChannels = useMemo(() => {
    const term = conversationSearch.trim().toLowerCase();
    if (!term) return orderedChannels;
    return orderedChannels.filter((channel) => {
      const title = getChannelTitle(channel, profile?.id || null);
      const subtitle = getChannelSubtitle(channel, profile?.id || null);
      const latest = channel.latest_message?.body || "";
      return [title, subtitle, latest].join(" ").toLowerCase().includes(term);
    });
  }, [conversationSearch, orderedChannels, profile?.id]);

  const directMemberProfileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const channel of channels) {
      if (channel.type !== "direct") continue;
      for (const member of channel.members) {
        if (member.profile_id !== profile?.id) ids.add(member.profile_id);
      }
    }
    return ids;
  }, [channels, profile?.id]);

  const visibleUsers = useMemo(() => {
    const term = conversationSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (user.id === profile?.id) return false;
      if (directMemberProfileIds.has(user.id)) return false;
      if (!term) return true;
      return [user.full_name, user.email, user.department, user.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [conversationSearch, directMemberProfileIds, profile?.id, users]);

  const visibleMessages = useMemo(() => {
    const term = messageSearch.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((message) =>
      [message.body, ...getMessageAttachments(message).map((attachment) => attachment.name)]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [messageSearch, messages]);

  const usersByProfileId = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const hasSidebarResults = visibleChannels.length > 0 || visibleUsers.length > 0;

  useEffect(() => {
    if (isMobile) return;
    if (selectedChannelId && channels.some((channel) => channel.id === selectedChannelId)) return;
    const nextChannel = generalChannel || orderedChannels[0] || null;
    setSelectedChannelId(nextChannel?.id || null);
  }, [channels, generalChannel, isMobile, orderedChannels, selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedChannelId]);

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const text = messageDraft.trim();
    if (!text || sending || !activeChannel) return;

    setSending(true);
    try {
      await sendMessage(text);
      setMessageDraft("");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  function insertEmoji(emoji: EmojiClickData) {
    setMessageDraft((draft) => `${draft}${emoji.emoji}`);
    setEmojiPickerOpen(false);
  }

  function handleAttachFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !activeChannel) return;
    setPendingAttachmentFile(file);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  }

  async function confirmAttachFile(expiresInDays: number) {
    const file = pendingAttachmentFile;
    if (!file || !activeChannel) return;

    setUploadingAttachment(true);
    try {
      const attachment = await uploadInternalChatAttachment(activeChannel.id, file, expiresInDays);
      await sendMessage(`Archivo: ${attachment.name}`, {
        metadata: { attachments: [attachment] },
      });
      setPendingAttachmentFile(null);
      toast.success(`Archivo adjuntado. Expira en ${expiresInDays} dias.`);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo adjuntar el archivo.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function openAttachment(attachment: InternalChatAttachment) {
    try {
      const url = await createInternalChatAttachmentUrl(attachment.path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo abrir el archivo.");
    }
  }

  async function copyChatName() {
    if (!activeChannel) return;
    const name = getChannelTitle(activeChannel, profile?.id || null);
    try {
      await navigator.clipboard.writeText(name);
      toast.success("Nombre del chat copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  async function handleOpenDirect(user: InternalChatUser) {
    setOpeningUserId(user.id);
    try {
      const channelId = await openDirectChat(user.id);
      setSelectedChannelId(channelId);
      setConversationSearch("");
      toast.success(`Chat abierto con ${user.full_name}.`);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo abrir el chat directo.");
    } finally {
      setOpeningUserId(null);
    }
  }

  function openChannel(channelId: string) {
    setSelectedChannelId(channelId);
    setMessageSearch("");
    setMessageSearchOpen(false);
    setMembersOpen(false);
  }

  function closeMobileChat() {
    setSelectedChannelId(null);
    setMessageSearch("");
    setMessageSearchOpen(false);
    setMembersOpen(false);
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden bg-white text-slate-950">
      <div className="grid h-full min-h-0 grid-cols-[390px_minmax(0,1fr)] max-[1100px]:grid-cols-[330px_minmax(0,1fr)] max-[760px]:grid-cols-[1fr]">
        <section
          className={`min-h-0 flex-col border-r border-slate-200 bg-white ${
            selectedChannelId ? "hidden max-[760px]:hidden" : "flex"
          } min-[761px]:flex`}
        >
          <TeamChatSidebar
            conversationSearch={conversationSearch}
            unreadTotal={unreadTotal}
            channelsLoading={channelsLoading}
            usersLoading={usersLoading}
            hasSidebarResults={hasSidebarResults}
            visibleChannels={visibleChannels}
            visibleUsers={visibleUsers}
            selectedChannelId={selectedChannelId}
            currentProfileId={profile?.id || null}
            openingUserId={openingUserId}
            isProfileOnline={isProfileOnline}
            getProfileLastSeenAt={getProfileLastSeenAt}
            usersByProfileId={usersByProfileId}
            onSearchChange={setConversationSearch}
            onOpenChannel={openChannel}
            onOpenDirect={(user) => void handleOpenDirect(user)}
          />
        </section>

        <main
          className={`relative min-h-0 flex-col bg-white ${
            selectedChannelId ? "flex" : "hidden"
          } min-[761px]:flex`}
        >
          {activeChannel ? (
            <>
              <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    title="Volver"
                    onClick={closeMobileChat}
                    className="-ml-2 hidden h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 max-[760px]:grid"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <ChannelAvatar
                    channel={activeChannel}
                    currentProfileId={profile?.id || null}
                    isProfileOnline={isProfileOnline}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-950">
                      {getChannelTitle(activeChannel, profile?.id || null)}
                    </h2>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {getChannelPresenceSubtitle(
                        activeChannel,
                        profile?.id || null,
                        isProfileOnline,
                        getProfileLastSeenAt,
                        usersByProfileId,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <HeaderIcon
                    icon={<Search className="h-5 w-5" />}
                    label="Buscar mensajes"
                    active={messageSearchOpen}
                    onClick={() => setMessageSearchOpen((open) => !open)}
                  />
                  {!isMobile ? (
                    <HeaderIcon
                      icon={<Users className="h-5 w-5" />}
                      label="Miembros"
                      active={membersOpen}
                      onClick={() => setMembersOpen((open) => !open)}
                    />
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        title="Opciones"
                        className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl">
                      <DropdownMenuItem onSelect={() => setMessageSearchOpen(true)}>
                        <Search className="h-4 w-4" />
                        Buscar mensajes
                      </DropdownMenuItem>
                      {!isMobile ? (
                        <DropdownMenuItem onSelect={() => setMembersOpen(true)}>
                          <Users className="h-4 w-4" />
                          Ver miembros
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onSelect={() => void copyChatName()}>
                        <Copy className="h-4 w-4" />
                        Copiar nombre
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => {
                          void markRead();
                          toast.success("Chat marcado como leido.");
                        }}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Marcar como leido
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          setMessageSearch("");
                          toast.success("Busqueda limpiada.");
                        }}
                      >
                        Limpiar busqueda
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {messageSearchOpen ? (
                <div className="border-b border-slate-100 bg-white px-5 py-3">
                  <div className="mx-auto flex max-w-[920px] items-center gap-3">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={messageSearch}
                        onChange={(event) => setMessageSearch(event.target.value)}
                        placeholder="Buscar dentro de este chat"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">
                      {messageSearch.trim()
                        ? `${visibleMessages.length} resultado${visibleMessages.length === 1 ? "" : "s"}`
                        : "Sin filtro"}
                    </span>
                    <button
                      type="button"
                      title="Cerrar busqueda"
                      onClick={() => {
                        setMessageSearchOpen(false);
                        setMessageSearch("");
                      }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 pb-8 pt-6 max-[760px]:px-4">
                <div className="mx-auto max-w-[920px] space-y-2 pb-4">
                  <DatePill label="Hoy" />
                  {messagesLoading ? (
                    <MessageSkeleton />
                  ) : messages.length === 0 ? (
                    <div className="mx-auto mt-20 max-w-md px-6 text-center">
                      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-blue-700">
                        <MessageCircle className="h-7 w-7" />
                      </div>
                      <p className="text-xl font-bold text-slate-950">No hay mensajes todavía</p>
                      <p className="mt-2 text-base leading-7 text-slate-500">
                        Escribe el primer mensaje para iniciar la conversación.
                      </p>
                    </div>
                  ) : visibleMessages.length === 0 ? (
                    <div className="mx-auto mt-20 max-w-md px-6 text-center">
                      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-500">
                        <Search className="h-7 w-7" />
                      </div>
                      <p className="text-xl font-bold text-slate-950">Sin resultados</p>
                      <p className="mt-2 text-base leading-7 text-slate-500">
                        No hay mensajes que coincidan con tu busqueda.
                      </p>
                    </div>
                  ) : (
                    visibleMessages.map((message) => (
                      <InternalMessageBubble
                        key={message.id}
                        message={message}
                        receipts={messageReceipts}
                        currentProfileId={profile?.id || null}
                        onOpenAttachment={(attachment) => void openAttachment(attachment)}
                        onRetry={() => void retryMessage(message.id)}
                        onDismiss={() => dismissLocalMessage(message.id)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <footer className="shrink-0 bg-white px-6 pb-5 pt-2 max-[760px]:px-4 max-[760px]:pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
                {error ? (
                  <div className="mx-auto mb-2 max-w-[920px] rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                <form
                  onSubmit={handleSend}
                  className="mx-auto flex min-h-[68px] max-w-[920px] items-center gap-2 rounded-[28px] border border-slate-200 bg-white px-3 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                >
                  <button
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"
                    type="button"
                    disabled={uploadingAttachment}
                    onClick={() => attachmentInputRef.current?.click()}
                    title="Adjuntar archivo"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="relative">
                    <button
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"
                      type="button"
                      title="Emoji"
                      onClick={() => setEmojiPickerOpen((open) => !open)}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {emojiPickerOpen ? (
                      <div
                        className="absolute bottom-14 left-0 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <EmojiPicker
                          height={360}
                          width={320}
                          previewConfig={{ showPreview: false }}
                          onEmojiClick={insertEmoji}
                        />
                      </div>
                    ) : null}
                  </div>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    onChange={(event) => void handleAttachFile(event.target.files)}
                  />
                  <input
                    className="h-12 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder="Escribe un mensaje"
                    value={messageDraft}
                    disabled={sending}
                    onChange={(event) => setMessageDraft(event.target.value)}
                  />
                  <button
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:bg-slate-300 disabled:opacity-100"
                    type="submit"
                    disabled={sending || uploadingAttachment || !messageDraft.trim()}
                    title="Enviar"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </footer>
              {membersOpen ? (
                <MembersPanel
                  channel={activeChannel}
                  currentProfileId={profile?.id || null}
                  isProfileOnline={isProfileOnline}
                  getProfileLastSeenAt={getProfileLastSeenAt}
                  usersByProfileId={usersByProfileId}
                  onClose={() => setMembersOpen(false)}
                />
              ) : null}
              <AttachmentExpiryDialog
                file={pendingAttachmentFile}
                uploading={uploadingAttachment}
                onClose={() => {
                  if (!uploadingAttachment) setPendingAttachmentFile(null);
                }}
                onConfirm={(days) => void confirmAttachFile(days)}
              />
            </>
          ) : (
            <div className="grid h-full place-items-center p-10 text-center">
              <div className="max-w-md">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-950">TeamChat</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Cuando el canal general esté disponible, aparecerá aquí para que el equipo pueda
                  comunicarse dentro del CRM.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function TeamChatSidebar({
  conversationSearch,
  unreadTotal,
  channelsLoading,
  usersLoading,
  hasSidebarResults,
  visibleChannels,
  visibleUsers,
  selectedChannelId,
  currentProfileId,
  openingUserId,
  isProfileOnline,
  getProfileLastSeenAt,
  usersByProfileId,
  onSearchChange,
  onOpenChannel,
  onOpenDirect,
}: {
  conversationSearch: string;
  unreadTotal: number;
  channelsLoading: boolean;
  usersLoading: boolean;
  hasSidebarResults: boolean;
  visibleChannels: InternalChatChannel[];
  visibleUsers: InternalChatUser[];
  selectedChannelId: string | null;
  currentProfileId: string | null;
  openingUserId: string | null;
  isProfileOnline: (profileId?: string | null) => boolean;
  getProfileLastSeenAt: (profileId?: string | null) => string | null;
  usersByProfileId: Map<string, InternalChatUser>;
  onSearchChange: (value: string) => void;
  onOpenChannel: (channelId: string) => void;
  onOpenDirect: (user: InternalChatUser) => void;
}) {
  return (
    <>
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-slate-950">TeamChat</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {unreadTotal > 0 ? `${unreadTotal} mensajes sin leer` : "Equipo Corevix CRM"}
            </p>
          </div>
          <button
            type="button"
            title="Opciones"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={conversationSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar chats o usuarios"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 max-[760px]:pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        {channelsLoading || usersLoading ? (
          <ConversationSkeleton />
        ) : !hasSidebarResults ? (
          <EmptyLine
            icon={<MessageCircle className="h-5 w-5" />}
            text="No hay chats ni usuarios."
          />
        ) : (
          <>
            {visibleChannels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                currentProfileId={currentProfileId}
                isProfileOnline={isProfileOnline}
                getProfileLastSeenAt={getProfileLastSeenAt}
                usersByProfileId={usersByProfileId}
                active={selectedChannelId === channel.id}
                onClick={() => onOpenChannel(channel.id)}
              />
            ))}
            {visibleUsers.map((user) => (
              <TeamUserRow
                key={user.id}
                user={user}
                online={isProfileOnline(user.id)}
                lastSeenAt={getProfileLastSeenAt(user.id)}
                opening={openingUserId === user.id}
                onOpen={() => onOpenDirect(user)}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function TeamUserRow({
  user,
  online,
  lastSeenAt,
  opening,
  onOpen,
}: {
  user: InternalChatUser;
  online: boolean;
  lastSeenAt: string | null;
  opening: boolean;
  onOpen: () => void;
}) {
  const fallback = user.department || user.email || "Iniciar chat directo";

  return (
    <button
      type="button"
      disabled={opening}
      onClick={onOpen}
      className="group flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <ProfileAvatar profile={user} online={online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-950">{user.full_name}</p>
        <p className="truncate text-xs text-slate-500">
          {getPresenceLabel(online, lastSeenAt, fallback)}
        </p>
      </div>
      <MessageCircle className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
    </button>
  );
}

function ChannelRow({
  channel,
  currentProfileId,
  isProfileOnline,
  getProfileLastSeenAt,
  usersByProfileId,
  active,
  onClick,
}: {
  channel: InternalChatChannel;
  currentProfileId: string | null;
  isProfileOnline: (profileId?: string | null) => boolean;
  getProfileLastSeenAt: (profileId?: string | null) => string | null;
  usersByProfileId: Map<string, InternalChatUser>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left transition ${
        active ? "bg-blue-50/70" : "bg-transparent hover:bg-slate-50"
      }`}
    >
      <ChannelAvatar
        channel={channel}
        currentProfileId={currentProfileId}
        isProfileOnline={isProfileOnline}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[15px] font-semibold text-slate-950">
            {getChannelTitle(channel, currentProfileId)}
          </p>
          <span className="shrink-0 text-xs text-slate-400">
            {formatTime(channel.latest_message?.created_at)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm text-slate-500">
            {channel.latest_message?.body ||
              getChannelPresenceSubtitle(
                channel,
                currentProfileId,
                isProfileOnline,
                getProfileLastSeenAt,
                usersByProfileId,
              )}
          </p>
          {channel.unread_count > 0 ? <UnreadBadge count={channel.unread_count} /> : null}
        </div>
      </div>
    </button>
  );
}

function InternalMessageBubble({
  message,
  receipts,
  currentProfileId,
  onOpenAttachment,
  onRetry,
  onDismiss,
}: {
  message: InternalChatMessage;
  receipts: InternalChatMessageReceipt[];
  currentProfileId: string | null;
  onOpenAttachment: (attachment: InternalChatAttachment) => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const outbound = message.sender_profile_id === currentProfileId;
  const senderName = message.sender?.full_name || "Usuario";
  const receiptSummary = getMessageReceiptSummary(message, receipts, currentProfileId);
  const failed = message.local_status === "failed";
  const attachments = getMessageAttachments(message);
  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[68%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-5 max-[760px]:max-w-[84%] ${
          outbound
            ? "rounded-br-md border border-blue-100 bg-blue-50 text-slate-950"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-950"
        }`}
      >
        {!outbound ? <p className="mb-1 text-xs font-bold text-blue-700">{senderName}</p> : null}
        <div>{message.body}</div>
        {attachments.length ? (
          <div className="mt-3 space-y-2">
            {attachments.map((attachment) => (
              <button
                key={attachment.path}
                type="button"
                disabled={isAttachmentExpired(attachment)}
                onClick={() => onOpenAttachment(attachment)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-950">
                    {attachment.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {formatFileSize(attachment.size)} · {getAttachmentExpiryLabel(attachment)}
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        ) : null}
        {failed ? (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold">
            <button type="button" onClick={onRetry} className="text-blue-700 hover:underline">
              Reintentar
            </button>
            <button type="button" onClick={onDismiss} className="text-slate-500 hover:underline">
              Quitar
            </button>
          </div>
        ) : null}
        <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
          <span>{formatTime(message.created_at)}</span>
          {outbound && receiptSummary ? (
            <span className="inline-flex items-center" aria-hidden="true">
              {receiptSummary.status === "sent" ? (
                <Check className={`h-3.5 w-3.5 shrink-0 ${receiptSummary.iconClassName}`} />
              ) : (
                <CheckCheck className={`h-3.5 w-3.5 shrink-0 ${receiptSummary.iconClassName}`} />
              )}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MembersPanel({
  channel,
  currentProfileId,
  isProfileOnline,
  getProfileLastSeenAt,
  usersByProfileId,
  onClose,
}: {
  channel: InternalChatChannel;
  currentProfileId: string | null;
  isProfileOnline: (profileId?: string | null) => boolean;
  getProfileLastSeenAt: (profileId?: string | null) => string | null;
  usersByProfileId: Map<string, InternalChatUser>;
  onClose: () => void;
}) {
  const members = channel.members.filter((member) => member.profile);
  return (
    <aside className="absolute right-0 top-[3.5rem] z-40 flex h-[calc(100vh-3.5rem)] w-[340px] max-w-[92vw] flex-col border-l border-slate-200 bg-white shadow-2xl">
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-5">
        <div>
          <h3 className="text-base font-bold text-slate-950">Miembros</h3>
          <p className="text-xs font-medium text-slate-500">
            {members.length} integrante{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          title="Cerrar"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {members.map((member) => {
          const memberProfile = member.profile!;
          const directoryProfile = usersByProfileId.get(memberProfile.id);
          const online = isProfileOnline(memberProfile.id);
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
            >
              <ProfileAvatar profile={memberProfile} online={online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {memberProfile.full_name || memberProfile.email || "Usuario"}
                  </p>
                  {member.profile_id === currentProfileId ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                      Tu
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {getPresenceLabel(
                    online,
                    directoryProfile?.last_activity_at || getProfileLastSeenAt(memberProfile.id),
                    memberProfile.department || memberProfile.email || member.role,
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function getMessageReceiptSummary(
  message: InternalChatMessage,
  receipts: InternalChatMessageReceipt[],
  currentProfileId: string | null,
) {
  if (message.sender_profile_id !== currentProfileId) return null;

  if (message.local_status === "sending") {
    return {
      status: "sent",
      iconClassName: "text-slate-300",
    };
  }

  if (message.local_status === "failed") {
    return {
      status: "sent",
      iconClassName: "text-red-500",
    };
  }

  const messageReceipts = receipts.filter((receipt) => receipt.message_id === message.id);
  const readReceipts = messageReceipts.filter((receipt) => receipt.read_at);
  const deliveredReceipts = messageReceipts.filter((receipt) => receipt.delivered_at);

  if (readReceipts.length) {
    return {
      status: "read",
      iconClassName: "text-blue-600",
    };
  }

  if (deliveredReceipts.length) {
    return {
      status: "delivered",
      iconClassName: "text-slate-500",
    };
  }

  return {
    status: "sent",
    iconClassName: "text-slate-300",
  };
}

function ChannelAvatar({
  channel,
  currentProfileId,
  isProfileOnline,
}: {
  channel: InternalChatChannel;
  currentProfileId: string | null;
  isProfileOnline: (profileId?: string | null) => boolean;
}) {
  if (channel.type === "general") {
    return (
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
        <Hash className="h-5 w-5" />
      </div>
    );
  }

  const otherProfile = getOtherMember(channel, currentProfileId)?.profile || null;
  if (channel.type === "direct" && otherProfile) {
    return <ProfileAvatar profile={otherProfile} online={isProfileOnline(otherProfile.id)} />;
  }

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
      <Users className="h-5 w-5" />
    </div>
  );
}

function ProfileAvatar({
  profile,
  online = false,
}: {
  profile: InternalChatProfile;
  online?: boolean;
}) {
  const initials = getInitials(profile.full_name || profile.email || "U");
  return (
    <div className="relative h-12 w-12 shrink-0">
      <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-blue-50">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm font-bold text-blue-700">
            {initials}
          </div>
        )}
      </div>
      {online ? (
        <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
      ) : null}
    </div>
  );
}

function AttachmentExpiryDialog({
  file,
  uploading,
  onClose,
  onConfirm,
}: {
  file: File | null;
  uploading: boolean;
  onClose: () => void;
  onConfirm: (days: number) => void;
}) {
  const [selectedDays, setSelectedDays] = useState(7);
  const options = [
    { days: 1, label: "1 dia", detail: "Ideal para capturas o archivos de revision rapida." },
    { days: 3, label: "3 dias", detail: "Bueno para seguimiento de equipo durante la semana." },
    { days: 7, label: "7 dias", detail: "Maximo permitido para adjuntos del chat." },
  ];
  const selectedOption = options.find((option) => option.days === selectedDays) || options[2];

  useEffect(() => {
    if (file) setSelectedDays(7);
  }, [file]);

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-slate-200 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
          <DialogTitle className="text-xl font-bold text-slate-950">
            Expiracion del adjunto
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-500">
            Selecciona cuanto tiempo estara disponible. Despues de esa fecha ya no se podra abrir.
          </DialogDescription>
        </DialogHeader>

        {file ? (
          <div className="px-6 py-5">
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-700">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-950">
                  {file.name}
                </span>
                <span className="block text-xs text-slate-500">{formatFileSize(file.size)}</span>
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                Disponible por
              </label>
              <select
                value={selectedDays}
                disabled={uploading}
                onChange={(event) => setSelectedDays(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-wait disabled:opacity-60"
              >
                {options.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-5 text-slate-500">{selectedOption.detail}</p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 border-t border-slate-100 px-6 py-4 sm:space-x-0">
          <button
            type="button"
            disabled={uploading}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={uploading || !file}
            onClick={() => onConfirm(selectedDays)}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-300"
          >
            {uploading ? "Adjuntando..." : "Adjuntar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HeaderIcon({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-full ${
        active ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100"
      }`}
    >
      {icon}
    </button>
  );
}

function DatePill({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
        {label}
      </span>
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function EmptyLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="grid place-items-center gap-2 border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
      <div className="text-blue-600">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2 px-3 py-3">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-16 w-[55%] rounded-2xl bg-white" />
      <div className="ml-auto h-16 w-[48%] rounded-2xl bg-blue-50" />
      <div className="h-16 w-[62%] rounded-2xl bg-white" />
    </div>
  );
}

function getChannelTitle(channel: InternalChatChannel, currentProfileId: string | null) {
  if (channel.type === "general") return "Chat general";
  if (channel.type === "direct") {
    const otherProfile = getOtherMember(channel, currentProfileId)?.profile;
    return otherProfile?.full_name || otherProfile?.email || "Chat directo";
  }
  return channel.name || "Conversación";
}

function getChannelSubtitle(channel: InternalChatChannel, currentProfileId: string | null) {
  if (channel.type === "general") return "Canal general del equipo";
  if (channel.type === "direct") {
    const otherProfile = getOtherMember(channel, currentProfileId)?.profile;
    return otherProfile?.department || otherProfile?.email || "Chat 1 a 1";
  }
  const memberCount = channel.members.length;
  return memberCount === 1 ? "1 miembro" : `${memberCount} miembros`;
}

function getChannelPresenceSubtitle(
  channel: InternalChatChannel,
  currentProfileId: string | null,
  isProfileOnline: (profileId?: string | null) => boolean,
  getProfileLastSeenAt: (profileId?: string | null) => string | null,
  usersByProfileId: Map<string, InternalChatUser>,
) {
  if (channel.type !== "direct") return getChannelSubtitle(channel, currentProfileId);

  const otherProfile = getOtherMember(channel, currentProfileId)?.profile;
  const directoryProfile = otherProfile ? usersByProfileId.get(otherProfile.id) : null;
  const crmLastActivityAt = directoryProfile?.last_activity_at || null;
  if (isProfileOnline(otherProfile?.id)) return "En linea";
  if (crmLastActivityAt) return `Ult. conexion al CRM ${formatRelativeTime(crmLastActivityAt)}`;
  const chatLastSeenAt = getProfileLastSeenAt(otherProfile?.id);
  if (chatLastSeenAt) return `Ult. conexion al chat ${formatRelativeTime(chatLastSeenAt)}`;
  return "Sin conexion reciente registrada";
}

function getPresenceLabel(online: boolean, lastSeenAt: string | null, fallback: string) {
  if (online) return "En linea";
  if (lastSeenAt) return `Ult. vez ${formatRelativeTime(lastSeenAt)}`;
  return fallback;
}

function getOtherMember(channel: InternalChatChannel, currentProfileId: string | null) {
  return (
    channel.members.find((member) => member.profile_id !== currentProfileId && member.profile) ||
    channel.members.find((member) => member.profile)
  );
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

function formatRelativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime()) || diffMs < 0) return "";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "ahora";
  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `hace ${minutes} min`;
  }
  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `hace ${hours} h`;
  }
  if (diffMs < 7 * day) {
    const days = Math.max(1, Math.floor(diffMs / day));
    return `hace ${days} d`;
  }

  return date.toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

function formatFutureRelativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  if (Number.isNaN(date.getTime())) return "";
  if (diffMs <= 0) return "ahora";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.ceil(diffMs / minute));
    return `en ${minutes} min`;
  }
  if (diffMs < day) {
    const hours = Math.max(1, Math.ceil(diffMs / hour));
    return `en ${hours} h`;
  }

  const days = Math.max(1, Math.ceil(diffMs / day));
  return `en ${days} d`;
}

function getMessageAttachments(message: InternalChatMessage) {
  const attachments = (message.metadata as { attachments?: unknown })?.attachments;
  if (!Array.isArray(attachments)) return [] as InternalChatAttachment[];

  return attachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") return null;
      const value = attachment as Partial<InternalChatAttachment>;
      if (!value.path || !value.name) return null;
      return {
        name: String(value.name),
        size: Number(value.size || 0),
        type: String(value.type || "application/octet-stream"),
        path: String(value.path),
        expires_at: String(value.expires_at || value.expiresAt || ""),
      };
    })
    .filter(Boolean) as InternalChatAttachment[];
}

function isAttachmentExpired(attachment: InternalChatAttachment) {
  if (!attachment.expires_at) return false;
  return new Date(attachment.expires_at) <= new Date();
}

function getAttachmentExpiryLabel(attachment: InternalChatAttachment) {
  if (!attachment.expires_at) return "Temporal";
  if (isAttachmentExpired(attachment)) return "Expirado";
  return `Expira ${formatFutureRelativeTime(attachment.expires_at)}`;
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "Archivo";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
