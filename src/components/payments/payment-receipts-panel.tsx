import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crm/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  createPaymentReceiptSignedUrl,
  formatPaymentReceiptFileSize,
  PAYMENT_RECEIPT_ACCEPT,
  removePaymentReceiptFile,
  type PaymentReceipt,
  uploadPaymentReceipt,
} from "@/lib/payments/payment-receipts";

type PaymentReceiptsPanelProps = {
  paymentId?: string | null;
  invoiceId?: string | null;
  canUpload?: boolean;
  title?: string;
  compact?: boolean;
  refreshKey?: number | string;
};

export function PaymentReceiptsPanel({
  paymentId,
  invoiceId,
  canUpload = false,
  title = "Comprobantes de pago",
  compact = false,
  refreshKey,
}: PaymentReceiptsPanelProps) {
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canAttach = Boolean(canUpload && paymentId && profile?.company_id);

  const loadReceipts = async () => {
    if (!profile?.company_id || (!paymentId && !invoiceId)) {
      setReceipts([]);
      return;
    }
    setLoading(true);
    try {
      const db = supabase as any;
      let query = db
        .from("payment_receipts")
        .select("id,payment_id,invoice_id,file_path,file_name,mime_type,size_bytes,created_at")
        .eq("company_id", profile.company_id);
      if (paymentId) query = query.eq("payment_id", paymentId);
      else if (invoiceId) query = query.eq("invoice_id", invoiceId);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      setReceipts((data || []) as PaymentReceipt[]);
    } catch (error: any) {
      console.error("payment receipts load error:", error);
      toast.error(error?.message || "No se pudieron cargar los comprobantes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReceipts();
  }, [paymentId, invoiceId, profile?.company_id, refreshKey]);

  const uploadReceipt = async (file: File | null) => {
      if (!file || !paymentId || !profile?.company_id) return;
      setUploading(true);
      try {
      await uploadPaymentReceipt(file, {
        companyId: profile.company_id,
        paymentId,
        invoiceId,
        uploadedBy: profile.id || null,
        originalName: file.name,
      });
      toast.success("Comprobante adjuntado.");
      await loadReceipts();
    } catch (error: any) {
      console.error("payment receipt upload error:", error);
      toast.error(error?.message || "No se pudo subir el comprobante.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const openReceipt = async (receipt: PaymentReceipt) => {
    try {
      const signedUrl = await createPaymentReceiptSignedUrl(receipt.file_path);
      if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo abrir el comprobante.");
    }
  };

  const deleteReceipt = async (receipt: PaymentReceipt) => {
    if (!window.confirm("¿Eliminar este comprobante de pago?")) return;
    setDeletingId(receipt.id);
    try {
      await removePaymentReceiptFile(receipt.file_path);
      const db = supabase as any;
      const { error: deleteError } = await db
        .from("payment_receipts")
        .delete()
        .eq("id", receipt.id)
        .eq("company_id", profile?.company_id);
      if (deleteError) throw deleteError;
      toast.success("Comprobante eliminado.");
      await loadReceipts();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar el comprobante.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={compact ? "space-y-3" : "rounded-xl border bg-white p-4 shadow-sm"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-slate-950">{title}</div>
          <div className="text-xs text-muted-foreground">
            PDF, JPG, PNG o WebP. Máximo 3 MB por archivo.
          </div>
        </div>
        {canAttach ? (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept={PAYMENT_RECEIPT_ACCEPT}
              className="hidden"
              onChange={(event) => void uploadReceipt(event.target.files?.[0] || null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? "Subiendo..." : "Adjuntar comprobante"}
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando comprobantes...
        </div>
      ) : receipts.length ? (
        <div className="divide-y rounded-lg border">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 font-medium text-slate-950">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">{receipt.file_name}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {receipt.mime_type === "application/pdf" ? "PDF" : "Imagen"} · {formatPaymentReceiptFileSize(receipt.size_bytes)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void openReceipt(receipt)}>
                  <Download className="mr-2 h-4 w-4" />
                  Abrir
                </Button>
                {canAttach ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void deleteReceipt(receipt)}
                    disabled={deletingId === receipt.id}
                    aria-label="Eliminar comprobante"
                  >
                    {deletingId === receipt.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Paperclip className="h-6 w-6" />}
          title="Sin comprobantes"
          description="Todavía no hay comprobantes adjuntos para este pago."
        />
      )}
    </section>
  );
}
