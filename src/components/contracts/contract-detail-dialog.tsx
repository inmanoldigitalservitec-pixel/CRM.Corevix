import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import {
  Clock3,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CrmDetailLineButton, CrmDetailSummaryGrid } from "@/components/crm/crm-detail-layout";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTRACT_DOCUMENT_ACCEPT,
  formatContractDocumentFileSize,
  openContractDocument,
  uploadContractDocument,
  type ContractDocumentRow,
} from "@/lib/contracts/contract-documents";
import { formatCurrencyAmount, normalizeCurrency } from "@/lib/currency";
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
  signed_at: string | null;
  signature_status?: string | null;
  invoice_id?: string | null;
  created_at: string;
  updated_at: string;
};

type LookupItem = { id: string; label: string };
type StaffItem = { id: string; label: string };

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
    return new Date(value.includes("T") ? value : `${value}T00:00:00`).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric", year: "numeric" },
    );
  } catch {
    return value;
  }
}

function formatMoney(value: number | null | undefined, currency?: string | null) {
  return formatCurrencyAmount(value, normalizeCurrency(currency || "USD"));
}

function signatureStatus(contract: ContractDetailRow) {
  if (contract.signed_at || contract.signature_status === "Signed") return "Signed";
  return contract.signature_status || "Not Signed";
}

export function ContractDetailDialog({
  open,
  onOpenChange,
  contract,
  clients,
  projects,
  profiles,
}: Props) {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const db = supabase as any;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<ContractDocumentRow[]>([]);
  const [activity, setActivity] = useState<ContractActivity[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const clientName = clients.find((item) => item.id === contract?.client_id)?.label || "—";
  const projectName = projects.find((item) => item.id === contract?.project_id)?.label || "—";
  const assignedName = profiles.find((item) => item.id === contract?.assigned_to)?.label || "—";

  const loadDetail = async () => {
    if (!contract?.id || !profile?.company_id) return;
    setLoading(true);
    const [docsRes, activityRes] = await Promise.all([
      db
        .from("contract_documents")
        .select("id,contract_id,file_name,file_url,file_type,file_size,created_at,metadata")
        .eq("company_id", profile.company_id)
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("contract_activity_events")
        .select("id,action,detail,created_at,actor_profile_id")
        .eq("company_id", profile.company_id)
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (docsRes.error)
      toast.error(docsRes.error.message || "No se pudieron cargar los documentos.");
    if (activityRes.error)
      toast.error(activityRes.error.message || "No se pudo cargar la actividad.");
    setDocuments(docsRes.data || []);
    setActivity(activityRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setDocumentFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void loadDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id, profile?.company_id]);

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

  const addDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract?.id || !profile?.company_id) return;
    if (!can("contracts.edit")) return toast.error("No tienes permiso para modificar contratos.");
    if (!documentFiles.length) return toast.error("Selecciona al menos un PDF.");

    setSaving(true);
    let uploadedCount = 0;
    try {
      for (const file of documentFiles) {
        await uploadContractDocument(file, {
          companyId: profile.company_id,
          contractId: contract.id,
          uploadedBy: profile.id || null,
        });
        uploadedCount += 1;
      }

      await db.from("contract_activity_events").insert({
        company_id: profile.company_id,
        contract_id: contract.id,
        actor_profile_id: profile.id || null,
        action: "document_added",
        detail:
          uploadedCount === 1
            ? `Document added: ${documentFiles[0].name}`
            : `${uploadedCount} documents added`,
        metadata: { source: "contract_detail_dialog" },
      });

      toast.success(uploadedCount === 1 ? "Documento subido." : "Documentos subidos.");
      setDocumentFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDetail();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo subir el documento.");
    } finally {
      setSaving(false);
    }
  };

  const openDocument = async (document: ContractDocumentRow) => {
    try {
      await openContractDocument(document);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo abrir el documento.");
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto border-slate-200 bg-white p-0 shadow-none">
        <div className="border-b border-slate-100 bg-white p-5">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-xl font-normal text-slate-950">
              <span>{contract.subject}</span>
              <StatusBadge status={contract.status} />
              <StatusBadge status={signatureStatus(contract)} />
            </DialogTitle>
            <DialogDescription className="font-normal text-slate-500">
              Contract #{contract.contract_number || "—"} · {clientName} · {projectName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs defaultValue="overview" className="p-5 pt-4">
          <TabsList className="mb-4 h-auto rounded-none border-b border-slate-100 bg-white p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent bg-white px-3 py-3 text-sm font-normal text-slate-500 shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent bg-white px-3 py-3 text-sm font-normal text-slate-500 shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
            >
              Documents
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent bg-white px-3 py-3 text-sm font-normal text-slate-500 shadow-none data-[state=active]:border-slate-950 data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
            >
              Activity
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-0 space-y-4">
            <CrmDetailSummaryGrid
              className="border-b border-slate-100 pb-4"
              items={[
                {
                  key: "value",
                  label: "Value",
                  value: formatMoney(
                    contract.contract_value,
                    contract.currency || contract.base_currency,
                  ),
                },
                { key: "type", label: "Type", value: contract.contract_type || "—" },
                { key: "start-date", label: "Start Date", value: formatDate(contract.start_date) },
                { key: "end-date", label: "End Date", value: formatDate(contract.end_date) },
                { key: "client", label: "Client", value: clientName },
                { key: "project", label: "Project", value: projectName },
                { key: "assigned", label: "Assigned", value: assignedName },
                {
                  key: "invoice",
                  label: "Invoice",
                  value: contract.invoice_id ? "Linked" : "Not linked",
                },
              ]}
            />
            <div className="border-b border-slate-100 pb-4">
              <div className="mb-2 text-[11px] font-normal uppercase tracking-wide text-slate-500">
                Description / Terms
              </div>
              <p className="whitespace-pre-wrap text-sm font-normal leading-6 text-slate-500">
                {contract.description || "Sin descripción registrada."}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-0 space-y-4">
            {can("contracts.edit") && (
              <form onSubmit={addDocument} className="border-b border-slate-100 pb-4">
                <ContractFileDropzone
                  files={documentFiles}
                  inputRef={fileInputRef}
                  onAddFiles={addFiles}
                  onRemoveFile={(index) =>
                    setDocumentFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                />
                <div className="mt-3 flex justify-end">
                  <CrmDetailLineButton
                    type="submit"
                    icon={<Plus className="h-4 w-4" />}
                    disabled={saving || !documentFiles.length}
                  >
                    {saving ? "Subiendo..." : "Subir documento"}
                  </CrmDetailLineButton>
                </div>
              </form>
            )}
            <div className="border-y border-slate-100 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 py-3">
                <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                  Documents
                </div>
                <CrmDetailLineButton
                  className="h-8"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => void loadDetail()}
                >
                  Refresh
                </CrmDetailLineButton>
              </div>
              <div className="divide-y divide-slate-100">
                {documents.length ? (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-normal text-slate-950">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{doc.file_name}</span>
                        </div>
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {doc.file_type || "Document"} ·{" "}
                          {doc.file_size
                            ? formatContractDocumentFileSize(Number(doc.file_size))
                            : formatDate(doc.created_at)}
                        </div>
                      </div>
                      <CrmDetailLineButton
                        type="button"
                        className="justify-center"
                        icon={<ExternalLink className="h-4 w-4" />}
                        onClick={() => void openDocument(doc)}
                      >
                        Open
                      </CrmDetailLineButton>
                    </div>
                  ))
                ) : (
                  <EmptyLine
                    icon={<LinkIcon className="h-5 w-5" />}
                    text="No hay documentos todavía."
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="border-y border-slate-100 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 py-3">
                <div className="text-[11px] font-normal uppercase tracking-wide text-slate-500">
                  Activity Timeline
                </div>
                {loading ? (
                  <span className="text-xs font-normal text-slate-500">Loading...</span>
                ) : null}
              </div>
              <div className="divide-y divide-slate-100">
                {activity.length ? (
                  activity.map((event) => (
                    <div key={event.id} className="flex gap-3 p-3">
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-100 bg-white">
                        <Clock3 className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="font-normal text-slate-950">
                          {event.action.replace(/_/g, " ")}
                        </div>
                        <div className="mt-1 text-sm font-normal text-slate-500">
                          {event.detail || "No detail"}
                        </div>
                        <div className="mt-1 text-xs font-normal text-slate-400">
                          {formatDate(event.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyLine
                    icon={<Clock3 className="h-5 w-5" />}
                    text="No hay actividad registrada todavía."
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function ContractFileDropzone({
  files,
  inputRef,
  onAddFiles,
  onRemoveFile,
}: {
  files: File[];
  inputRef: RefObject<HTMLInputElement | null>;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={CONTRACT_DOCUMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) onAddFiles(event.target.files);
        }}
      />
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center border-y border-dashed border-slate-200 bg-white px-4 py-6 text-center transition hover:border-slate-300"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          onAddFiles(event.dataTransfer.files);
        }}
      >
        <Upload className="h-6 w-6 text-slate-500" />
        <span className="mt-2 text-sm font-normal text-slate-950">
          Arrastra PDF aquí o selecciona archivos
        </span>
        <span className="mt-1 text-xs font-normal text-slate-500">
          PDF privado en Supabase Storage. Máximo 5 MB por archivo.
        </span>
      </button>
      {files.length ? (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-normal text-slate-950">{file.name}</div>
                <div className="text-xs font-normal text-slate-500">
                  {formatContractDocumentFileSize(file.size)}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveFile(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm font-normal text-slate-500">
      {icon}
      <span>{text}</span>
    </div>
  );
}
