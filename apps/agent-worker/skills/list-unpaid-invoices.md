# List Unpaid Invoices Skill

Usa esta skill cuando el usuario quiera ver facturas pendientes o no pagadas.

Tool:
list_unpaid_invoices

Usa esta tool para frases como:

- facturas pendientes
- qué facturas no se han pagado
- muéstrame cobros pendientes
- facturas vencidas
- cuentas por cobrar

Formato tool_call:
{
"type": "tool_call",
"tool": "list_unpaid_invoices",
"args": {}
}

Cuando muestres facturas, incluye:

- Número o ID
- Estado
- Total
- Fecha límite
- Cliente

No modifiques facturas.
No marques facturas como pagadas.
Solo listar y resumir.

Si hay facturas vencidas o próximas a vencer, recomiéndalas para seguimiento.
