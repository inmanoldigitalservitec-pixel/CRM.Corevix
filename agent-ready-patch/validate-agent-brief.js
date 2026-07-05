#!/usr/bin/env node

const fs = require("fs");

const file = process.argv[2];

if (!file) {
  console.error("Uso: node validate-agent-brief.js path/to/context.json");
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const data = JSON.parse(raw);

const forbiddenKeys = ["snapshot_base", "generated_plan"];
const warnings = [];
const errors = [];

function walk(obj, path = "") {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }

  for (const key of Object.keys(obj)) {
    const nextPath = path ? `${path}.${key}` : key;

    if (forbiddenKeys.includes(key)) {
      errors.push(`Forbidden key found: ${nextPath}`);
    }

    if (key === "plans") {
      warnings.push(`Key "plans" found at ${nextPath}. Prefer "detected_cases" and "recovery_plans".`);
    }

    walk(obj[key], nextPath);
  }
}

walk(data);

if (!data.detected_cases) errors.push("Missing required key: detected_cases");
if (!data.agent_workspace) errors.push("Missing required key: agent_workspace");
if (!data.recovery_plans) errors.push("Missing required key: recovery_plans");
if (!data.rules) errors.push("Missing required key: rules");

console.log("");
console.log("Agent Brief Validation");
console.log("======================");
console.log("");

if (warnings.length) {
  console.log("Warnings:");
  warnings.forEach(w => console.log(`- ${w}`));
  console.log("");
}

if (errors.length) {
  console.log("Errors:");
  errors.forEach(e => console.log(`- ${e}`));
  console.log("");
  process.exit(1);
}

console.log("OK: JSON looks agent-ready.");
console.log("");
