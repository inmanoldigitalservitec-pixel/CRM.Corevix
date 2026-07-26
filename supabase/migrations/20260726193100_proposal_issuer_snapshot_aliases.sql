-- Separa la identidad del emisor de `companyName`, campo que algunas
-- propuestas antiguas usan para identificar la empresa del cliente.

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
      'issuerName', coalesce(nullif(btrim(v_data->>'issuerName'), ''), v_company.company_name),
      'issuerTaxId', coalesce(nullif(btrim(v_data->>'issuerTaxId'), ''), v_company.tax_id),
      'issuerEmail', coalesce(nullif(btrim(v_data->>'issuerEmail'), ''), v_company.email),
      'issuerPhone', coalesce(nullif(btrim(v_data->>'issuerPhone'), ''), v_company.phone),
      'issuerAddress', coalesce(nullif(btrim(v_data->>'issuerAddress'), ''), v_company.address),
      'issuerCity', coalesce(nullif(btrim(v_data->>'issuerCity'), ''), v_company.city),
      'issuerCountry', coalesce(nullif(btrim(v_data->>'issuerCountry'), ''), v_company.country),
      'issuerWebsite', coalesce(nullif(btrim(v_data->>'issuerWebsite'), ''), v_company.website),
      'issuerLogoUrl', coalesce(nullif(btrim(v_data->>'issuerLogoUrl'), ''), v_company.logo_url),
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

update public.proposals p
set proposal_data = coalesce(p.proposal_data, '{}'::jsonb) || jsonb_strip_nulls(
  jsonb_build_object(
    'issuerName', coalesce(nullif(btrim(p.proposal_data->>'issuerName'), ''), c.company_name),
    'issuerTaxId', coalesce(nullif(btrim(p.proposal_data->>'issuerTaxId'), ''), c.tax_id),
    'issuerEmail', coalesce(nullif(btrim(p.proposal_data->>'issuerEmail'), ''), c.email),
    'issuerPhone', coalesce(nullif(btrim(p.proposal_data->>'issuerPhone'), ''), c.phone),
    'issuerAddress', coalesce(nullif(btrim(p.proposal_data->>'issuerAddress'), ''), c.address),
    'issuerCity', coalesce(nullif(btrim(p.proposal_data->>'issuerCity'), ''), c.city),
    'issuerCountry', coalesce(nullif(btrim(p.proposal_data->>'issuerCountry'), ''), c.country),
    'issuerWebsite', coalesce(nullif(btrim(p.proposal_data->>'issuerWebsite'), ''), c.website),
    'issuerLogoUrl', coalesce(nullif(btrim(p.proposal_data->>'issuerLogoUrl'), ''), c.logo_url)
  )
)
from public.companies c
where c.id = p.company_id;
