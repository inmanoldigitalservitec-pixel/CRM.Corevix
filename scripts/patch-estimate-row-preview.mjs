import fs from "node:fs";

const file = "src/routes/estimates.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`No se encontró: ${label}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  `  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);`,
  ` 