import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

if (!source.includes("const [updatingLeadStatusId")) {
  const anchor = `  const [detailOpen, setDetailOpen] = useState(false);`;
  if (!source.includes(anchor)) throw new Error("No se encontró detailOpen para insertar el estado.");
  source = source.replace(
    anchor,
    `${anchor}\n  const [updatingLeadStatusId, setUpdatingLeadStatusId] = useState<string | null>(null);`,
  );
}

if (!source.includes("const handleInlineStatusChange")) {
  const anchor = `  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {`;
  if (!source.includes(anchor)) throw new Error("No se encontró handleSubmit para insertar el manejador.");

  const handler = `  const handleInlineStatusChange = async (lead: Lead, nextStatus: string) => {\n    if (nextStatus === lead.status) return;\n    if (!can("leads.edit")) {\n      toast.error("No tienes permiso para cambiar el estado del prospecto");\n      return;\n    }\n    if (!enforceOwnLeadForSales(lead, "Solo puedes modificar tus propios prospectos")) return;\n\n    setUpdatingLeadStatusId(lead.id);\n    try {\n      await update(lead.id, { status: nextStatus });\n      toast.success(\`Estado actualizado a \\${getStatusLabel(nextStatus)}\`);\n      void sendLeadNotification(\n        "Estado de prospecto actualizado",\n        \`\\${getLeadName(lead)} → \\${getStatusLabel(nextStatus)}\`,\n      );\n    } catch (error: any) {\n      toast.error(error?.message || "No se pudo actualizar el estado");\n    } finally {\n      setUpdatingLeadStatusId(null);\n    }\n  };\n\n`;

  source = source.replace(anchor, handler + anchor);
}

fs.writeFileSync(file, source);
console.log("✓ Estado y manejador del dropdown inline restaurados.");
