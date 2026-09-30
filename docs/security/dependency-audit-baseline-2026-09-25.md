# Línea base de dependencias y comprobaciones — 2026-09-25

- Repositorio: CRM.Corevix
- Rama: `test/finance-regression-baseline`
- Commit: `51fc9ff3c5fe6bb776a558b7b33ac7d1062372bc`
- Runtime usado: Node.js 25.9.0, npm 11.12.1
- Instalación: `npm ci` completó correctamente.
- Versiones instaladas: Vite 7.3.2, @tanstack/react-start 1.167.39, @supabase/supabase-js 2.106.1, React 19.2.5, TypeScript 5.9.3.

## npm audit

Se ejecutó `npm audit --json`; terminó con código 1 porque encontró avisos de seguridad. Conteo reportado:

- Critical: 1
- High: 104
- Moderate: 43
- Low: 3
- Total en `vulnerabilities`: 151

El informe JSON íntegro está en [npm-audit-2026-09-25.json](./npm-audit-2026-09-25.json). El conteo corresponde a entradas de paquetes vulnerables de npm, no necesariamente a vulnerabilidades independientes.

## Build y lint

- `npm run build`: **correcto** (Vite 7.3.2; 3,247 módulos transformados; 46.76 s).
- `npm run lint`: **falla**. 380 archivos revisados; 9,305 errores y 1,578 advertencias.
  - 9,304 errores son `prettier/prettier` (todos reportados como auto-corregibles).
  - 1,488 advertencias son `@typescript-eslint/no-explicit-any`; también aparecen reglas de React Hooks, React Refresh y otros diagnósticos.
  - El detalle resumido es previo a cualquier arreglo; no se aplicó `--fix`.

## Pruebas

- El `package.json` raíz no define script `test`; por tanto no existe un `npm test` general.
- Hay pruebas de Vitest en `apps/agent-worker`, pero no se ejecutaron: ese subproyecto no tiene dependencias instaladas en `apps/agent-worker/node_modules`.
- Hay pruebas SQL bajo `supabase/tests/database` y el script `db:test` (`supabase test db`); no se ejecutaron como parte de esta línea base.

## Alcance

Esta captura es solo diagnóstico. No se actualizaron dependencias, `package.json` ni `package-lock.json`, y no se corrigieron errores preexistentes. El archivo local `.env` no se incluye en estos artefactos.
