import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

function fail(message) {
  throw new Error(message);
}

// 1. Remove Oportunidad as a separate tab.
source = source.replace(
  /\n\s*\["opportunity", "Oportunidad", Target\],/,
  "",
);

// 2. Move the complete opportunity panel inside Perfil.
if (source.includes('<TabsContent value="opportunity"')) {
  const opportunityStart = source.indexOf('<TabsContent value="opportunity"');
  const overviewStart = source.indexOf('<TabsContent value="overview"', opportunityStart);
  if (opportunityStart < 0 || overviewStart < 0) fail("No se encontró el bloque Perfil después de Oportunidad.");

  const opportunityBlock = source.slice(opportunityStart, overviewStart);
  const openEnd = opportunityBlock.indexOf(">");
  const closeStart = opportunityBlock.lastIndexOf("</TabsContent>");
  if (openEnd < 0 || closeStart < 0) fail("No se pudo leer el contenido de Oportunidad.");

  const opportunityInner = opportunityBlock.slice(openEnd + 1, closeStart).trim();
  source = source.slice(0, opportunityStart) + source.slice(overviewStart);

  const updatedOverviewStart = source.indexOf('<TabsContent value="overview"');
  const updatedOverviewOpenEnd = source.indexOf(">", updatedOverviewStart);
  if (updatedOverviewStart < 0 || updatedOverviewOpenEnd < 0) fail("No se encontró Perfil.");

  const profileIntro = `
                <div className="grid gap-4 lg:grid-cols-2">
                  <CrmDetailSection title="Información del prospecto" icon={<Users className="h-3.5 w-3.5" />}>
                    <div className="space-y-2">
                      <CrmDetailRow label="Nombre completo" value={getLeadName(selectedLead)} />
                      <CrmDetailRow label="Cargo" value={selectedLead.position || "—"} />
                      <CrmDetailRow label="Departamento" value={selectedLead.department || "—"} />
                      <CrmDetailRow label="Empresa" value={selectedLead.company_name || "—"} />
                      <CrmDetailRow label="Correo" value={selectedLead.email || "—"} />
                      <CrmDetailRow label="Teléfono" value={selectedLead.phone || "—"} />
                      <CrmDetailRow label="WhatsApp" value={selectedLead.whatsapp || "—"} />
                      <CrmDetailRow label="Sitio web" value={selectedLead.website || "—"} />
                    </div>
                  </CrmDetailSection>

                  <CrmDetailSection title="Información comercial" icon={<Target className="h-3.5 w-3.5" />}>
                    <div className="space-y-2">
                      <CrmDetailRow label="Estado" value={getStatusLabel(selectedLead.status)} />
                      <CrmDetailRow label="Fuente" value={getSourceLabel(selectedLead.source)} />
                      <CrmDetailRow label="Canal" value={selectedLead.source_channel || selectedLead.first_touch_channel || "—"} />
                      <CrmDetailRow label="Plataforma" value={selectedLead.source_platform || "—"} />
                      <CrmDetailRow label="Servicio de interés" value={selectedServiceLabel || "—"} />
                      <CrmDetailRow label="Valor estimado" value={formatCurrencyAmount(selectedLead.estimated_value || 0, selectedLead.currency || currencySettings.baseCurrency)} />
                      <CrmDetailRow label="Responsable" value={getAssigneeLabel(selectedLead)} />
                      <CrmDetailRow label="Último contacto" value={formatDate(selectedLead.last_interaction_at || selectedLead.updated_at)} />
                    </div>
                  </CrmDetailSection>

                  <CrmDetailSection title="Ubicación" icon={<FolderOpen className="h-3.5 w-3.5" />}>
                    <div className="space-y-2">
                      <CrmDetailRow label="Dirección" value={selectedLead.address || "—"} />
                      <CrmDetailRow label="Ciudad" value={selectedLead.city || "—"} />
                      <CrmDetailRow label="Estado / provincia" value={selectedLead.state || "—"} />
                      <CrmDetailRow label="País" value={selectedLead.country || "—"} />
                      <CrmDetailRow label="Código postal" value={selectedLead.postal_code || "—"} />
                    </div>
                  </CrmDetailSection>

                  <CrmDetailSection title="Registro y seguimiento" icon={<Calendar className="h-3.5 w-3.5" />}>
                    <div className="space-y-2">
                      <CrmDetailRow label="Creado" value={formatDate(selectedLead.created_at)} />
                      <CrmDetailRow label="Última actualización" value={formatDate(selectedLead.updated_at)} />
                      <CrmDetailRow label="Idioma" value={selectedLead.default_language || "Sistema"} />
                      <CrmDetailRow label="Visibilidad" value={selectedLead.is_public ? "Público" : "Privado"} />
                      <CrmDetailRow label="Etiquetas" value={selectedLead.tags?.length ? selectedLead.tags.join(", ") : "—"} />
                      <CrmDetailRow label="ID externo" value={selectedLead.external_id || "—"} />
                    </div>
                  </CrmDetailSection>
                </div>

                <CrmDetailSection title="Oportunidad comercial" icon={<Target className="h-3.5 w-3.5" />}>
                  <div className="space-y-4">
${opportunityInner}
                  </div>
                </CrmDetailSection>
`;

  source =
    source.slice(0, updatedOverviewOpenEnd + 1) +
    profileIntro +
    source.slice(updatedOverviewOpenEnd + 1);
}

// 3. Remove the old sparse contact block to avoid repeating the same three fields.
source = source.replace(
  /\n\s*<div data-demo="leads-contact">[\s\S]*?<\/div>\n\s*<\/TabsContent>/m,
  "\n              </TabsContent>",
);

// 4. Rename the remaining assignment section so its purpose is clearer.
source = source.replace(
  'title="Asignación"',
  'title="Responsable comercial"',
);

fs.writeFileSync(file, source);
console.log("✓ Perfil completo creado y Oportunidad integrada dentro de Perfil.");
