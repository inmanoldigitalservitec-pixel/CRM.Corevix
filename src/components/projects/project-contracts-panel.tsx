import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = ["Draft", "Active", "Expired", "Cancelled", "Pending Signature"];

type ContractRow = {
  id: string;
  contract_number: number | null;
  subject: string;
  description: string | null;
  status: string;
  contract_type: string;
  contract_value: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectRow = {
  id: string;
  client_id: string | null;
};

type FormState = {
  subject: string;
  status: string;
  contract_type: string;
  contract_value: string;
  start_date: string;
  end_date: string;
  description: string;
};

function emptyForm(): FormState {
  return {
    subject: "",
    status: "Draft",
    contract_type: "Service Agreement",
    contract_value: "",
    start_date: "",
    end_date: "",
    description: "",
  };
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const { can } = usePermissions();
  const db = supabase as any;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());

  const totalValue = useMemo(
    () => contracts.reduce((sum, item) => sum + Number(item.contract_value || 0), 0),
    [contracts],
  );

  const activeCount = useMemo(
    () => contracts.filter((item) => item.status === "Active").length,
    [contracts],
  );

  const loadContracts = async () => {
    if (!profile?.company_id) return;

    setLoading(true);

    const [projectRes, contractRes] = await Promise.all([
      db
        .from("projects")
        .select("id,client_id")
        .eq("id", projectId)
        .eq("company_id", profile.company_id)
        .single(),
      db
        .from("contracts")
        .select("id,contract_number,subject,description,status,contract_type,contract_value,start_date,end_date,created_at,updated_at")
        .eq("company_id", profile.company_id)
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(200),
    ]);

    if (projectRes.error) {
      toast.error(projectRes.error.message || "No se pudo cargar el proyecto.");
      setLoading(false);
      return;
    }

    if (contractRes.error) {
      toast.error(contractRes.error.message || "No se pudieron cargar los contratos.");
      setLoading(false);
      return;
    }

    setProject(projectRes.data || null);
    setContracts(contractRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, profile?.company_id]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveContract = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) return toast.error("No se pudo identificar la compañía.");
    if (!can("contracts.create")) return toast.error("No tienes permiso para crear contratos.");
    if (!form.subject.trim()) return toast.error("El asunto es requerido.");

    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      return toast.error("La fecha final no puede ser anterior a la inicial.");
    }

    const value = form.contract_value.trim()
      ? Number(form.contract_value.replace(/,/g, ""))
      : null;

    if (Number.isNaN(value)) return toast.error("El valor debe ser numérico.");

    setSaving(true);

    const { error } = await db.from("contracts").insert({
      company_id: profile.company_id,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      status: form.status,
      contract_type: form.contract_type.trim() || "Service Agreement",
      contract_value: value,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      project_id: projectId,
      client_id: project?.client_id || null,
      created_by: profile.id || null,
    });

    setSaving(false);

    if (error) return toast.error(error.message || "No se pudo crear el contrato.");

    toast.success("Contrato creado desde el proyecto.");
    setForm(emptyForm());
    setShowForm(false);
    await loadContracts();
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-5 text-sm font-semibold text-slate-500">
        Loading contracts...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Contracts</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{contracts.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Active</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-700">{activeCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs font-bold uppercase text-slate-500">Total Value</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{formatMoney(totalValue)}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900">Project Contracts</h3>
            <p className="text-sm font-medium text-slate-500">
              Agreements linked to this project.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void loadContracts()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {can("contracts.create") && (
              <Button onClick={() => setShowForm((value) => !value)}>
                <Plus className="mr-2 h-4 w-4" />
                New Contract
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <form onSubmit={saveContract} className="mb-4 rounded-xl border bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(event) => setField("subject", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setField("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Input
                  value={form.contract_type}
                  onChange={(event) => setField("contract_type", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(event) => setField("start_date", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(event) => setField("end_date", event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input
                  value={form.contract_value}
                  onChange={(event) => setField("contract_value", event.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Description / Terms</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setField("description", event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Contract"}
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length ? (
                  contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-semibold text-slate-500">
                        {contract.contract_number || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{contract.subject}</div>
                        <div className="line-clamp-1 text-xs text-slate-500">
                          {contract.description || "Sin descripción"}
                        </div>
                      </TableCell>
                      <TableCell>{contract.contract_type || "—"}</TableCell>
                      <TableCell className="font-semibold">
                        {formatMoney(contract.contract_value)}
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
    </div>
  );
}
