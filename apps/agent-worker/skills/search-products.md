# Search Products Skill

Tool:
search_products

Usa esta skill cuando el usuario quiera buscar servicios o productos del CRM.

Ejemplos:

- busca productos de CRM
- qué servicios tengo disponibles
- muéstrame productos activos
- busca website

Formato:
{
"type": "tool_call",
"tool": "search_products",
"args": {
"query": "CRM"
}
}
