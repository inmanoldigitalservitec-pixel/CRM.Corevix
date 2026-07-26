import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

// Expand the dialog for the complete form.
replaceOnce(
  `        size="md"`,
  `        size="xl"`,
  "tamaño del creador",
);

// Persist every field introduced by the lead/client compatibility migration.
replaceOnce(
  `      company_name: (fd.get("company_name") as string) || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      source: (fd.get("source") as string) || "Website",
      status: (fd.get("status") as string) || "New",
      estimated_value: normalizeCurrencyAmount(fd.get("estimated_value"), currency),
      currency,
      notes: (fd.get("notes") as string) || null,`,
  `      company_name: String(fd.get("company_name") || "").trim() || null,
      email: String(fd.get("email") || "").trim() || null,
      phone: String(fd.get("phone") || "").trim() || null,
      whatsapp: String(fd.get("whatsapp") || "").trim() || null,
      position: String(fd.get("position") || "").trim() || null,
      department: String(fd.get("department") || "").trim() || null,
      website: String(fd.get("website") || "").trim() || null,
      industry: String(fd.get("industry") || "").trim() || null,
      address: String(fd.get("address") || "").trim() || null,
      city: String(fd.get("city") || "").trim() || null,
      state: String(fd.get("state") || "").trim() || null,
      country: String(fd.get("country") || "").trim() || null,
      postal_code: String(fd.get("postal_code") || "").trim() || null,
      default_language: String(fd.get("default_language") || "").trim() || null,
      tags: String(fd.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_public: String(fd.get("is_public") || "false") === "true",
      assigned_to: String(fd.get("assigned_to") || "").trim() || null,
      source: (fd.get("source") as string) || "Website",
      source_channel: String(fd.get("source_channel") || "").trim() || null,
      source_platform: String(fd.get("source_platform") || "").trim() || null,
      source_detail: String(fd.get("source_detail") || "").trim() || null,
      first_touch_channel: String(fd.get("source_channel") || "").trim() || null,
      last_touch_channel: String(fd.get("source_channel") || "").trim() || null,
      status: (fd.get("status") as string) || "New",
      estimated_value: normalizeCurrencyAmount(fd.get("estimated_value"), currency),
      currency,
      metadata: {
        ...(editLead?.metadata || {}),
        selected_service: String(fd.get("selected_service") || "").trim() || null,
      },
      notes: String(fd.get("notes") || "").trim() || null,`,
  "payload completo",
);

// Replace the previous compact form body with a complete, sectioned form.
const compactStart = `          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={crmFormStyles.label}>Nombre</Label>`;
const footerMarker = `          <div className={crmFormStyles.footer}>`;
const start = source.indexOf(compactStart);
const end = source.indexOf(footerMarker, start);
if (start < 0 || end < 0) throw new Error("No se encontró el formulario compacto de prospectos.");

const completeForm = `          <div className="space-y-7">
            <section className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Información principal</h3>
                <p className="mt-1 text-xs text-slate-500">Datos de la persona y de la empresa que se convertirán en Cliente 360.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Nombre</Label>
                  <Input name="first_name" defaultValue={editLead?.first_name} placeholder="Nombre" className={crmFormStyles.input} required />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Apellido</Label>
                  <Input name="last_name" defaultValue={editLead?.last_name} placeholder="Apellido" className={crmFormStyles.input} required />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Empresa</Label>
                  <Input name="company_name" defaultValue={editLead?.company_name || ""} placeholder="Nombre comercial o razón social" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Industria</Label>
                  <Input name="industry" defaultValue={editLead?.industry || ""} placeholder="Ej. Construcción, legal, comercio" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Cargo</Label>
                  <Input name="position" defaultValue={editLead?.position || ""} placeholder="Cargo del contacto" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Departamento</Label>
                  <Input name="department" defaultValue={editLead?.department || ""} placeholder="Ej. Dirección, compras, marketing" className={crmFormStyles.input} />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Contacto</h3>
                <p className="mt-1 text-xs text-slate-500">Canales disponibles para comunicación y seguimiento.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Email</Label>
                  <Input name="email" type="email" defaultValue={editLead?.email || ""} placeholder="email@empresa.com" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Teléfono</Label>
                  <Input name="phone" defaultValue={editLead?.phone || ""} placeholder="+1 809 555 0000" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>WhatsApp</Label>
                  <Input name="whatsapp" defaultValue={editLead?.whatsapp || ""} placeholder="Número de WhatsApp" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Sitio web</Label>
                  <Input name="website" type="url" defaultValue={editLead?.website || ""} placeholder="https://empresa.com" className={crmFormStyles.input} />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Información comercial</h3>
                <p className="mt-1 text-xs text-slate-500">Origen, interés, valor y responsable del prospecto.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Fuente</Label>
                  <Select name="source" defaultValue={editLead?.source || "Website"}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue placeholder="Selecciona fuente" /></SelectTrigger>
                    <SelectContent>{SOURCES.map((item) => <SelectItem key={item} value={item}>{getSourceLabel(item)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Canal de origen</Label>
                  <Select name="source_channel" defaultValue={editLead?.source_channel || "manual"}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="website">Sitio web</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Llamada</SelectItem>
                      <SelectItem value="social">Redes sociales</SelectItem>
                      <SelectItem value="referral">Referido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Plataforma</Label>
                  <Input name="source_platform" defaultValue={editLead?.source_platform || ""} placeholder="Instagram, Facebook, Google..." className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Detalle del origen</Label>
                  <Input name="source_detail" defaultValue={editLead?.source_detail || ""} placeholder="Campaña, evento o referencia" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Estado</Label>
                  <Select name="status" defaultValue={editLead?.status || "New"}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((item) => <SelectItem key={item} value={item}>{getStatusLabel(item)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Responsable comercial</Label>
                  <Select name="assigned_to" defaultValue={editLead?.assigned_to || "unassigned"}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Sin asignar</SelectItem>
                      {assignableUsers.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label className={crmFormStyles.label}>Servicio o producto de interés</Label>
                  <Input name="selected_service" defaultValue={getInterestLabel(editLead as Lead) || ""} placeholder="Servicio, producto o necesidad principal" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Etiquetas</Label>
                  <Input name="tags" defaultValue={editLead?.tags?.join(", ") || getLeadTags(editLead as Lead).join(", ")} placeholder="VIP, urgente, seguimiento" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Valor estimado</Label>
                  <Input name="estimated_value" type="number" step={getCurrencyStep(leadFormCurrency)} inputMode={getCurrencyInputMode(leadFormCurrency)} defaultValue={editLead?.estimated_value != null ? String(normalizeCurrencyAmount(editLead.estimated_value, leadFormCurrency)) : ""} placeholder="0" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Moneda</Label>
                  <Select name="currency" value={leadFormCurrency} onValueChange={(value) => setLeadFormCurrency(normalizeCurrency(value))}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="DOP">RD$ Peso dominicano</SelectItem><SelectItem value="USD">US$ Dólares</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Ubicación</h3>
                <p className="mt-1 text-xs text-slate-500">Dirección que se transferirá a la cuenta del cliente.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label className={crmFormStyles.label}>Dirección</Label>
                  <Input name="address" defaultValue={editLead?.address || ""} placeholder="Calle, número, sector" className={crmFormStyles.input} />
                </div>
                <div className="space-y-1.5"><Label className={crmFormStyles.label}>Ciudad</Label><Input name="city" defaultValue={editLead?.city || ""} className={crmFormStyles.input} /></div>
                <div className="space-y-1.5"><Label className={crmFormStyles.label}>Estado / provincia</Label><Input name="state" defaultValue={editLead?.state || ""} className={crmFormStyles.input} /></div>
                <div className="space-y-1.5"><Label className={crmFormStyles.label}>País</Label><Input name="country" defaultValue={editLead?.country || ""} className={crmFormStyles.input} /></div>
                <div className="space-y-1.5"><Label className={crmFormStyles.label}>Código postal</Label><Input name="postal_code" defaultValue={editLead?.postal_code || ""} className={crmFormStyles.input} /></div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Preferencias y notas</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Idioma</Label>
                  <Select name="default_language" defaultValue={editLead?.default_language || "es"}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="es">Español</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="fr">Français</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className={crmFormStyles.label}>Visibilidad</Label>
                  <Select name="is_public" defaultValue={editLead?.is_public ? "true" : "false"}>
                    <SelectTrigger className={crmFormStyles.select}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="false">Privado</SelectItem><SelectItem value="true">Público para el equipo</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className={crmFormStyles.label}>Notas</Label>
                <Textarea name="notes" defaultValue={editLead?.notes || ""} placeholder="Contexto, necesidades, acuerdos y observaciones..." rows={5} className={crmFormStyles.textarea} />
              </div>
            </section>
          </div>
`;

source = source.slice(0, start) + completeForm + source.slice(end);

// Avoid passing the sentinel value to the database.
source = source.replace(
  `assigned_to: String(fd.get("assigned_to") || "").trim() || null,`,
  `assigned_to:
        String(fd.get("assigned_to") || "").trim() === "unassigned"
          ? null
          : String(fd.get("assigned_to") || "").trim() || null,`,
);

fs.writeFileSync(file, source);
console.log("✓ Creador y editor de prospectos ampliados con todos los campos del flujo Cliente 360.");
