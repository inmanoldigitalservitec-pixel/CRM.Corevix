-- Enforce tenant consistency in critical financial relationships.
--
-- Existing single-column foreign keys remain in place to preserve their
-- historical names and compatibility. Composite foreign keys ensure that
-- referenced records belong to the same company as the child record.

-- ============================================================
-- Composite candidate keys on parent tables
-- ============================================================

alter table public.clients
  add constraint clients_id_company_id_key
  unique (id, company_id);

alter table public.invoices
  add constraint invoices_id_company_id_key
  unique (id, company_id);

alter table public.payments
  add constraint payments_id_company_id_key
  unique (id, company_id);

alter table public.projects
  add constraint projects_id_company_id_key
  unique (id, company_id);


-- ============================================================
-- Invoice ownership
-- ============================================================

alter table public.invoices
  add constraint invoices_client_company_fkey
  foreign key (client_id, company_id)
  references public.clients (id, company_id)
  on update no action
  on delete set null (client_id)
  not valid;

alter table public.invoice_items
  add constraint invoice_items_invoice_company_fkey
  foreign key (invoice_id, company_id)
  references public.invoices (id, company_id)
  on update no action
  on delete cascade
  not valid;


-- ============================================================
-- Payment ownership
-- ============================================================

alter table public.payments
  add constraint payments_invoice_company_fkey
  foreign key (invoice_id, company_id)
  references public.invoices (id, company_id)
  on update no action
  on delete set null (invoice_id)
  not valid;

alter table public.payments
  add constraint payments_client_company_fkey
  foreign key (client_id, company_id)
  references public.clients (id, company_id)
  on update no action
  on delete set null (client_id)
  not valid;


-- ============================================================
-- Payment movement ownership
-- ============================================================

alter table public.payment_movements
  add constraint payment_movements_payment_company_fkey
  foreign key (original_payment_id, company_id)
  references public.payments (id, company_id)
  on update no action
  on delete restrict
  not valid;

alter table public.payment_movements
  add constraint payment_movements_invoice_company_fkey
  foreign key (invoice_id, company_id)
  references public.invoices (id, company_id)
  on update no action
  on delete restrict
  not valid;


-- ============================================================
-- Credit-note ownership
-- ============================================================

alter table public.credit_notes
  add constraint credit_notes_invoice_company_fkey
  foreign key (invoice_id, company_id)
  references public.invoices (id, company_id)
  on update no action
  on delete set null (invoice_id)
  not valid;

alter table public.credit_notes
  add constraint credit_notes_client_company_fkey
  foreign key (client_id, company_id)
  references public.clients (id, company_id)
  on update no action
  on delete set null (client_id)
  not valid;


-- ============================================================
-- Expense ownership
-- ============================================================

alter table public.expenses
  add constraint expenses_project_company_fkey
  foreign key (project_id, company_id)
  references public.projects (id, company_id)
  on update no action
  on delete set null (project_id)
  not valid;

alter table public.expenses
  add constraint expenses_client_company_fkey
  foreign key (client_id, company_id)
  references public.clients (id, company_id)
  on update no action
  on delete set null (client_id)
  not valid;


-- ============================================================
-- Existing data was audited before this migration.
-- Validate the new constraints explicitly.
-- ============================================================

alter table public.invoices
  validate constraint invoices_client_company_fkey;

alter table public.invoice_items
  validate constraint invoice_items_invoice_company_fkey;

alter table public.payments
  validate constraint payments_invoice_company_fkey;

alter table public.payments
  validate constraint payments_client_company_fkey;

alter table public.payment_movements
  validate constraint payment_movements_payment_company_fkey;

alter table public.payment_movements
  validate constraint payment_movements_invoice_company_fkey;

alter table public.credit_notes
  validate constraint credit_notes_invoice_company_fkey;

alter table public.credit_notes
  validate constraint credit_notes_client_company_fkey;

alter table public.expenses
  validate constraint expenses_project_company_fkey;

alter table public.expenses
  validate constraint expenses_client_company_fkey;
