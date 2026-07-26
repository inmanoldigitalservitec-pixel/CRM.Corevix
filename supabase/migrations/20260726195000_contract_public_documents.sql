alter table public.contracts
  add column if not exists public_token text;

update public.contracts
set public_token = gen_random_uuid()::text
where public_token is null or btrim(public_token) = '';

alter table public.contracts
  alter column public_token set default gen_random_uuid()::text,
  alter column public_token set not null;

create unique index if not exists contracts_public_token_key
  on public.contracts(public_token);

create or replace function public.snapshot_contract_document_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_representative public.profiles%rowtype;
  v_metadata jsonb := coalesce(new.metadata, '{}'::jsonb);
begin
  select c.* into v_company
  from public.companies c
  where c.id = new.company_id
  limit 1;

  if new.assigned_to is not null then
    select p.* into v_representative
    from public.profiles p
    where p.id = new.assigned_to
      and p.company_id = new.company_id
    limit 1;
  end if;

  if v_company.id is not null then
    v_metadata := v_metadata || jsonb_strip_nulls(jsonb_build_object(
      'issuerName', coalesce(nullif(btrim(v_metadata->>'issuerName'), ''), v_company.company_name),
      'issuerTaxId', coalesce(nullif(btrim(v_metadata->>'issuerTaxId'), ''), v_company.tax_id),
      'issuerEmail', coalesce(nullif(btrim(v_metadata->>'issuerEmail'), ''), v_company.email),
      'issuerPhone', coalesce(nullif(btrim(v_metadata->>'issuerPhone'), ''), v_company.phone),
      'issuerAddress', coalesce(nullif(btrim(v_metadata->>'issuerAddress'), ''), v_company.address),
      'issuerCity', coalesce(nullif(btrim(v_metadata->>'issuerCity'), ''), v_company.city),
      'issuerCountry', coalesce(nullif(btrim(v_metadata->>'issuerCountry'), ''), v_company.country),
      'issuerWebsite', coalesce(nullif(btrim(v_metadata->>'issuerWebsite'), ''), v_company.website),
      'issuerLogoUrl', coalesce(nullif(btrim(v_metadata->>'issuerLogoUrl'), ''), v_company.logo_url)
    ));
  end if;

  if v_representative.id is not null then
    v_metadata := v_metadata || jsonb_strip_nulls(jsonb_build_object(
      'representativeName', coalesce(nullif(btrim(v_metadata->>'representativeName'), ''), v_representative.full_name),
      'representativeTitle', coalesce(nullif(btrim(v_metadata->>'representativeTitle'), ''), v_representative.department),
      'representativeEmail', coalesce(nullif(btrim(v_metadata->>'representativeEmail'), ''), v_representative.email),
      'representativePhone', coalesce(nullif(btrim(v_metadata->>'representativePhone'), ''), v_representative.phone)
    ));
  end if;

  new.metadata := v_metadata;
  if new.public_token is null or btrim(new.public_token) = '' then
    new.public_token := gen_random_uuid()::text;
  end if;
  return new;
end;
$$;

drop trigger if exists contracts_snapshot_document_profile on public.contracts;
create trigger contracts_snapshot_document_profile
before insert or update of company_id, assigned_to, metadata
on public.contracts
for each row execute function public.snapshot_contract_document_profile();

update public.contracts ct
set metadata = coalesce(ct.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'issuerName', coalesce(nullif(btrim(ct.metadata->>'issuerName'), ''), c.company_name),
  'issuerTaxId', coalesce(nullif(btrim(ct.metadata->>'issuerTaxId'), ''), c.tax_id),
  'issuerEmail', coalesce(nullif(btrim(ct.metadata->>'issuerEmail'), ''), c.email),
  'issuerPhone', coalesce(nullif(btrim(ct.metadata->>'issuerPhone'), ''), c.phone),
  'issuerAddress', coalesce(nullif(btrim(ct.metadata->>'issuerAddress'), ''), c.address),
  'issuerCity', coalesce(nullif(btrim(ct.metadata->>'issuerCity'), ''), c.city),
  'issuerCountry', coalesce(nullif(btrim(ct.metadata->>'issuerCountry'), ''), c.country),
  'issuerWebsite', coalesce(nullif(btrim(ct.metadata->>'issuerWebsite'), ''), c.website),
  'issuerLogoUrl', coalesce(nullif(btrim(ct.metadata->>'issuerLogoUrl'), ''), c.logo_url),
  'representativeName', coalesce(nullif(btrim(ct.metadata->>'representativeName'), ''), p.full_name),
  'representativeTitle', coalesce(nullif(btrim(ct.metadata->>'representativeTitle'), ''), p.department),
  'representativeEmail', coalesce(nullif(btrim(ct.metadata->>'representativeEmail'), ''), p.email),
  'representativePhone', coalesce(nullif(btrim(ct.metadata->>'representativePhone'), ''), p.phone)
))
from public.companies c
left join public.profiles p on p.id = ct.assigned_to and p.company_id = ct.company_id
where c.id = ct.company_id;

create or replace function public.get_contract_public(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract public.contracts%rowtype;
  v_client jsonb := '{}'::jsonb;
  v_project jsonb := '{}'::jsonb;
begin
  if p_public_token is null or btrim(p_public_token) = '' then
    return jsonb_build_object('contract', null);
  end if;

  select c.* into v_contract
  from public.contracts c
  where c.public_token = p_public_token
  limit 1;

  if v_contract.id is null then
    return jsonb_build_object('contract', null);
  end if;

  if v_contract.client_id is not null then
    select coalesce(to_jsonb(cl), '{}'::jsonb) into v_client
    from public.clients cl
    where cl.id = v_contract.client_id
      and cl.company_id = v_contract.company_id
    limit 1;
  end if;

  if v_contract.project_id is not null then
    select coalesce(to_jsonb(pr), '{}'::jsonb) into v_project
    from public.projects pr
    where pr.id = v_contract.project_id
      and pr.company_id = v_contract.company_id
    limit 1;
  end if;

  return jsonb_build_object(
    'contract', to_jsonb(v_contract) || jsonb_build_object(
      'client', v_client,
      'project', v_project
    )
  );
end;
$$;

grant execute on function public.get_contract_public(text) to anon, authenticated;
