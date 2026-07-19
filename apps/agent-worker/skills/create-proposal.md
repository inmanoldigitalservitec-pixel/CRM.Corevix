# Create Proposal Skill

Tool:
create_proposal

Usa esta skill cuando el usuario quiera crear una propuesta.

Ejemplos:

- crea una propuesta para Juan por 1500 dólares
- prepara propuesta de CRM para este lead
- haz una propuesta válida por 15 días

Formato:
{
"type": "tool_call",
"tool": "create_proposal",
"args": {
"title": "Propuesta CRM para Juan Pérez",
"amount": 1500,
"currency": "USD",
"description": "Implementación CRM"
}
}
