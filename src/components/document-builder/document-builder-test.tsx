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

const DEFAULT_CONTENT = `
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

function ToolbarButton({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm transition",
        active ? "bg-blue-100 text-blue-700" : "hover:bg-slate-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


const GOOGLE_FONTS = [
  "Arial",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Merriweather",
  "Playfair Display",
  "Source Sans 3",
  "Nunito",
  "Raleway",
  "Oswald",
  "Ubuntu",
  "Roboto Slab",
  "Libre Baskerville",
] as const;

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  GOOGLE_FONTS.filter((font) => font !== "Arial")
    .map((font) => `family=${font.replaceAll(" ", "+")}:wght@400;500;600;700`)
    .join("&") +
  "&display=swap";

export function DocumentBuilderTest() {
  const [selectedFont, setSelectedFont] = useState("Arial");
  const [documentTitle, setDocumentTitle] = useState("Propuesta Comercial");
  const [clientName, setClientName] = useState("Cliente Demo");
  const [companyName, setCompanyName] = useState("Corevix");
  const [serviceName, setServiceName] = useState("Desarrollo Web Express");
  const [amount, setAmount] = useState("RD$ 25,000");
  const [validUntil, setValidUntil] = useState("30 días");


  useEffect(() => {
    if (typeof document === "undefined") return;

    const existing = document.querySelector('link[data-corevix-google-fonts="true"]');
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    link.dataset.corevixGoogleFonts = "true";
    document.head.appendChild(link);
  }, []);

  const editor = useEditor({
    extensions: [
      TextStyle,
      FontFamily,
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: DEFAULT_CONTENT,
    editorProps: {
      attributes: {
        class:
          "doc-editor-content min-h-[960px] w-[816px] max-w-full bg-white px-[76px] py-[72px] text-[15px] leading-7 text-slate-950 outline-none",
      },
    },
  });

  const renderedHtml = useMemo(() => {
    const html = editor?.getHTML() || "";
    return html
      .replaceAll("{{client_name}}", clientName)
      .replaceAll("{{company_name}}", companyName)
      .replaceAll("{{service_name}}", serviceName)
      .replaceAll("{{amount}}", amount)
      .replaceAll("{{valid_until}}", validUntil);
  }, [editor, clientName, companyName, serviceName, amount, validUntil]);

  if (!editor) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando editor…</div>;
  }

  function addImage() {
    const url = window.prompt("Pega la URL de la imagen");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function insertVariable(variable: string) {
    editor.chain().focus().insertContent(variable).run();
  }

  function printPreview() {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>${documentTitle}</title>
          <style>
            @page { size: letter; margin: 0.75in; }
            body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; }
            h1 { font-size: 28px; margin-bottom: 20px; }
            h2 { font-size: 19px; margin-top: 28px; margin-bottom: 10px; }
            p { font-size: 14px; }
            img { max-width: 100%; }
            table { border-collapse: collapse; width: 100%; margin: 16px 0; }
            td, th { border: 1px solid #cbd5e1; padding: 8px; }
          </style>
        </head>
        <body>${renderedHtml}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <style>{`
        .doc-editor-content h1 {
          font-size: 30px;
          line-height: 1.2;
          font-weight: 700;
          margin: 0 0 24px;
        }

        .doc-editor-content h2 {
          font-size: 20px;
          line-height: 1.3;
          font-weight: 700;
          margin: 32px 0 10px;
        }

        .doc-editor-content p {
          margin: 10px 0;
        }

        .doc-editor-content ul,
        .doc-editor-content ol {
          padding-left: 26px;
          margin: 12px 0;
        }

        .doc-editor-content li {
          margin: 4px 0;
        }

        .doc-editor-content img {
          max-width: 100%;
          border-radius: 8px;
          margin: 16px 0;
        }

        .doc-editor-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 18px 0;
        }

        .doc-editor-content td,
        .doc-editor-content th {
          border: 1px solid #cbd5e1;
          padding: 8px;
          vertical-align: top;
        }

        .doc-editor-content th {
          background: #f8fafc;
          font-weight: 700;
        }
      `}</style>

      <div className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
            D
          </div>

          <div className="min-w-0 flex-1">
            <input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full max-w-md rounded px-2 py-1 text-lg font-medium outline-none hover:bg-slate-100 focus:bg-slate-100"
            />
            <div className="flex gap-4 px-2 text-xs text-slate-600">
              <span>Archivo</span>
              <span>Editar</span>
              <span>Insertar</span>
              <span>Formato</span>
              <span>Herramientas</span>
              <span>Plantillas</span>
            </div>
          </div>

          <button
            type="button"
            onClick={printPreview}
            className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
          >
            Exportar PDF
          </button>

          <button
            type="button"
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Guardar
          </button>
        </div>

        <div className="flex h-12 items-center gap-1 overflow-x-auto border-t bg-slate-50 px-4">
          <button className="rounded px-2 py-1 text-sm hover:bg-slate-200" type="button">
            100%
          </button>

          <select
            value={selectedFont}
            onChange={(event) => {
              const font = event.target.value;
              setSelectedFont(font);
              editor.chain().focus().setFontFamily(font).run();
            }}
            className="rounded border px-2 py-1 text-sm"
          >
            {GOOGLE_FONTS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>

          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <strong>B</strong>
          </ToolbarButton>

          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <em>I</em>
          </ToolbarButton>

          <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            H1
          </ToolbarButton>

          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            H2
          </ToolbarButton>

          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            Lista
          </ToolbarButton>

          <ToolbarButton onClick={addImage}>Imagen</ToolbarButton>
          <ToolbarButton onClick={insertTable}>Tabla</ToolbarButton>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-104px)] grid-cols-1">
        <main className="overflow-auto px-4 py-8">
          <div className="mx-auto w-fit">
            <div className="mb-2 h-6 w-[816px] max-w-full border-b border-slate-300 text-center text-[10px] text-slate-400">
              1&nbsp;&nbsp;&nbsp;2&nbsp;&nbsp;&nbsp;3&nbsp;&nbsp;&nbsp;4&nbsp;&nbsp;&nbsp;5&nbsp;&nbsp;&nbsp;6&nbsp;&nbsp;&nbsp;7&nbsp;&nbsp;&nbsp;8&nbsp;&nbsp;&nbsp;9&nbsp;&nbsp;&nbsp;10&nbsp;&nbsp;&nbsp;11
            </div>

            <div className="min-h-[960px] w-[816px] max-w-full bg-white shadow-xl ring-1 ring-slate-300">
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>

        <aside className="hidden border-l bg-white p-4">
          <h2 className="font-semibold">Variables</h2>
          <p className="mt-1 text-sm text-slate-500">
            Inserta campos que luego se llenan solos desde cliente, producto o factura.
          </p>

          <div className="mt-4 grid gap-2">
            {[
              "{{client_name}}",
              "{{company_name}}",
              "{{service_name}}",
              "{{amount}}",
              "{{valid_until}}",
            ].map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => insertVariable(variable)}
                className="rounded-lg border px-3 py-2 text-left font-mono text-xs hover:bg-slate-50"
              >
                {variable}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border bg-slate-50 p-3">
            <h3 className="text-sm font-semibold">Valores de prueba</h3>

            <div className="mt-3 space-y-3">
              <label className="block text-xs">
                Cliente
                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </label>

              <label className="block text-xs">
                Empresa
                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>

              <label className="block text-xs">
                Servicio
                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
              </label>

              <label className="block text-xs">
                Monto
                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>

              <label className="block text-xs">
                Validez
                <input className="mt-1 w-full rounded border bg-white px-2 py-1.5" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-3">
            <h3 className="text-sm font-semibold">Preview aplicado</h3>
            <div
              className="mt-2 max-h-72 overflow-auto rounded border bg-white p-3 text-xs"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
