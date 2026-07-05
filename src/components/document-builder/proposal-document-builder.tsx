import { useEffect, useMemo, useRef, useState } from "react";
import tinymce from "tinymce/tinymce";
import { Editor } from "@tinymce/tinymce-react";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/charmap";
import "tinymce/plugins/preview";
import "tinymce/plugins/anchor";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/media";
import "tinymce/plugins/table";
import "tinymce/plugins/help";
import "tinymce/plugins/wordcount";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/content/default/content.min.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

if (typeof window !== "undefined") {
  (window as any).tinymce = tinymce;
}

type ProposalDocumentBuilderProps = { proposalId: string };
type ProposalRow = Record<string, any> & { id: string };
type ClientRow = {
  id: string;
  company_name?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
};
type ProductRow = {
  id: string;
  name?: string | null;
  price?: number | null;
  base_price?: number | null;
  currency?: string | null;
};

type TemplateConfig = {
  id: string;
  name: string;
  html: string;
};

const field = (key: string, label: string, value = `{{${key}}}`) =>
  `<span class="corevix-field-chip" data-corevix-field="${key}" data-label="${label}" contenteditable="false">${value}</span>`;

const PROPOSAL_TEMPLATES: TemplateConfig[] = [
  {
    id: "crm_implementation",
    name: "Propuesta CRM",
    html: `
      <h1>Propuesta CRM para ${field("client_name", "Cliente")}</h1>
      <p><strong>Fecha:</strong> ${field("proposal_date", "Fecha")} &nbsp; <strong>Validez:</strong> ${field("valid_until", "Validez")}</p>
      <h2>Resumen ejecutivo</h2>
      <p>Esta propuesta presenta una solución para organizar clientes, oportunidades, tareas, seguimiento comercial y reportes desde un solo lugar.</p>
      <h2>Situación actual</h2>
      <p>El objetivo es reducir la pérdida de oportunidades, centralizar la información comercial y mejorar la visibilidad del proceso de ventas.</p>
      <h2>Solución propuesta</h2>
      <p>Implementaremos ${field("service_name", "Servicio")} con una estructura adaptada al flujo de trabajo del negocio.</p>
      <h2>Alcance</h2>
      <ul><li>Configuración inicial del CRM.</li><li>Pipeline de ventas personalizado.</li><li>Gestión de clientes, leads y tareas.</li><li>Reportes principales para seguimiento comercial.</li></ul>
      <h2>Entregables</h2>
      <ul><li>CRM configurado.</li><li>Usuarios y permisos básicos.</li><li>Paneles principales listos para operar.</li><li>Capacitación inicial.</li></ul>
      <h2>Inversión</h2>
      <p>La inversión para este proyecto es de ${field("amount", "Monto")}.</p>
      <h2>Próximos pasos</h2>
      <p>Para iniciar, el cliente debe aprobar esta propuesta y confirmar la fecha de inicio del proyecto.</p>
    `,
  },
  {
    id: "marketing_strategy",
    name: "Propuesta Marketing",
    html: `
      <h1>Propuesta de Marketing para ${field("client_name", "Cliente")}</h1>
      <p><strong>Servicio:</strong> ${field("service_name", "Servicio")} &nbsp; <strong>Validez:</strong> ${field("valid_until", "Validez")}</p>
      <h2>Objetivo</h2>
      <p>Desarrollar una estrategia de comunicación que aumente la visibilidad de la marca y mejore la conversión de prospectos.</p>
      <h2>Estrategia recomendada</h2>
      <p>La estrategia combinará contenido, campañas, optimización de mensajes y seguimiento de resultados.</p>
      <h2>Plan de acción</h2>
      <ul><li>Diagnóstico inicial.</li><li>Calendario de contenido.</li><li>Campañas segmentadas.</li><li>Medición y optimización.</li></ul>
      <h2>Inversión</h2>
      <p>La inversión propuesta es ${field("amount", "Monto")}.</p>
    `,
  },
  {
    id: "general_service",
    name: "Propuesta General",
    html: `
      <h1>Propuesta Comercial para ${field("client_name", "Cliente")}</h1>
      <p><strong>Fecha:</strong> ${field("proposal_date", "Fecha")} &nbsp; <strong>Servicio:</strong> ${field("service_name", "Servicio")}</p>
      <h2>Introducción</h2>
      <p>Gracias por considerar nuestra solución. Este documento resume el enfoque, alcance e inversión de la propuesta.</p>
      <h2>Solución propuesta</h2>
      <p>Proponemos una implementación enfocada en resolver las necesidades principales del cliente de forma clara y medible.</p>
      <h2>Alcance y entregables</h2>
      <p>Esta sección puede editarse libremente para describir los entregables específicos del proyecto.</p>
      <h2>Inversión</h2>
      <p>La inversión total es ${field("amount", "Monto")}.</p>
      <h2>Condiciones</h2>
      <p>Esta propuesta tendrá una validez de ${field("valid_until", "Validez")}.</p>
    `,
  },
];

function fieldSchemaFromHtml(html: string) {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.querySelectorAll("[data-corevix-field]"));
  const map = new Map<string, any>();
  nodes.forEach((node) => {
    const key = node.getAttribute("data-corevix-field") || "";
    if (!key || map.has(key)) return;
    map.set(key, {
      key,
      label: node.getAttribute("data-label") || key.replaceAll("_", " "),
      type: node.getAttribute("data-type") || "text",
      required: node.getAttribute("data-required") === "true",
    });
  });
  return Array.from(map.values());
}

function formatMoney(amount: number | string | null | undefined, currency = "USD") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function clientName(client?: ClientRow | null) {
  return client?.company_name || client?.contact_person || "Cliente";
}

function replaceProtectedFields(html: string, values: Record<string, string>) {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  Object.entries(values).forEach(([key, value]) => {
    doc.querySelectorAll(`[data-corevix-field="${key}"]`).forEach((node) => {
      node.textContent = value || `{{${key}}}`;
      node.setAttribute("contenteditable", "false");
      node.classList.add("corevix-field-chip");
    });
  });
  return doc.body.innerHTML;
}

export function ProposalDocumentBuilder({ proposalId }: ProposalDocumentBuilderProps) {
  const { profile } = useAuth();
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [templateId, setTemplateId] = useState(PROPOSAL_TEMPLATES[0].id);
  const [title, setTitle] = useState("Propuesta Comercial");
  const [content, setContent] = useState(PROPOSAL_TEMPLATES[0].html);
  const [clientId, setClientId] = useState("");
  const [productId, setProductId] = useState("");
  const [proposalDate, setProposalDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState("30 días");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("0");

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) || null,
    [clients, clientId],
  );
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) || null,
    [products, productId],
  );

  const crmValues = useMemo(
    () => ({
      client_name: clientName(selectedClient),
      client_email: selectedClient?.email || "",
      client_phone: selectedClient?.phone || "",
      service_name: selectedProduct?.name || proposal?.title || "Servicio",
      proposal_date: proposalDate,
      valid_until: validUntil,
      amount: formatMoney(amount, currency),
      proposal_number: proposal?.number || "",
    }),
    [selectedClient, selectedProduct, proposal, proposalDate, validUntil, amount, currency],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!proposalId || !profile?.company_id) return;
      setLoading(true);
      const db = supabase as any;
      const [{ data, error }, clientsRes, productsRes] = await Promise.all([
        db
          .from("proposals")
          .select("*")
          .eq("id", proposalId)
          .eq("company_id", profile.company_id)
          .single(),
        db
          .from("clients")
          .select("id,company_name,contact_person,email,phone")
          .eq("company_id", profile.company_id)
          .limit(500),
        db
          .from("products")
          .select("id,name,price,base_price,currency")
          .eq("company_id", profile.company_id)
          .limit(500),
      ]);

      if (error) {
        toast.error(error.message || "No se pudo cargar la propuesta.");
        setLoading(false);
        return;
      }

      if (!cancelled) {
        const savedData =
          data?.proposal_data && typeof data.proposal_data === "object" ? data.proposal_data : {};
        const builder = (savedData as any).document_builder || {};
        const nextTemplateId = builder.template_id || PROPOSAL_TEMPLATES[0].id;
        const nextClientId = data?.client_id || "";
        const nextProductId = data?.product_id || "";
        const nextCurrency = data?.currency || "USD";
        const nextAmount = String(data?.amount ?? 0);
        const nextValid = data?.valid_until || builder.valid_until_label || "30 días";
        const nextDate = builder.proposal_date || todayISO();
        const baseHtml =
          String(data?.content || "").trim() ||
          PROPOSAL_TEMPLATES.find((t) => t.id === nextTemplateId)?.html ||
          PROPOSAL_TEMPLATES[0].html;

        setProposal(data);
        setClients(clientsRes.data || []);
        setProducts(productsRes.data || []);
        setTemplateId(nextTemplateId);
        setTitle(data?.title || "Propuesta Comercial");
        setClientId(nextClientId);
        setProductId(nextProductId);
        setProposalDate(nextDate);
        setValidUntil(nextValid);
        setCurrency(nextCurrency);
        setAmount(nextAmount);
        setContent(baseHtml);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [proposalId, profile?.company_id]);

  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.getContent?.() || content;
    const updated = replaceProtectedFields(current, crmValues);
    if (updated !== current) {
      editorRef.current.setContent(updated);
      setContent(updated);
    }
  }, [crmValues]);

  useEffect(() => {
    if (selectedProduct) {
      const nextAmount = selectedProduct.price ?? selectedProduct.base_price;
      if (nextAmount != null) setAmount(String(nextAmount));
      if (selectedProduct.currency) setCurrency(selectedProduct.currency);
    }
  }, [selectedProduct]);

  const fields = useMemo(() => fieldSchemaFromHtml(content), [content]);

  const applyTemplate = (nextTemplateId: string) => {
    const template =
      PROPOSAL_TEMPLATES.find((item) => item.id === nextTemplateId) || PROPOSAL_TEMPLATES[0];
    const nextContent = replaceProtectedFields(template.html, crmValues);
    setTemplateId(template.id);
    setContent(nextContent);
    editorRef.current?.setContent?.(nextContent);
  };

  const save = async () => {
    if (!proposal || !profile?.company_id) return;
    setSaving(true);
    try {
      const finalContent = replaceProtectedFields(
        editorRef.current?.getContent?.() || content,
        crmValues,
      );
      const previousData =
        proposal.proposal_data && typeof proposal.proposal_data === "object"
          ? proposal.proposal_data
          : {};
      const { error } = await (supabase as any)
        .from("proposals")
        .update({
          title,
          client_id: clientId || null,
          product_id: productId || null,
          amount: Number(amount || 0),
          currency,
          valid_until: /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : proposal.valid_until,
          content: finalContent,
          proposal_data: {
            ...previousData,
            document_builder: {
              engine: "tinymce",
              enabled: true,
              template_id: templateId,
              proposal_date: proposalDate,
              valid_until_label: validUntil,
              locked_fields: crmValues,
              schema: fieldSchemaFromHtml(finalContent),
              updated_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", proposal.id)
        .eq("company_id", profile.company_id);
      if (error) throw error;
      setContent(finalContent);
      toast.success("Propuesta guardada con plantilla y campos protegidos.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el documento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-6 text-sm text-muted-foreground">Cargando documento...</div>;

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-950">
      <style>{`
        .corevix-field-chip{display:inline-flex;align-items:center;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:0 8px;font-weight:700;white-space:nowrap}
        .proposal-tinymce-shell .tox-editor-header{display:block!important;position:relative!important;z-index:20!important;background:#fff!important;border-bottom:1px solid #e2e8f0!important}
        .proposal-tinymce-shell .tox-menubar,.proposal-tinymce-shell .tox-toolbar-overlord,.proposal-tinymce-shell .tox-toolbar__primary{display:flex!important;background:#fff!important}
        .proposal-tinymce-shell{height:100%!important;min-height:0!important}
        .proposal-tinymce-shell .tox{height:100%!important;min-height:0!important;border:0!important;border-radius:0!important;background:#e8edf3!important}
        .proposal-tinymce-shell .tox-editor-container{height:100%!important;min-height:0!important}
        .proposal-tinymce-shell .tox-sidebar-wrap{min-height:0!important}
        .proposal-tinymce-shell .tox-edit-area{background:#e8edf3!important}
        .proposal-tinymce-shell .tox-edit-area__iframe{background:#e8edf3!important}
        .proposal-tinymce-shell .tox-editor-header{border-radius:0!important}
        .proposal-tinymce-shell .tox-statusbar{border-radius:0!important}
      `}</style>

      <div className="shrink-0 border-b bg-white/95 p-3 backdrop-blur">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          <label className="text-xs font-bold text-slate-600">
            Plantilla
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm font-normal text-slate-900"
            >
              {PROPOSAL_TEMPLATES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Cliente
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm font-normal text-slate-900"
            >
              <option value="">Seleccionar</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {clientName(client)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Servicio
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm font-normal text-slate-900"
            >
              <option value="">Seleccionar</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name || "Servicio"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Fecha
            <Input
              type="date"
              value={proposalDate}
              onChange={(e) => setProposalDate(e.target.value)}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Validez
            <Input
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Monto
            <div className="mt-1 flex gap-1">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-9 w-20 rounded-md border px-2 text-sm font-normal"
              >
                <option>USD</option>
                <option>RD$</option>
                <option>EUR</option>
              </select>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
            </div>
          </label>
          <div className="flex items-end">
            <Button className="h-9 w-full" disabled={saving} onClick={() => void save()}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-3 max-w-xl font-bold"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-slate-100">
        <div className="proposal-tinymce-shell flex h-full min-h-0 flex-col">
          <Editor
            value={content}
            onInit={(_, editor) => {
              editorRef.current = editor;
              editor.setContent(replaceProtectedFields(content, crmValues));
            }}
            onEditorChange={(value) => setContent(value)}
            init={{
              licenseKey: "gpl",
              height: "100%",
              skin: false,
              content_css: false,
              menubar: "file edit view insert format tools table help",
              toolbar_sticky: true,
              toolbar_location: "top",
              statusbar: true,
              plugins:
                "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount",
              toolbar:
                "undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table image link | code preview fullscreen",
              toolbar_mode: "sliding",
              branding: false,
              promotion: false,
              extended_valid_elements:
                "span[class|data-corevix-field|data-label|data-type|data-required|contenteditable]",
              noneditable_class: "corevix-field-chip",
              content_style: `
                html{
                  background:#e8edf3;
                  min-height:100%;
                }
                body{
                  box-sizing:border-box;
                  width:816px;
                  min-height:1056px;
                  margin:32px auto;
                  padding:72px;
                  background:#ffffff;
                  border:1px solid #d8dee8;
                  box-shadow:0 18px 45px rgba(15,23,42,.16);
                  font-family:Inter,Arial,sans-serif;
                  font-size:15px;
                  line-height:1.7;
                  color:#0f172a;
                }
                h1{font-size:30px;line-height:1.15;margin:0 0 22px;font-weight:800;color:#0f172a}
                h2{font-size:18px;line-height:1.25;margin:28px 0 10px;font-weight:800;color:#0f172a}
                p{margin:0 0 14px}
                ul{margin:0 0 16px 20px;padding:0}
                li{margin:6px 0}
                .corevix-field-chip,
                [data-corevix-field]{
                  display:inline-flex;
                  align-items:center;
                  border:1px solid #bfdbfe;
                  background:#eff6ff;
                  color:#1d4ed8;
                  border-radius:999px;
                  padding:0 8px;
                  font-weight:700;
                  white-space:nowrap;
                }
              `,
            }}
          />
        </div>
        <div className="mx-auto mt-3 max-w-[1060px] text-xs text-slate-500">
          Campos CRM protegidos detectados:{" "}
          {fields.map((f: any) => f.label).join(", ") || "ninguno"}
        </div>
      </div>
    </div>
  );
}
