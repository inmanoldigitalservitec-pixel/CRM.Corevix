import { supabase } from "@/integrations/supabase/client";

export type AiChatRole = "user" | "assistant" | "system";

export type AiChatThread = {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  preview: string | null;
  created_at: string;
  updated_at: string;
};

export type AiChatMessage = {
  id: string;
  thread_id: string;
  company_id: string;
  user_id: string;
  role: AiChatRole;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

async function getCurrentContext() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const userId = session?.user?.id;
  if (!userId) throw new Error("No hay sesión activa.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", userId)
    .single();

  if (profileError) throw profileError;

  const companyId = profile?.company_id;
  if (!companyId) throw new Error("No encontré company_id para este usuario.");

  return { userId, companyId };
}

export async function listAiChatThreads() {
  const { userId, companyId } = await getCurrentContext();

  const { data, error } = await (supabase as any)
    .from("ai_chat_threads")
    .select("id,company_id,user_id,title,preview,created_at,updated_at")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []) as AiChatThread[];
}

export async function createAiChatThread(input?: { title?: string; preview?: string }) {
  const { userId, companyId } = await getCurrentContext();

  const { data, error } = await (supabase as any)
    .from("ai_chat_threads")
    .insert({
      company_id: companyId,
      user_id: userId,
      title: input?.title || "Nuevo chat",
      preview: input?.preview || "Sin mensajes todavía",
    })
    .select("id,company_id,user_id,title,preview,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as AiChatThread;
}

export async function listAiChatMessages(threadId: string) {
  const { userId, companyId } = await getCurrentContext();

  const { data, error } = await (supabase as any)
    .from("ai_chat_messages")
    .select("id,thread_id,company_id,user_id,role,content,metadata,created_at")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []) as AiChatMessage[];
}

export async function appendAiChatMessage(
  threadId: string,
  role: AiChatRole,
  content: string,
  metadata?: Record<string, unknown>,
) {
  const { userId, companyId } = await getCurrentContext();

  const { data, error } = await (supabase as any)
    .from("ai_chat_messages")
    .insert({
      thread_id: threadId,
      company_id: companyId,
      user_id: userId,
      role,
      content,
      metadata: metadata || {},
    })
    .select("id,thread_id,company_id,user_id,role,content,metadata,created_at")
    .single();

  if (error) throw error;

  return data as AiChatMessage;
}

export async function updateAiChatThread(
  threadId: string,
  input: { title?: string; preview?: string },
) {
  const { userId, companyId } = await getCurrentContext();

  const { data, error } = await (supabase as any)
    .from("ai_chat_threads")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .select("id,company_id,user_id,title,preview,created_at,updated_at")
    .single();

  if (error) throw error;

  return data as AiChatThread;
}
