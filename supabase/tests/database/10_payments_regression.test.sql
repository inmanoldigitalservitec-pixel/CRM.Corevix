begin;

create extension if not exists pgtap with schema extensions;

-- Esta primera versión valida que la infraestructura pgTAP funciona.
-- Los fixtures financieros completos se agregarán en el siguiente bloque de trabajo.
select plan(8);

select has_table(
  'public',
  'invoices',
  'Existe public.invoices'
);

select has_table(
  'public',
  'payments',
  'Existe public.payments'
);

select has_table(
  'public',
  'credit_notes',
  'Existe public.credit_notes'
);

select has_view(
  'public',
  'invoice_finance_summary',
  'Existe public.invoice_finance_summary'
);

select has_function(
  'public',
  'register_invoice_payment',
  array['uuid','numeric','date','text','text','text','text','uuid','text','text','text'],
  'Existe register_invoice_payment con la firma esperada'
);

select has_function(
  'public',
  'save_invoice_with_items',
  array['uuid','jsonb','jsonb'],
  'Existe save_invoice_with_items con la firma esperada'
);

select has_function(
  'public',
  'enforce_invoice_payment_balance',
  array[]::text[],
  'Existe el trigger function de protección de saldo'
);

select col_type_is(
  'public',
  'payments',
  'amount',
  'numeric',
  'payments.amount conserva el tipo numeric'
);

select * from finish();

rollback;
