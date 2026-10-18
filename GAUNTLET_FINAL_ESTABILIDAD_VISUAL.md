# Gauntlet final de estabilidad funcional y visual del CRM

> Registro de la ronda iniciada el 2026-10-18. La sección inicial resume el estado vigente; `GAUNTLET_CRM.md` conserva la cronología histórica anterior y no se modifica en esta ronda.

## Estado vigente

- **Ronda:** crítico final terminado con recorridos parciales; cierre global **NO VERIFICADO**. Se documentó la línea base live de 29 módulos; los críticos post-fix aprobaron FVS-01/02/03/04 en sus alcances. Finanzas y entrega aún tienen límites.
- **Checkout:** rama `test/finance-regression-baseline`, HEAD `88d147a`. El árbol ya tenía cambios, archivos nuevos y eliminaciones antes de esta ronda. Se preservan; no se limpiará ni reseteará el checkout.
- **Entorno de UI/API:** Docker Desktop y el stack dedicado se reactivaron tras hallar que estaban detenidos. App Vite en `http://127.0.0.1:8081`, lanzada con variables de proceso dirigidas a API `http://127.0.0.1:55421` y la publishable key del Kong local; `.env` y el endpoint remoto no se usaron ni modificaron. API/Auth/DB locales en 55421/55432, contenedor `supabase_db_corevix-gauntlet-isolated-20261018`; `current_database()=postgres`, PostgreSQL 17.6. Snapshot pgTAP separado `supabase_db_corevix-gauntlet-local` en 54322. No se usó `localhost:8080`, `--linked` ni el proyecto Supabase remoto.
- **Línea previa vigente:** los críticos ya aprobaron el ajuste de métricas Dashboard: RD$870 por cobrar/RD$130 cobrados; B15 proposal/quote producen una factura única cada una; F05 conserva lead/client al convertir. Node 11/11, build y diff-check pasaron. Evidencia histórica completa en `GAUNTLET_CRM.md`.
- **pgTAP:** cerrado previamente con 151/151 en `gauntlet_snapshot_20261017`. Se repetirá solo si esta ronda modifica SQL, RPC, RLS, migraciones o pruebas pgTAP.
- **Decisiones:** Draft no cuenta como facturada, saldo, cuenta por cobrar o recordatorio de vencimiento. B14 diferido; no se probarán otros usuarios ni se declarará aprobado. B11 y B16 conservan aprobaciones históricas en sus alcances descritos en `GAUNTLET_CRM.md`.
- **Datos:** se usarán registros sintéticos con prefijo `GAUNTLET-FINAL-<ámbito>-20261018`; los críticos documentarán UUID/nombre y limpiarán solo sus registros nuevos cuando sea seguro. Prohibido despachar comunicaciones, cargos o firmas reales; si no hay sandbox verificable, solo draft/validación/vista previa.
- **Acceso sintético:** para habilitar contextos Playwright independientes, el orquestador rotó solo la contraseña del usuario Auth local sintético B15 y guardó una credencial temporal con permisos 600 en `/private/tmp/corevix-gauntlet-final/b15-login.json`. No se cambió ninguna tabla CRM ni el backend remoto; el secreto no se copia a esta bitácora.

## Agentes y responsabilidades

| Agente | Rol | Alcance | Estado | Artefacto/veredicto |
|---|---|---|---|---|
| `baseline_sales_runtime` | Crítico adversarial de línea base, solo lectura | 1 Dashboard, 2 Clientes, 3 Prospectos, 4 Pipeline, 10 Productos; consumidor Calendario | Terminado; CRUD/relaciones parcialmente no verificados | `/private/tmp/corevix-gauntlet-final/sales-runtime.md` |
| `baseline_finance` | Crítico adversarial de línea base, solo lectura | 5 Propuestas, 6 Cotizaciones, 7 Facturas, 8 Pagos, 9 Notas de crédito, 11 Suscripciones, 12 Gastos, 13 Reportes | Terminado; dos hallazgos P2 | `/private/tmp/corevix-gauntlet-final/finance.md` |
| `baseline_ops` | Crítico adversarial de línea base, solo lectura | 14 TeamChat, 15 Meta Inbox, 16 Correo, 17 Tareas, 18 Proyectos, 19 Contratos, 20 Soporte | Terminado; límites de integración documentados | `/private/tmp/corevix-gauntlet-final/ops.md` |
| `baseline_delivery` | Crítico adversarial de línea base, solo lectura | 21 Asistente IA, 22 Calendario, 23 Vault, 24 Biblioteca multimedia, 25 PDF, 26 CSV, 27 Actividad, 28 Equipo, 29 Configuración | Terminado; clipping P2 PDF móvil, semántica Draft pendiente | `/private/tmp/corevix-gauntlet-final/delivery.md` |
| `baseline_ops` | Crítico de integración de línea base, lectura/UI/DB local | Asociaciones venta, finanzas y entrega | Terminado; APROBADO para las relaciones revisadas, con UI F05 apoyada en evidencia histórica | `/private/tmp/corevix-gauntlet-final/cross-domain-baseline.md` |
| `builder_f14_consumers` | Constructor F14 | Dashboard/Calendario y Reportes de facturas | APROBADO por crítico fresco | `builder-f14.md`, `critic-f14-postfix.md` |
| `builder_proposal_mobile` | Constructor visual por unidad | Editor móvil de Propuestas | APROBADO por crítico fresco | `builder-proposal-mobile.md`, `critic-proposal-postfix.md` |
| `builder_pdf_draft` | Constructor visual/financiero | Vista pública/PDF y elegibilidad de pago Draft | Terminado; build, ESLint dirigido y suite Node aprobados | `/private/tmp/corevix-gauntlet-final/builder-pdf-draft.md` |
| `critic_pdf_postfix` | Crítico fresco independiente | Draft/Sent, responsivo, pago visible sin ejecutar | APROBADO UI/layout; despacho Edge no verificado | `/private/tmp/corevix-gauntlet-final/critic-pdf-postfix.md` |
| Críticos post-fix | Crítico nuevo por unidad, separado del constructor | App/datos guardados/recarga y rutas consumidoras | FVS-01/02/03/04 aprobados en alcances indicados | `critic-f14-postfix.md`, `critic-proposal-postfix.md`, `critic-pdf-postfix.md` |
| `final_integration` | Crítico final, contexto fresco | Recorridos end-to-end sintéticos | Lead→Deal Won→Cliente y conversiones proposal/estimate aprobados; pago/reembolso parcial probado; nota de crédito/entrega incompletas; fixtures financieros propios preservados en DB aislada por falta de acciones seguras de cleanup | `/private/tmp/corevix-gauntlet-final/final-integration.md` |

## Matriz de los 29 módulos

Los módulos visibles no se consideran probados hasta que su fila tenga evidencia y veredicto de crítico.

| # | Módulo | Ruta | Resultado de ronda | Evidencia / agente |
|---:|---|---|---|---|
| 1 | Panel principal | `/dashboard` | FVS-01 corregido y **APROBADO post-fix**: tras recarga solo factura Sent en recordatorio; KPIs RD$870/RD$130, dos Draft excluidas | `critic-f14-postfix.md`; evidencia `f14-postfix-dashboard-*` |
| 2 | Clientes / Cliente 360 | `/clients` | Carga y resumen financiero verificados; apertura de formulario sin guardar. CRUD completo, filtros, duplicados y detalle completo **NO VERIFICADOS** | `sales-runtime.md`; capturas `runtime-clients-*` |
| 3 | Prospectos | `/leads` | Recorrido sintético nuevo por UI: crear/recargar lead, crear oportunidad, marcar Won y convertir a cliente; SQL/Cliente 360 confirman relaciones. Cleanup verificado; CRUD restante/filtros parciales | `final-integration.md`; `evidence/final-int-*` |
| 4 | Pipeline | `/pipeline` | Recorrido lead→deal Won→cliente persistió etapa/relaciones en DB; formularios y filtros generales solo observados; CRUD restante **parcial** | `final-integration.md`; `sales-runtime.md` |
| 5 | Propuestas | `/proposals` | FVS-03 corregido y **APROBADO** por crítico fresco: formulario 390/1440 usable, controles/footer visibles y recarga regresa a lista. INT3 guardó/aprobó propuesta y generó factura Draft única; subtotal US$0 porque guardó sin líneas (regla de negocio para propuestas vacías no definida) | `critic-proposal-postfix.md`; `final-integration.md`; captura `proposals-fixed-390.png` |
| 6 | Cotizaciones | `/estimates` | Lista/formulario móvil observado; tabla desktop puede exceder ancho móvil. Conversión ya tuvo aprobación histórica B15, pero CRUD de ronda **parcial** | `finance.md`; `evidence/live2-estimates-*` |
| 7 | Facturas | `/invoices` | F14: Draft visible y excluida de KPI. Vista pública Draft rotulada y sin información/control de pago; Sent mantiene botón de pago. Crítico independiente APROBADO visualmente. INT3 confirma una factura Draft por proposal/estimate; flujo FIN local confirma Sent RD$60k, pago manual RD$10k, refund RD$1k y saldo RD$51k tras recarga. Nota de crédito y cleanup seguro de factura emitida pendientes | `critic-pdf-postfix.md`; `final-integration.md` |
| 8 | Pagos | `/payments` | INT local creó pago Manual DOP 10k, recargó Parcial/saldo 50k, RPC local de refund 1k recargó neto 9k; UI/DB concuerdan. Nota de crédito sin probar; registro sintético emitido asociado permanece para cleanup seguro | `final-integration.md`; capturas `fin-*` |
| 9 | Notas de crédito | `/credit-notes` | Se creó Draft propio RD$100 para factura FIN; balance local conserva RD$51k pendiente/0 créditos válidos. Selector de transición se bloqueó antes de emitir/aplicar; posibles acciones de cleanup pendientes | `final-integration.md`; captura `fin-credit-note-*` |
| 10 | Productos | `/products` | Estado vacío y formulario observado; creación/edición/inserción en documentos **NO VERIFICADAS** | `sales-runtime.md`; `control-products-*` |
| 11 | Suscripciones | `/subscriptions` | Lista/formulario observado; cambios de ciclo/estado y cobros externos **NO VERIFICADOS** | `finance.md`; sin sandbox de cobranza |
| 12 | Gastos | `/expenses` | Lista/formulario observado; efecto contable/reportes **NO VERIFICADO** | `finance.md` |
| 13 | Reportes de ventas | `/reports` | FVS-02 corregido y **APROBADO post-fix**: filtro Todos muestra 1 fila/RD$1,000; gráfico y CSV excluyen Draft, Sent permanece | `critic-f14-postfix.md`; `f14-postfix-report.csv` |
| 14 | TeamChat | `/internal-chat` | Ruta visualmente cargó en desktop/móvil; mensajes, orden y persistencia **NO VERIFICADOS**; Realtime local 503 | `ops.md`; `evidence/ops/` |
| 15 | Meta Inbox | `/whatsapp-web` | Ruta vacía; bandeja y despacho no verificados, sin sandbox/número de prueba | `ops.md`; no se envió comunicación |
| 16 | Correo | `/email` | Ruta visible; proveedor Gmail desconectado, envío/adjuntos no verificados y sin mailbox sandbox | `ops.md` |
| 17 | Tareas | `/tasks` | Lista/formulario cargan; CRUD, vencidos, asociaciones y persistencia **NO VERIFICADOS** | `ops.md`; diálogos desktop/móvil |
| 18 | Proyectos | `/projects` | Ruta carga; creación desde el deal nuevo quedó **NO VERIFICADA**: UI requiere producto con workflow y pasos. El producto temporal se limpió; no se guardó workflow ni proyecto. F05/B13 sigue con aprobación histórica | `ops.md`; `final-integration.md` |
| 19 | Contratos | `/contracts` | Lista/formulario/selector observados; persistencia, preview y firma sandbox **NO VERIFICADOS** | `ops.md`; no se firmó |
| 20 | Soporte | `/tickets` | Lista/formulario observado; cambio de estado/comentario y relación **NO VERIFICADOS** | `ops.md` |
| 21 | Asistente IA | `/ai-assistant` | Carga y datos visibles; prompts/acciones no probados por efectos posibles, funcionalidad **NO VERIFICADA** | `delivery.md` |
| 22 | Calendario | `/calendar` | FVS-01 corregido y **APROBADO post-fix**: tras recarga solo factura Sent como recordatorio; Draft ausentes en desktop/móvil | `critic-f14-postfix.md`; capturas `f14-postfix-calendar-*` |
| 23 | Vault | `/vault` | Estado vacío y forma accesible; campo secreto enmascarado. CRUD, búsqueda y ocultamiento en logs **NO VERIFICADOS** | `delivery.md`; `control-vault-new-access.png` |
| 24 | Biblioteca multimedia | `/media-library` | Estado vacío claro; upload/preview/renombrar/eliminar **NO VERIFICADOS** (sin fixture de asset/sandbox) | `delivery.md` |
| 25 | Exportar PDFs | `/pdf-export` | FVS-04: corte móvil de 483px corregido; crítico fresco APROBÓ Draft/Sent en 390/1440 sin clipping, Draft rotulado y sin pago, Sent conserva control sin accionarlo. Edge Functions rechazan estados no elegibles antes de PayPal por inspección/lint y test del helper; ejecución local no disponible. Nota visual leve: toolbar de pago Sent desborda su contenedor redondeado unos píxeles, pero queda visible; el total Draft se divide en dos líneas en escritorio | `delivery.md`; `builder-pdf-draft.md`; `critic-pdf-postfix.md`; `evidence/pdf-postfix-*` |
| 26 | Exportar CSV | `/csv-export` | CSV sintético de Clientes descargado y encabezado/fila revisados; otros módulos/filtros/codificación **NO VERIFICADOS** | `delivery.md`; `sample-export.csv` |
| 27 | Registro de actividad | `/activity-log` | Timeline carga 2 eventos; filtros y persistencia de una nueva acción **NO VERIFICADOS** | `delivery.md` |
| 28 | Equipo | `/team` | Sesión actual ve cuenta sintética B15; no se probaron usuarios ni matriz B14 (diferido) | `delivery.md` |
| 29 | Configuración | `/settings` | Pestañas visibles y navegables, secretos no expuestos. Guardado/recarga **NO VERIFICADOS**; tabstrip móvil se desplaza horizontalmente | `delivery.md`; `settings-all-tabs-mobile.png` |

## Recorridos integrados

| Recorrido | Barra | Estado |
|---|---|---|
| Venta: prospecto → oportunidad Won → Cliente 360 | Lead/deal/cliente vinculados, persistentes tras recarga; `lead_id`, `client_id`, `original_lead_id`, conversión y monto RD$1,250 confirmados en DB/UI; fixtures de prueba limpiados | **APROBADO para este subflujo**; evidencia `final-integration.md` |
| Venta: propuesta y cotización distintas → factura | Propuesta `PROP-20261018-3217` Enviado/recargado; aprobación sintética local generó una factura Draft US$0; cotización `EST-2` RD$1,250 persistió/recargó y generó una factura Draft. `proposal_id/estimate_id`, cliente e importes confirmados UI/DB; cleanup confirmado | **APROBADO para conversiones** por crítico integración; evidencia `final-integration.md` |
| Finanzas: factura emitida → pago parcial → reembolso → nota de crédito Draft/emitida/aplicada | Factura Sent RD$60k; pago manual RD$10k; refund RPC local RD$1k. Tras reload UI/DB: neto cobrado 9k, factura con saldo RD$51k; KPIs de Facturas/Pagos reconcilian acumulado del fixture sintético. Nota de crédito Draft RD$100 creada, emisión/aplicación y Dashboard/Reportes/Cliente360 no verificados | **PARCIAL**; fixture financiero propio permanece en DB aislada; no usar APROBADO global |
| Entrega: prospecto → cliente → proyecto → contrato → tarea → calendario/actividad | `lead_id/client_id/project_id` y vínculos conservados al guardar/recargar | **NO VERIFICADO**; proyecto requiere producto+workflow+pasos; dependencias no preparadas en la primera pasada |
| Operación: ticket, tarea con/sin vencimiento y comunicación interna sintética | Estado, fechas, asociaciones y persistencia | Pendiente en esta ronda |
| B15: respuesta perdida después de mutación real en backend local + retry, incluido payload distinto | Una sola operación; clave/payload incompatibles rechazados sin alterar la operación original | Aprobado en Gauntlet anterior; no reabrir salvo cambio de consumidores |

## Hallazgos de esta ronda

| ID | Módulo/ruta | Severidad | Clasificación | Reproducibilidad/evidencia | Dependencias | Estado |
|---|---|---|---|---|---|---|
| FVS-01 | Dashboard `/dashboard` y Calendario `/calendar` | P2 | Corregido; crítico fresco APROBÓ | Antes del fix: dos Draft (`066ae640-3a44-42e5-8353-6ed59626c7c5`, `41b451a5-2e85-42ed-8506-44544e981aa8`) aparecían junto a Sent `cf3b79ad-e3a9-4bef-8012-63d8234caa2f`. Tras fix y recarga, el crítico observa solo la Sent; la moneda/saldo concilian. | Helper `buildCalendarItems` compartido | Cerrado para este alcance |
| FVS-02 | Reportes `/reports` → reporte de facturas | P2 | Corregido; crítico fresco APROBÓ | Antes: FILAS=3/TOTAL RD$1,010 con Draft. Después: FILAS=1/TOTAL RD$1,000, `Sent/Partial` permanece, Draft filter=0, CSV una fila con RD$130 pagados/RD$870 saldo. | Suma, gráfico, filas y CSV | Cerrado para este alcance |
| FVS-03 | Propuestas `/proposals` → alta, viewport 390×844 | P2 | Corregido; crítico fresco APROBÓ | Antes el hijo Radix medía aprox. 1008px y recortaba campos. Después el crítico independiente confirmó formulario con scroll interno, controles/footer visibles en 390×844 y desktop 1440; recarga volvió a la lista. | Layout de `ProposalEditorDialog` | Cerrado para este alcance; sin test automatizado persistente |
| FVS-04 | `/pdf-export` → vista pública de factura, viewport 390×844 | P2 visual confirmado; guardia financiera P2 confirmada por inspección de código | **APROBADO visualmente** por crítico fresco; despacho Edge sin verificar | Antes: `INV-EST-1` Draft se mostraba “Pendiente”, “TOTAL DUE RD$10”, términos/datos de pago y botón PayPal; en móvil `scrollWidth=483`. Después, el crítico midió document width 390/390 a 390×844 y 1440/1440 en escritorio, 0 elementos fuera de vista; etiqueta/aviso Draft y sin Payment Info/PayPal. Sent conserva `Pagar con PayPal`, no accionado. Nota leve: toolbar Sent sale unos píxeles de su borde redondeado y total Draft parte texto en dos líneas, legibles. Test cubre elegibilidad Sent/Overdue vs Draft/Paid/Cancelled/Void/Partial/vacío. El RPC `get_invoice_public` marcó `viewed_at`; no cambió monto/estado ni se despachó pago. | `PublicInvoiceView`, helper de elegibilidad y Edge Functions PayPal | Aprobado visualmente; no se ejecutó Deno/Edge local ni sandbox de pago |
| FVS-05 | Propuestas `/proposals` → aprobación pública sintética → factura | P2 candidato, regla de negocio no especificada | Comportamiento reproducido, decisión funcional pendiente | El editor permitió guardar PROP-20261018-3217 sin ítems ni subtotal, marcar Enviado y aprobarla en vista pública local; se creó una factura Draft de US$0. Se limpió todo por IDs. No se encontró validación que exija importe/producto; no se declara defecto hasta confirmar si propuestas vacías/0 son válidas en el negocio. | Creación de propuesta y conversión pública | Pendiente de definición funcional; global no verificado |

## Revisión visual y comandos

- Cada crítico inspeccionará visualmente escritorio 1440×900 y móvil 390×844, incluyendo formularios, menús, selectores, popovers, date pickers, scroll y clipping; registrará capturas y mediciones DOM cuando ayuden a reproducir.
- Por módulo se registrarán carga, búsqueda/filtro, controles, validaciones, CRUD sintético, transición de estado, persistencia tras recarga, relaciones y mensajes de error/vacío/loading, hasta donde aplique.
- Comprobaciones al 2026-10-18: Node 14/14, `npm run build` y `git diff --check` aprobados; ESLint dirigido aprobó con 81 advertencias `no-explicit-any` y cero errores después de corregir formato Prettier de `proposals.tsx`. Críticos FVS-01/02/03/04 aprobaron sus alcances. Crítico final confirmó lead→deal Won→cliente, propuesta/cotización→una factura por origen y pago parcial+reembolso local parcial; nota de crédito creada Draft pero emisión/aplicación, recálculo Dashboard/Reportes/Cliente360 y proyecto/tarea/calendario siguen sin verificar. El guardado de propuesta vacía generó factura Draft US$0; la regla funcional no está definida. Fixtures financieros propios (factura enviada, pago/refund, nota Draft) permanecen aislados; la UI no ofrece borrado seguro observado y no se forzó SQL. pgTAP no se repitió porque esta ronda no cambió SQL/RPC/RLS ni pruebas SQL. No se despliega. Veredicto global **NO VERIFICADO**.

## Cierre

El veredicto **APROBADO PARA ENTREGA** solo se emitirá con 29 resultados/evidencias o limitaciones no bloqueantes, recorridos de venta/finanzas/entrega completos, sin P0/P1/P2 ni problemas visuales bloqueantes, críticos frescos post-fix, Node/build/lint/diff-check aprobados y crítico final independiente aprobado. B14 permanecerá diferido; no bloquea otros recorridos. Hasta entonces: **NO VERIFICADO**.
