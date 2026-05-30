-- Ensure workflow-generated tasks never set assigned_to to an invalid FK value.
-- Keep assigned_to = null until role-to-user mapping is implemented.

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
  v_product_id uuid;
  v_product_name text;
  v_client_company text;
  v_client_label text;
  v_project_name text;
  v_task_count integer := 0;
begin
  if v_user_id is not null then
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
  else
    select i.*
      into v_invoice
    from public.invoices i
    where i.id = p_invoice_id
    limit 1;

    v_company_id := v_invoice.company_id;
  end if;

  if v_invoice.id is null then
    raise exception 'No se encontró la factura' using errcode = 'P0002';
  end if;

  if coalesce(v_invoice.status::text, '') <> 'Paid' then
    raise exception 'La factura no está pagada' using errcode = '22023';
  end if;

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

  if v_invoice.proposal_id is not null then
    select p.*
      into v_proposal
    from public.proposals p
    where p.id = v_invoice.proposal_id
      and p.company_id = v_company_id
    limit 1;
  end if;

  v_product_id := coalesce(v_invoice.product_id, v_proposal.product_id);

  if v_product_id is not null then
    select pr.name
      into v_product_name
    from public.products pr
    where pr.id = v_product_id
      and pr.company_id = v_company_id
    limit 1;
  end if;

  if v_invoice.client_id is not null then
    select c.company_name
      into v_client_company
    from public.clients c
    where c.id = v_invoice.client_id
      and c.company_id = v_company_id
    limit 1;
  end if;

  v_client_label := nullif(btrim(coalesce(v_client_company, '')), '');
  if v_client_label is null and v_proposal.id is not null then
    v_client_label := nullif(
      btrim(coalesce(v_proposal.proposal_data->>'companyName', v_proposal.proposal_data->>'clientName', '')),
      ''
    );
  end if;
  if v_client_label is null then
    v_client_label := 'Cliente';
  end if;

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
    v_product_id,
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

  if v_product_id is null then
    project_id := v_project.id;
    created := true;
    tasks_created := 0;
    return next;
    return;
  end if;

  insert into public.tasks (
    company_id,
    title,
    description,
    status,
    priority,
    assigned_to,
    due_date,
    related_project_id,
    related_client_id,
    related_lead_id,
    related_deal_id,
    order_index,
    source_workflow_step_id,
    created_by
  )
  select
    v_invoice.company_id,
    s.title,
    s.description,
    'To Do',
    case
      when lower(coalesce(s.default_priority, '')) in ('low', 'medium', 'high', 'urgent')
        then initcap(lower(s.default_priority))
      else
        'Medium'
    end::public.task_priority,
    null,
    (current_date + (sum(coalesce(s.default_duration_days, 0)) over (
      order by s.step_order
      rows between unbounded preceding and current row
    )))::date,
    v_project.id,
    v_invoice.client_id,
    v_proposal.lead_id,
    v_proposal.deal_id,
    s.step_order,
    s.id,
    v_user_id
  from public.product_workflow_steps s
  where s.company_id = v_company_id
    and s.product_id = v_product_id
    and s.is_active = true
  order by s.step_order asc;

  get diagnostics v_task_count = row_count;

  project_id := v_project.id;
  created := true;
  tasks_created := coalesce(v_task_count, 0);
  return next;
end;
$$;

revoke all on function public.create_project_from_paid_invoice(uuid) from public;
grant execute on function public.create_project_from_paid_invoice(uuid) to authenticated;

