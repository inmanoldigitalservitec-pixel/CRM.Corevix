import { useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type VariableKey =
  | "client_name"
  | "company_name"
  | "service_name"
  | "amount"
  | "valid_until"
  | "today";

const VARIABLES: Array<{ key: VariableKey; label: string; token: string }> = [
  { key: "client_name", label: "Cliente", token: "{{client_name}}" },
  { key: "company_name", label: "Empresa", token: "{{company_name}}" },
  { key: "service_name", label: "Servicio", token: "{{service_name}}" },
  { key: "amount", label: "Monto", token: "{{amount}}" },
  { key: "valid_until", label: "Validez", token: "{{valid_until}}" },
  { key: "today", label: "Fecha de hoy", token: "{{today}}" },
];

const DEFAULT_HTML = `
  <h1>Propuesta comercial</h1>
  <p>Hola <strong>{{client_name}}</strong>,</p>
  <p>Gracias por considerar a <strong>{{company_name}}</strong>. Te presentamos una propuesta para el servicio de <strong>{{service_name}}</strong>.</p>
  <blockquote>
    <p>Esta propuesta busca ayudarte a organizar mejor tus procesos comerciales y mejorar el seguimiento de tus clientes.</p>
  </blockquote>
  <h2>Resumen del servicio</h2>
  <ul>
    <li>Implementación inicial del CRM.</li>
    <li>Configuración de módulos principales.</li>
    <li>Capacitación básica para el equipo.</li>
  </ul>
  <h2>Inversión</h2>
  <p>El monto estimado para este servicio es de <strong>{{amount}}</strong>.</p>
  <p>Esta propuesta es válida hasta <strong>{{valid_until}}</strong>.</p>
  <hr />
  <p>Fecha: {{today}}</p>
`;

function applyVariables(html: string, values: Record<VariableKey, string>) {
  return Object.entries(values).reduce((output, [key, value]) => {
    return output.replaceAll(`{{${key}}}`, value || `{{${key}}}`);
  }, html);
}

function ToolbarButton({
  active,
  disabled,
  children,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
        active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-2">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function DocumentBuilderTest() {
  const [clientName, setClientName] = useState("María Rodríguez");
  const [companyName, setCompanyName] = useState("Corevix Agency");
  const [serviceName, setServiceName] = useState("Implementación CRM");
  const [amount, setAmount] = useState("RD$ 45,000");
  const [validUntil, setValidUntil] = useState("30 días");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: DEFAULT_HTML,
    editorProps: {
      attributes: {
        class:
          "min-h-[620px] outline-none px-12 py-10 text-[15px] leading-7 text-slate-900 prose-headings:font-bold",
      },
    },
  });

  const values = useMemo<Record<VariableKey, string>>(
    () => ({
      client_name: clientName,
      company_name: companyName,
      service_name: serviceName,
      amount,
      valid_until: validUntil,
      today: new Date().toLocaleDateString(),
    }),
    [clientName, companyName, serviceName, amount, validUntil],
  );

  const html = editor?.getHTML() || "";
  const renderedHtml = useMemo(() => applyVariables(html, values), [html, values]);

  function insertVariable(token: string) {
    editor?.chain().focus().insertContent(token).run();
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(renderedHtml);
    setLastSavedAt("HTML copiado");
  }

  function downloadHtml() {
    const blob = new Blob([renderedHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento-corevix.html";
    a.click();
    URL.revokeObjectURL(url);
    setLastSavedAt("HTML descargado");
  }

  function resetDocument() {
    editor?.commands.setContent(DEFAULT_HTML);
    setLastSavedAt("Documento reiniciado");
  }

  if (!editor) {
    return (
      <div className="grid min-h-[400px] place-items-center text-sm text-slate-500">
        Cargando editor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] p-4">
      <div className="mx-auto flex max-w-[1500px] gap-4">
        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-10 rounded-2xl border bg-white/95 p-3 shadow-sm backdrop-blur">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-950">Constructor de documentos</h1>
                <p className="text-xs text-slate-500">
                  Editor tipo Word básico para propuestas, contratos y documentos del CRM.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetDocument}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Nuevo
                </button>
                <button
                  type="button"
                  onClick={copyHtml}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Copiar HTML
                </button>
                <button
                  type="button"
                  onClick={downloadHtml}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Descargar HTML
                </button>
              </div>
            </div>

            <div className="grid gap-2 xl:grid-cols-[auto_auto_auto_auto]">
              <ToolbarGroup title="Documento">
                <ToolbarButton
                  disabled={!editor.can().undo()}
                  onClick={() => editor.chain().focus().undo().run()}
                >
                  ↶ Deshacer
                </ToolbarButton>
                <ToolbarButton
                  disabled={!editor.can().redo()}
                  onClick={() => editor.chain().focus().redo().run()}
                >
                  ↷ Rehacer
                </ToolbarButton>
              </ToolbarGroup>

              <ToolbarGroup title="Estilos">
                <ToolbarButton
                  active={editor.isActive("paragraph")}
                  onClick={() => editor.chain().focus().setParagraph().run()}
                >
                  Párrafo
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("heading", { level: 1 })}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                  H1
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("heading", { level: 2 })}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                  H2
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("heading", { level: 3 })}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                  H3
                </ToolbarButton>
              </ToolbarGroup>

              <ToolbarGroup title="Formato">
                <ToolbarButton
                  active={editor.isActive("bold")}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  B
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("italic")}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  I
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("strike")}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  S
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("code")}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                >
                  Código
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
                  Limpiar
                </ToolbarButton>
              </ToolbarGroup>

              <ToolbarGroup title="Insertar">
                <ToolbarButton
                  active={editor.isActive("bulletList")}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  • Lista
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("orderedList")}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  1. Lista
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("blockquote")}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                  Cita
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("codeBlock")}
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                >
                  Bloque código
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                  Línea
                </ToolbarButton>
              </ToolbarGroup>
            </div>

            {lastSavedAt ? (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {lastSavedAt}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border bg-white shadow-sm">
            <EditorContent editor={editor} />
          </div>
        </main>

        <aside className="w-[360px] shrink-0 space-y-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Variables</h2>
            <p className="mt-1 text-xs text-slate-500">
              Inserta campos dinámicos que luego se reemplazan con datos reales.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {VARIABLES.map((variable) => (
                <button
                  key={variable.key}
                  type="button"
                  onClick={() => insertVariable(variable.token)}
                  className="rounded-lg border px-3 py-2 text-left text-xs hover:bg-slate-50"
                >
                  <span className="block font-semibold">{variable.label}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
                    {variable.token}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Valores de prueba</h2>

            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium">
                Cliente
                <input
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </label>

              <label className="block text-xs font-medium">
                Empresa
                <input
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>

              <label className="block text-xs font-medium">
                Servicio
                <input
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </label>

              <label className="block text-xs font-medium">
                Monto
                <input
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              <label className="block text-xs font-medium">
                Validez
                <input
                  className="mt-1 w-full rounded-lg border bg-white px-3 py-2"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Preview aplicado</h2>
            <div
              className="mt-3 max-h-[480px] overflow-auto rounded-xl border bg-white p-4 text-xs leading-6"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DocumentBuilderTest;
