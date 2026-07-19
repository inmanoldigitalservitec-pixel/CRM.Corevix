import { supabase } from "@/integrations/supabase/client";

export const CONTRACT_DOCUMENTS_BUCKET = "contract-documents";
export const CONTRACT_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const CONTRACT_DOCUMENT_ACCEPT = "application/pdf";

const ALLOWED_TYPES = new Set(["application/pdf"]);

export type ContractDocumentRow = {
  id: string;
  contract_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export function formatContractDocumentFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateContractDocumentFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Solo se permiten documentos PDF.");
  if (file.size > CONTRACT_DOCUMENT_MAX_BYTES)
    throw new Error("El PDF no puede pesar más de 5 MB.");
}

export function contractDocumentStoragePath(
  companyId: string,
  contractId: string,
  fileName: string,
) {
  const safeName =
    fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "contract.pdf";
  return `${companyId}/${contractId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

export async function uploadContractDocument(
  file: File,
  context: {
    companyId: string;
    contractId: string;
    uploadedBy?: string | null;
  },
) {
  validateContractDocumentFile(file);
  const path = contractDocumentStoragePath(context.companyId, context.contractId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (uploadError) throw uploadError;

  const db = supabase as any;
  const { error: insertError } = await db.from("contract_documents").insert({
    company_id: context.companyId,
    contract_id: context.contractId,
    file_name: file.name,
    file_url: path,
    file_type: "PDF",
    file_size: file.size,
    uploaded_by: context.uploadedBy || null,
    metadata: {
      storage_bucket: CONTRACT_DOCUMENTS_BUCKET,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type,
    },
  });

  if (insertError) {
    await supabase.storage.from(CONTRACT_DOCUMENTS_BUCKET).remove([path]);
    throw insertError;
  }
}

export async function openContractDocument(
  document: Pick<ContractDocumentRow, "file_url" | "metadata">,
) {
  const url = String(document.file_url || "").trim();
  if (!url) throw new Error("Este documento no tiene archivo asociado.");
  if (/^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const path = String((document.metadata as any)?.storage_path || url);
  const { data, error } = await supabase.storage
    .from(CONTRACT_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("No se pudo abrir el documento.");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
