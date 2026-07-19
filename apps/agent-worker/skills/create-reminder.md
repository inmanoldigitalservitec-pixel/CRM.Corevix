# Create Reminder Skill

Tool:
create_reminder

Usa esta skill cuando el usuario quiera crear un recordatorio.

Ejemplos:

- recuérdame llamar a Juan mañana
- ponme un recordatorio para enviar propuesta
- recuérdame revisar ese lead

Formato:
{
"type": "tool_call",
"tool": "create_reminder",
"args": {
"title": "Llamar a Juan Pérez",
"due_date": "YYYY-MM-DD",
"priority": "medium"
}
}
