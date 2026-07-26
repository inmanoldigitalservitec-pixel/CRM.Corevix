-- Guarda una copia histórica del perfil comercial en cada propuesta y
-- expone esos datos en la vista pública sin depender de una sesión autenticada.

create or replace function public.snapshot_proposal_company_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_data jsonb := coalesce(new.proposal_data, '{}'::jsonb);
begin
  select c.*
    into v_company
  from public.companies c
  where c.id = new.company_id
  limit 1;

  if v_company.id is null then
    return new;
  end if;

  v_data := v_data || jsonb_strip_nulls(
    jsonb_build_object(
      'companyName', coalesce(nullif(btrim(v_data->>'companyName'), ''), v_company.company_name),
      'companyTaxId', coalesce(nullif(btrim(v_data->>'companyTaxId'), ''), v_company.tax_id),
      'companyEmail', coalesce(nullif(btrim(v_data->>'companyEmail'), ''), v_company.email),
      'companyPhone', coalesce(nullif(btrim(v_data->>'companyPhone'), ''), v_company.phone),
      'companyAddress', coalesce(nullif(btrim(v_data->>'companyAddress'), ''), v_company.address),
      'companyCity', coalesce(nullif(btrim(v_data->>'companyCity'), ''), v_company.city),
      'companyCountry', coalesce(nullif(btrim(v_data->>'companyCountry'), ''), v_company.country),
      'companyWebsite', coalesce(nullif(btrim(v_data->>'companyWebsite'), ''), v_company.website),
      'companyLogoUrl', coalesce(nullif(btrim(v_data->>'companyLogoUrl'), ''), v_company.logo_url)
    )
  );

  new.proposal_data := v_data;
  return new;
end;
$$;

drop trigger if exists proposals_snapshot_company_profile on public.proposals;

create trigger proposals_snapshot_company_profile
before insert or update of company_id, proposal_data
on public.proposals
for each row
execute function public.snapshot_proposal_company_profile();

update public.proposals p
set proposal_data = coalesce(p.proposal_data, '{}'::jsonb) || jsonb_strip_nulls(
  jsonb_build_object(
    'companyName', coalesce(nullif(btrim(p.proposal_data->>'companyName'), ''), c.company_name),
    'companyTaxId', coalesce(nullif(btrim(p.proposal_data->>'companyTaxId'), ''), c.tax_id),
    'companyEmail', coalesce(nullif(btrim(p.proposal_data->>'companyEmail'), ''), c.email),
    'companyPhone', coalesce(nullif(btrim(p.proposal_data->>'companyPhone'), ''), c.phone),
    'companyAddress', coalesce(nullif(btrim(p.proposal_data->>'companyAddress'), ''), c.address),
    'companyCity', coalesce(nullif(btrim(p.proposal_data->>'companyCity'), ''), c.city),
    'companyCountry', coalesce(nullif(btrim(p.proposal_data->>'companyCountry'), ''), c.country),
    'companyWebsite', coalesce(nullif(btrim(p.proposal_data->>'companyWebsite'), ''), c.website),
    'companyLogoUrl', coalesce(nullif(btrim(p.proposal_data->>'companyLogoUrl'), ''), c.logo_url)
  )
)
from public.companies c
where c.id = p.company_id;

create or replace function public.get_proposal_public(p_proposal_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_client jsonb := '{}'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_company jsonb := '{}'::jsonb;
  v_public_data jsonb := '{}'::jsonb;
  v_template_key text;
  v_content text;
begin
  if p_proposal_public_token is null or btrim(p_proposal_public_token) = '' then
    return jsonb_build_object('proposal', null, 'items', '[]'::jsonb);
  end if;

  select p.*
    into v_proposal
  from public.proposals p
  where p.public_token = p_proposal_public_token
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('proposal', null, 'items', '[]'::jsonb);
  end if;

  update public.proposals p
  set
    viewed_at = coalesce(p.viewed_at, now()),
    status = case when p.status = 'Sent' then 'Viewed' else p.status end,
    updated_at = now()
  where p.id = v_proposal.id;

  select coalesce(to_jsonb(c), '{}'::jsonb)
    into v_company
  from public.companies c
  where c.id = v_proposal.company_id
  limit 1;

  v_public_data := coalesce(v_proposal.proposal_data, '{}'::jsonb) || jsonb_strip_nulls(
    jsonb_build_object(
      'companyName', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyName'), ''), v_company->>'company_name'),
      'companyTaxId', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyTaxId'), ''), v_company->>'tax_id'),
      'companyEmail', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyEmail'), ''), v_company->>'email'),
      'companyPhone', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyPhone'), ''), v_company->>'phone'),
      'companyAddress', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyAddress'), ''), v_company->>'address'),
      'companyCity', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyCity'), ''), v_company->>'city'),
      'companyCountry', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyCountry'), ''), v_company->>'country'),
      'companyWebsite', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyWebsite'), ''), v_company->>'website'),
      'companyLogoUrl', coalesce(nullif(btrim(v_proposal.proposal_data->>'companyLogoUrl'), ''), v_company->>'logo_url')
    )
  );

  if v_proposal.client_id is not null then
    select coalesce(to_jsonb(c), '{}'::jsonb)
      into v_client
    from public.clients c
    where c.id = v_proposal.client_id
      and c.company_id = v_proposal.company_id
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pi.id,
        'product_id', pi.product_id,
        'item_name', pi.item_name,
        'description', pi.description,
        'quantity', pi.quantity,
        'unit_type', pi.unit_type,
        'rate', pi.rate,
        'tax_rate', pi.tax_rate,
        'tax_id', pi.tax_id,
        'tax_name', pi.tax_name,
        'tax_amount', pi.tax_amount,
        'is_optional', pi.is_optional,
        'sort_order', pi.sort_order,
        'amount', pi.amount,
        'document_currency', pi.document_currency,
        'original_currency', pi.original_currency,
        'original_rate', pi.original_rate,
        'converted_rate', pi.converted_rate,
        'exchange_rate', pi.exchange_rate,
        'exchange_rate_source', pi.exchange_rate_source,
        'exchange_rate_updated_at', pi.exchange_rate_updated_at
      )
      order by pi.sort_order asc, pi.created_at asc
    ),
    '[]'::jsonb
  )
    into v_items
  from public.proposal_items pi
  where pi.proposal_id = v_proposal.id
    and pi.company_id = v_proposal.company_id;

  v_template_key := nullif(btrim(v_proposal.template_key), '');
  v_content := nullif(btrim(v_proposal.content), '');

  -- Las propuestas antiguas sin plantilla se publican con una plantilla HTML
  -- dinámica para eliminar encabezados y contactos codificados en el cliente.
  if v_template_key is null then
    v_template_key := 'custom_html';
    v_content := coalesce(v_content, '
      <div style="font-family:Arial,sans-serif;color:#0f172a;">
        <header style="display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #2563eb;padding-bottom:18px;margin-bottom:24px;">
          <div>
            <h1 style="margin:0 0 8px;font-size:28px;">{company_name}</h1>
            <div style="color:#64748b;line-height:1.55;">{company_address}<br>{company_email}<br>{company_phone}<br>{company_website}</div>
          </div>
          <div style="text-align:right;"><div style="font-size:12px;color:#64748b;">PROPUESTA</div><strong>{proposal_number}</strong><br>{proposal_date}</div>
        </header>
        <h2>{proposal_title}</h2>
        <p><strong>Cliente:</strong> {client_name}</p>
        <p>{proposal_description}</p>
        {proposal_items}
        <div style="margin-left:auto;max-width:320px;border-top:1px solid #cbd5e1;padding-top:12px;line-height:1.8;">
          <div>Subtotal: <strong>{proposal_subtotal}</strong></div>
          <div>Impuestos: <strong>{proposal_tax_total}</strong></div>
          <div style="font-size:20px;">Total: <strong>{proposal_total}</strong></div>
        </div>
        <footer style="margin-top:36px;border-top:1px solid #e2e8f0;padding-top:14px;color:#64748b;font-size:12px;">RNC / ID: {company_tax_id}</footer>
      </div>
    ');
  end if;

  return jsonb_build_object(
    'proposal',
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', v_proposal.id,
        'company_id', v_proposal.company_id,
        'title', v_proposal.title,
        'number', v_proposal.number,
        'status', case when v_proposal.status = 'Sent' then 'Viewed' else v_proposal.status end,
        'amount', v_proposal.amount,
        'currency', v_proposal.currency,
        'base_currency', v_proposal.base_currency,
        'exchange_rate', v_proposal.exchange_rate,
        'exchange_rate_source', v_proposal.exchange_rate_source,
        'exchange_rate_updated_at', v_proposal.exchange_rate_updated_at,
        'subtotal', v_proposal.subtotal,
        'tax_total', v_proposal.tax_total,
        'total', v_proposal.total,
        'subtotal_base', v_proposal.subtotal_base,
        'tax_base', v_proposal.tax_base,
        'total_base', v_proposal.total_base,
        'template_id', v_proposal.template_id,
        'template_key', v_template_key,
        'content', v_content,
        'description', v_proposal.description,
        'notes', v_proposal.notes,
        'proposal_date', v_proposal.proposal_date,
        'proposal_data', v_public_data,
        'valid_until', v_proposal.valid_until,
        'approved_at', v_proposal.approved_at,
        'public_token', v_proposal.public_token,
        'recipient_name', v_proposal.recipient_name,
        'recipient_email', v_proposal.recipient_email,
        'recipient_phone', v_proposal.recipient_phone,
        'recipient_address', v_proposal.recipient_address,
        'recipient_city', v_proposal.recipient_city,
        'recipient_state', v_proposal.recipient_state,
        'recipient_country', v_proposal.recipient_country,
        'recipient_zip_code', v_proposal.recipient_zip_code,
        'client_id', v_proposal.client_id,
        'client', v_client,
        'created_at', v_proposal.created_at,
        'updated_at', now()
      )
    ),
    'items', v_items
  );
end;
$$;

grant execute on function public.get_proposal_public(text) to anon, authenticated;
