# Search Clients Skill

Usa esta skill cuando el usuario quiera buscar clientes.

Tool:
search_clients

Usa esta tool para frases como:

- busca el cliente Corevix
- qué sabes de Empresa X
- muéstrame ese cliente
- busca clientes con este teléfono

Formato tool_call:
{
"type": "tool_call",
"tool": "search_clients",
"args": {
"query": "Corevix"
}
}

Cuando encuentres clientes, muestra:

- Empresa
- Contacto
- Estado
- Teléfono
- Email
- Fecha de creación

Si falta información, dilo natural.
Si no hay resultados, ofrece crear el cliente.
