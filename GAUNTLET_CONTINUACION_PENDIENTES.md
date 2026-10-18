# Gauntlet de continuación — pendientes

**Fecha:** 2026-10-18 15:23 AST (America/Santo_Domingo)  
**Resultado de la ronda:** **NO VERIFICADO** como auditoría completa; las unidades específicas indicadas abajo sí tienen resultados propios. No equivale a aprobación ni publicación del CRM.  
**B14:** **DIFERIDO por decisión del propietario**.

## Entorno, conservación y caída del servidor

- Checkout: `/Volumes/InmaDisk/sites/CRM.Corevix`; rama `test/finance-regression-baseline`; HEAD `88d147a55a62dadce2567f95a0f3f786d52b6a92`.
- El árbol ya estaba ampliamente modificado antes de esta continuación. La captura de estado inicial quedó en `/private/tmp/corevix-gauntlet-final/continuation-initial-git-status.txt`. No se restauraron ni se guardaron cambios preexistentes. Los informes históricos `GAUNTLET_CRM.md` y `GAUNTLET_FINAL_ESTABILIDAD_VISUAL.md` se dejaron intactos.
- Captura del estado final de Git (incluye cambios preexistentes conservados y esta bitácora): `/private/tmp/corevix-gauntlet-final/continuation-final-git-status.txt`.
- Instancia local: UI `http://127.0.0.1:8081`; Auth/API `http://127.0.0.1:55421`; contenedor `supabase_db_corevix-gauntlet-isolated-20261018`; `current_database() = postgres`. La última comprobación devolvió UI 200, Auth health 200 y Vite PID 55452 escuchando en 127.0.0.1:8081. La migración y pgTAP se ejecutaron solo contra este contenedor.
- A las 14:25 AST la UI local dejó de responder y ambos listeners Vite observados ya no estaban. El último log de Vite registra HMR y recarga del programa a las 14:20:07; no hay stack trace de cierre. Sí se había observado un proceso anterior desplazado a 8082 por colisión de puerto, pero la evidencia no permite atribuirle esta caída. **Causa no determinada.** Se recuperó el servicio en 8081 con configuración explícita del Supabase aislado; productos volvió a responder y persistió.
- No se usaron Supabase remoto, pasarelas reales, correo, WhatsApp, firmas ni despliegues. No se ejecutó `db push`.

## Cambios de esta continuación

1. **Retiro de workflows de producto.** Se retiraron formularios, estado, consultas, bloqueos y creación automática de tareas desde Productos, Leads, Pipeline y Propuestas. Se eliminó la exposición de pasos de workflow heredados al leer/guardar propuestas; el proceso escrito manualmente sigue siendo editable y es independiente. Se retiró la semilla de workflows y los tipos de base correspondientes. La migración local nueva `supabase/migrations/20261018182424_remove_product_workflows.sql` verifica que no queden filas dependientes antes de retirar tablas/columna y conserva el RPC de creación de proyecto desde factura pagada sin generar tareas. Se preservan enlaces financieros y de venta.
2. **Proyecto desde venta y moneda.** `src/lib/crm/project-budget.ts` y sus llamadas desde Leads/Pipeline conservan importe y moneda de la venta y el valor de base/FX registrados; si no hay moneda en la venta, usan la del producto.
3. **Propuestas heredadas.** `src/lib/proposals/proposal-data.ts` elimina `processSteps` antiguos al persistir los datos de la propuesta y conserva `processText` manual. El render público ignora el array heredado. No se encontró una propuesta fixture con `processSteps` no nulo para comprobarla visualmente; la exclusión está cubierta por prueba unitaria.
4. **Recordatorios Draft.** Draft se excluye del conjunto de facturas abiertas que alimenta recordatorios/KPI monetarios. Los estados emitidos/parciales siguen siendo elegibles.
5. **Selector cliente/prospecto.** El popover se elevó sobre el diálogo de propuesta para que el clic llegue a las opciones.
6. Se actualizó el texto del tour de demostración y el vacío de Tareas para no sugerir generación automática desde producto.

### Referencias conservadas

Las referencias a `product_workflows` en la migración histórica/archivo y en pgTAP nuevo son intencionales: historial inmutable y aserciones de que las tablas ya no existen. `workflows` de `/automations`, el icono genérico `Workflow` y los pasos/proceso escritos manualmente en plantillas de propuesta no consultan ni configuran workflows de producto. No se inventó un reemplazo del sistema eliminado.

## Verificación y evidencia independiente

- **Proyecto/moneda — APROBADO por crítico independiente** `/root/workflow_removal_critic`, Chrome propio, usuario sintético B15. Lead `GAUNTLET-CONT-20261018-CurrencyCase-Cliente`, ID `7379f366-3049-4ac3-8758-168e4ccfe12e`; oportunidad ganada `795b3a18-6099-4e56-89ab-e7d0b1402416`, venta DOP 12,500; producto `18bf1581-ca03-4d67-a265-b1779694759a`; proyecto nuevo `b66ae564-b12a-4f2b-bb1e-64c4ec877f09`. Tras recargar, la UI mostró RD$ 12,500. Consulta de solo lectura confirmó presupuesto 12,500 DOP, base DOP, FX 1, base 12,500 y vínculos correctos. No se usó el proyecto de prueba anterior con moneda incorrecta.
- **Eliminación visible — revisión del mismo crítico:** crear propuesta con producto ya no añade pasos de workflow; el proceso manual continúa editable. La propuesta pública `PROP-20261018-6595` se abrió sin bloque de flujo; su dato legacy `processSteps` era nulo, así que no prueba visualmente el caso heredado no nulo.
- **Selector — APROBADO por crítico independiente** `/root/selector_fix_critic`, sesión nueva Chrome B15. Clic físico selecciona; búsqueda + ArrowDown/Enter selecciona; Escape cierra y conserva selección; recarga sin guardar propuesta. Informe: `/private/tmp/corevix-gauntlet-final/continuation-selector-fix-critic.md`. Móvil y `elementFromPoint()` posterior al cambio: NO VERIFICADOS. Captura del defecto reproducido antes del fix: `/private/tmp/corevix-gauntlet-final/evidence/continuation-selector-inspect.png`; no se pudo guardar una captura de éxito desde CUA.
- **Draft — APROBADO por crítico independiente** `/root/draft_reminder_critic`, sesión nueva Chrome B15. Factura Draft propia `INV-016139`, ID `39a155d5-5d1e-470c-8d2a-cc17ddfb8c9a`, USD 2,500, vencida 2026-10-15: no aparece en recordatorios y no altera KPI monetarios tras guardar/recargar; sí aumenta el conteo de borradores. Facturas parciales emitidas siguen apareciendo. Informe: `/private/tmp/corevix-gauntlet-final/draft-reminder-critic.md`.
- **Prueba unitaria de proyecto/moneda**: `node --experimental-strip-types --test tests/project-budget.test.ts` (3 casos al integrar el conjunto); cubre DOP→USD base, importe base registrado y fallback a moneda de producto.
- **Pruebas Node completas**: `node --experimental-strip-types --test tests/*.test.ts` — **19/19 aprobadas**. El primer intento detectó que el nuevo helper importaba `currency` sin extensión (el runner Node no resolvía el módulo); se corrigió a `currency.ts` y se repitió satisfactoriamente.
- **Migración/pgTAP local**: `supabase/tests/database/120_product_workflow_retirement.test.sql` — **14/14 aprobadas**, incluida ausencia de tablas/columna, creación de proyecto sin tareas de workflow, idempotencia y ACL que niega acceso a `anon`. Se ejecutó directamente dentro del contenedor aislado confirmado porque `supabase test db --db-url` no logró conectar al host local. El resto de 11 suites de base no pasa íntegramente en este snapshot aislado: algunas carecen de perfiles/capacidades sembrados, `100_lead_conversion_authorization` falla 2 aserciones, `110_projects_rls_regression` aborta por FK, `40_finance_permissions_regression` falla 13/20 y `90_handle_new_user_deal_stages_regression` falla 3/3. No se presentan como regresiones de esta migración ni se ocultaron; el pase anterior 151/151 fue sobre otro destino (`gauntlet_snapshot_20261017`).
- **Build**: `npm run build` — aprobado (`vite build`, 24.25 s).
- **Whitespace/diff**: `git diff --check` — aprobado.
- **ESLint exploratorio** en los archivos tocados: no pasa; devuelve 224 errores (principalmente reglas `prettier/prettier`) y 245 warnings en varios archivos ya modificados en el árbol. No se hizo formateo masivo que ampliara cambios preexistentes. Los helpers nuevos sí quedaron incluidos en build y Node tests.
- **Conciliación UI tras aplicar la nota de crédito:** Reportes, Cliente 360 y Pagos se revisaron de nuevo en la UI. Reporte de facturas: total DOP 61,000, pagos netos DOP 9,130, crédito DOP 100, saldo de INV-373978 DOP 50,900. Estado de cuenta del cliente: facturado DOP 60,000, pagos DOP 9,000, nota de crédito DOP 100, pendiente DOP 50,900. Pagos: cobrado neto DOP 9,130; movimiento de INV-373978 neto DOP 9,000, parcialmente reembolsado. Dashboard: por cobrar DOP 51,770, vencido DOP 0, cobrado DOP 9,130; los Draft no se listan como recordatorios. Diferencia de DOP 870 corresponde a la otra factura parcial del fixture B15.
- **Integración de proyecto/tarea/calendario:** la revisión anterior del crítico workflow cubrió creación de proyecto desde venta ganada sin requisito de workflow, tarea manual vinculada, persistencia tras reload y presencia en agenda/calendario; el fixture quedó identificado como propio. La verificación posterior de moneda usó un proyecto aparte.

### Incidencias y límites

- Un proyecto de una revisión previa quedó guardado con la moneda incorrecta (12,500 mostrado como USD); no se alteró ni se borró a mano. El nuevo recorrido, con otro fixture, pasó tras el cambio.
- No se inspeccionó una propuesta guardada con `processSteps` heredado no nulo en UI; el guardado nuevo lo omite por helper cubierto por prueba unitaria y el render público ya no lee ese array.
- El critical selector y la revisión Draft no pudieron conservar capturas nuevas localmente; no se inventan rutas de evidencia.
- La pasada final de carga de rutas usó B15 y navegó por las 29 URLs en escritorio; todas presentaron título/encabezado, sin texto de error visible en el primer estado. Esa navegación fue una comprobación de carga/shell, no el recorrido de estado vacío/con datos, acción principal, validación, permisos, persistencia, consola/red y visual a móvil que exige el plan.
- No se probó móvil, permisos de otro rol, ni se enviaron acciones a proveedores. Las integraciones externas quedaron sin mutaciones.
- No se limpiaron los fixtures de esta ronda porque no se hizo borrado soportado por UI dentro de las unidades revisadas. Permanecen en la base local y se enumeran aquí; no se borraron por SQL.

## Matriz de las 29 rutas

El estado de esta matriz mide el recorrido integral pedido por el plan. La carga de título no equivale a probar CRUD, persistencia, consola/red y layout de escritorio/móvil. Por eso ninguna ruta se marca aprobada solo por cargar.

| # | Módulo | Ruta | Estado | Evidencia / límite de esta ronda |
|---:|---|---|---|---|
| 1 | Panel principal | `/dashboard` | NO VERIFICADO | Conciliación de importes y recordatorios Draft revisada; no auditoría completa de widgets, permisos, consola/red ni móvil. |
| 2 | Clientes | `/clients` | NO VERIFICADO | Lista y Estado de cuenta de fixture financiero revisados; resto de Cliente 360 sin recorrido completo. |
| 3 | Prospectos | `/leads` | NO VERIFICADO | Conversión/proyecto desde oportunidad en integración; validaciones y CRUD general no completos. |
| 4 | Pipeline | `/pipeline` | NO VERIFICADO | Creación y cierre de oportunidad, proyecto ligado y moneda verificados por crítico; falta la ruta completa. |
| 5 | Propuestas | `/proposals` | NO VERIFICADO | Selector aprobado por crítico y pasos de workflow retirados; no se recorrió toda la gestión de propuestas. |
| 6 | Cotizaciones | `/estimates` | NO VERIFICADO | Solo carga inicial de ruta; sin CRUD/validación/persistencia. |
| 7 | Facturas | `/invoices` | NO VERIFICADO | Fixture Draft guardado y verificado; ruta completa y estados generales no cubiertos. |
| 8 | Pagos | `/payments` | NO VERIFICADO | Neto/reembolso y UI conciliados; no recorrido integral de acciones. |
| 9 | Notas de crédito | `/credit-notes` | NO VERIFICADO | Draft→Emitida→Aplicada por UI y saldo/recarga verificados; no prueba completa del módulo. |
| 10 | Productos | `/products` | NO VERIFICADO | Alta de producto comercial sin workflow verificada; faltan campos/estados/validaciones y responsive. |
| 11 | Suscripciones | `/subscriptions` | NO VERIFICADO | Solo carga inicial; proveedor/acciones no mutadas. |
| 12 | Gastos | `/expenses` | NO VERIFICADO | Solo carga inicial. |
| 13 | Reportes de ventas | `/reports` | NO VERIFICADO | Reporte de facturas conciliado tras nota de crédito; otros reportes no recorridos. |
| 14 | TeamChat | `/internal-chat` | NO VERIFICADO | Solo carga inicial; sin enviar mensajes. |
| 15 | Meta Inbox | `/whatsapp-web` | NO VERIFICADO | Solo carga inicial; sin enviar mensajes ni llamadas a proveedores. |
| 16 | Bandeja de correo | `/email` | NO VERIFICADO | Solo carga inicial; no enviar correo ni probar conexión externa. |
| 17 | Tareas | `/tasks` | NO VERIFICADO | Tarea manual vinculada a proyecto y persistencia revisadas en integración previa; CRUD completo no cubierto. |
| 18 | Proyectos | `/projects` | NO VERIFICADO | Proyecto de venta, presupuesto/moneda, relación y persistencia verificados por crítico; faltan otros estados/acciones. |
| 19 | Contratos | `/contracts` | NO VERIFICADO | Solo carga inicial; firma no invocada. |
| 20 | Soporte | `/tickets` | NO VERIFICADO | Solo carga inicial. |
| 21 | Asistente de IA | `/ai-assistant` | NO VERIFICADO | Solo carga inicial; proveedor no invocado. |
| 22 | Calendario | `/calendar` | NO VERIFICADO | Tarea del proyecto visible en agenda integrada; ruta independiente y responsive no recorridos. |
| 23 | Vault | `/vault` | NO VERIFICADO | Solo carga inicial; secretos no abiertos/exportados. |
| 24 | Biblioteca multimedia | `/media-library` | NO VERIFICADO | Solo carga inicial; no se subieron archivos externos. |
| 25 | Exportar PDFs | `/pdf-export` | NO VERIFICADO | Solo carga inicial; exportación no comprobada. |
| 26 | Exportar CSV | `/csv-export` | NO VERIFICADO | Solo carga inicial; exportación no comprobada. |
| 27 | Registro de actividad | `/activity-log` | NO VERIFICADO | Solo carga inicial. |
| 28 | Equipo | `/team` | NO VERIFICADO | Carga bajo usuario sintético B15; permisos/rol no se clasificaron con otra sesión. |
| 29 | Configuración | `/settings` | NO VERIFICADO | Carga bajo usuario sintético B15; acciones/permiso de rol no probados. |

## Fixtures que permanecen en la base aislada

- Producto comercial de esta ronda: `GAUNTLET-CONT-20261018-Servicio`, ID `18bf1581-ca03-4d67-a265-b1779694759a`, DOP 12,500.
- Lead/cliente para recorrido del proyecto: `GAUNTLET-CONT-20261018-CurrencyCase-Cliente`, ID `7379f366-3049-4ac3-8758-168e4ccfe12e`; oportunidad ganada ID `795b3a18-6099-4e56-89ab-e7d0b1402416`; proyecto DOP ID `b66ae564-b12a-4f2b-bb1e-64c4ec877f09`.
- Factura Draft propia: `INV-016139`, ID `39a155d5-5d1e-470c-8d2a-cc17ddfb8c9a`, USD 2,500.
- Integración previa en esta continuación: lead `5f69c6e0-bc61-4be9-900b-5fa2e369cc54`, oportunidad `85439491-be42-440a-aa6d-6190f886ae8f`, proyecto `ea584612-8495-47f0-b8a6-7b096840a675`, tarea `a1d326da-1317-4e26-9618-052cc997ba30`; tarea `GAUNTLET-CONT-20261018-Tarea de entrega` aparece en Dashboard/agenda.
- Nota de crédito previa al corte: ID `cf3e4c9a-ef06-4faa-8e5b-ab61c5b02d35`, vinculada a `INV-373978`, se transicionó por UI a Aplicada; no se alteró por SQL.
- Evidencia financiera previa conservada: factura emitida `INV-373978` (ID `f8977435-2841-4278-81f8-a8b6dba0871c`), DOP 60,000, estado `Sent`; pago `4bb6acbc-da36-4efe-ae2f-ca16025a4b42`, DOP 10,000, con movimiento de reembolso `45e01944-6fcf-4e2e-a8b9-88330c993e1f` por DOP 1,000 y neto DOP 9,000. La nota de crédito aplicada es DOP 100; el saldo verificado después de aplicarla es DOP 50,900.
- Los fixtures previos del pago reembolsado y cliente B15 se conservaron sin borrado. El producto/proyecto defectuoso anterior también permanece intacto y se diferencia del proyecto nuevo aprobado.

## Estado de cierre

Los cambios específicos de eliminación de workflow, el proyecto con moneda DOP, selector y recordatorios Draft tienen evidencia independiente y/o pruebas como se detalla arriba. La conciliación financiera de la nota aplicada coincide entre Reportes, Cliente 360, Pagos y Dashboard. Sin embargo, no se completó la inspección integral visual/interactiva de las 29 rutas, móvil, permisos, consola/red y proveedores; además, la mayoría de las suites pgTAP no se ejecutan correctamente en el snapshot aislado actual. El estado global sigue **NO VERIFICADO**; no se declara aprobado para entrega local.
