import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, MessageCircleMore, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import { ProjectConversationList, type ProjectConversationItem } from "@/components/projects/project-conversation-list";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import { supabase } from "@/integrations/supabase/client";

type EmailConversationRow = {
  id: string;
  subject: string | null;
  status: string | null;
  unread_count?: number | null;
  is_read?: boolean | null;
  snippet: string | null;
  from_email: string | null;
  to_email: string | null;
  related_client_id?: string | null;
  related_lead_id?: string | null;
  last_message_at: string | null;
  updated_at: string | null;
};

type EmailMessageRow = {
  id: string;
  direction: string | null;
  sender: string | null;
  recipient: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body: string | null;
  body_html: string | null;
  snippet: string | null;
  sent_at: string | null;
  created_at: string;
};

type WhatsappConversationRow = {
  id: string;
  status: string | null;
  last_message: string | null;
  unread_count: number | null;
  last_message_at: string | null;
  updated_at?: string | null;
  created_at: string | null;
  contact_id: string | null;
};

type WhatsappContactRow = {
  id: string;
  name: string | null;
  phone: string | null;
  profile_name?: string | null;
  linked_client_id?: string | null;
  linked_lead_id?: string | null;
};

type WhatsappMessageRow = {
  id: string;
  content: string | null;
  direction: string;
  message_type: string | null;
  created_at: string | null;
  phone: string;
};

type ProposalSendRow = {
  whatsapp_conversation_id: string | null;
};

type SelectedConversation = ProjectConversationItem | null;

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleString("es-DO", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function channelIcon(channel: ProjectConversationItem["channel"]) {
  return channel === "email" ? Mail : MessageCircleMore;
}

function emailMatchReason(row: EmailConversationRow, clientId: string | null, leadId: string | null) {
  if (clientId && String((row as any).related_client_id || "") === clientId) return "Vinculado por cliente";
  if (leadId && String((row as any).related_lead_id || "") === leadId) return "Vinculado por prospecto";
  return "Contexto relacionado";
}

function whatsappMatchReason(
  row: WhatsappConversationRow,
  contact: WhatsappContactRow | null,
  clientId: string | null,
  leadId: string | null,
  matchedByProposal: boolean,
) {
  if (clientId && String(contact?.linked_client_id || "") === clientId) return "Vinculado por cliente";
  if (leadId && String(contact?.linked_lead_id || "") === leadId) return "Vinculado por prospecto";
  if (matchedByProposal) return "Relacionado por propuesta u oportunidad";
  return "Contexto relacionado";
}

function buildEmailItem(
  row: EmailConversationRow,
  clientId: string | null,
  leadId: string | null,
): ProjectConversationItem {
  const unreadCount = Number(row.unread_count ?? (row.is_read ? 0 : 1) ?? 0);
  return {
    id: `email:${row.id}`,
    channel: "email",
    title: row.subject || "(Sin asunto)",
    subtitle: row.from_email || row.to_email || null,
    preview: row.snippet || null,
    status: row.status || null,
    unreadCount,
    lastActivityAt: row.last_message_at || row.updated_at || null,
    matchReason: emailMatchReason(row, clientId, leadId),
  };
}

function buildWhatsappItem(
  row: WhatsappConversationRow,
  contact: WhatsappContactRow | null,
  clientId: string | null,
  leadId: string | null,
  matchedByProposal: boolean,
): ProjectConversationItem {
  return {
    id: `whatsapp:${row.id}`,
    channel: "whatsapp",
    title:
      contact?.name ||
      contact?.profile_name ||
      contact?.phone ||
      "Conversación de WhatsApp",
    subtitle: contact?.phone || null,
    preview: row.last_message || null,
    status: row.status || null,
    unreadCount: Number(row.unread_count || 0),
    lastActivityAt: row.last_message_at || row.updated_at || row.created_at || null,
    matchReason: whatsappMatchReason(row, contact, clientId, leadId, matchedByProposal),
  };
}

export function ProjectConversationsPanel({
  clientId,
  leadId,
  dealId,
}: {
  clientId: string | null;
  leadId: string | null;
  dealId: string | null;
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProjectConversationItem[]>([]);
  const [selected, setSelected] = useState<SelectedConversation>(null);
  const [emailMessages, setEmailMessages] = useState<EmailMessageRow[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsappMessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const linkageCount = useMemo(
    () => [clientId, leadId, dealId].filter(Boolean).length,
    [clientId, dealId, leadId],
  );

  const loadConversations = useCallback(async () => {
    if (!profile?.company_id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = supabase as any;

    const emailPromise = db
      .from("email_conversations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false })
      .limit(200);

    const whatsappPromise = db
      .from("whatsapp_conversations")
      .select("id,status,last_message,unread_count,last_message_at,updated_at,created_at,contact_id")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);

    const proposalSendPromise =
      clientId || leadId || dealId
        ? db
            .from("proposal_sends")
            .select("whatsapp_conversation_id")
            .eq("company_id", profile.company_id)
            .or(
              [
                clientId ? `client_id.eq.${clientId}` : null,
                leadId ? `lead_id.eq.${leadId}` : null,
                dealId ? `deal_id.eq.${dealId}` : null,
              ]
                .filter(Boolean)
                .join(","),
            )
            .limit(120)
        : Promise.resolve({ data: [], error: null });

    const [emailResult, whatsappResult, proposalSendResult] = await Promise.all([
      emailPromise,
      whatsappPromise,
      proposalSendPromise,
    ]);

    if (emailResult.error) {
      toast.error(emailResult.error.message || "No se pudieron cargar los emails del proyecto.");
      setLoading(false);
      return;
    }

    if (whatsappResult.error) {
      toast.error(
        whatsappResult.error.message || "No se pudieron cargar las conversaciones de WhatsApp.",
      );
      setLoading(false);
      return;
    }

    if (proposalSendResult.error) {
      toast.error(
        proposalSendResult.error.message || "No se pudieron cruzar propuestas con conversaciones.",
      );
    }

    const emailRows = ((emailResult.data || []) as EmailConversationRow[]).filter((row) => {
      const relatedClientId = String((row as any).related_client_id || "");
      const relatedLeadId = String((row as any).related_lead_id || "");
      return (clientId && relatedClientId === clientId) || (leadId && relatedLeadId === leadId);
    });

    const proposalConversationIds = new Set(
      ((proposalSendResult.data || []) as ProposalSendRow[])
        .map((row) => String(row.whatsapp_conversation_id || "").trim())
        .filter(Boolean),
    );

    const whatsappRows = (whatsappResult.data || []) as WhatsappConversationRow[];
    const contactIds = Array.from(
      new Set(whatsappRows.map((row) => String(row.contact_id || "").trim()).filter(Boolean)),
    );

    let contactsById = new Map<string, WhatsappContactRow>();
    if (contactIds.length) {
      const { data: contactRows, error: contactError } = await db
        .from("whatsapp_contacts")
        .select("id,name,phone,profile_name,linked_client_id,linked_lead_id")
        .eq("company_id", profile.company_id)
        .in("id", contactIds);

      if (contactError) {
        toast.error(contactError.message || "No se pudieron cargar los contactos de WhatsApp.");
      } else {
        contactsById = new Map(
          ((contactRows || []) as WhatsappContactRow[]).map((row) => [String(row.id), row]),
        );
      }
    }

    const filteredWhatsappRows = whatsappRows.filter((row) => {
      const contact = row.contact_id ? contactsById.get(String(row.contact_id)) || null : null;
      const contactClientId = String(contact?.linked_client_id || "");
      const contactLeadId = String(contact?.linked_lead_id || "");
      return (
        (clientId && contactClientId === clientId) ||
        (leadId && contactLeadId === leadId) ||
        proposalConversationIds.has(String(row.id))
      );
    });

    const nextItems = [
      ...emailRows.map((row) => buildEmailItem(row, clientId, leadId)),
      ...filteredWhatsappRows.map((row) =>
        buildWhatsappItem(
          row,
          row.contact_id ? contactsById.get(String(row.contact_id)) || null : null,
          clientId,
          leadId,
          proposalConversationIds.has(String(row.id)),
        ),
      ),
    ].sort((a, b) => {
      const at = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bt = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bt - at;
    });

    setItems(nextItems);
    setSelected((current) => nextItems.find((item) => item.id === current?.id) || nextItems[0] || null);
    setLoading(false);
  }, [clientId, dealId, leadId, profile?.company_id]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useRealtimeTable({
    table: "email_conversations",
    companyId: profile?.company_id || null,
    enabled: Boolean(profile?.company_id),
    onChange: () => {
      void loadConversations();
    },
  });

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
        (payload.new as any)?.conversation_id || (payload.old as any)?.conversation_id || "",
      ).trim();
      if (selected?.channel === "whatsapp" && selected.id === `whatsapp:${changedConversationId}`) {
        void loadConversations();
      }
    },
  });

  useEffect(() => {
    async function loadMessages() {
      if (!selected) {
        setEmailMessages([]);
        setWhatsappMessages([]);
        return;
      }

      setMessagesLoading(true);
      const db = supabase as any;

      if (selected.channel === "email") {
        const conversationId = selected.id.replace("email:", "");
        const { data, error } = await db
          .from("email_messages")
          .select("id,direction,sender,recipient,from_email,to_email,subject,body,body_html,snippet,sent_at,created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(120);

        if (error) {
          toast.error(error.message || "No se pudieron cargar los mensajes del email.");
          setEmailMessages([]);
        } else {
          setEmailMessages((data || []) as EmailMessageRow[]);
        }
        setWhatsappMessages([]);
        setMessagesLoading(false);
        return;
      }

      const conversationId = selected.id.replace("whatsapp:", "");
      const { data, error } = await db
        .from("whatsapp_conversation_messages")
        .select("id,content,direction,message_type,created_at,phone")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(160);

      if (error) {
        toast.error(error.message || "No se pudieron cargar los mensajes de WhatsApp.");
        setWhatsappMessages([]);
      } else {
        setWhatsappMessages((data || []) as WhatsappMessageRow[]);
      }
      setEmailMessages([]);
      setMessagesLoading(false);
    }

    void loadMessages();
  }, [selected]);

  if (!linkageCount) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState
          icon={<MessageCircleMore className="h-5 w-5" />}
          title="Proyecto sin vínculos conversacionales"
          description="Este proyecto no tiene cliente, prospecto ni oportunidad asociados, así que todavía no podemos reunir conversaciones externas relacionadas."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
              Conversaciones del proyecto
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Visibilidad unificada de emails y WhatsApp relacionados con el contexto comercial del proyecto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {items.length ? `${items.length} conversaciones` : "Sin conversaciones"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadConversations()}
              disabled={loading}
              className="h-8 rounded-full px-3 text-xs font-semibold text-slate-500"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-8 text-sm text-slate-500 sm:px-5">
          Cargando conversaciones del proyecto...
        </div>
      ) : items.length ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <ProjectConversationList
            items={items}
            selectedId={selected?.id || null}
            onSelect={setSelected}
          />

          <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white">
            <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                {selected ? (
                  <>
                    {(() => {
                      const Icon = channelIcon(selected.channel);
                      return <Icon className="h-4 w-4 text-slate-500" />;
                    })()}
                    <h4 className="text-sm font-semibold text-slate-900">{selected.title}</h4>
                  </>
                ) : (
                  <h4 className="text-sm font-semibold text-slate-900">Detalle</h4>
                )}
              </div>
              {selected ? (
                <p className="mt-1 text-xs text-slate-500">
                  {selected.matchReason} · {selected.status || "sin estado"} ·{" "}
                  {formatDateTime(selected.lastActivityAt)}
                </p>
              ) : null}
            </div>

            <ScrollArea className="h-[460px]">
              <div className="space-y-3 px-4 py-4 sm:px-5">
                {messagesLoading ? (
                  <p className="text-sm text-slate-500">Cargando mensajes...</p>
                ) : selected?.channel === "email" ? (
                  emailMessages.length ? (
                    emailMessages.map((message) => {
                      const outbound = String(message.direction || "").toLowerCase() === "outbound";
                      return (
                        <article
                          key={message.id}
                          className={`max-w-[90%] rounded-[20px] px-4 py-3 ${
                            outbound
                              ? "ml-auto bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">
                            {outbound ? "Salida" : "Entrada"}
                          </p>
                          <p className="mt-1 text-xs opacity-80">
                            {(message.sender || message.from_email || message.recipient || message.to_email || "")
                              .toString()
                              .trim() || "Sin remitente"}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                            {message.body || message.snippet || "Sin contenido disponible."}
                          </p>
                          <p className="mt-2 text-[11px] opacity-70">
                            {formatDateTime(message.sent_at || message.created_at)}
                          </p>
                        </article>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">Esta conversación de email no tiene mensajes visibles.</p>
                  )
                ) : whatsappMessages.length ? (
                  whatsappMessages.map((message) => {
                    const outbound = String(message.direction || "").toLowerCase() === "outbound";
                    return (
                      <article
                        key={message.id}
                        className={`max-w-[90%] rounded-[20px] px-4 py-3 ${
                          outbound
                            ? "ml-auto bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
                          {outbound ? "Salida" : "Entrada"}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {message.content || "Mensaje sin texto visible."}
                        </p>
                        <p className="mt-2 text-[11px] opacity-75">
                          {formatDateTime(message.created_at)}
                        </p>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">
                    Esta conversación de WhatsApp no tiene mensajes visibles todavía.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<MessageCircleMore className="h-5 w-5" />}
          title="Sin conversaciones relacionadas"
          description="Todavía no encontramos emails ni conversaciones de WhatsApp vinculadas al cliente, prospecto u oportunidad de este proyecto."
        />
      )}
    </div>
  );
}
