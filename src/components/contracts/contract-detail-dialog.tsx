import { useEffect, useState, type FormEvent } from "react";
import { Clock3, ExternalLink, FileText, Link as LinkIcon, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ContractDetailRow = {
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
  assigned_to: string | null;
  signed_at: string | null;
  signature_status?: string | null;
  invoice_id?: string | null;
  created_at: string;
  updated_at: string;
};

type LookupItem = { id: string; label: string };
type StaffItem = { id: string; label: string };

type ContractDocument = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
};

type ContractActivity = {
  id: string;
  action: string;
  detail: string | null;
  created_at: string;
  actor_profile_id: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractDetailRow | null;
  clients: LookupItem[];
  projects: LookupItem[];
  profiles: StaffItem[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value.includes("T") ? value : `${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return value;
  }
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function signatureStatus(contract: ContractDetailRow) {
  if (contract.signed_at || contract.signature_status === "Signed") return "Signed";
  return contract.signature_status || "Not Signed";
}

export function ContractDetailDialog({ open, onOpenChange, contract, clients, projects, profiles }: Props) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const db = supabase as any;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [activity, setActivity] = useState<ContractActivity[]>([]);
  const [docForm, setDocForm] = useState({ file_name: "", file_url: "", file_type: "" });

  const clientName = clients.find((item) => item.id === contract?.client_id)?.label || "—";
  const projectName = projects.find((item) => item.id === contract?.project_id)?.label || "—";
  const assignedName = profiles.find((item) => item.id === contract?.assigned_to)?.label || "—";

  const loadDetail = async () => {
    if (!contract?.id || !profile?.company_id) return;
    setLoading(true);
    const [docsRes, activityRes] = await Promise.all([
      db.from("contract_documents").select("id,file_name,file_url,file_type,file_size,created_at").eq("company_id", profile.company_id).eq("contract_id", contract.id).order("created_at", { ascending: false }).limit(100),
      db.from("contract_activity_events").select("id,action,detail,created_at,actor_profile_id").eq("company_id", profile.company_id).eq("contract_id", contract.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (docsRes.error) toast.error(docsRes.error.message || "No se pudieron cargar los documentos.");
    if (activityRes.error) toast.error(activityRes.error.message || "No se pudo cargar la actividad.");
    setDocuments(docsRes.data || []);
    setActivity(activityRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id, profile?.company_id]);

  const addDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract?.id || !profile?.company_id) return;
    if (!can("contracts.edit")) return toast.error("No tienes permiso para modificar contratos.");
    if (!docForm.file_name.trim()) return toast.error("El nombre del documento es requerido.");
    if (!docForm.file_url.trim()) return toast.error("El link del documento es requerido.");

    setSaving(true);
    const { error } = await db.from("contract_documents").insert({
      company_id: profile.company_id,
      contract_id: contract.id,
      file_name: docForm.file_name.trim(),
      file_url: docForm.file_url.trim(),
      file_type: docForm.file_type.trim() || null,
      uploaded_by: profile.id || null,
    });

    if (!error) {
      await db.from("contract_activity_events").insert({
        company_id: profile.company_id,
        contract_id: contract.id,
        actor_profile_id: profile.id || null,
        action: "document_added",
        detail: `Document added: ${docForm.file_name.trim()}`,
        metadata: { source: "contract_detail_dialog" },
      });
    }

    setSaving(false);
    if (error) return toast.error(error.message || "No se pudo agregar el documento.");
    toast.success("Documento agregado.");
    setDocForm({ file_name: "", file_url: "", file_type: "" });
    await loadDetail();
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <div className="border-b bg-white p-5">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
              <span>{contract.subject}</span>
              <StatusBadge status={contract.status} />
              <StatusBadge status={signatureStatus(contract)} />
            </DialogTitle>
            <DialogDescription>
              Contract #{contract.contract_number || "—"} · {clientName} · {projectName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="overview" className="p-5 pt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Value" value={formatMoney(contract.contract_value)} />
              <InfoCard label="Type" value={contract.contract_type || "—"} />
              <InfoCard label="Start Date" value={formatDate(contract.start_date)} />
              <InfoCard label="End Date" value={formatDate(contract.end_date)} />
              <InfoCard label="Client" value={clientName} />
              <InfoCard label="Project" value={projectName} />
              <InfoCard label="Assigned" value={assignedName} />
              <InfoCard label="Invoice" value={contract.invoice_id ? "Linked" : "Not linked"} />
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="mb-2 text-sm font-extrabold text-slate-900">Description / Terms</div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{contract.description || "Sin descripción registrada."}</p>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0 space-y-4">
            {can("contracts.edit") && (
              <form onSubmit={addDocument} className="rounded-xl border bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_0.7fr]">
                  <div className="space-y-1.5"><Label>Document Name</Label><Input value={docForm.file_name} onChange={(e) => setDocForm((f) => ({ ...f, file_name: e.target.value }))} placeholder="Signed contract PDF" /></div>
                  <div className="space-y-1.5"><Label>Document URL</Label><Input value={docForm.file_url} onChange={(e) => setDocForm((f) => ({ ...f, file_url: e.target.value }))} placeholder="https://..." /></div>
                  <div className="space-y-1.5"><Label>Type</Label><Input value={docForm.file_type} onChange={(e) => setDocForm((f) => ({ ...f, file_type: e.target.value }))} placeholder="PDF" /></div>
                </div>
                <div className="mt-3 flex justify-end"><Button type="submit" disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Add Document"}</Button></div>
              </form>
            )}

            <div className="rounded-xl border bg-white">
              <div className="flex items-center justify-between border-b p-3"><div className="font-extrabold text-slate-900">Documents</div><Button variant="outline" size="sm" onClick={() => void loadDetail()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
              <div className="divide-y">
                {documents.length ? documents.map((doc) => (
                  <div key={doc.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><div className="flex items-center gap-2 font-semibold text-slate-900"><FileText className="h-4 w-4" />{doc.file_name}</div><div className="mt-1 text-xs font-medium text-slate-500">{doc.file_type || "Document"} · {formatDate(doc.created_at)}</div></div>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"><ExternalLink className="mr-2 h-4 w-4" />Open</a>
                  </div>
                )) : <EmptyLine icon={<LinkIcon className="h-5 w-5" />} text="No hay documentos todavía." />}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="rounded-xl border bg-white">
              <div className="flex items-center justify-between border-b p-3"><div className="font-extrabold text-slate-900">Activity Timeline</div>{loading ? <span className="text-xs font-bold text-slate-500">Loading...</span> : null}</div>
              <div className="divide-y">
                {activity.length ? activity.map((event) => (
                  <div key={event.id} className="flex gap-3 p-3">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-slate-50"><Clock3 className="h-4 w-4 text-slate-500" /></div>
                    <div><div className="font-semibold text-slate-900">{event.action.replace(/_/g, " ")}</div><div className="mt-1 text-sm text-slate-600">{event.detail || "No detail"}</div><div className="mt-1 text-xs font-bold text-slate-400">{formatDate(event.created_at)}</div></div>
                  </div>
                )) : <EmptyLine icon={<Clock3 className="h-5 w-5" />} text="No hay actividad registrada todavía." />}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-3"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 truncate text-sm font-extrabold text-slate-900">{value}</div></div>;
}

function EmptyLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm font-semibold text-slate-500">{icon}<span>{text}</span></div>;
}
