-- Link paid invoices -> projects -> tasks generated from product workflows.
-- Safe migration: adds only missing columns/constraints/indexes and introduces an RPC (SECURITY DEFINER).

-- -----------------------------------------------------------------------------
-- Extend projects for invoice/proposal/product linkage
-- -----------------------------------------------------------------------------
alter table if exists public.projects
  add column if not exists invoice_id uuid null,
  add column if not exists proposal_id uuid null,
  add column if not exists product_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_invoice_id_fkey') then
    alter table public.projects
      add constraint projects_invoice_id_fkey
      foreign key (invoice_id) references public.invoices(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_proposal_id_fkey') then
    alter table public.projects
      add constraint projects_proposal_id_fkey
      foreign key (proposal_id) references public.proposals(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_product_id_fkey') then
    alter table public.projects
      add constraint projects_product_id_fkey
      foreign key (product_id) references public.products(id) on delete set null;
  end if;
end $$;

create index if not exists idx_projects_invoice_id on public.projects(company_id, invoice_id);
create index if not exists idx_projects_proposal_id on public.projects(company_id, proposal_id);

-- -----------------------------------------------------------------------------
-- Extend tasks for ordering + workflow source reference
-- -----------------------------------------------------------------------------
alter table if exists public.tasks
  add column if not exists order_index integer null,
  add column if not exists source_workflow_step_id uuid null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_source_workflow_step_id_fkey') then
    alter table public.tasks
      add constraint tasks_source_workflow_step_id_fkey
      foreign key (source_workflow_step_id) references public.product_workflow_steps(id) on delete set null;
  end if;
end $$;

create index if not exists idx_tasks_related_project_order on public.tasks(company_id, related_project_id, order_index);

-- -----------------------------------------------------------------------------
-- RPC: Create a project (and workflow tasks) from a PAID invoice (idempotent)
-- -----------------------------------------------------------------------------
create or replace function public.create_project_from_paid_invoice(
  p_invoice_id uuid
)
returns table (
  project_id uuid,
  created boolean,
  tasks_created integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_invoice public.invoices%rowtype;
  v_proposal public.proposals%rowtype;
  v_project public.projects%rowtype;
  v_product_name text;
  v_client_company text;
  v_client_person text;
  v_client_label text;
  v_project_name text;
  v_workflow_id uuid;
  v_due_date date;
  v_cumulative_days integer := 0;
  v_task_count integer := 0;
  v_priority text;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  select p.company_id
    into v_company_id
  from public.profiles p
  where p.user_id = v_user_id
  limit 1;

  if v_company_id is null then
    raise exception 'No se pudo detectar company_id' using errcode = 'P0001';
  end if;

  select i.*
    into v_invoice
  from public.invoices i
  where i.id = p_invoice_id
    and i.company_id = v_company_id
  limit 1;

  if v_invoice.id is null then
    raise exception 'No se encontró la factura' using errcode = 'P0002';
  end if;

  if coalesce(v_invoice.status::text, '') <> 'Paid' then
    raise exception 'La factura no está pagada' using errcode = '22023';
  end if;

  -- Idempotency: reuse existing project
  select pr.*
    into v_project
  from public.projects pr
  where pr.company_id = v_company_id
    and (
      (pr.invoice_id is not null and pr.invoice_id = v_invoice.id)
      or (v_invoice.proposal_id is not null and pr.proposal_id = v_invoice.proposal_id)
    )
  order by pr.created_at desc
  limit 1;

  if v_project.id is not null then
    project_id := v_project.id;
    created := false;
    tasks_created := 0;
    return next;
    return;
  end if;

  -- Proposal (optional)
  if v_invoice.proposal_id is not null then
    select p.*
      into v_proposal
    from public.proposals p
    where p.id = v_invoice.proposal_id
      and p.company_id = v_company_id
    limit 1;
  end if;

  -- Product name (optional)
  if v_invoice.product_id is not null then
    select pr.name
      into v_product_name
    from public.products pr
    where pr.id = v_invoice.product_id
      and pr.company_id = v_company_id
    limit 1;
  end if;

  -- Client label: clients table if present, else proposal.proposal_data fallback
  if v_invoice.client_id is not null then
    select c.company_name, c.contact_person
      into v_client_company, v_client_person
    from public.clients c
    where c.id = v_invoice.client_id
      and c.company_id = v_company_id
    limit 1;
  end if;

  v_client_label := nullif(btrim(coalesce(v_client_company, '')), '');
  if v_client_label is null and v_proposal.id is not null then
    v_client_label := nullif(btrim(coalesce(v_proposal.proposal_data->>'companyName', v_proposal.proposal_data->>'clientName', '')), '');
  end if;
  if v_client_label is null then
    v_client_label := 'Cliente';
  end if;

  -- Project name: product.name + " - " + clientName, fallback proposal.title
  if v_product_name is not null and btrim(v_product_name) <> '' then
    v_project_name := v_product_name || ' - ' || v_client_label;
  elsif v_proposal.title is not null and btrim(v_proposal.title) <> '' then
    v_project_name := v_proposal.title;
  else
    v_project_name := 'Proyecto ' || coalesce(v_invoice.number, '');
  end if;

  insert into public.projects (
    company_id,
    name,
    client_id,
    product_id,
    lead_id,
    deal_id,
    budget,
    status,
    description,
    invoice_id,
    proposal_id,
    created_by,
    manager
  )
  values (
    v_company_id,
    v_project_name,
    v_invoice.client_id,
    v_invoice.product_id,
    v_proposal.lead_id,
    v_proposal.deal_id,
    coalesce(v_invoice.total, 0),
    'Not Started',
    v_proposal.description,
    v_invoice.id,
    v_invoice.proposal_id,
    v_user_id,
    null
  )
  returning *
  into v_project;

  -- Pick active workflow for the product (if any)
  if v_invoice.product_id is not null then
    select w.id
      into v_workflow_id
    from public.product_workflows w
    where w.company_id = v_company_id
      and w.product_id = v_invoice.product_id
      and w.is_active = true
    order by w.created_at desc
    limit 1;
  end if;

  if v_workflow_id is not null then
    -- Insert tasks with deterministic ordering/due dates
    insert into public.tasks (
      company_id,
      title,
      description,
      status,
      priority,
      due_date,
      related_project_id,
      related_client_id,
      related_lead_id,
      related_deal_id,
      assigned_to,
      order_index,
      source_workflow_step_id,
      created_by
    )
    select
      v_company_id,
      s.title,
      s.description,
      'To Do',
      case
        when lower(coalesce(s.default_priority, '')) in ('low','medium','high','urgent')
          then initcap(lower(s.default_priority))
        else
          'Medium'
      end::public.task_priority,
      (current_date + (sum(coalesce(s.default_duration_days, 1)) over (order by s.step_order rows between unbounded preceding and current row)))::date,
      v_project.id,
      v_invoice.client_id,
      v_proposal.lead_id,
      v_proposal.deal_id,
      null,
      s.step_order,
      s.id,
      v_user_id
    from public.product_workflow_steps s
    where s.company_id = v_company_id
      and s.workflow_id = v_workflow_id
      and s.is_active = true
    order by s.step_order asc;

    get diagnostics v_task_count = row_count;
  end if;

  project_id := v_project.id;
  created := true;
  tasks_created := coalesce(v_task_count, 0);
  return next;
end;
$$;

revoke all on function public.create_project_from_paid_invoice(uuid) from public;
grant execute on function public.create_project_from_paid_invoice(uuid) to authenticated;
