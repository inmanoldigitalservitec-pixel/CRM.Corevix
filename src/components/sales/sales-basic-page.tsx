import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  FileText,
  FolderOpen,
  Hash,
  Loader2,
  Package,
  Plus,
  Trash2,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/crm/page-header";
import { LoadingTable } from "@/components/crm/loading-state";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

const DISPLAY_LABELS: Record<string, string> = {
  "Not Started": "No iniciado",
  "In Progress": "En progreso",
  "On Hold": "En pausa",
  Completed: "Completado",
  Cancelled: "Cancelado",
  "To Do": "Por hacer",
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Urgent: "Urgente",
  Draft: "Borrador",
  Sent: "Enviado",
  Accepted: "Aceptado",
  Declined: "Rechazado",
  Expired: "Expirado",
  Converted: "Convertido",
  Pending: "Pendiente",
  Failed: "Fallido",
  Refunded: "Reembolsado",
  Issued: "Emitida",
  Applied: "Aplicada",
  Active: "Activo",
  Signed: "Firmado",
  "Not Signed": "Sin firmar",
  "Pending Signature": "Pendiente de firma",
  Linked: "Vinculada",
  Manual: "Manual",
  Cash: "Efectivo",
  Card: "Tarjeta",
  "Bank Transfer": "Transferencia bancaria",
  Check: "Cheque",
  Other: "Otro",
};

function displayLabel(value: string) {
  return DISPLAY_LABELS[value] ?? value;
}

const NONE = "none";

type Option = { label: string; value: string; displayLabel?: string };
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
  primaryActionLabel?: string;
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type ProjectRow = { id: string; name: string };
type InvoiceRow = { id: string; number: string; total: number | null };
type ProductRow = { id: string; name: string; base_price: number | null };

type GenericRow = Record<string, any>;
type SalesBasicPageProps = {
  config: SalesConfig;
  initialFieldValues?: Record<string, string>;
  autoOpenCreate?: boolean;
  onCreated?: (row: GenericRow | null) => void | Promise<void>;
  onCreateAction?: () => void;
  createDialog?: ReactNode;
  refreshSignal?: number | string;
  enableDelete?: boolean;
  beforeDelete?: (row: GenericRow) => Promise<void> | void;
};

function formatMoney(value: number | string | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function normalizePayload(form: Record<string, string>) {
  const payload: Record<string, any> = {};
  Object.entries(form).forEach(([key, value]) => {
    if (value === NONE) payload[key] = null;
    else if (["amount", "subtotal", "tax", "total"].includes(key))
      payload[key] = value ? Number(value) : 0;
    else payload[key] = value || null;
  });
  return payload;
}

export function SalesBasicPage({
  config,
  initialFieldValues,
  autoOpenCreate = false,
  onCreated,
  onCreateAction,
  createDialog,
  refreshSignal,
  enableDelete = false,
  beforeDelete,
}: SalesBasicPageProps) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const canDelete = enableDelete && can(`${config.module}.delete` as any);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<GenericRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const autoOpenKeyRef = useRef<string | null>(null);
  const defaultValuesKey = JSON.stringify(config.defaultValues);
  const initialFieldValuesKey = JSON.stringify(initialFieldValues || {});
  const initialForm = useMemo(
    () => ({ ...config.defaultValues, ...(initialFieldValues || {}) }),
    [defaultValuesKey, initialFieldValuesKey],
  );
  const [form, setForm] = useState<Record<string, string>>(initialForm);

  const { data, loading, error, fetch, create, remove } = useCrud<GenericRow>({
    table: config.table,
    orderBy: "updated_at",
    ascending: false,
    limit: 500,
  });
  const { data: clients } = useCrud<ClientRow>({
    table: "clients",
    select: "id,company_name,contact_person",
    orderBy: "company_name",
    ascending: true,
    limit: 1000,
  });
  const { data: projects } = useCrud<ProjectRow>({
    table: "projects",
    select: "id,name",
    orderBy: "updated_at",
    ascending: false,
    limit: 1000,
  });
  const { data: invoices } = useCrud<InvoiceRow>({
    table: "invoices",
    select: "id,number,total",
    orderBy: "updated_at",
    ascending: false,
    limit: 1000,
  });
  const { data: products } = useCrud<ProductRow>({
    table: "products",
    select: "id,name,base_price",
    orderBy: "name",
    ascending: true,
    limit: 1000,
  });

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const projectById = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const invoiceById = useMemo(() => new Map(invoices.map((item) => [item.id, item])), [invoices]);
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

  const fieldOptions = (field: SalesField): Option[] => {
    if (field.options) return field.options;
    if (field.key === "client_id")
      return clients.map((item) => ({ label: item.company_name, value: item.id }));
    if (field.key === "project_id")
      return projects.map((item) => ({ label: item.name, value: item.id }));
    if (field.key === "invoice_id")
      return invoices.map((item) => ({
        label: `${item.number} · ${formatMoney(item.total)}`,
        value: item.id,
      }));
    if (field.key === "product_id")
      return products.map((item) => ({ label: item.name, value: item.id }));
    return [];
  };

  const kpis = useMemo(
    () => ({
      total: data.length,
      totalAmount: data.reduce((sum, row) => sum + Number(row[config.amountKey] || 0), 0),
      active: data.filter((row) =>
        ["Active", "Completed", "Paid", "Accepted", "Issued", "Approved"].includes(
          row[config.statusKey],
        ),
      ).length,
      pending: data.filter((row) =>
        ["Draft", "Pending", "Sent", "Trial"].includes(row[config.statusKey]),
      ).length,
    }),
    [config.amountKey, config.statusKey, data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((row) => {
      const client = row.client_id ? clientById.get(row.client_id) : null;
      const project = row.project_id ? projectById.get(row.project_id) : null;
      const invoice = row.invoice_id ? invoiceById.get(row.invoice_id) : null;
      const product = row.product_id ? productById.get(row.product_id) : null;
      const haystack =
        `${row[config.numberKey || ""] || ""} ${row[config.titleKey] || ""} ${row.notes || ""} ${row.reason || ""} ${row.vendor || ""} ${row.category || ""} ${client?.company_name || ""} ${project?.name || ""} ${invoice?.number || ""} ${product?.name || ""}`.toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (statusFilter === "all" || row[config.statusKey] === statusFilter)
      );
    });
  }, [
    clientById,
    config.numberKey,
    config.statusKey,
    config.titleKey,
    data,
    invoiceById,
    productById,
    projectById,
    search,
    statusFilter,
  ]);

  const openCreate = () => {
    if (onCreateAction) {
      onCreateAction();
      return;
    }
    setForm(initialForm);
    setDialogOpen(true);
  };

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    if (!autoOpenCreate) {
      autoOpenKeyRef.current = null;
      return;
    }
    if (!can(`${config.module}.create` as any)) return;
    if (autoOpenKeyRef.current === initialFieldValuesKey) return;

    autoOpenKeyRef.current = initialFieldValuesKey;
    if (onCreateAction) {
      onCreateAction();
      return;
    }
    setForm(initialForm);
    setDialogOpen(true);
  }, [autoOpenCreate, can, config.module, initialFieldValuesKey, initialForm, onCreateAction]);

  useEffect(() => {
    if (refreshSignal === undefined) return;
    void fetch();
  }, [fetch, refreshSignal]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No hay contexto de compañía.");
    const requiredMissing = config.fields.find(
      (field) => field.required && !form[field.key]?.trim(),
    );
    if (requiredMissing) return toast.error(`${requiredMissing.label} es obligatorio.`);
    setSaving(true);
    try {
      const created = await create(normalizePayload(form));
      toast.success(`${config.primaryLabel} creado correctamente.`);
      setDialogOpen(false);
      await fetch();
      await onCreated?.(created);
    } catch (e: any) {
      toast.error(e.message || `No se pudo crear ${config.primaryLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow?.id) return;
    setDeleting(true);
    try {
      await beforeDelete?.(deleteRow);
      await remove(String(deleteRow.id));
      toast.success(`${config.primaryLabel} eliminado correctamente.`);
      setDeleteRow(null);
      await fetch();
    } catch (e: any) {
      toast.error(e?.message || `No se pudo eliminar ${config.primaryLabel.toLowerCase()}.`);
    } finally {
      setDeleting(false);
    }
  };

  const mobileKpiLabel =
    config.module === "payments"
      ? "Cobrado"
      : config.module === "credit_notes"
        ? "Crédito"
        : config.module === "expenses"
          ? "Gastos"
          : config.module === "subscriptions"
            ? "Recurrente"
            : config.module === "estimates"
              ? "Cotizado"
              : "Monto total";
  const mobileKpiTone =
    config.module === "expenses" || config.module === "credit_notes" ? "orange" : "green";

  const openRecordDetail = (row: GenericRow) => {
    if (!row.id || typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("corevix:open-global-detail", {
        detail: {
          group: config.table,
          id: String(row.id),
          href: `/${config.table.replace(/_/g, "-")}`,
        },
      }),
    );
  };

  if (loading) return <LoadingTable />;

  return (
    <div className="min-h-dvh space-y-5 bg-white p-4 sm:p-6">
      <div className="hidden sm:block">
        <PageHeader title={config.routeTitle} subtitle={config.subtitle} />
      </div>
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <GlobalKpiStrip
        title={config.routeTitle}
        subtitle={config.subtitle}
        actionLabel={
          can(`${config.module}.create` as any)
            ? (config.primaryActionLabel ?? `Nuevo ${config.primaryLabel}`)
            : undefined
        }
        onAction={can(`${config.module}.create` as any) ? openCreate : undefined}
        items={[
          {
            key: "summary",
            label: mobileKpiLabel,
            value: formatMoney(kpis.totalAmount),
            helper: `${filtered.length} visibles de ${kpis.total} registros`,
            icon: WalletCards,
            tone: mobileKpiTone,
            meta: [
              { label: "Registros", value: kpis.total, tone: "blue" },
              { label: "Activos", value: kpis.active, tone: "green" },
              { label: "Pendientes", value: kpis.pending, tone: "orange" },
            ],
          },
        ]}
      >
        <div className="mt-2 w-full">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {config.statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {displayLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div className="hidden gap-3 sm:grid sm:grid-cols-4">
        <Kpi label="Registros" value={String(kpis.total)} tone="neutral" />
        <Kpi
          label="Monto total"
          value={formatMoney(kpis.totalAmount)}
          tone={
            config.module === "expenses" || config.module === "credit_notes"
              ? riskTone(kpis.totalAmount, 1000, 5000)
              : "success"
          }
        />
        <Kpi label="Activos/cerrados" value={String(kpis.active)} tone="success" />
        <Kpi label="Pendientes" value={String(kpis.pending)} tone={riskTone(kpis.pending, 1, 6)} />
      </div>

      <section className="border-y border-slate-100 bg-white max-sm:border-0 max-sm:bg-transparent">
        <div className="border-b border-slate-100 px-4 py-3 max-md:hidden sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              {can(`${config.module}.create` as any) && (
                <Button
                  className="hidden h-9 rounded-md bg-blue-600 px-3 text-sm font-normal text-white shadow-none hover:bg-blue-700 sm:inline-flex"
                  onClick={openCreate}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {config.primaryActionLabel ?? `Nuevo ${config.primaryLabel}`}
                </Button>
              )}
            </div>
            <div className="hidden gap-2 sm:grid sm:grid-cols-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {config.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {displayLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="grid gap-2.5 md:hidden">
          {filtered.length ? (
            filtered.map((row) => (
              <SalesMobileCard
                key={row.id}
                row={row}
                config={config}
                clientById={clientById}
                projectById={projectById}
                invoiceById={invoiceById}
                productById={productById}
                canDelete={canDelete}
                onOpen={() => openRecordDetail(row)}
                onDelete={() => setDeleteRow(row)}
              />
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">
              No se encontraron registros.
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Relacionado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  {canDelete ? <TableHead className="w-[72px] text-right">Acción</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => openRecordDetail(row)}
                    >
                      <TableCell className="font-normal text-slate-500">
                        {row[config.numberKey || ""] || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-normal text-slate-900">
                          {row[config.titleKey] || "—"}
                        </div>
                        <div className="line-clamp-1 text-xs text-slate-500">
                          {row.notes || row.reason || row.vendor || "Sin notas"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.client_id ? clientById.get(row.client_id)?.company_name || "—" : "—"}
                      </TableCell>
                      <TableCell>
                        {row.project_id
                          ? projectById.get(row.project_id)?.name
                          : row.invoice_id
                            ? invoiceById.get(row.invoice_id)?.number
                            : row.product_id
                              ? productById.get(row.product_id)?.name
                              : "—"}
                      </TableCell>
                      <TableCell>{formatDate(row[config.dateKey])}</TableCell>
                      <TableCell className="font-normal">
                        {formatMoney(row[config.amountKey])}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row[config.statusKey] || "—"} />
                      </TableCell>
                      {canDelete ? (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-none border-0 border-b border-slate-200 bg-transparent shadow-none hover:bg-transparent"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteRow(row);
                            }}
                            aria-label={`Eliminar ${config.primaryLabel.toLowerCase()}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canDelete ? 8 : 7}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      No se encontraron registros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {onCreateAction ? (
        createDialog
      ) : (
        <CrmCreationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={config.primaryActionLabel ?? `Nuevo ${config.primaryLabel}`}
          description="Completa los datos del registro. Los campos preseleccionados se pueden editar antes de guardar."
          size="md"
        >
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={form[field.key] || ""}
                  options={fieldOptions(field)}
                  onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
            </div>
            <div className={crmFormStyles.footer}>
              <Button
                type="button"
                variant="ghost"
                className={crmFormStyles.cancelButton}
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className={crmFormStyles.primaryButton} disabled={saving}>
                {saving ? "Guardando..." : "Crear"}
              </Button>
            </div>
          </form>
        </CrmCreationDialog>
      )}
      {canDelete ? (
        <AlertDialog open={Boolean(deleteRow)} onOpenChange={(open) => !open && setDeleteRow(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {config.primaryLabel.toLowerCase()}</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el registro y sus archivos asociados cuando existan. No se
                puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

type KpiTone = "neutral" | "success" | "warning" | "danger";

function riskTone(value: number, warningAt: number, dangerAt: number): KpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: KpiTone }) {
  const valueClass =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-500"
        : tone === "danger"
          ? "text-rose-600"
          : "text-slate-950";

  return (
    <div className="border-b border-slate-100 bg-white pb-4">
      <div className="text-xs font-normal uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-normal ${valueClass}`}>{value}</div>
    </div>
  );
}

function SalesMobileCard({
  row,
  config,
  clientById,
  projectById,
  invoiceById,
  productById,
  canDelete,
  onOpen,
  onDelete,
}: {
  row: GenericRow;
  config: SalesConfig;
  clientById: Map<string, ClientRow>;
  projectById: Map<string, ProjectRow>;
  invoiceById: Map<string, InvoiceRow>;
  productById: Map<string, ProductRow>;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const title = row[config.titleKey] || "Sin nombre";
  const numberValue = config.numberKey ? row[config.numberKey] : null;
  const clientLabel = row.client_id
    ? clientById.get(row.client_id)?.company_name || "Sin cliente"
    : "Sin cliente";
  const related =
    row.project_id && projectById.get(row.project_id)
      ? { icon: FolderOpen, label: projectById.get(row.project_id)?.name || "Proyecto" }
      : row.invoice_id && invoiceById.get(row.invoice_id)
        ? { icon: FileText, label: invoiceById.get(row.invoice_id)?.number || "Factura" }
        : row.product_id && productById.get(row.product_id)
          ? { icon: Package, label: productById.get(row.product_id)?.name || "Producto" }
          : null;
  const detail = row.notes || row.reason || row.vendor || row.category || "Sin notas";

  return (
    <article
      className="cursor-pointer rounded-[18px] border border-slate-200 bg-white p-3.5 text-left transition-colors active:scale-[0.992]"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-blue-100 bg-blue-50 text-blue-700">
          <FileText className="h-5 w-5" />
        </div>

        <div className="min-w-0 pt-0.5">
          <div className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em] text-slate-950">
            {title}
          </div>
          <div className="mt-0.5 line-clamp-1 text-[12.5px] font-medium leading-4 text-slate-500">
            {detail}
          </div>
        </div>

        <StatusBadge
          status={row[config.statusKey] || "—"}
          className="min-h-6 max-w-[92px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 pl-[50px] max-[360px]:grid-cols-1 max-[360px]:pl-0">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
            Monto
          </div>
          <div className="mt-1 truncate text-[13px] font-extrabold text-slate-900">
            {formatMoney(row[config.amountKey])}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
            Fecha
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-slate-600">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{formatDate(row[config.dateKey])}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2 text-[12.5px] font-semibold text-slate-600">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">{clientLabel}</span>
        </div>
        {related ? (
          <div className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2 text-[12.5px] font-semibold text-slate-600">
            <related.icon className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{related.label}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-slate-400">
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{numberValue || "Sin número"}</span>
          </div>
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              aria-label={`Eliminar ${config.primaryLabel.toLowerCase()}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Field({
  field,
  value,
  options,
  onChange,
}: {
  field: SalesField;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const cls =
    field.span === 2 || field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5";
  if (field.type === "textarea")
    return (
      <div className={cls}>
        <Label className={crmFormStyles.label}>{field.label}</Label>
        <Textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={crmFormStyles.textarea}
        />
      </div>
    );
  if (field.type === "select")
    return (
      <div className={cls}>
        <Label className={crmFormStyles.label}>{field.label}</Label>
        <Select value={value || NONE} onValueChange={onChange}>
          <SelectTrigger className={crmFormStyles.select}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Ninguno</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.displayLabel ?? displayLabel(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  return (
    <div className={cls}>
      <Label className={crmFormStyles.label}>{field.label}</Label>
      <Input
        type={field.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        className={crmFormStyles.input}
      />
    </div>
  );
}
