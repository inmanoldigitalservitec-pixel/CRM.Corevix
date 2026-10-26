# Gauntlet de discrepancias Corevix CRM — 25 oct 2026

## A. Resumen ejecutivo

Se implementaron correcciones locales en los módulos de prospectos/Drive, propuestas, cotizaciones, pagos, facturas, notas de crédito, tareas, impuestos y Team Chat. Se preservaron los cambios previos del sistema de seguimientos comerciales. El 26 oct 2026 se aplicaron las cinco migraciones nuevas al Supabase remoto CorevixBot (`zwgtgegrgwqtfbsvpala`); la simulación oficial solo propuso esas cinco versiones. No se modificó ni reparó el historial anterior.

**Estado general: trabajo local parcial; gates de integración pendientes.** El build de producción pasó y la suite Node pasó 37/37. No fue posible ejecutar pgTAP ni los flujos de UI autenticados: no hay un contenedor local `supabase_db_zwgtgegrgwqtfbsvpala`, y el navegador disponible está en `/login`. `tsc --noEmit` sigue fallando con errores en varios módulos; también fallaba antes de esta ronda. Por las verificaciones críticas que faltan, el Gauntlet no queda aprobado.

## B. Hallazgos por módulo

| # | Problema / causa raíz investigada | Cambios principales | Prueba y resultado | Estado / riesgo residual |
|---|---|---|---|---|
| 1 | Carga de archivos de prospectos: la rama de prospectos pasaba `client: null` al resolver la carpeta y luego intentaba leer `drive_folder_id` como si hubiera cliente. | Separación de persistencia de carpeta de prospecto, manejo de concurrencia, recuperación del ganador, limpieza de carpeta duplicada propia y limpieza del archivo de Drive si falla el registro en DB. Mensajes de error identifican prospecto y detalle de limpieza. | `node --experimental-strip-types --test tests/lead-drive-folder.test.ts`: 4/4. ESLint sin errores. No se pudo probar contra Google Drive real ni UI autenticada. | **Implementado; verificación parcial.** Falta validar permisos/RLS y Drive en entorno autenticado. |
| 2 | Selectores de propuesta: inspección encontró controles Radix controlados y portal estándar; no se pudo reproducir la falla en navegador porque la sesión está en login. | No se hizo un cambio especulativo de z-index. Se conserva el comportamiento Radix existente. | Build aprobado; inspección estática. Sin reproducción manual, teclado ni móvil. | **Pendiente de verificación.** No se declara corregido el reporte de selectores. |
| 3 | Etiquetas visibles de estados de propuestas debían compartir un único mapeo, sin alterar valores persistidos. | Mapeo centralizado en `src/lib/proposals/status.ts`, usado en selector/filtro. | Pruebas unitarias de etiquetas incluidas en la suite 37/37. | **Verificación aprobada en unidad; UI pendiente.** |
| 4 | Handler de fecha leía el valor desde el evento de forma susceptible a perder el `currentTarget` al diferir el callback. | El valor se captura sincrónicamente antes de actualizar estado; se eliminó el handler redundante. | Build y suite 37/37. Sin prueba E2E de crear/editar propuesta. | **Implementado; verificación parcial.** |
| 5 | El selector administrativo permitía retroceder aunque la propuesta estuviera aprobada; proteger solo la aprobación pública no cubría actualizaciones directas. | Validador de estado, opciones no disponibles y trigger DB que bloquea retrocesos/cambio de fecha de aprobación. | 4 pruebas unitarias. Migración aplicada y trigger confirmado en catálogo remoto. Test pgTAP añadido, no ejecutado porque DB local no está disponible. | **Migración aplicada; verificación funcional DB pendiente.** |
| 6 | El detalle de tarea en propuestas no reutilizaba el flujo común de ver/editar/completar. | Se integró `TaskDetailDialog` compartido y se limita edición al permiso existente. | Build aprobado. UI y permisos no se probaron con sesión real. | **Implementado; verificación UI/permisos pendiente.** |
| 7 | Cotizaciones solo resolvían clientes, sin vínculo de prospecto ni trazabilidad en conversión. | Selector contextual prospecto/cliente; validación de entidad y empresa; migración de conversión que reubica cotizaciones y anota `converted_from_lead_id/at`; metadatos también se propagan a facturas preexistentes y nuevas. | Build y pruebas de precios/cotizaciones. Migraciones aplicadas; PgTAP de conversión actualizado, no ejecutado. | **Migración aplicada; verificación DB pendiente.** La actualización idempotente de facturas preexistentes no tiene aún una aserción SQL específica. |
| 8 | El selector de producto base era redundante, aunque el campo histórico aún se consume en datos antiguos. | Se oculta el selector para cotizaciones; `estimate_data.productId` histórico se conserva para compatibilidad. | Build aprobado; no se pudo probar editar cotización existente en UI. | **Implementado; edición visual pendiente.** |
| 9 | El descuento global estaba mezclado con ajustes y cambiar su tipo podía reinterpretar el importe. | Controles de descuento separados de ajustes, confirmación al cambiar tipo, reinicio explícito del valor, límites y redondeo monetario. Se quitó el selector duplicado del encabezado de documentos. | Pruebas de pricing en suite 37/37 y build aprobado. Revisión adversarial estática. No se ejecutaron cálculos en DB ni UI. | **Implementado; verificación financiera integrada pendiente.** |
| 10 | Impuestos equivalentes podían aparecer duplicados por alias/nombre. | Normalización de etiquetas ITBIS y deduplicación de opciones equivalentes por empresa, tipo y tasa, conservando IDs fuente. | Pruebas de tax options en suite 37/37. | **Verificación aprobada en unidad.** No se inspeccionaron ni modificaron registros remotos. |
| 11 | Texto largo del registro relacionado podía forzar el ancho mínimo del selector. | Selector de prospecto/cliente con `min-width: 0`, anchura acotada y truncamiento visual sin cambiar el valor. | Build y ESLint sin errores. Sin prueba visual responsive. | **Implementado; verificación visual pendiente.** |
| 12 | La nota automática de propuesta se mostraba en el resumen y otra vez en notas. | Se quitó el render duplicado del resumen; las notas originales permanecen visibles una vez. | Build aprobado; requiere confirmar con factura real de prueba para validar distintas notas. | **Implementado; verificación de datos/UI pendiente.** |
| 13 | No existía un flujo accesible y seguro para confirmar pagos pendientes. | RPC transaccional `confirm_pending_payment`, con permiso `payments.create`, locks, validación de compañía/estado/saldo, idempotencia y controles de factura; acción en lista y detalle. Adjuntar comprobante no confirma el pago. | RPC aplicada; catálogo remoto confirma `authenticated=true`, `anon=false`. Test pgTAP actualizado, no ejecutado. `tsc` sigue fallando globalmente y reporta desajustes de tipos en módulos de pagos. | **Migración aplicada; no declarar flujo financiero verificado hasta pgTAP/UI.** No se tocaron importes ni pagos reales. |
| 14 | La pestaña de tareas en facturas era visible aunque se pidió retirarla; datos y enlaces deben mantenerse. | Se retiró esa pestaña y sus consultas/modal en el contexto de factura; relaciones y tareas no se borraron. | Build aprobado; sin UI autenticada. | **Implementado; regresión de otras vistas pendiente de UI.** |
| 15 | El formulario permitía seleccionar cliente separado de la factura al crear nota de crédito. | Se ocultó la selección redundante en UI; RPC existente deriva/valida el cliente de la factura y prueba pgTAP ampliada. | Revisión estática y test pgTAP actualizado, no ejecutado. | **Implementado; verificación DB pendiente.** |
| 16 | El chat mostraba un estado de carga global en refrescos posteriores al primer load y podía reconciliar eventos repetidos. | Se preserva contenido ya cargado durante refresh; deduplicación/reconciliación entre mensaje optimista y Realtime. | ESLint sin errores, build (por repetir al cierre). Sin navegador autenticado ni prueba de red/realtime. | **Implementado; comportamiento temporal/realtime pendiente de E2E.** |

## C. Migraciones aplicadas a Supabase remoto

Proyecto `CorevixBot` (`zwgtgegrgwqtfbsvpala`). CLI `supabase 2.108.0`. La simulación `supabase db push --linked --dry-run` listó exactamente estas cinco migraciones; `supabase db push --linked` terminó correctamente el 26 oct 2026:

- `supabase/migrations/20261025234311_estimates_entity_scope_validation.sql`
- `supabase/migrations/20261025234706_confirm_pending_payment.sql`
- `supabase/migrations/20261026000347_estimate_discount_currency_rounding.sql`
- `supabase/migrations/20261026002904_protect_approved_proposal_status.sql`
- `supabase/migrations/20261026010043_preserve_estimate_links_on_lead_conversion.sql`

La lista posterior `supabase migration list --linked` confirmó las cinco versiones aplicadas y alineadas. Consulta de solo lectura al catálogo remoto confirmó los triggers de validación de entidad de cotización y bloqueo de retroceso de propuesta, y las funciones `confirm_pending_payment`, `convert_estimate_to_invoice` y `convert_lead_to_client_unchecked`. `confirm_pending_payment` es ejecutable por `authenticated` pero no por `anon`; el helper de conversión no es ejecutable directamente por ninguno de esos roles. Esto no sustituye pgTAP ni la validación funcional con datos de prueba.

## D. Pruebas ejecutadas

| Comando / comprobación | Resultado |
|---|---|
| Línea base `npm run build` | PASS antes de cambios. |
| `npm run test:pagination && npm run test:client360-estimates` | PASS en línea base. |
| `node --experimental-strip-types --test tests/*.test.ts` | PASS: 37/37, repetido después de cambios. |
| `npm run build` | PASS: `vite build`, 3272 módulos transformados. |
| `git diff --check` | PASS. |
| ESLint para TS/TSX modificados | 0 errores, 286 warnings por `any`. Se ejecutó Prettier en archivos TS/TSX modificados. |
| `npx tsc --noEmit --pretty false` | FAIL: errores de tipos en múltiples módulos. Ya había errores en la línea base; siguen apareciendo en algunos archivos tocados y deben resolverse/verificarse antes de declarar typecheck aprobado. |
| `supabase status --output json` | BLOCKED: Docker no encuentra `supabase_db_zwgtgegrgwqtfbsvpala`. No se reinició ni reseteó ningún stack. |
| `supabase test db` / pgTAP | No ejecutado: falta el contenedor local de DB. |
| UI autenticada | No ejecutada: navegador disponible en `http://localhost:8080/login`. |
| `supabase migration list --linked` antes/después | PASS: inicialmente solo las cinco nuevas estaban pendientes; tras push, las cinco aparecen aplicadas y alineadas. |
| `supabase db push --linked --dry-run` | PASS: listó únicamente las cinco migraciones previstas. |
| `supabase db push --linked` | PASS: las cinco migraciones se aplicaron sin error; hubo notices de `DROP TRIGGER IF EXISTS` esperados. |
| Verificación SQL remota de solo lectura | PASS: historial, triggers y permisos de funciones confirmados en catálogo. |
| Supabase Advisors seguridad/rendimiento | Devuelve hallazgos existentes en otros objetos (incluidos security-definer views/functions y avisos de RLS/performance). No se modificaron en esta tarea ni se atribuyen a estas cinco migraciones. |

## E. Archivos modificados

Archivos existentes modificados:

- `src/components/crm/client-prospect-search-select.tsx`
- `src/components/invoices/invoice-workspace-dialog.tsx`
- `src/components/layout/global-detail-host.tsx`
- `src/components/leads/lead-files-panel.tsx`
- `src/components/payments/payment-workspace-dialog.tsx`
- `src/components/proposals/proposal-workspace-dialog.tsx`
- `src/components/sales/sales-basic-page.tsx`
- `src/components/sales/sales-document-builder.tsx`
- `src/components/sales/sales-document-line-editor.tsx`
- `src/components/tasks/task-detail-dialog.tsx`
- `src/hooks/use-company-taxes.ts`
- `src/hooks/use-internal-chat.ts`
- `src/routes/estimate/public/$publicToken.tsx`
- `src/routes/estimates.tsx`
- `src/routes/invoices.tsx`
- `src/routes/proposals.tsx`
- `supabase/functions/drive-upload-file/index.ts`
- `supabase/tests/database/100_lead_conversion_authorization.test.sql`
- `supabase/tests/database/20_finance_flows_regression.test.sql`
- `supabase/tests/database/50_invoice_credit_note_lifecycle.test.sql`

Archivos nuevos:

- `src/lib/company-tax-options.ts`
- `src/lib/estimate-pricing.ts`
- `src/lib/proposals/status.ts`
- `supabase/functions/_shared/lead-drive-folder.ts`
- Las cinco migraciones enumeradas arriba
- `supabase/tests/database/150_approved_proposal_status_lock.test.sql`
- `tests/company-tax-options.test.ts`
- `tests/estimate-pricing.test.ts`
- `tests/lead-drive-folder.test.ts`
- `tests/proposal-status.test.ts`

## F. Riesgos y limitaciones

- Los cambios de DB aún no se han ejecutado en una base local aislada, por lo que no hay prueba real de triggers, RPCs, permisos ni conciliación financiera.
- Los flujos del navegador, responsividad, tareas y chat no se probaron con sesión autenticada.
- `tsc` sigue fallando; aunque parte del ruido existía antes, debe hacerse una pasada de tipos focalizada en los errores de módulos modificados.
- La deduplicación tributaria se verificó sobre funciones de opciones, no contra los registros actuales de la empresa.
- La integración de Drive se probó con dobles unitarios, no con Google Drive ni RLS real.

## G. Pasos pendientes antes de despliegue

1. Levantar/usar una base local aislada compatible, sin resetear los contenedores existentes, y correr `supabase test db`.
2. Corregir o aislar los errores de TypeScript en los archivos modificados; repetir ESLint.
3. Hacer recorrido autenticado de los formularios, pagos, tareas, cotizaciones, facturas y Team Chat; probar viewport móvil y recuperación de errores.
4. Inspeccionar en una DB de prueba los saldos, trazabilidad de cotización/prospecto, aprobación bloqueada y confirmación idempotente de pago.
5. Las migraciones ya están desplegadas; antes de dar por cerrado el Gauntlet, ejecutar pgTAP y pruebas funcionales autenticadas en un entorno autorizado, sin fixtures destructivos sobre datos reales.

## H. Veredicto

**REJECTED para cierre del Gauntlet por verificaciones esenciales pendientes.** Las cinco migraciones sí están aplicadas y aparecen registradas en remoto; el build y las pruebas unitarias pasan y la revisión adversarial no encontró un defecto crítico estático en las migraciones. Falta pgTAP sobre DB, validación UI autenticada y resolver/verificar el estado TypeScript. No equivale a rechazo de cada cambio ni a aprobación funcional completa.
