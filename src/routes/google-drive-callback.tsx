import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/google-drive-callback")({
  component: GoogleDriveCallbackPage,
  head: () => ({ meta: [{ title: "Connecting Google Drive — Corevix CRM" }] }),
});

function GoogleDriveCallbackPage() {
  const [message, setMessage] = useState("Conectando Google Drive...");

  useEffect(() => {
    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    if (!supabaseUrl) {
      setMessage("No se pudo leer la URL de Supabase. Revisa la configuración.");
      return;
    }

    const nextUrl = `${supabaseUrl}/functions/v1/google-drive-callback${window.location.search}${window.location.hash}`;
    window.location.replace(nextUrl);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="text-base font-semibold text-slate-900">Google Drive</div>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
