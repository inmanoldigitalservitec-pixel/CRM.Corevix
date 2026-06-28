import { useEffect } from "react";
import { type Lang, useT } from "@/i18n";

type Dictionary = Record<string, string>;

const EN_TO_ES: Dictionary = {
  // Common actions
  "Add": "Agregar",
  "Add Lead": "Nuevo prospecto",
  "Add Client": "Nuevo cliente",
  "Add Project": "Nuevo proyecto",
  "Add Product": "Nuevo producto",
  "Add Task": "Nueva tarea",
  "New": "Nuevo",
  "New Lead": "Nuevo prospecto",
  "New Client": "Nuevo cliente",
  "New Project": "Nuevo proyecto",
  "New Product": "Nuevo producto",
  "New Task": "Nueva tarea",
  "Create": "Crear",
  "Create Project": "Crear proyecto",
  "Create Product": "Crear producto",
  "Create Lead": "Crear prospecto",
  "Create Client": "Crear cliente",
  "Save": "Guardar",
  "Save changes": "Guardar cambios",
  "Cancel": "Cancelar",
  "Edit": "Editar",
  "Delete": "Eliminar",
  "Search": "Buscar",
  "Search…": "Buscar…",
  "Search...": "Buscar...",
  "View": "Ver",
  "Open": "Abrir",
  "Close": "Cerrar",
  "Actions": "Acciones",
  "More": "Más",
  "Loading…": "Cargando…",
  "Loading...": "Cargando...",
  "No results": "Sin resultados",
  "No data": "Sin datos",
  "No items found": "No se encontraron elementos",
  "None": "Ninguno",
  "All": "Todos",
  "Active": "Activo",
  "Inactive": "Inactivo",
  "Pending": "Pendiente",
  "Draft": "Borrador",
  "Sent": "Enviado",
  "Viewed": "Visto",
  "Accepted": "Aceptado",
  "Rejected": "Rechazado",
  "Expired": "Vencido",
  "Paid": "Pagado",
  "Overdue": "Vencido",

  // Navigation / modules
  "Dashboard": "Panel",
  "Leads": "Prospectos",
  "Clients": "Clientes",
  "Pipeline": "Pipeline",
  "Projects": "Proyectos",
  "Products": "Productos",
  "Tasks": "Tareas",
  "Proposals": "Propuestas",
  "Invoices": "Facturas",
  "Reports": "Reportes",
  "Team": "Equipo",
  "Settings": "Configuración",
  "Automations": "Automatizaciones",
  "Email Inbox": "Bandeja de correo",
  "AI Assistant": "Asistente IA",
  "Main": "Principal",
  "Communication": "Comunicación",
  "Operations": "Operaciones",
  "Management": "Gestión",

  // CRM fields
  "Name": "Nombre",
  "Full Name": "Nombre completo",
  "Company Name": "Empresa",
  "Company": "Empresa",
  "Client": "Cliente",
  "Clients": "Clientes",
  "Lead": "Prospecto",
  "Product": "Producto",
  "Project": "Proyecto",
  "Task": "Tarea",
  "Status": "Estado",
  "Priority": "Prioridad",
  "Owner": "Responsable",
  "Manager": "Manager",
  "Responsible": "Responsable",
  "Assigned to": "Asignado a",
  "Email": "Correo",
  "Phone": "Teléfono",
  "WhatsApp": "WhatsApp",
  "Website": "Sitio web",
  "Address": "Dirección",
  "City": "Ciudad",
  "Country": "País",
  "Industry": "Industria",
  "Notes": "Notas",
  "Description": "Descripción",
  "Budget": "Presupuesto",
  "Progress": "Progreso",
  "Timeline": "Cronograma",
  "Delivery": "Entrega",
  "Start date": "Fecha inicio",
  "Due date": "Fecha entrega",
  "Created": "Creado",
  "Updated": "Actualizado",
  "Revenue": "Ingresos",
  "Value": "Valor",
  "Stage": "Etapa",
  "Source": "Fuente",
  "Category": "Categoría",
  "Type": "Tipo",
  "Price": "Precio",
  "Currency": "Moneda",
  "Billing": "Facturación",
  "Duration": "Duración",
  "Deliverables": "Entregables",

  // Status / priority values
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  "Completed": "Completado",
  "Cancelled": "Cancelado",
  "To Do": "Por hacer",
  "Waiting": "En espera",
  "Waiting on Client": "Esperando al cliente",
  "Low": "Baja",
  "Medium": "Media",
  "High": "Alta",
  "Urgent": "Urgente",
  "Contacted": "Contactado",
  "Qualified": "Calificado",
  "Proposal Sent": "Propuesta enviada",
  "Negotiation": "Negociación",
  "Won": "Ganado",
  "Lost": "Perdido",
  "VIP": "VIP",
  "Past Client": "Cliente anterior",

  // Lists / filters
  "Search projects...": "Buscar proyectos...",
  "Search products...": "Buscar productos...",
  "Search leads...": "Buscar prospectos...",
  "Search clients...": "Buscar clientes...",
  "Search tasks...": "Buscar tareas...",
  "Search email...": "Buscar correo...",
  "All Statuses": "Todos los estados",
  "All Clients": "Todos los clientes",
  "All Products": "Todos los productos",
  "All Managers": "Todos los managers",
  "All Tasks": "Todas las tareas",
  "No tasks": "Sin tareas",
  "No projects": "Sin proyectos",
  "No products": "Sin productos",
  "No clients": "Sin clientes",
  "No leads": "Sin prospectos",

  // Detail tabs
  "Summary": "Resumen",
  "Contacts": "Contactos",
  "Finance": "Finanzas",
  "Activity": "Actividad",
  "Overview": "Resumen",
  "Details": "Detalles",
  "Files": "Archivos",

  // Email
  "Primary": "Principal",
  "Promotions": "Promociones",
  "Social": "Social",
  "Updates": "Actualizaciones",
  "Forums": "Foros",
  "Inbox": "Bandeja",
  "Unread": "No leídos",
  "Starred": "Destacados",
  "Sent Mail": "Enviados",
  "Drafts": "Borradores",
  "Purchases": "Compras",
  "Compose": "Redactar",
  "Reply": "Responder",
  "Send": "Enviar",
  "Archive": "Archivar",
  "Trash": "Papelera",
  "Refresh": "Actualizar",
};

const ES_TO_EN: Dictionary = Object.fromEntries(
  Object.entries(EN_TO_ES).map(([english, spanish]) => [spanish, english]),
);

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function translateExact(value: string, lang: Lang) {
  const normalized = normalizeText(value);
  if (!normalized) return value;
  const dictionary = lang === "es" ? EN_TO_ES : ES_TO_EN;
  return dictionary[normalized] || value;
}

function translateWithCounts(value: string, lang: Lang) {
  const normalized = normalizeText(value);
  const projects = normalized.match(/^(\d+) projects$/i);
  if (projects) return lang === "es" ? `${projects[1]} proyectos` : normalized;

  const products = normalized.match(/^(\d+) products$/i);
  if (products) return lang === "es" ? `${products[1]} productos` : normalized;

  const clients = normalized.match(/^(\d+) clients$/i);
  if (clients) return lang === "es" ? `${clients[1]} clientes` : normalized;

  const leads = normalized.match(/^(\d+) leads$/i);
  if (leads) return lang === "es" ? `${leads[1]} prospectos` : normalized;

  const tasks = normalized.match(/^(\d+) tasks$/i);
  if (tasks) return lang === "es" ? `${tasks[1]} tareas` : normalized;

  const esProjects = normalized.match(/^(\d+) proyectos$/i);
  if (esProjects) return lang === "en" ? `${esProjects[1]} projects` : normalized;

  return value;
}

function translateValue(value: string, lang: Lang) {
  return translateWithCounts(translateExact(value, lang), lang);
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  const tag = element.tagName.toLowerCase();
  if (["script", "style", "textarea", "input", "code", "pre"].includes(tag)) return true;
  if (element.closest("[data-no-auto-translate]")) return true;
  return false;
}

function translateElementAttributes(root: ParentNode, lang: Lang) {
  if (!(root as Element).querySelectorAll) return;
  const elements = (root as Element).querySelectorAll<HTMLElement>(
    "[placeholder], [aria-label], [title], [data-state]",
  );
  elements.forEach((element) => {
    if (shouldSkipElement(element)) return;
    ["placeholder", "aria-label", "title"].forEach((attr) => {
      const current = element.getAttribute(attr);
      if (!current) return;
      const next = translateValue(current, lang);
      if (next !== current) element.setAttribute(attr, next);
    });
  });
}

function translateTextNodes(root: ParentNode, lang: Lang) {
  if (typeof document === "undefined") return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      const value = normalizeText(node.textContent || "");
      if (!value) return NodeFilter.FILTER_REJECT;
      if (value.length > 80) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    const current = node.textContent || "";
    const next = translateValue(current, lang);
    if (next !== current) node.textContent = current.replace(normalizeText(current), next);
  });
}

function translatePage(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  translateTextNodes(document.body, lang);
  translateElementAttributes(document.body, lang);
}

export function DomLanguageBridge() {
  const { lang } = useT();

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => translatePage(lang));
    };

    schedule();

    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
    });

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}
