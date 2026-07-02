import { useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import "tinymce/tinymce";
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

const DEFAULT_CONTENT = `
<h1>Propuesta Comercial</h1>
<p>Preparada para <span data-corevix-field="client_name" data-label="Cliente" data-type="text">{{client_name}}</span></p>
<p>Servicio: <span data-corevix-field="service_name" data-label="Servicio" data-type="text">{{service_name}}</span></p>
<p>Inversión: <strong><span data-corevix-field="amount" data-label="Monto" data-type="currency">{{amount}}</span></strong></p>
<h2>Alcance</h2>
<p>Describe aquí el alcance, entregables, tiempos y condiciones de esta propuesta.</p>
<h2>Validez</h2>
<p>Esta propuesta es válida hasta <span data-corevix-field="valid_until" data-label="Validez" data-type="date">{{valid_until}}</span>.</p>
`;

type ProposalDocumentBuilderProps = { proposalId: string };
type ProposalRow = Record<string, any> & { id: string };

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

function fillTemplate(html: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value || `{{${key}}}`),
    html,
  );
}

function money(amount: number | string | null | undefined, currency = "USD") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export function ProposalDocumentBuilder({ proposalId }: ProposalDocumentBuilderProps) {
  const { profile } = useAuth();
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [title, setTitle] = useState("Propuesta Comercial");
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!proposalId || !profile?.company_id) return;
      setLoading(true);
      const db = supabase as any;
      const { data, error } = await db
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .eq("company_id", profile.company_id)
        .single();
      if (error) {
        toast.error(error.message || "No se pudo cargar la propuesta.");
        setLoading(false);
        return;
      }

      let clientName = "Cliente";
      if (data?.client_id) {
        const { data: client } = await db
          .from("clients")
          .select("company_name,contact_person")
          .eq("id", data.client_id)
          .limit(1)
          .maybeSingle();
        clientName = client?.company_name || client?.contact_person || clientName;
      }

      let serviceName = data?.title || "Servicio";
      if (data?.product_id) {
        const { data: product } = await db
          .from("products")
          .select("name")
          .eq("id", data.product_id)
          .limit(1)
          .maybeSingle();
        serviceName = product?.name || serviceName;
      }

      const baseHtml = String(data?.content || "").trim() || DEFAULT_CONTENT;
      const values = {
        client_name: clientName,
        company_name: "Corevix",
        service_name: serviceName,
        amount: money(data?.amount, data?.currency || "USD"),
        valid_until: data?.valid_until || "30 días",
      };

      if (!cancelled) {
        setProposal(data);
        setTitle(data?.title || "Propuesta Comercial");
        setContent(fillTemplate(baseHtml, values));
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [proposalId, profile?.company_id]);

  const fields = useMemo(() => fieldSchemaFromHtml(content), [content]);

  const save = async () => {
    if (!proposal || !profile?.company_id) return;
    setSaving(true);
    try {
      const finalContent = editorRef.current?.getContent?.() || content;
      const previousData =
        proposal.proposal_data && typeof proposal.proposal_data === "object" ? proposal.proposal_data : {};
      const { error } = await (supabase as any)
        .from("proposals")
        .update({
          title,
          content: finalContent,
          proposal_data: {
            ...previousData,
            document_builder: {
              engine: "tinymce",
              enabled: true,
              schema: fieldSchemaFromHtml(finalContent),
              updated_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", proposal.id)
        .eq("company_id", profile.company_id);
      if (error) throw error;
      setContent(finalContent);
      toast.success("Documento de propuesta guardado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const addField = (key: string, label: string, type = "text") => {
    const html = `<span data-corevix-field="${key}" data-label="${label}" data-type="${type}" class="corevix-field-chip">{{${key}}}</span>`;
    editorRef.current?.insertContent?.(html);
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Cargando documento...</div>;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 text-slate-950">
      <style>{`
        .corevix-field-chip{display:inline-flex;align-items:center;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:0 8px;font-weight:700}
      `}</style>
      <div className="sticky top-14 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md font-bold" />
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-112px)] grid-cols-1 xl:grid-cols-[1fr_320px]">
        <main className="overflow-auto px-4 py-8">
          <div className="mx-auto max-w-[980px] rounded-2xl border bg-white shadow-xl">
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              value={content}
              onInit={(_, editor) => {
                editorRef.current = editor;
              }}
              onEditorChange={(value) => setContent(value)}
              init={{
                license_key: "gpl",
                height: "calc(100vh - 180px)",
                menubar: "file edit view insert format tools table help",
                plugins:
                  "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount",
                toolbar:
                  "undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table image link | code preview fullscreen",
                toolbar_mode: "sliding",
                branding: false,
                promotion: false,
                content_style:
                  "body{font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.7;color:#0f172a;padding:32px;max-width:816px;margin:0 auto}.corevix-field-chip,[data-corevix-field]{display:inline-flex;align-items:center;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:0 8px;font-weight:700}",
              }}
            />
          </div>
        </main>

        <aside className="border-l bg-white p-4">
          <div className="font-extrabold">Campos inteligentes</div>
          <p className="mt-1 text-sm text-slate-500">
            Inserta campos CRM dentro del documento. TinyMCE guarda el HTML y el schema estructurado.
          </p>
          <div className="mt-4 grid gap-2">
            <Button variant="outline" onClick={() => addField("client_name", "Cliente")}>Cliente</Button>
            <Button variant="outline" onClick={() => addField("service_name", "Servicio")}>Servicio</Button>
            <Button variant="outline" onClick={() => addField("amount", "Monto", "currency")}>Monto</Button>
            <Button variant="outline" onClick={() => addField("valid_until", "Validez", "date")}>Validez</Button>
          </div>
          <div className="mt-6 rounded-xl border bg-slate-50 p-3">
            <div className="text-xs font-bold uppercase text-slate-500">Schema detectado</div>
            <pre className="mt-2 max-h-72 overflow-auto text-xs">{JSON.stringify(fields, null, 2)}</pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
