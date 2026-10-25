# Gauntlet de seguimientos comerciales — estado de implementación

Fecha: 2026-10-25
Alcance: implementación local y aplicación de las dos migraciones al proyecto Supabase CorevixBot (`zwgtgegrgwqtfbsvpala`). No se escribieron registros comerciales de prueba.

## Resumen

Se construyó localmente una primera versión integral: esquema dedicado de seguimientos e interacciones, RPC transaccional con idempotencia, outbox y scheduler de recordatorios, bandeja paginada, timeline, métricas agregadas por permisos y conexiones con Prospectos, Pipeline, Clientes, WhatsApp y Calendario. Las tareas generales y el flujo independiente de recordatorios de calendario se conservaron.

**Migraciones: APLICADAS.** El conector registró `20261025180749 commercial_follow_ups_core` y `20261025180812 schedule_commercial_reminders`. Se verificaron por lectura los objetos, RLS, grants, políticas de asignación y ejecución del scheduler. El Gauntlet completo de la aplicación no se continuó, por instrucción del usuario.

## Inventario principal

- `src/lib/commercial-follow-ups.ts`: contratos y operaciones de seguimiento, interacción, filtros, paginación, timeline y métricas.
- `src/components/commercial-follow-ups/`: panel de programación/registro, selector de entidad, host global y timeline.
- `src/routes/follow-ups.tsx`: bandeja Hoy/Próximos/Vencidos/Completados/Cancelados/Todos, paginación, filtros, acciones y métricas.
- `src/routes/leads.tsx`, `src/routes/pipeline.tsx`, `src/routes/clients.tsx`: acciones contextuales e historial.
- `src/components/whatsapp/messenger-context-panel.tsx`, `src/components/whatsapp/whatsapp-contact-panel.tsx`: creación contextual con el responsable de la entidad como asignación inicial.
- `src/routes/calendar.tsx`, `src/lib/crm/calendar-items.ts`: representación de eventos vinculados y reprogramación mediante la operación comercial.
- `src/components/layout/app-sidebar.tsx`, `src/routes/__root.tsx`, `src/routeTree.gen.ts`, `src/hooks/use-permissions.ts`: navegación, host global y capacidades.
- `supabase/migrations/20261025180749_commercial_follow_ups_core.sql`: esquema, restricciones, RLS, RPC, timeline, outbox e idempotencia.
- `supabase/migrations/20261025180812_schedule_commercial_reminders.sql`: job `pg_cron` de un minuto.
- `supabase/tests/database/140_commercial_follow_ups.test.sql`: 20 verificaciones pgTAP de esquema, RLS, grants, RPC y scheduler.

## Seguridad y comportamiento previsto

- Las tablas comerciales habilitan RLS y las escrituras van por `commercial_follow_up_action`; clientes autenticados no reciben permisos de escritura directa.
- Las comprobaciones de empresa, rol y visibilidad de la entidad se ejecutan en la base.
- Interacciones y eventos de auditoría conservan el historial. Una operación puede crear la siguiente llamada dentro de la misma RPC.
- Recordatorios usan outbox, bloqueo `SKIP LOCKED`, generación por reprogramación, máximo de cinco intentos y una notificación interna. El despachador no es ejecutable por `authenticated`.
- Los avisos vencidos durante una interrupción se entregan una vez al recuperarse el scheduler; no se descartan por antigüedad.
- Métricas: pendientes, vencidos, próximos, completados, contactos efectivos (`contacted`, `callback_requested`, `rescheduled`), intentos `no_answer` y pendientes por responsable. Los agregados se calculan en PostgreSQL con el alcance visible para el usuario.
- No se reinterpretaron tareas o eventos históricos.

## Evidencia ejecutada

### Verificación aprobada

- `npm run build`: terminó correctamente; el bundle incluye la ruta `/follow-ups`.
- `npm run test:pagination`: 2/2 pruebas pasaron.
- `npm run test:client360-estimates`: 1/1 prueba pasó.
- Supabase remoto: las dos versiones nuevas aparecen en `supabase_migrations.schema_migrations` con sus nombres y versiones alineados a los archivos locales.
- Supabase remoto: las cinco tablas nuevas tienen RLS habilitado; los roles `authenticated` no tienen escritura directa; el RPC de acciones y métricas está disponible; el dispatcher no puede ejecutarse como `authenticated`.
- Supabase remoto: las políticas amplias `*_company` de leads, deals y clients están ausentes; las políticas de deals comprueban asignación con `auth.uid()`.
- Supabase remoto: el job `corevix-commercial-reminders` está activo cada minuto y su ejecución más reciente tuvo estado `succeeded`.
- ESLint acotado a los nuevos componentes, servicio y ruta: 0 errores; quedan advertencias de `any` y una regla de Fast Refresh.
- La inspección filtrada del typecheck no mostró errores en los nuevos archivos comerciales. El typecheck global falla en varios módulos del repositorio, incluidos `clients.tsx` y `leads.tsx`; no se puede declarar limpio.

### No ejecutada / pendiente

- `npx eslint` sobre todos los archivos modificados terminó con errores de Prettier y advertencias en rutas extensas; no se declara lint global aprobado.
- `npx tsc --noEmit --pretty false` falla con numerosos errores de tipos del repositorio; hay errores en archivos existentes que también se modificaron para integrar el flujo.
- `supabase db reset --db-url [URL LOCAL OMITIDA] --no-seed --yes` no conectó porque el CLI intentó TLS y el servidor local rechazó TLS. No alteró esa base.
- Se identificó que el contenedor llamado `corevix-gauntlet-isolated-20261018` ya contiene tablas y empresas. No se reseteó ni se usó para pruebas.
- Se intentó levantar una instancia nueva `corevix-followups-check` con Supabase CLI, pero la descarga de imágenes requeridas quedó incompleta y se canceló. No se aplicaron migraciones a esa instancia.
- El test pgTAP nuevo está escrito, pero no ejecutado. No hay evidencia de pruebas RLS de las nuevas RPC, aislamiento entre empresas, atomicidad, deduplicación bajo concurrencia, scheduler en ejecución ni regresión visual/interactiva.

## Estado de aceptación

| Elemento | Estado |
|---|---|
| Implementación local de flujo y bandeja | Implementado; requiere QA funcional |
| Migraciones versionadas | **Migración aplicada: sí**, `20261025180749` y `20261025180812` |
| Build de producción | **Verificación aprobada** |
| Pruebas unitarias existentes | **Verificación aprobada: 3/3** |
| Lint global y typecheck | Pendiente; actualmente fallan |
| Migraciones, RLS y pgTAP en DB limpia | Pendiente |
| Supabase remoto | Migraciones aplicadas; metadatos verificados; sin fixtures de prueba |
| Despliegue | No realizado |

## Siguiente paso opcional

Si se desea completar el Gauntlet de aplicación, ejecutar el test pgTAP en un entorno aislado, corregir los fallos de lint/typecheck relacionados y verificar los casos interactivos de UI. Las migraciones ya quedaron aplicadas y el scheduler se encuentra activo en el remoto.
