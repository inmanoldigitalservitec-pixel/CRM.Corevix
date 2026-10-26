create or replace function public.validate_estimate_entity_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Keep historical unlinked estimates editable through unrelated fields,
  -- while requiring a valid entity on inserts and entity/company changes.
  if (new.client_id is null) = (new.lead_id is null) then
    raise exception 'An estimate must be linked to exactly one client or lead'
      using errcode = '23514';
  end if;

  if new.client_id is not null and not exists (
    select 1
    from public.clients c
    where c.id = new.client_id
      and c.company_id = new.company_id
  ) then
    raise exception 'Estimate client must belong to the estimate company'
      using errcode = '23514';
  end if;

  if new.lead_id is not null and not exists (
    select 1
    from public.leads l
    where l.id = new.lead_id
      and l.company_id = new.company_id
  ) then
    raise exception 'Estimate lead must belong to the estimate company'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists estimates_entity_scope_check on public.estimates;
create trigger estimates_entity_scope_check
before insert or update of company_id, client_id, lead_id
on public.estimates
for each row
execute function public.validate_estimate_entity_scope();
