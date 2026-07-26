alter table public.credit_notes
  add column if not exists public_token text,
  add column if not exists credit_note_data jsonb not null default '{}'::jsonb;

update public.credit_notes
set public_token = gen_random_uuid()::text
where public_token is null or btrim(public_token) = '';

alter table public.credit_notes
  alter column public_token set default gen_random_uuid()::text,
  alter column public_token set not null;

create unique index if not exists credit_notes_public_token_key
  on public.credit_notes(public_token);

create or replace function public.snapshot_credit_note_company_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_invoice public.invoices%rowtype;
  v_client public.clients%rowtype;
  v_data jsonb := coalesce(new.credit_note_data, '{}'::jsonb);
begin
  select c.* into v_company
  from public.companies c
  where c.id = new.company_id
  limit 1;

  if new.invoice_id is not null then
    select i.* into v_invoice
    from public.invoices i
    where i.id = new.invoice_id and i.company_id = new.company_id
    limit 1;
  end if;

  if new.client_id is not null then
    select cl.* into v_client
    from public.clients cl
    where cl.id = new.client_id and cl.company_id = new.company_id
    limit 1;
  elsif v_invoice.client_id is not null then
    select cl.* into v_client
    from public.clients cl
    where cl.id = v_invoice.client_id and cl.company_id = new.company_id
    limit 1;
    new.client_id := v_invoice.client_id;
  end if;

  if v_company.id is not null then
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
  end if;

  if v_invoice.id is not null then
    v_data := v_data || jsonb_strip_nulls(jsonb_build_object(
      'invoiceNumber', coalesce(nullif(btrim(v_data->>'invoiceNumber'), ''), v_invoice.number),
      'invoiceDate', coalesce(nullif(btrim(v_data->>'invoiceDate'), ''), v_invoice.date_issued::text),
      'invoiceTotal', coalesce(nullif(btrim(v_data->>'invoiceTotal'), '')::numeric, v_invoice.total),
      'invoiceCurrency', coalesce(nullif(btrim(v_data->>'invoiceCurrency'), ''), v_invoice.currency)
    ));
  end if;

  if v_client.id is not null then
    v_data := v_data || jsonb_strip_nulls(jsonb_build_object(
      'clientName', coalesce(nullif(btrim(v_data->>'clientName'), ''), v_client.company_name, v_client.contact_person),
      'clientEmail', coalesce(nullif(btrim(v_data->>'clientEmail'), ''), v_client.email),
      'clientPhone', coalesce(nullif(btrim(v_data->>'clientPhone'), ''), v_client.phone),
      'clientAddress', coalesce(nullif(btrim(v_data->>'clientAddress'), ''), v_client.address),
      'clientCity', coalesce(nullif(btrim(v_data->>'clientCity'), ''), v_client.city),
      'clientCountry', coalesce(nullif(btrim(v_data->>'clientCountry'), ''), v_client.country),
      'clientTaxId', coalesce(nullif(btrim(v_data->>'clientTaxId'), ''), v_client.tax_id)
    ));
  end if;

  new.credit_note_data := v_data;
  if new.public_token is null or btrim(new.public_token) = '' then
    new.public_token := gen_random_uuid()::text;
  end if;
  return new;
end;
$$;

drop trigger if exists credit_notes_snapshot_company_profile on public.credit_notes;
create trigger credit_notes_snapshot_company_profile
before insert or update of company_id, invoice_id, client_id, credit_note_data
on public.credit_notes
for each row execute function public.snapshot_credit_note_company_profile();

update public.credit_notes
set credit_note_data = coalesce(credit_note_data, '{}'::jsonb);

create or replace function public.get_credit_note_public(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_note public.credit_notes%rowtype;
begin
  if p_public_token is null or btrim(p_public_token) = '' then
    return jsonb_build_object('credit_note', null);
  end if;

  select cn.* into v_credit_note
  from public.credit_notes cn
  where cn.public_token = p_public_token
  limit 1;

  if v_credit_note.id is null then
    return jsonb_build_object('credit_note', null);
  end if;

  return jsonb_build_object('credit_note', to_jsonb(v_credit_note));
end;
$$;

grant execute on function public.get_credit_note_public(text) to anon, authenticated;
