# Create Project Skill

Tool:
create_project

Usa esta skill cuando el usuario quiera crear un proyecto real de trabajo.

Ejemplos:

- crea un proyecto para implementar CRM a Juan
- crea un proyecto de website para este cliente
- inicia el proyecto de automatización

Formato:
{
"type": "tool_call",
"tool": "create_project",
"args": {
"name": "Implementación CRM Juan Pérez",
"description": "Proyecto creado desde Corevix AI",
"budget": 50000,
"priority": "medium"
}
}
