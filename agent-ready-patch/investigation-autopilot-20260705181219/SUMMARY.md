# Investigación Autopilot Widget Execution

Revisar en este orden:

1. `04-widget-buttons-and-selected-plan.md`
   - Identificar qué hace “Resolver con Autopilot”.
   - Identificar qué hace “Actualizar ahora”.

2. `05-plan-steps-usage-frontend.md`
   - Ver si `plan_steps` llega al frontend.
   - Ver si se renderiza o se pierde en adapter/componente.

3. `08-agent-payload-adapter-full.md`
   - Confirmar mapping:
     - recovery_plans[].plan_steps
     - recommended_steps
     - actions
     - requires_confirmation

4. `13-worker-chat-openclaw-flow.md`
   - Reutilizar flujo actual de OpenClaw.
   - No crear integración nueva.

5. `14-worker-tool-execution-flow.md` y `15-worker-tool-execution-details-index.md`
   - Ver cómo se detectan tool calls.
   - Ver cómo se ejecutan tools.
   - Definir cómo enviar un plan seleccionado a ese mismo flujo.

6. `16-worker-contract-builder.md`
   - Confirmar estructura final de recovery_plan.

Objetivo del próximo patch:

- Mostrar bullets del plan en el widget.
- Mantener botón principal como “Resolver con Autopilot”.
- Revisar/decidir si “Actualizar ahora” queda como refresh secundario.
- Crear o conectar ruta para ejecutar el recovery_plan seleccionado usando el mismo sistema de `/agent/chat`.
