import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  `  const [detailOpen, setDetailOpen] = useState(false);`,
  `  const [detailOpen, setDetailOpen] = useState(false);\n  const [updatingLeadStatusId, setUpdatingLeadStatusId] = useState<string | null>(null);`,
  "estado de actualización",
);

replaceOnce(
  `  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {`,
  `  const handleInlineStatusChange = async (lead: Lead, nextStatus: string) => {\n    if (nextStatus === lead.status) return;\n    if (!can("leads.edit")) {\n      toast.error("No tienes permiso para cambiar el estado del prospecto");\n      return;\n    }\n    if (!enforceOwnLeadForSales(lead, "Solo puedes modificar tus propios prospectos")) return;\n\n    setUpdatingLeadStatusId(lead.id);\n    try {\n      await update(lead.id, { status: nextStatus });\n      toast.success(\`Estado actualizado a \\${getStatusLabel(nextStatus)}\`);\n      void sendLeadNotification(\n        "Estado de prospecto actualizado",\n        \`\\${getLeadName(lead)} → \\${getStatusLabel(nextStatus)}\`,\n      );\n    } catch (error: any) {\n      toast.error(error?.message || "No se pudo actualizar el estado");\n    } finally {\n      setUpdatingLeadStatusId(null);\n    }\n  };\n\n  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {`,
  "manejador de estado",
);

replaceOnce(
  `                              <div className="flex items-center gap-2">\n                                <span\n                                  className={cn(\n                                    "inline-flex w-max items-center rounded-full px-2 py-0.5 text-[10px] font-medium",\n                                    getStatusTone(lead.status),\n                                  )}\n                                >\n                                  {getStatusLabel(lead.status)}\n                                </span>`,
  `                              <div\n                                className="flex items-center gap-2"\n                                onClick={(event) => event.stopPropagation()}\n                              >\n                                <Select\n                                  value={lead.status}\n                                  onValueChange={(value) => void handleInlineStatusChange(lead, value)}\n                                  disabled={updatingLeadStatusId === lead.id || !can("leads.edit")}\n                                >\n                                  <SelectTrigger\n                                    className={cn(\n                                      "h-7 w-[150px] rounded-md border px-2 text-[11px] font-medium shadow-none focus:ring-0 focus:ring-offset-0",\n                                      getStatusTone(lead.status),\n                                    )}\n                                    aria-label={\`Cambiar estado de \\${getLeadName(lead)}\`}\n                                  >\n                                    <SelectValue>{getStatusLabel(lead.status)}</SelectValue>\n                                  </SelectTrigger>\n                                  <SelectContent>\n                                    {STATUSES.map((status) => (\n                                      <SelectItem key={status} value={status}>\n                                        {getStatusLabel(status)}\n                                      </SelectItem>\n                                    ))}\n                                  </SelectContent>\n                                </Select>`,
  "selector de estado en tabla",
);

fs.writeFileSync(file, source);
console.log("✓ Dropdown de estado agregado a cada fila de prospectos.");
