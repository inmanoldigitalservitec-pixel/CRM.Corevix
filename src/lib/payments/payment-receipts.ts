import { supabase } from "@/integrations/supabase/client";

export const PAYMENT_RECEIPTS_BUCKET = "payment-receipts";
export const PAYMENT_RECEIPT_MAX_BYTES = 3 * 1024 * 1024;
export const PAYMENT_RECEIPT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type PaymentReceipt = {
  id: string;
  payment_id: string;
  invoice_id: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export function formatPaymentReceiptFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeExtension(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function readImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressImage(file: File) {
  const image = await readImage(file);
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la compresión.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY);
  });
  if (!blob) throw new Error("No se pudo comprimir la imagen.");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

export async function preparePaymentReceiptFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Solo se permiten PDF, JPG, PNG o WebP.");
  }

  if (file.type === "application/pdf") {
    if (file.size > PAYMENT_RECEIPT_MAX_BYTES)
      throw new Error("El PDF no puede pesar más de 3 MB.");
    return file;
  }

  const compressed = await compressImage(file);
  const candidate = compressed.size < file.size ? compressed : file;
  if (candidate.size > PAYMENT_RECEIPT_MAX_BYTES) {
    throw new Error("La imagen sigue pesando más de 3 MB después de comprimirla.");
  }
  return candidate;
}

export async function uploadPaymentReceipt(
  file: File,
  context: {
    companyId: string;
    paymentId: string;
    invoiceId?: string | null;
    uploadedBy?: string | null;
    originalName?: string | null;
  },
) {
  const prepared = await preparePaymentReceiptFile(file);
  const ext = safeExtension(prepared);
  const path = `${context.companyId}/${context.paymentId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .upload(path, prepared, {
      cacheControl: "3600",
      upsert: false,
      contentType: prepared.type,
    });
  if (uploadError) throw uploadError;

  const db = supabase as any;
  const { error: insertError } = await db.from("payment_receipts").insert({
    company_id: context.companyId,
    payment_id: context.paymentId,
    invoice_id: context.invoiceId || null,
    file_path: path,
    file_name: context.originalName || file.name,
    mime_type: prepared.type,
    size_bytes: prepared.size,
    uploaded_by: context.uploadedBy || null,
  });
  if (insertError) {
    await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove([path]);
    throw insertError;
  }
}

export async function createPaymentReceiptSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .createSignedUrl(filePath, 60 * 5);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function removePaymentReceiptFile(filePath: string) {
  const { error } = await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove([filePath]);
  if (error) throw error;
}

export async function removePaymentReceiptFiles(filePaths: string[]) {
  const uniquePaths = Array.from(new Set(filePaths.filter(Boolean)));
  if (!uniquePaths.length) return;
  const { error } = await supabase.storage.from(PAYMENT_RECEIPTS_BUCKET).remove(uniquePaths);
  if (error) throw error;
}

export async function deletePaymentReceiptsForPayment(paymentId: string, companyId: string) {
  const db = supabase as any;
  const { data, error } = await db
    .from("payment_receipts")
    .select("id,file_path")
    .eq("company_id", companyId)
    .eq("payment_id", paymentId);
  if (error) throw error;

  const receipts = (data || []) as Array<{ id: string; file_path: string }>;
  if (!receipts.length) return { deletedFiles: 0 };

  await removePaymentReceiptFiles(receipts.map((receipt) => receipt.file_path));

  const { error: deleteError } = await db
    .from("payment_receipts")
    .delete()
    .eq("company_id", companyId)
    .eq("payment_id", paymentId);
  if (deleteError) throw deleteError;

  return { deletedFiles: receipts.length };
}
