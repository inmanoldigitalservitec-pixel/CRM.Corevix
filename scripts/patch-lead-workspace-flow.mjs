import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  `import { createFileRoute } from "@tanstack/react-router";`,
  `import { createFileRoute, useNavigate } from "@tanstack/react-router";`,
  "useNavigate",
);

replaceOnce(
  `  last_interaction_at: string | null;\n}`,
  `  last_interaction_at: string | null;\n  position?: string | null;\n  department?: string | null;\n  website?: string | null;\n  industry?: string | null;\n  address?: string | null;\n  city?: string | null;\n  state?: string | null;\n  country?: string | null;\n  postal_code?: string | null;\n  default_language?: string | null;\n  tags?: string[] | null;\n  is_public?: boolean;\n  converted_client_id?: string | null;\n  converted_contact_id?: string | null;\n  converted_at?: string | null;\n}`,
  "campos compatibles",
);

replaceOnce(
  `  const routeSearch = Route.useSearch();`,
  `  const routeSearch = Route.useSearch();\n  const navigate = useNavigate();`,
  "navigate",
);

replaceOnce(
  `  const [convertingClient, setConvertingClient] = useState(false);`,
  `  const [convertingClient, setConvertingClient] = useState(false);\n  const [convertReviewOpen, setConvertReviewOpen] = useState(false);\n  const [leadProposals, setLeadProposals] = useState<any[]>([]);\n  const [leadTasks, setLeadTasks] = useState<any[]>([]);\n  const [leadReminders, setLeadReminders] = useState<any[]>([]);\n  const [relatedLoading, setRelatedLoading] = useState(false);`,
  "estados workspace",
);

const selectedLeadAnchor = `  const canViewAllLeads = role === "super_admin" || role === "admin" || role === "manager";`;
if (!source.includes("const loadLeadWorkspaceRelations")) {
  replaceOnce(
    selectedLeadAnchor,
    `  const loadLeadWorkspaceRelations = useCallback(async () => {\n    if (!profile?.company_id || !selectedLeadId) {\n      setLeadProposals([]);\n      setLeadTasks([]);\n      setLeadReminders([]);\n      return;\n    }\n    setRelatedLoading(true);\n    try {\n      const [proposalsRes, tasksRes, remindersRes] = await Promise.all([\n        (supabase as any)\n          .from("proposals")\n          .select("id,number,title,status,total,amount,currency,valid_until,public_token,updated_at")\n          .eq("company_id", profile.company_id)\n          .eq("lead_id", selectedLeadId)\n          .order("updated_at", { ascending: false }),\n        (supabase as any)\n          .from("tasks")\n          .select("id,title,status,priority,due_date,assigned_to,updated_at")\n          .eq("company_id", profile.company_id)\n          .eq("related_lead_id", selectedLeadId)\n          .order("due_date", { ascending: true, nullsFirst: false }),\n        (supabase as any)\n          .from("calendar_events")\n          .select("id,title,type,status,start_at,location,updated_at")\n          .eq("company_id", profile.company_id)\n          .eq("related_lead_id", selectedLeadId)\n          .order("start_at", { ascending: true }),\n      ]);\n      if (proposalsRes.error) throw proposalsRes.error;\n      if (tasksRes.error) throw tasksRes.error;\n      if (remindersRes.error) throw remindersRes.error;\n      setLeadProposals(proposalsRes.data || []);\n      setLeadTasks(tasksRes.data || []);\n      setLeadReminders(remindersRes.data || []);\n    } catch (error: any) {\n      toast.error(error?.message || "No se pudo cargar el expediente del prospecto");\n    } finally {\n      setRelatedLoading(false);\n    }\n  }, [profile?.company_id, selectedLeadId]);\n\n  useEffect(() => {\n    if (!detailOpen) return;\n    void loadLeadWorkspaceRelations();\n  }, [detailOpen, loadLeadWorkspaceRelations]);\n\n  const handleConvertLeadToClient = async () => {\n    if (!selectedLead) return;\n    setConvertingClient(true);\n    try {\n      const { data, error } = await (supabase as any).rpc("convert_lead_to_client", {\n        p_lead_id: selectedLead.id,\n        p_existing_client_id: null,\n      });\n      if (error) throw error;\n      const clientId = data?.client_id;\n      if (!clientId) throw new Error("La conversión no devolvió el cliente creado");\n      toast.success(data?.already_converted ? "Este prospecto ya estaba convertido" : "Prospecto convertido en cliente");\n      setConvertReviewOpen(false);\n      setDetailOpen(false);\n      await fetchLeads();\n      void navigate({ to: "/clients", search: { clientId } });\n    } catch (error: any) {\n      toast.error(error?.message || "No se pudo convertir el prospecto");\n    } finally {\n      setConvertingClient(false);\n    }\n  };\n\n${selectedLeadAnchor}`,
    "relaciones y conversión",
  );
}

replaceOnce(
  `                  ["overview", "Resumen", Users],\n                  ["followup", "Seguimiento", Calendar],\n                  ["opportunity", "Oportunidad", Target],\n                  ["notes", "Notas", FileText],\n                  ["activity", "Actividad", Check],`,
  `                  ["overview", "Perfil", Users],\n                  ["opportunity", "Oportunidad", Target],\n                  ["proposals", "Propuestas " + (leadProposals.length || ""), FileText],\n                  ["tasks", "Tareas " + (leadTasks.length || ""), Check],\n                  ["files", "Archivos", FolderOpen],\n                  ["reminders", "Recordatorios " + (leadReminders.length || ""), Calendar],\n                  ["notes", "Notas", FileText],\n                  ["activity", "Actividad", Check],`,
  "pestañas",
);

replaceOnce(
  `                    <CrmDetailActionGrid\n                      actions={[`,
  `                    <CrmDetailActionGrid\n                      actions={[\n                        {\n                          key: "convert-client",\n                          label: selectedLead.converted_client_id ? "Abrir cliente" : "Convertir en cliente",\n                          icon: <Users className="h-4 w-4" />,\n                          onClick: () => {\n                            if (selectedLead.converted_client_id) {\n                              void navigate({ to: "/clients", search: { clientId: selectedLead.converted_client_id } });\n                              return;\n                            }\n                            setConvertReviewOpen(true);\n                          },\n                          disabled: convertingClient,\n                        },`,
  "acción convertir",
);

const notesAnchor = `              <TabsContent value="notes" className="space-y-4 data-[state=inactive]:hidden">`;
if (!source.includes('value="proposals"')) {
  replaceOnce(
    notesAnchor,
    `              <TabsContent value="proposals" className="space-y-4 data-[state=inactive]:hidden">\n                <CrmDetailSection title="Propuestas" icon={<FileText className="h-3.5 w-3.5" />} action={<CrmDetailLineButton onClick={() => setQuickProposalOpen(true)}><Plus className="h-3.5 w-3.5" />Nueva</CrmDetailLineButton>}>\n                  {relatedLoading ? <CrmDetailEmptyState>Cargando propuestas...</CrmDetailEmptyState> : leadProposals.length ? (\n                    <div className="divide-y divide-slate-100 border-y border-slate-100">\n                      {leadProposals.map((proposal) => (\n                        <div key={proposal.id} className="flex items-center justify-between gap-4 py-3">\n                          <div className="min-w-0"><div className="truncate text-sm text-slate-950">{proposal.title}</div><div className="mt-1 text-xs text-slate-500">{proposal.number} · {proposal.status} · {formatCurrencyAmount(proposal.total || proposal.amount || 0, proposal.currency || currencySettings.baseCurrency)}</div></div>\n                          {proposal.public_token ? <Button variant="ghost" size="sm" onClick={() => window.open("/proposal/public/" + proposal.public_token, "_blank", "noopener,noreferrer")}>Abrir</Button> : null}\n                        </div>\n                      ))}\n                    </div>\n                  ) : <CrmDetailEmptyState>No hay propuestas asociadas.</CrmDetailEmptyState>}\n                </CrmDetailSection>\n              </TabsContent>\n\n              <TabsContent value="tasks" className="space-y-4 data-[state=inactive]:hidden">\n                <CrmDetailSection title="Tareas" icon={<Check className="h-3.5 w-3.5" />} action={<CrmDetailLineButton onClick={() => openFollowUpDialog(selectedLead)}><Plus className="h-3.5 w-3.5" />Nueva</CrmDetailLineButton>}>\n                  {relatedLoading ? <CrmDetailEmptyState>Cargando tareas...</CrmDetailEmptyState> : leadTasks.length ? leadTasks.map((task) => <CrmDetailRow key={task.id} label={task.title} value={task.status + " · " + task.priority + " · " + formatDateShort(task.due_date)} />) : <CrmDetailEmptyState>No hay tareas asociadas.</CrmDetailEmptyState>}\n                </CrmDetailSection>\n              </TabsContent>\n\n              <TabsContent value="files" className="space-y-4 data-[state=inactive]:hidden">\n                <CrmDetailSection title="Archivos" icon={<FolderOpen className="h-3.5 w-3.5" />}>\n                  <CrmDetailEmptyState>El expediente documental quedará vinculado aquí. La relación de archivos se habilitará sobre el almacenamiento unificado del CRM.</CrmDetailEmptyState>\n                </CrmDetailSection>\n              </TabsContent>\n\n              <TabsContent value="reminders" className="space-y-4 data-[state=inactive]:hidden">\n                <CrmDetailSection title="Recordatorios" icon={<Calendar className="h-3.5 w-3.5" />} action={<CrmDetailLineButton onClick={() => openFollowUpDialog(selectedLead)}><Plus className="h-3.5 w-3.5" />Nuevo</CrmDetailLineButton>}>\n                  {relatedLoading ? <CrmDetailEmptyState>Cargando recordatorios...</CrmDetailEmptyState> : leadReminders.length ? leadReminders.map((event) => <CrmDetailRow key={event.id} label={event.title} value={event.status + " · " + formatDateShort(event.start_at)} />) : <CrmDetailEmptyState>No hay recordatorios asociados.</CrmDetailEmptyState>}\n                </CrmDetailSection>\n              </TabsContent>\n\n${notesAnchor}`,
    "contenido pestañas",
  );
}

const finalDialogAnchor = `      <AlertDialog open={!!deleteId}`;
if (!source.includes('open={convertReviewOpen}')) {
  replaceOnce(
    finalDialogAnchor,
    `      <Dialog open={convertReviewOpen} onOpenChange={setConvertReviewOpen}>\n        <DialogContent className="max-w-2xl">\n          <DialogHeader>\n            <DialogTitle>Convertir prospecto en cliente</DialogTitle>\n          </DialogHeader>\n          {selectedLead ? (\n            <div className="space-y-5">\n              <div className="grid gap-4 sm:grid-cols-2">\n                <div className="border border-slate-200 p-4"><div className="text-xs uppercase text-slate-500">Empresa</div><div className="mt-1 font-medium text-slate-950">{selectedLead.company_name || getLeadName(selectedLead)}</div><div className="mt-1 text-sm text-slate-500">{selectedLead.website || selectedLead.industry || "Sin datos corporativos adicionales"}</div></div>\n                <div className="border border-slate-200 p-4"><div className="text-xs uppercase text-slate-500">Contacto principal</div><div className="mt-1 font-medium text-slate-950">{getLeadName(selectedLead)}</div><div className="mt-1 text-sm text-slate-500">{selectedLead.email || selectedLead.phone || selectedLead.whatsapp || "Sin contacto"}</div></div>\n              </div>\n              <div className="border-y border-slate-100 py-4">\n                <div className="text-sm font-medium text-slate-950">Se transferirá al Cliente 360</div>\n                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">\n                  <div><div className="text-2xl font-normal">{leadDeals.length}</div><div className="text-xs text-slate-500">Oportunidades</div></div>\n                  <div><div className="text-2xl font-normal">{leadProposals.length}</div><div className="text-xs text-slate-500">Propuestas</div></div>\n                  <div><div className="text-2xl font-normal">{leadTasks.length}</div><div className="text-xs text-slate-500">Tareas</div></div>\n                  <div><div className="text-2xl font-normal">{leadReminders.length}</div><div className="text-xs text-slate-500">Recordatorios</div></div>\n                </div>\n              </div>\n              <div className="flex justify-end gap-2">\n                <Button variant="outline" onClick={() => setConvertReviewOpen(false)}>Cancelar</Button>\n                <Button onClick={() => void handleConvertLeadToClient()} disabled={convertingClient}>{convertingClient ? "Convirtiendo..." : "Convertir y abrir Cliente 360"}</Button>\n              </div>\n            </div>\n          ) : null}\n        </DialogContent>\n      </Dialog>\n\n${finalDialogAnchor}`,
    "diálogo conversión",
  );
}

fs.writeFileSync(file, source);
console.log("✓ Workspace comercial y conversión Prospecto → Cliente aplicados.");
