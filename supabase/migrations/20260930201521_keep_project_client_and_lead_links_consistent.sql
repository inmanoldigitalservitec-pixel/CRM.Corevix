-- Keep the current client as the project owner after a lead conversion while
-- retaining lead_id as the project's commercial origin.

create or replace function public.validate_project_converted_lead_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_converted_client_id uuid;
begin
  if tg_op = 'UPDATE'
     and new.company_id is not distinct from old.company_id
     and new.client_id is not distinct from old.client_id
     and new.lead_id is not distinct from old.lead_id then
    return new;
  end if;

  if new.lead_id is null then
    return new;
  end if;

  select l.converted_client_id
    into v_converted_client_id
  from public.leads l
  where l.id = new.lead_id
    and l.company_id = new.company_id;

  if v_converted_client_id is not null
     and v_converted_client_id is distinct from new.client_id then
    raise exception 'El prospecto seleccionado ya fue convertido a otro cliente.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists projects_validate_converted_lead_client on public.projects;
create trigger projects_validate_converted_lead_client
before insert or update of company_id, client_id, lead_id on public.projects
for each row execute function public.validate_project_converted_lead_client();

create or replace function public.link_projects_to_converted_lead_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.converted_client_id is null then
    return new;
  end if;

  update public.projects p
     set client_id = new.converted_client_id,
         updated_at = now()
   where p.company_id = new.company_id
     and p.lead_id = new.id
     and p.client_id is null;

  return new;
end;
$$;

drop trigger if exists leads_link_projects_to_converted_client on public.leads;
create trigger leads_link_projects_to_converted_client
after update of converted_client_id on public.leads
for each row
when (new.converted_client_id is not null
  and old.converted_client_id is distinct from new.converted_client_id)
execute function public.link_projects_to_converted_lead_client();

-- Backfill only projects with no current client; existing client and origin
-- associations are left intact.
update public.projects p
   set client_id = l.converted_client_id,
       updated_at = now()
  from public.leads l
 where l.id = p.lead_id
   and l.company_id = p.company_id
   and l.converted_client_id is not null
   and p.client_id is null;
;
