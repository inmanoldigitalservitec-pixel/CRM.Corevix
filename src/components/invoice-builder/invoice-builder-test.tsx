import { useEffect, useMemo, useState } from "react";
import { Plus, Printer, Send, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type InvoiceItem = {
  id: string;
  catalogId?: string;
  catalogType?: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
};

type CRMRow = Record<string, any> & { id: string };
type CustomerOption = {
  id: string;
  type: "client" | "prospect";
  name: string;
  email: string;
  phone: string;
  address: string;
  raw: CRMRow;
};
type CatalogOption = {
  id: string;
  type: "product" | "service" | "membership" | "package";
  label: string;
  description: string;
  price: number;
  raw: CRMRow;
};
type SavedInvoice = { id: string; public_token?: string | null; number?: string | null };

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

function publicToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${uid()}-${uid()}`;
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

function customerLabel(row: CRMRow) {
  return firstText(
    row,
    [
      "company_name",
      "name",
      "company",
      "full_name",
      "contact_person",
      "display_name",
      "business_name",
      "title",
    ],
    "Sin nombre",
  );
}

function customerEmail(row: CRMRow) {
  return firstText(row, ["email", "contact_email", "primary_email"]);
}

function customerPhone(row: CRMRow) {
  return firstText(row, ["phone", "mobile", "contact_phone", "whatsapp", "telephone"]);
}

function customerAddress(row: CRMRow) {
  return firstText(row, ["address", "billing_address", "location", "city"]);
}

function catalogLabel(row: CRMRow) {
  return firstText(
    row,
    ["name", "title", "service_name", "product_name", "package_name", "membership_name"],
    "Artículo sin nombre",
  );
}

function catalogDescription(row: CRMRow) {
  return firstText(row, ["description", "summary", "details", "short_description"]);
}

function catalogPrice(row: CRMRow) {
  return firstNumber(
    row,
    [
      "base_price",
      "price",
      "unit_price",
      "sale_price",
      "amount",
      "monthly_price",
      "total",
      "value",
    ],
    0,
  );
}

function catalogTypeLabel(type: CatalogOption["type"]) {
  if (type === "membership") return "Membresía";
  if (type === "package") return "Paquete";
  if (type === "service") return "Servicio";
  return "Producto";
}

export function InvoiceBuilderTest() {
  const { profile } = useAuth();
  const [companyName, setCompanyName] = useState("Corevix");
  const [companySlogan, setCompanySlogan] = useState("CRM, automatización y soluciones digitales");
  const [companyEmail, setCompanyEmail] = useState("corevix.rd@gmail.com");
  const [companyPhone, setCompanyPhone] = useState("+1 (809) 000-0000");
  const [brandColor, setBrandColor] = useState("#1d62f9");

  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${String(Date.now()).slice(-5)}`);
  const [status, setStatus] = useState("Draft");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString().slice(0, 10),
  );

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [catalog, setCatalog] = useState<CatalogOption[]>([]);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState("");
  const [loadingCRMData, setLoadingCRMData] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<SavedInvoice | null>(null);

  const [customerType, setCustomerType] = useState<"client" | "prospect">("client");
  const [customerId, setCustomerId] = useState<string | null>(null);
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
      const db = supabase as any;

      const [clientsRes, leadsRes, productsRes, servicesRes, membershipsRes, packagesRes] =
        await Promise.all([
          db.from("clients").select("*").order("company_name", { ascending: true }),
          db.from("leads").select("*").order("created_at", { ascending: false }),
          db.from("products").select("*").order("name", { ascending: true }),
          db.from("services").select("*").order("name", { ascending: true }),
          db.from("memberships").select("*").order("name", { ascending: true }),
          db.from("packages").select("*").order("name", { ascending: true }),
        ]);

      const nextCustomers: CustomerOption[] = [];
      if (Array.isArray(clientsRes.data)) {
        for (const row of clientsRes.data) {
          nextCustomers.push({
            id: row.id,
            type: "client",
            name: customerLabel(row),
            email: customerEmail(row),
            phone: customerPhone(row),
            address: customerAddress(row),
            raw: row,
          });
        }
      }
      if (Array.isArray(leadsRes.data)) {
        for (const row of leadsRes.data) {
          nextCustomers.push({
            id: row.id,
            type: "prospect",
            name: customerLabel(row),
            email: customerEmail(row),
            phone: customerPhone(row),
            address: customerAddress(row),
            raw: row,
          });
        }
      }

      const buildCatalog = (rows: CRMRow[] | null | undefined, type: CatalogOption["type"]) =>
        Array.isArray(rows)
          ? rows.map((row) => ({
              id: row.id,
              type,
              label: catalogLabel(row),
              description: catalogDescription(row),
              price: catalogPrice(row),
              raw: row,
            }))
          : [];

      const nextCatalog = [
        ...buildCatalog(productsRes.data, "product"),
        ...buildCatalog(servicesRes.data, "service"),
        ...buildCatalog(membershipsRes.data, "membership"),
        ...buildCatalog(packagesRes.data, "package"),
      ];

      if (clientsRes.error) console.warn("No se pudieron cargar clientes", clientsRes.error);
      if (leadsRes.error) console.warn("No se pudieron cargar prospectos/leads", leadsRes.error);
      if (productsRes.error) console.warn("No se pudieron cargar productos", productsRes.error);
      if (servicesRes.error) console.warn("No se pudieron cargar servicios", servicesRes.error);
      if (membershipsRes.error)
        console.warn("No se pudieron cargar membresías", membershipsRes.error);
      if (packagesRes.error) console.warn("No se pudieron cargar paquetes", packagesRes.error);

      setCustomers(nextCustomers);
      setCatalog(nextCatalog);
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
  const publicUrl = savedInvoice?.public_token
    ? `${window.location.origin}/invoice/public/${savedInvoice.public_token}`
    : null;

  function applyCustomer(key: string) {
    setSelectedCustomerKey(key);
    const customer = customers.find((item) => `${item.type}:${item.id}` === key);
    if (!customer) return;
    setCustomerType(customer.type);
    setCustomerId(customer.id);
    setClientName(customer.name);
    setClientEmail(customer.email);
    setClientPhone(customer.phone);
    setClientAddress(customer.address);
  }

  function updateItem(id: string, patch: Partial<InvoiceItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function applyCatalog(itemId: string, catalogKey: string) {
    const selected = catalog.find((item) => `${item.type}:${item.id}` === catalogKey);
    if (!selected) {
      updateItem(itemId, { catalogId: "", catalogType: "" });
      return;
    }
    updateItem(itemId, {
      catalogId: selected.id,
      catalogType: selected.type,
      name: selected.label,
      description: selected.description,
      price: selected.price,
    });
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: uid(), name: "", description: "", quantity: 1, price: 0 },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function printInvoice() {
    window.print();
  }

  async function saveInvoice(nextStatus = status) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa. Cierra sesión y entra otra vez.");
      return null;
    }

    const validRows = items
      .map((item) => ({
        ...item,
        name: String(item.name || "").trim(),
        description: String(item.description || item.name || "").trim(),
        quantity: Number(item.quantity || 0) || 0,
        price: Number(item.price || 0) || 0,
      }))
      .filter((item) => item.description && item.quantity > 0);

    if (!clientName.trim() && !customerId) {
      toast.error("Selecciona un cliente o prospecto antes de guardar.");
      return null;
    }
    if (!validRows.length) {
      toast.error("Agrega al menos un producto, servicio, membresía o paquete.");
      return null;
    }

    setSaving(true);
    try {
      const db = supabase as any;
      const token = savedInvoice?.public_token || publicToken();
      const primaryProduct = validRows.find(
        (item) => item.catalogType === "product" && item.catalogId,
      );
      const invoiceData = {
        source: "invoice-builder-test",
        customer: {
          type: customerType,
          id: customerId,
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          address: clientAddress,
        },
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        issuerName: companyName,
        issuerEmail: companyEmail,
        issuerPhone: companyPhone,
        issuerBrandColor: brandColor,
        issuerSlogan: companySlogan,
        taxRate,
        terms,
        items: validRows.map((item) => ({
          catalogId: item.catalogId || null,
          catalogType: item.catalogType || null,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.price,
          total: item.quantity * item.price,
        })),
      };

      const record = {
        company_id: profile.company_id,
        created_by: profile.user_id || null,
        number: invoiceNumber,
        client_id: customerType === "client" ? customerId : null,
        proposal_id: null,
        product_id: primaryProduct?.catalogId || null,
        subtotal,
        tax,
        discount,
        total,
        status: nextStatus,
        date_issued: issueDate,
        due_date: dueDate,
        notes: notes || null,
        public_token: token,
        invoice_data: invoiceData,
      };

      let invoice: SavedInvoice;
      if (savedInvoice?.id) {
        const { data, error } = await db
          .from("invoices")
          .update(record)
          .eq("id", savedInvoice.id)
          .eq("company_id", profile.company_id)
          .select("id, public_token, number")
          .single();
        if (error) throw error;
        invoice = data;
      } else {
        const { data, error } = await db
          .from("invoices")
          .insert(record)
          .select("id, public_token, number")
          .single();
        if (error) throw error;
        invoice = data;
      }

      const invoiceId = invoice.id;
      await db.from("invoice_items").delete().eq("invoice_id", invoiceId);
      const itemRows = validRows.map((item) => ({
        invoice_id: invoiceId,
        description: item.description || item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.quantity * item.price,
      }));
      if (itemRows.length) {
        const { error: itemsError } = await db.from("invoice_items").insert(itemRows);
        if (itemsError) throw itemsError;
      }

      setStatus(nextStatus);
      setSavedInvoice(invoice);
      toast.success(
        nextStatus === "Sent" ? "Factura guardada como enviada." : "Borrador guardado.",
      );
      return invoice;
    } catch (error: any) {
      console.error("save invoice builder error:", error);
      toast.error(error?.message || "No se pudo guardar la factura.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-88px)] bg-[#f5f7fb] text-slate-950 print:bg-white">
      <style>{`@media print { body * { visibility: hidden; } #invoice-preview, #invoice-preview * { visibility: visible; } #invoice-preview { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; } .no-print { display: none !important; } }`}</style>

      <div className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-5 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold">Factura rápida</h1>
          <p className="text-xs text-slate-500">
            Selecciona cliente/prospecto y catálogo. Lo demás va a avanzado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={printInvoice}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveInvoice("Sent")}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {saving ? "Guardando…" : "Enviar"}
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-152px)] gap-5 p-5 xl:grid-cols-[minmax(760px,1fr)_minmax(300px,420px)] print:block print:h-auto print:p-0">
        <aside className="no-print flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Nueva factura asistida</h2>
                <p className="text-xs text-slate-500">
                  {loadingCRMData
                    ? "Cargando CRM…"
                    : savedInvoice
                      ? `Guardada: ${savedInvoice.number || invoiceNumber}`
                      : "Solo 2 pasos: cliente y catálogo."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" />
              Avanzado
            </button>
          </div>

          <div className="grid gap-4 border-b bg-slate-50 p-4 lg:grid-cols-[1fr_190px]">
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Cliente o prospecto
              <select
                value={selectedCustomerKey}
                onChange={(e) => applyCustomer(e.target.value)}
                className="h-14 rounded-2xl border bg-white px-4 text-base font-bold normal-case tracking-normal outline-none focus:border-blue-400"
              >
                <option value="">Seleccionar cliente o prospecto…</option>
                <optgroup label="Clientes">
                  {customers
                    .filter((c) => c.type === "client")
                    .map((customer) => (
                      <option key={`client:${customer.id}`} value={`client:${customer.id}`}>
                        {customer.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Prospectos">
                  {customers
                    .filter((c) => c.type === "prospect")
                    .map((customer) => (
                      <option key={`prospect:${customer.id}`} value={`prospect:${customer.id}`}>
                        {customer.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </label>
            <div className="rounded-2xl bg-white p-4 text-sm shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Total</p>
              <p className="mt-1 text-xl font-black text-blue-700">{money(total)}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">Catálogo</h3>
                <p className="text-xs text-slate-500">
                  Productos, servicios, membresías y paquetes.
                </p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>

            <div className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[34px_1fr_86px_138px_38px] gap-2 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                <span>#</span>
                <span>Producto / Servicio / Membresía / Paquete</span>
                <span>Cant.</span>
                <span>Total</span>
                <span />
              </div>
              <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-auto">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[34px_1fr_86px_138px_38px] items-center gap-2 px-3 py-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                      {index + 1}
                    </span>
                    <select
                      value={
                        item.catalogType && item.catalogId
                          ? `${item.catalogType}:${item.catalogId}`
                          : ""
                      }
                      onChange={(e) => applyCatalog(item.id, e.target.value)}
                      className="h-12 min-w-0 rounded-xl border px-3 text-sm font-bold outline-none focus:border-blue-400"
                    >
                      <option value="">Seleccionar del catálogo…</option>
                      {catalog.map((entry) => (
                        <option
                          key={`${entry.type}:${entry.id}`}
                          value={`${entry.type}:${entry.id}`}
                        >
                          {catalogTypeLabel(entry.type)} · {entry.label} · {money(entry.price)}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: Number(e.target.value) || 0 })
                      }
                      type="number"
                      className="h-12 rounded-xl border px-3 text-sm outline-none focus:border-blue-400"
                    />
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-black text-slate-950">
                      {money(item.quantity * item.price)}
                    </div>
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="grid h-10 w-10 place-items-center rounded-xl text-red-500 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t bg-white p-4 md:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400">Subtotal</p>
                <p className="font-black">{money(subtotal)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Descuento</p>
                <p className="font-black">- {money(discount)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">ITBIS</p>
                <p className="font-black">{money(tax)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Total</p>
                <p className="font-black text-blue-700">{money(total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveInvoice("Draft")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
              >
                Guardar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveInvoice("Sent")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {saving ? "Guardando…" : "Enviar"}
              </button>
            </div>
            {publicUrl ? (
              <p className="md:col-span-2 text-xs text-slate-500">
                Link público:{" "}
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="font-bold text-blue-600 hover:underline"
                >
                  copiar enlace
                </button>
              </p>
            ) : null}
          </div>
        </aside>

        <main className="flex items-start justify-center overflow-hidden print:overflow-visible">
          <div className="w-full py-2">
            <div className="mx-auto flex h-[calc(100vh-170px)] max-h-[calc(100vh-170px)] min-h-[560px] w-auto max-w-full flex-col">
              <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Vista móvil 9:16
              </div>
              <section
                id="invoice-preview"
                className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] print:h-auto print:min-h-screen print:aspect-auto print:max-w-none print:rounded-none print:border-0 print:shadow-none"
              >
                <div className="h-full overflow-y-auto">
                  <div
                    className="relative overflow-hidden px-5 pb-6 pt-6 text-white"
                    style={{
                      background: `radial-gradient(circle at 85% 20%, rgba(255,255,255,0.20), transparent 28%), linear-gradient(135deg, #020817 0%, ${brandColor} 100%)`,
                    }}
                  >
                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-lg font-black backdrop-blur">
                          {companyName.slice(0, 1).toUpperCase()}
                        </div>
                        <h2 className="truncate text-xl font-black">{companyName}</h2>
                        <p className="mt-1 max-w-[180px] text-[12px] leading-5 text-white/80">
                          {companySlogan}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">
                          Factura
                        </p>
                        <h1 className="mt-2 text-2xl font-black">{invoiceNumber}</h1>
                        <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold backdrop-blur">
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-5">
                    <div className="grid gap-4 border-b border-slate-200 pb-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Facturado a
                        </p>
                        <h3 className="mt-2 text-base font-black text-slate-950">{clientName}</h3>
                        <p className="mt-1 text-[12px] text-slate-500">{clientEmail}</p>
                        <p className="text-[12px] text-slate-500">{clientPhone}</p>
                        <p className="mt-1 whitespace-pre-line text-[12px] text-slate-500">
                          {clientAddress}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Fecha
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">{issueDate}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Vence
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">{dueDate}</p>
                        </div>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Total
                        </p>
                        <p className="mt-1 text-2xl font-black" style={{ color: brandColor }}>
                          {money(total)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-950">
                                {item.name || "Artículo"}
                              </p>
                              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                                {item.description}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] font-semibold text-slate-400">
                                x{item.quantity}
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-950">
                                {money(item.quantity * item.price)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-[12px] text-slate-500">
                            <span>Precio unitario</span>
                            <strong className="text-slate-900">{money(item.price)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-3xl bg-slate-50 p-4">
                      <div className="flex justify-between py-1.5 text-[13px]">
                        <span className="text-slate-500">Subtotal</span>
                        <strong>{money(subtotal)}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 text-[13px]">
                        <span className="text-slate-500">Descuento</span>
                        <strong>- {money(discount)}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 text-[13px]">
                        <span className="text-slate-500">ITBIS ({taxRate}%)</span>
                        <strong>{money(tax)}</strong>
                      </div>
                      <div className="mt-2 flex justify-between border-t pt-3 text-base">
                        <span className="font-black text-slate-950">Total</span>
                        <strong className="font-black" style={{ color: brandColor }}>
                          {money(total)}
                        </strong>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4">
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Notas
                        </h3>
                        <p className="mt-2 text-[12px] leading-5 text-slate-600">{notes}</p>
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          Términos
                        </h3>
                        <p className="mt-2 text-[12px] leading-5 text-slate-600">{terms}</p>
                      </div>
                    </div>
                    <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
                      <p>Generado desde Corevix CRM</p>
                      <p className="mt-1">{companyEmail}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {showAdvanced ? (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm">
          <div className="h-full w-full max-w-[560px] overflow-auto bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Opciones avanzadas</h2>
                <p className="text-sm text-slate-500">
                  Editar datos manuales, precios personalizados y condiciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Nombre cliente/prospecto
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Email
                <input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Teléfono
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={2}
                className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                placeholder="Dirección"
              />
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Empresa
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Color
                <input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  type="color"
                  className="h-[38px] rounded-xl border bg-white px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Descripción empresa
                <input
                  value={companySlogan}
                  onChange={(e) => setCompanySlogan(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Email empresa
                <input
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Teléfono empresa
                <input
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Factura
                <input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Estado
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                  <option>Cancelled</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Fecha
                <input
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  type="date"
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Vence
                <input
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  type="date"
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Descuento
                <input
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  type="number"
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                ITBIS %
                <input
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  type="number"
                  className="rounded-xl border px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2 rounded-2xl border p-4">
                <h3 className="mb-3 font-black">Edición manual de líneas</h3>
                <div className="grid gap-3">
                  {items.map((item) => (
                    <div key={item.id} className="grid gap-2 rounded-xl bg-slate-50 p-3">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="rounded-xl border px-3 py-2 text-sm font-bold"
                        placeholder="Nombre"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        rows={2}
                        className="rounded-xl border px-3 py-2 text-sm"
                        placeholder="Descripción"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={item.price}
                          onChange={(e) =>
                            updateItem(item.id, { price: Number(e.target.value) || 0 })
                          }
                          type="number"
                          className="rounded-xl border px-3 py-2 text-sm"
                          placeholder="Precio"
                        />
                        <input
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, { quantity: Number(e.target.value) || 0 })
                          }
                          type="number"
                          className="rounded-xl border px-3 py-2 text-sm"
                          placeholder="Cantidad"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                placeholder="Notas"
              />
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
                placeholder="Términos"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
