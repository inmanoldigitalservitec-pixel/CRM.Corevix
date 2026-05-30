import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Copy, Eye, UserRound, CheckCircle2, Calendar, BriefcaseBusiness, UserCog, Mail, Phone } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { CrmWhatsappConversationListRow, CrmWhatsappMessageRow } from "@/lib/whatsapp/view-types";
import { WhatsappAvatar } from "@/components/whatsapp/whatsapp-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CrmDetailSection } from "@/components/crm/crm-detail";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extractLeadDataFromMessages } from "@/lib/whatsapp/extract-lead-data";
import { matchProductInterest, type ProductInterestInputProduct } from "@/lib/products/match-product-interest";
import { sendWhatsappMessage } from "@/lib/whatsapp/whatsapp-bot-api";
import {
  buildWhatsappUtilityActions,
  formatServiceWindowRemaining,
  type WhatsappUtilityActionContext,
  type WhatsappUtilityActionDefinition,
  type WhatsappUtilityActionId,
  type WhatsappUtilityProposalContext,
} from "@/lib/whatsapp/service-window";

function toPhoneForWaMe(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function formatDateLabel(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const ymd = d.toISOString().slice(0, 10);
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return raw.includes("T") ? `${ymd} ${hm}` : ymd;
}

type CompanyTeamMember = {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean;
  role: string;
};

type LeadRow = {
  id: string;
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  company_name: string | null;
  source: string | null;
  source_channel: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  estimated_value: number | null;
  metadata: any | null;
};

type DealRow = {
  id: string;
  company_id: string;
  lead_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  name: string;
  stage: string;
  value: number;
  probability: number | null;
  expected_close: string | null;
  notes: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string | null;
  status: string;
  assigned_to: string | null;
};

type ProjectRow = {
  id: string;
  company_id: string;
  name: string;
  status: string;
  due_date: string | null;
  lead_id: string | null;
  client_id: string | null;
  deal_id: string | null;
  product_id: string | null;
};

type ClientRow = {
  id: string;
  company_id: string;
  company_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string | null;
};

type ProductRow = ProductInterestInputProduct & {
  category?: string | null;
  base_price?: number | null;
  is_active?: boolean | null;
};

type ProposalRow = {
  id: string;
  title: string;
  amount: number;
  currency: string | null;
  content: string | null;
  status: string | null;
  product_id: string | null;
  lead_id?: string | null;
  client_id?: string | null;
  deal_id?: string | null;
  whatsapp_conversation_id?: string | null;
  public_token?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatPersonName(first?: string | null, last?: string | null) {
  const full = `${first || ""} ${last || ""}`.trim();
  return full || null;
}

export function WhatsappContactPanel({
  conversation,
  messages,
  className,
  onRefreshConversations,
  isServiceWindowOpen,
  lastInboundAt,
  serviceWindowExpiresAt,
  remainingServiceWindowMs,
  serviceWindowLabel,
}: {
  conversation: CrmWhatsappConversationListRow | null;
  messages: CrmWhatsappMessageRow[];
  className?: string;
  onRefreshConversations?: () => void;
  isServiceWindowOpen?: boolean;
  lastInboundAt?: string | null;
  serviceWindowExpiresAt?: string | null;
  remainingServiceWindowMs?: number;
  serviceWindowLabel?: string | null;
}) {
  const { profile, user, roles } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const [team, setTeam] = useState<CompanyTeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [nextTask, setNextTask] = useState<TaskRow | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [followUpValues, setFollowUpValues] = useState({ title: "", due_date: "", priority: "Medium", description: "" });

  const [creatingDeal, setCreatingDeal] = useState(false);
  const [convertingClient, setConvertingClient] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [updatingConversation, setUpdatingConversation] = useState(false);
  const [creatingLeadFromWhatsapp, setCreatingLeadFromWhatsapp] = useState(false);

  const isAdminLike = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const isSalesAgent = roles?.includes("sales_agent") ?? false;
  const isViewer = roles?.includes("viewer") ?? false;

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [markingInterest, setMarkingInterest] = useState<string | null>(null);

  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [dealProductIds, setDealProductIds] = useState<string[]>([]);
  const [leadProductIds, setLeadProductIds] = useState<string[]>([]);
  const [proposalSends, setProposalSends] = useState<any[]>([]);
  const [proposalSendsLoading, setProposalSendsLoading] = useState(false);
  const [registeringProposalSend, setRegisteringProposalSend] = useState(false);
  const [copyingProposalLink, setCopyingProposalLink] = useState(false);
  const [detectedExpanded, setDetectedExpanded] = useState(false);
  const [activeUtilityActionId, setActiveUtilityActionId] = useState<WhatsappUtilityActionId | null>(null);

  const extracted = useMemo(() => extractLeadDataFromMessages(messages || []), [messages]);

  const productSuggestions = useMemo(() => {
    if (!products.length) return [];
    return matchProductInterest({ products, messages, topN: 3 });
  }, [products, messages]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p.id) === String(selectedProductId)) ?? null;
  }, [products, selectedProductId]);

  const productNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      if (p?.id && p?.name) m.set(String(p.id), String(p.name));
    }
    return m;
  }, [products]);

  const teamByUserId = useMemo(() => {
    const m = new Map<string, CompanyTeamMember>();
    for (const member of team) {
      if (member?.user_id) m.set(member.user_id, member);
    }
    return m;
  }, [team]);

  const assignableMembers = useMemo(() => {
    const allowed = new Set(["sales_agent", "manager", "admin", "super_admin"]);
    return team.filter((m) => m.is_active && allowed.has(m.role));
  }, [team]);

  const canMarkLeadInterest = useMemo(() => {
    if (isViewer) return false;
    if (isAdminLike) return true;
    if (isSalesAgent) return Boolean(user?.id && lead?.assigned_to && String(lead.assigned_to) === String(user.id));
    return false;
  }, [isViewer, isAdminLike, isSalesAgent, lead?.assigned_to, user?.id]);

  const canRegisterProposalSend = useMemo(() => {
    if (isViewer) return false;
    if (isAdminLike) return true;
    if (!isSalesAgent) return false;
    if (!user?.id) return false;
    const ownsLead = Boolean(lead?.assigned_to && String(lead.assigned_to) === String(user.id));
    const ownsDeal = Boolean(deal?.assigned_to && String(deal.assigned_to) === String(user.id));
    return ownsLead || ownsDeal;
  }, [deal?.assigned_to, isAdminLike, isSalesAgent, isViewer, lead?.assigned_to, user?.id]);

  const canCreateProposal = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;
  const proposalCreateSearch = useMemo(
    () => ({
      ...(lead?.id ? { leadId: String(lead.id) } : {}),
      ...(deal?.id ? { dealId: String(deal.id) } : {}),
      ...(conversation?.conversation_id ? { conversationId: String(conversation.conversation_id) } : {}),
      ...(selectedProductId ? { productId: String(selectedProductId) } : {}),
      ...(client?.id ? { clientId: String(client.id) } : {}),
    }),
    [client?.id, conversation?.conversation_id, deal?.id, lead?.id, selectedProductId],
  );

  function enforceOwnLeadForSales(message: string) {
    if (!isSalesAgent) return true;
    if (!user?.id) return false;
    if (!lead?.assigned_to) return false;
    if (String(lead.assigned_to) !== String(user.id)) {
      toast.error(message);
      return false;
    }
    return true;
  }

  const name =
    conversation?.display_name ||
    conversation?.contact_name ||
    conversation?.whatsapp_profile_name ||
    conversation?.phone ||
    "Sin nombre";
  const phone = conversation?.phone || "";
  const waMe = phone ? `https://wa.me/${toPhoneForWaMe(phone)}` : null;

  useEffect(() => {
    let cancelled = false;
    const loadTeam = async () => {
      if (!profile?.company_id) {
        setTeam([]);
        return;
      }
      setTeamLoading(true);

      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("get_company_team_members", {
        _search: null,
        _role: null,
        _is_active: true,
        _department: null,
      });

      if (!cancelled && !rpcErr && Array.isArray(rpcData)) {
        setTeam(
          rpcData.map((r: any) => ({
            profile_id: r.profile_id,
            user_id: r.user_id,
            full_name: r.full_name ?? null,
            email: r.email ?? null,
            is_active: r.is_active !== false,
            role: r.role,
          })),
        );
        setTeamLoading(false);
        return;
      }

      const [{ data: profiles, error: pErr }, { data: rolesRows, error: rErr }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, user_id, full_name, email, is_active")
          .eq("company_id", profile.company_id)
          .eq("is_active", true),
        (supabase as any).from("user_roles").select("user_id, role"),
      ]);

      if (cancelled) return;
      if (pErr || rErr) {
        setTeam([]);
        setTeamLoading(false);
        return;
      }

      const roleByUserId = new Map<string, string>();
      for (const row of rolesRows || []) {
        if (!roleByUserId.has(row.user_id)) roleByUserId.set(row.user_id, row.role);
      }

      setTeam(
        (profiles || []).map((p: any) => ({
          profile_id: p.id,
          user_id: p.user_id,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          is_active: p.is_active !== false,
          role: roleByUserId.get(p.user_id) || "viewer",
        })),
      );
      setTeamLoading(false);
    };

    void loadTeam();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      if (!profile?.company_id) {
        setProducts([]);
        return;
      }
      setProductsLoading(true);
      try {
        const db = supabase as any;
        const { data, error } = await db
          .from("products")
          .select("id,name,category,base_price,keywords,is_active")
          .eq("company_id", profile.company_id)
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (cancelled) return;
        if (error) {
          setProducts([]);
          return;
        }
        setProducts((Array.isArray(data) ? data : []) as ProductRow[]);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  useEffect(() => {
    if (!productSuggestions.length) {
      setSelectedProductId(null);
      return;
    }
    if (selectedProductId && productSuggestions.some((s) => String(s.product.id) === String(selectedProductId))) return;
    setSelectedProductId(String(productSuggestions[0].product.id));
  }, [productSuggestions, selectedProductId]);

  useEffect(() => {
    let cancelled = false;
    const loadProposals = async () => {
      if (!profile?.company_id) {
        setProposals([]);
        return;
      }
      setProposalsLoading(true);
      try {
        const db = supabase as any;
        const { data, error } = await db
          .from("proposals")
          .select("id,title,amount,currency,content,status,product_id,lead_id,client_id,deal_id,whatsapp_conversation_id,public_token,created_at,updated_at")
          .eq("company_id", profile.company_id)
          .order("updated_at", { ascending: false })
          .limit(200);
        if (cancelled) return;
        if (error) {
          setProposals([]);
          return;
        }
        setProposals((Array.isArray(data) ? data : []) as ProposalRow[]);
      } finally {
        if (!cancelled) setProposalsLoading(false);
      }
    };

    void loadProposals();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  useEffect(() => {
    let cancelled = false;
    const loadDealAndLeadProducts = async () => {
      if (!profile?.company_id) {
        setDealProductIds([]);
        setLeadProductIds([]);
        return;
      }

      const dealId = deal?.id ? String(deal.id) : null;
      const leadId = lead?.id ? String(lead.id) : null;
      if (!dealId && !leadId) {
        setDealProductIds([]);
        setLeadProductIds([]);
        return;
      }

      try {
        const db = supabase as any;
        const [dealProductsRes, leadProductsRes] = await Promise.all([
          dealId
            ? db.from("deal_products").select("product_id").eq("company_id", profile.company_id).eq("deal_id", dealId)
            : Promise.resolve({ data: [], error: null }),
          leadId
            ? db.from("lead_products").select("product_id").eq("company_id", profile.company_id).eq("lead_id", leadId)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (cancelled) return;
        if (!dealProductsRes.error) {
          setDealProductIds(
            (Array.isArray(dealProductsRes.data) ? dealProductsRes.data : [])
              .map((r: any) => (r?.product_id ? String(r.product_id) : null))
              .filter(Boolean) as string[],
          );
        }
        if (!leadProductsRes.error) {
          setLeadProductIds(
            (Array.isArray(leadProductsRes.data) ? leadProductsRes.data : [])
              .map((r: any) => (r?.product_id ? String(r.product_id) : null))
              .filter(Boolean) as string[],
          );
        }
      } catch {
        if (!cancelled) {
          setDealProductIds([]);
          setLeadProductIds([]);
        }
      }
    };

    void loadDealAndLeadProducts();
    return () => {
      cancelled = true;
    };
  }, [deal?.id, lead?.id, profile?.company_id]);

  const relevantProposalProductIds = useMemo(() => {
    const s = new Set<string>();
    if (selectedProductId) s.add(String(selectedProductId));
    for (const id of dealProductIds) s.add(String(id));
    for (const id of leadProductIds) s.add(String(id));
    return s;
  }, [dealProductIds, leadProductIds, selectedProductId]);

  const orderedProposals = useMemo(() => {
    const conversationId = conversation?.conversation_id ? String(conversation.conversation_id) : null;
    const leadId = lead?.id ? String(lead.id) : null;
    const dealId = deal?.id ? String(deal.id) : null;
    const clientId = client?.id ? String(client.id) : null;

    const statusScore = (status: string | null | undefined) => {
      const raw = String(status || "").toLowerCase();
      if (raw === "active") return 0;
      if (raw === "draft") return 1;
      if (raw === "sent") return 2;
      if (raw === "viewed") return 3;
      if (raw === "accepted") return 4;
      return 10;
    };

    return [...proposals].sort((a, b) => {
      const aContextRank = conversationId && String(a.whatsapp_conversation_id || "") === conversationId
        ? 0
        : dealId && String(a.deal_id || "") === dealId
          ? 1
          : leadId && String(a.lead_id || "") === leadId
            ? 2
            : clientId && String(a.client_id || "") === clientId
              ? 3
              : a.product_id && relevantProposalProductIds.has(String(a.product_id))
                ? 4
                : 5;
      const bContextRank = conversationId && String(b.whatsapp_conversation_id || "") === conversationId
        ? 0
        : dealId && String(b.deal_id || "") === dealId
          ? 1
          : leadId && String(b.lead_id || "") === leadId
            ? 2
            : clientId && String(b.client_id || "") === clientId
              ? 3
              : b.product_id && relevantProposalProductIds.has(String(b.product_id))
                ? 4
                : 5;
      if (aContextRank !== bContextRank) return aContextRank - bContextRank;

      const sa = statusScore(a.status);
      const sb = statusScore(b.status);
      if (sa !== sb) return sa - sb;
      const ad = a.updated_at || a.created_at ? new Date(a.updated_at || a.created_at || "").getTime() : 0;
      const bd = b.updated_at || b.created_at ? new Date(b.updated_at || b.created_at || "").getTime() : 0;
      return bd - ad;
    });
  }, [client?.id, conversation?.conversation_id, deal?.id, lead?.id, proposals, relevantProposalProductIds]);

  const selectedProposal = useMemo(() => {
    if (!selectedProposalId) return null;
    return orderedProposals.find((p) => String(p.id) === String(selectedProposalId)) ?? null;
  }, [orderedProposals, selectedProposalId]);

  const utilityActionContext = useMemo<WhatsappUtilityActionContext | null>(() => {
    if (!conversation) return null;
    const recipientName =
      conversation.display_name ||
      conversation.contact_name ||
      conversation.whatsapp_profile_name ||
      formatPersonName(lead?.first_name, lead?.last_name) ||
      lead?.company_name ||
      conversation.phone ||
      "Sin nombre";

    const proposalContext: WhatsappUtilityProposalContext | null = selectedProposal
      ? {
          id: String(selectedProposal.id),
          title: String(selectedProposal.title || "Propuesta"),
          publicUrl: buildProposalPublicUrl(selectedProposal) || "",
          productName: selectedProposal.product_id ? productNameById.get(String(selectedProposal.product_id)) || null : null,
        }
      : null;
    const validProposalContext = proposalContext && proposalContext.publicUrl ? proposalContext : null;

    const dealName = deal?.name || null;
    const leadName = lead?.company_name || formatPersonName(lead?.first_name, lead?.last_name) || null;
    const clientName = client?.company_name || null;
    const productName = selectedProduct?.name || proposalContext?.productName || null;
    const conversationTopic =
      project?.name ||
      productName ||
      lead?.metadata?.selected_service ||
      lead?.source_channel ||
      lead?.source ||
      dealName ||
      leadName ||
      clientName ||
      "tu solicitud";

    return {
      recipientName,
      phone: conversation.phone || lead?.phone || lead?.whatsapp || null,
      leadName,
      dealName,
      projectName: project?.name || null,
      clientName,
      productName,
      proposal: validProposalContext,
      nextTaskTitle: nextTask?.title || null,
      nextTaskDueDate: nextTask?.due_date || null,
      conversationTopic: String(conversationTopic || "").trim() || null,
    };
  }, [client?.company_name, conversation, deal?.name, lead?.company_name, lead?.first_name, lead?.last_name, lead?.metadata, lead?.phone, lead?.source, lead?.source_channel, lead?.whatsapp, nextTask?.due_date, nextTask?.title, productNameById, project?.name, selectedProduct?.name, selectedProposal]);

  const utilityActions = useMemo<WhatsappUtilityActionDefinition[]>(
    () => buildWhatsappUtilityActions(utilityActionContext),
    [utilityActionContext],
  );

  const activeUtilityAction = useMemo(
    () => utilityActions.find((action) => action.id === activeUtilityActionId) ?? null,
    [activeUtilityActionId, utilityActions],
  );

  const serviceWindowClosed = isServiceWindowOpen === false;
  const serviceWindowLabelText = serviceWindowLabel || formatServiceWindowRemaining(remainingServiceWindowMs || 0);

  async function handleConfirmUtilityAction() {
    if (!activeUtilityAction) return;
    try {
      await navigator.clipboard.writeText(activeUtilityAction.preview);
      toast.success("Plantilla preparada. Configura el envío de templates para enviarla automáticamente.");
      setActiveUtilityActionId(null);
    } catch {
      toast.error("No se pudo copiar la plantilla preparada.");
    }
  }



  useEffect(() => {
    if (!orderedProposals.length) {
      setSelectedProposalId(null);
      return;
    }
    if (selectedProposalId && orderedProposals.some((p) => String(p.id) === String(selectedProposalId))) return;
    setSelectedProposalId(String(orderedProposals[0].id));
  }, [orderedProposals, selectedProposalId]);

  useEffect(() => {
    let cancelled = false;
    const loadProposalSends = async () => {
      if (!profile?.company_id) {
        setProposalSends([]);
        return;
      }

      const convId = conversation?.conversation_id ? String(conversation.conversation_id) : null;
      const leadId = lead?.id ? String(lead.id) : null;
      const clientId = client?.id ? String(client.id) : null;
      const dealId = deal?.id ? String(deal.id) : null;
      const filters: string[] = [];
      if (convId) filters.push(`whatsapp_conversation_id.eq.${convId}`);
      if (leadId) filters.push(`lead_id.eq.${leadId}`);
      if (clientId) filters.push(`client_id.eq.${clientId}`);
      if (dealId) filters.push(`deal_id.eq.${dealId}`);

      if (!filters.length) {
        setProposalSends([]);
        return;
      }

      setProposalSendsLoading(true);
      try {
        const db = supabase as any;
        const { data, error } = await db
          .from("proposal_sends")
          .select("id,proposal_id,product_id,lead_id,client_id,deal_id,whatsapp_conversation_id,sent_at,status,created_by,sent_to_phone,proposal:proposals(id,title,product_id,public_token)")
          .eq("company_id", profile.company_id)
          .or(filters.join(","))
          .order("sent_at", { ascending: false })
          .limit(15);
        if (cancelled) return;
        if (error) {
          setProposalSends([]);
          return;
        }
        setProposalSends(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setProposalSendsLoading(false);
      }
    };

    void loadProposalSends();
    return () => {
      cancelled = true;
    };
  }, [client?.id, conversation?.conversation_id, deal?.id, lead?.id, profile?.company_id]);

  function buildProposalPublicUrl(pr: ProposalRow) {
    const token = String(pr.public_token || "").trim();
    if (!token) return null;
    return `${window.location.origin}/proposal/public/${token}`;
  }

  async function handleCopyProposal() {
    if (!selectedProposal) return;
    const publicUrl = buildProposalPublicUrl(selectedProposal);
    if (!publicUrl) {
      toast.error("Esta propuesta no tiene enlace público.");
      return;
    }
    setCopyingProposalLink(true);
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Enlace de propuesta copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace de la propuesta.");
    } finally {
      setCopyingProposalLink(false);
    }
  }

  async function handleRegisterProposalSend() {
    if (!profile?.company_id || !user?.id) return;
    if (!selectedProposal) return;
    if (!canRegisterProposalSend) {
      toast.error("No tienes permisos para registrar envíos de propuestas");
      return;
    }

    const convId = conversation?.conversation_id ? String(conversation.conversation_id) : null;
    if (!convId) {
      toast.error("No se pudo identificar la conversación de WhatsApp");
      return;
    }

    setRegisteringProposalSend(true);
    try {
      const db = supabase as any;
      const leadId = lead?.id ? String(lead.id) : conversation?.lead_id ? String(conversation.lead_id) : null;
      const clientId = client?.id ? String(client.id) : deal?.client_id ? String(deal.client_id) : null;
      const dealId = deal?.id ? String(deal.id) : null;
      const sentToPhone = (lead?.whatsapp || lead?.phone || conversation?.phone || null) ? String(lead?.whatsapp || lead?.phone || conversation?.phone) : null;
      const publicUrl = buildProposalPublicUrl(selectedProposal);

      const { error } = await db
        .from("proposal_sends")
        .insert({
          company_id: profile.company_id,
          proposal_id: selectedProposal.id,
          product_id: selectedProposal.product_id,
          lead_id: leadId,
          client_id: clientId,
          deal_id: dealId,
          whatsapp_conversation_id: convId,
          sent_to_phone: sentToPhone,
          status: "sent",
          sent_at: new Date().toISOString(),
          created_by: user.id,
        })
        .select("id")
        .maybeSingle();

      if (error) {
        toast.error(error.message || "No se pudo registrar el envío");
        return;
      }

      let sentByBot = false;
      let copiedFallback = false;
      if (publicUrl) {
        const proposalMessage = `Hola, te comparto esta propuesta:\n${selectedProposal.title}\n${publicUrl}`;
        try {
          await sendWhatsappMessage(convId, proposalMessage);
          sentByBot = true;
        } catch {
          try {
            await navigator.clipboard.writeText(publicUrl);
            copiedFallback = true;
          } catch {
            // Ignore clipboard fallback failure; registration already succeeded.
          }
        }
      }

      if (sentByBot) {
        toast.success("Propuesta enviada por WhatsApp y registrada.");
      } else if (copiedFallback) {
        toast.success("Enlace copiado y envío registrado.");
      } else if (publicUrl) {
        toast.success("Propuesta registrada.");
      } else {
        toast.success("Propuesta registrada, pero no tiene enlace público.");
      }
      const { data, error: reloadErr } = await db
        .from("proposal_sends")
        .select("id,proposal_id,product_id,lead_id,client_id,deal_id,whatsapp_conversation_id,sent_at,status,created_by,sent_to_phone,proposal:proposals(id,title,product_id,public_token)")
        .eq("company_id", profile.company_id)
        .or(`whatsapp_conversation_id.eq.${convId}${leadId ? `,lead_id.eq.${leadId}` : ""}${clientId ? `,client_id.eq.${clientId}` : ""}${dealId ? `,deal_id.eq.${dealId}` : ""}`)
        .order("sent_at", { ascending: false })
        .limit(15);
      if (!reloadErr) setProposalSends(Array.isArray(data) ? data : []);
      onRefreshConversations?.();
    } finally {
      setRegisteringProposalSend(false);
    }
  }

  async function handleMarkLeadInterest(productId: string) {
    if (!profile?.company_id) return;
    if (!lead?.id) {
      toast.error("Este contacto no tiene lead relacionado");
      return;
    }
    if (!canMarkLeadInterest) {
      toast.error("No tienes permisos para marcar interés");
      return;
    }

    setMarkingInterest(productId);
    try {
      const db = supabase as any;
      const { data: existing, error: existingErr } = await db
        .from("lead_products")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("lead_id", lead.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingErr) {
        toast.error(existingErr.message || "No se pudo validar duplicados");
        return;
      }
      if (existing?.id) {
        toast.message("Este producto ya está marcado como interés del lead");
        return;
      }

      const { error: insertErr } = await db
        .from("lead_products")
        .insert({
          company_id: profile.company_id,
          lead_id: lead.id,
          product_id: productId,
          interest_level: "interested",
          notes: "Detectado desde conversación de WhatsApp",
        })
        .select("id")
        .maybeSingle();

      if (insertErr) {
        const msg = String(insertErr.message || "");
        if (msg.toLowerCase().includes("duplicate") || msg.includes("23505")) {
          toast.message("Este producto ya está marcado como interés del lead");
          return;
        }
        toast.error(insertErr.message || "No se pudo marcar interés");
        return;
      }

      toast.success("Interés marcado en el lead");
      onRefreshConversations?.();
    } finally {
      setMarkingInterest(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const loadRelated = async () => {
      if (!profile?.company_id) return;

      const leadId = conversation?.lead_id ? String(conversation.lead_id) : null;
      setRelatedLoading(true);
      try {
        if (!leadId) {
          if (cancelled) return;
          setLead(null);
          setDeal(null);
          setProject(null);
          setClient(null);
          setNextTask(null);
          return;
        }

        const [leadRes, dealRes, taskRes] = await Promise.all([
          (supabase as any)
            .from("leads")
            .select("id,company_id,first_name,last_name,email,phone,whatsapp,company_name,source,source_channel,status,assigned_to,notes,estimated_value,metadata")
            .eq("company_id", profile.company_id)
            .eq("id", leadId)
            .maybeSingle(),
          (supabase as any)
            .from("deals")
            .select("id,company_id,lead_id,client_id,assigned_to,name,stage,value,probability,expected_close,notes")
            .eq("company_id", profile.company_id)
            .eq("lead_id", leadId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          (supabase as any)
            .from("tasks")
            .select("id,title,due_date,priority,status,assigned_to")
            .eq("company_id", profile.company_id)
            .eq("related_lead_id", leadId)
            .in("status", ["To Do", "In Progress", "Waiting"])
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        setLead(!leadRes.error ? ((leadRes.data as LeadRow) ?? null) : null);
        setDeal(!dealRes.error ? ((dealRes.data as DealRow) ?? null) : null);
        setNextTask(!taskRes.error ? ((taskRes.data as TaskRow) ?? null) : null);

        const clientId = !dealRes.error && dealRes.data?.client_id ? String(dealRes.data.client_id) : null;
        const dealId = !dealRes.error && dealRes.data?.id ? String(dealRes.data.id) : null;
        const projectOrLeadIds = [`lead_id.eq.${leadId}`];
        if (dealId) projectOrLeadIds.push(`deal_id.eq.${dealId}`);
        if (clientId) projectOrLeadIds.push(`client_id.eq.${clientId}`);
        const { data: projectRow } = await (supabase as any)
          .from("projects")
          .select("id,company_id,name,status,due_date,lead_id,client_id,deal_id,product_id")
          .eq("company_id", profile.company_id)
          .or(projectOrLeadIds.join(","))
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) {
          setProject((projectRow as ProjectRow) ?? null);
        }

        if (!clientId) {
          setClient(null);
          return;
        }
        const { data: clientRow } = await (supabase as any)
          .from("clients")
          .select("id,company_id,company_name,contact_person,email,phone,whatsapp,status")
          .eq("company_id", profile.company_id)
          .eq("id", clientId)
          .maybeSingle();
        if (cancelled) return;
        setClient((clientRow as ClientRow) ?? null);
      } finally {
        if (!cancelled) setRelatedLoading(false);
      }
    };

    void loadRelated();
    return () => {
      cancelled = true;
    };
  }, [conversation?.conversation_id, conversation?.lead_id, profile?.company_id]);

  async function getInitialDealStageName(companyId: string): Promise<string> {
    const { data, error } = await (supabase as any)
      .from("deal_stages")
      .select("name, display_order")
      .eq("company_id", companyId)
      .order("display_order", { ascending: true })
      .limit(1);
    if (!error && Array.isArray(data) && data[0]?.name) return String(data[0].name);
    return "New Opportunity";
  }

  async function handleCreateDealFromLead() {
    if (!profile?.company_id || !lead) return;
    if (!enforceOwnLeadForSales("Solo puedes crear oportunidades para tus propios prospectos")) return;
    if (!can("deals.create")) {
      toast.error("No tienes permiso para crear oportunidades");
      return;
    }

    setCreatingDeal(true);
    try {
      const { data: existing, error: existingErr } = await (supabase as any)
        .from("deals")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingErr) {
        toast.error(existingErr.message || "No se pudo validar si ya existe oportunidad");
        return;
      }
      if (existing?.id) {
        toast.message("Este lead ya tiene una oportunidad creada");
        window.location.href = "/pipeline";
        return;
      }

      const stageName = await getInitialDealStageName(profile.company_id);
      const leadName = lead.company_name || formatPersonName(lead.first_name, lead.last_name) || lead.email || lead.phone || "Prospecto";
      const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : null;
      const service = meta ? (meta as any).selected_service ?? (meta as any).service : null;
      const serviceLabel = typeof service === "string" && service.trim().length ? service.trim() : null;
      const dealName = serviceLabel ? `${serviceLabel} — ${leadName}` : `Oportunidad — ${leadName}`;
      const assignedTo = lead.assigned_to || user?.id || null;
      const value = Number(lead.estimated_value || 0);
      const payloadBase: Record<string, unknown> = {
        company_id: profile.company_id,
        lead_id: lead.id,
        name: dealName,
        value: Number.isFinite(value) ? value : 0,
        probability: 50,
        expected_close: null,
        stage: stageName,
        assigned_to: assignedTo,
        created_by: profile.id,
        notes: null,
      };

      const { data: created, error: createErr } = await (supabase as any).from("deals").insert(payloadBase).select("*").single();

      if (createErr && String(createErr.message || "").toLowerCase().includes("enum")) {
        const { data: created2, error: createErr2 } = await (supabase as any)
          .from("deals")
          .insert({ ...payloadBase, stage: "New Opportunity" })
          .select("*")
          .single();
        if (createErr2) {
          toast.error(createErr2.message || "No se pudo crear la oportunidad");
          return;
        }
        setDeal(created2 as DealRow);
        toast.success("Oportunidad creada");
        onRefreshConversations?.();
        return;
      }

      if (createErr) {
        toast.error(createErr.message || "No se pudo crear la oportunidad");
        return;
      }

      setDeal(created as DealRow);
      toast.success("Oportunidad creada");
      onRefreshConversations?.();
    } finally {
      setCreatingDeal(false);
    }
  }

  function openFollowUpDialog() {
    if (!lead) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().slice(0, 10);
    const leadLabel = lead.company_name || formatPersonName(lead.first_name, lead.last_name) || lead.email || lead.phone || "prospecto";
    const sourceHint = lead.source_channel || lead.source || "—";
    setFollowUpValues({
      title: `Dar seguimiento a ${leadLabel}`,
      due_date: dueDate,
      priority: "Medium",
      description: `Seguimiento creado desde WhatsApp.\nFuente: ${sourceHint}`,
    });
    setFollowUpOpen(true);
  }

  async function handleCreateFollowUp() {
    if (!profile?.company_id || !lead) return;
    if (!profile?.id) {
      toast.error("No se pudo identificar el perfil actual");
      return;
    }
    if (!can("tasks.create")) {
      toast.error("No tienes permiso para crear seguimiento");
      return;
    }
    if (!enforceOwnLeadForSales("Solo puedes crear seguimiento para tus propios prospectos")) return;

    if (!followUpValues.title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    if (!followUpValues.due_date) {
      toast.error("Selecciona una fecha de seguimiento");
      return;
    }

    setFollowUpSaving(true);
    try {
      const assigneeProfileId = lead.assigned_to ? teamByUserId.get(String(lead.assigned_to))?.profile_id : null;
      const assignedTo = assigneeProfileId || profile.id;
      const { data: created, error } = await (supabase as any)
        .from("tasks")
        .insert({
          company_id: profile.company_id,
          title: followUpValues.title.trim(),
          description: followUpValues.description.trim() || null,
          status: "To Do",
          priority: followUpValues.priority || "Medium",
          due_date: followUpValues.due_date,
          assigned_to: assignedTo,
          created_by: profile.id,
          related_lead_id: lead.id,
        })
        .select("id,title,due_date,priority,status,assigned_to")
        .single();
      if (error) {
        toast.error(error.message || "No se pudo crear el seguimiento");
        return;
      }
      setNextTask(created as TaskRow);
      toast.success("Seguimiento creado correctamente.");
      onRefreshConversations?.();
      setFollowUpOpen(false);
    } finally {
      setFollowUpSaving(false);
    }
  }

  async function handleConvertLeadToClient() {
    if (!profile?.company_id || !lead) return;
    if (!enforceOwnLeadForSales("Solo puedes convertir a cliente tus propios prospectos")) return;
    if (!can("clients.create")) {
      toast.error("No tienes permiso para convertir a cliente");
      return;
    }

    setConvertingClient(true);
    try {
      const companyId = profile.company_id;
      if (lead.email) {
        const { data: existingByEmail, error: emailErr } = await (supabase as any)
          .from("clients")
          .select("id")
          .eq("company_id", companyId)
          .eq("email", lead.email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (emailErr) {
          toast.error(emailErr.message || "No se pudo validar duplicados");
          return;
        }
        if (existingByEmail?.id) {
          toast.message("Este prospecto ya fue convertido en cliente.");
          window.location.href = "/clients";
          return;
        }
      } else {
        const phoneCandidate = lead.phone || lead.whatsapp;
        if (phoneCandidate) {
          const digits = phoneCandidate.replace(/\D/g, "");
          const phoneMatch = digits.length ? digits : phoneCandidate;
          const { data: existingByPhone, error: phoneErr } = await (supabase as any)
            .from("clients")
            .select("id,phone,whatsapp")
            .eq("company_id", companyId)
            .or(`phone.eq.${phoneMatch},whatsapp.eq.${phoneMatch}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (phoneErr) {
            toast.error(phoneErr.message || "No se pudo validar duplicados");
            return;
          }
          if (existingByPhone?.id) {
            toast.message("Este prospecto ya fue convertido en cliente.");
            window.location.href = "/clients";
            return;
          }
        }
      }

      const leadName = formatPersonName(lead.first_name, lead.last_name);
      const companyName = lead.company_name?.trim() || leadName || lead.email || lead.phone || lead.whatsapp || "Cliente sin nombre";
      const contactPerson = leadName || null;
      const phone = lead.phone || lead.whatsapp || null;
      const whatsapp = lead.whatsapp || lead.phone || null;

      const accountManagerProfileId = lead.assigned_to
        ? teamByUserId.get(String(lead.assigned_to))?.profile_id || profile?.id || null
        : profile?.id || null;

      const { error: createErr } = await (supabase as any).from("clients").insert({
        company_id: companyId,
        company_name: companyName,
        contact_person: contactPerson,
        email: lead.email || null,
        phone,
        whatsapp,
        status: "Active",
        account_manager: accountManagerProfileId,
        notes: lead.notes || null,
      });

      if (createErr) {
        toast.error(createErr.message || "No se pudo convertir a cliente");
        return;
      }

      toast.success("Cliente creado correctamente.");
      onRefreshConversations?.();
      window.location.href = "/clients";
    } finally {
      setConvertingClient(false);
    }
  }

  async function handleUpdateLeadAssignee(newUserId: string | null) {
    if (!profile?.company_id || !lead) return;
    if (!isAdminLike) {
      toast.error("No tienes permiso para reasignar");
      return;
    }
    if (!can("leads.edit")) {
      toast.error("No tienes permiso para editar prospectos");
      return;
    }
    setUpdatingAssignment(true);
    try {
      const { error } = await (supabase as any)
        .from("leads")
        .update({ assigned_to: newUserId })
        .eq("company_id", profile.company_id)
        .eq("id", lead.id);
      if (error) {
        toast.error(error.message || "No se pudo asignar el prospecto");
        return;
      }
      setLead((prev) => (prev ? { ...prev, assigned_to: newUserId } : prev));
      toast.success("Responsable actualizado");
      onRefreshConversations?.();
    } finally {
      setUpdatingAssignment(false);
    }
  }

  async function handleMarkConversationResolved() {
    if (!profile?.company_id) return;
    if (!can("whatsapp.edit") && !can("whatsapp.manage") && !can("whatsapp_conversations.edit")) {
      // If permissions are not defined, fall back to allowing only admins to change status.
      if (!isAdminLike) {
        toast.error("No tienes permiso para actualizar la conversación");
        return;
      }
    }
    setUpdatingConversation(true);
    try {
      const { error } = await (supabase as any)
        .from("whatsapp_conversations")
        .update({ status: "resolved" })
        .eq("company_id", profile?.company_id)
        .eq("id", conversation.conversation_id);
      if (error) {
        toast.error(error.message || "No se pudo marcar como resuelto");
        return;
      }
      toast.success("Conversación marcada como resuelta");
      onRefreshConversations?.();
    } finally {
      setUpdatingConversation(false);
    }
  }

  async function handleCreateLeadFromWhatsapp() {
    if (!profile?.company_id || !user?.id) return;
    if (!conversation) return;
    if (conversation.lead_id) return;
    if (!can("leads.create")) {
      toast.error("No tienes permiso para crear prospectos");
      return;
    }

    const phone = conversation.phone ? String(conversation.phone) : null;
    if (!phone) {
      toast.error("Esta conversación no tiene número de teléfono");
      return;
    }

    setCreatingLeadFromWhatsapp(true);
    try {
      const db = supabase as any;
      const firstName =
        (conversation.contact_name && String(conversation.contact_name).trim()) ||
        (conversation.display_name && String(conversation.display_name).trim()) ||
        "Prospecto";

      const basePayload: Record<string, any> = {
        company_id: profile.company_id,
        first_name: firstName,
        last_name: null,
        phone,
        whatsapp: phone,
        source: "WhatsApp",
        source_channel: "WhatsApp",
        status: "New",
        assigned_to: user.id, // auth.users.id
        notes: "Prospecto creado desde conversación de WhatsApp.",
      };

      let leadId: string | null = null;
      const { data: createdWithChannel, error: createErrWithChannel } = await db
        .from("leads")
        .insert(basePayload)
        .select("id,company_id,first_name,last_name,email,phone,whatsapp,company_name,source,source_channel,status,assigned_to,notes,estimated_value,metadata")
        .single();

      if (createErrWithChannel) {
        const msg = String(createErrWithChannel.message || "");
        if (msg.toLowerCase().includes("source_channel") && msg.toLowerCase().includes("does not exist")) {
          const fallbackPayload = { ...basePayload };
          delete fallbackPayload.source_channel;
          const { data: createdFallback, error: createErrFallback } = await db
            .from("leads")
            .insert(fallbackPayload)
            .select("id,company_id,first_name,last_name,email,phone,whatsapp,company_name,source,source_channel,status,assigned_to,notes,estimated_value,metadata")
            .single();
          if (createErrFallback) {
            toast.error(createErrFallback.message || "No se pudo crear el prospecto");
            return;
          }
          leadId = createdFallback?.id ? String(createdFallback.id) : null;
          setLead((createdFallback as LeadRow) ?? null);
        } else {
          toast.error(createErrWithChannel.message || "No se pudo crear el prospecto");
          return;
        }
      } else {
        leadId = createdWithChannel?.id ? String(createdWithChannel.id) : null;
        setLead((createdWithChannel as LeadRow) ?? null);
      }

      if (!leadId) {
        toast.error("Prospecto creado, pero no se pudo obtener el ID");
        return;
      }

      const { error: linkErr } = await db
        .from("whatsapp_conversations")
        .update({ lead_id: leadId })
        .eq("company_id", profile.company_id)
        .eq("id", conversation.conversation_id);

      if (linkErr) {
        toast.message("Prospecto creado. Refresca la conversación para verlo conectado.");
        return;
      }

      toast.success("Prospecto creado y conectado a la conversación.");
      onRefreshConversations?.();
    } finally {
      setCreatingLeadFromWhatsapp(false);
    }
  }

  if (!conversation) return null;

  const detectedSummary = extracted.rawSummary ? String(extracted.rawSummary) : "";
  const detectedPreview = detectedSummary.length > 260 ? `${detectedSummary.slice(0, 260).trim()}…` : detectedSummary;
  const showDetectedToggle = detectedSummary.length > 260;

  return (
    <aside data-demo="whatsapp-crm-panel" className={cn("h-full min-h-0 min-w-0 overflow-y-auto bg-[#f0f2f5] px-3.5 py-3.5", className)}>
      <div className="rounded-[18px] border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
        <div className="flex items-start gap-3 min-w-0">
          <WhatsappAvatar name={name} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="min-w-0">
                <div className="text-[16px] font-semibold tracking-[-0.025em] truncate text-slate-900">{name}</div>
                <div className="mt-1 text-[12px] text-slate-500 truncate">{phone || "—"}</div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/15 dark:text-emerald-200 dark:border-emerald-800/40">
                  WhatsApp
                </span>
                {conversation.lead_id ? (
                  <span className="inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/15 dark:text-blue-200 dark:border-blue-800/40">
                    Lead
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {serviceWindowClosed ? (
          <div data-demo="whatsapp-utility-actions" className="rounded-[18px] border border-black/5 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <div className="w-full space-y-2">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  Continuar con plantilla aprobada
                </div>
                <div className="inline-flex w-fit rounded-full border border-black/5 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">
                  {lastInboundAt ? `Último inbound: ${formatDateLabel(lastInboundAt)}` : "Sin inbound"}
                </div>
              </div>

              <p className="w-full text-[12px] leading-[1.45] text-slate-500">
                El cliente no ha respondido en las últimas 24 horas. Elige una plantilla Utility para continuar. Cuando responda, podrás escribir libremente por 24 horas.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {utilityActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={cn(
                    "w-full rounded-[14px] border bg-white px-3 py-2.5 text-left transition hover:bg-muted/30",
                    action.enabled ? "border-border/60" : "border-border/40 opacity-70",
                  )}
                  disabled={!action.enabled}
                  onClick={() => setActiveUtilityActionId(action.id)}
                  title={action.enabled ? action.description : action.disabledReason}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate text-slate-900">{action.label}</div>
                      <div className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-[1.35]">{action.preview}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {action.description}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500 leading-tight">{action.enabled ? "Disponible" : action.disabledReason}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">
              {serviceWindowExpiresAt ? `Ventana cerrada. Expira: ${new Date(serviceWindowExpiresAt).toLocaleString()}.` : serviceWindowLabelText}
            </div>
          </div>
        ) : null}

        <div data-demo="whatsapp-quick-actions"><CrmDetailSection title="Acciones rápidas">
        {!conversation.lead_id ? (
          <Button
            data-demo="whatsapp-create-lead"
            variant="default"
            size="sm"
            className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
            onClick={() => void handleCreateLeadFromWhatsapp()}
            disabled={creatingLeadFromWhatsapp || !can("leads.create")}
          >
            <UserRound className="h-4 w-4 text-white" />
            {creatingLeadFromWhatsapp ? "Creando..." : "Crear prospecto desde WhatsApp"}
          </Button>
        ) : null}
        <div className="mt-2 grid grid-cols-1 gap-2">
          <Button
            variant={deal ? "default" : "default"}
            size="sm"
            className={cn(
              "w-full justify-start gap-2 min-w-0 overflow-hidden rounded-xl",
              deal ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700",
            )}
            onClick={() => {
              if (deal) {
                window.location.href = "/pipeline";
                return;
              }
              void handleCreateDealFromLead();
            }}
            disabled={
              deal ? false : !lead || !can("deals.create") || creatingDeal || (isSalesAgent && String(lead.assigned_to) !== String(user?.id))
            }
          >
            <BriefcaseBusiness className="h-4 w-4 text-white" />
            <span className="truncate">
              {deal ? "Oportunidad creada" : creatingDeal ? "Creando..." : "Crear oportunidad"}
            </span>
          </Button>

          <Button
            variant={client ? "default" : "default"}
            size="sm"
            className={cn(
              "w-full justify-start gap-2 min-w-0 overflow-hidden rounded-xl",
              client ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700",
            )}
            onClick={() => {
              if (client) {
                window.location.href = "/clients";
                return;
              }
              void handleConvertLeadToClient();
            }}
            disabled={
              client ? false : !lead || !can("clients.create") || convertingClient || (isSalesAgent && String(lead.assigned_to) !== String(user?.id))
            }
          >
            <UserRound className="h-4 w-4 text-white" />
            <span className="truncate">
              {client ? "Cliente activo" : convertingClient ? "Convirtiendo..." : "Convertir a cliente"}
            </span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
              onClick={() => phone && navigator.clipboard.writeText(phone)}
              disabled={!phone}
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">Copiar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
              onClick={() => waMe && window.open(waMe, "_blank", "noopener,noreferrer")}
              disabled={!waMe}
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">WhatsApp</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
              onClick={() => (window.location.href = "/leads")}
              disabled={!conversation.lead_id}
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">Prospecto</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
              onClick={() => openFollowUpDialog()}
              disabled={!lead || !can("tasks.create") || (isSalesAgent && String(lead.assigned_to) !== String(user?.id))}
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">Seguimiento</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 min-w-0 overflow-hidden rounded-xl"
            onClick={() => void handleMarkConversationResolved()}
            disabled={updatingConversation}
          >
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{updatingConversation ? "Guardando..." : "Marcar resuelto"}</span>
          </Button>
        </div>
      </CrmDetailSection></div>

      {productsLoading || productSuggestions.length ? (
        <CrmDetailSection
          title="Producto sugerido"
          action={productsLoading ? <span className="text-[10px] text-muted-foreground">Cargando…</span> : null}
        >

        {productSuggestions.length ? (
          <div className="space-y-2">
            {productSuggestions.map((s) => {
              const p = s.product as ProductRow;
              const isSelected = selectedProductId && String(selectedProductId) === String(p.id);
              return (
                <div
                  key={String(p.id)}
                  onClick={() => setSelectedProductId(String(p.id))}
                  className={cn(
                    "w-full cursor-pointer text-left rounded-[12px] border bg-background p-3 text-[12px] transition",
                    isSelected ? "border-primary/60 ring-1 ring-primary/20" : "hover:bg-accent/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name || `Producto ${String(p.id).slice(0, 8)}`}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {(p.category || "—") + " · " + (p.base_price != null ? `$${Number(p.base_price).toLocaleString()}` : "Precio —")}
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[.06em] text-muted-foreground">{s.score} kw</div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground break-words">
                    <span className="font-medium text-foreground/80">Keywords:</span>{" "}
                    {s.matchedKeywords.length ? s.matchedKeywords.join(", ") : "—"}
                  </div>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-[11px] font-semibold"
                      disabled={!lead?.id || !canMarkLeadInterest || markingInterest === String(p.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkLeadInterest(String(p.id));
                      }}
                    >
                      {markingInterest === String(p.id) ? "Marcando..." : "Marcar como interés del lead"}
                    </Button>
                  </div>
                </div>
              );
            })}

          </div>
        ) : (
          <div className="text-[12px] text-muted-foreground">No se detectaron productos en la conversación.</div>
        )}
        </CrmDetailSection>
      ) : null}

      <div data-demo="whatsapp-proposals">
        <CrmDetailSection
          title="Propuestas"
          action={proposalsLoading ? <span className="text-[10px] text-muted-foreground">Cargando…</span> : null}
        >

        {proposals.length ? (
          <div className="space-y-3">
            <div>
              <Label className="crm-label uppercase">Seleccionar propuesta</Label>
              <Select value={selectedProposalId ?? undefined} onValueChange={(v) => setSelectedProposalId(v || null)}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Selecciona una propuesta" />
                </SelectTrigger>
                <SelectContent>
                  {orderedProposals.map((pr) => {
                    const productLabel = pr.product_id ? productNameById.get(String(pr.product_id)) : null;
                    const amountLabel = `${Number(pr.amount || 0).toLocaleString()} ${pr.currency || "—"}`.trim();
                    const status = pr.status ? String(pr.status) : "—";
                    const relationLabel =
                      (pr.whatsapp_conversation_id && conversation?.conversation_id && String(pr.whatsapp_conversation_id) === String(conversation.conversation_id)
                        ? "Conversación"
                        : pr.lead_id && lead?.id && String(pr.lead_id) === String(lead.id)
                          ? "Lead"
                          : pr.deal_id && deal?.id && String(pr.deal_id) === String(deal.id)
                            ? "Oportunidad"
                            : pr.client_id && client?.id && String(pr.client_id) === String(client.id)
                              ? "Cliente"
                              : null);
                    return (
                      <SelectItem key={pr.id} value={String(pr.id)} textValue={`${pr.title} ${amountLabel} ${status}`}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{pr.title}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {productLabel ? `${productLabel} · ` : ""}
                            {amountLabel} · {status}
                            {relationLabel ? ` · ${relationLabel}` : ""}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="mt-2 text-[10px] text-muted-foreground">
                Priorizadas por coincidencia con este prospecto, su oportunidad y sus productos relacionados.
              </div>
            </div>

            {selectedProposal ? (
              <div className="rounded-[12px] border bg-muted/10 px-3 py-2">
                <div className="text-[12px] font-medium truncate">{selectedProposal.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {`${Number(selectedProposal.amount || 0).toLocaleString()} ${selectedProposal.currency || "—"}`.trim()} ·{" "}
                  {selectedProposal.status || "—"}
                </div>
                {selectedProposal.product_id ? (
                  <div className="mt-1 text-[11px] text-muted-foreground truncate">
                    Producto: {productNameById.get(String(selectedProposal.product_id)) || selectedProposal.product_id}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start min-w-0 overflow-hidden"
                disabled={!selectedProposal || copyingProposalLink}
                onClick={() => void handleCopyProposal()}
              >
                <Copy className="h-4 w-4" />
                <span className="truncate">{copyingProposalLink ? "Copiando..." : "Copiar enlace"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="justify-start bg-emerald-600 hover:bg-emerald-700 min-w-0 overflow-hidden"
                disabled={!selectedProposal || !canRegisterProposalSend || registeringProposalSend}
                onClick={() => void handleRegisterProposalSend()}
              >
                <span className="truncate">{registeringProposalSend ? "Enviando..." : "Enviar propuesta"}</span>
              </Button>
            </div>

            {canCreateProposal ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start w-full"
                onClick={() => navigate({ to: "/proposals", search: proposalCreateSearch })}
              >
                <ExternalLink className="h-4 w-4" />
                <span className="truncate">Crear nueva propuesta</span>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground">No hay propuestas disponibles para este prospecto.</div>
        )}

        <div className="mt-3 rounded-[10px] border bg-muted/10 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="crm-label uppercase">Historial</div>
            {proposalSendsLoading ? <span className="text-[10px] text-muted-foreground">Cargando…</span> : null}
          </div>
          {proposalSends.length ? (
            <div className="space-y-2">
              {proposalSends.map((row) => {
                const pr = row?.proposal || orderedProposals.find((p) => String(p.id) === String(row?.proposal_id));
                const title = pr?.title || "Propuesta";
                const productLabel =
                  (row?.product_id ? productNameById.get(String(row.product_id)) : null) ||
                  (pr?.product_id ? productNameById.get(String(pr.product_id)) : null);
                return (
                  <div key={row.id} className="text-[12px]">
                    <div className="font-semibold truncate">{title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {productLabel ? `${productLabel} · ` : ""}
                      {formatDateLabel(row.sent_at)} · {row.status || "—"}
                    </div>
                    {row?.sent_to_phone ? (
                      <div className="text-[10px] text-muted-foreground truncate">Enviado a {String(row.sent_to_phone)}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground">Sin envíos registrados.</div>
          )}
        </div>
        </CrmDetailSection>
      </div>

      <div data-demo="whatsapp-detected-data"><CrmDetailSection
        title="Datos detectados"
        action={
          extracted.rawSummary ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => navigator.clipboard.writeText(extracted.rawSummary || "")}
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          ) : null
        }
      >
        {extracted.rawSummary ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Empresa</div>
                <div className="text-[12px] text-foreground break-words">{extracted.company || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Servicio</div>
                <div className="text-[12px] text-foreground break-words">{extracted.serviceInterest || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Necesidad</div>
                <div className="text-[12px] text-foreground break-words">{extracted.mainNeed || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Urgencia</div>
                <div className="text-[12px] text-foreground break-words">{extracted.urgency || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Canal</div>
                <div className="text-[12px] text-foreground break-words">{extracted.currentChannel || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Preferencia</div>
                <div className="text-[12px] text-foreground break-words">{extracted.contactPreference || "—"}</div>
              </div>
            </div>

            <div className="rounded-[12px] border bg-muted/10 px-3 py-2 text-[11.5px] leading-[1.4] text-foreground/90 whitespace-pre-wrap">
              {detectedExpanded ? detectedSummary : detectedPreview}
            </div>
            {showDetectedToggle ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] justify-start"
                onClick={() => setDetectedExpanded((v) => !v)}
              >
                {detectedExpanded ? "Ver menos" : "Ver más"}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="text-[12px] text-muted-foreground">No se detectó un bloque estructurado en los mensajes todavía.</div>
        )}
      </CrmDetailSection></div>

      <CrmDetailSection title="Perfil CRM">
        {relatedLoading ? (
          <div className="text-[12px] text-muted-foreground">Cargando…</div>
        ) : !conversation.lead_id ? (
          <div className="text-[12px] text-muted-foreground">Esta conversación todavía no está conectada a un prospecto.</div>
        ) : !lead ? (
          <div className="text-[12px] text-muted-foreground">No se pudo cargar el prospecto relacionado.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Prospecto</div>
              <div className="text-[12px] font-semibold text-foreground break-words">
                {lead.company_name || formatPersonName(lead.first_name, lead.last_name) || lead.email || lead.phone || "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Estado</div>
              <div className="text-[12px] text-foreground break-words">{lead.status || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Fuente</div>
              <div className="text-[12px] text-foreground break-words">{lead.source_channel || lead.source || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Responsable</div>
              <div className="text-[12px] text-foreground break-words">
                {lead.assigned_to ? teamByUserId.get(String(lead.assigned_to))?.full_name || "Asignado" : "Sin asignar"}
              </div>
            </div>
          </div>
        )}
      </CrmDetailSection>

      {!relatedLoading && lead ? (
        <>
          {isAdminLike ? (
            <CrmDetailSection
              title="Asignación"
              action={teamLoading ? <span className="text-[10px] text-muted-foreground">Cargando…</span> : null}
            >
              <Select
                value={lead.assigned_to || "unassigned"}
                onValueChange={(v) => void handleUpdateLeadAssignee(v === "unassigned" ? null : v)}
                disabled={updatingAssignment}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sin asignar</SelectItem>
                  {assignableMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name || m.email || m.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-2">
                <UserCog className="h-3.5 w-3.5" />
                Esto actualiza <span className="font-mono">leads.assigned_to</span>.
              </div>
            </CrmDetailSection>
          ) : null}

          <CrmDetailSection title="Contacto">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                disabled={!lead.email}
                onClick={() => lead.email && window.open(`mailto:${lead.email}`, "_blank")}
              >
                <Mail className="h-4 w-4" /> Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                disabled={!(lead.phone || lead.whatsapp)}
                onClick={() => {
                  const p = lead.whatsapp || lead.phone;
                  if (!p) return;
                  window.open(`tel:${p}`, "_self");
                }}
              >
                <Phone className="h-4 w-4" /> Llamar
              </Button>
            </div>
          </CrmDetailSection>

          <div data-demo="whatsapp-followup"><CrmDetailSection title="Seguimiento">
            {nextTask ? (
              (() => {
                const isDone = ["Completed", "Cancelled"].includes(String(nextTask.status || ""));
                const today = new Date();
                const todayYmd = today.toISOString().slice(0, 10);
                const dueYmd = nextTask.due_date ? String(nextTask.due_date).slice(0, 10) : null;
                const isOverdue = !isDone && dueYmd != null && dueYmd < todayYmd;
                return (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium truncate">{nextTask.title}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {nextTask.due_date ? formatDateLabel(nextTask.due_date) : "—"} · {nextTask.status || "—"}
                        </div>
                      </div>
                      {isOverdue ? (
                        <span className="shrink-0 inline-flex items-center h-6 px-2 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-medium dark:bg-red-900/15 dark:text-red-200 dark:border-red-800/40">
                          Vencido
                        </span>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
                      <div>
                        <span className="font-medium">Prioridad:</span> {nextTask.priority || "—"}
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span>{" "}
                        {nextTask.due_date ? formatDateLabel(nextTask.due_date) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-[12px] text-muted-foreground">No hay seguimiento programado.</div>
            )}
          </CrmDetailSection></div>

          <div data-demo="whatsapp-opportunity"><CrmDetailSection title="Oportunidad">
            {deal ? (
              <div>
                <div className="text-[13px] font-semibold truncate text-slate-900">{deal.name}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {deal.stage} · ${Number(deal.value || 0).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground">No hay oportunidad creada para este prospecto.</div>
            )}
          </CrmDetailSection></div>

          <div data-demo="whatsapp-client"><CrmDetailSection title="Cliente">
            {client ? (
              <div>
                <div className="text-[13px] font-semibold truncate text-slate-900">{client.company_name || "Cliente"}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{client.status || "—"}</div>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground">No hay cliente conectado.</div>
            )}
          </CrmDetailSection></div>
        </>
      ) : null}

      </div>

      <Dialog open={Boolean(activeUtilityAction)} onOpenChange={(open) => !open && setActiveUtilityActionId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base">{activeUtilityAction?.label || "Plantilla aprobada"}</DialogTitle>
          </DialogHeader>
          {activeUtilityAction ? (
            <div className="space-y-4">
              <div className="rounded-[12px] border bg-muted/10 px-3 py-2 text-[12px] text-muted-foreground">
                Tipo: <span className="font-medium text-foreground">{activeUtilityAction.description}</span>
                <span className="mx-2">·</span>
                Categoría: <span className="font-medium text-foreground">Utility</span>
                <span className="mx-2">·</span>
                Destinatario: <span className="font-medium text-foreground">{utilityActionContext?.recipientName || name}</span>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Variables</div>
                <div className="space-y-1 rounded-[12px] border bg-background p-3 text-[12px]">
                  {activeUtilityAction.variables.map((variable) => (
                    <div key={variable} className="font-mono text-[11px] text-muted-foreground">
                      {variable}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</div>
                <div className="rounded-[12px] border bg-muted/10 p-3 text-[12px] leading-[1.5] whitespace-pre-wrap text-foreground">
                  {activeUtilityAction.preview}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setActiveUtilityActionId(null)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void handleConfirmUtilityAction()}>
                  Enviar plantilla
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear seguimiento</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateFollowUp();
            }}
          >
            <div>
              <Label>Título</Label>
              <Input value={followUpValues.title} onChange={(e) => setFollowUpValues((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={followUpValues.due_date} onChange={(e) => setFollowUpValues((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select value={followUpValues.priority} onValueChange={(v) => setFollowUpValues((p) => ({ ...p, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={followUpValues.description} onChange={(e) => setFollowUpValues((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFollowUpOpen(false)} disabled={followUpSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={followUpSaving}>
                {followUpSaving ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
