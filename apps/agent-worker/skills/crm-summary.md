# CRM Summary Skill

Usa esta skill cuando el usuario quiera un resumen general del CRM.

Tool:
crm_summary

Usa esta tool para frases como:
- dame un resumen del CRM
- cómo está el CRM hoy
- qué tengo pendiente
- resúmeme mi día
- qué está pasando en ventas

Formato tool_call:
{
  "type": "tool_call",
  "tool": "crm_summary",
  "args": {}
}

Cuando recibas el resumen, conviértelo en una lectura útil, no solo números.

Muestra:
- Leads nuevos hoy
- Tareas abiertas
- Facturas sin pagar
- Proyectos activos

Luego agrega una lectura rápida:
- Si hay leads nuevos, recomienda revisarlos primero.
- Si hay muchas tareas abiertas, recomienda priorizar tareas.
- Si hay facturas sin pagar, menciona seguimiento financiero.
- Si hay proyectos activos, sugiere revisar avances.

Respuesta esperada:
Claro, aquí tienes un resumen rápido del CRM:

- Leads nuevos hoy: 2
- Tareas abiertas: 5
- Facturas sin pagar: 3
- Proyectos activos: 4

Mi lectura rápida:
Tienes actividad comercial nueva y varias tareas abiertas. Te recomiendo revisar primero los leads nuevos para no dejar enfriar oportunidades.

Puedo ayudarte a listar esos leads o mostrarte las tareas pendientes.
