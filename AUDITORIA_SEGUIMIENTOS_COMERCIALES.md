# Auditoría del sistema de seguimientos comerciales

**Fecha:** 25 de octubre de 2026
**Alcance:** auditoría estática del repositorio y consultas de catálogo de solo lectura al Supabase remoto CorevixBot (`zwgtgegrgwqtfbsvpala`).
**Cambios realizados:** únicamente este informe. No se modificó código, configuración, migraciones, esquema ni datos. No se crearon fixtures ni se ejecutaron pruebas.

## A. Resumen ejecutivo

El botón **Crear seguimiento** no crea un registro comercial especializado: abre el formulario general de tareas. El formulario guarda en `tasks` una tarea con título, descripción, prioridad, estado, fecha de vencimiento, responsable y relaciones. El acceso desde un prospecto o una oportunidad prellena el título, vencimiento para mañana, prioridad media, texto de contexto y relación con el registro.

Existe además una acción separada **Recordatorio**, que guarda un evento en `calendar_events` con hora de inicio, tipo y relación al prospecto/oportunidad. La creación de la tarea no crea ese evento ni una notificación programada. La fecha de vencimiento de la tarea sí puede mostrarse como ítem de calendario, pero funciona como fecha de tarea, no como recordatorio independiente.

La base de datos tiene trazabilidad operativa de tareas y un log genérico de actividad, pero no un modelo de interacción comercial con tipo de contacto, resultado, intento, próximo paso o reprogramaciones. La pantalla de automatizaciones muestra reglas de ejemplo en estado React local; no persiste una configuración ni implementa el recordatorio de seguimiento anunciado en su catálogo.

**Hallazgo prioritario de permisos:** en el remoto siguen presentes políticas RLS permisivas `*_company` para `tasks` y `leads`, además de políticas restringidas por rol/asignación. PostgreSQL combina políticas permisivas aplicables con OR; por ello, esas políticas de empresa permiten a usuarios autenticados de la misma empresa superar las restricciones más estrechas de asignación/rol. El archivo local [20261018194255_fix_tasks_company_policy_bypass.sql](supabase/migrations/20261018194255_fix_tasks_company_policy_bypass.sql) elimina las políticas amplias de `tasks`, pero las consultas del catálogo remoto confirman que siguen instaladas allí. No se aplicó nada durante esta auditoría.

## B. Puntos de entrada y recorrido actual

| Módulo | Acción | Resultado observado en código |
|---|---|---|
| Prospectos | Crear seguimiento | Abre `TaskCreateDialog` con `leadId` y datos prellenados. [leads.tsx](src/routes/leads.tsx:2010), menú en [línea 2903](src/routes/leads.tsx:2903), pestaña Tareas en [línea 3576](src/routes/leads.tsx:3576). |
| Prospectos | Recordatorio | Abre `ReminderCreateDialog`; crea evento de calendario relacionado al prospecto. [leads.tsx](src/routes/leads.tsx:2041), [línea 3608](src/routes/leads.tsx:3608). |
| Pipeline | Crear seguimiento | Abre la misma tarea global con `dealId` y, si existe, `leadId`. [pipeline.tsx](src/routes/pipeline.tsx:1796). |
| Pipeline | Recordatorio | Abre el creador de evento con relación a oportunidad/prospecto. [pipeline.tsx](src/routes/pipeline.tsx:1814). |
| WhatsApp | Crear seguimiento | Está disponible desde dos paneles y crea tarea contextual. [messenger-context-panel.tsx](src/components/whatsapp/messenger-context-panel.tsx:356), [whatsapp-contact-panel.tsx](src/components/whatsapp/whatsapp-contact-panel.tsx:1251). |
| Tareas | Nueva tarea | Entrada general a la entidad operativa `tasks`; usa el mismo formulario global. [tasks.tsx](src/routes/tasks.tsx:1165). |

El host global escucha un evento del navegador y muestra el formulario de tareas; tras crear la tarea puede navegar a su detalle. [global-task-create-host.tsx](src/components/tasks/global-task-create-host.tsx:21)

## C. Qué registra «Crear seguimiento»

Desde Prospectos, el helper requiere `tasks.create` y, para perfiles que no ven todos los prospectos, que el registro esté asignado al usuario. Prellena vencimiento para el día siguiente, prioridad `Medium`, título «Dar seguimiento a …», una nota de origen y el ID del prospecto. Desde Pipeline se prellena información equivalente, junto con oportunidad y posible prospecto relacionado.

El formulario general permite título, descripción, estado, prioridad, vencimiento, responsable, proyecto, cliente y prospecto; no incluye campos específicos de interacción como canal/tipo de contacto, propósito, resultado, número de intento, próximo paso o fecha/hora del próximo contacto. Al guardar se hace `INSERT` en `tasks`; `due_date` es una fecha sin hora. [task-detail-dialog.tsx](src/components/tasks/task-detail-dialog.tsx:1930)

El formulario captura el responsable principal en `assigned_to` y sincroniza asignaciones adicionales en `task_assignees`. Aunque el esquema admite oportunidad, factura y propuesta, la relación con la oportunidad no aparece como campo seleccionable general en el fragmento de campos de relación revisado; los accesos contextuales pueden prellenar `dealId`.

## D. Diferencia entre tarea, recordatorio e interacción

| Concepto | Registro actual | Datos disponibles | Qué significa hoy |
|---|---|---|---|
| Tarea | `tasks` | Estado, prioridad, vencimiento `DATE`, responsable, descripción y relaciones | Trabajo operativo. Puede representar informalmente un seguimiento si el título/nota lo dice. |
| Recordatorio/evento | `calendar_events` | Tipo (`reminder`, `call`, `meeting`, `demo` desde el formulario), estado, inicio/fin, usuario, ubicación y relaciones | Evento planificado visible en calendario. No se genera automáticamente al crear tarea. |
| Interacción comercial | No se identificó una tabla o entidad dedicada | `activity_logs` y `task_activity_events` son registros genéricos/operativos | No hay campos normalizados para canal, resultado, intento, compromiso ni próximo paso. |

La opción Recordatorio crea `calendar_events` con estado `scheduled`, usuario actual y `start_at` predeterminado a una hora en el futuro. [reminder-create-dialog.tsx](src/components/calendar/reminder-create-dialog.tsx:167). La tarea tiene una fecha, pero no se encontró en el flujo de creación una inserción vinculada a `calendar_events` ni un disparador que convierta automáticamente `due_date` en notificación.

## E. Inventario funcional

| Capacidad | Estado | Evidencia / límite |
|---|---|---|
| Crear tarea desde prospecto | Disponible | Formulario general contextual, no entidad comercial independiente. |
| Crear tarea desde oportunidad | Disponible | Prellena `related_deal_id` y prospecto opcional. |
| Crear recordatorio de calendario | Disponible como acción separada | Persiste evento `calendar_events`; es el único flujo contextual con fecha/hora. |
| Registrar llamada, reunión o demo planificada | Parcial | `calendar_events.type` permite esos tipos, sin resultado posterior normalizado. |
| Registrar resultado de contacto | No identificado | No se encontró estructura dedicada ni campo de resultado en las relaciones consultadas. |
| Registrar intentos y falta de respuesta | No identificado | No hay contador/registro normalizado del intento comercial. |
| Programar siguiente acción como seguimiento | Parcial | Puede crearse otra tarea o evento manual; no hay secuencia/relación de continuidad hallada. |
| Reasignar y cambiar vencimiento de tareas | Disponible | El formulario de edición y políticas de tarea permiten cambios; el trigger de actividad contempla cambios de responsable y vencimiento. |
| Notificación al vencimiento/antes del evento | No verificada como automatización | La aplicación consulta y muestra notificaciones existentes; no se identificó un scheduler del sistema para vencimientos. |
| Seguimiento sin respuesta tras 3 días | Solo texto de interfaz de automatizaciones | La regla es dato local de ejemplo; no persiste ni ejecuta acción real. |
| Último contacto | Parcial | `leads.last_interaction_at` existe remotamente, pero la búsqueda del código no halló actualización sistemática al registrar tarea o evento. La UI también cae a `updated_at`/`created_at`, que no significan necesariamente contacto. |

## F. Tareas, calendario y actividad

El calendario combina eventos de `calendar_events` con tareas que tengan `due_date`; al mover una tarea en el calendario actualiza `tasks.due_date`. Esto sincroniza visualmente una fecha de tarea, pero no crea un recordatorio independiente. [calendar.tsx](src/routes/calendar.tsx:218), [calendar.tsx](src/routes/calendar.tsx:449)

`task_activity_events` conserva eventos de cambio de estado, prioridad, fecha de vencimiento, responsable, comentarios y checklist mediante triggers en las migraciones locales. El panel de detalle consulta esa tabla para presentar una cronología de la tarea. [20260630213000_task_activity_events.sql](supabase/migrations/20260630213000_task_activity_events.sql:64), [task-detail-dialog.tsx](src/components/tasks/task-detail-dialog.tsx:2336)

`activity_logs` registra actividad CRM genérica (por ejemplo creación/actualización de tareas) y el perfil puede verla desde prospectos. No equivale a un historial de conversaciones comerciales. Parte del logging se intenta después de guardar y sus errores se ignoran para no bloquear la operación. [activity-log.ts](src/lib/activity-log.ts:211)

## G. Esquema remoto y relaciones observadas

Se consultó `information_schema.columns` y `pg_policies` del proyecto remoto en modo lectura. En las tablas remotas inspeccionadas existen:

- `tasks`: `company_id`, título, descripción, estado, prioridad, `assigned_to`, `due_date DATE`, relaciones con proyecto, prospecto, cliente, oportunidad, propuesta y factura.
- `calendar_events`: usuario, tipo/estado, `start_at`/`end_at`, `related_task_id` y relaciones con prospecto, cliente, oportunidad, proyecto, propuesta y factura.
- `task_activity_events`: `task_id`, tipo de evento, título, descripción, metadata, autor y fecha.
- `activity_logs`: empresa, usuario, entidad/tipo/ID, acción, detalle, metadata y fecha.
- `leads`: `last_interaction_at` existe. `next_follow_up` no aparece en las columnas remotas consultadas, aunque algunas reglas locales lo citan como evidencia; requiere atención para evitar lecturas contra una columna ausente.

No apareció una tabla `reminders` en las tablas consultadas. La migración local define los recordatorios/eventos en `calendar_events`. No se consultaron filas de clientes, tareas, prospectos ni eventos.

## H. Permisos y aislamiento multiempresa

Las políticas remotas consultadas son `PERMISSIVE` y se aplican a `authenticated` en `tasks` y `leads`. Además de políticas restringidas por rol/asignación (`tasks_select`, `tasks_insert`, etc.; `leads_select`, etc.), aparecen `tasks_*_company` y `leads_*_company`, cuya condición se limita a `company_id = get_user_company_id(auth.uid())`. Al ser permisivas, la condición amplia puede autorizar operaciones aunque la política estricta de rol o asignación no las permita.

**Impacto:** el hallazgo observado es una relajación de permisos dentro de la misma empresa; no prueba por sí mismo acceso entre empresas. En particular, la UI puede ocultar/bloquear una acción, pero RLS remoto sigue siendo el control efectivo y actualmente conserva las políticas amplias. El fix local para `tasks` elimina cuatro de ellas, pero el catálogo remoto aún las reporta. No se encontró un fix equivalente en el conjunto local inspeccionado para las políticas `leads_*_company`; deben tratarse como punto pendiente de revisión de seguridad.

Las políticas observadas de `calendar_events` permiten a usuarios autenticados de la empresa ver y actualizar eventos de esa empresa; la creación exige que `user_id = auth.uid()`. El borrado queda restringido al propietario o roles de gestión. Debe confirmarse que el alcance de lectura/actualización a toda la empresa corresponde a la regla comercial prevista.

En `task_activity_events`, las políticas consultadas aparecen con rol `{public}` y comprueban pertenencia a una empresa mediante `profiles` y `tasks`. Conviene revisar que ese alcance y el rol objetivo sean intencionales; esta auditoría no intentó explotar ni probar políticas con identidades de usuario.

## I. Interfaz y experiencia de usuario

**Verificación estática del JSX, no inspección visual en navegador.** El texto «Crear seguimiento» lleva al diálogo accesible y rotulado como «Crear tarea»; la cabecera muestra vencimiento de tarea y prioridad, y el panel lateral presenta información de tarea. La acción separada «Recordatorio» abre otro diálogo con tipo y fecha/hora. Para el usuario, ambas acciones expresan conceptos distintos aunque el nombre “seguimiento” se use en la tarea.

Riesgos de claridad: el usuario puede interpretar que Crear seguimiento programa una llamada o una alerta, cuando solo crea una tarea con fecha de vencimiento; el formulario no recoge resultado ni propósito comercial. No se verificaron responsive, validaciones visuales ni accesibilidad en navegador porque no se abrió una sesión de UI durante esta auditoría.

## J. Dependencias y automatizaciones

- `GlobalTaskCreateHost` y `GlobalReminderCreateHost` escuchan eventos globales en la raíz de la aplicación.
- `TaskCreateDialog` escribe `tasks`; `ReminderCreateDialog` escribe `calendar_events`.
- `useNotifications` lee notificaciones y se suscribe a cambios en tiempo real; eso entrega notificaciones ya creadas, no programa por sí solo recordatorios.
- La página `/automations` inicia con cinco objetos de ejemplo en memoria, cambia `active` con `useState`, y al crear solo muestra un toast. No consulta Supabase ni persiste reglas. “Lead follow-up reminder / No follow-up after 3 days” es demostrativo y no debe considerarse una automatización activa.
- Se encontró lógica puntual que crea notificación al cambiar manualmente el estado de una tarea y un flujo de backend que crea tarea de seguimiento en cierto contexto de WhatsApp. Ninguno acredita un proceso general de recordatorios previos/al vencimiento.
- La búsqueda estática de migraciones y funciones no halló uso de `pg_cron` ni `cron.schedule` para esta función.

## K. Escenarios solicitados

No se ejecutaron escenarios funcionales porque el alcance es auditoría de solo lectura y se prohibieron escrituras/fixtures. La columna de resultado indica lo que el código permite inferir, no una prueba ejecutada.

| Escenario | Resultado esperado desde arquitectura actual | Estado de verificación |
|---|---|---|
| A. Programar llamada futura a prospecto | Se puede crear evento de calendario tipo llamada y relacionarlo con el prospecto; por separado, se puede crear una tarea. | Flujo inspeccionado estáticamente; sin ejecución. |
| B. Crear recordatorio 15 minutos antes | Se puede fijar hora de evento, pero no se observó un campo de anticipación ni motor que envíe la alerta 15 minutos antes. | No existe evidencia de alerta temporizada; no ejecutado. |
| C. Registrar resultado de llamada | No hay campo de resultado comercial en el formulario/esquema consultados. La descripción o notas podrían usarse manualmente, sin estructura. | No disponible como campo formal; no ejecutado. |
| D. Registrar intento sin respuesta | Puede guardarse una tarea/evento con texto libre, pero no un intento no contestado normalizado. | Parcial por texto libre; no ejecutado. |
| E. Ver historial y siguiente fecha | Se ve cronología de tarea y eventos/tareas relacionados; no una cronología unificada de interacciones ni sucesión de “siguiente acción” comercial. | Parcial; no ejecutado. |
| F. Registrar llamada espontánea ya realizada | No se encontró flujo claro de interacción pasada con fecha, canal y resultado; evento de calendario está pensado como programado. | Brecha funcional observada; no ejecutado. |
| G. Reasignar seguimiento | Una tarea puede cambiar responsable; cambios de responsable se capturan en actividad de tarea. Para eventos, el usuario propietario no parece editable desde el diálogo contextual. | Tarea soportada en código; evento no comprobado visualmente; no ejecutado. |

## L. Riesgos y pendientes de confirmación

1. **Alta prioridad:** resolver el desfase entre políticas locales y RLS remoto para `tasks`; el remoto conserva las políticas amplias que el fix local elimina.
2. **Alta prioridad:** revisar las políticas amplias `leads_*_company` y determinar si deben coexistir con asignación/rol restringidos.
3. **Funcional:** confirmar si una tarea con fecha basta o si el usuario espera alerta automática; el código actual implementa lo primero.
4. **Funcional:** definir si resultado, intentos, canal, fecha/hora real de contacto y siguiente paso deben ser datos normalizados.
5. **Consistencia:** confirmar si `last_interaction_at` debe actualizarse al registrar interacción; no se halló un mecanismo general y el dato remoto `next_follow_up` no existe.
6. **Operación:** definir responsable, anticipación, zona horaria, canales y ciclo de vida de recordatorios; no se identificó scheduler que actualmente los envíe.
7. **Automatizaciones:** no usar la pantalla de `/automations` como evidencia de configuración activa; el estado observado es local al componente.
8. **Interfaz:** validar en navegador los diálogos y permisos con perfiles reales cuando se autoricen pruebas funcionales; no se crearon registros durante esta auditoría.

## M. Conclusión arquitectónica

El CRM implementa hoy **tareas operativas** y **eventos/recordatorios de calendario** como conceptos separados. “Crear seguimiento” es un atajo para crear una tarea contextual, no un flujo de seguimiento comercial completo. La arquitectura actual puede reutilizar el selector de entidad y responsable, el host global, los paneles de detalle, el historial de tareas y la integración del calendario; sin embargo, el registro de resultado e intentos comerciales y la programación de alertas no están representados como capacidades unificadas.

Para tomar decisiones de producto, primero conviene acordar qué constituye una interacción comercial registrada, cómo se relaciona con prospectos/oportunidades/clientes, qué resultado exige y si un próximo contacto es una fecha de tarea, un evento de calendario o ambos. Para operar con seguridad, hay que resolver los hallazgos RLS por separado: la interfaz no compensa políticas permisivas amplias que continúan instaladas en remoto.

### Método y límites

- Búsqueda estática del código, componentes, rutas, funciones y migraciones relacionadas.
- Consultas `SELECT` a `information_schema.columns` y `pg_policies` del proyecto remoto CorevixBot. No se consultaron datos de negocio.
- No se ejecutaron pruebas automatizadas, llamadas funcionales que escribieran, simulaciones de usuario, migraciones ni cambios de configuración.
- La auditoría no certifica el comportamiento de proveedores externos, despliegue vigente del frontend ni notificaciones fuera del código inspeccionado.
