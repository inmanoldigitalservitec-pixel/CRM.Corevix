import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContractEditorDialog } from "@/components/contracts/contract-editor-dialog";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ContractRow = { id: string; contract_number: number | null; subject: string; description: string | null; status: string; contract_type: string; contract_value: number | null; start_date: string | null; end_date: string | null; created_at: string; updated_at: string };
type ProjectRow = { id: string; name: string; client_id: string | null };
type ClientRow = { id: string; company_name: string };
type ProfileRow = { id: string; full_name: string | null; email: string | null };

function formatMoney(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try { return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); } catch { return value; }
}

export function ProjectContractsPanel({ projectId }: { projectId: string }) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const db = supabase as any;
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  const totalValue = useMemo(() => contracts.reduce((sum, item) => sum + Number(item.contract_value || 0), 0), [contracts]);
  const activeCount = useMemo(() => contracts.filter((item) => item.status === "Active").length, [contracts]);

  const loadContracts = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const cid = profile.company_id;
    const [projectRes, contractRes, clientsRes, projectsRes, profilesRes] = await Promise.all([
      db.from("projects").select("id,name,client_id").eq("id", projectId).eq("company_id", cid).single(),
      db.from("contracts").select("id,contract_number,subject,description,status,contract_type,contract_value,start_date,end_date,created_at,updated_at").eq("company_id", cid).eq("project_id", projectId).order("updated_at", { ascending: false }).limit(200),
      db.from("clients").select("id,company_name").eq("company_id", cid).order("company_name", { ascending: true }).limit(1000),
      db.from("projects").select("id,name,client_id").eq("company_id", cid).order("updated_at", { ascending: false }).limit(1000),
      db.from("profiles").select("id,full_name,email").eq("company_id", cid).order("full_name", { ascending: true }).limit(1000),
    ]);
    const firstError = projectRes.error || contractRes.error || clientsRes.error || projectsRes.error || profilesRes.error;
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

  useEffect(() => { void loadContracts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId, profile?.company_id]);

  if (loading) return <div className="rounded-xl border bg-white p-5 text-sm font-semibold text-slate-500">Cargando contratos...</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-bold uppercase text-slate-500">Contratos</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{contracts.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-bold uppercase text-slate-500">Activos</div><div className="mt-1 text-2xl font-extrabold text-emerald-700">{activeCount}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-bold uppercase text-slate-500">Valor total</div><div className="mt-1 text-2xl font-extrabold text-slate-900">{formatMoney(totalValue)}</div></div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-extrabold text-slate-900">Contratos del proyecto</h3><p className="text-sm font-medium text-slate-500">Acuerdos vinculados a este proyecto.</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => void loadContracts()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>{can("contracts.create") && <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nuevo contrato</Button>}</div>
        </div>
        <div className="overflow-hidden rounded-xl border"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Asunto</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>{contracts.length ? contracts.map((contract) => <TableRow key={contract.id}><TableCell className="font-semibold text-slate-500">{contract.contract_number || "—"}</TableCell><TableCell><div className="font-semibold text-slate-900">{contract.subject}</div><div className="line-clamp-1 text-xs text-slate-500">{contract.description || "Sin descripción"}</div></TableCell><TableCell>{contract.contract_type || "—"}</TableCell><TableCell className="font-semibold">{formatMoney(contract.contract_value)}</TableCell><TableCell>{formatDate(contract.start_date)}</TableCell><TableCell>{formatDate(contract.end_date)}</TableCell><TableCell><StatusBadge status={contract.status} /></TableCell></TableRow>) : <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2 h-5 w-5" />Este proyecto todavía no tiene contratos.</TableCell></TableRow>}</TableBody></Table></div></div>
      </div>

      <ContractEditorDialog open={dialogOpen} onOpenChange={setDialogOpen} contract={null} clients={clients} projects={projects} profiles={profiles} initialValues={{ project_id: project?.id || projectId, client_id: project?.client_id || "none" }} onSaved={loadContracts} />
    </div>
  );
}
