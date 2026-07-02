import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
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

const FONTS = ["Arial", "Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Lato", "Playfair Display"];

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
  return Object.entries(values).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value || `{{${key}}}`), html);
}

function money(amount: number | string | null | undefined, currency = "USD") {
  return `${currency} ${Number(amount || 0).toLocaleString()}`;
}

export function ProposalDocumentBuilder({ proposalId }: ProposalDocumentBuilderProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [title, setTitle] = useState("Propuesta Comercial");
  const [font, setFont] = useState("Arial");

  const editor = useEditor({
    extensions: [
      TextStyle,
      FontFamily,
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: DEFAULT_CONTENT,
    editorProps: {
      attributes: {
        class: "proposal-doc-content min-h-[960px] w-[816px] max-w-full bg-white px-[76px] py-[72px] text-[15px] leading-7 text-slate-950 outline-none",
      },
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!proposalId || !profile?.company_id || !editor) return;
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
        const { data: client } = await db.from("clients").select("company_name,contact_person").eq("id", data.client_id).limit(1).maybeSingle();
        clientName = client?.company_name || client?.contact_person || clientName;
      }

      let serviceName = data?.title || "Servicio";
      if (data?.product_id) {
        const { data: product } = await db.from("products").select("name").eq("id", data.product_id).limit(1).maybeSingle();
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
        editor.commands.setContent(fillTemplate(baseHtml, values));
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [proposalId, profile?.company_id, editor]);

  const html = editor?.getHTML() || "";
  const fields = useMemo(() => fieldSchemaFromHtml(html), [html]);

  const save = async () => {
    if (!proposal || !profile?.company_id || !editor) return;
    setSaving(true);
    try {
      const content = editor.getHTML();
      const previousData = proposal.proposal_data && typeof proposal.proposal_data === "object" ? proposal.proposal_data : {};
      const { error } = await (supabase as any)
        .from("proposals")
        .update({
          title,
          content,
          proposal_data: {
            ...previousData,
            document_builder: {
              enabled: true,
              schema: fieldSchemaFromHtml(content),
              updated_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", proposal.id)
        .eq("company_id", profile.company_id);
      if (error) throw error;
      toast.success("Documento de propuesta guardado.");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo guardar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const addField = (key: string, label: string, type = "text") => {
    editor?.chain().focus().insertContent(`<span data-corevix-field="${key}" data-label="${label}" data-type="${type}" class="corevix-field-chip">{{${key}}}</span>`).run();
  };

  if (loading || !editor) return <div className="p-6 text-sm text-muted-foreground">Cargando documento...</div>;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-100 text-slate-950">
      <style>{`
        .proposal-doc-content h1{font-size:30px;line-height:1.2;font-weight:800;margin:0 0 24px}.proposal-doc-content h2{font-size:20px;line-height:1.3;font-weight:800;margin:32px 0 10px}.proposal-doc-content p{margin:10px 0}.proposal-doc-content ul,.proposal-doc-content ol{padding-left:26px;margin:12px 0}.proposal-doc-content img{max-width:100%;border-radius:8px;margin:16px 0}.proposal-doc-content table{width:100%;border-collapse:collapse;margin:18px 0}.proposal-doc-content td,.proposal-doc-content th{border:1px solid #cbd5e1;padding:8px}.proposal-doc-content [data-corevix-field]{display:inline-flex;align-items:center;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:0 8px;font-weight:700}.corevix-field-chip{display:inline-flex!important}
      `}</style>
      <div className="sticky top-14 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md font-bold" />
          <select value={font} onChange={(e) => { setFont(e.target.value); editor.chain().focus().setFontFamily(e.target.value).run(); }} className="h-9 rounded-md border px-2 text-sm">
            {FONTS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()}>B</Button>
          <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()}>I</Button>
          <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Button>
          <Button variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Button>
          <Button variant="outline" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Tabla</Button>
          <Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-112px)] grid-cols-1 xl:grid-cols-[1fr_320px]">
        <main className="overflow-auto px-4 py-8">
          <div className="mx-auto w-fit min-h-[960px] w-[816px] max-w-full bg-white shadow-xl ring-1 ring-slate-300">
            <EditorContent editor={editor} />
          </div>
        </main>
        <aside className="border-l bg-white p-4">
          <div className="font-extrabold">Campos inteligentes</div>
          <p className="mt-1 text-sm text-slate-500">Inserta campos CRM dentro del documento. Se guardan como schema estructurado.</p>
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
