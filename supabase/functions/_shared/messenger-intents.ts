import Fuse from "https://esm.sh/fuse.js@7.1.0";

export type MessengerIntent =
  | "web_interest"
  | "social_interest"
  | "crm_interest"
  | "advisor_request"
  | "business_hours_question"
  | "business_type"
  | "goal"
  | "reference_link"
  | "waiting"
  | "unknown";

export type IntentMatch = {
  intent: MessengerIntent;
  confidence: number;
  matchedTerm: string | null;
  method:
    | "direct_menu"
    | "reference"
    | "keyword"
    | "fuse"
    | "token_overlap"
    | "heuristic"
    | "unknown";
  normalizedText: string;
};

export function normalizeText(text: string): string {
  let s = String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return "";

  // Regional/informal abbreviations (standalone tokens only).
  s = s
    .replace(/\bxq\b/g, "porque")
    .replace(/\bpq\b/g, "porque")
    .replace(/\bq\b/g, "que")
    .replace(/\bk\b/g, "que")
    .replace(/\bpa\b/g, "para")
    .replace(/\btoy\b/g, "estoy")
    .replace(/\bta\b/g, "esta")
    .replace(/\bklk\b/g, "hola");

  return s.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  const t = normalizeText(text);
  return t ? t.split(" ").filter(Boolean) : [];
}

function hasReferenceLink(rawText: string): boolean {
  const t = String(rawText ?? "").toLowerCase();
  if (t.includes("http://") || t.includes("https://") || t.includes("www.")) return true;
  if (/@\w{2,}/.test(t)) return true;
  return false;
}

function directMenuIntent(normalized: string): MessengerIntent | null {
  // Direct menu mapping always wins.
  if (!normalized) return null;
  if (normalized === "1" || normalized.startsWith("1 ") || normalized.startsWith("1."))
    return "web_interest";
  if (normalized === "2" || normalized.startsWith("2 ") || normalized.startsWith("2."))
    return "social_interest";
  if (normalized === "3" || normalized.startsWith("3 ") || normalized.startsWith("3."))
    return "crm_interest";
  if (normalized === "4" || normalized.startsWith("4 ") || normalized.startsWith("4."))
    return "advisor_request";
  return null;
}

function tokenOverlapScore(inputTokens: string[], phraseTokens: string[]): number {
  if (phraseTokens.length === 0) return 0;
  let common = 0;
  const inputSet = new Set(inputTokens);
  for (const tok of phraseTokens) {
    if (inputSet.has(tok)) common += 1;
  }
  return common / phraseTokens.length;
}

function bestPhraseMatch(inputNormalized: string, inputTokens: string[], phrases: string[]) {
  let best = {
    score: 0,
    term: null as string | null,
    mode: "none" as "none" | "contains" | "tokens",
  };
  for (const raw of phrases) {
    const p = normalizeText(raw);
    if (!p) continue;
    if (inputNormalized.includes(p)) {
      // Strong match: phrase contained.
      const score = Math.min(0.95, 0.9 + Math.min(0.05, p.length / 200));
      if (score > best.score) best = { score, term: raw, mode: "contains" };
      continue;
    }
    const pTokens = tokenize(p);
    const overlap = tokenOverlapScore(inputTokens, pTokens);
    // Soft fuzzy-ish score: overlap of tokens.
    const score = overlap >= 0.8 ? 0.82 : overlap >= 0.6 ? 0.74 : overlap >= 0.5 ? 0.68 : 0;
    if (score > best.score) best = { score, term: raw, mode: "tokens" };
  }
  return best;
}

const catalog = {
  web_interest: [
    "pagina web",
    "página web",
    "web",
    "sitio web",
    "landing page",
    "quiero una web",
    "necesito pagina",
    "pagina para mi negocio",
    "vender por internet",
    "quiero una pagina",
    "quiero una página",
    "necesito una pagina web",
    "necesito una página web",
    "me interesa una web",
    "quiero hacer una web",
    "quiero crear una pagina",
    "crear pagina web",
    "diseño web",
    "landing",
    "pagina para vender",
    "página para vender",
    "página para mi negocio",
    "tienda online",
    "tienda en linea",
    "e-commerce",
    "ecommerce",
    "catalogo online",
    "catálogo online",
    "web para inmobiliaria",
    "web para constructora",
    "web para restaurante",
    "web para barberia",
    "web para barbería",
    "web para salon",
    "web para salón",
    "web para vender por internet",
    "paguina",
    "pajina",
    "pagina wep",
    "wed",
    "pajina web",
  ],
  social_interest: [
    "redes sociales",
    "instagram",
    "facebook",
    "contenido",
    "publicaciones",
    "reels",
    "manejo de redes",
    "marketing en redes",
    "redes",
    "tiktok",
    "manejar instagram",
    "crear contenido",
    "contenido para redes",
    "posts",
    "historias",
    "stories",
    "quiero vender por instagram",
    "quiero crecer en instagram",
    "quiero mas seguidores",
    "quiero más seguidores",
    "quiero mas mensajes",
    "quiero que me escriban mas",
    "publicidad en redes",
    "anuncios en facebook",
    "anuncios en instagram",
    "pauta digital",
    "campañas en redes",
    "marketing digital",
    "community manager",
    "necesito que me manejen las redes",
    "manejarme las redes",
    "mover instagram",
    "subir contenido",
    "hacer reels",
    "hacer publicaciones",
    "mejorar el instagram",
    "activar mi instagram",
    "mi cuenta esta parada",
    "mi cuenta está parada",
  ],
  crm_interest: [
    "crm",
    "automatizacion",
    "automatización",
    "organizar clientes",
    "seguimiento",
    "mensajes",
    "whatsapp",
    "pipeline",
    "ventas",
    "automatizar ventas",
    "sistema crm",
    "necesito un crm",
    "organizar mis clientes",
    "organizar mensajes",
    "organizar los mensajes",
    "se me pierden clientes",
    "se pierden los mensajes",
    "dar seguimiento",
    "automatizar seguimiento",
    "responder automatico",
    "responder automático",
    "chatbot",
    "bot",
    "whatsapp bot",
    "automatizar whatsapp",
    "bandeja de entrada",
    "centralizar mensajes",
    "proceso de ventas",
    "embudo de ventas",
    "control de clientes",
    "base de datos de clientes",
    "agendar clientes",
    "recordatorios",
    "tareas de ventas",
    "no doy abasto con los mensajes",
    "tengo muchos mensajes",
    "quiero ordenar mi negocio",
    "organizar el negocio",
    "poner orden",
    "poner orden en los clientes",
    "no perder clientes",
    "que no se me olviden los clientes",
    "dar seguimiento a prospectos",
    "controlar los prospectos",
  ],
  advisor_request: [
    "asesor",
    "asesora",
    "humano",
    "persona",
    "representante",
    "agente",
    "hablar con alguien",
    "hablar con un asesor",
    "llamada",
    "cotizacion",
    "cotización",
    "precio",
    "propuesta",
    "cotizar",
    "ejecutivo",
    "vendedor",
    "hablar con una persona",
    "hablar con un humano",
    "quiero hablar con alguien",
    "necesito hablar con alguien",
    "que me llamen",
    "llamenme",
    "llámenme",
    "llamarme",
    "llamada telefonica",
    "llamada telefónica",
    "quiero una llamada",
    "agendar llamada",
    "reunion",
    "reunión",
    "consulta",
    "cita",
    "presupuesto",
    "precios",
    "cuanto cuesta",
    "cuánto cuesta",
    "cuanto sale",
    "cuánto sale",
    "tarifa",
    "costo",
    "costos",
    "planes",
    "paquetes",
    "quiero hablar con una gente",
    "quiero que me atiendan",
    "quien me atiende",
    "quién me atiende",
    "necesito atencion",
    "necesito atención",
    "me pueden llamar",
    "me pasan con alguien",
    "hay alguien disponible",
    "quiero tratar con alguien",
  ],
  waiting: [
    "hola",
    "saludos",
    "ok",
    "sigo esperando",
    "nadie responde",
    "por que duran tanto",
    "?",
    "y entonces",
    "buenas",
    "hey",
    "hello",
    "okay",
    "okey",
    "dale",
    "bien",
    "gracias",
    "estoy esperando",
    "por qué duran tanto",
    "cuanto tardan",
    "cuánto tardan",
    "??",
    "alo",
    "aló",
    "hay alguien",
    "me leen",
    "me escuchan",
    "sigo aqui",
    "sigo aquí",
  ],
  business_hours_question: [
    "que dia estan disponibles",
    "que dias estan disponibles",
    "horario",
    "horarios",
    "a que hora trabajan",
    "a que hora abren",
    "a que hora cierran",
    "estan abiertos",
    "estan abiertas",
    "cuando trabajan",
    "cuando estan disponibles",
    "horario de atencion",
    "hasta que hora",
    "abren hoy",
    "horario de atención",
    "que horario tienen",
    "qué horario tienen",
    "a qué hora trabajan",
    "hasta que hora trabajan",
    "hasta qué hora trabajan",
    "que dia trabajan",
    "qué día trabajan",
    "que dias trabajan",
    "qué días trabajan",
    "qué día están disponibles",
    "cuándo trabajan",
    "cuándo están disponibles",
    "están abiertos",
    "trabajan hoy",
    "trabajan mañana",
    "trabajan los sabados",
    "trabajan los sábados",
    "trabajan domingo",
    "estan disponibles ahora",
    "están disponibles ahora",
    "cuando me responden",
    "cuándo me responden",
    "cuando atienden",
    "cuándo atienden",
  ],
} as const;

type FuseCatalogItem = { intent: MessengerIntent; phrase: string; weight: number };

const INTENT_CATALOG: FuseCatalogItem[] = [
  // web_interest
  { intent: "web_interest", phrase: "pagina web", weight: 1 },
  { intent: "web_interest", phrase: "quiero una pagina", weight: 1 },
  { intent: "web_interest", phrase: "necesito una web", weight: 1 },
  { intent: "web_interest", phrase: "necesito una pagina web", weight: 1 },
  { intent: "web_interest", phrase: "me interesa una web", weight: 1 },
  { intent: "web_interest", phrase: "quiero hacer una web", weight: 1 },
  { intent: "web_interest", phrase: "quiero crear una pagina", weight: 1 },
  { intent: "web_interest", phrase: "crear pagina web", weight: 1 },
  { intent: "web_interest", phrase: "diseno web", weight: 1 },
  { intent: "web_interest", phrase: "landing", weight: 1 },
  { intent: "web_interest", phrase: "sitio web", weight: 1 },
  { intent: "web_interest", phrase: "landing page", weight: 1 },
  { intent: "web_interest", phrase: "vender por internet", weight: 1 },
  { intent: "web_interest", phrase: "web para mi negocio", weight: 1 },
  { intent: "web_interest", phrase: "pagina para vender", weight: 1 },
  { intent: "web_interest", phrase: "pagina para mi negocio", weight: 1 },
  { intent: "web_interest", phrase: "tienda online", weight: 1 },
  { intent: "web_interest", phrase: "tienda en linea", weight: 1 },
  { intent: "web_interest", phrase: "ecommerce", weight: 1 },
  { intent: "web_interest", phrase: "catalogo online", weight: 1 },
  { intent: "web_interest", phrase: "paguina", weight: 1 },
  { intent: "web_interest", phrase: "pajina", weight: 1 },
  { intent: "web_interest", phrase: "pagina wep", weight: 1 },
  { intent: "web_interest", phrase: "pajina web", weight: 1 },
  { intent: "web_interest", phrase: "wed", weight: 1 },
  { intent: "web_interest", phrase: "mostrar mis servicios", weight: 1 },

  // social_interest
  { intent: "social_interest", phrase: "redes sociales", weight: 1 },
  { intent: "social_interest", phrase: "redes", weight: 1 },
  { intent: "social_interest", phrase: "instagram", weight: 1 },
  { intent: "social_interest", phrase: "facebook", weight: 1 },
  { intent: "social_interest", phrase: "tiktok", weight: 1 },
  { intent: "social_interest", phrase: "contenido", weight: 1 },
  { intent: "social_interest", phrase: "publicaciones", weight: 1 },
  { intent: "social_interest", phrase: "posts", weight: 1 },
  { intent: "social_interest", phrase: "reels", weight: 1 },
  { intent: "social_interest", phrase: "historias", weight: 1 },
  { intent: "social_interest", phrase: "stories", weight: 1 },
  { intent: "social_interest", phrase: "quiero vender por instagram", weight: 1 },
  { intent: "social_interest", phrase: "quiero crecer en instagram", weight: 1 },
  { intent: "social_interest", phrase: "quiero mas seguidores", weight: 1 },
  { intent: "social_interest", phrase: "quiero mas mensajes", weight: 1 },
  { intent: "social_interest", phrase: "publicidad en redes", weight: 1 },
  { intent: "social_interest", phrase: "anuncios en facebook", weight: 1 },
  { intent: "social_interest", phrase: "anuncios en instagram", weight: 1 },
  { intent: "social_interest", phrase: "community manager", weight: 1 },
  { intent: "social_interest", phrase: "subir contenido", weight: 1 },
  { intent: "social_interest", phrase: "hacer reels", weight: 1 },
  { intent: "social_interest", phrase: "manejo de redes", weight: 1 },
  { intent: "social_interest", phrase: "marketing en redes", weight: 1 },
  { intent: "social_interest", phrase: "crear contenido", weight: 1 },

  // crm_interest
  { intent: "crm_interest", phrase: "crm", weight: 1 },
  { intent: "crm_interest", phrase: "sistema crm", weight: 1 },
  { intent: "crm_interest", phrase: "necesito un crm", weight: 1 },
  { intent: "crm_interest", phrase: "automatizacion", weight: 1 },
  { intent: "crm_interest", phrase: "organizar clientes", weight: 1 },
  { intent: "crm_interest", phrase: "organizar mensajes", weight: 1 },
  { intent: "crm_interest", phrase: "seguimiento", weight: 1 },
  { intent: "crm_interest", phrase: "dar seguimiento", weight: 1 },
  { intent: "crm_interest", phrase: "pipeline", weight: 1 },
  { intent: "crm_interest", phrase: "automatizar ventas", weight: 1 },
  { intent: "crm_interest", phrase: "whatsapp", weight: 1 },
  { intent: "crm_interest", phrase: "mensajes", weight: 1 },
  { intent: "crm_interest", phrase: "clientes", weight: 1 },
  { intent: "crm_interest", phrase: "se me pierden clientes", weight: 1 },
  { intent: "crm_interest", phrase: "se pierden los mensajes", weight: 1 },
  { intent: "crm_interest", phrase: "bandeja de entrada", weight: 1 },
  { intent: "crm_interest", phrase: "centralizar mensajes", weight: 1 },
  { intent: "crm_interest", phrase: "embudo de ventas", weight: 1 },
  { intent: "crm_interest", phrase: "poner orden", weight: 1 },
  { intent: "crm_interest", phrase: "no perder clientes", weight: 1 },

  // advisor_request
  { intent: "advisor_request", phrase: "asesor", weight: 1 },
  { intent: "advisor_request", phrase: "asesora", weight: 1 },
  { intent: "advisor_request", phrase: "humano", weight: 1 },
  { intent: "advisor_request", phrase: "persona", weight: 1 },
  { intent: "advisor_request", phrase: "representante", weight: 1 },
  { intent: "advisor_request", phrase: "hablar con alguien", weight: 1 },
  { intent: "advisor_request", phrase: "hablar con una persona", weight: 1 },
  { intent: "advisor_request", phrase: "hablar con un asesor", weight: 1 },
  { intent: "advisor_request", phrase: "quiero que me llamen", weight: 1 },
  { intent: "advisor_request", phrase: "llamada", weight: 1 },
  { intent: "advisor_request", phrase: "cotizacion", weight: 1 },
  { intent: "advisor_request", phrase: "presupuesto", weight: 1 },
  { intent: "advisor_request", phrase: "propuesta", weight: 1 },
  { intent: "advisor_request", phrase: "precio", weight: 1 },
  { intent: "advisor_request", phrase: "cuanto cuesta", weight: 1 },
  { intent: "advisor_request", phrase: "cuanto sale", weight: 1 },
  { intent: "advisor_request", phrase: "planes", weight: 1 },
  { intent: "advisor_request", phrase: "paquetes", weight: 1 },
  { intent: "advisor_request", phrase: "me pasan con alguien", weight: 1 },

  // business_hours_question
  { intent: "business_hours_question", phrase: "horario", weight: 1 },
  { intent: "business_hours_question", phrase: "horarios", weight: 1 },
  { intent: "business_hours_question", phrase: "que dia estan disponibles", weight: 1 },
  { intent: "business_hours_question", phrase: "a que hora trabajan", weight: 1 },
  { intent: "business_hours_question", phrase: "estan abiertos", weight: 1 },
  { intent: "business_hours_question", phrase: "abren hoy", weight: 1 },
  { intent: "business_hours_question", phrase: "cuando trabajan", weight: 1 },
  { intent: "business_hours_question", phrase: "hasta que hora trabajan", weight: 1 },
  { intent: "business_hours_question", phrase: "horario de atencion", weight: 1 },
  { intent: "business_hours_question", phrase: "que horario tienen", weight: 1 },
  { intent: "business_hours_question", phrase: "trabajan hoy", weight: 1 },
  { intent: "business_hours_question", phrase: "trabajan manana", weight: 1 },
  { intent: "business_hours_question", phrase: "estan disponibles ahora", weight: 1 },

  // business_type
  { intent: "business_type", phrase: "tengo una tienda", weight: 1 },
  { intent: "business_type", phrase: "tengo un negocio", weight: 1 },
  { intent: "business_type", phrase: "tengo una empresa", weight: 1 },
  { intent: "business_type", phrase: "tengo una marca", weight: 1 },
  { intent: "business_type", phrase: "soy emprendedor", weight: 1 },
  { intent: "business_type", phrase: "soy emprendedora", weight: 1 },
  { intent: "business_type", phrase: "pulperia", weight: 1 },
  { intent: "business_type", phrase: "bodega", weight: 1 },
  { intent: "business_type", phrase: "abarrotes", weight: 1 },
  { intent: "business_type", phrase: "miscelanea", weight: 1 },
  { intent: "business_type", phrase: "papeleria", weight: 1 },
  { intent: "business_type", phrase: "un colmado", weight: 1 },
  { intent: "business_type", phrase: "colmado", weight: 1 },
  { intent: "business_type", phrase: "minimarket", weight: 1 },
  { intent: "business_type", phrase: "supermercado", weight: 1 },
  { intent: "business_type", phrase: "restaurante", weight: 1 },
  { intent: "business_type", phrase: "cafeteria", weight: 1 },
  { intent: "business_type", phrase: "food truck", weight: 1 },
  { intent: "business_type", phrase: "reposteria", weight: 1 },
  { intent: "business_type", phrase: "salon", weight: 1 },
  { intent: "business_type", phrase: "salon de belleza", weight: 1 },
  { intent: "business_type", phrase: "barberia", weight: 1 },
  { intent: "business_type", phrase: "estetica", weight: 1 },
  { intent: "business_type", phrase: "gimnasio", weight: 1 },
  { intent: "business_type", phrase: "constructora", weight: 1 },
  { intent: "business_type", phrase: "inmobiliaria", weight: 1 },
  { intent: "business_type", phrase: "bienes raices", weight: 1 },
  { intent: "business_type", phrase: "ferreteria", weight: 1 },
  { intent: "business_type", phrase: "dealer", weight: 1 },
  { intent: "business_type", phrase: "agencia de viajes", weight: 1 },
  { intent: "business_type", phrase: "clinica", weight: 1 },
  { intent: "business_type", phrase: "consultorio", weight: 1 },
  { intent: "business_type", phrase: "taller mecanico", weight: 1 },
  { intent: "business_type", phrase: "abogado", weight: 1 },
  { intent: "business_type", phrase: "contabilidad", weight: 1 },
  { intent: "business_type", phrase: "seguros", weight: 1 },
  { intent: "business_type", phrase: "muebles", weight: 1 },
  { intent: "business_type", phrase: "tienda de ropa", weight: 1 },
  { intent: "business_type", phrase: "negocio local", weight: 1 },
  { intent: "business_type", phrase: "empresa de servicios", weight: 1 },

  // goal
  { intent: "goal", phrase: "quiero vender", weight: 1 },
  { intent: "goal", phrase: "quiero vende", weight: 1 },
  { intent: "goal", phrase: "vender mas", weight: 1 },
  { intent: "goal", phrase: "vender mejor", weight: 1 },
  { intent: "goal", phrase: "conseguir clientes", weight: 1 },
  { intent: "goal", phrase: "atraer clientes", weight: 1 },
  { intent: "goal", phrase: "traer clientes", weight: 1 },
  { intent: "goal", phrase: "conseguir mas clientes", weight: 1 },
  { intent: "goal", phrase: "aumentar ventas", weight: 1 },
  { intent: "goal", phrase: "generar ventas", weight: 1 },
  { intent: "goal", phrase: "recibir mas mensajes", weight: 1 },
  { intent: "goal", phrase: "que me escriban", weight: 1 },
  { intent: "goal", phrase: "que me escriban mas", weight: 1 },
  { intent: "goal", phrase: "mejorar mi presencia", weight: 1 },
  { intent: "goal", phrase: "mejorar presencia digital", weight: 1 },
  { intent: "goal", phrase: "verme mas profesional", weight: 1 },
  { intent: "goal", phrase: "organizar mi negocio", weight: 1 },
  { intent: "goal", phrase: "no perder clientes", weight: 1 },
  { intent: "goal", phrase: "automatizar procesos", weight: 1 },
  { intent: "goal", phrase: "ahorrar tiempo", weight: 1 },
  { intent: "goal", phrase: "tener mas control", weight: 1 },
  { intent: "goal", phrase: "dar mejor seguimiento", weight: 1 },
  { intent: "goal", phrase: "cerrar mas ventas", weight: 1 },
  { intent: "goal", phrase: "generar leads", weight: 1 },
  { intent: "goal", phrase: "recibir solicitudes", weight: 1 },
  { intent: "goal", phrase: "mejorar imagen", weight: 1 },
  { intent: "goal", phrase: "posicionar mi negocio", weight: 1 },
  { intent: "goal", phrase: "quiero vendel", weight: 1 },
  { intent: "goal", phrase: "quiero mas venta", weight: 1 },
  { intent: "goal", phrase: "quiero mas cliente", weight: 1 },
  { intent: "goal", phrase: "necesito cliente", weight: 1 },
  { intent: "goal", phrase: "quiero movimiento", weight: 1 },
  { intent: "goal", phrase: "quiero que el negocio se mueva", weight: 1 },
  { intent: "goal", phrase: "crecer mi negocio", weight: 1 },

  // waiting
  { intent: "waiting", phrase: "hola", weight: 1 },
  { intent: "waiting", phrase: "saludos", weight: 1 },
  { intent: "waiting", phrase: "buenas", weight: 1 },
  { intent: "waiting", phrase: "ok", weight: 1 },
  { intent: "waiting", phrase: "okay", weight: 1 },
  { intent: "waiting", phrase: "okey", weight: 1 },
  { intent: "waiting", phrase: "dale", weight: 1 },
  { intent: "waiting", phrase: "bien", weight: 1 },
  { intent: "waiting", phrase: "gracias", weight: 1 },
  { intent: "waiting", phrase: "sigo esperando", weight: 1 },
  { intent: "waiting", phrase: "estoy esperando", weight: 1 },
  { intent: "waiting", phrase: "nadie responde", weight: 1 },
  { intent: "waiting", phrase: "por que duran tanto", weight: 1 },
  { intent: "waiting", phrase: "cuanto tardan", weight: 1 },
  { intent: "waiting", phrase: "y entonces", weight: 1 },
  { intent: "waiting", phrase: "?", weight: 1 },
  { intent: "waiting", phrase: "alo", weight: 1 },
  { intent: "waiting", phrase: "hay alguien", weight: 1 },
  { intent: "waiting", phrase: "me leen", weight: 1 },
  { intent: "waiting", phrase: "sigo aqui", weight: 1 },
];

const fuse = new Fuse(INTENT_CATALOG, {
  includeScore: true,
  threshold: 0.38,
  ignoreLocation: true,
  keys: [
    { name: "phrase", weight: 0.85 },
    { name: "intent", weight: 0.15 },
  ],
});

function classifyBusinessTypeOrGoal(normalized: string): IntentMatch | null {
  // Lightweight heuristics (no AI). This is optional and conservative.
  const t = normalized;
  if (!t) return null;

  const hasBizLeadIn = [
    "tengo un",
    "tengo una",
    "soy",
    "mi negocio",
    "mi empresa",
    "vendo",
    "trabajo en",
  ].some((k) => t.includes(k));
  if (hasBizLeadIn) {
    return {
      intent: "business_type",
      confidence: 0.66,
      matchedTerm: "heuristica:business_type",
      method: "heuristic",
      normalizedText: normalized,
    };
  }

  const hasGoal = [
    "quiero vender",
    "quiero vende",
    "vender mas",
    "vender mas",
    "conseguir clientes",
    "atraer clientes",
    "aumentar ventas",
    "necesito clientes",
    "generar ventas",
    "quiero",
    "necesito",
    "me gustaria",
    "busco",
    "objetivo",
    "meta",
    "atraer",
    "vender",
    "vende",
    "clientes",
    "ventas",
  ].some((k) => t.includes(k));
  if (hasGoal) {
    return {
      intent: "goal",
      confidence: 0.64,
      matchedTerm: "heuristica:goal",
      method: "heuristic",
      normalizedText: normalized,
    };
  }

  return null;
}

export function matchIntent(rawText: string): IntentMatch {
  const normalized = normalizeText(rawText);

  // Very short text guardrail.
  if (normalized.length <= 2) {
    const menu = directMenuIntent(normalized);
    if (menu)
      return {
        intent: menu,
        confidence: 1.0,
        matchedTerm: "menu",
        method: "direct_menu",
        normalizedText: normalized,
      };
    if (normalized === "ok" || normalized === "?") {
      return {
        intent: "waiting",
        confidence: 0.9,
        matchedTerm: normalized,
        method: "keyword",
        normalizedText: normalized,
      };
    }
    return {
      intent: "unknown",
      confidence: 0,
      matchedTerm: null,
      method: "unknown",
      normalizedText: normalized,
    };
  }

  const menu = directMenuIntent(normalized);
  if (menu) {
    return {
      intent: menu,
      confidence: 1.0,
      matchedTerm: "menu",
      method: "direct_menu",
      normalizedText: normalized,
    };
  }

  if (hasReferenceLink(rawText)) {
    return {
      intent: "reference_link",
      confidence: 0.95,
      matchedTerm: "link/@",
      method: "reference",
      normalizedText: normalized,
    };
  }

  // Keyword/phrase matching by contains + token overlap
  const inputTokens = tokenize(normalized);

  // Strong keyword/includes match first.
  const picks: Array<{ intent: MessengerIntent; score: number; term: string | null }> = [];
  for (const key of [
    "business_hours_question",
    "advisor_request",
    "web_interest",
    "social_interest",
    "crm_interest",
    "waiting",
  ] as const) {
    const best = bestPhraseMatch(normalized, inputTokens, (catalog as any)[key] as string[]);
    if (best.score > 0) picks.push({ intent: key, score: best.score, term: best.term });
  }

  picks.sort((a, b) => b.score - a.score);
  const top = picks[0] || null;

  if (top && top.score >= 0.9) {
    // Strong contains match.
    return {
      intent: top.intent,
      confidence: 0.9,
      matchedTerm: top.term,
      method: "keyword",
      normalizedText: normalized,
    };
  }

  // Fuse.js fuzzy match layer.
  // Fuse score is lower when match is better; map to confidence = 1 - score.
  const fuseResults = fuse.search(normalized, { limit: 3 }) as any[];
  if (Array.isArray(fuseResults) && fuseResults.length) {
    const best = fuseResults[0];
    const item = best?.item as FuseCatalogItem | undefined;
    const score = typeof best?.score === "number" ? best.score : null;
    if (item && score !== null) {
      const confidence = Math.max(0, Math.min(1, 1 - score));
      const isWaiting = item.intent === "waiting";
      const isBusinessType = item.intent === "business_type";
      const min =
        item.intent === "advisor_request" ||
        item.intent === "business_hours_question" ||
        item.intent === "reference_link"
          ? 0.62
          : isBusinessType
            ? 0.72
            : isWaiting
              ? 0.75
              : 0.68;

      // Be conservative with waiting: avoid false positives for short random text.
      const acceptWaiting = !isWaiting || normalized.length >= 4;
      if (acceptWaiting && confidence >= min) {
        return {
          intent: item.intent,
          confidence,
          matchedTerm: item.phrase,
          method: "fuse",
          normalizedText: normalized,
        };
      }
    }
  }

  // Token overlap fallback (keep existing behavior).
  if (top && top.score >= 0.68) {
    return {
      intent: top.intent,
      confidence: Math.min(0.85, Math.max(0.65, top.score)),
      matchedTerm: top.term,
      method: "token_overlap",
      normalizedText: normalized,
    };
  }

  const btg = classifyBusinessTypeOrGoal(normalized);
  if (btg) return btg;

  return {
    intent: "unknown",
    confidence: 0,
    matchedTerm: null,
    method: "unknown",
    normalizedText: normalized,
  };
}

// Quick sanity checks (examples):
// - "necesito una paguina" -> web_interest
// - "quiero que me manejen las redes" -> social_interest
// - "se me pierden clientes" -> crm_interest
// - "me pasan con alguien" -> advisor_request
// - "q horario tienen" -> business_hours_question
// - "tengo una pulperia" -> business_type
// - "quiero mas venta" -> goal
// - "klk" -> waiting
