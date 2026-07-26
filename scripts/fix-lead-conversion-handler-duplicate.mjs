import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

// Remove the const handler inserted by the workspace patch. The route already
// had an async function with the same name, so we keep one canonical handler.
source = source.replace(
  /\n  const handleConvertLeadToClient = async \(\) => \{[\s\S]*?\n  \};\n\n  const canViewAllLeads =/m,
  "\n  const canViewAllLeads =",
);

const existingHandler = /  async function handleConvertLeadToClient\(lead: Lead\) \{[\s\S]*?\n  \}\n\n  function openFollowUpDialog/m;
if (!existingHandler.test(source)) {
  throw new Error("No se encontró el handler original de conversión.");
}

const replacement = `  async function handleConvertLeadToClient(lead: Lead) {
    if (!profile?.company_id) {
      toast.error("No hay contexto de empresa");
      return;
    }
    if (!enforceOwnLeadForSales(lead, "Solo puedes convertir a cliente tus propios prospectos"))
      return;
    if (!can("clients.create")) {
      toast.error("No tienes permiso para convertir a cliente");
      return;
    }

    setConvertingClient(true);
    try {
      const { data, error } = await (supabase as any).rpc("convert_lead_to_client", {
        p_lead_id: lead.id,
        p_existing_client_id: null,
      });
      if (error) throw error;

      const clientId = data?.client_id;
      if (!clientId) throw new Error("La conversión no devolvió el cliente creado");

      toast.success(
        data?.already_converted
          ? "Este prospecto ya estaba convertido"
          : "Prospecto convertido en cliente",
      );
      setConvertReviewOpen(false);
      setDetailOpen(false);
      await fetchLeads();
      void navigate({ to: "/clients", search: { clientId } });
      return data;
    } catch (error: any) {
      toast.error(error?.message || "No se pudo convertir el prospecto");
    } finally {
      setConvertingClient(false);
    }
  }

  function openFollowUpDialog`;

source = source.replace(existingHandler, replacement);

fs.writeFileSync(file, source);
console.log("✓ Handler único de conversión restaurado y conectado al RPC.");
