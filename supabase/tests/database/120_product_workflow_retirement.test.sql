begin;
set local search_path = "$user", public, extensions;

create extension if not exists pgtap with schema extensions;
select plan(14);

select hasnt_table('public', 'product_workflows', 'El catálogo no tiene workflows de producto');
select hasnt_table('public', 'product_workflow_steps', 'El catálogo no tiene pasos de workflow');
select hasnt_column('public', 'tasks', 'source_workflow_step_id', 'Las tareas no dependen de pasos de producto');
select has_column('public', 'tasks', 'order_index', 'Las tareas conservan su orden general');
select has_function('public', 'create_project_from_paid_invoice', array['uuid'], 'Se conserva la integración de factura pagada a proyecto');

-- Fixtures propios de esta suite, retirados por el rollback final.
insert into public.companies (id, company_name)
values ('c2120000-0000-0000-0000-000000000001', 'GAUNTLET-CONT-20261018-RPC Company');
insert into public.clients (id, company_id, company_name)
values ('c3120000-0000-0000-0000-000000000001', 'c2120000-0000-0000-0000-000000000001', 'GAUNTLET-CONT-20261018-RPC Client');
insert into public.products (id, company_id, name, type, base_price, currency)
values ('c4120000-0000-0000-0000-000000000001', 'c2120000-0000-0000-0000-000000000001', 'GAUNTLET-CONT-20261018-RPC Product', 'service', 1000, 'DOP');
insert into public.invoices (id, company_id, number, client_id, product_id, subtotal, total, status)
values ('c5120000-0000-0000-0000-000000000001', 'c2120000-0000-0000-0000-000000000001', 'GAUNTLET-CONT-20261018-RPC-INV', 'c3120000-0000-0000-0000-000000000001', 'c4120000-0000-0000-0000-000000000001', 1000, 1000, 'Paid');

-- Reproduce el invocador de servidor: no hay usuario de navegador asociado.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
create temporary table fixture_first_project on commit drop as
select * from public.create_project_from_paid_invoice('c5120000-0000-0000-0000-000000000001');

select ok((select project_id is not null and created from fixture_first_project), 'Una factura pagada con producto comercial crea el proyecto sin configuración adicional');
select is((select tasks_created from fixture_first_project), 0, 'El RPC no genera tareas automáticamente');
select results_eq(
  $$select invoice_id, product_id, client_id, budget from public.projects where id = (select project_id from fixture_first_project)$$,
  $$values ('c5120000-0000-0000-0000-000000000001'::uuid, 'c4120000-0000-0000-0000-000000000001'::uuid, 'c3120000-0000-0000-0000-000000000001'::uuid, 1000::numeric)$$,
  'El proyecto conserva factura, producto, cliente y presupuesto'
);
select is((select count(*)::integer from public.tasks where related_project_id = (select project_id from fixture_first_project)), 0, 'El proyecto empieza sin tareas inventadas desde el producto');
select results_eq(
  $$select * from public.create_project_from_paid_invoice('c5120000-0000-0000-0000-000000000001')$$,
  $$select project_id, false, 0 from fixture_first_project$$,
  'Reintentar devuelve el mismo proyecto sin crear tareas ni duplicados'
);
select is((select count(*)::integer from public.projects where invoice_id = 'c5120000-0000-0000-0000-000000000001'), 1, 'La factura conserva exactamente un proyecto');
select ok(not has_function_privilege('anon', 'public.create_project_from_paid_invoice(uuid)', 'EXECUTE'), 'El RPC no permite llamadas anónimas');
select ok(has_function_privilege('authenticated', 'public.create_project_from_paid_invoice(uuid)', 'EXECUTE'), 'La sesión autenticada conserva acceso al RPC');
select ok(has_function_privilege('service_role', 'public.create_project_from_paid_invoice(uuid)', 'EXECUTE'), 'El invocador del servidor conserva acceso al RPC');

select * from finish();
rollback;
