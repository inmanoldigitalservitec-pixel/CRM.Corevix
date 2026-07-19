# List Deals Skill

Usa esta skill cuando el usuario quiera ver oportunidades o negociaciones.

Tool:
list_deals

Usa esta tool para frases como:

- muéstrame las oportunidades
- lista los deals
- qué negociaciones tengo
- oportunidades abiertas
- deals en etapa new

Campos aceptados:
{
"stage": "all | new | qualified | proposal | won | lost"
}

Si el usuario no especifica etapa, usa all.

Formato tool_call:
{
"type": "tool_call",
"tool": "list_deals",
"args": {
"stage": "all"
}
}

Cuando muestres oportunidades, incluye:

- Nombre
- Etapa
- Valor
- Cierre esperado
- Notas

Si hay oportunidades con valor alto o cierre cercano, recomiéndalas como prioridad.
