import { supabase } from "@/integrations/supabase/client";

export type InternalChatChannelType = "general" | "direct" | "group" | "context";
export type InternalChatMemberRole = "owner" | "member";
export type InternalChatMessageType = "text" | "system";
export type InternalChatMessageLocalStatus = "sending" | "failed";
export type InternalChatAttachment = {
  name: string;
  size: number;
  type: string;
  path: string;
  expires_at: string;
};

export type InternalChatProfile = {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email?: string | null;
  department?: string | null;
  is_active?: boolean;
  last_activity_at?: string | null;
};

export type InternalChatChannel = {
  id: string;
  company_id: string;
  type: InternalChatChannelType;
  name: string | null;
  description: string | null;
  related_type: string | null;
  related_id: string | null;
  created_by: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  members: InternalChatMember[];
  latest_message: InternalChatMessage | null;
  unread_count: number;
};

export type InternalChatMember = {
  id: string;
  company_id: string;
  channel_id: string;
  profile_id: string;
  role: InternalChatMemberRole;
  joined_at: string;
  last_read_at: string | null;
  muted_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: InternalChatProfile | null;
};

export type InternalChatMessage = {
  id: string;
  company_id: string;
  channel_id: string;
  sender_profile_id: string | null;
  body: string;
  message_type: InternalChatMessageType;
  metadata: Record<string, unknown>;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: InternalChatProfile | null;
  local_status?: InternalChatMessageLocalStatus;
  local_error?: string | null;
};

export type InternalChatRead = {
  id: string;
  company_id: string;
  channel_id: string;
  profile_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
  created_at: string;
  updated_at: string;
};

export type InternalChatMessageReceipt = {
  id: string;
  company_id: string;
  channel_id: string;
  message_id: string;
  profile_id: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: InternalChatProfile | null;
};

export type InternalChatUser = InternalChatProfile & {
  phone?: string | null;
};

type InternalChatContext = {
  profileId: string;
  companyId: string;
};

const INTERNAL_CHAT_ATTACHMENTS_BUCKET = "internal-chat-attachments";
const MAX_ATTACHMENT_RETENTION_DAYS = 7;

function db() {
  return supabase as any;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map(String)));
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeAttachmentRetentionDays(value: number) {
  if (!Number.isFinite(value)) return MAX_ATTACHMENT_RETENTION_DAYS;
  return Math.min(Math.max(Math.ceil(value), 1), MAX_ATTACHMENT_RETENTION_DAYS);
}

function getAttachmentPaths(metadata?: Record<string, unknown>) {
  const attachments = metadata?.attachments;
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") return null;
      const path = (attachment as { path?: unknown }).path;
      return typeof path === "string" && path.trim() ? path.trim() : null;
    })
    .filter(Boolean) as string[];
}

export async function getInternalChatContext(): Promise<InternalChatContext> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user?.id) throw new Error("No hay sesión activa.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,company_id")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .single();

  if (error) throw error;
  if (!data?.id || !data?.company_id) throw new Error("No hay contexto de compañía.");

  return { profileId: data.id, companyId: data.company_id };
}

export async function listInternalChatChannels() {
  const { profileId, companyId } = await getInternalChatContext();

  const { data: channels, error: channelsError } = await db()
    .from("internal_chat_channels")
    .select(
      "id,company_id,type,name,description,related_type,related_id,created_by,is_archived,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (channelsError) throw channelsError;

  const rows = (channels || []) as Omit<
    InternalChatChannel,
    "members" | "latest_message" | "unread_count"
  >[];
  const channelIds = rows.map((channel) => channel.id);

  if (!channelIds.length) return [] as InternalChatChannel[];

  const [{ data: members, error: membersError }, { data: messages, error: messagesError }, reads] =
    await Promise.all([
      db()
        .from("internal_chat_members")
        .select(
          "id,company_id,channel_id,profile_id,role,joined_at,last_read_at,muted_at,created_at,updated_at,profile:profiles(id,user_id,full_name,avatar_url,email,department,is_active)",
        )
        .eq("company_id", companyId)
        .in("channel_id", channelIds),
      db()
        .from("internal_chat_messages")
        .select(
          "id,company_id,channel_id,sender_profile_id,body,message_type,metadata,reply_to_id,edited_at,deleted_at,created_at,updated_at,sender:profiles(id,user_id,full_name,avatar_url,email,department,is_active)",
        )
        .eq("company_id", companyId)
        .in("channel_id", channelIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(300),
      listInternalChatReads(channelIds),
    ]);

  if (membersError) throw membersError;
  if (messagesError) throw messagesError;

  const membersByChannel = new Map<string, InternalChatMember[]>();
  for (const member of (members || []) as InternalChatMember[]) {
    const list = membersByChannel.get(member.channel_id) || [];
    list.push(member);
    membersByChannel.set(member.channel_id, list);
  }

  const latestByChannel = new Map<string, InternalChatMessage>();
  const unreadByChannel = new Map<string, number>();
  const readByChannel = new Map(reads.map((read) => [read.channel_id, read]));

  for (const message of (messages || []) as InternalChatMessage[]) {
    if (!latestByChannel.has(message.channel_id)) latestByChannel.set(message.channel_id, message);
    const read = readByChannel.get(message.channel_id);
    const isOwnMessage = message.sender_profile_id === profileId;
    const isUnread =
      !isOwnMessage &&
      (!read?.last_read_at || new Date(message.created_at) > new Date(read.last_read_at));
    if (isUnread) {
      unreadByChannel.set(message.channel_id, (unreadByChannel.get(message.channel_id) || 0) + 1);
    }
  }

  return rows.map((channel) => ({
    ...channel,
    members: membersByChannel.get(channel.id) || [],
    latest_message: latestByChannel.get(channel.id) || null,
    unread_count: unreadByChannel.get(channel.id) || 0,
  }));
}

export async function listInternalChatUsers() {
  const { companyId } = await getInternalChatContext();

  const chatUsersResult = await db().rpc("list_internal_chat_users", {
    _search: null,
  });

  if (!chatUsersResult.error && Array.isArray(chatUsersResult.data)) {
    return chatUsersResult.data.map((row: any) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      full_name: row.full_name || row.email || "Usuario",
      avatar_url: row.avatar_url || null,
      email: row.email || null,
      department: row.department || null,
      phone: row.phone || null,
      is_active: Boolean(row.is_active),
      last_activity_at: row.last_activity_at || null,
    })) as InternalChatUser[];
  }

  const teamResult = await db().rpc("get_company_team_members", {
    _search: null,
    _role: null,
    _is_active: true,
    _department: null,
  });

  if (!teamResult.error && Array.isArray(teamResult.data)) {
    return teamResult.data.map((row: any) => ({
      id: String(row.profile_id),
      user_id: String(row.user_id),
      full_name: row.full_name || row.email || "Usuario",
      avatar_url: null,
      email: row.email || null,
      department: row.department || null,
      phone: null,
      is_active: Boolean(row.is_active),
      last_activity_at: row.last_activity_at || null,
    })) as InternalChatUser[];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,user_id,full_name,avatar_url,email,department,phone,is_active")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({ ...row, last_activity_at: null })) as InternalChatUser[];
}

export async function listInternalChatMessages(channelId: string, limit = 80) {
  const { companyId } = await getInternalChatContext();

  const { data, error } = await db()
    .from("internal_chat_messages")
    .select(
      "id,company_id,channel_id,sender_profile_id,body,message_type,metadata,reply_to_id,edited_at,deleted_at,created_at,updated_at,sender:profiles(id,user_id,full_name,avatar_url,email,department,is_active)",
    )
    .eq("company_id", companyId)
    .eq("channel_id", channelId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data || []) as InternalChatMessage[]).reverse();
}

export async function listInternalChatReads(channelIds?: string[]) {
  const { profileId, companyId } = await getInternalChatContext();

  let query = db()
    .from("internal_chat_reads")
    .select(
      "id,company_id,channel_id,profile_id,last_read_message_id,last_read_at,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .eq("profile_id", profileId);

  const ids = uniqueStrings(channelIds || []);
  if (ids.length) query = query.in("channel_id", ids);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as InternalChatRead[];
}

export async function listInternalChatMessageReceipts(channelId: string) {
  const { companyId } = await getInternalChatContext();

  const { data, error } = await db()
    .from("internal_chat_message_receipts")
    .select(
      "id,company_id,channel_id,message_id,profile_id,delivered_at,read_at,created_at,updated_at,profile:profiles(id,user_id,full_name,avatar_url,email,department,is_active)",
    )
    .eq("company_id", companyId)
    .eq("channel_id", channelId);

  if (error) throw error;

  return (data || []) as InternalChatMessageReceipt[];
}

export async function markInternalChatMessagesDelivered(channelId: string, messageIds: string[]) {
  const ids = uniqueStrings(messageIds);
  if (!channelId || !ids.length) return [] as InternalChatMessageReceipt[];

  const { data, error } = await db().rpc("mark_internal_chat_messages_delivered", {
    _channel_id: channelId,
    _message_ids: ids,
  });

  if (error) throw error;
  return (data || []) as InternalChatMessageReceipt[];
}

export async function markInternalChatMessagesRead(channelId: string, messageIds: string[]) {
  const ids = uniqueStrings(messageIds);
  if (!channelId || !ids.length) return [] as InternalChatMessageReceipt[];

  const { data, error } = await db().rpc("mark_internal_chat_messages_read", {
    _channel_id: channelId,
    _message_ids: ids,
  });

  if (error) throw error;
  return (data || []) as InternalChatMessageReceipt[];
}

export async function uploadInternalChatAttachment(
  channelId: string,
  file: File,
  expiresInDays = MAX_ATTACHMENT_RETENTION_DAYS,
) {
  const { profileId, companyId } = await getInternalChatContext();
  if (!channelId) throw new Error("Selecciona un chat antes de adjuntar.");
  if (!file) throw new Error("Selecciona un archivo valido.");

  const retentionDays = normalizeAttachmentRetentionDays(expiresInDays);
  const safeName = sanitizeFileName(file.name) || "archivo";
  const path = `${companyId}/${channelId}/${profileId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(INTERNAL_CHAT_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw error;

  const registerResult = await db().rpc("register_internal_chat_attachment", {
    _channel_id: channelId,
    _storage_path: path,
    _file_name: file.name,
    _file_size: file.size,
    _mime_type: file.type || "application/octet-stream",
    _expires_in_days: retentionDays,
  });

  if (registerResult.error) {
    await supabase.storage.from(INTERNAL_CHAT_ATTACHMENTS_BUCKET).remove([path]);
    throw registerResult.error;
  }

  return {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    path,
    expires_at: registerResult.data?.expires_at || new Date().toISOString(),
  } satisfies InternalChatAttachment;
}

export async function linkInternalChatAttachmentMessage(path: string, messageId: string) {
  if (!path || !messageId) return null;

  const { data, error } = await db().rpc("link_internal_chat_attachment_message", {
    _storage_path: path,
    _message_id: messageId,
  });

  if (error) throw error;
  return data;
}

export async function createInternalChatAttachmentUrl(path: string) {
  const cleanPath = path.trim();
  if (!cleanPath) throw new Error("No se encontro el archivo.");

  const { data: attachment, error: attachmentError } = await db()
    .from("internal_chat_attachments")
    .select("expires_at,deleted_at")
    .eq("storage_path", cleanPath)
    .maybeSingle();

  if (attachmentError) throw attachmentError;
  if (!attachment || attachment.deleted_at) throw new Error("Este archivo ya no esta disponible.");
  if (new Date(attachment.expires_at) <= new Date()) {
    throw new Error("Este archivo ya expiro.");
  }

  const { data, error } = await supabase.storage
    .from(INTERNAL_CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(cleanPath, 60);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("No se pudo abrir el archivo.");

  return data.signedUrl;
}

export async function sendInternalChatMessage(
  channelId: string,
  body: string,
  input?: {
    replyToId?: string | null;
    metadata?: Record<string, unknown>;
    messageType?: InternalChatMessageType;
  },
) {
  const { profileId, companyId } = await getInternalChatContext();
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("Escribe un mensaje antes de enviarlo.");

  const { data, error } = await db()
    .from("internal_chat_messages")
    .insert({
      company_id: companyId,
      channel_id: channelId,
      sender_profile_id: profileId,
      body: cleanBody,
      message_type: input?.messageType || "text",
      metadata: input?.metadata || {},
      reply_to_id: input?.replyToId || null,
    })
    .select(
      "id,company_id,channel_id,sender_profile_id,body,message_type,metadata,reply_to_id,edited_at,deleted_at,created_at,updated_at,sender:profiles(id,user_id,full_name,avatar_url,email,department,is_active)",
    )
    .single();

  if (error) throw error;

  await db()
    .from("internal_chat_channels")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", channelId)
    .eq("company_id", companyId);

  await markInternalChatRead(channelId, data?.id || null);

  const attachmentPaths = getAttachmentPaths(input?.metadata);
  await Promise.all(
    attachmentPaths.map((path) =>
      linkInternalChatAttachmentMessage(path, data.id).catch(() => null),
    ),
  );

  return data as InternalChatMessage;
}

export async function markInternalChatRead(channelId: string, lastReadMessageId?: string | null) {
  const { profileId, companyId } = await getInternalChatContext();

  const payload = {
    company_id: companyId,
    channel_id: channelId,
    profile_id: profileId,
    last_read_message_id: lastReadMessageId || null,
    last_read_at: new Date().toISOString(),
  };

  const { data, error } = await db()
    .from("internal_chat_reads")
    .upsert(payload, { onConflict: "channel_id,profile_id" })
    .select(
      "id,company_id,channel_id,profile_id,last_read_message_id,last_read_at,created_at,updated_at",
    )
    .single();

  if (error) throw error;

  await db()
    .from("internal_chat_members")
    .update({ last_read_at: payload.last_read_at })
    .eq("company_id", companyId)
    .eq("channel_id", channelId)
    .eq("profile_id", profileId);

  return data as InternalChatRead;
}

export async function getOrCreateDirectInternalChat(otherProfileId: string) {
  if (!otherProfileId) throw new Error("Selecciona un usuario válido.");

  const { data, error } = await db().rpc("get_or_create_internal_direct_chat", {
    _other_profile_id: otherProfileId,
  });

  if (error) throw error;
  if (!data) throw new Error("No se pudo abrir el chat directo.");

  return String(data);
}
