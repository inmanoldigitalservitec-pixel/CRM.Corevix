import { useMemo, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/crm/page-header";
import { LoadingTable } from "@/components/crm/loading-state";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

const NONE = "none";

type Option = { label: string; value: string };
type FieldType = "text" | "number" | "date" | "textarea" | "select";

type SalesField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  placeholder?: string;
  span?: 1 | 2;
};

type SalesConfig = {
  routeTitle: string;
  subtitle: string;
  table: string;
  module: string;
  numberKey?: string;
  titleKey: string;
  amountKey: string;
  dateKey: string;
  statusKey: string;
  defaultValues: Record<string, string>;
  fields: SalesField[];
  statuses: string[];
  primaryLabel: string;
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type ProjectRow = { id: string; name: string };
type InvoiceRow = { id: string; number: string; total: number | null };
type ProductRow = { id: string; name: string; base_price: number | null };

type GenericRow = Record<string, any>;

function formatMoney(value: number | string | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try { return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return value; }
}

function normalizePayload(form: Record<string, string>) {
  const payload: Record<string, any> = {};
  Object.entries(form).forEach(([key, value]) => {
    if (value === NONE) payload[key] = null;
    else if (["amount", "subtotal", "tax", "total"].includes(key)) payload[key] = value ? Number(value) : 0;
    else payload[key] = value || null;
  });
  return payload;
}

export function SalesBasicPage({ config }: { config: SalesConfig }) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(config.defaultValues);

  const { data, loading, error, fetch, create } = useCrud<GenericRow>({ table: config.table, orderBy: "updated_at", ascending: false, limit: 500 });
  const { data: clients } = useCrud<ClientRow>({ table: "clients", select: "id,company_name,contact_person", orderBy: "company_name", ascending: true, limit: 1000 });
  const { data: projects } = useCrud<ProjectRow>({ table: "projects", select: "id,name", orderBy: "updated_at", ascending: false, limit: 1000 });
  const { data: invoices } = useCrud<InvoiceRow>({ table: "invoices", select: "id,number,total", orderBy: "updated_at", ascending: false, limit: 1000 });
  const { data: products } = useCrud<ProductRow>({ table: "products", select: "id,name,base_price", orderBy: "name", ascending: true, limit: 1000 });

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const projectById = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const invoiceById = useMemo(() => new Map(invoices.map((item) => [item.id, item])), [invoices]);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

  const fieldOptions = (field: SalesField): Option[] => {
    if (field.options) return field.options;
    if (field.key === "client_id") return clients.map((item) => ({ label: item.company_name, value: item.id }));
    if (field.key === "project_id") return projects.map((item) => ({ label: item.name, value: item.id }));
    if (field.key === "invoice_id") return invoices.map((item) => ({ label: `${item.number} · ${formatMoney(item.total)}`, value: item.id }));
    if (field.key === "product_id") return products.map((item) => ({ label: item.name, value: item.id }));
    return [];
  };

  const kpis = useMemo(() => ({
    total: data.length,
    totalAmount: data.reduce((sum, row) => sum + Number(row[config.amountKey] || 0), 0),
    active: data.filter((row) => ["Active", "Completed", "Paid", "Accepted", "Issued", "Approved"].includes(row[config.statusKey])).length,
    pending: data.filter((row) => ["Draft", "Pending", "Sent", "Trial"].includes(row[config.statusKey])).length,
  }), [config.amountKey, config.statusKey, data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((row) => {
      const client = row.client_id ? clientById.get(row.client_id) : null;
      const project = row.project_id ? projectById.get(row.project_id) : null;
      const invoice = row.invoice_id ? invoiceById.get(row.invoice_id) : null;
      const product = row.product_id ? productById.get(row.product_id) : null;
      const haystack = `${row[config.numberKey || ""] || ""} ${row[config.titleKey] || ""} ${row.notes || ""} ${row.reason || ""} ${row.vendor || ""} ${row.category || ""} ${client?.company_name || ""} ${project?.name || ""} ${invoice?.number || ""} ${product?.name || ""}`.toLowerCase();
      return (!q || haystack.includes(q)) && (statusFilter === "all" || row[config.statusKey] === statusFilter);
    });
  }, [clientById, config.numberKey, config.statusKey, config.titleKey, data, invoiceById, productById, projectById, search, statusFilter]);

  const openCreate = () => {
    setForm(config.defaultValues);
    setDialogOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No company context.");
    const requiredMissing = config.fields.find((field) => field.required && !form[field.key]?.trim());
    if (requiredMissing) return toast.error(`${requiredMissing.label} is required.`);
    setSaving(true);
    try {
      await create(normalizePayload(form));
      toast.success(`${config.primaryLabel} created.`);
      setDialogOpen(false);
      await fetch();
    } catch (e: any) {
      toast.error(e.message || `Could not create ${config.primaryLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingTable />;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title={config.routeTitle} subtitle={config.subtitle} actionLabel={can(`${config.module}.create` as any) ? `New ${config.primaryLabel}` : undefined} onAction={can(`${config.module}.create` as any) ? openCreate : undefined} />
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Records" value={String(kpis.total)} />
        <Kpi label="Total Amount" value={formatMoney(kpis.totalAmount)} />
        <Kpi label="Active/Closed" value={String(kpis.active)} />
        <Kpi label="Pending" value={String(kpis.pending)} />
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2"><Button variant="outline" onClick={() => void fetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{can(`${config.module}.create` as any) && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New {config.primaryLabel}</Button>}</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder={`Search ${config.routeTitle.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{config.statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="overflow-hidden rounded-xl border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Name</TableHead><TableHead>Client</TableHead><TableHead>Related</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{filtered.length ? filtered.map((row) => <TableRow key={row.id}><TableCell className="font-semibold text-slate-500">{row[config.numberKey || ""] || "—"}</TableCell><TableCell><div className="font-semibold text-slate-900">{row[config.titleKey] || "—"}</div><div className="line-clamp-1 text-xs text-slate-500">{row.notes || row.reason || row.vendor || "Sin notas"}</div></TableCell><TableCell>{row.client_id ? clientById.get(row.client_id)?.company_name || "—" : "—"}</TableCell><TableCell>{row.project_id ? projectById.get(row.project_id)?.name : row.invoice_id ? invoiceById.get(row.invoice_id)?.number : row.product_id ? productById.get(row.product_id)?.name : "—"}</TableCell><TableCell>{formatDate(row[config.dateKey])}</TableCell><TableCell className="font-semibold">{formatMoney(row[config.amountKey])}</TableCell><TableCell><StatusBadge status={row[config.statusKey] || "—"} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">No records found.</TableCell></TableRow>}</TableBody></Table></div></div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>New {config.primaryLabel}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2">{config.fields.map((field) => <Field key={field.key} field={field} value={form[field.key] || ""} options={fieldOptions(field)} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} />)}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-extrabold text-slate-950">{value}</div></div>;
}

function Field({ field, value, options, onChange }: { field: SalesField; value: string; options: Option[]; onChange: (value: string) => void }) {
  const cls = field.span === 2 || field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5";
  if (field.type === "textarea") return <div className={cls}><Label>{field.label}</Label><Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} /></div>;
  if (field.type === "select") return <div className={cls}><Label>{field.label}</Label><Select value={value || NONE} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>None</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
  return <div className={cls}><Label>{field.label}</Label><Input type={field.type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} /></div>;
}
