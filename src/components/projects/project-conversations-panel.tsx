import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, MessageCircleMore, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/empty-state";
import {
  ProjectConversationList,
  type ProjectConversationItem,
} from "@/components/projects/project-conversation-list";
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

type WhatsappConversationViewRow = {
  conversation_id: string | null;
  conversation_status: string | null;
  last_message: string | null;
  unread_count: number | null;
  last_message_at: string | null;
  conversation_updated_at: string | null;
  conversation_created_at: string | null;
  contact_id: string | null;
  contact_name: string | null;
  display_name: string | null;
  phone: string | null;
  lead_id: string | null;
  lead_name: string | null;
  whatsapp_lead_id: string | null;
  whatsapp_profile_name: string | null;
};

type WhatsappMessageRow = {
  id?: string | null;
  message_id?: string | null;
  content: string | null;
  direction: string | null;
  message_type: string | null;
  created_at: string | null;
  phone: string | null;
};

type ProposalSendRow = {
  whatsapp_conversation_id: string | null;
};

type ContextRow = Record<string, unknown> | null;
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

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function addIfPresent(target: Set<string>, value: unknown, normalizer: (value: unknown) => string) {
  const normalized = normalizer(value);
  if (normalized) target.add(normalized);
}

function collectContextEmails(client: ContextRow, lead: ContextRow) {
  const emails = new Set<string>();

  for (const row of [client, lead]) {
    if (!row) continue;
    addIfPresent(emails, row.email, normalizeEmail);
    addIfPresent(emails, row.contact_email, normalizeEmail);
    addIfPresent(emails, row.primary_email, normalizeEmail);
  }

  return emails;
}

function collectContextPhones(client: ContextRow, lead: ContextRow) {
  const phones = new Set<string>();

  for (const row of [client, lead]) {
    if (!row) continue;
    addIfPresent(phones, row.phone, normalizePhone);
    addIfPresent(phones, row.whatsapp, normalizePhone);
    addIfPresent(phones, row.mobile, normalizePhone);
    addIfPresent(phones, row.contact_phone, normalizePhone);
  }

  return phones;
}

function phoneMatches(phone: unknown, phoneSet: Set<string>) {
  const normalized = normalizePhone(phone);
  if (!normalized || phoneSet.size === 0) return false;

  if (phoneSet.has(normalized)) return true;

  for (const candidate of phoneSet) {
    if (!candidate) continue;
    if (normalized.endsWith(candidate) || candidate.endsWith(normalized)) return true;

    const shortA = normalized.slice(-10);
    const shortB = candidate.slice(-10);
    if (shortA && shortB && shortA === shortB) return true;
  }

  return false;
}

function emailMatchesConversation(row: EmailConversationRow, emailSet: Set<string>) {
  if (emailSet.size === 0) return false;

  const from = normalizeEmail(row.from_email);
  const to = normalizeEmail(row.to_email);

  return Boolean((from && emailSet.has(from)) || (to && emailSet.has(to)));
}

function emailMatchReason(
  row: EmailConversationRow,
  clientId: string | null,
  leadId: string | null,
  emailSet: Set<string>,
) {
  if (clientId && String((row as any).related_client_id || "") === clientId) {
    return "Vinculado por cliente";
  }

  if (leadId && String((row as any).related_lead_id || "") === leadId) {
    return "Vinculado por prospecto";
  }

  if (emailMatchesConversation(row, emailSet)) {
    return "Relacionado por email";
  }

  return "Contexto relacionado";
}

function whatsappMatchReason(
  row: WhatsappConversationViewRow,
  leadId: string | null,
  phoneSet: Set<string>,
  matchedByProposal: boolean,
) {
  if (leadId && String(row.lead_id || "") === leadId) return "Vinculado por prospecto";
  if (matchedByProposal) return "Relacionado por propuesta u oportunidad";
  if (phoneMatches(row.phone, phoneSet)) return "Relacionado por teléfono";
  return "Contexto relacionado";
}

function channelIcon(channel: ProjectConversationItem["channel"]) {
  return channel === "email" ? Mail : MessageCircleMore;
}

function buildEmailItem(
  row: EmailConversationRow,
  clientId: string | null,
  leadId: string | null,
  emailSet: Set<string>,
): ProjectConversationItem {
  const unreadCount = Number(row.unread_count ?? (row.is_read ? 0 : 1));

  return {
    id: `email:${row.id}`,
    channel: "email",
    title: row.subject || "(Sin asunto)",
    subtitle: row.from_email || row.to_email || null,
    preview: row.snippet || null,
    status: row.status || null,
    unreadCount,
    lastActivityAt: row.last_message_at || row.updated_at || null,
    matchReason: emailMatchReason(row, clientId, leadId, emailSet),
  };
}

function buildWhatsappItem(
  row: WhatsappConversationViewRow,
  leadId: string | null,
  phoneSet: Set<string>,
  matchedByProposal: boolean,
): ProjectConversationItem | null {
  if (!row.conversation_id) return null;

  return {
    id: `whatsapp:${row.conversation_id}`,
    channel: "whatsapp",
    title:
      row.display_name ||
      row.contact_name ||
      row.whatsapp_profile_name ||
      row.lead_name ||
      row.phone ||
      "Conversación de WhatsApp",
    subtitle: row.phone || row.lead_name || null,
    preview: row.last_message || null,
    status: row.conversation_status || null,
    unreadCount: Number(row.unread_count || 0),
    lastActivityAt:
      row.last_message_at || row.conversation_updated_at || row.conversation_created_at || null,
    matchReason: whatsappMatchReason(row, leadId, phoneSet, matchedByProposal),
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
      setSelected(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = supabase as any;

    const clientPromise = clientId
      ? db
          .from("clients")
          .select("*")
          .eq("company_id", profile.company_id)
          .eq("id", clientId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const leadPromise = leadId
      ? db
          .from("leads")
          .select("*")
          .eq("company_id", profile.company_id)
          .eq("id", leadId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const emailPromise = db
      .from("email_conversations")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(200);

    const whatsappPromise = db
      .from("crm_whatsapp_conversation_list")
      .select(
        [
          "conversation_id",
          "conversation_status",
          "last_message",
          "unread_count",
          "last_message_at",
          "conversation_updated_at",
          "conversation_created_at",
          "contact_id",
          "contact_name",
          "display_name",
          "phone",
          "lead_id",
          "lead_name",
          "whatsapp_lead_id",
          "whatsapp_profile_name",
        ].join(","),
      )
      .eq("company_id", profile.company_id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
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

    const [clientResult, leadResult, emailResult, whatsappResult, proposalSendResult] =
      await Promise.all([
        clientPromise,
        leadPromise,
        emailPromise,
        whatsappPromise,
        proposalSendPromise,
      ]);

    if (clientResult.error) {
      toast.error(clientResult.error.message || "No se pudo cargar el cliente del proyecto.");
    }

    if (leadResult.error) {
      toast.error(leadResult.error.message || "No se pudo cargar el prospecto del proyecto.");
    }

    if (emailResult.error) {
      toast.error(emailResult.error.message || "No se pudieron cargar los emails del proyecto.");
      setItems([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    if (whatsappResult.error) {
      toast.error(
        whatsappResult.error.message || "No se pudieron cargar las conversaciones de WhatsApp.",
      );
      setItems([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    if (proposalSendResult.error) {
      toast.error(
        proposalSendResult.error.message || "No se pudieron cruzar propuestas con conversaciones.",
      );
    }

    const clientContext = (clientResult.data || null) as ContextRow;
    const leadContext = (leadResult.data || null) as ContextRow;
    const contextEmails = collectContextEmails(clientContext, leadContext);
    const contextPhones = collectContextPhones(clientContext, leadContext);

    const proposalConversationIds = new Set(
      ((proposalSendResult.data || []) as ProposalSendRow[])
        .map((row) => String(row.whatsapp_conversation_id || "").trim())
        .filter(Boolean),
    );

    const emailRows = ((emailResult.data || []) as EmailConversationRow[]).filter((row) => {
      const relatedClientId = String((row as any).related_client_id || "");
      const relatedLeadId = String((row as any).related_lead_id || "");

      return (
        (clientId && relatedClientId === clientId) ||
        (leadId && relatedLeadId === leadId) ||
        emailMatchesConversation(row, contextEmails)
      );
    });

    const whatsappRows = ((whatsappResult.data || []) as WhatsappConversationViewRow[]).filter(
      (row) => {
        const conversationId = String(row.conversation_id || "").trim();

        return (
          (leadId && String(row.lead_id || "") === leadId) ||
          (conversationId && proposalConversationIds.has(conversationId)) ||
          phoneMatches(row.phone, contextPhones)
        );
      },
    );

    const whatsappItems = whatsappRows
      .map((row) =>
        buildWhatsappItem(
          row,
          leadId,
          contextPhones,
          proposalConversationIds.has(String(row.conversation_id || "")),
        ),
      )
      .filter(Boolean) as ProjectConversationItem[];

    const nextItems = [
      ...emailRows.map((row) => buildEmailItem(row, clientId, leadId, contextEmails)),
      ...whatsappItems,
    ].sort((a, b) => {
      const at = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bt = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bt - at;
    });

    setItems(nextItems);
    setSelected(
      (current) => nextItems.find((item) => item.id === current?.id) || nextItems[0] || null,
    );
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
    table: "email_messages",
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
    onChange: () => {
      void loadConversations();
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
          .select(
            "id,direction,sender,recipient,from_email,to_email,subject,body,body_html,snippet,sent_at,created_at",
          )
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
        .from("crm_whatsapp_messages")
        .select("message_id,content,direction,message_type,created_at,phone")
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
              Emails y WhatsApp relacionados con el cliente, prospecto u oportunidad del proyecto.
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
                            {(
                              message.sender ||
                              message.from_email ||
                              message.recipient ||
                              message.to_email ||
                              ""
                            )
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
                    <p className="text-sm text-slate-500">
                      Esta conversación de email no tiene mensajes visibles.
                    </p>
                  )
                ) : whatsappMessages.length ? (
                  whatsappMessages.map((message, index) => {
                    const outbound = String(message.direction || "").toLowerCase() === "outbound";

                    return (
                      <article
                        key={message.id || message.message_id || `${message.created_at}-${index}`}
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
