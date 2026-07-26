alter table public.estimates
  add column if not exists public_token text;

update public.estimates
set public_token = gen_random_uuid()::text
where public_token is null or btrim(public_token) = '';

alter table public.estimates
  alter column public_token set default gen_random_uuid()::text,
  alter column public_token set not null;

create unique index if not exists estimates_public_token_key
  on public.estimates(public_token);

create or replace function public.snapshot_estimate_company_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_data jsonb := coalesce(new.estimate_data, '{}'::jsonb);
begin
  select c.* into v_company
  from public.companies c
  where c.id = new.company_id
  limit 1;

  if v_company.id is null then return new; end if;

  v_data := v_data || jsonb_strip_nulls(jsonb_build_object(
    'issuerName', coalesce(nullif(btrim(v_data->>'issuerName'), ''), v_company.company_name),
    'issuerTaxId', coalesce(nullif(btrim(v_data->>'issuerTaxId'), ''), v_company.tax_id),
    'issuerEmail', coalesce(nullif(btrim(v_data->>'issuerEmail'), ''), v_company.email),
    'issuerPhone', coalesce(nullif(btrim(v_data->>'issuerPhone'), ''), v_company.phone),
    'issuerAddress', coalesce(nullif(btrim(v_data->>'issuerAddress'), ''), v_company.address),
    'issuerCity', coalesce(nullif(btrim(v_data->>'issuerCity'), ''), v_company.city),
    'issuerCountry', coalesce(nullif(btrim(v_data->>'issuerCountry'), ''), v_company.country),
    'issuerWebsite', coalesce(nullif(btrim(v_data->>'issuerWebsite'), ''), v_company.website),
    'issuerLogoUrl', coalesce(nullif(btrim(v_data->>'issuerLogoUrl'), ''), v_company.logo_url)
  ));

  new.estimate_data := v_data;
  if new.public_token is null or btrim(new.public_token) = '' then
    new.public_token := gen_random_uuid()::text;
  end if;
  return new;
end;
$$;

drop trigger if exists estimates_snapshot_company_profile on public.estimates;
create trigger estimates_snapshot_company_profile
before insert or update of company_id, estimate_data
on public.estimates
for each row execute function public.snapshot_estimate_company_profile();

update public.estimates e
set estimate_data = coalesce(e.estimate_data, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'issuerName', coalesce(nullif(btrim(e.estimate_data->>'issuerName'), ''), c.company_name),
  'issuerTaxId', coalesce(nullif(btrim(e.estimate_data->>'issuerTaxId'), ''), c.tax_id),
  'issuerEmail', coalesce(nullif(btrim(e.estimate_data->>'issuerEmail'), ''), c.email),
  'issuerPhone', coalesce(nullif(btrim(e.estimate_data->>'issuerPhone'), ''), c.phone),
  'issuerAddress', coalesce(nullif(btrim(e.estimate_data->>'issuerAddress'), ''), c.address),
  'issuerCity', coalesce(nullif(btrim(e.estimate_data->>'issuerCity'), ''), c.city),
  'issuerCountry', coalesce(nullif(btrim(e.estimate_data->>'issuerCountry'), ''), c.country),
  'issuerWebsite', coalesce(nullif(btrim(e.estimate_data->>'issuerWebsite'), ''), c.website),
  'issuerLogoUrl', coalesce(nullif(btrim(e.estimate_data->>'issuerLogoUrl'), ''), c.logo_url)
))
from public.companies c
where c.id = e.company_id;

create or replace function public.get_estimate_public(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estimate public.estimates%rowtype;
  v_client jsonb := '{}'::jsonb;
  v_items jsonb := '[]'::jsonb;
begin
  select e.* into v_estimate
  from public.estimates e
  where e.public_token = p_public_token
  limit 1;

  if v_estimate.id is null then
    return jsonb_build_object('estimate', null, 'items', '[]'::jsonb);
  end if;

  if v_estimate.client_id is not null then
    select coalesce(to_jsonb(c), '{}'::jsonb) into v_client
    from public.clients c
    where c.id = v_estimate.client_id and c.company_id = v_estimate.company_id
    limit 1;
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order, i.created_at), '[]'::jsonb)
    into v_items
  from public.estimate_items i
  where i.estimate_id = v_estimate.id and i.company_id = v_estimate.company_id;

  return jsonb_build_object(
    'estimate', to_jsonb(v_estimate) || jsonb_build_object('client', v_client),
    'items', v_items
  );
end;
$$;

grant execute on function public.get_estimate_public(text) to anon, authenticated;
