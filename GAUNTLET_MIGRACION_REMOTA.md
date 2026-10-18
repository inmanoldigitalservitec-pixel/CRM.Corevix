# Gauntlet de reconciliación y migración remota de Supabase

- **Fecha:** 2026-10-18 (AST)
- **Proyecto objetivo:** `CorevixBot`, ref `zwgtgegrgwqtfbsvpala`
- **CLI:** Supabase `2.108.0`
- **Checkout:** `/Volumes/InmaDisk/sites/CRM.Corevix`
**Rama/HEAD:** `test/finance-regression-baseline` / `88d147a55a62dadce2567f95a0f3f786d52b6a92`

## Veredicto

**NO APLICADO.** No ejecuté `migration repair`, `db push`, SQL DDL/DML ni cambios de esquema remotos. La comparación directa del ledger confirma 27 versiones remotas sin archivo con el mismo número en el árbol local; 21 tienen una fuente con slug equivalente pero timestamp distinto, y 6 no tienen fuente con ese slug en las ramas, tags ni commits examinados. La tabla del ledger no contiene los cuerpos SQL, por lo que no pude probar equivalencia exacta. Las instrucciones de la fase D prohíben el push mientras quede una divergencia remota sin explicar.

La ausencia de backup restaurable fue **aceptada como riesgo por el propietario**, según el plan. No la usé como razón para detener el trabajo ni intenté activar PITR. El bloqueo comprobable es la reconciliación incompleta del ledger, no la falta de autorización.

La auditoría funcional local de 29 rutas permanece separada y conserva su veredicto anterior. No se desplegó la UI ni otros servicios.

## Identidad y conexión

- `supabase projects list` identificó `zwgtgegrgwqtfbsvpala` como `CorevixBot`, `ACTIVE_HEALTHY`, región `us-west-2`, PostgreSQL `17.6.1.155`; el proyecto `{DEMO} CorevixBot` (`natogsionihtudsmdpzr`) está inactivo y no se eligió.
- Una invocación de solo lectura al catálogo remoto devolvió `current_database=postgres`, `current_user=postgres`, `server_version=17.6`, dirigida al project ID/ref exacto indicado.
- El propietario ejecutó `supabase migration list --linked` con entrada de contraseña oculta y la CLI conectó a PostgreSQL. La salida confirmó el mismo ledger que el snapshot anterior de Management API. La contraseña no fue recibida por el chat ni escrita en este repositorio.
- La lectura de catálogos mediante el conector Supabase fue API-mediada; no se presenta como sustituto de una conexión `psql` autenticada. El dump directo de esquema está pendiente. Se verificó que el contenedor aislado ya existente puede alcanzar el pooler por su red; el host no tiene `psql`/`pg_dump`. El helper de captura usa ese contenedor existente y no crea/reinicia contenedores: `/private/tmp/corevix-gauntlet-final/capture-direct-remote-schema.sh`. No se ejecutó aún.

## Ledger y clasificación de discrepancias

La salida de `supabase migration list --linked` arroja **99 versiones coincidentes**, **27 remotas sin versión local** y **2 locales sin aplicar en remoto**:

| Versión remota | Fuente histórica en HEAD (archivo eliminado del árbol de trabajo) | SHA-256 de la fuente en HEAD | Estado/evaluación |
|---|---|---|---|
| `20260802211124` | `20260802210912_align_invoices_created_by_profiles.sql` | `965f5d3c997d312163ae4c2b27a4eccb31a40c97e1afe0ad4061e2d44501afdd` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809171233` | `20260809120000_allow_custom_lead_products.sql` | `860694edc2f89e9a7bf87cded4a29f1429edf29d66e29374200b51b0cb0cb115` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809172842` | `20260809172821_allow_custom_deal_products.sql` | `9d5661160c25d7acca7b2e5bcdb0b077c14a6180811e0c5d7f3559c6f7515a96` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809184235` | `20260809181500_fix_public_proposal_approval_created_by.sql` | `840a335e2b5ebfb3c4dc8a782901992ee0bf42ee05c3e4a52aa98b9ee2b733fc` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809190344` | `20260809193000_preserve_proposal_product_on_invoice_items.sql` | `beadc8ec8c04f84d46269c97b1edf1c083b60a5895c7ad190594ec3e5b676cdf` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809195917` | `20260809200000_create_profile_avatars_bucket.sql` | `9436a2e119c21bab8e9bf24aef8ed933ded7ab9b5c6a8256da8ba7f19bc23e66` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809200113` | `20260809201500_allow_users_update_own_profile.sql` | `f645f007d5ede7f4436f2fd2e8202e45057801189d4345101a61d4d9fd53b30c` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809220444` | `20260809210000_separate_email_account_types.sql` | `b21d5710c8bd4b0a0d91ff8dd07177e6c404819e023900149b9f765a167ba3b4` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260809221913` | `20260809220000_shared_email_account_access.sql` | `e03853dda1bb5aaf44d2f0019269a4485b86fa6ca75745388a8a0f5048039766` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260919092857` | `20260919120000_fix_lead_client_account_manager.sql` | `7360d39eef253f072119ed0ea631fb7e4c4f7cfb4ad886a24b140b3e5efa877d` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260919104450` | `20260919120000_lead_files_and_conversion.sql` | `ab83c81a21c4e96db93e16a818a14c0776673e8f7fa870a35f1c6ba4d85a9942` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260919124927` | `20260919120000_calendar_events_related_proposals.sql` | `c17ef8cf41f416cf57c859826cf6d1c990f0c9eb256b65ba3b5c94e885ae4e1c` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260919154940` | `20260919133000_invoice_workspace_collaboration.sql` | `f7fcaefcab886862559deb5c67d3a7aac0dc5a11b686c93e988f6381672dedbc` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260919195245` | `20260919150000_estimate_lead_relation.sql` | `12852a0e86b46ae3a3a1e267fae3d6699a0cb42bc9394caae2266b0094c58924` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260923172025` | `20260923171207_fix_payment_net_balance_status.sql` | `d8519a48012d46ede061f875d27acf0267609f73ba8ba9e337f8961f1c862a8b` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260923174913` | `20260923173850_derive_payment_refund_status_from_movements.sql` | `cf83f8f8a0757d01d2281109927d11356962ec67b89b57e3080e728d938a52fd` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260923190031` | `20260923185239_auto_sync_project_status_from_tasks.sql` | `a917abe33352965afb124a3844075190e1f09f7944572a70d66d261c5e77e759` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260923193136` | `20260923193031_activity_logs_company_select_policy.sql` | `b2d5712e227e8f725e4338c3b749e70fda857931b5ecfe95573a3f1a50babb42` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260923213339` | `20260923212856_fix_lead_client_account_manager_conversion.sql` | `ba78d95813c564f07f017d487fbed06d5752d4f348a78bc2d03f80c4e5b50bc9` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260926210800` | `20260926210304_require_nonempty_project_name.sql` | `5161e9bfe41253a67b161b5ef40e3bfd477023b0e90d6b6ce3f0c9d726d05eb6` | Mismo slug; timestamp distinto; ejecución equivalente no probada |
| `20260927151509` | `20260927145958_align_optional_invoice_line_totals.sql` | `6bfab400acb736fd54c47bf5d6a7c16010d947b201c3a4e635dd4c98e0f0a8f8` | Mismo slug; timestamp distinto; ejecución equivalente no probada |

Seis versiones no tienen fuente Git con el mismo slug en las dos ramas, ocho tags y commits examinados:

| Versión | Slug del ledger | Estado |
|---|---|---|
| `20260919143633` | `enable_rls_and_fix_estimate_invoice_creator` | Fuente SQL desconocida |
| `20260919143827` | `restrict_estimate_invoice_conversion_to_authenticated` | Fuente SQL desconocida |
| `20260919143852` | `remove_public_estimate_invoice_conversion_access` | Fuente SQL desconocida |
| `20260926204430` | `fix_task_activity_delete_cascade` | Fuente SQL desconocida |
| `20260927140114` | `fix_estimate_to_invoice_discount_items` | Fuente SQL desconocida |
| `20260927161629` | `convert_estimate_optional_items_descriptions` | Fuente SQL desconocida |

Las consultas API-mediadas muestran resultados compatibles con varios slugs desconocidos (conversión de estimates usa descuento/líneas opcionales; el RPC de conversión solo permite `authenticated`/`service_role`; la FK de `task_activity_events.task_id` usa `ON DELETE CASCADE`). Esto prueba el estado actual observado, **no** qué SQL exacto ejecutó cada versión. No las marqué equivalentes ni reparadas.

Las dos versiones locales todavía no aplicadas son:

- `20261017230948_fix_projects_company_policy_bypass.sql` — SHA-256 `84fe1756c7de36147e0922d35589f402591869473b27c61c10f103a3465b7034`.
- `20261018182424_remove_product_workflows.sql` — SHA-256 `76962d7bd7f0e9804eecc79106a31c1884640c4b8c387396f3817861f3e368a8`.

La CLI también informó que ignoró cuatro archivos no migratorios en `supabase/migrations/`: dos README `.md` y dos `.zip`. No se borraron ni renombraron.

## Revisión de las dos migraciones candidatas

### Políticas de `projects`

La consulta de catálogo remoto encontró exactamente ocho políticas en `projects`. Las cuatro políticas legacy `projects_select_company`, `projects_insert_company`, `projects_update_company` y `projects_delete_company` eran `PERMISSIVE` y verificaban solo `company_id = get_user_company_id(auth.uid())` para `{authenticated}`. Por la semántica OR de políticas permisivas, ampliaban SELECT/INSERT/UPDATE/DELETE más allá de los controles de rol/manager/assignee. No había una novena política fuera de esas ocho en el snapshot consultado.

La migración elimina esas cuatro y reemplaza las cuatro políticas `projects_*`: SELECT requiere miembro y compañía actual, con permisos por rol o manager/assignee; INSERT limita admin/manager o ventas/colaborador con manager propio; UPDATE aplica la guarda en USING y WITH CHECK; DELETE limita super_admin/admin/manager. **Crítica independiente: APROBADA CONDICIONADA** para este propósito. El crítico advirtió que no debe desplegarse aislada: la RPC remota SECURITY DEFINER mantiene acceso `anon`; la migración de workflows debe revocarlo en el mismo conjunto.

### Retiro de workflows y RPC

Estado remoto observado en consultas SELECT: `product_workflows=0`, `product_workflow_steps=0`, `tasks.source_workflow_step_id` existe pero **0 tareas vinculadas**, `tasks=207`, `projects=6`. La relación de tareas con workflows es una FK `ON DELETE SET NULL`; las tablas de pasos dependen de workflows/productos/compañía por FK. El código fuente activo no consume estas tablas; las referencias restantes son migrations históricas y pruebas.

La migración candidata falla en vez de borrar si encuentra filas de workflows, pasos o tareas vinculadas; elimina la FK, la columna y las dos tablas sin `CASCADE`, y reemplaza `create_project_from_paid_invoice`. El cuerpo actual remoto es `SECURITY DEFINER`, `search_path=public,extensions`, y su ACL incluye `anon=X`; el cuerpo actual crea tareas desde workflows. La versión candidata conserva el proyecto idempotente desde factura pagada, mantiene enlaces comerciales, informa `tasks_created=0` y revoca el acceso a `PUBLIC`/`anon`, conservando `authenticated` y `service_role`.

**Crítica independiente: APROBADA CONDICIONES** para preservar los datos e intención. Las condiciones son aplicar el arreglo RLS y la revocación/cambio de RPC como conjunto, y verificar luego ACL (`anon` sin EXECUTE), esquema y conteos. La segunda migración no debe desplegarse por separado de la primera debido al bypass live.

### pgTAP local

Se usó exclusivamente el contenedor aislado que ya existía; no se creó, eliminó ni reinició ningún contenedor.

- `supabase/tests/database/110_projects_rls_regression.test.sql`: al primer intento, la fixture falló antes de las aserciones porque esta DB aislada no tiene trigger `auth.users → profiles`. Un constructor distinto añadió cinco perfiles sintéticos explícitos; no cambió las 22 aserciones. La suite pasó **22/22** y terminó en `ROLLBACK`. Un crítico fresco aprobó la corrección del fixture.
- `supabase/tests/database/120_product_workflow_retirement.test.sql`: pasó **14/14** en el estado aislado existente y terminó en `ROLLBACK`. Cubre ausencia de tablas/columna, integración factura→proyecto, enlaces, idempotencia, cero tareas automáticas y privilegios `anon`/`authenticated`/`service_role`.
- Estas ejecuciones validan el estado de la base local aislada existente; **no** son una reconstrucción completa del esquema remoto ni reemplazan las verificaciones directas posteriores al despliegue.

## Simulación, aplicación y verificación posterior

- Se revisó `supabase db push --help`; la CLI 2.108.0 ofrece `--dry-run` y `--password`.
- **No ejecuté el dry-run**: el plan lo condiciona a una reconciliación sin versiones remotas inexplicadas. Persisten las 27 divergencias descritas arriba, incluidas seis sin fuente Git.
- **No ejecuté `db push` ni SQL manual equivalente.** Tampoco ejecuté `migration repair`; la evidencia disponible no demuestra equivalencia del SQL remoto para las versiones discordantes.
- No hubo escrituras remotas ni fixtures remotas. Los conteos y ACL citados se obtuvieron mediante consultas de solo lectura.
- El plan autoriza aceptar la falta de backup, por lo que se registra como riesgo del propietario y no como bloqueo. No se ha producido un backup ni se intentó habilitar PITR.

## Checkout y cierre

- Rama y HEAD permanecen `test/finance-regression-baseline` / `88d147a55a62dadce2567f95a0f3f786d52b6a92`.
- Se conservaron los cambios previos del usuario. El estado inicial de esta ronda está en `/private/tmp/corevix-gauntlet-final/migration-initial-git-status.txt`; no se hizo reset, checkout, stash, limpieza ni restauración.
- Cambios atribuibles a esta fase: ajuste de fixture en `supabase/tests/database/110_projects_rls_regression.test.sql` y este informe. Las migraciones candidatas ya estaban en el checkout sin seguimiento al comenzar; no se editó su SQL.
- La UI no se desplegó. El resultado de auditoría integral de las 29 rutas no cambia.

**Cierre: NO APLICADO por conflicto de reconciliación del ledger.** Próximo paso: obtener fuente/evidencia verificable para las 27 entradas (especialmente los seis slugs desconocidos), completar la reconstrucción y el dry-run condicionado; si las dos migraciones candidatas son el único conjunto pendiente, aplicarlas en orden y verificar la revocación de `anon`, RLS y conteos de datos en el remoto.

## Continuación solicitada — 2026-10-18

El propietario autorizó explícitamente aplicar únicamente las dos migraciones candidatas indicadas arriba, aceptó continuar sin respaldo y ordenó conservar intactas las versiones históricas remotas. Esta instrucción reemplaza el bloqueo histórico del cierre anterior; no se repitió la auditoría/reconstrucción de esas 27 versiones.

### Comprobaciones de esta continuación (actualizado)

- **Identidad aprobada:** `supabase/.temp/project-ref` contiene `zwgtgegrgwqtfbsvpala`; CLI instalada `2.108.0`. `supabase projects list` no se repitió; la consulta actual de proyectos de Supabase identifica ese ref como `CorevixBot`, `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.155`. El proyecto inactivo `{DEMO} CorevixBot` tiene otro ref y no se seleccionó.
- **Ledger remoto de solo lectura:** el listado de migraciones de Supabase devuelve las dos versiones candidatas como ausentes. No se detectó ni se modificó ninguna versión histórica. La lista confirma que las otras tres migraciones locales no rastreadas (20260930201521, 20261011210445 y 20261011212758) ya aparecen aplicadas en remoto; no son pendientes.
- **Ayuda CLI:** `supabase db push --help` confirma `--dry-run`, `--linked`, `--password/-p` e `--include-all`. `--include-all` no se consideró porque no hace falta para las dos versiones y el simulacro aún no se ejecutó.
- **Contraseña:** el registro de la continuación previa documenta que el propietario consiguió autenticarse con contraseña oculta mediante `supabase migration list --linked`. La contraseña no está presente en las variables de entorno de esta sesión; no se mostró ni guardó ningún secreto.
- **Conexión PostgreSQL:** `supabase migration list --linked --password ''` conectó a PostgreSQL remoto y devolvió el ledger. No se imprimió ni registró ningún secreto; el CLI tenía acceso de autenticación en esta sesión.
- **Pendientes actuales:** la salida de CLI mostró exactamente dos versiones Local sin Remote: `20261017230948` y `20261018182424`, correspondientes a los dos archivos autorizados. Las tres locales adicionales `20260930201521`, `20261011210445` y `20261011212758` aparecen coincidentes en local/remoto y no están pendientes.
- **Simulación normal:** se ejecutó `supabase db push --linked --dry-run --password ''`. La CLI conectó, pero no llegó a enumerar el plan: terminó con el error `Remote migration versions not found in local migrations directory.` y recomendó `supabase migration repair --status reverted` para 27 versiones históricas, además de `supabase db pull`. No se ejecutó ninguna de esas recomendaciones.
- **Simulación con include-all:** se ejecutó `supabase db push --linked --dry-run --include-all --password ''`; devolvió el mismo error exacto `Remote migration versions not found in local migrations directory.`. La ayuda de CLI 2.108.0 sí documenta `--include-all`, pero no resuelve esta comprobación de historial.
- **Vía de aplicación MCP:** no se usó `apply_migration`. Esa operación acepta SQL y un nombre, pero no expone un campo para fijar las versiones exactas del ledger. Usarla no demostraría que las versiones `20261017230948` y `20261018182424` quedan registradas con precisión ni ofrecería el dry-run solicitado. Tampoco se ejecutó SQL manual ni `migration repair`.

### Estado de los requisitos

- **Migración aplicada:** ninguna en esta continuación.
- **Verificación aprobada:** identidad del proyecto, conexión a PostgreSQL, pendientes locales exactamente coincidentes con las dos autorizadas y opciones de CLI comprobadas. Las simulaciones autenticadas normal y `--include-all` fallaron por el control de versiones remotas sin fuente local. El remoto no fue modificado.
- **Pendiente:** una ruta soportada por Supabase que pueda aplicar el SQL de ambos archivos y registrar exactamente esos dos números de versión, sin alterar entradas históricas. La vía MCP disponible no permite fijar la versión; el CLI `db push` queda bloqueado por el error indicado. Por ello ninguna migración se aplicó y no se ejecutaron verificaciones de efectos ni pruebas remotas.

**Paso mínimo para desbloquear:** hace falta una vía de despliegue soportada que permita ejecutar los dos archivos y registrar los timestamps exactos sin cambiar las filas históricas. El CLI exige fuentes locales para sus versiones remotas no presentes; reconstruirlas contradice el alcance actual, y reparar el ledger está expresamente prohibido. El conector MCP aplica SQL nombrado pero no permite fijar timestamp/versión, así que tampoco demuestra el registro exacto. La CLI concreta el bloqueo con `Remote migration versions not found in local migrations directory.`; en el primer dry-run mostró la propuesta no autorizada de reparar como reverted las 27 versiones enumeradas. No se siguió.

## Recuperación del historial remoto y aplicación — 2026-10-18

El propietario indicó `supabase migration fetch --linked`. La CLI 2.108.0 confirma que este subcomando recupera archivos de migración desde la tabla de historial. Esto sí entrega el SQL histórico registrado; es diferente de `supabase db pull`, que produce un snapshot del esquema actual como nueva migración.

### Archivos de migración recuperados

- Se ejecutó `supabase migration fetch --linked` contra el ref enlazado `zwgtgegrgwqtfbsvpala`.
- Se recuperaron los 27 archivos cuyos timestamps existían en el ledger remoto pero no tenían archivo local. Se verificó luego con `supabase migration list --linked --password ''`: las 27 versiones históricas aparecen coincidentes local/remoto.
- `migration fetch` preguntó si debía sobrescribir archivos existentes y descargó también contenido en rutas ya presentes. Para conservar el checkout, se restauraron desde `HEAD` los archivos tracked que figuraban modificados tras el fetch; antes del fetch estaban limpios. Se conservaron los borrados de archivos históricos que ya existían en el árbol de trabajo, así como las migraciones locales nuevas. Las 27 fuentes recuperadas quedaron con los nombres/timestamps remotos. El fetch no escribe en la base remota.
- El comando mostró que ignora cuatro README/ZIP de `supabase/migrations/` por no tener formato de migración; no se alteraron esos archivos.

### Simulación y aplicación de las dos migraciones pendientes

- Se ejecutó `supabase db push --linked --dry-run --password ''` tras recuperar los archivos. El plan resultante enumeró únicamente:
  - `20261017230948_fix_projects_company_policy_bypass.sql`
  - `20261018182424_remove_product_workflows.sql`
- Se ejecutó `supabase db push --linked --password ''`. La CLI confirmó e informó `Applying migration` para ambas versiones y terminó `Finished supabase db push.`
- No se usó `migration repair`, `db pull` ni SQL manual para editar el ledger.

### Verificación remota posterior

Consulta de solo lectura mediante Supabase SQL API al proyecto/ref indicado:

- **RLS projects:** hay cuatro políticas activas (`projects_select`, `projects_insert`, `projects_update`, `projects_delete`), todas asignadas a `authenticated`, con guardas de compañía y rol/manager/assignee según operación. Las cuatro políticas legacy `projects_*_company` ya no existen.
- **RPC `create_project_from_paid_invoice(uuid)`:** conserva la función `SECURITY DEFINER`, `search_path=public,extensions`, flujo idempotente de proyecto desde factura pagada, respuesta `tasks_created=0`, y mantiene los enlaces factura/propuesta/producto/cliente/presupuesto. ACL: `anon_execute=false`, `authenticated_execute=true`, `service_role_execute=true`.
- **Workflows:** `product_workflows`, `product_workflow_steps` y `tasks.source_workflow_step_id` no existen tras la migración.
- **Datos existentes:** 207 tareas y 6 proyectos antes y después de las pruebas remotas. No se eliminó ningún proyecto ni tarea.
- **Ledger:** el listado remoto registra `20261017230948` y `20261018182424`.
- **Alineación final:** una nueva `supabase migration list --linked --password ''` terminó con código 0; mostró 128 versiones y cero filas no coincidentes (incluidas las dos recién aplicadas). El `.temp/project-ref` sigue siendo `zwgtgegrgwqtfbsvpala`.
- **Verificación aprobada:** todos los checks de catálogo, ACL, conteos e historial anteriores.

### Pruebas posteriores

Se comprobó antes de ejecutar que los UUID/email de las fixtures estaban ausentes, y se corrió:

```text
supabase test db --linked supabase/tests/database/110_projects_rls_regression.test.sql supabase/tests/database/120_product_workflow_retirement.test.sql
```

La ejecución remota falló antes de correr cualquier aserción en ambos archivos: `ERROR: function plan(integer) does not exist` (cero subtests). No se crearon filas fixture. Comprobación posterior: 207 tareas, 6 proyectos, cero filas de fixture y extensión `pgtap` ausente; por tanto, no quedó una extensión nueva ni datos de prueba en el remoto. Las suites aisladas locales previamente documentadas habían pasado 22/22 y 14/14, respectivamente; esto no cambia el resultado fallido de la prueba remota.

### Estado final

- **Migración aplicada:** `20261017230948_fix_projects_company_policy_bypass.sql` — sí.
- **Migración aplicada:** `20261018182424_remove_product_workflows.sql` — sí.
- **Verificación aprobada:** ref, pendientes, simulación exacta, políticas/RPC/ACL, retirada de workflows, conteos y ledger.
- **Pendiente:** habilitar una instalación/esquema pgTAP accesible a `supabase test db --linked` para volver a ejecutar las dos suites; fallo exacto `function plan(integer) does not exist`. La CLI descargó la imagen `public.ecr.aws/supabase/pg_prove:3.36`; el problema fue la resolución de la función pgTAP, no falta de conectividad.
