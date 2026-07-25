import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Pencil, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { PageHeader } from "@/components/crm/page-header";
import { GlobalKpiStrip } from "@/components/crm/global-kpi-strip";
import { LoadingTable } from "@/components/crm/loading-state";
import { CrmDetailLineButton, CrmDetailSelectTrigger } from "@/components/crm/crm-detail-layout";
import {
  ContractDetailDialog,
  type ContractDetailRow,
} from "@/components/contracts/contract-detail-dialog";
import {
  ContractEditorDialog,
  type ContractEditorRow,
} from "@/components/contracts/contract-editor-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { convertToBaseCurrency, formatCurrencyAmount, normalizeCurrency } from "@/lib/currency";

export const Route = createFileRoute("/contracts")({
  component: ContractsPage,
  head: () => ({ meta: [{ title: "Contracts — Corevix CRM" }] }),
});

const STATUSES = ["Draft", "Active", "Expired", "Cancelled", "Pending Signature"];

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

const ALL = "all";

type ContractRow = {
  id: string;
  contract_number: number | null;
  company_id: string;
  subject: string;
  description: string | null;
  status: string;
  contract_type: string;
  contract_value: number | null;
  currency?: string | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  exchange_rate_source?: string | null;
  exchange_rate_updated_at?: string | null;
  contract_value_base?: number | null;
  start_date: string | null;
  end_date: string | null;
  client_id: string | null;
  project_id: string | null;
  proposal_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  signed_at: string | null;
  signature_status?: string | null;
  invoice_id?: string | null;
  created_at: string;
  updated_at: string;
};

type ClientRow = { id: string; company_name: string; contact_person: string | null };
type ProjectRow = { id: string; name: string; client_id: string | null };
type ProfileRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
};

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

function formatMoney(value: number | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, currency || "USD");
}

function getContractCurrency(contract: ContractRow, fallback: string) {
  return normalizeCurrency(contract.currency || contract.base_currency || fallback);
}

function getContractBaseValue(
  contract: ContractRow,
  settings: ReturnType<typeof useCompanyCurrencySettings>["settings"],
) {
  const storedBase = Number(contract.contract_value_base);
  if (Number.isFinite(storedBase) && contract.contract_value_base != null) {
    const storedBaseCurrency = normalizeCurrency(contract.base_currency || settings.baseCurrency);
    return storedBaseCurrency === settings.baseCurrency
      ? storedBase
      : convertToBaseCurrency(storedBase, storedBaseCurrency, settings);
  }
  return convertToBaseCurrency(
    Number(contract.contract_value || 0),
    getContractCurrency(contract, settings.baseCurrency),
    settings,
  );
}

function isExpired(contract: ContractRow) {
  if (contract.status === "Expired") return true;
  if (!contract.end_date || contract.status === "Cancelled") return false;
  return contract.end_date < new Date().toISOString().slice(0, 10);
}

function signatureStatus(contract: ContractRow) {
  if (contract.signed_at || contract.signature_status === "Signed") return "Signed";
  return contract.signature_status || "Not Signed";
}

type ContractKpiTone = "neutral" | "success" | "warning" | "danger";

function contractRiskTone(value: number, warningAt: number, dangerAt: number): ContractKpiTone {
  if (value >= dangerAt) return "danger";
  if (value >= warningAt) return "warning";
  return "success";
}

function ContractKpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: ContractKpiTone;
}) {
  const toneClass: Record<ContractKpiTone, string> = {
    neutral: "text-slate-950",
    success: "text-emerald-600",
    warning: "text-orange-500",
    danger: "text-rose-600",
  };

  return (
    <div className="min-w-0 border-b border-slate-100 pb-3">
      <div className="text-xs font-normal uppercase text-slate-500">{label}</div>
      <div className={`mt-2 truncate text-xl font-normal ${toneClass[tone]}`}>{value}</div>
    </div>
  );
}

function ContractsPage() {
  const { profile } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { can } = usePermissions();
  const db = supabase as any;

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [clientFilter, setClientFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractEditorRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractDetailRow | null>(null);

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const projectById = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);

  const clientOptions = useMemo(
    () => clients.map((client) => ({ id: client.id, label: client.company_name })),
    [clients],
  );
  const projectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, label: project.name })),
    [projects],
  );
  const profileOptions = useMemo(
    () =>
      profiles.map((staff) => ({ id: staff.id, label: staff.full_name || staff.email || "Staff" })),
    [profiles],
  );

  const fetchContracts = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [contractRes, clientRes, projectRes, profileRes] = await Promise.all([
      db
        .from("contracts")
        .select("*")
        .eq("company_id", cid)
        .order("updated_at", { ascending: false })
        .limit(500),
      db
        .from("clients")
        .select("id,company_name,contact_person")
        .eq("company_id", cid)
        .order("company_name", { ascending: true })
        .limit(1000),
      db
        .from("projects")
        .select("id,name,client_id")
        .eq("company_id", cid)
        .order("updated_at", { ascending: false })
        .limit(1000),
      db
        .from("profiles")
        .select("id,user_id,full_name,email,is_active")
        .eq("company_id", cid)
        .order("full_name", { ascending: true })
        .limit(1000),
    ]);

    const firstError = contractRes.error || clientRes.error || projectRes.error || profileRes.error;
    if (firstError) {
      toast.error(firstError.message || "No se pudieron cargar los contratos.");
      setLoading(false);
      return;
    }

    setContracts(contractRes.data || []);
    setClients(clientRes.data || []);
    setProjects(projectRes.data || []);
    setProfiles(profileRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.company_id]);

  const contractTypes = useMemo(
    () => Array.from(new Set(contracts.map((item) => item.contract_type).filter(Boolean))).sort(),
    [contracts],
  );

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    return {
      total: contracts.length,
      active: contracts.filter((contract) => contract.status === "Active").length,
      expired: contracts.filter((contract) => isExpired(contract)).length,
      pending: contracts.filter((contract) => contract.status === "Pending Signature").length,
      draft: contracts.filter((contract) => contract.status === "Draft").length,
      signed: contracts.filter((contract) => signatureStatus(contract) === "Signed").length,
      expiringSoon: contracts.filter(
        (contract) =>
          contract.end_date &&
          contract.end_date >= today &&
          contract.end_date <= in30Days &&
          contract.status !== "Cancelled",
      ).length,
      totalValue: contracts.reduce(
        (sum, contract) => sum + getContractBaseValue(contract, currencySettings),
        0,
      ),
      invoiced: contracts.filter((contract) => !!contract.invoice_id).length,
    };
  }, [contracts, currencySettings]);

  const valueByClient = useMemo(() => {
    return Array.from(
      contracts.reduce((map, contract) => {
        const key = contract.client_id || "No client";
        map.set(key, (map.get(key) || 0) + getContractBaseValue(contract, currencySettings));
        return map;
      }, new Map<string, number>()),
    )
      .map(([clientId, value]) => ({
        label: clientById.get(clientId)?.company_name || "No client",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [contracts, clientById, currencySettings]);

  const valueByProject = useMemo(() => {
    return Array.from(
      contracts.reduce((map, contract) => {
        const key = contract.project_id || "No project";
        map.set(key, (map.get(key) || 0) + getContractBaseValue(contract, currencySettings));
        return map;
      }, new Map<string, number>()),
    )
      .map(([projectId, value]) => ({
        label: projectById.get(projectId)?.name || "No project",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [contracts, projectById, currencySettings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const client = contract.client_id ? clientById.get(contract.client_id) : null;
      const project = contract.project_id ? projectById.get(contract.project_id) : null;
      const assigned = contract.assigned_to ? profileById.get(contract.assigned_to) : null;
      const haystack =
        `${contract.contract_number || ""} ${contract.subject} ${contract.description || ""} ${contract.contract_type || ""} ${client?.company_name || ""} ${project?.name || ""} ${assigned?.full_name || ""} ${assigned?.email || ""}`.toLowerCase();
      return (
        (!q || haystack.includes(q)) &&
        (statusFilter === ALL || contract.status === statusFilter) &&
        (clientFilter === ALL || contract.client_id === clientFilter) &&
        (projectFilter === ALL || contract.project_id === projectFilter) &&
        (typeFilter === ALL || contract.contract_type === typeFilter)
      );
    });
  }, [
    clientById,
    clientFilter,
    contracts,
    profileById,
    projectById,
    projectFilter,
    search,
    statusFilter,
    typeFilter,
  ]);

  const openNewContract = () => {
    setEditingContract(null);
    setDialogOpen(true);
  };

  const openEditContract = (contract: ContractRow) => {
    setEditingContract(contract);
    setDialogOpen(true);
  };

  const openContractDetail = (contract: ContractRow) => {
    setSelectedContract(contract);
    setDetailOpen(true);
  };

  if (loading) return <LoadingTable />;

  return (
    <div className="min-h-dvh space-y-3 bg-white p-4 sm:p-6 md:space-y-5">
      <GlobalKpiStrip
        title="Contratos"
        subtitle="Acuerdos, renovaciones y firmas"
        actionLabel={can("contracts.create") ? "Nuevo contrato" : undefined}
        onAction={can("contracts.create") ? openNewContract : undefined}
        items={[
          {
            key: "contracted-value",
            label: "Valor contratado",
            value: formatMoney(kpis.totalValue, currencySettings.baseCurrency),
            helper: `${filtered.length} visibles de ${contracts.length} contratos`,
            icon: FileText,
            tone: "purple",
            meta: [
              { label: "Activos", value: kpis.active, tone: "green" },
              { label: "Pendientes", value: kpis.pending, tone: "blue" },
              { label: "Vencen", value: kpis.expiringSoon, tone: "orange" },
              { label: "Firmados", value: kpis.signed, tone: "teal" },
            ],
          },
        ]}
      >
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-none transition hover:border-slate-400 hover:bg-slate-50/40 focus:ring-0 focus:ring-offset-0 data-[state=open]:border-slate-900">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>Todos los estados</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {displayLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </GlobalKpiStrip>

      <div className="max-md:hidden">
        <PageHeader
          title="Contratos"
          subtitle="Control central de acuerdos, renovaciones, fechas de vencimiento y contratos relacionados a clientes o proyectos."
        />
      </div>

      <section className="hidden border-y border-slate-100 bg-white md:block">
        <div className="px-5 py-4">
          <div className="grid grid-cols-4 gap-x-8 gap-y-4">
            <ContractKpi label="Total" value={kpis.total} />
            <ContractKpi label="Activos" value={kpis.active} tone="success" />
            <ContractKpi
              label="Expirados"
              value={kpis.expired}
              tone={contractRiskTone(kpis.expired, 1, 3)}
            />
            <ContractKpi
              label="Pendientes"
              value={kpis.pending}
              tone={contractRiskTone(kpis.pending, 2, 6)}
            />
            <ContractKpi
              label="Borradores"
              value={kpis.draft}
              tone={contractRiskTone(kpis.draft, 3, 8)}
            />
            <ContractKpi label="Firmados" value={kpis.signed} tone="success" />
            <ContractKpi
              label="Por vencer"
              value={kpis.expiringSoon}
              tone={contractRiskTone(kpis.expiringSoon, 1, 4)}
            />
            <ContractKpi label="Facturados" value={kpis.invoiced} tone="success" />
          </div>

          <div className="grid gap-5 pt-5 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border-b border-slate-100 pb-4 xl:border-b-0">
              <div className="text-xs font-normal uppercase text-slate-500">
                Valor contratado total
              </div>
              <div className="mt-2 text-2xl font-normal text-slate-950">
                {formatMoney(kpis.totalValue, currencySettings.baseCurrency)}
              </div>
              <p className="mt-1 text-sm font-normal text-slate-500">
                Valor total de contratos registrados.
              </p>
            </div>
            <ReportList
              title="Clientes con mayor valor contratado"
              items={valueByClient}
              baseCurrency={currencySettings.baseCurrency}
            />
            <ReportList
              title="Proyectos con mayor valor contratado"
              items={valueByProject}
              baseCurrency={currencySettings.baseCurrency}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-slate-100 bg-white shadow-none max-md:border-0 max-md:bg-transparent">
        <div className="border-b border-slate-100 px-4 py-3 max-md:hidden sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {can("contracts.create") && (
                <CrmDetailLineButton
                  className="h-9 border-blue-600 bg-blue-600 px-3 text-white hover:border-blue-700 hover:bg-blue-700 hover:text-white"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={openNewContract}
                >
                  Nuevo contrato
                </CrmDetailLineButton>
              )}
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar contratos..."
                className="h-9 w-72 rounded-none border-0 border-b border-slate-200 bg-white px-0 text-sm font-normal shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <CrmDetailSelectTrigger>
                  <SelectValue placeholder="Estado" />
                </CrmDetailSelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los estados</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {displayLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <CrmDetailSelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </CrmDetailSelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <CrmDetailSelectTrigger>
                  <SelectValue placeholder="Proyecto" />
                </CrmDetailSelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los proyectos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <CrmDetailSelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </CrmDetailSelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos los tipos</SelectItem>
                  {contractTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="max-md:border-0">
          <div className="grid min-w-0 gap-3 overflow-hidden bg-transparent md:hidden">
            {filtered.length ? (
              filtered.map((contract) => {
                const client = contract.client_id ? clientById.get(contract.client_id) : null;
                const project = contract.project_id ? projectById.get(contract.project_id) : null;
                const assigned = contract.assigned_to
                  ? profileById.get(contract.assigned_to)
                  : null;
                return (
                  <article
                    key={contract.id}
                    className="min-w-0 overflow-hidden border-b border-slate-100 bg-white px-4 py-3 text-left transition hover:bg-slate-50/40 active:scale-[0.992]"
                  >
                    <button
                      type="button"
                      onClick={() => openContractDetail(contract)}
                      className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-normal leading-5 tracking-normal text-slate-950">
                          {contract.subject}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-[12.5px] font-normal leading-4 text-slate-500">
                          #{contract.contract_number || "—"} ·{" "}
                          {client?.company_name || "Sin cliente"}
                          {project ? ` · ${project.name}` : ""}
                        </div>
                      </div>
                      <StatusBadge
                        status={contract.status}
                        className="min-h-6 max-w-[92px] shrink-0 truncate rounded-full px-2.5 text-[11px] font-bold"
                      />
                    </button>

                    <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-slate-100 pt-2.5 text-xs font-normal text-slate-500">
                      <span className="min-w-0 flex-1 truncate font-normal text-slate-950">
                        {formatMoney(
                          contract.contract_value,
                          getContractCurrency(contract, currencySettings.baseCurrency),
                        )}
                      </span>
                      <span
                        className={
                          isExpired(contract)
                            ? "min-w-0 flex-1 truncate text-right font-normal text-rose-700"
                            : "min-w-0 flex-1 truncate text-right text-slate-500"
                        }
                      >
                        {formatDate(contract.end_date)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right text-slate-500">
                        {displayLabel(signatureStatus(contract))}
                      </span>
                    </div>

                    <div className="mt-2.5 flex min-w-0 items-center justify-between gap-3 text-[12px] font-normal text-slate-400">
                      <span className="min-w-0 truncate">
                        {contract.contract_type || "Sin tipo"} ·{" "}
                        {assigned?.full_name || assigned?.email || "Sin asignar"}
                      </span>
                      <div
                        className="flex shrink-0 items-center gap-1.5"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <CrmDetailLineButton
                          className="h-8 px-2.5"
                          onClick={() => openContractDetail(contract)}
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </CrmDetailLineButton>
                        {can("contracts.edit") ? (
                          <CrmDetailLineButton
                            className="h-8 px-2.5"
                            onClick={() => openEditContract(contract)}
                            aria-label="Editar contrato"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </CrmDetailLineButton>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="border-y border-dashed border-slate-200 bg-white p-6 text-center text-sm font-normal text-slate-500">
                No hay contratos con estos filtros.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[980px]">
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="min-w-[280px]">Asunto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Asignado</TableHead>
                  <TableHead className="w-40 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((contract) => {
                    const client = contract.client_id ? clientById.get(contract.client_id) : null;
                    const project = contract.project_id
                      ? projectById.get(contract.project_id)
                      : null;
                    const assigned = contract.assigned_to
                      ? profileById.get(contract.assigned_to)
                      : null;
                    return (
                      <TableRow key={contract.id} className="align-middle hover:bg-slate-50">
                        <TableCell className="font-normal text-slate-500">
                          {contract.contract_number || "—"}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openContractDetail(contract)}
                            className="text-left font-normal text-slate-950 hover:text-slate-700"
                          >
                            {contract.subject}
                          </button>
                          <div className="mt-1 line-clamp-1 text-xs font-normal text-slate-500">
                            {contract.description || "Sin descripción"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate">
                            {client?.company_name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[220px] truncate">{project?.name || "—"}</div>
                        </TableCell>
                        <TableCell className="font-normal">
                          {formatMoney(
                            contract.contract_value,
                            getContractCurrency(contract, currencySettings.baseCurrency),
                          )}
                        </TableCell>
                        <TableCell
                          className={isExpired(contract) ? "font-normal text-rose-700" : undefined}
                        >
                          {formatDate(contract.end_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={contract.status} />
                        </TableCell>
                        <TableCell>{contract.invoice_id ? "Vinculada" : "—"}</TableCell>
                        <TableCell>
                          <div className="max-w-[130px] truncate">
                            {assigned?.full_name || assigned?.email || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <CrmDetailLineButton
                              className="h-8 bg-transparent hover:bg-transparent"
                              icon={<Eye className="h-3.5 w-3.5" />}
                              onClick={() => openContractDetail(contract)}
                            >
                              Ver
                            </CrmDetailLineButton>
                            {can("contracts.edit") && (
                              <CrmDetailLineButton
                                className="h-8 bg-transparent hover:bg-transparent"
                                icon={<Pencil className="h-3.5 w-3.5" />}
                                onClick={() => openEditContract(contract)}
                              >
                                Editar
                              </CrmDetailLineButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-slate-500">
                      No hay contratos con estos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <ContractEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contract={editingContract}
        clients={clients}
        projects={projects}
        profiles={profiles}
        onSaved={fetchContracts}
      />
      <ContractDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        contract={selectedContract}
        clients={clientOptions}
        projects={projectOptions}
        profiles={profileOptions}
      />
    </div>
  );
}

function ReportList({
  title,
  items,
  baseCurrency,
}: {
  title: string;
  items: { label: string; value: number }[];
  baseCurrency: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <div className="mb-3 text-xs font-normal uppercase text-slate-500">{title}</div>
      <div className="divide-y divide-slate-100 border-y border-slate-100">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="truncate font-normal text-slate-700">{item.label}</span>
              <span className="font-normal text-slate-950">
                {formatMoney(item.value, baseCurrency)}
              </span>
            </div>
          ))
        ) : (
          <div className="py-2 text-sm font-normal text-slate-500">Sin datos todavía.</div>
        )}
      </div>
    </div>
  );
}
