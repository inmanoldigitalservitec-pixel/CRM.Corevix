#!/usr/bin/env bash

set -euo pipefail

FILE="./src/components/dashboard-v2/dashboard-v2.tsx"
BACKUP_DIR="./agent-ready-patch/backups-fix-react-hooks-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$FILE" ]; then
  echo "ERROR: No existe $FILE"
  exit 1
fi

cp "$FILE" "$BACKUP_DIR/dashboard-v2.tsx.bak"

node <<'NODE'
const fs = require("fs");

const file = "./src/components/dashboard-v2/dashboard-v2.tsx";
let src = fs.readFileSync(file, "utf8");

const neededHooks = ["useState", "useEffect", "useCallback"];

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

const namedReactImport = src.match(/import\s+\{\s*([^}]*?)\s*\}\s+from\s+["']react["'];/);
const defaultReactImport = src.match(/import\s+React\s*,\s*\{\s*([^}]*?)\s*\}\s+from\s+["']react["'];/);
const reactOnlyImport = src.match(/import\s+React\s+from\s+["']react["'];/);
const namespaceReactImport = src.match(/import\s+\*\s+as\s+React\s+from\s+["']react["'];/);

if (defaultReactImport) {
  const imports = unique([
    ...defaultReactImport[1].split(",").map((x) => x.trim()),
    ...neededHooks,
  ]);

  src = src.replace(
    defaultReactImport[0],
    `import React, { ${imports.join(", ")} } from "react";`,
  );
} else if (namedReactImport) {
  const imports = unique([
    ...namedReactImport[1].split(",").map((x) => x.trim()),
    ...neededHooks,
  ]);

  src = src.replace(
    namedReactImport[0],
    `import { ${imports.join(", ")} } from "react";`,
  );
} else if (reactOnlyImport) {
  src = src.replace(
    reactOnlyImport[0],
    `import React, { ${neededHooks.join(", ")} } from "react";`,
  );
} else if (namespaceReactImport) {
  src = src.replace(
    namespaceReactImport[0],
    `import * as React from "react";\nimport { ${neededHooks.join(", ")} } from "react";`,
  );
} else {
  src = `import { ${neededHooks.join(", ")} } from "react";\n${src}`;
}

fs.writeFileSync(file, src);

console.log("OK: React hooks import fixed.");
NODE

echo ""
echo "Verificando imports React:"
grep -n "from \"react\"\|from 'react'" "$FILE" | head -5

echo ""
echo "Backup:"
echo "$BACKUP_DIR/dashboard-v2.tsx.bak"

echo ""
echo "Ahora corre:"
echo "npm run build"
