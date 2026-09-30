# Fallback for blank invoice item descriptions

This migration adds a `BEFORE INSERT OR UPDATE` trigger on `public.invoice_items`. When an invoice line has no description, the trigger uses its item name, then the generic label `Artículo` as a last resort. This prevents estimate-to-invoice conversion from violating the invoice item's `description NOT NULL` constraint.

The CRM also now saves estimate item descriptions using the entered description, item name, or `Artículo`, in that order.

The trigger does not modify invoice totals or existing rows. It runs for new or updated invoice items, including lines copied during conversion. Apply the migration through the normal reviewed Supabase migration workflow before relying on the database-side fallback. It has not been applied to the remote project in this session.
