import type { CrmWhatsappMessageRow } from "@/lib/whatsapp/view-types";

export type ServiceWindowState = {
  lastInboundAt: string | null;
  serviceWindowExpiresAt: string | null;
  isServiceWindowOpen: boolean;
  remainingServiceWindowMs: number;
};

export type WhatsappUtilityProposalContext = {
  id: string;
  title: string;
  publicUrl: string;
  productName: string | null;
};

export type WhatsappUtilityActionContext = {
  recipientName: string;
  phone: string | null;
  leadName: string | null;
  dealName: string | null;
  projectName: string | null;
  clientName: string | null;
  productName: string | null;
  proposal: WhatsappUtilityProposalContext | null;
  nextTaskTitle: string | null;
  nextTaskDueDate: string | null;
  conversationTopic: string | null;
};

export type WhatsappUtilityActionId =
  | "proposal"
  | "invoice"
  | "follow_up"
  | "project_update"
  | "documents"
  | "reminder";

export type WhatsappUtilityActionDefinition = {
  id: WhatsappUtilityActionId;
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
  preview: string;
  variables: string[];
};

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getLastInboundAt(messages: CrmWhatsappMessageRow[]) {
  const inbound = [...(messages || [])]
    .filter(
      (message) =>
        String(message?.direction || "").toLowerCase() === "inbound" &&
        String(message?.created_at || "").trim(),
    )
    .sort((a, b) => {
      const ad = new Date(a.created_at).getTime();
      const bd = new Date(b.created_at).getTime();
      return bd - ad;
    });
  return inbound[0]?.created_at ?? null;
}

export function getServiceWindowState(
  messages: CrmWhatsappMessageRow[],
  nowMs: number = Date.now(),
): ServiceWindowState {
  const lastInboundAt = getLastInboundAt(messages);
  if (!lastInboundAt) {
    return {
      lastInboundAt: null,
      serviceWindowExpiresAt: null,
      isServiceWindowOpen: false,
      remainingServiceWindowMs: 0,
    };
  }

  const lastInboundMs = new Date(lastInboundAt).getTime();
  if (Number.isNaN(lastInboundMs)) {
    return {
      lastInboundAt: null,
      serviceWindowExpiresAt: null,
      isServiceWindowOpen: false,
      remainingServiceWindowMs: 0,
    };
  }

  const expiresAtMs = lastInboundMs + SERVICE_WINDOW_MS;
  const remainingServiceWindowMs = Math.max(0, expiresAtMs - nowMs);

  return {
    lastInboundAt,
    serviceWindowExpiresAt: new Date(expiresAtMs).toISOString(),
    isServiceWindowOpen: nowMs < expiresAtMs,
    remainingServiceWindowMs,
  };
}

export function formatServiceWindowRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours <= 0 && minutes <= 0) return "menos de 1 minuto";
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function buildWhatsappUtilityActions(
  context: WhatsappUtilityActionContext | null,
  options?: { selectedProposalTitle?: string | null },
): WhatsappUtilityActionDefinition[] {
  const recipientName = context?.recipientName || "Sin nombre";
  const topicLabel =
    context?.conversationTopic ||
    context?.projectName ||
    context?.dealName ||
    context?.productName ||
    "tu solicitud";
  const proposalUrl = context?.proposal?.publicUrl || null;
  const projectTopic = context?.projectName || context?.dealName || topicLabel;
  const reminderTopic = context?.nextTaskTitle || topicLabel;
  const selectedProposalTitle =
    options?.selectedProposalTitle || context?.proposal?.title || "la propuesta seleccionada";

  const proposalPreview = context?.proposal
    ? `Hola ${recipientName}, ya tenemos lista la información/propuesta relacionada con tu solicitud sobre ${topicLabel}. Puedes revisarla aquí: ${context.proposal.publicUrl}. Si tienes alguna duda o deseas hacer ajustes, respóndenos por aquí.`
    : "";
  const followUpPreview = `Hola ${recipientName}, te escribimos para dar seguimiento a la solicitud que registraste con nosotros sobre ${topicLabel}. Respóndenos por aquí cuando estés disponible y con gusto continuamos.`;
  const projectPreview = `Hola ${recipientName}, tenemos una actualización relacionada con tu proyecto de ${projectTopic}. Puedes revisar la información aquí: ${context?.proposal?.publicUrl || "—"}. Si necesitas algún ajuste, respóndenos por aquí.`;
  const reminderPreview = `Hola ${recipientName}, te recordamos el seguimiento pendiente relacionado con tu solicitud de ${reminderTopic}. Respóndenos por aquí si deseas continuar o hacer algún ajuste.`;

  return [
    {
      id: "proposal",
      label: "Enviar propuesta",
      description: "Utility",
      enabled: Boolean(context?.proposal?.publicUrl),
      disabledReason: context?.proposal?.publicUrl ? undefined : "Selecciona una propuesta.",
      preview: proposalPreview,
      variables: [
        `{{1}} = ${recipientName}`,
        `{{2}} = ${topicLabel}`,
        `{{3}} = ${proposalUrl || "—"}`,
      ],
    },
    {
      id: "invoice",
      label: "Enviar factura",
      description: "Utility",
      enabled: false,
      disabledReason: "No hay factura disponible.",
      preview: `Hola ${recipientName}, te compartimos la factura relacionada con el servicio solicitado: ${topicLabel}. Puedes verla aquí: —. Si necesitas ayuda o tienes alguna pregunta, respóndenos por aquí.`,
      variables: [`{{1}} = ${recipientName}`, `{{2}} = ${topicLabel}`, "{{3}} = enlace de factura"],
    },
    {
      id: "follow_up",
      label: "Enviar seguimiento",
      description: "Utility",
      enabled: true,
      preview: followUpPreview,
      variables: [`{{1}} = ${recipientName}`, `{{2}} = ${topicLabel}`],
    },
    {
      id: "project_update",
      label: "Enviar actualización",
      description: "Utility",
      enabled: Boolean(context?.projectName || context?.dealName),
      disabledReason:
        context?.projectName || context?.dealName ? undefined : "No hay proyecto activo.",
      preview: projectPreview,
      variables: [
        `{{1}} = ${recipientName}`,
        `{{2}} = ${projectTopic}`,
        `{{3}} = ${context?.proposal?.publicUrl || "—"}`,
      ],
    },
    {
      id: "documents",
      label: "Enviar documentos",
      description: "Utility",
      enabled: false,
      disabledReason: "No hay documentos disponibles.",
      preview: `Hola ${recipientName}, te compartimos los documentos relacionados con tu solicitud/proyecto de ${topicLabel}: —. Si tienes alguna duda, respóndenos por aquí.`,
      variables: [
        `{{1}} = ${recipientName}`,
        `{{2}} = ${topicLabel}`,
        "{{3}} = enlaces/documentos",
      ],
    },
    {
      id: "reminder",
      label: "Enviar recordatorio",
      description: "Utility",
      enabled: true,
      preview: reminderPreview,
      variables: [`{{1}} = ${recipientName}`, `{{2}} = ${reminderTopic}`],
    },
  ];
}
