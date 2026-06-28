# List Tasks Skill

Usa esta skill cuando el usuario quiera ver tareas pendientes, completadas o todas.

Tool:
list_tasks

Usa esta tool para frases como:
- qué tareas tengo pendientes
- muéstrame mis tareas
- qué tengo para hoy
- lista las tareas abiertas
- dime las tareas completadas

Campos aceptados:
{
  "status": "pending | completed | all"
}

Si el usuario no especifica estado, usa pending.

Formato tool_call:
{
  "type": "tool_call",
  "tool": "list_tasks",
  "args": {
    "status": "pending"
  }
}

Cuando muestres tareas, no respondas solo con el conteo.

Muestra:
- Título
- Prioridad
- Fecha límite
- Estado
- Descripción si existe

Si hay tareas con prioridad high, menciónalas como recomendación de enfoque.

Respuesta esperada:
Tienes 3 tareas pendientes. Te las dejo organizadas:

1. Llamar a Juan Pérez
- Prioridad: medium
- Fecha límite: 2026-06-29
- Estado: pending

La tarea más urgente parece ser “Enviar propuesta a María” por prioridad alta.
