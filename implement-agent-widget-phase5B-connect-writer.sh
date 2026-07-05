#!/usr/bin/env bash

set -euo pipefail

CONTEXT_FILE="./apps/agent-worker/src/agent-operating-context.ts"
INDEX_FILE="./apps/agent-worker/src/index.ts"
WRITER_FILE="./apps/agent-worker/src/agent-widget-contract.ts"
BACKUP_DIR="./agent-ready-patch/backups-phase5B-connect-widget-writer-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$WRITER_FILE" ]; then
  echo "ERROR: No existe $WRITER_FILE"
  echo "Primero ejecuta Fase 5A."
  exit 1
fi

cp "$CONTEXT_FILE" "$BACKUP_DIR/agent-operating-context.ts.bak"
cp "$INDEX_FILE" "$BACKUP_DIR/index.ts.bak"

echo "=========================================="
echo " Phase 5B: Connecting widget contract writer"
echo "=========================================="
echo ""

node <<'NODE'
const fs = require("fs");

const file = "./apps/agent-worker/src/agent-operating-context.ts";
let src = fs.readFileSync(file, "utf8");

if (!src.includes("writeAgentWidgetContractFromDailyPlans")) {
  src = src.replace(
    "import { listTodayAgentPlans, syncDailyAgentPlans } from './agent-daily-plans';",
    "import { listTodayAgentPlans, syncDailyAgentPlans } from './agent-daily-plans';\nimport { writeAgentWidgetContractFromDailyPlans } from './agent-widget-contract';",
  );
}

const oldBlock = `\tconst { data, error } = await ctx.supabase
\t\t.from('agent_operating_context')
\t\t.upsert(row, { onConflict: 'company_id,user_id,cycle_date' })
\t\t.select('*')
\t\t.single();

\tif (error) {
\t\treturn {
\t\t\tok: false,
\t\t\terror: error.message,
\t\t};
\t}

\treturn {
\t\tok: true,
\t\tmessage: 'Contexto operativo del agente actualizado.',
\t\tdata: {
\t\t\tcycle_date: cycleDate,
\t\t\tcontext: contextJson,
\t\t\trow: data,
\t\t},
\t};`;

const newBlock = `\tconst { data, error } = await ctx.supabase
\t\t.from('agent_operating_context')
\t\t.upsert(row, { onConflict: 'company_id,user_id,cycle_date' })
\t\t.select('*')
\t\t.single();

\tif (error) {
\t\treturn {
\t\t\tok: false,
\t\t\terror: error.message,
\t\t};
\t}

\tlet widgetContractResult: Awaited<ReturnType<typeof writeAgentWidgetContractFromDailyPlans>> | null = null;

\ttry {
\t\twidgetContractResult = await writeAgentWidgetContractFromDailyPlans(ctx.supabase, plans, {
\t\t\tcompanyId: ctx.companyId,
\t\t\tuserId: ctx.userId,
\t\t\tcycleDate,
\t\t\tgeneratedBy: 'agent-worker',
\t\t\tsourceContextId: data?.id || null,
\t\t});
\t} catch (widgetContractError) {
\t\treturn {
\t\t\tok: false,
\t\t\terror:
\t\t\t\twidgetContractError instanceof Error
\t\t\t\t\t? widgetContractError.message
\t\t\t\t\t: 'No se pudo escribir agent_widget_contracts.',
\t\t};
\t}

\treturn {
\t\tok: true,
\t\tmessage: 'Contexto operativo del agente actualizado.',
\t\tdata: {
\t\t\tcycle_date: cycleDate,
\t\t\tcontext: contextJson,
\t\t\trow: data,
\t\t\twidget_contract: {
\t\t\t\tmode: widgetContractResult.mode,
\t\t\t\trow: widgetContractResult.row,
\t\t\t\tsummary: widgetContractResult.contract.summary,
\t\t\t\tstatus: widgetContractResult.contract.status,
\t\t\t},
\t\t},
\t};`;

if (!src.includes(oldBlock)) {
  console.error("ERROR: No encontré el bloque exacto de upsert/return en agent-operating-context.ts.");
  console.error("No se aplicó patch para evitar romper el worker.");
  process.exit(1);
}

src = src.replace(oldBlock, newBlock);

fs.writeFileSync(file, src);

console.log("OK: agent-operating-context.ts conectado a agent_widget_contracts.");
NODE

echo ""
echo "Patch opcional: también conectar /agent/daily-plans/sync si el endpoint sincroniza planes directamente..."

node <<'NODE'
const fs = require("fs");

const file = "./apps/agent-worker/src/index.ts";
let src = fs.readFileSync(file, "utf8");

if (!src.includes("syncDailyAgentPlans")) {
  console.log("SKIP: index.ts no parece usar syncDailyAgentPlans directamente.");
  process.exit(0);
}

if (!src.includes("writeAgentWidgetContractFromDailyPlans")) {
  src = src.replace(
    "import { listTodayAgentPlans, syncDailyAgentPlans } from './agent-daily-plans';",
    "import { listTodayAgentPlans, syncDailyAgentPlans } from './agent-daily-plans';\nimport { writeAgentWidgetContractFromDailyPlans } from './agent-widget-contract';",
  );
}

const handleStart = src.indexOf("async function handleDailyPlanSync");
if (handleStart === -1) {
  console.log("SKIP: No encontré handleDailyPlanSync en index.ts.");
  fs.writeFileSync(file, src);
  process.exit(0);
}

const returnResultPattern = /return jsonResponse\(\{\s*ok:\s*result\.ok,[\s\S]*?\}\);/;
const functionSlice = src.slice(handleStart, handleStart + 5000);

if (!returnResultPattern.test(functionSlice)) {
  console.log("SKIP: No encontré un return jsonResponse({ ok: result.ok ... }) estable para patch automático.");
  fs.writeFileSync(file, src);
  process.exit(0);
}

if (functionSlice.includes("widget_contract")) {
  console.log("SKIP: handleDailyPlanSync ya parece tener widget_contract.");
  fs.writeFileSync(file, src);
  process.exit(0);
}

const patchedFunctionSlice = functionSlice.replace(returnResultPattern, `const widgetContractResult =
\t\tresult.ok && result.data?.plans
\t\t\t? await writeAgentWidgetContractFromDailyPlans(ctx.supabase, result.data.plans, {
\t\t\t\t\tcompanyId: ctx.companyId,
\t\t\t\t\tuserId: ctx.userId,
\t\t\t\t\tcycleDate: result.data.cycle_date || cycleDate,
\t\t\t\t\tgeneratedBy: 'agent-worker',
\t\t\t\t})
\t\t\t: null;

\treturn jsonResponse({
\t\tok: result.ok,
\t\tmessage: result.message,
\t\tdata: result.data
\t\t\t? {
\t\t\t\t\t...result.data,
\t\t\t\t\twidget_contract: widgetContractResult
\t\t\t\t\t\t? {
\t\t\t\t\t\t\t\tmode: widgetContractResult.mode,
\t\t\t\t\t\t\t\trow: widgetContractResult.row,
\t\t\t\t\t\t\t\tsummary: widgetContractResult.contract.summary,
\t\t\t\t\t\t\t\tstatus: widgetContractResult.contract.status,
\t\t\t\t\t\t\t}
\t\t\t\t\t\t: null,
\t\t\t\t}
\t\t\t: null,
\t\terror: result.error,
\t});`);

src = src.slice(0, handleStart) + patchedFunctionSlice + src.slice(handleStart + functionSlice.length);

fs.writeFileSync(file, src);

console.log("OK: index.ts intentó conectar /agent/daily-plans/sync al contrato del widget.");
NODE

echo ""
echo "=========================================="
echo " Validación rápida"
echo "=========================================="

echo ""
echo "1) Imports y llamadas:"
grep -RIn \
  "writeAgentWidgetContractFromDailyPlans\|widget_contract\|agent-widget-contract" \
  "$CONTEXT_FILE" "$INDEX_FILE" || true

echo ""
echo "2) Verificando que agent_operating_context sigue usando syncDailyAgentPlans:"
grep -n "syncDailyAgentPlans\|agent_widget_contracts\|widgetContractResult" "$CONTEXT_FILE" || true

echo ""
echo "3) TypeScript/build recomendado:"
echo "npm run build"

echo ""
echo "Backup:"
echo "$BACKUP_DIR"

echo ""
echo "Para revertir:"
echo "cp $BACKUP_DIR/agent-operating-context.ts.bak $CONTEXT_FILE"
echo "cp $BACKUP_DIR/index.ts.bak $INDEX_FILE"
