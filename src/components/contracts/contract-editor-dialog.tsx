import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContractFileDropzone } from "@/components/contracts/contract-detail-dialog";
import { CrmCreationDialog, crmFormStyles } from "@/components/crm/crm-form-shell";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyCurrencySettings } from "@/hooks/use-company-currency";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { uploadContractDocument } from "@/lib/contracts/contract-documents";
import {
  convertToBaseCurrency,
  CURRENCY_OPTIONS,
  getCurrencyInputMode,
  getCurrencyStep,
  normalizeCurrency,
  normalizeCurrencyAmount,
  normalizeCurrencyInput,
} from "@/lib/currency";
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
    currency: "USD",
    start_date: "",
    end_date: "",
    client_id: NONE,
    project_id: NONE,
    assigned_to: NONE,
    signature_status: "Not Signed",
  };
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeInitialValues(initialValues?: Partial<ContractForm>) {
  if (!initialValues) return emptyForm();
  return {
    ...emptyForm(),
    ...initialValues,
    start_date: toDateInputValue(initialValues.start_date),
    end_date: toDateInputValue(initialValues.end_date),
    client_id: initialValues.client_id || NONE,
    project_id: initialValues.project_id || NONE,
    assigned_to: initialValues.assigned_to || NONE,
  };
}

export function ContractEditorDialog({
  open,
  onOpenChange,
  contract,
  clients,
  projects,
  profiles,
  initialValues,
  onSaved,
}: Props) {
  const { profile } = useAuth();
  const { settings: currencySettings } = useCompanyCurrencySettings();
  const { can } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      contract
        ? {
            subject: contract.subject || "",
            description: contract.description || "",
            status: contract.status || "Draft",
            contract_type: contract.contract_type || "Service Agreement",
            contract_value: contract.contract_value == null ? "" : String(contract.contract_value),
            currency: normalizeCurrency(contract.currency || currencySettings.baseCurrency),
            start_date: toDateInputValue(contract.start_date),
            end_date: toDateInputValue(contract.end_date),
            client_id: contract.client_id || NONE,
            project_id: contract.project_id || NONE,
            assigned_to: contract.assigned_to || NONE,
            signature_status: contract.signed_at
              ? "Signed"
              : contract.signature_status || "Not Signed",
          }
        : {
            ...normalizeInitialValues(initialValues),
            currency: normalizeCurrency(initialValues?.currency || currencySettings.baseCurrency),
          },
    );
    setDocumentFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [contract, currencySettings.baseCurrency, initialValues, open]);

  const setField = (key: keyof ContractForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addFiles = (files: FileList | File[]) => {
    setDocumentFiles((current) => {
      const next = [...current];
      Array.from(files).forEach((file) => {
        if (file.type !== "application/pdf") {
          toast.error(`${file.name}: solo se permiten documentos PDF.`);
          return;
        }
        if (!next.some((item) => item.name === file.name && item.size === file.size))
          next.push(file);
      });
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.company_id) return toast.error("No company found.");
    if (!form.subject.trim()) return toast.error("Subject is required.");
    if (form.start_date && form.end_date && form.start_date > form.end_date)
      return toast.error("End date cannot be before start date.");

    const contractCurrency = normalizeCurrency(form.currency || currencySettings.baseCurrency);
    const value = form.contract_value.trim()
      ? normalizeCurrencyAmount(form.contract_value.replace(/,/g, ""), contractCurrency)
      : null;
    if (Number.isNaN(value)) return toast.error("Contract value must be numeric.");
    const baseValue =
      value == null ? null : convertToBaseCurrency(value, contractCurrency, currencySettings);

    const payload = {
      company_id: profile.company_id,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      status: form.status,
      contract_type: form.contract_type.trim() || "Service Agreement",
      contract_value: value,
      currency: contractCurrency,
      base_currency: currencySettings.baseCurrency,
      exchange_rate:
        contractCurrency === currencySettings.baseCurrency ? 1 : currencySettings.usdToDopRate,
      exchange_rate_source: currencySettings.rateSource,
      exchange_rate_updated_at: currencySettings.rateUpdatedAt,
      contract_value_base: baseValue,
      start_date: toDateInputValue(form.start_date) || null,
      end_date: toDateInputValue(form.end_date) || null,
      client_id: form.client_id === NONE ? null : form.client_id,
      project_id: form.project_id === NONE ? null : form.project_id,
      assigned_to: form.assigned_to === NONE ? null : form.assigned_to,
      signature_status: form.signature_status,
      signed_at: form.signature_status === "Signed" ? new Date().toISOString() : null,
      created_by: contract ? contract.created_by : profile.id || null,
    };

    setSaving(true);
    const db = supabase as any;
    try {
      const result = contract
        ? await db
            .from("contracts")
            .update(payload)
            .eq("id", contract.id)
            .eq("company_id", profile.company_id)
            .select("id")
            .single()
        : await db.from("contracts").insert(payload).select("id").single();
      if (result.error) throw result.error;

      const contractId = contract?.id || result.data?.id;
      if (!contractId) throw new Error("No se pudo confirmar el contrato creado.");

      let uploadedCount = 0;
      try {
        for (const file of documentFiles) {
          await uploadContractDocument(file, {
            companyId: profile.company_id,
            contractId,
            uploadedBy: profile.id || null,
          });
          uploadedCount += 1;
        }
      } catch (uploadError: any) {
        toast.error(
          uploadError?.message || "El contrato se guardó, pero no se pudo subir el documento.",
        );
        onOpenChange(false);
        await onSaved();
        return;
      }

      if (uploadedCount > 0) {
        await db.from("contract_activity_events").insert({
          company_id: profile.company_id,
          contract_id: contractId,
          actor_profile_id: profile.id || null,
          action: "document_added",
          detail:
            uploadedCount === 1
              ? `Document added: ${documentFiles[0].name}`
              : `${uploadedCount} documents added`,
          metadata: { source: "contract_editor_dialog" },
        });
      }

      toast.success(
        uploadedCount > 0
          ? "Contrato y documentos guardados."
          : contract
            ? "Contract updated."
            : "Contract created.",
      );
      onOpenChange(false);
      await onSaved();
    } catch (error: any) {
      toast.error(error?.message || "Could not save contract.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = contract ? can("contracts.edit") : can("contracts.create");

  return (
    <CrmCreationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contract ? "Edit Contract" : "New Contract"}
      description="Create or update a client/project contract."
      size="md"
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={crmFormStyles.label}>Subject</Label>
            <Input
              value={form.subject}
              onChange={(event) => setField("subject", event.target.value)}
              className={crmFormStyles.input}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={crmFormStyles.label}>Documentos</Label>
            <ContractFileDropzone
              files={documentFiles}
              inputRef={fileInputRef}
              onAddFiles={addFiles}
              onRemoveFile={(index) =>
                setDocumentFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Status</Label>
            <Select value={form.status} onValueChange={(value) => setField("status", value)}>
              <SelectTrigger className={crmFormStyles.select}>
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
            <Label className={crmFormStyles.label}>Signature</Label>
            <Select
              value={form.signature_status}
              onValueChange={(value) => setField("signature_status", value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Not Signed", "Pending Signature", "Signed", "Declined"].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Type</Label>
            <Input
              value={form.contract_type}
              onChange={(event) => setField("contract_type", event.target.value)}
              className={crmFormStyles.input}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Value</Label>
            <Input
              type="number"
              value={form.contract_value}
              onChange={(event) => setField("contract_value", event.target.value)}
              onBlur={(event) =>
                setField(
                  "contract_value",
                  normalizeCurrencyInput(
                    event.target.value,
                    form.currency || currencySettings.baseCurrency,
                  ),
                )
              }
              step={getCurrencyStep(form.currency || currencySettings.baseCurrency)}
              inputMode={getCurrencyInputMode(form.currency || currencySettings.baseCurrency)}
              className={crmFormStyles.input}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Moneda</Label>
            <Select
              value={form.currency || currencySettings.baseCurrency}
              onValueChange={(value) =>
                setForm((current) => {
                  const nextCurrency = normalizeCurrency(value);
                  return {
                    ...current,
                    currency: nextCurrency,
                    contract_value: normalizeCurrencyInput(current.contract_value, nextCurrency),
                  };
                })
              }
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.symbol} · {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Client</Label>
            <Select value={form.client_id} onValueChange={(value) => setField("client_id", value)}>
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Project</Label>
            <Select
              value={form.project_id}
              onValueChange={(value) => setField("project_id", value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Start Date</Label>
            <Input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={(event) => setField("start_date", event.target.value)}
              className={crmFormStyles.input}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>End Date</Label>
            <Input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={(event) => setField("end_date", event.target.value)}
              className={crmFormStyles.input}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={crmFormStyles.label}>Assigned To</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(value) => setField("assigned_to", value)}
            >
              <SelectTrigger className={crmFormStyles.select}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {profiles.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email || "Staff"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={crmFormStyles.label}>Description / Terms</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              className={crmFormStyles.textarea}
            />
          </div>
        </div>
        <div className={crmFormStyles.footer}>
          <Button
            type="button"
            variant="ghost"
            className={crmFormStyles.cancelButton}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className={crmFormStyles.primaryButton}
            disabled={saving || !canSave}
          >
            {saving ? "Saving..." : "Save Contract"}
          </Button>
        </div>
      </form>
    </CrmCreationDialog>
  );
}
