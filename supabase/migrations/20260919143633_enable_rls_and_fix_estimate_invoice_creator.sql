
alter table public.drive_files enable row level security;
alter table public.drive_settings enable row level security;
alter table public.gemini_settings enable row level security;
alter table public.meta_conversation_lead_profiles enable row level security;
alter table public.whatsapp_client_links enable row level security;

drop policy if exists "company members manage drive files" on public.drive_files;
create policy "company members manage drive files"
on public.drive_files for all to authenticated
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists "company members manage drive settings" on public.drive_settings;
create policy "company members manage drive settings"
on public.drive_settings for all to authenticated
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists "company members manage gemini settings" on public.gemini_settings;
create policy "company members manage gemini settings"
on public.gemini_settings for all to authenticated
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists "company members manage meta lead profiles" on public.meta_conversation_lead_profiles;
create policy "company members manage meta lead profiles"
on public.meta_conversation_lead_profiles for all to authenticated
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

drop policy if exists "company members manage whatsapp client links" on public.whatsapp_client_links;
create policy "company members manage whatsapp client links"
on public.whatsapp_client_links for all to authenticated
using (company_id = public.get_current_company_id())
with check (company_id = public.get_current_company_id());

create or replace function public.convert_estimate_to_invoice(p_estimate_id uuid)
returns table(invoice_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $function$
declare
  e record;
  existing_id uuid;
  new_id uuid;
  current_profile public.profiles%rowtype;
begin
  select * into current_profile
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  if current_profile.id is null then
    raise exception 'No active profile found';
  end if;

  select * into e
  from public.estimates
  where id = p_estimate_id
    and company_id = current_profile.company_id;

  if e.id is null then
    raise exception 'Estimate not found';
  end if;

  select id into existing_id
  from public.invoices
  where estimate_id = e.id
    and company_id = e.company_id
  limit 1;

  if existing_id is not null then
    invoice_id := existing_id;
    created := false;
    return next;
    return;
  end if;

  insert into public.invoices (
    company_id, number, client_id, subtotal, tax, discount, total,
    currency, base_currency, exchange_rate, exchange_rate_source,
    exchange_rate_updated_at, subtotal_base, tax_base, discount_base,
    total_base, status, date_issued, due_date, notes, invoice_data,
    created_by, estimate_id
  ) values (
    e.company_id, 'INV-EST-' || e.number::text, e.client_id,
    coalesce(e.subtotal, 0), coalesce(e.tax, 0), 0, coalesce(e.total, 0),
    e.currency, e.base_currency, e.exchange_rate, e.exchange_rate_source,
    e.exchange_rate_updated_at, e.subtotal_base, e.tax_base, 0, e.total_base,
    'Draft', current_date, current_date + interval '30 days', e.notes,
    jsonb_strip_nulls(jsonb_build_object('currency', e.currency)),
    current_profile.id, e.id
  ) returning id into new_id;

  update public.estimates
  set status = 'Converted'
  where id = e.id;

  invoice_id := new_id;
  created := true;
  return next;
end;
$function$;
;
