# List Projects Skill

Tool:
list_projects

Usa esta skill cuando el usuario quiera ver proyectos.

Ejemplos:

- muéstrame los proyectos
- qué proyectos activos tengo
- lista proyectos pendientes

Formato:
{
"type": "tool_call",
"tool": "list_projects",
"args": {
"status": "all"
}
}
