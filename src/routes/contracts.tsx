import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Signature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { LoadingTable } from "@/components/crm/loading-state";
import {
  ContractDetailDialog,
  type ContractDetailRow,
} from "@/components/contracts/contract-detail-dialog";
import {
  ContractEditorDialog,
  type ContractEditorRow,
} from "@/components/contracts/contract-editor-dialog";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

function formatMoney(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function ContractsPage() {
  const { profile } = useAuth();
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
        (sum, contract) => sum + Number(contract.contract_value || 0),
        0,
      ),
      invoiced: contracts.filter((contract) => !!contract.invoice_id).length,
    };
  }, [contracts]);

  const valueByClient = useMemo(() => {
    return Array.from(
      contracts.reduce((map, contract) => {
        const key = contract.client_id || "No client";
        map.set(key, (map.get(key) || 0) + Number(contract.contract_value || 0));
        return map;
      }, new Map<string, number>()),
    )
      .map(([clientId, value]) => ({
        label: clientById.get(clientId)?.company_name || "No client",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [contracts, clientById]);

  const valueByProject = useMemo(() => {
    return Array.from(
      contracts.reduce((map, contract) => {
        const key = contract.project_id || "No project";
        map.set(key, (map.get(key) || 0) + Number(contract.contract_value || 0));
        return map;
      }, new Map<string, number>()),
    )
      .map(([projectId, value]) => ({
        label: projectById.get(projectId)?.name || "No project",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [contracts, projectById]);

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
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Contracts"
        subtitle="Control central de acuerdos, renovaciones, fechas de vencimiento y contratos relacionados a clientes o proyectos."
        actionLabel={can("contracts.create") ? "Nuevo contrato" : undefined}
        onAction={can("contracts.create") ? openNewContract : undefined}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Total", value: kpis.total, icon: FileText, tone: "text-slate-600" },
          { label: "Activos", value: kpis.active, icon: CheckCircle2, tone: "text-emerald-600" },
          { label: "Expired", value: kpis.expired, icon: AlertTriangle, tone: "text-rose-600" },
          { label: "Pendientes", value: kpis.pending, icon: Signature, tone: "text-blue-600" },
          { label: "Borradores", value: kpis.draft, icon: Clock3, tone: "text-amber-700" },
          { label: "Firmados", value: kpis.signed, icon: Signature, tone: "text-emerald-700" },
          {
            label: "Expiring",
            value: kpis.expiringSoon,
            icon: AlertTriangle,
            tone: "text-orange-600",
          },
          { label: "Facturados", value: kpis.invoiced, icon: FileText, tone: "text-indigo-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Icon className={`h-4 w-4 ${item.tone}`} />
                {item.label}
              </div>
              <div className="mt-1 text-xl font-extrabold text-slate-950">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Total Contracted Value</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-950">
            {formatMoney(kpis.totalValue)}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Valor total de contratos registrados.
          </p>
        </div>
        <ReportList title="Clientes con mayor valor contratado" items={valueByClient} />
        <ReportList title="Proyectos con mayor valor contratado" items={valueByProject} />
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void fetchContracts()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            {can("contracts.create") && (
              <Button onClick={openNewContract}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo contrato
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="w-full pl-9"
                placeholder="Buscar contratos..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
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

        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead className="min-w-[280px]">Asunto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Firma</TableHead>
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
                      <TableRow key={contract.id} className="align-top hover:bg-slate-50">
                        <TableCell className="font-semibold text-slate-500">
                          {contract.contract_number || "—"}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => openContractDetail(contract)}
                            className="text-left font-semibold text-slate-900 hover:text-blue-700"
                          >
                            {contract.subject}
                          </button>
                          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                            {contract.description || "Sin descripción"}
                          </div>
                        </TableCell>
                        <TableCell>{client?.company_name || "—"}</TableCell>
                        <TableCell>{project?.name || "—"}</TableCell>
                        <TableCell>{contract.contract_type || "—"}</TableCell>
                        <TableCell className="font-semibold">
                          {formatMoney(contract.contract_value)}
                        </TableCell>
                        <TableCell>{formatDate(contract.start_date)}</TableCell>
                        <TableCell
                          className={
                            isExpired(contract) ? "font-semibold text-rose-700" : undefined
                          }
                        >
                          {formatDate(contract.end_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={contract.status} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={signatureStatus(contract)} />
                        </TableCell>
                        <TableCell>{contract.invoice_id ? "Vinculada" : "—"}</TableCell>
                        <TableCell>{assigned?.full_name || assigned?.email || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openContractDetail(contract)}
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              Ver
                            </Button>
                            {can("contracts.edit") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditContract(contract)}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} className="py-10 text-center text-sm text-slate-500">
                      No hay contratos con estos filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

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
}: {
  title: string;
  items: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase text-slate-500">{title}</div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="truncate font-semibold text-slate-700">{item.label}</span>
              <span className="font-extrabold text-slate-950">{formatMoney(item.value)}</span>
            </div>
          ))
        ) : (
          <div className="text-sm font-medium text-slate-500">Sin datos todavía.</div>
        )}
      </div>
    </div>
  );
}
