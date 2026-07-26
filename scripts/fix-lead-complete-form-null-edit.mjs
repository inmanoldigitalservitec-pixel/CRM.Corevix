import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

const replacements = [
  [
    `defaultValue={getInterestLabel(editLead as Lead) || ""}`,
    `defaultValue={editLead ? getInterestLabel(editLead) || "" : ""}`,
  ],
  [
    `defaultValue={editLead?.tags?.join(", ") || getLeadTags(editLead as Lead).join(", ")}`,
    `defaultValue={editLead ? editLead.tags?.join(", ") || getLeadTags(editLead).join(", ") : ""}`,
  ],
];

let changed = false;
for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  if (!source.includes(before)) {
    throw new Error(`No se encontró el patrón esperado: ${before}`);
  }
  source = source.replace(before, after);
  changed = true;
}

fs.writeFileSync(file, source);
console.log(changed ? "✓ Formulario de prospectos corregido para creación sin editLead." : "✓ Corrección ya aplicada.");
