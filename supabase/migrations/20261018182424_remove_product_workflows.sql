-- Retire product delivery configuration. Ordinary products and project links remain.
-- The isolated Gauntlet database had no workflow rows or task source links.
-- Stop instead of deleting data if another target still contains this feature's data.
begin;

do $$
declare
  v_has_data boolean;
begin
  if to_regclass('public.product_workflows') is not null then
    execute 'select exists (select 1 from public.product_workflows)' into v_has_data;
    if v_has_data then
      raise exception 'No se pueden retirar workflows mientras existan datos de producto' using errcode = '55000';
    end if;
  end if;

  if to_regclass('public.product_workflow_steps') is not null then
    execute 'select exists (select 1 from public.product_workflow_steps)' into v_has_data;
    if v_has_data then
      raise exception 'No se pueden retirar workflows mientras existan pasos de producto' using errcode = '55000';
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'source_workflow_step_id'
  ) then
    execute 'select exists (select 1 from public.tasks where source_workflow_step_id is not null)' into v_has_data;
    if v_has_data then
      raise exception 'No se pueden retirar workflows mientras existan tareas vinculadas a pasos' using errcode = '55000';
    end if;
  end if;
end;
$$;

-- Keep the paid-invoice integration and its existing API response shape.
-- Tasks are created explicitly in the CRM, so tasks_created is always zero.
create or replace function public.create_project_from_paid_invoice(p_invoice_id uuid)
returns table (project_id uuid, created boolean, tasks_created integer)
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
begin
  if v_user_id is not null then
    select p.company_id into v_company_id
    from public.profiles p
    where p.user_id = v_user_id
    limit 1;

    if v_company_id is null then
      raise exception 'No se pudo detectar company_id' using errcode = 'P0001';
    end if;

    select i.* into v_invoice
    from public.invoices i
    where i.id = p_invoice_id and i.company_id = v_company_id
    limit 1;
  else
    -- Preserve server-side calls made after a confirmed payment.
    select i.* into v_invoice
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

  select pr.* into v_project
  from public.projects pr
  where pr.company_id = v_company_id and pr.invoice_id = v_invoice.id
  order by pr.created_at desc limit 1;
  if v_project.id is not null then
    project_id := v_project.id;
    created := false;
    tasks_created := 0;
    return next;
    return;
  end if;

  if v_invoice.proposal_id is not null then
    select pr.* into v_project
    from public.projects pr
    where pr.company_id = v_company_id and pr.proposal_id = v_invoice.proposal_id
    order by pr.created_at desc limit 1;
    if v_project.id is not null then
      project_id := v_project.id;
      created := false;
      tasks_created := 0;
      return next;
      return;
    end if;

    select p.* into v_proposal
    from public.proposals p
    where p.id = v_invoice.proposal_id and p.company_id = v_company_id
    limit 1;
  end if;

  v_product_id := coalesce(v_invoice.product_id, v_proposal.product_id);
  if v_product_id is not null then
    select pr.name into v_product_name
    from public.products pr
    where pr.id = v_product_id and pr.company_id = v_company_id
    limit 1;
  end if;
  if v_invoice.client_id is not null then
    select c.company_name into v_client_company
    from public.clients c
    where c.id = v_invoice.client_id and c.company_id = v_company_id
    limit 1;
  end if;

  v_client_label := nullif(btrim(coalesce(v_client_company, '')), '');
  if v_client_label is null and v_proposal.id is not null then
    v_client_label := nullif(btrim(coalesce(v_proposal.title, '')), '');
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

  begin
    insert into public.projects (
      company_id, name, client_id, product_id, lead_id, deal_id, budget,
      status, description, invoice_id, proposal_id, created_by, manager
    )
    values (
      v_company_id, v_project_name, v_invoice.client_id, v_product_id,
      v_proposal.lead_id, v_proposal.deal_id, coalesce(v_invoice.total, 0),
      'Not Started', v_proposal.description, v_invoice.id, v_invoice.proposal_id,
      coalesce(v_invoice.created_by, v_proposal.created_by, v_user_id), null
    )
    returning * into v_project;
  exception
    when unique_violation then
      select pr.* into v_project
      from public.projects pr
      where pr.company_id = v_company_id and pr.invoice_id = v_invoice.id
      order by pr.created_at desc limit 1;
      if v_project.id is null then
        raise;
      end if;
      project_id := v_project.id;
      created := false;
      tasks_created := 0;
      return next;
      return;
  end;

  project_id := v_project.id;
  created := true;
  tasks_created := 0;
  perform public.log_activity_event(
    v_project.company_id, 'project_created', 'projects',
    coalesce(v_invoice.created_by, v_proposal.created_by, v_user_id),
    v_project.id, 'Proyecto creado desde factura pagada',
    jsonb_build_object('invoice_id', v_invoice.id, 'proposal_id', v_invoice.proposal_id, 'tasks_created', 0)
  );
  return next;
end;
$$;

revoke all on function public.create_project_from_paid_invoice(uuid) from public, anon;
grant execute on function public.create_project_from_paid_invoice(uuid) to authenticated, service_role;

alter table public.tasks drop constraint if exists tasks_source_workflow_step_id_fkey;
alter table public.tasks drop column if exists source_workflow_step_id;
drop table if exists public.product_workflow_steps;
drop table if exists public.product_workflows;

commit;
