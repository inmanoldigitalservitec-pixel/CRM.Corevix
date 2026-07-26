# Auditoría de fuentes para Reportes

Rama de trabajo: `test/finance-regression-baseline`

Objetivo: mantener la UI actual de Reportes y asegurar que cada módulo del CRM alimente correctamente sus tablas, indicadores y gráficas.

| Reporte | Fuente actual | Estado | Fecha | Montos | Relaciones que faltan revisar | Regla principal |
|---|---|---|---|---|---|---|
| Facturas | `invoice_finance_summary` | Parcial | `date_issued` | `total_base`, `paid_amount_base`, `credit_amount_base`, `balance_due_base` | cliente, factura | Excluir canceladas y reconciliar pagos/reversos con Facturas. |
| Pagos | `payments` | Parcial | `payment_date` | `amount_base`, `amount` | cliente, factura, creador | Sumar cobro neto; separar pendiente, no aplicado, parcial, reembolsado y revertido. |
| Notas de crédito | `credit_notes` | Parcial | `date_issued` | `amount_base`, `amount` | cliente, factura | Excluir anuladas y distinguir emitido, aplicado y saldo disponible. |
| Cotizaciones | `estimates` | Parcial | `date_issued` | `total_base`, `total` | cliente, prospecto, contacto, oportunidad, proyecto, responsable | Resolver documentos creados antes de existir un cliente y sus conversiones. |
| Propuestas | `proposals` | Parcial | `created_at` | `total_base`, `total` | cliente, prospecto, contacto, oportunidad, proyecto, responsable | Mostrar correctamente aceptación, conversión, factura y proyecto derivados. |
| Gastos | `expenses` | Parcial | `expense_date` | `amount_base`, `amount` | proyecto, responsable | Alinear estados válidos con Gastos y no mezclar monedas. |
| Suscripciones | `subscriptions` | Parcial | `start_date` | `amount_base`, `amount` | cliente, responsable | Separar monto de suscripción y MRR según ciclo. |
| Clientes | `clients` | Parcial | `created_at` | derivados de Finanzas | prospecto de origen, responsable, proyectos, última actividad | Usar exactamente los saldos de Cliente 360. |
| Prospectos | `leads` | No conectado | `created_at` | valor estimado u oportunidad | cliente convertido, contacto, oportunidad, responsable, productos de interés | Agregarlo al selector actual sin crear una pantalla nueva. |
| Oportunidades | `deals` | No conectado | `created_at` | valor, valor base, valor ponderado | prospecto, cliente, contacto, responsable, etapa | Conectar Pipeline al panel actual. |
| Proyectos | `projects` | No conectado | `created_at` | presupuesto y valores relacionados | cliente, responsables, facturas, pagos, gastos | Conectar datos existentes sin inventar rentabilidad nueva. |

## Hallazgos del componente actual

`SalesReportCenter` solo carga clientes, facturas y la tabla seleccionada. Su hidratación general resuelve principalmente `client_name` e `invoice_number`. Por eso todavía no puede resolver prospectos, contactos, oportunidades, proyectos ni responsables.

Los filtros de período, estado y búsqueda se aplican en el navegador y las consultas usan un límite fijo de 2,000 filas. Esto debe revisarse después de corregir las conexiones, sin cambiar inicialmente la UI.

Las dos gráficas actuales se conservan, pero su tipo y conjunto de datos deberán depender del reporte seleccionado.

## Orden de conexión

1. Reconciliar Facturas, Pagos y Notas de crédito con las reglas financieras ya auditadas.
2. Conectar Propuestas y Cotizaciones con prospectos, contactos, oportunidades, facturas y proyectos.
3. Enriquecer Clientes con los mismos totales de Cliente 360.
4. Agregar Prospectos, Oportunidades y Proyectos al selector existente.
5. Resolver responsables y productos en todos los reportes aplicables.
6. Ejecutar pruebas de reconciliación módulo por módulo.

## Criterio de aceptación del Paso 1

La matriz debe servir como contrato único para cada conexión: fuente, fecha, campos monetarios, relaciones, estados incluidos/excluidos y regla de moneda. Ningún cálculo nuevo debe duplicar reglas que ya existen en los módulos financieros o en Cliente 360.
