import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = ["Draft", "Active", "Expired", "Cancelled", "Pending Signature"];
const NONE = "none";

export type ContractEditorRow = {
  id: string;
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
  created_by: string | null;
  signed_at?: string | null;
  signature_status?: string | null;
  invoice_id?: string | null;
};

type Client = { id: string; company_name: string };
type Project = { id: string; name: string; client_id: string | null };
type Staff = { id: string; full_name: string | null; email: string | null };

type ContractForm = ReturnType<typeof emptyForm>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractEditorRow | null;
  clients: Client[];
  projects: Project[];
  profiles: Staff[];
  initialValues?: Partial<ContractForm>;
  onSaved: () => Promise<void> | void;
};

function emptyForm() {
  return {
    subject: "",
    description: "",
    status: "Draft",
    contract_type: "Service Agreement",
    contract_value: "",
    start_date: "",
    end_date: "",
    client_id: NONE,
    project_id: NONE,
    assigned_to: NONE,
    signature_status: "Not Signed",
  };
}

function normalizeInitialValues(initialValues?: Partial<ContractForm>) {
  if (!initialValues) return emptyForm();
  return {
    ...emptyForm(),
    ...initialValues,
    client_id: initialValues.client_id || NONE,
    project_id: initialValues.project_id || NONE,
    assigned_to: initialValues.assigned_to || NONE,
  };
}

export function ContractEditorDialog({ open, onOpenChange, contract, clients, projects, profiles, initialValues, onSaved }: Props) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(contract ? {
      subject: contract.subject || "",
      description: contract.description || "",
      status: contract.status || "Draft",
      contract_type: contract.contract_type || "Service Agreement",
      contract_value: contract.contract_value == null ? "" : String(contract.contract_value),
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      client_id: contract.client_id || NONE,
      project_id: contract.project_id || NONE,
      assigned_to: contract.assigned_to || NONE,
      signature_status: contract.signed_at ? "Signed" : contract.signature_status || "Not Signed",
    } : normalizeInitialValues(initialValues));
  }, [contract, initialValues, open]);

  const setField = (key: keyof ContractForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No company found.");
    if (!form.subject.trim()) return toast.error("Subject is required.");
    if (form.start_date && form.end_date && form.start_date > form.end_date) return toast.error("End date cannot be before start date.");

    const value = form.contract_value.trim() ? Number(form.contract_value.replace(/,/g, "")) : null;
    if (Number.isNaN(value)) return toast.error("Contract value must be numeric.");

    const payload = {
      company_id: profile.company_id,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      status: form.status,
      contract_type: form.contract_type.trim() || "Service Agreement",
      contract_value: value,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      client_id: form.client_id === NONE ? null : form.client_id,
      project_id: form.project_id === NONE ? null : form.project_id,
      assigned_to: form.assigned_to === NONE ? null : form.assigned_to,
      signature_status: form.signature_status,
      signed_at: form.signature_status === "Signed" ? new Date().toISOString() : null,
      created_by: contract ? contract.created_by : profile.id || null,
    };

    setSaving(true);
    const db = supabase as any;
    const result = contract
      ? await db.from("contracts").update(payload).eq("id", contract.id).eq("company_id", profile.company_id)
      : await db.from("contracts").insert(payload);
    setSaving(false);
    if (result.error) return toast.error(result.error.message || "Could not save contract.");
    toast.success(contract ? "Contract updated." : "Contract created.");
    onOpenChange(false);
    await onSaved();
  };

  const canSave = contract ? can("contracts.edit") : can("contracts.create");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contract ? "Edit Contract" : "New Contract"}</DialogTitle>
          <DialogDescription>Create or update a client/project contract.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Subject</Label><Input value={form.subject} onChange={(event) => setField("subject", event.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Signature</Label><Select value={form.signature_status} onValueChange={(value) => setField("signature_status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Not Signed", "Pending Signature", "Signed", "Declined"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Type</Label><Input value={form.contract_type} onChange={(event) => setField("contract_type", event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Value</Label><Input value={form.contract_value} onChange={(event) => setField("contract_value", event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Client</Label><Select value={form.client_id} onValueChange={(value) => setField("client_id", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>No client</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Project</Label><Select value={form.project_id} onValueChange={(value) => setField("project_id", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>No project</SelectItem>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(event) => setField("start_date", event.target.value)} /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(event) => setField("end_date", event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Assigned To</Label><Select value={form.assigned_to} onValueChange={(value) => setField("assigned_to", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Unassigned</SelectItem>{profiles.map((staff) => <SelectItem key={staff.id} value={staff.id}>{staff.full_name || staff.email || "Staff"}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Description / Terms</Label><Textarea rows={4} value={form.description} onChange={(event) => setField("description", event.target.value)} /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !canSave}>{saving ? "Saving..." : "Save Contract"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
