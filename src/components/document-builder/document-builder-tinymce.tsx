import { useEffect, useRef, useState } from "react";
import type { Editor as TinyMCEEditor } from "tinymce";
import { Editor } from "@tinymce/tinymce-react";
import { FileText, Plus, Save, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";

import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/codesample";
import "tinymce/plugins/directionality";
import "tinymce/plugins/emoticons";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/help";
import "tinymce/plugins/image";
import "tinymce/plugins/importcss";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/media";
import "tinymce/plugins/nonbreaking";
import "tinymce/plugins/pagebreak";
import "tinymce/plugins/preview";
import "tinymce/plugins/quickbars";
import "tinymce/plugins/save";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/visualchars";
import "tinymce/plugins/wordcount";

import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/ui/oxide/content.min.css";
import "tinymce/skins/content/default/content.min.css";

type DocumentRow = {
  id: string;
  title: string;
  content_html: string;
  thumbnail_url: string | null;
  document_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_CONTENT = `
  <h1>Documento en blanco</h1>
  <p>Empieza a escribir aquí...</p>
`;

const PROPOSAL_CONTENT = `
  <h1>Propuesta Comercial</h1>
  <p>Preparada para <strong>{{client_name}}</strong></p>
  <p>
    Gracias por considerar a <strong>{{company_name}}</strong>. Esta propuesta presenta
    el alcance del servicio, inversión estimada, tiempos de entrega y condiciones generales.
  </p>

  <h2>Resumen del servicio</h2>
  <p>{{service_name}}</p>

  <h2>Alcance del proyecto</h2>
  <ul>
    <li>Reunión inicial y levantamiento de información.</li>
    <li>Planificación de estructura y contenido.</li>
    <li>Diseño visual y revisión con el cliente.</li>
    <li>Implementación, pruebas y entrega final.</li>
  </ul>

  <h2>Inversión</h2>
  <p>El monto estimado para este proyecto es <strong>{{amount}}</strong>.</p>

  <h2>Validez</h2>
  <p>Esta propuesta es válida por <strong>{{valid_until}}</strong>.</p>

  <p>Quedamos atentos para iniciar el proyecto.</p>
`;

function htmlToPreview(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

export function DocumentBuilderTinyMCE() {
  const editorRef = useRef<TinyMCEEditor | null>(null);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentRow | null>(null);
  const [title, setTitle] = useState("Documento sin título");
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadDocuments() {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("document_builder_documents")
      .select("id,title,content_html,thumbnail_url,document_type,status,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("No se pudieron cargar los documentos. Revisa la tabla document_builder_documents.");
      setLoading(false);
      return;
    }

    setDocuments(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function createDocument(template: "blank" | "proposal" = "blank") {
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const initialTitle = template === "proposal" ? "Propuesta Comercial" : "Documento sin título";
    const initialContent = template === "proposal" ? PROPOSAL_CONTENT : DEFAULT_CONTENT;

    const { data, error } = await (supabase as any)
      .from("document_builder_documents")
      .insert({
        title: initialTitle,
        content_html: initialContent,
        document_type: "document",
        status: "draft",
        created_by: userData.user?.id ?? null,
      })
      .select("id,title,content_html,thumbnail_url,document_type,status,created_at,updated_at")
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      alert("No se pudo crear el documento.");
      return;
    }

    openDocument(data);
    await loadDocuments();
  }

  function openDocument(document: DocumentRow) {
    setActiveDocument(document);
    setTitle(document.title);
    setContent(document.content_html || DEFAULT_CONTENT);
  }

  async function saveDocument() {
    if (!activeDocument) return;

    setSaving(true);

    const nextContent = editorRef.current?.getContent() ?? content;

    const { data, error } = await (supabase as any)
      .from("document_builder_documents")
      .update({
        title,
        content_html: nextContent,
        status: "draft",
      })
      .eq("id", activeDocument.id)
      .select("id,title,content_html,thumbnail_url,document_type,status,created_at,updated_at")
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      alert("No se pudo guardar el documento.");
      return;
    }

    setActiveDocument(data);
    setContent(data.content_html);
    await loadDocuments();
  }

  async function backToManager() {
    if (activeDocument) {
      await saveDocument();
    }

    setActiveDocument(null);
    editorRef.current = null;
  }

  if (!activeDocument) {
    return (
      <div className="min-h-[calc(100vh-88px)] bg-slate-50 px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Documentos</h1>
            <p className="text-sm text-slate-500">
              Crea, abre y administra documentos editables del CRM.
            </p>
          </div>

          <button
            type="button"
            onClick={() => createDocument("proposal")}
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Nueva propuesta
          </button>
        </div>

        {loading ? (
          <div className="grid h-64 place-items-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            <button
              type="button"
              onClick={() => createDocument("blank")}
              disabled={saving}
              className="aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md disabled:opacity-60"
            >
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <Plus className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Documento en blanco</p>
                  <p className="mt-1 text-xs text-slate-500">Crear nuevo documento</p>
                </div>
              </div>
            </button>

            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => openDocument(document)}
                className="aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex h-full flex-col">
                  <div className="flex-1 bg-white p-5">
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>

                    <h2 className="line-clamp-2 font-semibold text-slate-950">
                      {document.title || "Documento sin título"}
                    </h2>

                    <p className="mt-3 line-clamp-6 text-xs leading-5 text-slate-500">
                      {htmlToPreview(document.content_html) || "Documento vacío"}
                    </p>
                  </div>

                  <div className="border-t bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-500">
                      Actualizado {new Date(document.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-88px)] bg-white">
      <div className="flex h-12 items-center gap-3 border-b bg-white px-4">
        <button
          type="button"
          onClick={backToManager}
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
          title="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-w-0 flex-1 rounded-md px-2 py-1 text-base font-semibold outline-none hover:bg-slate-50 focus:bg-slate-50"
        />

        <button
          type="button"
          onClick={saveDocument}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
      </div>

      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={(_, editor) => {
          editorRef.current = editor;
        }}
        value={content}
        onEditorChange={(value) => setContent(value)}
        init={{
          license_key: "gpl",
          height: "calc(100vh - 136px)",
          min_height: 760,
          menubar: "file edit insert view format table tools help",
          branding: false,
          promotion: false,
          resize: false,
          skin: false,
          content_css: false,
          plugins:
            "advlist autolink lists link image charmap preview searchreplace visualblocks visualchars code fullscreen insertdatetime media table wordcount quickbars help nonbreaking pagebreak directionality emoticons codesample",
          toolbar:
            "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | searchreplace visualblocks code fullscreen preview",
          toolbar_mode: "sliding",
          font_family_formats:
            "Arial=arial,helvetica,sans-serif; Helvetica=helvetica,arial,sans-serif; Times New Roman=times new roman,times,serif; Georgia=georgia,palatino,serif; Courier New=courier new,courier,monospace; Inter=Inter,sans-serif; Roboto=Roboto,sans-serif; Open Sans=Open Sans,sans-serif; Montserrat=Montserrat,sans-serif; Poppins=Poppins,sans-serif; Lato=Lato,sans-serif; Merriweather=Merriweather,serif; Playfair Display=Playfair Display,serif;",
          fontsize_formats:
            "8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 22pt 24pt 28pt 32pt 36pt 48pt 60pt 72pt",
          content_style: `
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              font-size: 14px;
              line-height: 1.6;
              max-width: none;
              min-height: calc(100vh - 260px);
              margin: 0;
              padding: 56px 72px;
              background: white;
            }

            h1 {
              font-size: 30px;
              line-height: 1.2;
              margin: 0 0 24px;
            }

            h2 {
              font-size: 20px;
              margin: 32px 0 10px;
            }

            table {
              border-collapse: collapse;
              width: 100%;
            }

            td,
            th {
              border: 1px solid #cbd5e1;
              padding: 8px;
            }

            img {
              max-width: 100%;
            }
          `,
          quickbars_selection_toolbar:
            "bold italic underline | quicklink h2 h3 blockquote",
          quickbars_insert_toolbar: "quickimage quicktable",
          image_advtab: true,
          table_advtab: true,
          table_cell_advtab: true,
          table_row_advtab: true,
        }}
      />
    </div>
  );
}
