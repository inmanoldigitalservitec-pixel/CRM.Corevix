import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { CrmDetailLineButton, CrmDetailSummaryGrid } from "@/components/crm/crm-detail-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContractEditorDialog } from "@/components/contracts/contract-editor-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { convertToBaseCurrency, formatCurrencyAmount, normalizeCurrency } from "@/lib/currency";
import { toast } from "sonner";

type ContractRow = {
  id: string;
  contract_number: number | null;
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
  created_at: string;
  updated_at: string;
};
type ProjectRow = { id: string; name: string; client_id: string | null };
type ClientRow = { id: string; company_name: string };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

function formatMoney(value: number | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, currency || "USD");
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

export function ProjectContractsPanel({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { can } = usePermissions();
  const db = supabase as any;
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  const totalValue = useMemo(
    () =>
      contracts.reduce((sum, item) => {
        const storedBase = Number(item.contract_value_base);
        if (Number.isFinite(storedBase) && item.contract_value_base != null) {
          const storedCurrency = normalizeCurrency(
            item.base_currency || currencySettings.baseCurrency,
          );
          return (
            sum +
            (storedCurrency === currencySettings.baseCurrency
              ? storedBase
              : convertToBaseCurrency(storedBase, storedCurrency, currencySettings))
          );
        }
        return (
          sum +
          convertToBaseCurrency(
            Number(item.contract_value || 0),
            item.currency || item.base_currency || currencySettings.baseCurrency,
            currencySettings,
          )
        );
      }, 0),
    [contracts, currencySettings],
  );
  const activeCount = useMemo(
    () => contracts.filter((item) => item.status === "Active").length,
    [contracts],
  );

  const loadContracts = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [projectRes, contractRes, clientsRes, projectsRes, profilesRes] = await Promise.all([
      db
        .from("projects")
        .select("id,name,client_id")
        .eq("id", projectId)
        .eq("company_id", cid)
        .single(),
      db
        .from("contracts")
        .select(
          "id,contract_number,subject,description,status,contract_type,contract_value,currency,base_currency,exchange_rate,exchange_rate_source,exchange_rate_updated_at,contract_value_base,start_date,end_date,created_at,updated_at",
        )
        .eq("company_id", cid)
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(200),
      db
        .from("clients")
        .select("id,company_name")
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
        .select("id,full_name,email")
        .eq("company_id", cid)
        .order("full_name", { ascending: true })
        .limit(1000),
    ]);
    const firstError =
      projectRes.error ||
      contractRes.error ||
      clientsRes.error ||
      projectsRes.error ||
      profilesRes.error;
    if (firstError) {
      toast.error(firstError.message || "No se pudieron cargar los contratos del proyecto.");
      setLoading(false);
      return;
    }
    setProject(projectRes.data || null);
    setContracts(contractRes.data || []);
    setClients(clientsRes.data || []);
    setProjects(projectsRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadContracts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [projectId, profile?.company_id]);

  if (loading)
    return (
      <div className="border-y border-slate-100 py-5 text-sm font-normal text-slate-500">
        Cargando contratos...
      </div>
    );

  return (
    <div className="space-y-4">
      <CrmDetailSummaryGrid
        columns={3}
        className="border-b border-slate-100 pb-4"
        items={[
          { key: "contracts", label: "Contratos", value: contracts.length },
          { key: "active", label: "Activos", value: activeCount },
          {
            key: "total-value",
            label: "Valor total",
            value: formatMoney(totalValue, currencySettings.baseCurrency),
          },
        ]}
      />

      <div className="bg-white">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
              Contratos del proyecto
            </h3>
            <p className="mt-1 text-sm font-normal text-slate-500">
              Acuerdos vinculados a este proyecto.
            </p>
          </div>
          <div className="flex gap-2">
            <CrmDetailLineButton
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void loadContracts()}
            >
              Actualizar
            </CrmDetailLineButton>
            {can("contracts.create") && (
              <CrmDetailLineButton
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setDialogOpen(true)}
              >
                Nuevo contrato
              </CrmDetailLineButton>
            )}
          </div>
        </div>
        <div className="border-y border-slate-100">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length ? (
                  contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-normal text-slate-500">
                        {contract.contract_number || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-normal text-slate-950">{contract.subject}</div>
                        <div className="line-clamp-1 text-xs font-normal text-slate-500">
                          {contract.description || "Sin descripción"}
                        </div>
                      </TableCell>
                      <TableCell>{contract.contract_type || "—"}</TableCell>
                      <TableCell className="font-normal">
                        {formatMoney(
                          contract.contract_value,
                          contract.currency ||
                            contract.base_currency ||
                            currencySettings.baseCurrency,
                        )}
                      </TableCell>
                      <TableCell>{formatDate(contract.start_date)}</TableCell>
                      <TableCell>{formatDate(contract.end_date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={contract.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                      <FileText className="mx-auto mb-2 h-5 w-5" />
                      Este proyecto todavía no tiene contratos.
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
        contract={null}
        clients={clients}
        projects={projects}
        profiles={profiles}
        initialValues={{
          project_id: project?.id || projectId,
          client_id: project?.client_id || "none",
        }}
        onSaved={loadContracts}
      />
    </div>
  );
}
