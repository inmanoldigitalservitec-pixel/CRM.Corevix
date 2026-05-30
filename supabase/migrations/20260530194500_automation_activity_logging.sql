-- Add internal activity logging to critical automation RPCs.

create or replace function public.approve_proposal_public(
  p_proposal_public_token text
)
returns table (
  proposal_id uuid,
  invoice_id uuid,
  invoice_public_token text,
  invoice_number text,
  invoice_status text,
  invoice_total numeric
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_proposal public.proposals%rowtype;
  v_invoice public.invoices%rowtype;
  v_created_invoice boolean := false;
  v_today date := current_date;
  v_due date := current_date + 7;
  v_invoice_number text;
  v_product_name text;
  v_item_description text;
  v_amount numeric;
  v_proposal_data jsonb;
  v_client_company text;
  v_client_name text;
  v_invoice_data jsonb;
begin
  if p_proposal_public_token is null or btrim(p_proposal_public_token) = '' then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  select p.*
    into v_proposal
  from public.proposals p
  where p.public_token = p_proposal_public_token
  limit 1;

  if v_proposal.id is null then
    raise exception 'No se encontró la propuesta' using errcode = 'P0002';
  end if;

  update public.proposals p
  set
    status = 'Approved',
    approved_at = coalesce(p.approved_at, now()),
    updated_at = now()
  where p.id = v_proposal.id
  returning *
  into v_proposal;

  perform public.log_activity_event(
    v_proposal.company_id,
    v_proposal.created_by,
    'proposal_approved',
    'proposals',
    v_proposal.id,
    'Propuesta aprobada desde enlace público',
    jsonb_build_object(
      'proposal_number', v_proposal.number,
      'proposal_title', v_proposal.title
    )
  );

  v_amount := coalesce(v_proposal.amount, 0);

  -- Reutilizar factura activa existente para evitar duplicados
  select i.*
    into v_invoice
  from public.invoices i
  where i.proposal_id = v_proposal.id
    and coalesce(i.status, '') <> 'Cancelled'
  order by i.created_at desc
  limit 1;

  if v_invoice.id is null then
    -- Preferir número basado en la propuesta:
    -- PROP-20260525-6264 -> INV-20260525-6264
    if v_proposal.number is not null and btrim(v_proposal.number) <> '' then
      v_invoice_number := replace(v_proposal.number, 'PROP-', 'INV-');
    else
      v_invoice_number :=
        'INV-' ||
        to_char(v_today, 'YYYYMMDD') ||
        '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

    v_proposal_data := case
      when v_proposal.proposal_data is null then '{}'::jsonb
      else v_proposal.proposal_data
    end;
    v_client_company := nullif(btrim(coalesce(v_proposal_data->>'companyName', '')), '');
    v_client_name := nullif(btrim(coalesce(v_proposal_data->>'clientName', '')), '');

    if v_proposal.product_id is not null then
      select pr.name
        into v_product_name
      from public.products pr
      where pr.id = v_proposal.product_id
      limit 1;
    end if;

    v_invoice_data := jsonb_strip_nulls(
      jsonb_build_object(
        'issuerName', 'Corevix',
        'relatedProposalNumber', nullif(btrim(coalesce(v_proposal.number, '')), ''),
        'relatedProposalTitle', nullif(btrim(coalesce(v_proposal.title, '')), ''),
        'productName', nullif(btrim(coalesce(v_product_name, '')), ''),
        'clientCompany', v_client_company,
        'clientName', v_client_name
      )
    );

    insert into public.invoices (
      company_id,
      number,
      client_id,
      date_issued,
      due_date,
      subtotal,
      tax,
      discount,
      total,
      status,
      notes,
      proposal_id,
      product_id,
      public_token,
      created_by,
      invoice_data
    )
    values (
      v_proposal.company_id,
      v_invoice_number,
      v_proposal.client_id,
      v_today,
      v_due,
      v_amount,
      0,
      0,
      v_amount,
      'Draft',
      'Factura generada automáticamente desde propuesta aprobada.',
      v_proposal.id,
      v_proposal.product_id,
      gen_random_uuid()::text,
      v_proposal.created_by,
      coalesce(v_invoice_data, '{}'::jsonb)
    )
    returning *
    into v_invoice;

    v_created_invoice := true;
  end if;

  if v_created_invoice then
    if v_product_name is null and v_proposal.product_id is not null then
      select pr.name
        into v_product_name
      from public.products pr
      where pr.id = v_proposal.product_id
      limit 1;
    end if;

    v_item_description :=
      case
        when v_product_name is not null
          and btrim(v_product_name) <> ''
          and v_proposal.title is not null
          and btrim(v_proposal.title) <> ''
          then v_product_name || ' - ' || v_proposal.title
        when v_product_name is not null
          and btrim(v_product_name) <> ''
          then v_product_name
        when v_proposal.title is not null
          and btrim(v_proposal.title) <> ''
          then v_proposal.title
        else
          'Servicio aprobado'
      end;

    insert into public.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total
    )
    values (
      v_invoice.id,
      v_item_description,
      1,
      v_amount,
      v_amount
    );

    perform public.log_activity_event(
      v_invoice.company_id,
      coalesce(v_invoice.created_by, v_proposal.created_by),
      'invoice_created',
      'invoices',
      v_invoice.id,
      'Factura creada desde propuesta aprobada',
      jsonb_build_object(
        'invoice_number', v_invoice.number,
        'proposal_id', v_proposal.id
      )
    );
  end if;

  return query
  select
    v_proposal.id,
    v_invoice.id,
    v_invoice.public_token,
    v_invoice.number,
    v_invoice.status::text,
    v_invoice.total;
end;
$$;

grant execute on function public.approve_proposal_public(text) to anon, authenticated;

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

  -- Idempotency: reuse by invoice_id or proposal_id
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
    coalesce(v_invoice.created_by, v_proposal.created_by, v_user_id),
    null
  )
  returning *
  into v_project;

  -- If no product, create project only.
  if v_product_id is null then
    project_id := v_project.id;
    created := true;
    tasks_created := 0;
    perform public.log_activity_event(
      v_project.company_id,
      coalesce(v_invoice.created_by, v_proposal.created_by, v_user_id),
      'project_created',
      'projects',
      v_project.id,
      'Proyecto creado desde factura pagada',
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'proposal_id', v_invoice.proposal_id,
        'tasks_created', 0
      )
    );
    return next;
    return;
  end if;

  -- Create tasks directly from active workflow steps for the product.
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

  perform public.log_activity_event(
    v_project.company_id,
    coalesce(v_invoice.created_by, v_proposal.created_by, v_user_id),
    'project_created',
    'projects',
    v_project.id,
    'Proyecto creado desde factura pagada',
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'proposal_id', v_invoice.proposal_id,
      'tasks_created', tasks_created
    )
  );

  return next;
end;
$$;

revoke all on function public.create_project_from_paid_invoice(uuid) from public;
grant execute on function public.create_project_from_paid_invoice(uuid) to authenticated, service_role;
