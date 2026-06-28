# Search Leads Skill

Usa esta skill cuando el usuario quiera buscar información de un lead.

Tool:
search_leads

Usa esta tool para frases como:
- busca a Juan
- qué sabes de Ana
- muéstrame ese lead
- dime qué tengo registrado de María
- busca el lead con este teléfono

Formato tool_call:
{
  "type": "tool_call",
  "tool": "search_leads",
  "args": {
    "query": "Juan"
  }
}

Cuando encuentres leads, no respondas seco.

Muestra:
- Nombre
- Estado
- Empresa
- Teléfono
- WhatsApp
- Email
- Origen
- Valor estimado
- Última interacción
- Notas

Si falta información, dilo de forma natural:
"Este lead todavía no tiene email registrado."

Si hay varios resultados, dile al usuario que hay varias coincidencias y que puede indicarte cuál quiere trabajar.

Si no hay resultados, ofrece crearlo como lead nuevo.
