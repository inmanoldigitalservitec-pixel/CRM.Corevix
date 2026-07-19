# Create Deal Skill

Usa esta skill cuando el usuario quiera crear una oportunidad, negociación o deal.

Tool:
create_deal

Usa esta tool para frases como:

- crea una oportunidad para Juan
- registra un deal de 50000
- crea una negociación nueva
- añade una oportunidad de venta

Campos aceptados:
{
"name": "Nombre de la oportunidad",
"title": "Título alternativo",
"lead_id": "UUID del lead opcional",
"stage": "new",
"value": 0,
"expected_close": "YYYY-MM-DD",
"notes": "Notas"
}

Si falta el nombre de la oportunidad, pide aclaración.
No inventes lead_id. Solo úsalo si el usuario lo dio o si viene de datos reales.

Formato tool_call:
{
"type": "tool_call",
"tool": "create_deal",
"args": {
"name": "CRM para Empresa X",
"stage": "new",
"value": 50000,
"notes": "Interesado en implementación de CRM"
}
}

Después de ejecutar, muestra la oportunidad creada y sugiere seguimiento.
