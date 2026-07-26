import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  `  const [leadFormCurrency, setLeadFormCurrency] = useState<CurrencyCode>(\n    currencySettings.baseCurrency,\n  );`,
  `  const [leadFormCurrency, setLeadFormCurrency] = useState<CurrencyCode>(\n    currencySettings.baseCurrency,\n  );\n  const [leadFormEstimatedValue, setLeadFormEstimatedValue] = useState(\"\");\n  const [leadCatalogProducts, setLeadCatalogProducts] = useState<ProductRow[]>([]);\n  const [leadProductId, setLeadProductId] = useState(\"custom\");\n  const [leadCustomInterest, setLeadCustomInterest] = useState(\"\");`,
  "estados de producto",
);

replaceOnce(
  `  useEffect(() => {\n    if (!dialogOpen) return;\n    setLeadFormCurrency(normalizeCurrency(editLead?.currency || currencySettings.baseCurrency));\n  }, [currencySettings.baseCurrency, dialogOpen, editLead?.currency]);`,
  `  useEffect(() => {\n    if (!dialogOpen) return;\n    const currency = normalizeCurrency(editLead?.currency || currencySettings.baseCurrency);\n    setLeadFormCurrency(currency);\n    setLeadFormEstimatedValue(editLead?.estimated_value != null ? String(normalizeCurrencyAmount(editLead.estimated_value, currency)) : \"\");\n    let cancelled = false;\n    const loadCatalog = async () => {\n      if (!profile?.company_id) return;\n      const { data, error } = await (supabase as any)\n        .from(\"products\")\n        .select(\"id,name,category,base_price,currency,is_active\")\n        .eq(\"company_id\", profile.company_id)\n        .eq(\"is_active\", true)\n        .order(\"name\", { ascending: true });\n      if (cancelled) return;\n      if (error) { toast.error(error.message || \"No se pudo cargar el catálogo\"); return; }\n      setLeadCatalogProducts((data || []) as ProductRow[]);\n      if (!editLead?.id) { setLeadProductId(\"custom\"); setLeadCustomInterest(\"\"); return; }\n      const { data: interest } = await (supabase as any)\n        .from(\"lead_products\")\n        .select(\"product_id,custom_name\")\n        .eq(\"company_id\", profile.company_id)\n        .eq(\"lead_id\", editLead.id)\n        .limit(1)\n        .maybeSingle();\n      if (cancelled) return;\n      setLeadProductId(interest?.product_id ? String(interest.product_id) : \"custom\");\n      setLeadCustomInterest(String(interest?.custom_name || (editLead ? getInterestLabel(editLead) : null) || \"\"));\n    };\n    void loadCatalog();\n    return () => { cancelled = true; };\n  }, [currencySettings.baseCurrency, dialogOpen, editLead?.currency, editLead?.estimated_value, editLead?.id, profile?.company_id]);`,
  "carga del catálogo",
);

source = source.replace(
  `defaultValue={editLead ? getInterestLabel(editLead) || "" : ""}`,
  `value={leadCustomInterest} onChange={(event) => setLeadCustomInterest(event.target.value)}`,
);

source = source.replace(
  `defaultValue={editLead?.estimated_value != null ? String(normalizeCurrencyAmount(editLead.estimated_value, leadFormCurrency)) : ""}`,
  `value={leadFormEstimatedValue} onChange={(event) => setLeadFormEstimatedValue(event.target.value)}`,
);

replaceOnce(
  `      estimated_value: normalizeCurrencyAmount(fd.get("estimated_value"), currency),`,
  `      estimated_value: normalizeCurrencyAmount(leadFormEstimatedValue, currency),`,
  "valor estimado",
);

replaceOnce(
  `        selected_service: String(fd.get("selected_service") || "").trim() || null,`,
  `        selected_service: leadProductId !== "custom"\n          ? leadCatalogProducts.find((item) => item.id === leadProductId)?.name || null\n          : leadCustomInterest.trim() || null,`,
  "servicio seleccionado",
);

replaceOnce(
  `      if (editLead) {\n        await update(editLead.id, data);`,
  `      let savedLead: Lead | null = null;\n      if (editLead) {\n        savedLead = await update(editLead.id, data);`,
  "lead editado",
);

replaceOnce(
  `      } else {\n        await create(data);`,
  `      } else {\n        savedLead = await create(data);`,
  "lead creado",
);

replaceOnce(
  `      setDialogOpen(false);\n      setEditLead(null);`,
  `      const savedLeadId = savedLead?.id || editLead?.id;\n      if (savedLeadId && profile?.company_id) {\n        const db = supabase as any;\n        await db.from("lead_products").delete().eq("company_id", profile.company_id).eq("lead_id", savedLeadId);\n        const selectedProduct = leadCatalogProducts.find((item) => item.id === leadProductId);\n        if (leadProductId !== "custom" || leadCustomInterest.trim()) {\n          const unitPrice = normalizeCurrencyAmount(leadFormEstimatedValue, leadFormCurrency);\n          const { error } = await db.from("lead_products").insert({\n            company_id: profile.company_id,\n            lead_id: savedLeadId,\n            product_id: leadProductId !== "custom" ? leadProductId : null,\n            custom_name: leadProductId === "custom" ? leadCustomInterest.trim() || null : null,\n            quantity: 1,\n            unit_price: Number.isFinite(unitPrice) ? unitPrice : Number(selectedProduct?.base_price || 0),\n            currency: leadFormCurrency,\n            created_by: profile.id || null,\n          });\n          if (error) throw error;\n        }\n      }\n      setDialogOpen(false);\n      setEditLead(null);`,
  "guardar interés",
);

const customField = `<Input name="selected_service" value={leadCustomInterest} onChange={(event) => setLeadCustomInterest(event.target.value)} placeholder="Servicio, producto o necesidad principal" className={crmFormStyles.input} />`;
if (source.includes(customField)) {
  source = source.replace(customField, `<div className="space-y-3">\n                    <Select value={leadProductId} onValueChange={(value) => {\n                      setLeadProductId(value);\n                      if (value === "custom") return;\n                      const product = leadCatalogProducts.find((item) => item.id === value);\n                      if (!product) return;\n                      setLeadFormCurrency(normalizeCurrency(product.currency || currencySettings.baseCurrency));\n                      setLeadFormEstimatedValue(String(product.base_price || 0));\n                      setLeadCustomInterest("");\n                    }}>\n                      <SelectTrigger className={crmFormStyles.select}><SelectValue placeholder="Selecciona un producto del CRM" /></SelectTrigger>\n                      <SelectContent>\n                        {leadCatalogProducts.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {formatCurrencyAmount(product.base_price || 0, product.currency || currencySettings.baseCurrency)}</SelectItem>)}\n                        <SelectItem value="custom">Otro servicio o necesidad personalizada</SelectItem>\n                      </SelectContent>\n                    </Select>\n                    {leadProductId === "custom" ? <Input value={leadCustomInterest} onChange={(event) => setLeadCustomInterest(event.target.value)} placeholder="Describe el servicio o necesidad" className={crmFormStyles.input} /> : null}\n                  </div>`);
}

source = source.replace("Fuente", "¿Cómo llegó?");
source = source.replace("Canal de origen", "Canal");
source = source.replace("Detalle del origen", "Campaña, persona o referencia");

fs.writeFileSync(file, source);
console.log("✓ Catálogo de productos conectado y origen simplificado.");
