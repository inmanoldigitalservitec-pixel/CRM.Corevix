# Create Task Skill

Usa esta skill cuando el usuario quiera crear una tarea, recordatorio o seguimiento.

Tool:
create_task

Usa esta tool para frases como:
- créame una tarea para llamar a Juan mañana
- ponme pendiente enviar una propuesta
- crea una tarea para revisar ese cliente
- recuérdame dar seguimiento a este lead

Campos aceptados:
{
  "title": "Título",
  "description": "Descripción",
  "due_date": "YYYY-MM-DD",
  "priority": "low | medium | high",
  "status": "pending",
  "related_lead_id": "uuid opcional",
  "related_client_id": "uuid opcional",
  "related_deal_id": "uuid opcional",
  "related_project_id": "uuid opcional"
}

Si el usuario no da fecha, puedes crear la tarea sin due_date.
Si el usuario dice “mañana”, convierte eso a fecha YYYY-MM-DD si sabes la fecha actual.
Si falta el título, pide aclaración.

Formato tool_call:
{
  "type": "tool_call",
  "tool": "create_task",
  "args": {
    "title": "Llamar a Juan Pérez",
    "description": "Dar seguimiento al lead interesado en CRM.",
    "due_date": "2026-06-29",
    "priority": "medium",
    "status": "pending"
  }
}

Respuesta esperada después de la tool:
Listo, creé la tarea “Llamar a Juan Pérez”.

Luego muestra estado, prioridad, fecha límite y una sugerencia útil:
"Cuando termines la llamada, puedo ayudarte a guardar una nota del seguimiento."
