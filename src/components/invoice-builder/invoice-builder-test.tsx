import { useEffect, useMemo, useState } from "react";
import { Eye, Plus, Printer, Send, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type InvoiceItem = {
  id: string;
  productId?: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
};

type CRMClient = Record<string, any> & { id: string };
type CRMProduct = Record<string, any> & { id: string };

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

function money(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function firstText(row: Record<string, any>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return fallback;
}

function firstNumber(row: Record<string, any>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return fallback;
}

function clientLabel(client: CRMClient) {
  return firstText(client, ["name", "company_name", "company", "full_name", "display_name", "business_name"], "Cliente sin nombre");
}

function productLabel(product: CRMProduct) {
  return firstText(product, ["name", "title", "service_name", "product_name"], "Producto sin nombre");
}

function productDescription(product: CRMProduct) {
  return firstText(product, ["description", "summary", "details", "short_description"], "");
}

function productPrice(product: CRMProduct) {
  return firstNumber(product, ["price", "unit_price", "sale_price", "amount", "base_price", "monthly_price"], 0);
}

export function InvoiceBuilderTest() {
  const [companyName, setCompanyName] = useState("Corevix");
  const [companySlogan, setCompanySlogan] = useState("CRM, automatización y soluciones digitales");
  const [companyEmail, setCompanyEmail] = useState("corevix.rd@gmail.com");
  const [companyPhone, setCompanyPhone] = useState("+1 (809) 000-0000");
  const [brandColor, setBrandColor] = useState("#1d62f9");

  const [invoiceNumber, setInvoiceNumber] = useState("FAC-0008");
  const [status, setStatus] = useState("Borrador");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString().slice(0, 10),
  );

  const [clients, setClients] = useState<CRMClient[]>([]);
  const [products, setProducts] = useState<CRMProduct[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [loadingCRMData, setLoadingCRMData] = useState(true);

  const [clientName, setClientName] = useState("Cliente Demo SRL");
  const [clientEmail, setClientEmail] = useState("cliente@empresa.com");
  const [clientPhone, setClientPhone] = useState("+1 (809) 555-0199");
  const [clientAddress, setClientAddress] = useState("Santo Domingo, República Dominicana");

  const [taxRate, setTaxRate] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState(
    "Gracias por confiar en nuestro equipo. Esta factura puede ser pagada mediante transferencia bancaria o enlace de pago.",
  );
  const [terms, setTerms] = useState(
    "Pago requerido antes de la fecha de vencimiento. Los servicios inician luego de confirmar el pago inicial.",
  );

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: uid(),
      name: "Configuración CRM",
      description: "Diseño, personalización y configuración inicial del CRM.",
      quantity: 1,
      price: 85000,
    },
    {
      id: uid(),
      name: "Automatización comercial",
      description: "Flujos automáticos para leads, clientes y seguimiento.",
      quantity: 1,
      price: 25000,
    },
  ]);

  useEffect(() => {
    async function loadCRMData() {
      setLoadingCRMData(true);

      const [{ data: clientsData, error: clientsError }, { data: productsData, error: productsError }] = await Promise.all([
        (supabase as any).from("clients").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("products").select("*").order("created_at", { ascending: false }),
      ]);

      if (clientsError) console.warn("No se pudieron cargar clientes", clientsError);
      if (productsError) console.warn("No se pudieron cargar productos", productsError);

      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setLoadingCRMData(false);
    }

    void loadCRMData();
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [items],
  );

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = useMemo(() => taxableAmount * (taxRate / 100), [taxableAmount, taxRate]);
  const total = useMemo(() => taxableAmount + tax, [taxableAmount, tax]);

  function applyClient(clientId: string) {
    setSelectedClientId(clientId);
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    setClientName(clientLabel(client));
    setClientEmail(firstText(client, ["email", "contact_email", "primary_email"]));
    setClientPhone(firstText(client, ["phone", "mobile", "contact_phone", "whatsapp", "telephone"]));
    setClientAddress(firstText(client, ["address", "billing_address", "location", "city"]));
  }

  function updateItem(id: string, patch: Partial<InvoiceItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function applyProduct(itemId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      updateItem(itemId, { productId: "" });
      return;
    }

    updateItem(itemId, {
      productId,
      name: productLabel(product),
      description: productDescription(product),
      price: productPrice(product),
    });
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: uid(),
        name: "",
        description: "",
        quantity: 1,
        price: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function printInvoice() {
    window.print();
  }

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[#f5f7fb] text-slate-950 print:bg-white">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-preview, #invoice-preview * { visibility: visible; }
          #invoice-preview { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-5 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">Factura rápida</h1>
          <p className="text-xs text-slate-500">
            Selecciona cliente y servicios del CRM; la factura se llena sola.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button type="button" onClick={printInvoice} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Send className="h-4 w-4" />
            Enviar
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(760px,880px)_minmax(320px,1fr)] print:block print:p-0">
        <aside className="no-print max-h-[calc(100vh-130px)] overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Nueva factura asistida</h2>
                <p className="text-sm text-slate-500">
                  {loadingCRMData ? "Cargando datos del CRM…" : "Usa datos existentes y corrige solo si hace falta."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500">Total</p>
              <p className="text-lg font-black text-blue-700">{money(total)}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">1. Cliente</h3>
                  <p className="text-xs text-slate-500">Busca un cliente y se llenan sus datos.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
                  {invoiceNumber}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-4">
                  Buscar cliente
                  <select
                    value={selectedClientId}
                    onChange={(e) => applyClient(e.target.value)}
                    className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400"
                  >
                    <option value="">Seleccionar cliente del CRM…</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {clientLabel(client)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-bold text-slate-500 md:col-span-2">
                  Nombre
                  <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="rounded-2xl border bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400" />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-500">
                  Email
                  <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-400" />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-500">
                  Teléfono
                  <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:border-blue-400" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950">2. Servicios</h3>
                  <p className="text-xs text-slate-500">Selecciona productos o servicios; precio y descripción se autocompletan.</p>
                </div>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5" />
                  Agregar servicio
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[30px_1.35fr_1.15fr_68px_105px_112px_34px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <span>#</span><span>Producto / servicio</span><span>Detalle</span><span>Cant.</span><span>Precio</span><span>Total</span><span />
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[30px_1.35fr_1.15fr_68px_105px_112px_34px] items-center gap-2 px-3 py-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
                      <div className="grid gap-2">
                        <select
                          value={item.productId ?? ""}
                          onChange={(e) => applyProduct(item.id, e.target.value)}
                          className="min-w-0 rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-blue-400"
                        >
                          <option value="">Seleccionar del catálogo…</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {productLabel(product)}
                            </option>
                          ))}
                        </select>
                        <input value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} className="min-w-0 rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-blue-400" placeholder="Nombre manual" />
                      </div>
                      <input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} className="min-w-0 rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400" placeholder="Descripción" />
                      <input value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 0 })} type="number" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400" />
                      <input value={item.price} onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })} type="number" className="rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-400" />
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-950">{money(item.quantity * item.price)}</div>
                      {items.length > 1 ? (
                        <button type="button" onClick={() => removeItem(item.id)} className="grid h-9 w-9 place-items-center rounded-xl text-red-500 hover:bg-red-50" title="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : <span />}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <details className="rounded-3xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer select-none font-black text-slate-950">Opciones avanzadas</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Empresa<input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Color<input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} type="color" className="h-[38px] rounded-xl border bg-white px-2 py-1" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Descripción empresa<input value={companySlogan} onChange={(e) => setCompanySlogan(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Email empresa<input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Teléfono empresa<input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Número<input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Estado<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm font-normal"><option>Borrador</option><option>Enviada</option><option>Pagada</option><option>Vencida</option></select></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Fecha<input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Vence<input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">Descuento<input value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <label className="grid gap-1 text-xs font-semibold text-slate-600">ITBIS %<input value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} type="number" className="rounded-xl border px-3 py-2 text-sm font-normal" /></label>
                  <textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={2} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Dirección del cliente" />
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Notas" />
                  <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} className="rounded-xl border px-3 py-2 text-sm md:col-span-2" placeholder="Términos" />
                </div>
              </details>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <h3 className="font-black text-slate-950">3. Revisar</h3>
                <p className="text-xs text-slate-500">Confirma el total antes de enviar.</p>
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <div className="flex justify-between py-1 text-sm"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div>
                  <div className="flex justify-between py-1 text-sm"><span className="text-slate-500">Descuento</span><strong>- {money(discount)}</strong></div>
                  <div className="flex justify-between py-1 text-sm"><span className="text-slate-500">ITBIS ({taxRate}%)</span><strong>{money(tax)}</strong></div>
                  <div className="mt-2 flex justify-between border-t pt-3 text-lg"><span className="font-black">Total</span><strong style={{ color: brandColor }}>{money(total)}</strong></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={printInvoice} className="inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50"><Printer className="h-4 w-4" />PDF</button>
                  <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"><Send className="h-4 w-4" />Enviar</button>
                </div>
              </div>
            </section>
          </div>
        </aside>

        <main className="flex items-start justify-center overflow-hidden print:overflow-visible">
          <div className="w-full py-2">
            <div className="mx-auto flex h-[calc(100vh-170px)] max-h-[calc(100vh-170px)] min-h-[560px] w-auto max-w-full flex-col">
              <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vista móvil 9:16</div>
              <section id="invoice-preview" className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] print:h-auto print:min-h-screen print:aspect-auto print:max-w-none print:rounded-none print:border-0 print:shadow-none">
                <div className="h-full overflow-y-auto">
                  <div className="relative overflow-hidden px-5 pb-6 pt-6 text-white" style={{ background: `radial-gradient(circle at 85% 20%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(135deg, #020817 0%, ${brandColor} 100%)` }}>
                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <div className="min-w-0"><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-lg font-black backdrop-blur">{companyName.slice(0, 1).toUpperCase()}</div><h2 className="truncate text-xl font-black">{companyName}</h2><p className="mt-1 max-w-[180px] text-[12px] leading-5 text-white/80">{companySlogan}</p></div>
                      <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Factura</p><h1 className="mt-2 text-2xl font-black">{invoiceNumber}</h1><span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold backdrop-blur">{status}</span></div>
                    </div>
                  </div>
                  <div className="px-5 py-5">
                    <div className="grid gap-4 border-b border-slate-200 pb-5">
                      <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Facturado a</p><h3 className="mt-2 text-base font-black text-slate-950">{clientName}</h3><p className="mt-1 text-[12px] text-slate-500">{clientEmail}</p><p className="text-[12px] text-slate-500">{clientPhone}</p><p className="mt-1 whitespace-pre-line text-[12px] text-slate-500">{clientAddress}</p></div>
                      <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Fecha</p><p className="mt-1 text-sm font-bold text-slate-900">{issueDate}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Vence</p><p className="mt-1 text-sm font-bold text-slate-900">{dueDate}</p></div></div>
                      <div className="rounded-3xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</p><p className="mt-1 text-2xl font-black" style={{ color: brandColor }}>{money(total)}</p></div>
                    </div>
                    <div className="mt-5 space-y-3">{items.map((item) => (<div key={item.id} className="rounded-3xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-black text-slate-950">{item.name || "Servicio"}</p><p className="mt-1 text-[12px] leading-5 text-slate-500">{item.description}</p></div><div className="text-right"><p className="text-[11px] font-semibold text-slate-400">x{item.quantity}</p><p className="mt-1 text-sm font-black text-slate-950">{money(item.quantity * item.price)}</p></div></div><div className="mt-3 flex items-center justify-between text-[12px] text-slate-500"><span>Precio unitario</span><strong className="text-slate-900">{money(item.price)}</strong></div></div>))}</div>
                    <div className="mt-5 rounded-3xl bg-slate-50 p-4"><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">Descuento</span><strong>- {money(discount)}</strong></div><div className="flex justify-between py-1.5 text-[13px]"><span className="text-slate-500">ITBIS ({taxRate}%)</span><strong>{money(tax)}</strong></div><div className="mt-2 flex justify-between border-t pt-3 text-base"><span className="font-black text-slate-950">Total</span><strong className="font-black" style={{ color: brandColor }}>{money(total)}</strong></div></div>
                    <div className="mt-5 space-y-4"><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Notas</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{notes}</p></div><div><h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Términos</h3><p className="mt-2 text-[12px] leading-5 text-slate-600">{terms}</p></div></div>
                    <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400"><p>Generado desde Corevix CRM</p><p className="mt-1">{companyEmail}</p></div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
