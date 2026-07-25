begin;

create extension if not exists pgtap with schema extensions;

select plan(20);


-- ============================================================
-- Fixtures: dos compañías completamente separadas
-- ============================================================

insert into public.companies (
  id,
  company_name
)
values
(
  '91000000-0000-0000-0000-000000000001',
  'Multitenant Finance Company A'
),
(
  '91000000-0000-0000-0000-000000000002',
  'Multitenant Finance Company B'
);


insert into public.clients (
  id,
  company_id,
  company_name
)
values
(
  '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'Client A'
),
(
  '92000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000002',
  'Client B'
);


insert into public.projects (
  id,
  company_id,
  name,
  status
)
values
(
  '93000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'Project A',
  'Not Started'
),
(
  '93000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000002',
  'Project B',
  'Not Started'
);


insert into public.invoices (
  id,
  company_id,
  number,
  client_id,
  subtotal,
  tax,
  discount,
  total,
  status,
  date_issued
)
values
(
  '94000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'MT-FK-A-001',
  '92000000-0000-0000-0000-000000000001',
  100,
  0,
  0,
  100,
  'Draft',
  current_date
),
(
  '94000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000002',
  'MT-FK-B-001',
  '92000000-0000-0000-0000-000000000002',
  200,
  0,
  0,
  200,
  'Draft',
  current_date
);


insert into public.payments (
  id,
  company_id,
  invoice_id,
  client_id,
  amount,
  payment_date,
  method,
  status
)
values
(
  '95000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  100,
  current_date,
  'Cash',
  'Pending'
),
(
  '95000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000002',
  '94000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000002',
  200,
  current_date,
  'Cash',
  'Pending'
);


-- ============================================================
-- Las relaciones correctas sí funcionan
-- ============================================================

select lives_ok(
  $$
    insert into public.invoice_items (
      id,
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    )
    values (
      '96000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      '94000000-0000-0000-0000-000000000001',
      'Valid line',
      1,
      100,
      100
    )
  $$,
  'Una línea puede relacionarse con una factura de su compañía'
);

select lives_ok(
  $$
    insert into public.expenses (
      id,
      company_id,
      project_id,
      client_id,
      title,
      amount,
      expense_date,
      status
    )
    values (
      '97000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      '93000000-0000-0000-0000-000000000001',
      '92000000-0000-0000-0000-000000000001',
      'Valid expense',
      50,
      current_date,
      'Pending'
    )
  $$,
  'Un gasto puede relacionarse con proyecto y cliente de su compañía'
);


-- ============================================================
-- Facturas
-- ============================================================

select throws_ok(
  $$
    insert into public.invoices (
      id,
      company_id,
      number,
      client_id,
      subtotal,
      tax,
      discount,
      total,
      status,
      date_issued
    )
    values (
      '94000000-0000-0000-0000-000000000003',
      '91000000-0000-0000-0000-000000000001',
      'MT-FK-CROSS-001',
      '92000000-0000-0000-0000-000000000002',
      10,
      0,
      0,
      10,
      'Draft',
      current_date
    )
  $$,
  '23503',
  null,
  'Una factura no puede usar un cliente de otra compañía'
);


-- ============================================================
-- Líneas de factura
-- ============================================================

select throws_ok(
  $$
    insert into public.invoice_items (
      id,
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    )
    values (
      '96000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      '94000000-0000-0000-0000-000000000002',
      'Cross-company line',
      1,
      10,
      10
    )
  $$,
  '23503',
  null,
  'Una línea no puede usar una factura de otra compañía'
);


-- ============================================================
-- Pagos
-- ============================================================

select throws_ok(
  $$
    insert into public.payments (
      id,
      company_id,
      invoice_id,
      amount,
      payment_date,
      method,
      status
    )
    values (
      '95000000-0000-0000-0000-000000000003',
      '91000000-0000-0000-0000-000000000001',
      '94000000-0000-0000-0000-000000000002',
      10,
      current_date,
      'Cash',
      'Pending'
    )
  $$,
  '23503',
  null,
  'Un pago no puede usar una factura de otra compañía'
);

select throws_ok(
  $$
    insert into public.payments (
      id,
      company_id,
      client_id,
      amount,
      payment_date,
      method,
      status
    )
    values (
      '95000000-0000-0000-0000-000000000004',
      '91000000-0000-0000-0000-000000000001',
      '92000000-0000-0000-0000-000000000002',
      10,
      current_date,
      'Cash',
      'Pending'
    )
  $$,
  '23503',
  null,
  'Un pago no puede usar un cliente de otra compañía'
);


-- ============================================================
-- Movimientos de pago
-- ============================================================

select throws_ok(
  $$
    insert into public.payment_movements (
      id,
      company_id,
      original_payment_id,
      movement_type,
      amount,
      amount_base,
      currency,
      base_currency,
      exchange_rate,
      reason
    )
    values (
      '98000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      '95000000-0000-0000-0000-000000000002',
      'Refund',
      10,
      10,
      'USD',
      'USD',
      1,
      'Cross-company payment'
    )
  $$,
  '23503',
  null,
  'Un movimiento no puede usar un pago de otra compañía'
);

select throws_ok(
  $$
    insert into public.payment_movements (
      id,
      company_id,
      original_payment_id,
      invoice_id,
      movement_type,
      amount,
      amount_base,
      currency,
      base_currency,
      exchange_rate,
      reason
    )
    values (
      '98000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      '95000000-0000-0000-0000-000000000001',
      '94000000-0000-0000-0000-000000000002',
      'Refund',
      10,
      10,
      'USD',
      'USD',
      1,
      'Cross-company invoice'
    )
  $$,
  '23503',
  null,
  'Un movimiento no puede usar una factura de otra compañía'
);


-- ============================================================
-- Notas de crédito
-- ============================================================

select throws_ok(
  $$
    insert into public.credit_notes (
      id,
      company_id,
      credit_note_number,
      invoice_id,
      amount,
      date_issued,
      status
    )
    values (
      '99000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      800001,
      '94000000-0000-0000-0000-000000000002',
      10,
      current_date,
      'Draft'
    )
  $$,
  '23503',
  null,
  'Una nota de crédito no puede usar una factura de otra compañía'
);

select throws_ok(
  $$
    insert into public.credit_notes (
      id,
      company_id,
      credit_note_number,
      client_id,
      amount,
      date_issued,
      status
    )
    values (
      '99000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      800002,
      '92000000-0000-0000-0000-000000000002',
      10,
      current_date,
      'Draft'
    )
  $$,
  '23503',
  null,
  'Una nota de crédito no puede usar un cliente de otra compañía'
);


-- ============================================================
-- Gastos
-- ============================================================

select throws_ok(
  $$
    insert into public.expenses (
      id,
      company_id,
      project_id,
      title,
      amount,
      expense_date,
      status
    )
    values (
      '97000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      '93000000-0000-0000-0000-000000000002',
      'Cross-company project',
      10,
      current_date,
      'Pending'
    )
  $$,
  '23503',
  null,
  'Un gasto no puede usar un proyecto de otra compañía'
);

select throws_ok(
  $$
    insert into public.expenses (
      id,
      company_id,
      client_id,
      title,
      amount,
      expense_date,
      status
    )
    values (
      '97000000-0000-0000-0000-000000000003',
      '91000000-0000-0000-0000-000000000001',
      '92000000-0000-0000-0000-000000000002',
      'Cross-company client',
      10,
      current_date,
      'Pending'
    )
  $$,
  '23503',
  null,
  'Un gasto no puede usar un cliente de otra compañía'
);


-- ============================================================
-- Verificación estructural
-- ============================================================

select is(
  (
    select count(*)
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and convalidated
      and conname in (
        'invoices_client_company_fkey',
        'invoice_items_invoice_company_fkey',
        'payments_invoice_company_fkey',
        'payments_client_company_fkey',
        'payment_movements_payment_company_fkey',
        'payment_movements_invoice_company_fkey',
        'credit_notes_invoice_company_fkey',
        'credit_notes_client_company_fkey',
        'expenses_project_company_fkey',
        'expenses_client_company_fkey'
      )
  ),
  10::bigint,
  'Las diez foreign keys multitenant están validadas'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid = 'public.clients'::regclass
      and conname = 'clients_id_company_id_key'
      and contype = 'u'
  ),
  'clients expone clave única compuesta'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid = 'public.invoices'::regclass
      and conname = 'invoices_id_company_id_key'
      and contype = 'u'
  ),
  'invoices expone clave única compuesta'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid = 'public.payments'::regclass
      and conname = 'payments_id_company_id_key'
      and contype = 'u'
  ),
  'payments expone clave única compuesta'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conrelid = 'public.projects'::regclass
      and conname = 'projects_id_company_id_key'
      and contype = 'u'
  ),
  'projects expone clave única compuesta'
);


-- ============================================================
-- Relaciones opcionales siguen aceptando NULL
-- ============================================================

select lives_ok(
  $$
    insert into public.payments (
      id,
      company_id,
      amount,
      payment_date,
      method,
      status
    )
    values (
      '95000000-0000-0000-0000-000000000005',
      '91000000-0000-0000-0000-000000000001',
      5,
      current_date,
      'Cash',
      'Pending'
    )
  $$,
  'Un pago continúa aceptando factura y cliente nulos'
);

select lives_ok(
  $$
    insert into public.credit_notes (
      id,
      company_id,
      credit_note_number,
      amount,
      date_issued,
      status
    )
    values (
      '99000000-0000-0000-0000-000000000003',
      '91000000-0000-0000-0000-000000000001',
      800003,
      5,
      current_date,
      'Draft'
    )
  $$,
  'Una nota de crédito continúa aceptando referencias nulas'
);

select lives_ok(
  $$
    insert into public.expenses (
      id,
      company_id,
      title,
      amount,
      expense_date,
      status
    )
    values (
      '97000000-0000-0000-0000-000000000004',
      '91000000-0000-0000-0000-000000000001',
      'Expense without references',
      5,
      current_date,
      'Pending'
    )
  $$,
  'Un gasto continúa aceptando proyecto y cliente nulos'
);

select * from finish();

rollback;
