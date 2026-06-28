# Create CRM Demo Skill

Tool:
create_crm_demo

Usa esta skill cuando el usuario quiera agendar o preparar una demo del CRM.

Ejemplos:
- agenda una demo del CRM con Juan mañana
- crea una demo para este prospecto
- pon una tarea de demo CRM para María

Formato:
{
  "type": "tool_call",
  "tool": "create_crm_demo",
  "args": {
    "lead_name": "Juan Pérez",
    "due_date": "YYYY-MM-DD",
    "phone": "8291234567"
  }
}
