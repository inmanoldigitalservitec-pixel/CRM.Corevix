# Optional invoice line totals

This migration aligns invoice totals across the editor, invoice save RPC, and estimate-to-invoice conversion.

## Behavior

- Optional lines remain in the invoice with their item, quantity, price, tax rate, currency, and optional flag.
- Optional line amounts and taxes are zero in invoice item snapshots and excluded from header subtotal, tax, and total.
- Required lines continue to contribute to totals.
- Estimate conversion skips the amount-versus-rate consistency check only for optional lines, whose stored amount is intentionally zero, and keeps the estimate's discount and currency snapshots.
- No existing invoice or estimate rows are changed by this migration.

## Deployment note

Review the function definitions against the target project's currently deployed schema and RPCs before applying. This package was prepared from the checked-out CRM schema and the supplied report; the remote Supabase project was not accessible for a live schema check, and this migration has not been applied or executed against production.

Apply this file through the project's normal reviewed Supabase migration process. Do not run it as an ad hoc SQL snippet if the migration history does not contain the prerequisite invoice-line, estimate-line, currency, and discount schema changes.
