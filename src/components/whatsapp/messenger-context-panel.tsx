import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MetaConversationListRow } from "@/lib/meta/view-types";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function CardSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.08em] text-slate-400">{title}</div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-[12px] text-slate-500">{label}</div>
      <div className="text-[12px] text-slate-900 text-right break-words">{value || "—"}</div>
    </div>
  );
}

function formatConversationStatus(status: unknown): string | null {
  const s = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === "open") return "Abierta";
  if (s === "awaiting_advisor") return "Esperando asesor";
  if (s === "human_mode") return "Modo humano";
  if (s === "resolved") return "Resuelta";
  if (s === "closed") return "Cerrada";
  if (s === "bot_paused") return "Bot pausado";
  // Fallback: show raw value if it's something unexpected.
  return String(status);
}

export function MessengerContextPanel({
  conversation,
  onRefreshConversations,
  onToggleBotStatus,
  className,
}: {
  conversation: MetaConversationListRow | null;
  onRefreshConversations?: () => void;
  onToggleBotStatus?: () => void;
  className?: string;
}) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const [creatingLead, setCreatingLead] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [leadMatches, setLeadMatches] = useState<any[]>([]);
  const [clientMatches, setClientMatches] = useState<any[]>([]);
  const [dealOpen, setDealOpen] = useState(false);
  const [dealSaving, setDealSaving] = useState(false);
  const [dealStages, setDealStages] = useState<
    Array<{
      name: string;
      display_order: number | null;
      is_won: boolean | null;
      is_lost: boolean | null;
    }>
  >([]);
  const [dealStagesError, setDealStagesError] = useState<string | null>(null);
  const [dealValues, setDealValues] = useState({
    name: "",
    value: "",
    stage: "",
    probability: "25",
    expected_close: "",
    notes: "",
  });
  const [linkedLead, setLinkedLead] = useState<any | null>(null);
  const [linkedClient, setLinkedClient] = useState<any | null>(null);
  const [linkedDeal, setLinkedDeal] = useState<any | null>(null);
  const [nextTask, setNextTask] = useState<any | null>(null);
  const [linkedLeadError, setLinkedLeadError] = useState<string | null>(null);
  const [linkedClientError, setLinkedClientError] = useState<string | null>(null);
  const [linkedDealError, setLinkedDealError] = useState<string | null>(null);

  const name = conversation?.sender_name || "Usuario de Messenger";
  const messengerId = conversation?.external_user_id || null;
  const hasLinkedLead = Boolean(conversation?.linked_lead_id);
  const hasLinkedClient = Boolean(conversation?.linked_client_id);
  const hasLinkedDeal = Boolean(conversation?.linked_deal_id);
  const claraBotStatus = String((conversation as any)?.bot_status || "active").toLowerCase();
  const claraPaused = claraBotStatus === "paused";

  const isMeaningfulSenderName = useMemo(() => {
    const n = String(conversation?.sender_name || "").trim();
    if (!n) return false;
    return n.toLowerCase() !== "usuario de messenger";
  }, [conversation?.sender_name]);

  function formatLeadLabel(row: any) {
    const n = String(row?.name || "").trim();
    if (n) return n;
    const fn = String(row?.first_name || "").trim();
    const ln = String(row?.last_name || "").trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    const cn = String(row?.company_name || "").trim();
    if (cn) return cn;
    const em = String(row?.email || "").trim();
    if (em) return em;
    const ph = String(row?.phone || "").trim();
    if (ph) return ph;
    return "Prospecto";
  }

  function formatClientLabel(row: any) {
    const n = String(row?.name || "").trim();
    if (n) return n;
    const cn = String(row?.company_name || "").trim();
    if (cn) return cn;
    const cp = String(row?.contact_person || "").trim();
    if (cp) return cp;
    const em = String(row?.email || "").trim();
    if (em) return em;
    const ph = String(row?.phone || "").trim();
    if (ph) return ph;
    return "Cliente";
  }

  useEffect(() => {
    let cancelled = false;
    const companyId = profile?.company_id || null;
    if (!companyId || !conversation) {
      setLinkedLead(null);
      setLinkedClient(null);
      setLinkedDeal(null);
      setLinkedLeadError(null);
      setLinkedClientError(null);
      setLinkedDealError(null);
      return;
    }

    const db = supabase as any;

    const loadLead = async (leadId: string) => {
      setLinkedLeadError(null);
      const { data, error } = await db
        .from("leads")
        .select(
          "id, first_name, last_name, company_name, email, phone, whatsapp, status, source, source_channel, notes, estimated_value, assigned_to, metadata",
        )
        .eq("company_id", companyId)
        .eq("id", leadId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo cargar el prospecto vinculado.", { leadId, error });
        setLinkedLead(null);
        setLinkedLeadError("No se pudo cargar el prospecto vinculado.");
        return;
      }
      setLinkedLead(data || null);
    };

    const loadClient = async (clientId: string) => {
      setLinkedClientError(null);
      const { data, error } = await db
        .from("clients")
        .select("id, name, company_name, email, phone")
        .eq("company_id", companyId)
        .eq("id", clientId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo cargar el cliente vinculado.", { clientId, error });
        setLinkedClient(null);
        setLinkedClientError("No se pudo cargar el cliente vinculado.");
        return;
      }
      setLinkedClient(data || null);
    };

    const loadDeal = async (dealId: string) => {
      setLinkedDealError(null);
      const { data, error } = await db
        .from("deals")
        .select("id, name, stage, value")
        .eq("company_id", companyId)
        .eq("id", dealId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo cargar la oportunidad vinculada.", { dealId, error });
        setLinkedDeal(null);
        setLinkedDealError("No se pudo cargar la oportunidad vinculada.");
        return;
      }
      setLinkedDeal(data || null);
    };

    const loadNextTask = async (leadId: string) => {
      const { data, error } = await db
        .from("tasks")
        .select("id,title,due_date,priority,status,assigned_to,created_at")
        .eq("company_id", companyId)
        .eq("related_lead_id", leadId)
        .in("status", ["To Do", "In Progress"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo cargar el seguimiento.", { leadId, error });
        setNextTask(null);
        return;
      }
      setNextTask(data || null);
    };

    const leadId = conversation.linked_lead_id ? String(conversation.linked_lead_id) : "";
    const clientId = conversation.linked_client_id ? String(conversation.linked_client_id) : "";
    const dealId = conversation.linked_deal_id ? String(conversation.linked_deal_id) : "";

    if (leadId) {
      void loadLead(leadId);
      void loadNextTask(leadId);
    } else {
      setLinkedLead(null);
      setNextTask(null);
    }
    if (clientId) void loadClient(clientId);
    else setLinkedClient(null);
    if (dealId) void loadDeal(dealId);
    else setLinkedDeal(null);

    return () => {
      cancelled = true;
    };
  }, [
    conversation?.id,
    conversation?.linked_lead_id,
    conversation?.linked_client_id,
    conversation?.linked_deal_id,
    profile?.company_id,
  ]);

  const leadDisplayName = useMemo(() => {
    if (!linkedLead) return null;
    const n = String(linkedLead.name || "").trim();
    if (n) return n;
    const fn = String(linkedLead.first_name || "").trim();
    const ln = String(linkedLead.last_name || "").trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    const cn = String(linkedLead.company_name || "").trim();
    if (cn) return cn;
    const em = String(linkedLead.email || "").trim();
    if (em) return em;
    const ph = String(linkedLead.phone || "").trim();
    if (ph) return ph;
    return "Prospecto vinculado";
  }, [linkedLead]);

  const clientDisplayName = useMemo(() => {
    if (!linkedClient) return null;
    const n = String(linkedClient.name || "").trim();
    if (n) return n;
    const cn = String(linkedClient.company_name || "").trim();
    if (cn) return cn;
    const em = String(linkedClient.email || "").trim();
    if (em) return em;
    const ph = String(linkedClient.phone || "").trim();
    if (ph) return ph;
    return "Cliente vinculado";
  }, [linkedClient]);

  const dealDisplayName = useMemo(() => {
    if (!linkedDeal) return null;
    const n = String(linkedDeal.name || "").trim();
    if (n) return n;
    return "Oportunidad vinculada";
  }, [linkedDeal]);

  const showMetaHelper = useMemo(() => {
    if (!conversation) return false;
    return !conversation.sender_name || !conversation.sender_profile_pic;
  }, [conversation]);

  // Many CRM tables use auth.users(id) for assigned_to/created_by. Prefer profile.user_id (auth uid), not profile.id.
  const actorUserId = profile?.user_id || null;

  const canCreateFollowUp = Boolean(
    conversation && hasLinkedLead && profile?.company_id && actorUserId && can("tasks.create"),
  );

  const canCreateDeal = Boolean(
    conversation &&
    hasLinkedLead &&
    !hasLinkedDeal &&
    !linkedDeal &&
    profile?.company_id &&
    actorUserId &&
    can("deals.create"),
  );

  const followUpDisabledReason = useMemo(() => {
    if (!conversation) return "Selecciona una conversación.";
    if (!profile?.company_id) return "No se pudo detectar la empresa actual.";
    if (!actorUserId) return "No se pudo detectar tu usuario.";
    if (!conversation.linked_lead_id)
      return "Crea o vincula un prospecto para activar seguimientos.";
    if (!can("tasks.create")) return "No tienes permiso para crear seguimiento.";
    return null;
  }, [actorUserId, can, conversation, profile?.company_id]);

  const dealDisabledReason = useMemo(() => {
    if (!conversation) return "Selecciona una conversación.";
    if (!profile?.company_id) return "No se pudo detectar la empresa actual.";
    if (!actorUserId) return "No se pudo detectar tu usuario.";
    if (!conversation.linked_lead_id)
      return "Crea o vincula un prospecto para activar oportunidades.";
    if (conversation.linked_deal_id || linkedDeal) return "Oportunidad ya creada o vinculada.";
    if (!can("deals.create")) return "No tienes permiso para crear oportunidades.";
    return null;
  }, [actorUserId, can, conversation, linkedDeal, profile?.company_id]);

  function openFollowUpDialog() {
    if (!conversation) return;
    if (!conversation.linked_lead_id) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    const lastMsg = String(conversation.last_message_text || "").trim();
    window.dispatchEvent(
      new CustomEvent("corevix:open-task-create", {
        detail: {
          initialValues: {
            title: "Seguimiento Messenger",
            dueDate,
            priority: "Medium",
            description: `Seguimiento creado desde conversación de Messenger.\nID de Messenger: ${messengerId || "—"}\nÚltimo mensaje: ${lastMsg || "—"}`,
            assignedTo:
              (linkedLead?.assigned_to ? String(linkedLead.assigned_to) : null) ||
              actorUserId ||
              undefined,
            leadId: String(conversation.linked_lead_id),
          },
        },
      }),
    );
  }

  useEffect(() => {
    let cancelled = false;
    const companyId = profile?.company_id || null;
    if (!dealOpen || !companyId) return;

    const loadStages = async () => {
      setDealStagesError(null);
      const db = supabase as any;
      const { data, error } = await db
        .from("deal_stages")
        .select("name, display_order, is_won, is_lost")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.warn("No se pudieron cargar las etapas de oportunidades.", { companyId, error });
        setDealStages([]);
        setDealStagesError(error.message || "No se pudieron cargar las etapas.");
        return;
      }
      const rows = Array.isArray(data) ? data : [];
      setDealStages(
        rows
          .map((r: any) => ({
            name: String(r?.name || "").trim(),
            display_order: r?.display_order ?? null,
            is_won: r?.is_won ?? null,
            is_lost: r?.is_lost ?? null,
          }))
          .filter((r) => r.name.length > 0),
      );
    };

    void loadStages();
    return () => {
      cancelled = true;
    };
  }, [dealOpen, profile?.company_id]);

  function openDealDialog() {
    if (!conversation) return;
    if (!conversation.linked_lead_id) return;
    const leadLabel = leadDisplayName || "Prospecto";
    const nextName = `Oportunidad — ${leadLabel}`;
    const lastMsg = String(conversation.last_message_text || "").trim();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const expectedClose = in7.toISOString().slice(0, 10);

    // Choose a default stage: first non-won/non-lost, else fallback.
    const stageDefault =
      dealStages.find((s) => !s.is_won && !s.is_lost)?.name ||
      dealStages[0]?.name ||
      "New Opportunity";

    setDealValues({
      name: nextName,
      value: linkedLead?.estimated_value != null ? String(linkedLead.estimated_value) : "",
      stage: stageDefault,
      probability: "25",
      expected_close: expectedClose,
      notes: `Oportunidad creada desde conversación de Messenger.\nID de Messenger: ${messengerId || "—"}\nÚltimo mensaje: ${lastMsg || "—"}`,
    });
    setDealOpen(true);
  }

  async function handleCreateDeal() {
    if (!profile?.company_id || !actorUserId) {
      toast.error("No se pudo identificar el perfil actual");
      return;
    }
    if (!conversation?.linked_lead_id) {
      toast.error("Crea o vincula un prospecto para activar oportunidades.");
      return;
    }
    if (!can("deals.create")) {
      toast.error("No tienes permiso para crear oportunidades");
      return;
    }
    if (conversation.linked_deal_id || linkedDeal) return;

    const trimmedName = dealValues.name.trim();
    if (!trimmedName) {
      toast.error("El nombre de la oportunidad es requerido");
      return;
    }

    setDealSaving(true);
    try {
      const db = supabase as any;
      const leadId = String(conversation.linked_lead_id);

      // Duplicate prevention (best-effort): if a deal already exists for this lead, link it.
      const { data: existing, error: existingErr } = await db
        .from("deals")
        .select("id,name,stage,value,probability,expected_close,assigned_to")
        .eq("company_id", profile.company_id)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingErr) {
        toast.error(existingErr.message || "No se pudo validar si ya existe oportunidad");
        return;
      }
      if (existing?.id) {
        const { error: linkErr } = await db
          .from("meta_conversations")
          .update({ linked_deal_id: String(existing.id) })
          .eq("company_id", profile.company_id)
          .eq("id", conversation.id);
        if (linkErr) {
          toast.error(linkErr.message || "No se pudo vincular la oportunidad existente");
          return;
        }
        setLinkedDeal(existing);
        toast.message(
          "Ya existía una oportunidad para este prospecto. Fue vinculada a la conversación.",
        );
        onRefreshConversations?.();
        setDealOpen(false);
        return;
      }

      // Prefer auth uid for FK correctness (deals.assigned_to -> auth.users.id).
      const assignedTo: string | null =
        (linkedLead?.assigned_to ? String(linkedLead.assigned_to) : null) || actorUserId;
      const valueNum = Number(String(dealValues.value || "").replace(/,/g, ""));
      const probabilityNum = Number(String(dealValues.probability || "").trim());
      const payloadBase: Record<string, any> = {
        company_id: profile.company_id,
        lead_id: leadId,
        assigned_to: assignedTo,
        name: trimmedName,
        stage: (dealValues.stage || "New Opportunity").trim() || "New Opportunity",
        value: Number.isFinite(valueNum) ? valueNum : 0,
        probability: Number.isFinite(probabilityNum) ? probabilityNum : 25,
        expected_close: dealValues.expected_close || null,
        notes: dealValues.notes.trim() || null,
        created_by: actorUserId,
      };

      let created: any = null;
      const { data: createdTry, error: errTry } = await db
        .from("deals")
        .insert(payloadBase)
        .select("id,name,stage,value,probability,expected_close,assigned_to")
        .single();

      if (errTry) {
        const msg = String(errTry.message || "");
        if (
          msg.toLowerCase().includes("created_by") &&
          msg.toLowerCase().includes("does not exist")
        ) {
          const fallbackPayload = { ...payloadBase };
          delete fallbackPayload.created_by;
          const { data: createdFallback, error: errFallback } = await db
            .from("deals")
            .insert(fallbackPayload)
            .select("id,name,stage,value,probability,expected_close,assigned_to")
            .single();
          if (errFallback) {
            toast.error(errFallback.message || "No se pudo crear la oportunidad.");
            return;
          }
          created = createdFallback;
        } else if (msg.toLowerCase().includes("enum")) {
          const { data: createdFallback, error: errFallback } = await db
            .from("deals")
            .insert({ ...payloadBase, stage: "New Opportunity" })
            .select("id,name,stage,value,probability,expected_close,assigned_to")
            .single();
          if (errFallback) {
            toast.error(errFallback.message || "No se pudo crear la oportunidad.");
            return;
          }
          created = createdFallback;
        } else {
          toast.error(errTry.message || "No se pudo crear la oportunidad.");
          return;
        }
      } else {
        created = createdTry;
      }

      if (!created?.id) {
        toast.error("Oportunidad creada, pero no se pudo obtener el ID");
        return;
      }

      const { error: linkErr } = await db
        .from("meta_conversations")
        .update({ linked_deal_id: String(created.id) })
        .eq("company_id", profile.company_id)
        .eq("id", conversation.id);
      if (linkErr) {
        toast.error(linkErr.message || "No se pudo vincular la oportunidad a la conversación");
        return;
      }

      setLinkedDeal(created);
      onRefreshConversations?.();
      toast.success("Oportunidad creada desde Messenger.");
      setDealOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo crear la oportunidad.");
    } finally {
      setDealSaving(false);
    }
  }

  async function handleCreateLead() {
    if (!profile?.company_id || !actorUserId) {
      toast.error("No se pudo detectar la empresa actual.");
      return;
    }
    if (!conversation) return;
    if (conversation.linked_lead_id) return;
    if (!can("leads.create")) {
      toast.error("No tienes permiso para crear prospectos");
      return;
    }

    // If this was triggered from the confirmation dialog, skip the search step.
    if (!suggestOpen) {
      // Pre-check for possible duplicates before creating a new lead.
      setSuggestLoading(true);
      try {
        const db = supabase as any;
        const companyId = profile.company_id;
        const rowsLead: any[] = [];
        const rowsClient: any[] = [];

        if (messengerId) {
          const { data, error } = await db
            .from("leads")
            .select(
              "id, first_name, last_name, company_name, email, phone, whatsapp, status, source, source_channel, notes, estimated_value, assigned_to, metadata, source, source_channel, notes",
            )
            .eq("company_id", companyId)
            .ilike("notes", `%${messengerId}%`)
            .limit(5);
          if (!error && Array.isArray(data)) rowsLead.push(...data);
        }

        if (isMeaningfulSenderName) {
          const rawName = String(conversation?.sender_name || "").trim();
          const parts = rawName.split(/\s+/).filter(Boolean);
          const fn = parts[0] || "";
          const ln = parts.length > 1 ? parts.slice(1).join(" ") : "";
          if (fn) {
            const q = db
              .from("leads")
              .select(
                "id, first_name, last_name, company_name, email, phone, whatsapp, status, source, source_channel, notes, estimated_value, assigned_to, metadata, source, source_channel, notes",
              )
              .eq("company_id", companyId)
              .eq("first_name", fn);
            const { data, error } = ln ? await q.eq("last_name", ln).limit(5) : await q.limit(5);
            if (!error && Array.isArray(data)) rowsLead.push(...data);
          }

          // Conservative client match by name fields only.
          const { data: cdata, error: cerror } = await db
            .from("clients")
            .select("id, name, company_name, contact_person, email, phone")
            .eq("company_id", companyId)
            .or(
              `company_name.ilike.%${rawName}%,contact_person.ilike.%${rawName}%,name.ilike.%${rawName}%`,
            )
            .limit(5);
          if (!cerror && Array.isArray(cdata)) rowsClient.push(...cdata);
        }

        const uniq = <T,>(items: T[], keyFn: (t: T) => string) => {
          const out: T[] = [];
          const seen = new Set<string>();
          for (const it of items) {
            const k = keyFn(it);
            if (!k || seen.has(k)) continue;
            seen.add(k);
            out.push(it);
            if (out.length >= 5) break;
          }
          return out;
        };

        const leadOut = uniq(rowsLead, (r: any) => String(r?.id || ""));
        const clientOut = uniq(rowsClient, (r: any) => String(r?.id || ""));

        setLeadMatches(leadOut);
        setClientMatches(clientOut);

        if (leadOut.length || clientOut.length) {
          setSuggestOpen(true);
          return;
        }
      } catch {
        toast.message(
          "No se pudo revisar si el contacto ya existe. Puedes crear el prospecto manualmente.",
        );
      } finally {
        setSuggestLoading(false);
      }
    }

    setCreatingLead(true);
    try {
      const db = supabase as any;
      const rawName = String(name || "").trim();
      const parts = rawName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || "Usuario";
      // Some schemas require last_name NOT NULL. Use empty string when missing.
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
      const basePayload: Record<string, any> = {
        company_id: profile.company_id,
        first_name: firstName,
        last_name: lastName,
        phone: null,
        whatsapp: null,
        source: "Messenger",
        source_channel: "Messenger",
        status: "New",
        // Prefer auth uid for FK correctness (leads.assigned_to -> auth.users.id).
        assigned_to: actorUserId,
        notes: `Creado desde conversación de Messenger.\nID de Messenger: ${messengerId || "—"}`,
      };

      let leadId: string | null = null;
      const { data: createdWithChannel, error: createErrWithChannel } = await db
        .from("leads")
        .insert(basePayload)
        .select("id")
        .single();

      if (createErrWithChannel) {
        const msg = String(createErrWithChannel.message || "");
        if (
          msg.toLowerCase().includes("source_channel") &&
          msg.toLowerCase().includes("does not exist")
        ) {
          const fallbackPayload = { ...basePayload };
          delete fallbackPayload.source_channel;
          const { data: createdFallback, error: createErrFallback } = await db
            .from("leads")
            .insert(fallbackPayload)
            .select("id")
            .single();
          if (createErrFallback) {
            toast.error(createErrFallback.message || "No se pudo crear el prospecto");
            return;
          }
          leadId = createdFallback?.id ? String(createdFallback.id) : null;
        } else {
          toast.error(createErrWithChannel.message || "No se pudo crear el prospecto");
          return;
        }
      } else {
        leadId = createdWithChannel?.id ? String(createdWithChannel.id) : null;
      }

      if (!leadId) {
        toast.error("Prospecto creado, pero no se pudo obtener el ID");
        return;
      }

      const { error: linkErr } = await db
        .from("meta_conversations")
        .update({ linked_lead_id: leadId })
        .eq("company_id", profile.company_id)
        .eq("id", conversation.id);
      if (linkErr) {
        toast.message("Prospecto creado. Refresca la conversación para verlo conectado.");
        return;
      }

      toast.success("Prospecto creado desde Messenger.");
      onRefreshConversations?.();
    } finally {
      setCreatingLead(false);
    }
  }

  async function handleLinkLead(leadId: string) {
    if (!profile?.company_id || !conversation) return;
    const db = supabase as any;
    const { error } = await db
      .from("meta_conversations")
      .update({ linked_lead_id: leadId })
      .eq("company_id", profile.company_id)
      .eq("id", conversation.id);
    if (error) {
      toast.error(error.message || "No se pudo vincular el prospecto.");
      return;
    }
    toast.success("Prospecto vinculado a Messenger.");
    setSuggestOpen(false);
    onRefreshConversations?.();
  }

  async function handleLinkClient(clientId: string) {
    if (!profile?.company_id || !conversation) return;
    const db = supabase as any;
    const { error } = await db
      .from("meta_conversations")
      .update({ linked_client_id: clientId })
      .eq("company_id", profile.company_id)
      .eq("id", conversation.id);
    if (error) {
      toast.error(error.message || "No se pudo vincular el cliente.");
      return;
    }
    toast.success("Cliente vinculado a Messenger.");
    setSuggestOpen(false);
    onRefreshConversations?.();
  }
  return (
    <aside
      className={cn("min-h-0 border-l border-black/10 bg-[#f0f2f5] overflow-y-auto p-4", className)}
    >
      <div className="space-y-3">
        <CardSection title="Clara Rodríguez">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">
                  {claraPaused ? "Clara está pausada" : "Clara está activa"}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                  {claraPaused
                    ? "La asistente no responderá automáticamente en esta conversación."
                    : "La asistente responderá automáticamente con AI_ONLY."}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  claraPaused ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
                )}
              >
                {claraPaused ? "Pausada" : "Activa"}
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              variant={claraPaused ? "default" : "outline"}
              className="w-full"
              onClick={onToggleBotStatus}
              disabled={!conversation || !onToggleBotStatus}
            >
              {claraPaused ? "Activar Clara" : "Pausar Clara"}
            </Button>
          </div>
        </CardSection>

        <CardSection title="Identidad">
          <div className="flex items-start gap-3 min-w-0">
            <WhatsappAvatar
              name={name}
              imageUrl={conversation?.sender_profile_pic || null}
              size={42}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-semibold tracking-[-0.025em] truncate text-slate-900">
                {name}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                  Messenger
                </span>
                {conversation?.status ? (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-muted/30 text-muted-foreground border-border/60">
                    {formatConversationStatus(conversation.status)}
                  </span>
                ) : null}
              </div>
              {showMetaHelper ? (
                <div className="mt-2 text-[12px] text-slate-600">
                  Meta no siempre entrega nombre o foto del usuario. Puedes crear o vincular un
                  prospecto para completar su información.
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <InfoRow label="Estado" value={formatConversationStatus(conversation?.status)} />
            <InfoRow label="Último mensaje" value={conversation?.last_message_text || null} />
            <InfoRow label="ID de Messenger" value={messengerId} />
          </div>
        </CardSection>

        <CardSection title="Relación CRM">
          <div className="space-y-3">
            <div>
              <div className="text-[12px] font-medium text-slate-800">Prospecto vinculado</div>
              <div className="mt-1 text-[13px] text-slate-900">
                {!hasLinkedLead
                  ? "Sin vincular"
                  : linkedLeadError
                    ? linkedLeadError
                    : leadDisplayName || "Prospecto vinculado"}
              </div>
              {linkedLead && (linkedLead.email || linkedLead.phone) ? (
                <div className="mt-1 text-[12px] text-slate-500">
                  {[linkedLead.email, linkedLead.phone].filter(Boolean).join(" · ")}
                </div>
              ) : null}
              {linkedLead && (linkedLead.stage || linkedLead.status) ? (
                <div className="mt-1 text-[11px] text-slate-500">
                  {linkedLead.stage
                    ? `Etapa: ${String(linkedLead.stage)}`
                    : `Estado: ${String(linkedLead.status)}`}
                </div>
              ) : null}
              {hasLinkedLead ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => (window.location.href = "/leads")}
                  >
                    Abrir prospecto
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="h-px bg-black/5" />

            <div>
              <div className="text-[12px] font-medium text-slate-800">Cliente vinculado</div>
              <div className="mt-1 text-[13px] text-slate-900">
                {!hasLinkedClient
                  ? "Sin vincular"
                  : linkedClientError
                    ? linkedClientError
                    : clientDisplayName || "Cliente vinculado"}
              </div>
              {linkedClient && (linkedClient.email || linkedClient.phone) ? (
                <div className="mt-1 text-[12px] text-slate-500">
                  {[linkedClient.email, linkedClient.phone].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>

            <div className="h-px bg-black/5" />

            <div>
              <div className="text-[12px] font-medium text-slate-800">Oportunidad vinculada</div>
              <div className="mt-1 text-[13px] text-slate-900">
                {!hasLinkedDeal
                  ? "Sin vincular"
                  : linkedDealError
                    ? linkedDealError
                    : dealDisplayName || "Oportunidad vinculada"}
              </div>
              {linkedDeal &&
              (linkedDeal.stage ||
                (linkedDeal.value !== null && linkedDeal.value !== undefined)) ? (
                <div className="mt-1 text-[12px] text-slate-500">
                  {linkedDeal.stage ? `Etapa: ${String(linkedDeal.stage)}` : null}
                  {linkedDeal.stage && linkedDeal.value !== null && linkedDeal.value !== undefined
                    ? " · "
                    : null}
                  {linkedDeal.value !== null && linkedDeal.value !== undefined
                    ? `Valor: ${String(linkedDeal.value)}`
                    : null}
                </div>
              ) : null}
            </div>
          </div>
        </CardSection>

        <CardSection title="Acciones rápidas">
          <div className="grid gap-2">
            <Button
              type="button"
              variant="default"
              className="justify-start"
              disabled={!conversation || hasLinkedLead || creatingLead || suggestLoading}
              onClick={() => void handleCreateLead()}
            >
              {creatingLead || suggestLoading ? "Creando prospecto…" : "Crear prospecto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              disabled={!canCreateFollowUp}
              title={
                !canCreateFollowUp
                  ? followUpDisabledReason ||
                    "Crea o vincula un prospecto para activar seguimientos."
                  : "Crear seguimiento"
              }
              onClick={() => {
                if (!canCreateFollowUp) return;
                openFollowUpDialog();
              }}
            >
              Crear seguimiento
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              disabled={!canCreateDeal}
              title={
                !canCreateDeal
                  ? dealDisabledReason ||
                    (hasLinkedDeal || linkedDeal
                      ? "Oportunidad creada"
                      : "Crea o vincula un prospecto para activar oportunidades.")
                  : "Crear oportunidad"
              }
              onClick={() => {
                if (!canCreateDeal) return;
                openDealDialog();
              }}
            >
              Crear oportunidad
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              disabled
              title="Disponible en una próxima fase"
            >
              Convertir a cliente
            </Button>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-500">
            <div>La vinculación manual estará disponible en una próxima fase.</div>
            {!canCreateFollowUp ? (
              <div>
                {followUpDisabledReason || "Crea o vincula un prospecto para activar seguimientos."}
              </div>
            ) : null}
            {!canCreateDeal ? (
              <div>
                {dealDisabledReason || "Crea o vincula un prospecto para activar oportunidades."}
              </div>
            ) : null}
          </div>
        </CardSection>

        <CardSection title="Seguimiento">
          {nextTask ? (
            <div className="space-y-2">
              <InfoRow label="Título" value={String(nextTask.title || "")} />
              <InfoRow
                label="Fecha de vencimiento"
                value={nextTask.due_date ? String(nextTask.due_date) : "—"}
              />
              <InfoRow
                label="Prioridad"
                value={nextTask.priority ? String(nextTask.priority) : "—"}
              />
              <InfoRow label="Estado" value={nextTask.status ? String(nextTask.status) : "—"} />
            </div>
          ) : (
            <>
              <div className="text-[13px] text-slate-900">Sin seguimiento activo</div>
              <div className="mt-1 text-[12px] text-slate-500">
                Los seguimientos de Messenger estarán disponibles en una próxima fase.
              </div>
            </>
          )}
        </CardSection>

        <CardSection title="Oportunidad">
          {linkedDeal ? (
            <div className="space-y-2">
              <InfoRow label="Nombre" value={dealDisplayName} />
              <InfoRow label="Etapa" value={linkedDeal.stage ? String(linkedDeal.stage) : null} />
              <InfoRow
                label="Valor"
                value={
                  linkedDeal.value !== null && linkedDeal.value !== undefined
                    ? String(linkedDeal.value)
                    : null
                }
              />
              <InfoRow
                label="Probabilidad"
                value={
                  linkedDeal.probability !== null && linkedDeal.probability !== undefined
                    ? String(linkedDeal.probability)
                    : null
                }
              />
              <InfoRow
                label="Cierre esperado"
                value={linkedDeal.expected_close ? String(linkedDeal.expected_close) : null}
              />
            </div>
          ) : (
            <>
              <div className="text-[13px] text-slate-900">Sin oportunidad vinculada</div>
              <div className="mt-1 text-[12px] text-slate-500">
                Crea una oportunidad para llevar esta conversación al pipeline.
              </div>
            </>
          )}
        </CardSection>

        <CardSection title="Cliente">
          {linkedClient ? (
            <div className="space-y-2">
              <InfoRow label="Nombre" value={clientDisplayName} />
              <InfoRow
                label="Email"
                value={linkedClient.email ? String(linkedClient.email) : null}
              />
              <InfoRow
                label="Teléfono"
                value={linkedClient.phone ? String(linkedClient.phone) : null}
              />
            </div>
          ) : (
            <div className="text-[13px] text-slate-900">Sin cliente vinculado</div>
          )}
        </CardSection>

        <CardSection title="Información de Meta">
          <div className="space-y-2">
            <InfoRow label="ID de Messenger" value={messengerId} />
            <InfoRow label="Página (ID)" value={(conversation as any)?.page_id || null} />
          </div>
        </CardSection>
      </div>

      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear oportunidad</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateDeal();
            }}
          >
            <div>
              <Label>Nombre de oportunidad</Label>
              <Input
                value={dealValues.name}
                onChange={(e) => setDealValues((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor estimado</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={dealValues.value}
                  onChange={(e) => setDealValues((p) => ({ ...p, value: e.target.value }))}
                />
              </div>
              <div>
                <Label>Etapa</Label>
                <Select
                  value={dealValues.stage}
                  onValueChange={(v) => setDealValues((p) => ({ ...p, stage: v }))}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={dealStagesError ? "New Opportunity" : "Selecciona una etapa"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(dealStages.length
                      ? dealStages
                      : [
                          {
                            name: "New Opportunity",
                            display_order: 0,
                            is_won: false,
                            is_lost: false,
                          },
                        ]
                    ).map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Probabilidad</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={dealValues.probability}
                  onChange={(e) => setDealValues((p) => ({ ...p, probability: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cierre esperado</Label>
                <Input
                  type="date"
                  value={dealValues.expected_close}
                  onChange={(e) => setDealValues((p) => ({ ...p, expected_close: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={dealValues.notes}
                onChange={(e) => setDealValues((p) => ({ ...p, notes: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDealOpen(false)}
                disabled={dealSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={dealSaving}>
                {dealSaving ? "Creando…" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={suggestOpen}
        onOpenChange={(open) => {
          setSuggestOpen(open);
          if (!open) {
            setLeadMatches([]);
            setClientMatches([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Posible contacto existente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-slate-600">
              Encontramos registros que podrían pertenecer a esta conversación de Messenger.
            </div>

            {leadMatches.length ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Prospectos
                </div>
                {leadMatches.map((l) => (
                  <div
                    key={String(l.id)}
                    className="rounded-xl border border-black/5 bg-white p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {formatLeadLabel(l)}
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-500 truncate">
                        {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                        {[l.status, l.stage, l.source_channel || l.source]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleLinkLead(String(l.id))}
                    >
                      Vincular este prospecto
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {clientMatches.length ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Clientes
                </div>
                {clientMatches.map((c) => (
                  <div
                    key={String(c.id)}
                    className="rounded-xl border border-black/5 bg-white p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">
                        {formatClientLabel(c)}
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-500 truncate">
                        {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleLinkClient(String(c.id))}
                    >
                      Vincular este cliente
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSuggestOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Run create flow again, but now suggestOpen=true so it skips the pre-check.
                  void handleCreateLead();
                }}
              >
                Crear nuevo prospecto de todos modos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
