begin;

create extension if not exists pgtap;

select plan(13);

insert into public.companies (
  id,
  company_name
)
values (
  '71000000-0000-0000-0000-000000000001',
  'Issued Invoice Lock Company'
);

insert into public.clients (
  id,
  company_id,
  company_name
)
values (
  '72000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'Issued Invoice Lock Client'
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
  date_issued,
  due_date
)
values
(
  '73000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'INV-LOCK-DRAFT',
  '72000000-0000-0000-0000-000000000001',
  100,
  0,
  0,
  100,
  'Draft',
  current_date,
  current_date + 30
),
(
  '73000000-0000-0000-0000-000000000002',
  '71000000-0000-0000-0000-000000000001',
  'INV-LOCK-SENT',
  '72000000-0000-0000-0000-000000000001',
  200,
  0,
  0,
  200,
  'Draft',
  current_date,
  current_date + 30
),
(
  '73000000-0000-0000-0000-000000000003',
  '71000000-0000-0000-0000-000000000001',
  'INV-LOCK-PAID',
  '72000000-0000-0000-0000-000000000001',
  300,
  0,
  0,
  300,
  'Draft',
  current_date,
  current_date + 30
);

insert into public.invoice_items (
  id,
  company_id,
  invoice_id,
  description,
  quantity,
  unit_price,
  total
)
values
(
  '74000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000001',
  'Draft line',
  1,
  100,
  100
),
(
  '74000000-0000-0000-0000-000000000002',
  '71000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000002',
  'Sent line',
  1,
  200,
  200
),
(
  '74000000-0000-0000-0000-000000000003',
  '71000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000003',
  'Paid line',
  1,
  300,
  300
);

-- Las líneas se crean mientras las facturas están en Draft.
-- Luego se simulan documentos ya emitidos o pagados.
update public.invoices
set status = 'Sent'
where id = '73000000-0000-0000-0000-000000000002';

update public.invoices
set
  status = 'Paid',
  paid_at = now()
where id = '73000000-0000-0000-0000-000000000003';

select lives_ok(
  $$
    update public.invoices
    set
      subtotal = 125,
      total = 125
    where id = '73000000-0000-0000-0000-000000000001'
  $$,
  'Draft permite modificar importes'
);

select lives_ok(
  $$
    update public.invoice_items
    set
      quantity = 2,
      total = 200
    where id = '74000000-0000-0000-0000-000000000001'
  $$,
  'Draft permite modificar líneas'
);

select throws_ok(
  $$
    update public.invoices
    set subtotal = 250
    where id = '73000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'La factura emitida no permite modificar campos financieros. Use una nota de crédito, anulación o nueva factura.',
  'Sent bloquea subtotal'
);

select throws_ok(
  $$
    update public.invoices
    set discount = 10
    where id = '73000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'La factura emitida no permite modificar campos financieros. Use una nota de crédito, anulación o nueva factura.',
  'Sent bloquea descuento'
);

select throws_ok(
  $$
    update public.invoices
    set currency = case
      when currency = 'USD' then 'DOP'
      else 'USD'
    end
    where id = '73000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'La factura emitida no permite modificar campos financieros. Use una nota de crédito, anulación o nueva factura.',
  'Sent bloquea moneda'
);

select throws_ok(
  $$
    update public.invoices
    set client_id = null
    where id = '73000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'La factura emitida no permite modificar campos financieros. Use una nota de crédito, anulación o nueva factura.',
  'Sent bloquea cliente'
);

select throws_ok(
  $$
    update public.invoice_items
    set unit_price = 225
    where id = '74000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'Las líneas de una factura emitida no pueden modificarse ni eliminarse.',
  'Sent bloquea precio de línea'
);

select throws_ok(
  $$
    delete from public.invoice_items
    where id = '74000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'Las líneas de una factura emitida no pueden modificarse ni eliminarse.',
  'Sent bloquea eliminación de líneas'
);

select throws_ok(
  $$
    insert into public.invoice_items (
      company_id,
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    )
    values (
      '71000000-0000-0000-0000-000000000001',
      '73000000-0000-0000-0000-000000000002',
      'Illegal sent line',
      1,
      50,
      50
    )
  $$,
  '55000',
  'No pueden agregarse líneas a una factura emitida.',
  'Sent bloquea nuevas líneas'
);

select throws_ok(
  $$
    update public.invoices
    set total = 1
    where id = '73000000-0000-0000-0000-000000000003'
  $$,
  '55000',
  'La factura emitida no permite modificar campos financieros. Use una nota de crédito, anulación o nueva factura.',
  'Paid bloquea el total'
);

select lives_ok(
  $$
    update public.invoices
    set viewed_at = now()
    where id = '73000000-0000-0000-0000-000000000002'
  $$,
  'Sent permite actualizar viewed_at'
);

select lives_ok(
  $$
    update public.invoices
    set status = 'Partially Paid'
    where id = '73000000-0000-0000-0000-000000000002'
  $$,
  'El bloqueo financiero no impide transiciones operativas de estado'
);

select throws_ok(
  $$
    update public.invoice_items
    set description = 'Illegal change'
    where id = '74000000-0000-0000-0000-000000000002'
  $$,
  '55000',
  'Las líneas de una factura emitida no pueden modificarse ni eliminarse.',
  'Partially Paid mantiene bloqueadas las líneas'
);

select * from finish();

rollback;
