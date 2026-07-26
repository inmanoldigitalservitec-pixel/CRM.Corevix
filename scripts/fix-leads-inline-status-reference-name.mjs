import fs from "node:fs";

const file = "src/routes/leads.tsx";
let source = fs.readFileSync(file, "utf8");

source = source
  .replaceAll("qupdatingLeadStatusId", "updatingLeadStatusId")
  .replaceAll("qUpdatingLeadStatusId", "updatingLeadStatusId")
  .replaceAll("updatingLeadStatuId", "updatingLeadStatusId");

if (!source.includes("const [updatingLeadStatusId, setUpdatingLeadStatusId]")) {
  const anchor = `  const [detailOpen, setDetailOpen] = useState(false);`;
  if (!source.includes(anchor)) throw new Error("No se encontró detailOpen para insertar el estado.");
  source = source.replace(
    anchor,
    `${anchor}\n  const [updatingLeadStatusId, setUpdatingLeadStatusId] = useState<string | null>(null);`,
  );
}

fs.writeFileSync(file, source);
console.log("✓ Referencia updatingLeadStatusId normalizada.");
