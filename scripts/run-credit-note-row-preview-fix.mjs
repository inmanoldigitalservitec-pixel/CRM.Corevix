import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourceFile = "scripts/patch-credit-note-row-preview.mjs";
const fixedFile = "scripts/.patch-credit-note-row-preview.fixed.mjs";

let source = fs.readFileSync(sourceFile, "utf8");

// The original generated patch escaped nested template literals twice,
// which made the patch script itself invalid JavaScript.
source = source
  .replaceAll("\\\\`", "\\`")
  .replaceAll("\\\\${", "\\${");

fs.writeFileSync(fixedFile, source);

try {
  await import(`${pathToFileURL(path.resolve(fixedFile)).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(fixedFile, { force: true });
}
