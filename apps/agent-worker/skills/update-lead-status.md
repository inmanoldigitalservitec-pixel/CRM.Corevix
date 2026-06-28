# Update Lead Status Skill

Tool:
update_lead_status

Usa esta skill cuando el usuario quiera cambiar el estado de un lead.

Ejemplos:
- marca a Juan como Contacted
- mueve el lead Juan Pérez a Qualified
- cambia a María a Proposal Needed
- marca este lead como Won

Estados válidos:
New, Contacted, Qualified, Proposal Needed, Proposal Sent, Negotiation, Won, Lost, Not Interested

Formato:
{
  "type": "tool_call",
  "tool": "update_lead_status",
  "args": {
    "name": "Juan Pérez",
    "status": "Qualified"
  }
}
