import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DemoTourStep = {
  id: string;
  module: string;
  moduleTitle: string;
  title: string;
  description: string;
  to: string;
  selector?: string;
  mode?: "explain" | "action";
  actionLabel?: string;
};

type DemoTourApi = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const DemoTourContext = createContext<DemoTourApi | null>(null);

export function useDemoTour() {
  const ctx = useContext(DemoTourContext);
  if (!ctx) throw new Error("useDemoTour must be used within DemoTourProvider");
  return ctx;
}

const STORAGE_KEY = "crm_demo_tour_v1";
const DEMO_ACTIVE_STORAGE_KEY = "crm_demo_active";
const DEMO_CONVERSATION_ID = "10000000-0000-4000-8000-000000000103";
const DEMO_CONVERSATION_STORAGE_KEY = "crm_demo_conversation_id";
const DEMO_LEAD_ID = "10000000-0000-4000-8000-000000000102";
const DEMO_LEAD_STORAGE_KEY = "crm_demo_lead_id";
const DEMO_DEAL_ID = "10000000-0000-4000-8000-000000000105";
const DEMO_DEAL_STORAGE_KEY = "crm_demo_deal_id";
const DEMO_INVOICE_PUBLIC_URL = "/invoice/public/c3d38f89-1f84-48f0-a61d-ae61a0500f74";

function safeGetRect(el: Element | null) {
  if (!el) return null;
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return null;
  if (r.width <= 0 || r.height <= 0) return null;
  return r;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scrollIntoViewIfNeeded(el: Element | null) {
  if (!el) return;
  try {
    (el as HTMLElement).scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  } catch {}
}

export function DemoTourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const steps: DemoTourStep[] = useMemo(
    () => [
      {
        id: "whatsapp-start",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Entrada del lead por WhatsApp",
        description:
          "El flujo empieza cuando un prospecto escribe por WhatsApp. Aquí el equipo ve todas las conversaciones entrantes.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-conversation-list"]',
      },
      {
        id: "whatsapp-select-conversation",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Selecciona la conversación demo",
        description:
          "Haz clic en la conversación demo para abrir el historial del prospecto y ver el contexto antes de tomar acción.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-conversation-list"]',
        mode: "action",
        actionLabel: "Haz clic en la conversación demo y luego presiona Siguiente",
      },
      {
        id: "whatsapp-thread",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Conversación activa",
        description:
          "En el centro se atiende al prospecto. Aquí puedes leer mensajes, entender la necesidad y responder si la ventana está disponible.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-active-thread"]',
      },
      {
        id: "whatsapp-crm-panel",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Panel CRM conectado",
        description:
          "A la derecha aparece el panel CRM. Desde aquí puedes convertir una conversación en lead, oportunidad, propuesta, tarea o cliente.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-crm-panel"]',
      },
      {
        id: "whatsapp-create-lead-action",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Crea el prospecto desde WhatsApp",
        description:
          "Haz clic en Crear prospecto desde WhatsApp. Esta acción conecta la conversación con el módulo de Prospectos.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-create-lead"]',
        mode: "action",
        actionLabel: "Haz clic en Crear prospecto desde WhatsApp y luego presiona Siguiente",
      },
      {
        id: "whatsapp-quick-actions",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Acciones rápidas",
        description:
          "Después de crear o detectar un prospecto, el panel permite avanzar el proceso comercial sin salir de WhatsApp.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-quick-actions"]',
      },
      {
        id: "whatsapp-create-opportunity-action",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Crea una oportunidad",
        description:
          "Haz clic en Crear oportunidad para pasar de una simple conversación a una oportunidad dentro del pipeline comercial.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-create-deal"]',
        mode: "action",
        actionLabel: "Haz clic en Crear oportunidad y luego presiona Siguiente",
      },
      {
        id: "whatsapp-detected-data",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Datos detectados",
        description:
          "El CRM puede mostrar datos útiles detectados en la conversación, como nombre, teléfono, intención, servicio o información comercial.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-detected-data"]',
      },
      {
        id: "whatsapp-product",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Producto sugerido",
        description:
          "El sistema relaciona la conversación con un producto de interés. Esto ayuda a conectar el lead con una oportunidad y una propuesta.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-suggested-product"]',
      },
      {
        id: "whatsapp-followup",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Seguimiento conectado a tareas",
        description:
          "Los seguimientos comerciales se convierten en tareas. Así el equipo sabe qué hacer, cuándo hacerlo y con quién.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-followup"]',
      },
      {
        id: "whatsapp-proposals",
        module: "Módulo 1",
        moduleTitle: "WhatsApp",
        title: "Propuestas desde WhatsApp",
        description:
          "El agente puede seleccionar una propuesta y continuar el proceso comercial desde el mismo panel de WhatsApp.",
        to: "/whatsapp",
        selector: '[data-demo="whatsapp-proposals"]',
      },

      {
        id: "leads-main",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Administrar leads",
        description:
          "Aquí se revisan los prospectos capturados desde WhatsApp, formularios u otros canales. El equipo puede filtrar, asignar y priorizar oportunidades.",
        to: "/leads",
        selector: '[data-demo="leads-main"]',
      },
      {
        id: "leads-new-lead",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Crear lead manualmente",
        description:
          "Además de capturar prospectos automáticamente desde WhatsApp, también puedes crear un lead manualmente desde el botón Nuevo lead.",
        to: "/leads",
        selector: '[data-demo="leads-new-lead-button"]',
      },
      {
        id: "leads-detail-summary",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Detalles del prospecto",
        description:
          "Esta parte resume la información principal del lead: empresa, email, teléfono, responsable, interés, valor estimado, última actividad y próximo paso.",
        to: "/leads",
        selector: '[data-demo="leads-detail-summary"]',
      },
      {
        id: "leads-quick-actions",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Acciones rápidas del lead",
        description:
          "Cuando abres el detalle de un prospecto, aquí puedes escribir por WhatsApp, enviar email, llamar o crear un seguimiento.",
        to: "/leads",
        selector: '[data-demo="leads-quick-actions"]',
      },
      {
        id: "leads-followup",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Seguimiento del prospecto",
        description:
          "El seguimiento se conecta con tareas del CRM para que el equipo no olvide llamar, escribir o revisar una propuesta pendiente.",
        to: "/leads",
        selector: '[data-demo="leads-followup"]',
      },
      {
        id: "leads-assignment",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Asignación del responsable",
        description:
          "Cada prospecto puede tener un responsable. Esto evita confusión y deja claro quién debe atender el seguimiento.",
        to: "/leads",
        selector: '[data-demo="leads-assignment"]',
      },
      {
        id: "leads-contact",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Datos de contacto",
        description:
          "Aquí están los datos principales del prospecto: teléfono, WhatsApp y servicio de interés.",
        to: "/leads",
        selector: '[data-demo="leads-contact"]',
      },
      {
        id: "leads-last-activity",
        module: "Módulo 2",
        moduleTitle: "Prospectos",
        title: "Última actividad",
        description:
          "Esta sección muestra cuándo fue la última interacción registrada para entender qué tan reciente está el contacto.",
        to: "/leads",
        selector: '[data-demo="leads-last-activity"]',
      },

      {
        id: "pipeline-main",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Vista general del pipeline",
        description:
          "El pipeline muestra las oportunidades comerciales por etapa. Aquí puedes ver el valor total, cantidad de oportunidades, ticket promedio, tasa de cierre y ventas ganadas.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-main"]',
      },
      {
        id: "pipeline-new-deal",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Crear oportunidad manual",
        description:
          "La mayoría de oportunidades nacen desde WhatsApp o Prospectos, pero también puedes crear una oportunidad manual. Lo ideal es conectarla a un prospecto existente o a un cliente actual que quiere comprar otro producto.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-new-deal-button"]',
      },
      {
        id: "pipeline-board",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Board de oportunidades",
        description:
          "El board organiza las oportunidades en columnas. Cada columna representa una etapa del proceso comercial: nuevo, discovery, calificado, propuesta, negociación y cierre.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-board"]',
      },
      {
        id: "pipeline-stage-new",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Etapa 1: Nueva oportunidad",
        description:
          "Aquí entran las oportunidades recién creadas. Normalmente todavía necesitan validación, primer contacto o revisión inicial.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-stage-1"]',
      },
      {
        id: "pipeline-stage-discovery",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Etapa 2: Discovery",
        description:
          "En Discovery se entiende mejor la necesidad del prospecto: qué quiere resolver, presupuesto, urgencia y si realmente encaja con el servicio.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-stage-2"]',
      },
      {
        id: "pipeline-stage-qualified",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Etapa 3: Calificado",
        description:
          "Una oportunidad calificada ya tiene señales claras de interés. Aquí el equipo puede preparar propuesta o definir el siguiente paso comercial.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-stage-3"]',
      },
      {
        id: "pipeline-stage-proposal",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Etapa 4: Propuesta enviada",
        description:
          "Aquí están las oportunidades que ya recibieron una propuesta. El foco es dar seguimiento, resolver dudas y mover la venta hacia cierre.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-stage-4"]',
      },
      {
        id: "pipeline-stage-negotiation",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Etapa 5: Negociación",
        description:
          "En negociación se ajustan condiciones, alcance o precio. Es la etapa previa a marcar la oportunidad como ganada o perdida.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-stage-5"]',
      },
      {
        id: "pipeline-detail-summary",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Detalle de oportunidad",
        description:
          "Al abrir una oportunidad, el panel derecho resume etapa, valor, probabilidad, cierre esperado, responsable, cliente y prospecto conectado.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-detail-summary"]',
      },
      {
        id: "pipeline-close",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Cierre de oportunidad",
        description:
          "Cuando la negociación termina, puedes marcar la oportunidad como ganada o perdida. Esto alimenta las métricas de ventas y el historial comercial.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-close"]',
      },
      {
        id: "pipeline-commercial-summary",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Resumen comercial",
        description:
          "Esta sección muestra el valor, probabilidad, fecha estimada de cierre y responsable. Sirve para tomar decisiones rápidas sobre la oportunidad.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-commercial-summary"]',
      },
      {
        id: "pipeline-prospect",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Prospecto conectado",
        description:
          "La oportunidad queda conectada al prospecto original. Así puedes regresar al lead, ver su contacto y entender de dónde viene la venta.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-prospect"]',
      },
      {
        id: "pipeline-products",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Productos de la oportunidad",
        description:
          "Aquí se asocia el producto vendido. Esto permite calcular valor, preparar propuesta y luego crear proyectos con el workflow correcto.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-deal-products"]',
      },
      {
        id: "pipeline-followup",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Seguimiento de oportunidad",
        description:
          "El seguimiento evita que una oportunidad quede olvidada. Puedes crear tareas comerciales con fecha, prioridad y responsable.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-followup"]',
      },
      {
        id: "pipeline-actions",
        module: "Módulo 3",
        moduleTitle: "Pipeline",
        title: "Acciones rápidas",
        description:
          "Desde acciones rápidas puedes escribir por WhatsApp, enviar email, llamar o crear seguimiento sin salir de la oportunidad.",
        to: "/pipeline",
        selector: '[data-demo="pipeline-actions"]',
      },

      {
        id: "proposals-main",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Crear y enviar propuestas",
        description:
          "En propuestas se preparan ofertas comerciales conectadas a leads, clientes, productos y oportunidades. Cada propuesta puede tener enlace público.",
        to: "/proposals",
        selector: '[data-demo="proposals-main"]',
      },

      {
        id: "proposals-create",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Crear una nueva propuesta",
        description:
          "Desde aquí puedes crear una propuesta conectada a un prospecto, cliente, oportunidad y producto. La idea es que la propuesta salga rápida usando datos ya existentes.",
        to: "/proposals",
        selector: '[data-demo="proposal-editor"]',
      },
      {
        id: "proposals-main-fields",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Datos principales",
        description:
          "Aquí se define lo esencial: título, estado, destinatario, producto, monto, moneda y fecha de validez. Esta parte debe ser rápida y clara.",
        to: "/proposals",
        selector: '[data-demo="proposal-main-fields"]',
      },
      {
        id: "proposals-product",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Producto y datos automáticos",
        description:
          "Al seleccionar un producto, puedes usar sus datos base para llenar entregables, precio, tiempo y condiciones. Así no tienes que escribir todo desde cero.",
        to: "/proposals",
        selector: '[data-demo="proposal-product-selector"]',
      },
      {
        id: "proposals-validity",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Validez rápida",
        description:
          "La propuesta puede tener una fecha de validez. Usa opciones rápidas como 7, 15 o 30 días para evitar escribir fechas manualmente.",
        to: "/proposals",
        selector: '[data-demo="proposal-validity"]',
      },
      {
        id: "proposals-approve-creates-invoice",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Aprobación y factura automática",
        description:
          "Cuando el cliente abre el enlace público y hace clic en Aprobar propuesta, el CRM marca la propuesta como aprobada y genera automáticamente una factura en el módulo de Invoices.",
        to: "/proposals",
        selector: '[data-demo="proposal-public-preview"]',
      },
      {
        id: "proposals-row-actions",
        module: "Módulo 4",
        moduleTitle: "Propuestas",
        title: "Acciones rápidas de propuesta",
        description:
          "Cada propuesta tiene acciones rápidas: ver detalles, copiar el enlace público, abrir la versión que verá el cliente y editar el contenido cuando haga falta.",
        to: "/proposals",
        selector: '[data-demo="proposal-row-actions"]',
      },
      {
        id: "invoices-main",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Módulo de facturas",
        description:
          "Invoices centraliza las facturas generadas por el CRM. Cuando un cliente aprueba una propuesta pública, el sistema puede crear una factura automáticamente.",
        to: "/invoices",
        selector: '[data-demo="invoices-main"]',
      },
      {
        id: "invoices-generated-from-proposal",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Factura generada desde propuesta",
        description:
          "Esta factura viene conectada a una propuesta aprobada. Así el flujo queda organizado: prospecto, oportunidad, propuesta, factura y luego proyecto.",
        to: "/invoices",
        selector: '[data-demo="invoice-first-row"]',
      },
      {
        id: "invoices-status",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Estado de la factura",
        description:
          "El estado indica si la factura está pendiente, enviada, pagada o vencida. Esto permite saber rápidamente qué clientes ya avanzaron al siguiente paso.",
        to: "/invoices",
        selector: '[data-demo="invoice-status"]',
      },
      {
        id: "invoices-copy-link",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Copiar enlace de factura",
        description:
          "Este botón copia el enlace público de la factura para enviarlo por WhatsApp, email o cualquier canal de comunicación.",
        to: "/invoices",
        selector: '[data-demo="invoice-copy-link"]',
      },
      {
        id: "invoices-open-public",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Ver factura pública",
        description:
          "Este botón abre la factura como la verá el cliente. Sirve para revisar el monto, los ítems, los datos de pago y el diseño antes de enviarla.",
        to: "/invoices",
        selector: '[data-demo="invoice-open-public"]',
      },
      {
        id: "invoices-public-preview",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Factura pública para el cliente",
        description:
          "Esta es la factura como la verá el cliente desde el enlace público. Aquí podrá revisar el monto, los ítems, la fecha de vencimiento y el botón de pago con PayPal.",
        to: "/invoices",
        selector: '[data-demo="invoice-public-preview"]',
      },
      {
        id: "invoices-mark-paid",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "Marcar como pagada",
        description:
          "Cuando la factura se marca como pagada, el CRM puede crear automáticamente el proyecto relacionado y activar el trabajo operativo.",
        to: "/invoices",
        selector: '[data-demo="invoice-mark-paid"], [data-demo="invoice-status-control"]',
      },
      {
        id: "invoices-create-project",
        module: "Módulo 5",
        moduleTitle: "Invoices",
        title: "De factura a proyecto",
        description:
          "Después del pago, el siguiente paso es crear o abrir el proyecto. Así el equipo pasa de venta cerrada a ejecución del servicio.",
        to: "/invoices",
        selector: '[data-demo="invoice-create-project"], [data-demo="invoice-view-project"]',
      },

      {
        id: "projects-main",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Módulo de proyectos",
        description:
          "Projects es donde empieza la ejecución real del trabajo. Después de una factura pagada, el equipo puede convertir la venta en un proyecto operativo.",
        to: "/projects",
        selector: '[data-demo="projects-main"]',
      },
      {
        id: "projects-list",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Panel de proyectos",
        description:
          "Aquí se organiza todo el portafolio de proyectos. Puedes buscar, filtrar por estado, cliente, producto, manager o tareas para saber qué necesita atención.",
        to: "/projects",
        selector: '[data-demo="projects-list"]',
      },
      {
        id: "projects-first-row",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Proyecto creado desde la venta",
        description:
          "Cada fila representa un proyecto. Normalmente nace después de una oportunidad ganada, una propuesta aprobada o una factura pagada.",
        to: "/projects",
        selector: '[data-demo="projects-first-row"]',
      },
      {
        id: "projects-status",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Estado del proyecto",
        description:
          "El estado permite saber si el proyecto no ha iniciado, está en progreso, está pausado, completado o cancelado.",
        to: "/projects",
        selector: '[data-demo="projects-status"]',
      },
      {
        id: "projects-progress",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Progreso por tareas",
        description:
          "El progreso se puede calcular según las tareas completadas. Esto ayuda a ver rápidamente cuánto avance real tiene el proyecto.",
        to: "/projects",
        selector: '[data-demo="projects-progress"]',
      },
      {
        id: "projects-manager",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Responsable del proyecto",
        description:
          "El manager o responsable mantiene el control operativo. Así el equipo sabe quién debe dar seguimiento y coordinar la entrega.",
        to: "/projects",
        selector: '[data-demo="projects-manager"]',
      },
      {
        id: "projects-task-summary",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Resumen de tareas",
        description:
          "Esta columna resume cuántas tareas tiene el proyecto, cuántas están completadas, cuántas siguen pendientes y si hay tareas vencidas.",
        to: "/projects",
        selector: '[data-demo="projects-task-summary"]',
      },
      {
        id: "projects-relations",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Relaciones del proyecto",
        description:
          "Dentro del detalle se conectan cliente, producto, oportunidad y lead. Esto mantiene el contexto completo desde la venta hasta la ejecución.",
        to: "/projects",
        selector: '[data-demo="projects-relations"]',
      },
      {
        id: "projects-progress-detail",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Seguimiento del progreso",
        description:
          "El detalle muestra el avance del proyecto con base en las tareas. Si hay tareas vencidas, el equipo puede detectarlo rápido.",
        to: "/projects",
        selector: '[data-demo="projects-progress-detail"]',
      },
      {
        id: "projects-tasks",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Tareas del proyecto",
        description:
          "Aquí vive el trabajo diario. Las tareas convierten el proyecto en pasos concretos con estado, prioridad, fecha y responsable.",
        to: "/projects",
        selector: '[data-demo="projects-tasks"]',
      },
      {
        id: "projects-create-task",
        module: "Módulo 6",
        moduleTitle: "Proyectos",
        title: "Crear tareas operativas",
        description:
          "Desde el proyecto puedes crear nuevas tareas para el equipo. Así cada entrega queda asignada y con seguimiento dentro del CRM.",
        to: "/projects",
        selector: '[data-demo="projects-create-task"]',
      },
      {
        id: "clients-main",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Módulo Cliente 360",
        description:
          "Cliente 360 centraliza toda la relación con cada cuenta: contacto, responsable, productos, oportunidades, propuestas, facturas, proyectos, tareas y actividad.",
        to: "/clients",
        selector: '[data-demo="clients-main"]',
      },
      {
        id: "clients-account-center",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Centro de cuenta",
        description:
          "Este resumen te dice si todo está bajo control o si hay cuentas que necesitan atención. Es una alerta rápida para no perder seguimiento comercial.",
        to: "/clients",
        selector: '[data-demo="clients-account-center"]',
      },
      {
        id: "clients-metrics",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Métricas de clientes",
        description:
          "Estas métricas resumen clientes activos, VIP, cuentas en riesgo, contactos, proyectos activos, facturas pendientes y tareas atrasadas.",
        to: "/clients",
        selector: '[data-demo="clients-metrics"]',
      },
      {
        id: "clients-list-panel",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Panel de clientes",
        description:
          "Desde aquí puedes buscar y filtrar clientes por estado, responsable, industria, contactos, salud, finanzas y actividad reciente.",
        to: "/clients",
        selector: '[data-demo="clients-list-panel"]',
      },
      {
        id: "client-360-first-client",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Cliente como centro del historial",
        description:
          "Cada fila representa un cliente. Al hacer clic en cualquier cliente, se abre su panel Cliente 360 con todo el historial de esa cuenta.",
        to: "/clients",
        selector: '[data-demo="clients-list-panel"]',
      },
      {
        id: "client-360-summary",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Panel Cliente 360",
        description:
          "Este panel lateral concentra toda la información del cliente en una sola vista: datos principales, salud, productos, proyectos, tareas, finanzas, oportunidades y actividad reciente.",
        to: "/clients",
        selector: '[data-demo="client-360-panel"]',
      },
      {
        id: "client-360-contacts",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Contactos del cliente",
        description:
          "Cliente 360 puede manejar varios contactos de una misma empresa y marcar cuál es el contacto principal.",
        to: "/clients",
        selector: '[data-demo="client-360-contacts-section"]',
      },
      {
        id: "client-360-products",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Productos comprados",
        description:
          "Aquí puedes ver qué productos o servicios tiene asociado este cliente. Esto ayuda a entender qué compró y qué se le puede ofrecer después.",
        to: "/clients",
        selector: '[data-demo="client-360-products"]',
      },
      {
        id: "client-360-deals",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Oportunidades conectadas",
        description:
          "Las oportunidades muestran ventas abiertas o históricas del cliente. Así puedes revisar el valor comercial y en qué etapa está cada negociación.",
        to: "/clients",
        selector: '[data-demo="client-360-deals"]',
      },
      {
        id: "client-360-proposals",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Propuestas del cliente",
        description:
          "Desde Cliente 360 puedes ver propuestas enviadas, pendientes o aprobadas para saber qué ofertas tiene el cliente sobre la mesa.",
        to: "/clients",
        selector: '[data-demo="client-360-proposals"], [data-demo="client-360-finance"]',
      },
      {
        id: "client-360-invoices",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Facturas y finanzas",
        description:
          "Esta sección ayuda a ver si el cliente tiene facturas pendientes, vencidas o pagadas. Es clave para seguimiento financiero.",
        to: "/clients",
        selector: '[data-demo="client-360-invoices"], [data-demo="client-360-finance"]',
      },
      {
        id: "client-360-projects",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Proyectos activos",
        description:
          "Los proyectos muestran qué trabajos están en ejecución para este cliente y el estado operativo de cada entrega.",
        to: "/clients",
        selector: '[data-demo="client-360-projects"]',
      },
      {
        id: "client-360-tasks",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Tareas y próximos pasos",
        description:
          "Aquí aparece el seguimiento pendiente: tareas abiertas, tareas vencidas y próximos pasos para mantener viva la relación con el cliente.",
        to: "/clients",
        selector: '[data-demo="client-360-next-step"], [data-demo="client-360-projects"]',
      },
      {
        id: "client-360-activity",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Actividad reciente",
        description:
          "La actividad reúne señales importantes: contactos actualizados, facturas, propuestas, tareas y oportunidades recientes.",
        to: "/clients",
        selector: '[data-demo="client-360-activity"]',
      },
      {
        id: "client-360-create-task",
        module: "Módulo 6",
        moduleTitle: "Cliente 360",
        title: "Crear seguimiento desde Cliente 360",
        description:
          "Desde la ficha del cliente puedes crear una tarea de seguimiento sin salir del contexto. Así ningún próximo paso queda perdido.",
        to: "/clients",
        selector: '[data-demo="client-360-create-task"], [data-demo="client-360-next-step"]',
      },
      {
        id: "products-main",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Módulo de productos",
        description:
          "Productos es el catálogo de lo que vende la empresa. No es solo una lista: aquí se define precio, modalidad de cobro, entregables y proceso de ejecución.",
        to: "/products",
        selector: '[data-demo="products-main"]',
      },
      {
        id: "products-list",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Panel de productos",
        description:
          "Este panel permite buscar y filtrar productos por categoría, tipo, modalidad de cobro y estado. Así el equipo sabe qué servicios están disponibles para vender.",
        to: "/products",
        selector: '[data-demo="products-list"]',
      },
      {
        id: "products-first-row",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Producto como servicio vendible",
        description:
          "Cada fila representa un producto, servicio, paquete o suscripción. Estos productos pueden conectarse a prospectos, oportunidades, propuestas, facturas y proyectos.",
        to: "/products",
        selector: '[data-demo="products-first-row"]',
      },
      {
        id: "products-price",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Precio base",
        description:
          "El precio base ayuda a llenar propuestas y facturas más rápido. Luego puede ajustarse según el caso, pero sirve como punto de partida comercial.",
        to: "/products",
        selector: '[data-demo="products-price"]',
      },
      {
        id: "products-billing",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Modalidad de cobro",
        description:
          "La modalidad de cobro indica si el producto se cobra una sola vez, mensual, anual o de forma personalizada. Esto ayuda a preparar propuestas más claras.",
        to: "/products",
        selector: '[data-demo="products-billing"]',
      },
      {
        id: "products-active-status",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Estado activo o inactivo",
        description:
          "Los productos activos están disponibles para usarse en ventas. Los inactivos pueden quedar guardados sin aparecer como opción principal para el equipo.",
        to: "/products",
        selector: '[data-demo="products-active-status"]',
      },
      {
        id: "products-detail-summary",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Detalle del producto",
        description:
          "Al abrir un producto ves su categoría, tipo, precio y cobro. Esto permite validar rápido qué se vende y bajo qué condiciones.",
        to: "/products",
        selector: '[data-demo="products-detail-summary"]',
      },
      {
        id: "products-deliverables",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Entregables del producto",
        description:
          "Los entregables definen lo que recibirá el cliente. Esta información puede reutilizarse al crear propuestas para no escribir todo desde cero.",
        to: "/products",
        selector: '[data-demo="products-deliverables"]',
      },
      {
        id: "products-workflow",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Workflow de ejecución",
        description:
          "El workflow define cómo se ejecuta el producto después de venderse. Es la base para convertir una venta en tareas operativas dentro de proyectos.",
        to: "/products",
        selector: '[data-demo="products-workflow"]',
      },
      {
        id: "products-workflow-steps",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Pasos del workflow",
        description:
          "Cada paso del workflow representa una etapa de trabajo: qué se debe hacer, duración estimada, prioridad y rol responsable.",
        to: "/products",
        selector: '[data-demo="products-workflow-steps"]',
      },
      {
        id: "products-add-workflow-step",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Agregar pasos al proceso",
        description:
          "Puedes agregar pasos al workflow para estandarizar cómo se entrega cada servicio. Esto hace que los proyectos sean más consistentes.",
        to: "/products",
        selector: '[data-demo="products-add-workflow-step"]',
      },
      {
        id: "products-actions",
        module: "Módulo 7",
        moduleTitle: "Productos y workflows",
        title: "Acciones del producto",
        description:
          "Desde aquí puedes editar el producto o activar/desactivar su disponibilidad. Así controlas qué servicios se venden y cuáles quedan pausados.",
        to: "/products",
        selector: '[data-demo="products-actions"]',
      },
    ],
    [],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hasTarget, setHasTarget] = useState(false);

  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const leadDetailOpenedRef = useRef(false);
  const pipelineDetailOpenedRef = useRef(false);
  const proposalEditorOpenedRef = useRef(false);

  const close = useCallback(() => {
    setIsOpen(false);
    setTargetRect(null);
    setHasTarget(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DEMO_LEAD_STORAGE_KEY);
      localStorage.removeItem(DEMO_DEAL_STORAGE_KEY);
    } catch {}
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setStepIndex(0);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, stepIndex: 0 }));
      localStorage.setItem(DEMO_CONVERSATION_STORAGE_KEY, DEMO_CONVERSATION_ID);
      window.dispatchEvent(
        new CustomEvent("crm-demo-select-conversation", {
          detail: { conversationId: DEMO_CONVERSATION_ID },
        }),
      );
    } catch {}
  }, []);

  // Restore session (nice for demo mistakes)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.open) {
        setIsOpen(true);
        setStepIndex(typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0);
      }
    } catch {}
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ open: true, stepIndex }));
    } catch {}
  }, [isOpen, stepIndex]);

  // Navigate to the step route
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[stepIndex];
    if (!step) return;
    if (currentPath !== step.to) {
      navigate({ to: step.to });
    }
  }, [currentPath, isOpen, navigate, stepIndex, steps]);

  // Desde el paso 2 en adelante, abrir automáticamente el chat demo de WhatsApp.
  useEffect(() => {
    if (!isOpen) return;
    if (stepIndex < 1) return;

    const step = steps[stepIndex];
    if (!step || step.to !== "/whatsapp") return;

    try {
      localStorage.setItem(DEMO_CONVERSATION_STORAGE_KEY, DEMO_CONVERSATION_ID);
      window.dispatchEvent(
        new CustomEvent("crm-demo-select-conversation", {
          detail: { conversationId: DEMO_CONVERSATION_ID },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En el paso de aprobación de propuesta, mostrar iframe con la propuesta pública demo.
  useEffect(() => {
    if (!isOpen) {
      try {
        window.dispatchEvent(
          new CustomEvent("crm-demo-show-public-proposal", {
            detail: { open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    const shouldShowPublicProposal = step?.id === "proposals-approve-creates-invoice";

    try {
      window.dispatchEvent(
        new CustomEvent("crm-demo-show-public-proposal", {
          detail: { open: shouldShowPublicProposal },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Propuestas, abrir el editor y cambiar de tab cuando toque.
  useEffect(() => {
    if (!isOpen) {
      proposalEditorOpenedRef.current = false;
      try {
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-proposal-editor", {
            detail: { open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    if (!step) return;

    const proposalStepTabs: Record<string, string> = {
      "proposals-create": "general",
      "proposals-main-fields": "general",
      "proposals-product": "general",
      "proposals-validity": "general",
    };

    const tab = proposalStepTabs[step.id];
    const shouldOpenProposalEditor = step.to === "/proposals" && Boolean(tab);

    if (!shouldOpenProposalEditor) {
      proposalEditorOpenedRef.current = false;
      try {
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-proposal-editor", {
            detail: { open: false },
          }),
        );
      } catch {}
      return;
    }

    try {
      window.dispatchEvent(
        new CustomEvent("crm-demo-open-proposal-editor", {
          detail: {
            open: true,
            tab,
          },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Cliente 360, abrir el detalle del primer cliente.
  useEffect(() => {
    if (!isOpen) {
      try {
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-client-360", {
            detail: { open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    const stepsThatNeedClient360 = new Set([
      "client-360-summary",
      "client-360-contacts",
      "client-360-products",
      "client-360-deals",
      "client-360-proposals",
      "client-360-invoices",
      "client-360-projects",
      "client-360-tasks",
      "client-360-activity",
      "client-360-create-task",
    ]);

    const shouldOpenClient360 = step?.to === "/clients" && stepsThatNeedClient360.has(step.id);

    try {
      window.dispatchEvent(
        new CustomEvent("crm-demo-open-client-360", {
          detail: { open: shouldOpenClient360 },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Productos, abrir el detalle del primer producto.
  useEffect(() => {
    if (!isOpen) {
      try {
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-product-detail", {
            detail: { open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    const stepsThatNeedProductDetail = new Set([
      "products-detail-summary",
      "products-deliverables",
      "products-workflow",
      "products-workflow-steps",
      "products-add-workflow-step",
      "products-actions",
    ]);

    const shouldOpenProductDetail =
      step?.to === "/products" && stepsThatNeedProductDetail.has(step.id);

    try {
      window.dispatchEvent(
        new CustomEvent("crm-demo-open-product-detail", {
          detail: { open: shouldOpenProductDetail },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Proyectos, abrir el detalle del primer proyecto.
  useEffect(() => {
    if (!isOpen) {
      try {
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-project-detail", {
            detail: { open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    const stepsThatNeedProjectDetail = new Set([
      "projects-relations",
      "projects-progress-detail",
      "projects-tasks",
      "projects-create-task",
    ]);

    const shouldOpenProjectDetail =
      step?.to === "/projects" && stepsThatNeedProjectDetail.has(step.id);

    try {
      window.dispatchEvent(
        new CustomEvent("crm-demo-open-project-detail", {
          detail: { open: shouldOpenProjectDetail },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Pipeline, abrir el detalle de la oportunidad demo solo cuando toca.
  useEffect(() => {
    if (!isOpen) {
      pipelineDetailOpenedRef.current = false;
      try {
        localStorage.removeItem(DEMO_DEAL_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-deal-detail", {
            detail: { dealId: DEMO_DEAL_ID, open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    if (!step) return;

    const stepsThatNeedDealDetail = new Set([
      "pipeline-detail-summary",
      "pipeline-close",
      "pipeline-commercial-summary",
      "pipeline-prospect",
      "pipeline-products",
      "pipeline-followup",
      "pipeline-actions",
    ]);

    const shouldOpenDealDetail = step.to === "/pipeline" && stepsThatNeedDealDetail.has(step.id);

    if (!shouldOpenDealDetail) {
      pipelineDetailOpenedRef.current = false;
      try {
        localStorage.removeItem(DEMO_DEAL_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-deal-detail", {
            detail: { dealId: DEMO_DEAL_ID, open: false },
          }),
        );
      } catch {}
      return;
    }

    if (pipelineDetailOpenedRef.current) return;
    pipelineDetailOpenedRef.current = true;

    try {
      localStorage.setItem(DEMO_DEAL_STORAGE_KEY, DEMO_DEAL_ID);
      window.dispatchEvent(
        new CustomEvent("crm-demo-open-deal-detail", {
          detail: {
            dealId: DEMO_DEAL_ID,
            open: true,
          },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // En los pasos internos de Leads, abrir el detalle del lead demo solo cuando toca.
  // Si el paso no necesita el panel, lo cerramos para que no aparezca antes de tiempo.
  useEffect(() => {
    if (!isOpen) {
      leadDetailOpenedRef.current = false;
      try {
        localStorage.removeItem(DEMO_LEAD_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-lead-detail", {
            detail: { leadId: DEMO_LEAD_ID, open: false },
          }),
        );
      } catch {}
      return;
    }

    const step = steps[stepIndex];
    if (!step) return;

    const stepsThatNeedLeadDetail = new Set([
      "leads-detail-summary",
      "leads-quick-actions",
      "leads-followup",
      "leads-assignment",
      "leads-contact",
      "leads-last-activity",
    ]);

    const shouldOpenLeadDetail = step.to === "/leads" && stepsThatNeedLeadDetail.has(step.id);

    if (!shouldOpenLeadDetail) {
      leadDetailOpenedRef.current = false;
      try {
        localStorage.removeItem(DEMO_LEAD_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent("crm-demo-open-lead-detail", {
            detail: { leadId: DEMO_LEAD_ID, open: false },
          }),
        );
      } catch {}
      return;
    }

    if (leadDetailOpenedRef.current) return;
    leadDetailOpenedRef.current = true;

    try {
      localStorage.setItem(DEMO_LEAD_STORAGE_KEY, DEMO_LEAD_ID);
      window.dispatchEvent(
        new CustomEvent("crm-demo-open-lead-detail", {
          detail: {
            leadId: DEMO_LEAD_ID,
            open: true,
          },
        }),
      );
    } catch {}
  }, [isOpen, stepIndex, steps]);

  // Find and track target element position (without conditional hooks)
  useEffect(() => {
    if (!isOpen) return;

    const step = steps[stepIndex];
    const selector = step?.selector || null;

    const update = () => {
      const el = selector ? document.querySelector(selector) : null;
      if (el) scrollIntoViewIfNeeded(el);
      const rect = safeGetRect(el);
      setTargetRect(rect);
      setHasTarget(Boolean(rect));
    };

    update();

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(update, 250);

    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isOpen, stepIndex, steps]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStepIndex((i) => clamp(i + 1, 0, steps.length - 1));
      if (e.key === "ArrowLeft") setStepIndex((i) => clamp(i - 1, 0, steps.length - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen, steps.length]);

  useEffect(() => {
    try {
      if (isOpen) {
        localStorage.setItem(DEMO_ACTIVE_STORAGE_KEY, "true");
      } else {
        localStorage.removeItem(DEMO_ACTIVE_STORAGE_KEY);
      }

      window.dispatchEvent(
        new CustomEvent("crm-demo-active-changed", {
          detail: { active: isOpen },
        }),
      );
    } catch {}
  }, [isOpen]);

  const api = useMemo<DemoTourApi>(() => ({ open, close, isOpen }), [close, isOpen, open]);

  const overlay = isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[1000] pointer-events-none">
          {hasTarget && targetRect ? (
            <>
              {(() => {
                const pad = 8;
                const left = Math.max(0, targetRect.left - pad);
                const top = Math.max(0, targetRect.top - pad);
                const right = Math.min(window.innerWidth, targetRect.right + pad);
                const bottom = Math.min(window.innerHeight, targetRect.bottom + pad);

                return (
                  <>
                    <div
                      className="absolute left-0 right-0 top-0 bg-black/55"
                      style={{ height: top }}
                    />
                    <div
                      className="absolute left-0 bg-black/55"
                      style={{ top, width: left, height: Math.max(0, bottom - top) }}
                    />
                    <div
                      className="absolute right-0 bg-black/55"
                      style={{ top, left: right, height: Math.max(0, bottom - top) }}
                    />
                    <div
                      className="absolute left-0 right-0 bottom-0 bg-black/55"
                      style={{ top: bottom }}
                    />

                    <div
                      className="absolute rounded-[14px] ring-2 ring-[#1d62f9] shadow-[0_0_0_6px_rgba(29,98,249,0.16),0_18px_48px_rgba(29,98,249,0.22)]"
                      style={{
                        left,
                        top,
                        width: Math.max(0, right - left),
                        height: Math.max(0, bottom - top),
                      }}
                    />
                  </>
                );
              })()}
            </>
          ) : (
            <div className="absolute inset-0 bg-black/55" />
          )}

          {steps[stepIndex]?.id === "invoices-public-preview" ? (
            <div
              data-demo="invoice-public-preview"
              className="fixed left-1/2 top-1/2 z-[1050] hidden h-[86vh] w-[430px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border bg-white shadow-[0_30px_90px_rgba(2,6,23,0.45)] xl:block"
            >
              <div className="flex h-12 items-center justify-between border-b bg-white px-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">Vista pública de la factura</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {DEMO_INVOICE_PUBLIC_URL}
                  </div>
                </div>
              </div>

              <iframe
                title="Vista pública de factura demo"
                src={DEMO_INVOICE_PUBLIC_URL}
                className="h-[calc(100%-48px)] w-full border-0 bg-white"
              />
            </div>
          ) : null}

          <DemoTourCard
            step={steps[stepIndex]}
            index={stepIndex}
            total={steps.length}
            anchoredRect={hasTarget ? targetRect : null}
            onPrev={() => setStepIndex((i) => clamp(i - 1, 0, steps.length - 1))}
            onNext={() => setStepIndex((i) => clamp(i + 1, 0, steps.length - 1))}
            onClose={close}
          />
        </div>,
        document.body,
      )
    : null;

  // Cleanup any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <DemoTourContext.Provider value={api}>
      {children}
      {overlay}
    </DemoTourContext.Provider>
  );
}

function DemoTourCard({
  step,
  index,
  total,
  anchoredRect,
  onPrev,
  onNext,
  onClose,
}: {
  step: DemoTourStep | undefined;
  index: number;
  total: number;
  anchoredRect: DOMRect | null;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const safeStep = step || {
    id: "unknown",
    module: "Demo",
    moduleTitle: "CRM",
    title: "Demo",
    description: "—",
    to: "/",
  };

  const cardPosition = useMemo(() => {
    const margin = 20;

    if (!anchoredRect) {
      return {
        right: margin,
        bottom: margin,
      } as React.CSSProperties;
    }

    const targetIsOnRightPanel = anchoredRect.left > window.innerWidth * 0.62;
    const targetIsLow = anchoredRect.top > window.innerHeight * 0.52;

    if (targetIsOnRightPanel) {
      return {
        left: Math.max(260, margin),
        bottom: margin,
      } as React.CSSProperties;
    }

    if (targetIsLow) {
      return {
        right: margin,
        top: margin + 64,
      } as React.CSSProperties;
    }

    return {
      right: margin,
      bottom: margin,
    } as React.CSSProperties;
  }, [anchoredRect]);

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div
      className={cn(
        "fixed z-[1001] pointer-events-auto w-[min(420px,calc(100vw-40px))] rounded-[18px] border bg-white p-4 shadow-[0_28px_80px_rgba(2,6,23,0.55)]",
        "dark:bg-slate-950 dark:border-slate-800",
      )}
      style={cardPosition}
      role="dialog"
      aria-modal="true"
      aria-label="Demo tour"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-slate-500 dark:text-slate-400">
            {safeStep.module} · {safeStep.moduleTitle} · Paso {index + 1} de {total}
          </div>
          <div className="mt-1 text-[16px] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
            {safeStep.title}
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      <div className="mt-3 text-[13px] leading-[1.45] text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
        {safeStep.description}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" className="h-9 px-3 text-xs" onClick={onPrev} disabled={!canPrev}>
          Anterior
        </Button>
        <Button className="h-9 px-3 text-xs" onClick={onNext} disabled={!canNext}>
          {canNext ? "Siguiente" : "Finalizar"}
        </Button>
      </div>

      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Tip: usa <span className="font-mono">←</span>/<span className="font-mono">→</span> para
        navegar y <span className="font-mono">Esc</span> para cerrar.
      </div>
    </div>
  );
}
